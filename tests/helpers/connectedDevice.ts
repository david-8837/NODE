import { vi } from 'vitest';

export interface FakeConnectedBridgeOptions {
  deviceActiveLayer?: number;
  activeProfileSlot?: number;
  /** Override the request handler for tests that assert on specific commands. */
  request?: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

/**
 * Install a `window.macropad` stand-in that reports a verified, connected device.
 *
 * The app now gates its whole configurator behind a confirmed device connection,
 * so tests that exercise editing must start from a connected device just like the
 * real app does. Tests covering the gate itself should NOT use this helper.
 */
export function installConnectedDevice(options: FakeConnectedBridgeOptions = {}) {
  let layer = options.deviceActiveLayer ?? 0;
  const slot = options.activeProfileSlot ?? 0;
  const statusListeners = new Set<(status: Record<string, unknown>) => void>();
  const eventListeners = new Set<(event: unknown) => void>();

  const status = () => ({
    state: 'connected',
    device: 'Grid Macro 1 (test)',
    fw: 'VIA 01020304',
    path: 'VIA 4 layers',
    layerCount: 4,
    deviceActiveLayer: layer,
    activeProfileSlot: slot,
  });

  const emitStatus = () => {
    for (const listener of statusListeners) listener(status());
  };

  const defaultRequest = async (payload: Record<string, unknown>) => {
    if (payload.cmd === 'select_layer') {
      const target = Number(payload.layer);
      if (!Number.isInteger(target) || target < 0 || target > 3) {
        return { ok: false, error: 'Layer must be between 0 and 3' };
      }
      layer = target;
      const event = { type: 'layer_state', deviceActiveLayer: layer, activeProfileSlot: slot };
      for (const listener of eventListeners) listener(event);
      emitStatus();
      return { ok: true, deviceActiveLayer: layer, activeProfileSlot: slot, requestedLayer: target, confirmed: true };
    }
    if (payload.cmd === 'get_device_state') {
      return { ok: true, deviceActiveLayer: layer, activeProfileSlot: slot };
    }
    if (payload.cmd === 'get_config') return { ok: false, error: 'No snapshot in this test' };
    return { ok: true, warnings: [] };
  };

  const bridge = {
    getStatus: vi.fn(async () => status()),
    onStatus: vi.fn((listener: (value: Record<string, unknown>) => void) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    }),
    onEvent: vi.fn((listener: (value: unknown) => void) => {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    }),
    connect: vi.fn(async () => status()),
    disconnect: vi.fn(async () => undefined),
    getFile: vi.fn(async () => ({ ok: false, error: 'Profiles remain in local storage' })),
    putFile: vi.fn(async () => ({ ok: true, localOnly: true })),
    request: vi.fn(options.request ?? defaultRequest),
  };

  Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });

  return {
    bridge,
    /** Simulate the firmware reporting a layer change from a physical key. */
    emitHardwareLayer(nextLayer: number) {
      layer = nextLayer;
      const event = { type: 'layer_state', deviceActiveLayer: nextLayer, activeProfileSlot: slot };
      for (const listener of eventListeners) listener(event);
    },
    emitDisconnect() {
      for (const listener of statusListeners) listener({ state: 'disconnected', error: 'The device was disconnected' });
    },
    emitConnect() { emitStatus(); },
    get activeLayer() { return layer; },
  };
}

export function removeConnectedDevice() {
  delete (window as Window & { macropad?: unknown }).macropad;
}
