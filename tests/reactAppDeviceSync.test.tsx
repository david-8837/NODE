/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEVICE_KEYMAP_BACKUP_HISTORY_KEY } from '../src/deviceKeymapFiles';
import { VIA_PROTOCOL_VERSION, type ViaKeymapSnapshot } from '../src/qmkViaBridge';

let container: HTMLDivElement;
let root: Root;

function deviceSnapshot(): ViaKeymapSnapshot {
  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: 1,
    capturedLayerCount: 1,
    layers: [{
      keys: {
        r1c1: 0x0004,
        r1c2: 0x0005,
        r1c3: 0x0006,
        r2c1: 0x0007,
        r2c2: 0x0008,
        r2c3: 0x0009,
        r3c1: 0x000a,
        r3c2: 0x000b,
        r3c3: 0x000c,
      },
      enc: { ccw: 0x00aa, cw: 0x00a9, press: 0x0028 },
    }],
  };
}

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

async function openProfiles() {
  await click(container.querySelector<HTMLButtonElement>(
    'button[aria-label="Toggle profile list"]'
  )!);
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'macropad', { configurable: true, value: undefined });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete (window as Window & { macropad?: unknown }).macropad;
});

describe('production React app device sync', () => {
  it('backs up before writes, skips profile-metadata-only sync, and syncs again after reconnect', async () => {
    const statusListeners = new Set<(status: { state: string; device?: string; fw?: string }) => void>();
    let backupPresentAtWrite = false;
    const request = vi.fn(async (payload: { cmd?: string }) => {
      if (payload.cmd === 'get_config') {
        return { ok: true, snapshot: deviceSnapshot(), warnings: [] };
      }
      if (payload.cmd === 'set_config') {
        backupPresentAtWrite ||= window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY) !== null;
        return { ok: true, warnings: [] };
      }
      return { ok: false, error: 'Unsupported request' };
    });
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string; device?: string; fw?: string }) => void) => {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFile: vi.fn().mockResolvedValue({ ok: false, error: 'Profiles remain in browser storage' }),
      request,
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });
    await act(async () => root.render(createElement(App)));
    await vi.waitFor(() => expect(statusListeners.size).toBeGreaterThan(0));

    const emitStatus = async (state: string) => {
      await act(async () => {
        for (const listener of statusListeners) listener({ state, device: 'Test Grid Macro', fw: 'VIA test' });
        await new Promise((resolve) => window.setTimeout(resolve, 20));
      });
    };
    const waitForWriteCount = async (count: number) => {
      await act(async () => {
        await vi.waitFor(() => {
          expect(request.mock.calls.filter(([payload]) => payload.cmd === 'set_config')).toHaveLength(count);
        }, { timeout: 2000 });
      });
    };

    await emitStatus('connected');
    await waitForWriteCount(1);
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual(['get_config', 'set_config']);
    expect(backupPresentAtWrite).toBe(true);
    expect(window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).not.toBeNull();
    expect(bridge.putFile).toHaveBeenCalledOnce();

    await openProfiles();
    const profileName = container.querySelector<HTMLInputElement>('input[aria-label^="Rename profile"]');
    expect(profileName).not.toBeNull();
    await act(async () => {
      profileName!.value = 'Metadata only change';
      profileName!.dispatchEvent(new Event('input', { bubbles: true }));
      profileName!.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(bridge.putFile).toHaveBeenCalledOnce();

    await emitStatus('disconnected');
    await emitStatus('connected');
    await waitForWriteCount(2);
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual([
      'get_config', 'set_config', 'get_config', 'set_config',
    ]);
    expect(bridge.putFile).toHaveBeenCalledTimes(2);
  });

  it('keeps the edited profile local when a pre-sync device read fails', async () => {
    const listeners = new Set<(status: { state: string }) => void>();
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string }) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect: vi.fn(),
      disconnect: vi.fn(),
      getFile: vi.fn().mockResolvedValue({ ok: false, error: 'Profiles remain in browser storage' }),
      request: vi.fn().mockResolvedValue({ ok: false, error: 'VIA read timed out' }),
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });
    await act(async () => root.render(createElement(App)));
    await vi.waitFor(() => expect(listeners.size).toBeGreaterThan(0));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
    await act(async () => {
      for (const listener of listeners) listener({ state: 'connected' });
    });
    await act(async () => {
      await vi.waitFor(() => expect(bridge.request).toHaveBeenCalledWith({ cmd: 'get_config' }), {
        timeout: 2000,
      });
    });

    expect(bridge.request).toHaveBeenCalledWith({ cmd: 'get_config' });
    expect(bridge.request).not.toHaveBeenCalledWith(expect.objectContaining({ cmd: 'set_config' }));
    expect(window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem('cm2.state.v2') || 'null')?.profiles).toBeDefined();
    expect(container.textContent).toContain('device sync paused because a pre-sync backup could not be read');
  });
});
