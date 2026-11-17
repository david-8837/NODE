/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice, emptyKeymapSnapshot } from './helpers/connectedDevice';
import type { DeviceRgbConfig } from '../src/qmkViaBridge';

let container: HTMLDivElement;
let root: Root;

const DEFAULT_COLORS = [
  { r: 0, g: 81, b: 255 },
  { r: 16, g: 185, b: 129 },
  { r: 245, g: 158, b: 11 },
  { r: 225, g: 29, b: 72 },
];

function rgbConfig(overrides: Partial<DeviceRgbConfig> = {}): DeviceRgbConfig {
  return {
    enabled: true,
    layerColors: DEFAULT_COLORS.map((c) => ({ ...c })) as DeviceRgbConfig['layerColors'],
    layerModes: [1, 1, 1, 1],
    layerSpeeds: [50, 50, 50, 50],
    ...overrides,
  };
}

async function renderApp() {
  await act(async () => root.render(createElement(App)));
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 40)));
}


/** Open the layer toolbar, then the LED colour panel, as a user would. */
async function openLedPanel() {
  const activeLayer = container.querySelector<HTMLButtonElement>('button[title^="Layer "][aria-pressed="true"]');
  expect(activeLayer).not.toBeNull();
  await act(async () => {
    activeLayer!.click();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  });
  const ledButton = container.querySelector<HTMLButtonElement>('button[aria-label="LED colour settings"]');
  expect(ledButton, 'LED colour settings button').not.toBeNull();
  await act(async () => {
    ledButton!.click();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  });
}

/** Change the active layer's brightness through the real range input. */
async function setBrightness(value: number) {
  const ranges = [...container.querySelectorAll<HTMLInputElement>('input[type="range"]')];
  const range = ranges.find((r) => r.max === '100');
  expect(range, 'brightness range input').toBeDefined();
  await act(async () => {
    // React tracks the DOM value; use the native setter so onChange fires.
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    setter.call(range!, String(value));
    range!.dispatchEvent(new Event('input', { bubbles: true }));
    range!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  });
}

function rgbWrites(bridge: { request: { mock: { calls: unknown[][] } } }) {
  return bridge.request.mock.calls
    .filter(([p]) => (p as { cmd?: string }).cmd === 'set_rgb_config')
    .map(([p]) => (p as { rgbConfig: DeviceRgbConfig }).rgbConfig);
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: undefined });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  removeConnectedDevice();
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  await act(async () => root.unmount());
  container.remove();
});

describe('RGB customisation and synchronisation', () => {
  it('sends four distinct per-layer colours, modes and speeds to the firmware', async () => {
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();
    await openLedPanel();
    await setBrightness(60);

    const writes = rgbWrites(device.bridge);
    expect(writes.length).toBeGreaterThan(0);
    const sent = writes[writes.length - 1];
    expect(sent.layerColors).toHaveLength(4);
    // Each layer keeps its own colour rather than all sharing layer 1's.
    expect(new Set(sent.layerColors.map((c) => `${c.r},${c.g},${c.b}`)).size).toBe(4);
    expect(sent.layerModes).toHaveLength(4);
    expect(sent.layerSpeeds).toHaveLength(4);
    for (const c of sent.layerColors) {
      for (const channel of [c.r, c.g, c.b]) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
    for (const mode of sent.layerModes ?? []) expect(mode).toBeGreaterThanOrEqual(0);
    for (const mode of sent.layerModes ?? []) expect(mode).toBeLessThanOrEqual(3);
    for (const speed of sent.layerSpeeds ?? []) {
      expect(speed).toBeGreaterThanOrEqual(0);
      expect(speed).toBeLessThanOrEqual(100);
    }
  });

  it('adopts the firmware RGB state on connect instead of overwriting it blindly', async () => {
    const remote = rgbConfig({
      layerColors: [
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 255, b: 0 },
        { r: 0, g: 0, b: 255 },
        { r: 128, g: 128, b: 128 },
      ],
      layerModes: [1, 2, 3, 0],
      layerSpeeds: [10, 20, 30, 40],
    });
    const statuses = new Set<(s: Record<string, unknown>) => void>();
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    device.bridge.onStatus.mock.calls.forEach(([l]) => statuses.add(l));
    await renderApp();
    device.bridge.onStatus.mock.calls.forEach(([l]) => statuses.add(l));

    await act(async () => {
      for (const listener of statuses) {
        listener({ state: 'connected', device: 'Grid Macro 1 (test)', deviceActiveLayer: 0, rgbConfig: remote });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    });

    // The editor must have taken the device's values, not pushed defaults over them.
    const stored = JSON.parse(window.localStorage.getItem('node-studio.layer-led.v1') || 'null');
    expect(stored).not.toBeNull();
    expect(stored[0].colorHex.toUpperCase()).toBe('#FF0000');
    expect(stored[1].colorHex.toUpperCase()).toBe('#00FF00');
    expect(stored[2].colorHex.toUpperCase()).toBe('#0000FF');
    expect(stored[3].preset).toBe('Off');
    expect(stored.map((c: { speed: number }) => c.speed)).toEqual([10, 20, 30, 40]);
  });

  it('preserves per-layer LED configuration across disconnect and reconnect', async () => {
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();
    await openLedPanel();
    await setBrightness(70);
    expect(rgbWrites(device.bridge).length).toBeGreaterThan(0);
    const before = window.localStorage.getItem('node-studio.layer-led.v1');
    expect(before).not.toBeNull();

    await act(async () => {
      device.emitDisconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    });
    expect(container.querySelector('[data-testid="device-connection-gate"]')).not.toBeNull();
    // A disconnection must not reset the user's lighting.
    expect(window.localStorage.getItem('node-studio.layer-led.v1')).toBe(before);

    await act(async () => {
      device.emitConnect();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    });
    expect(container.querySelector('[data-testid="device-connection-gate"]')).toBeNull();
    expect(window.localStorage.getItem('node-studio.layer-led.v1')).toBe(before);

    // After reconnecting, a further edit must reach the device again.
    const writesAtReconnect = rgbWrites(device.bridge).length;
    await openLedPanel();
    await setBrightness(45);
    expect(rgbWrites(device.bridge).length).toBeGreaterThan(writesAtReconnect);
  });

  it('sends no RGB writes while the device is disconnected', async () => {
    const device = installConnectedDevice({
      request: async (payload) => {
        if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
        return { ok: true, warnings: [] };
      },
    });
    await renderApp();
    await openLedPanel();
    await setBrightness(80);

    await act(async () => {
      device.emitDisconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    });
    const count = rgbWrites(device.bridge).length;
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 700)));
    expect(rgbWrites(device.bridge).length).toBe(count);
  });
});
