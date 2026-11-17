/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';
import { emptyKeymapSnapshot } from './helpers/connectedDevice';

let container: HTMLDivElement;
let root: Root;

const SAVED_STATE = JSON.stringify({
  v: 1,
  profiles: [{
    id: 'kept-profile',
    name: 'Keep Me',
    color: '#0051ff',
    layers: [{ r1c1: { label: 'SAVED', binding: 'A', actionType: 'Basic input' } }],
  }],
  activeProfileIndex: 0,
  customItems: {
    Action: [{ id: 'kept-action', main: 'Saved action', binding: '(App: Editor)' }],
    'Multi-A': [],
    'Smart-A': [],
  },
});

interface FakeBridgeOptions {
  initialState?: string;
  /** Devices found by a silent scan; used to model a replug. */
  reconnectAfterScan?: number;
  connectResult?: string;
}

function installBridge(options: FakeBridgeOptions = {}) {
  let state = options.initialState ?? 'disconnected';
  let scans = 0;
  const statusListeners = new Set<(status: Record<string, unknown>) => void>();
  const eventListeners = new Set<(event: unknown) => void>();
  const status = () => ({
    state,
    device: state === 'connected' ? 'Grid Macro 1 (test)' : undefined,
    deviceActiveLayer: 0,
    activeProfileSlot: 0,
    layerCount: 4,
  });
  const emitStatus = () => {
    for (const listener of statusListeners) listener(status());
  };

  const bridge = {
    getStatus: vi.fn(async () => {
      scans += 1;
      if (options.reconnectAfterScan !== undefined && scans >= options.reconnectAfterScan && state !== 'connected') {
        state = 'connected';
        emitStatus();
      }
      return status();
    }),
    onStatus: vi.fn((listener: (value: Record<string, unknown>) => void) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    }),
    onEvent: vi.fn((listener: (value: unknown) => void) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    }),
    connect: vi.fn(async () => {
      state = options.connectResult ?? 'connected';
      emitStatus();
      return status();
    }),
    disconnect: vi.fn(async () => {
      state = 'disconnected';
      emitStatus();
    }),
    getFile: vi.fn(async () => ({ ok: false, error: 'Profiles remain in local storage' })),
    putFile: vi.fn(async () => ({ ok: true, localOnly: true })),
    request: vi.fn(async (payload: { cmd?: string }) => {
      if (state !== 'connected') return { ok: false, error: 'No QMK/VIA device is connected' };
      if (payload.cmd === 'get_config') return { ok: true, snapshot: emptyKeymapSnapshot(), warnings: [] };
      return { ok: true, warnings: [] };
    }),
  };
  Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });

  return {
    bridge,
    get scanCount() { return scans; },
    async emitState(next: string) {
      state = next;
      await act(async () => {
        emitStatus();
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      });
    },
  };
}

async function renderApp() {
  await act(async () => root.render(createElement(App)));
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 30)));
}

function gate(): HTMLElement | null {
  return container.querySelector<HTMLElement>('[data-testid="device-connection-gate"]');
}

function retryButton(): HTMLButtonElement {
  return container.querySelector<HTMLButtonElement>('[data-testid="device-gate-retry"]')!;
}

function navButtons(): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('nav button')];
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, SAVED_STATE);
  vi.restoreAllMocks();
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: undefined });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  delete (window as Window & { macropad?: unknown }).macropad;
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  vi.useRealTimers();
  await act(async () => root.unmount());
  container.remove();
});

