/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice } from './helpers/connectedDevice';
import { emptyKeymapSnapshot } from './helpers/connectedDevice';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';

let container: HTMLDivElement;
let root: Root;

async function renderApp() {
  await act(async () => root.render(createElement(App)));
  // Let the bridge status subscription and initial getStatus() settle.
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 30)));
}

/** The numbered layer selector above the pad preview. */
function layerButtons(): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('button[title^="Layer "]')]
    .filter((button) => /^Layer [1-4]$/.test(button.title));
}

function selectedLayerNumber(): number | null {
  const buttons = layerButtons();
  const index = buttons.findIndex((button) => button.getAttribute('aria-pressed') === 'true');
  return index === -1 ? null : index + 1;
}

/**
 * Persist a 4-layer profile so the layer selector matches the device's four
 * hardware layers, with a distinguishable key on each layer.
 */
function seedFourLayerProfile() {
  window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({
    v: 1,
    profiles: [{
      id: 'sync-profile',
      name: 'Sync',
      color: '#0051ff',
      layers: ['ONE', 'TWO', 'THREE', 'FOUR'].map((label, index) => ({
        r1c1: { label, binding: String.fromCharCode(65 + index), actionType: 'Basic input' },
      })),
    }],
    activeProfileIndex: 0,
    customItems: { Action: [], 'Multi-A': [], 'Smart-A': [] },
  }));
}

/** Assignments rendered on the preview keycaps, in slot order. */
function previewLabels(): string[] {
  return [...container.querySelectorAll<HTMLElement>('[data-drop-slot^="r"]')]
    .map((slot) => slot.textContent?.trim().replace(/\s+/g, ' ') ?? '');
}

async function clickLayer(layerNumber: number) {
  const button = layerButtons()[layerNumber - 1];
  expect(button, `layer ${layerNumber} button`).toBeDefined();
  await act(async () => {
    button.click();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  seedFourLayerProfile();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'confirm', { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: undefined });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  removeConnectedDevice();
  await act(async () => root.unmount());
  container.remove();
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
});

describe('bidirectional hardware layer synchronisation', () => {
  it('highlights the layer the firmware reports and shows that layer\'s assignments', async () => {
    const device = installConnectedDevice();
    await renderApp();

    expect(selectedLayerNumber()).toBe(1);
    expect(previewLabels()[0]).toContain('ONE');

    // Physical L1 -> L2 -> L3 -> L4, reported by the firmware.
    for (const [layer, label] of [[1, 'TWO'], [2, 'THREE'], [3, 'FOUR']] as const) {
      await act(async () => {
        device.emitHardwareLayer(layer);
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      });
      expect(selectedLayerNumber()).toBe(layer + 1);
      expect(previewLabels()[0]).toContain(label);
    }

    // Adopting telemetry must never send a layer command back (no sync loop).
    const layerCommands = device.bridge.request.mock.calls
      .filter(([payload]) => (payload as { cmd?: string }).cmd === 'select_layer');
    expect(layerCommands).toHaveLength(0);
  });

  it('switches the hardware when a layer is picked in the app and follows the confirmed reply', async () => {
    const device = installConnectedDevice();
    await renderApp();
    expect(layerButtons().length).toBeGreaterThan(1);

    await clickLayer(2);

    expect(device.bridge.request).toHaveBeenCalledWith({ cmd: 'select_layer', layer: 1 });
    expect(device.activeLayer).toBe(1);
    expect(selectedLayerNumber()).toBe(2);
  });

  it('does not move the highlight when the firmware confirms a different layer', async () => {
    installConnectedDevice({
      // Firmware refuses and reports it stayed on layer 0.
      request: async (payload) => {
        if (payload.cmd === 'select_layer') {
          return { ok: true, deviceActiveLayer: 0, requestedLayer: Number(payload.layer), confirmed: false };
        }
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();

    await clickLayer(3);

    // The UI must show the hardware's layer, never the optimistic request.
    expect(selectedLayerNumber()).toBe(1);
    expect(container.textContent).toContain('Layer 3 was not confirmed by the Micro Pad');
  });

  it('keeps the previous layer and warns when the command fails', async () => {
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'select_layer') return { ok: false, error: 'Timed out' };
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();

    await clickLayer(2);

    expect(selectedLayerNumber()).toBe(1);
    expect(device.activeLayer).toBe(0);
    expect(container.textContent).toContain('was not confirmed by the Micro Pad');
  });

  it('coalesces rapid switching to the newest layer without stale intermediate state', async () => {
    const inFlight: Array<() => void> = [];
    let hardwareLayer = 0;
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'select_layer') {
          // Hold the reply so several clicks land while one report is in flight.
          await new Promise<void>((resolve) => inFlight.push(resolve));
          hardwareLayer = Number(payload.layer);
          return { ok: true, deviceActiveLayer: hardwareLayer, confirmed: true };
        }
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();

    const buttons = layerButtons();
    expect(buttons.length).toBe(4);
    await act(async () => {
      buttons[1].click();
      buttons[2].click();
      buttons[3].click();
    });

    // Raw HID permits one report in flight; the newest intent is what is sent.
    await act(async () => {
      inFlight.shift()?.();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });
    await act(async () => {
      while (inFlight.length) {
        inFlight.shift()?.();
        await new Promise((resolve) => window.setTimeout(resolve, 10));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    const sentLayers = device.bridge.request.mock.calls
      .filter(([payload]) => (payload as { cmd?: string }).cmd === 'select_layer')
      .map(([payload]) => (payload as { layer: number }).layer);
    expect(sentLayers.length).toBeLessThanOrEqual(2);
    expect(sentLayers[sentLayers.length - 1]).toBe(3);
    expect(hardwareLayer).toBe(3);
    expect(selectedLayerNumber()).toBe(4);
  });

  it('lets a physical press win over an in-flight app request', async () => {
    let release: (() => void) | undefined;
    const events = new Set<(event: unknown) => void>();
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'select_layer') {
          await new Promise<void>((resolve) => { release = resolve; });
          // Firmware answers with what it is actually on after the physical press.
          return { ok: true, deviceActiveLayer: 2, confirmed: false };
        }
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    // Reach the same event listeners the app subscribed to.
    device.bridge.onEvent.mock.calls.forEach(([listener]) => events.add(listener));
    await renderApp();
    device.bridge.onEvent.mock.calls.forEach(([listener]) => events.add(listener));

    await act(async () => { layerButtons()[1].click(); });
    await act(async () => {
      for (const listener of events) {
        listener({ type: 'layer_state', deviceActiveLayer: 2, activeProfileSlot: 0 });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    expect(selectedLayerNumber()).toBe(3);

    await act(async () => {
      release?.();
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    // The stale reply reports layer 2 as well, so the UI must stay on L3.
    expect(selectedLayerNumber()).toBe(3);
  });

  it('abandons an in-flight layer request when the cable is pulled mid-switch', async () => {
    let release: (() => void) | undefined;
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'select_layer') {
          await new Promise<void>((resolve) => { release = resolve; });
          return { ok: true, deviceActiveLayer: Number(payload.layer), confirmed: true };
        }
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();

    await act(async () => { layerButtons()[3].click(); });
    const sentBefore = device.bridge.request.mock.calls.length;

    // Disconnect while the report is still outstanding.
    await act(async () => {
      device.emitDisconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });
    await act(async () => {
      release?.();
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    });

    expect(container.querySelector('[data-testid="device-connection-gate"]')).not.toBeNull();
    // No retry, follow-up command, or RGB/config write after the disconnect.
    expect(device.bridge.request.mock.calls.length).toBe(sentBefore);
    expect(device.activeLayer).toBe(0);
  });

  it('stops sending layer commands once the device disconnects', async () => {
    const device = installConnectedDevice();
    await renderApp();
    await clickLayer(2);
    const before = device.bridge.request.mock.calls.length;

    await act(async () => {
      device.emitDisconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    expect(container.querySelector('[data-testid="device-connection-gate"]')).not.toBeNull();
    expect(layerButtons()).toHaveLength(0);
    expect(device.bridge.request.mock.calls.length).toBe(before);
  });
});