describe('mandatory device connection gate', () => {
  it('launches to a full-screen gate with no editing surface when no device is present', async () => {
    installBridge();
    await renderApp();

    expect(gate()).not.toBeNull();
    expect(gate()?.textContent).toContain('Connect your Micro Pad to continue.');
    expect(gate()?.querySelector('[aria-label="Micro Pad illustration"]')).not.toBeNull();
    expect(retryButton().textContent).toContain('Retry Connection');
    expect(gate()?.getAttribute('class')).toContain('fixed inset-0');

    // No configurator control may be reachable while disconnected.
    expect(navButtons()).toHaveLength(0);
    expect(container.querySelector('[data-drop-slot^="r"]')).toBeNull();
    expect(container.querySelector('input[type="text"]')).toBeNull();
    expect(container.textContent).not.toContain('Key Mapping');
  });

  it('shows the gate when WebHID is unavailable rather than an editable configurator', async () => {
    installBridge({ initialState: 'unavailable' });
    await renderApp();

    expect(gate()).not.toBeNull();
    expect(gate()?.textContent).toContain('USB unavailable');
    expect(navButtons()).toHaveLength(0);
  });

  it('does not treat an in-progress or unresponsive connection as connected', async () => {
    const device = installBridge({ initialState: 'connecting' });
    await renderApp();
    expect(gate()).not.toBeNull();
    expect(gate()?.textContent).toContain('Connecting');
    expect(retryButton().disabled).toBe(true);
    expect(navButtons()).toHaveLength(0);

    await device.emitState('searching');
    expect(gate()).not.toBeNull();
    expect(gate()?.textContent).toContain('Looking for your Micro Pad');
    expect(navButtons()).toHaveLength(0);

    // A device that opened USB but never completed the handshake stays locked.
    await device.emitState('disconnected');
    expect(gate()).not.toBeNull();
    expect(navButtons()).toHaveLength(0);
  });

  it('surfaces the firmware error text on the gate', async () => {
    const device = installBridge();
    await renderApp();
    await act(async () => {
      // The bridge reports why the handshake failed.
      const listener = device.bridge.onStatus.mock.calls[0][0];
      listener({ state: 'disconnected', error: 'Unsupported VIA protocol 9; expected 12' });
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });
    expect(gate()?.textContent).toContain('Unsupported VIA protocol 9');
  });

  it('runs the permission flow from Retry Connection and unlocks only once connected', async () => {
    const device = installBridge({ connectResult: 'disconnected' });
    await renderApp();

    await act(async () => {
      retryButton().click();
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    expect(device.bridge.connect).toHaveBeenCalledOnce();
    // Still unresponsive: the gate must remain.
    expect(gate()).not.toBeNull();
    expect(navButtons()).toHaveLength(0);

    await device.emitState('connected');
    expect(gate()).toBeNull();
    expect(navButtons().map((button) => button.textContent?.trim())).toContain('Keymap');
    expect(container.querySelector('[data-drop-slot^="r"]')).not.toBeNull();
  });

  it('transitions automatically on a silent re-scan without a permission prompt or restart', async () => {
    vi.useFakeTimers();
    const device = installBridge({ reconnectAfterScan: 3 });
    await act(async () => root.render(createElement(App)));
    await act(async () => { await Promise.resolve(); });
    expect(gate()).not.toBeNull();

    await act(async () => { vi.advanceTimersByTime(4500); });
    await act(async () => { await Promise.resolve(); });

    expect(gate()).toBeNull();
    expect(device.bridge.connect).not.toHaveBeenCalled();
    expect(container.querySelector('[data-drop-slot^="r"]')).not.toBeNull();
    vi.useRealTimers();
  });

  it('locks editing immediately on disconnect and sends no further device commands', async () => {
    const device = installBridge({ initialState: 'connected' });
    await renderApp();
    expect(gate()).toBeNull();
    expect(container.querySelector('[data-drop-slot^="r"]')).not.toBeNull();

    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 60)));
    const callsAtDisconnect = device.bridge.request.mock.calls.length;

    await device.emitState('disconnected');

    expect(gate()).not.toBeNull();
    expect(navButtons()).toHaveLength(0);
    expect(container.querySelector('[data-drop-slot^="r"]')).toBeNull();

    // Give any pending sync effect time to fire; nothing may reach the device.
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 400)));
    const writes = device.bridge.request.mock.calls.slice(callsAtDisconnect)
      .filter(([payload]) => payload.cmd === 'set_config' || payload.cmd === 'set_rgb_config' || payload.cmd === 'select_layer');
    expect(writes).toHaveLength(0);
  });

  it('preserves profiles, layers and custom actions across disconnect and reconnect', async () => {
    const device = installBridge({ initialState: 'connected' });
    await renderApp();
    expect(container.textContent).toContain('Keep Me');
    // The editor normalises blank slots on load, so compare against the state
    // as it stood just before the cable was pulled, not the raw seed.
    const beforeDisconnect = window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY);
    expect(beforeDisconnect).toContain('Keep Me');

    await device.emitState('disconnected');
    expect(gate()).not.toBeNull();
    // Storage must be untouched, not reset to defaults.
    expect(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY)).toBe(beforeDisconnect);
    expect(gate()?.textContent).toContain('stay intact');

    await device.emitState('connected');
    expect(gate()).toBeNull();
    expect(container.textContent).toContain('Keep Me');
    const stored = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(stored.profiles[0].name).toBe('Keep Me');
    expect(stored.profiles[0].layers[0].r1c1.label).toBe('SAVED');
    expect(stored.customItems.Action).toContainEqual(expect.objectContaining({ id: 'kept-action' }));
  });

  it('restores the firmware-reported layer on reconnect instead of assuming layer 1', async () => {
    const device = installBridge({ initialState: 'connected' });
    await renderApp();

    await device.emitState('disconnected');
    await act(async () => {
      const listener = device.bridge.onStatus.mock.calls[0][0];
      listener({ state: 'connected', device: 'Grid Macro 1 (test)', deviceActiveLayer: 0 });
      await new Promise((resolve) => window.setTimeout(resolve, 20));
    });

    expect(gate()).toBeNull();
    const activeLayer = container.querySelector<HTMLButtonElement>('button[title="Layer 1"][aria-pressed="true"]');
    expect(activeLayer).not.toBeNull();
  });

  it('keeps the gate up when the bridge is missing entirely', async () => {
    Object.defineProperty(window, 'macropad', { configurable: true, value: undefined });
    await renderApp();
    expect(gate()).not.toBeNull();
    expect(navButtons()).toHaveLength(0);
  });
});
