/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { DEVICE_KEYMAP_BACKUP_HISTORY_KEY } from '../src/deviceKeymapFiles';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';
import { actionToViaKeycode, VIA_PROTOCOL_VERSION, type ViaConfiguration, type ViaKeymapSnapshot } from '../src/qmkViaBridge';

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
  vi.spyOn(window, 'confirm').mockReturnValue(true);
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
    const writtenConfigurations: ViaConfiguration[] = [];
    let backupPresentAtWrite = false;
    let snapshot = deviceSnapshot();
    const request = vi.fn(async (payload: { cmd?: string; config?: ViaConfiguration }) => {
      if (payload.cmd === 'get_config') {
        return { ok: true, snapshot: structuredClone(snapshot), warnings: [] };
      }
      if (payload.cmd === 'set_config') {
        backupPresentAtWrite ||= window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY) !== null;
        if (payload.config) {
          writtenConfigurations.push(payload.config);
          const layer = payload.config.layers[0];
          for (const [slot, action] of Object.entries(layer.keys ?? {})) {
            const code = actionToViaKeycode(action);
            if (code !== null) snapshot.layers[0].keys[slot] = code;
          }
          for (const direction of ['cw', 'ccw', 'press'] as const) {
            if (layer.enc?.[direction]) snapshot.layers[0].enc[direction] = actionToViaKeycode(layer.enc[direction])!;
          }
        }
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
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual(['get_config', 'get_config', 'set_config', 'get_config']);
    expect(writtenConfigurations[0]?.layers[0]?.enc).toEqual({
      cw: { t: 'none' },
      press: { t: 'none' },
      ccw: { t: 'none' },
    });
    expect(backupPresentAtWrite).toBe(true);
    expect(window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).not.toBeNull();
    expect(bridge.putFile).not.toHaveBeenCalled();

    await openProfiles();
    const profileName = container.querySelector<HTMLInputElement>('input[aria-label^="Rename profile"]');
    expect(profileName).not.toBeNull();
    await act(async () => {
      profileName!.value = 'Metadata only change';
      profileName!.dispatchEvent(new Event('input', { bubbles: true }));
      profileName!.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 800));
    });
    expect(request).toHaveBeenCalledTimes(4);
    expect(bridge.putFile).not.toHaveBeenCalled();

    await emitStatus('disconnected');
    await emitStatus('connected');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 700)); });
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual([
      'get_config', 'get_config', 'set_config', 'get_config', 'get_config',
    ]);
    expect(bridge.putFile).not.toHaveBeenCalled();
  });

  it('preserves a conflicting device and desktop profile when replacement is declined', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const saved = JSON.stringify({ v: 1, activeProfileIndex: 0, profiles: [{ id: 'saved', name: 'Saved', layers: [{ r2c1: { label: 'A', binding: 'A', actionType: 'Basic input' } }] }] });
    localStorage.setItem(PROFILE_FILE_STORAGE_KEY, saved);
    const request = vi.fn(async ({ cmd }: { cmd: string }) => cmd === 'get_config' ? { ok: true, snapshot: deviceSnapshot() } : { ok: true });
    const bridge = { getStatus: async () => ({ state: 'connected', device: 'test' }), onStatus: () => () => {}, onHardwareEvent: () => () => {}, onEvent: () => () => {}, request };
    Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });
    await act(async () => { root.render(createElement(App)); await new Promise(r => setTimeout(r, 800)); });
    await act(async () => { await new Promise(r => setTimeout(r, 800)); });
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(request.mock.calls.some(([p]) => p.cmd === 'set_config')).toBe(false);
    expect(JSON.parse(localStorage.getItem(PROFILE_FILE_STORAGE_KEY)!).profiles[0].layers[0].r2c1.binding).toBe('A');
    expect(localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).not.toBeNull();
  });

  it('does not overwrite corrupt saved data or write the device', async () => {
    const original = '{ broken profile';
    localStorage.setItem(PROFILE_FILE_STORAGE_KEY, original);
    const request = vi.fn();
    Object.defineProperty(window, 'macropad', { configurable: true, value: {
      getStatus: async () => ({ state: 'connected' }), onStatus: () => () => {}, onHardwareEvent: () => () => {}, onEvent: () => () => {}, request,
    } });
    await act(async () => { root.render(createElement(App)); await new Promise(r => setTimeout(r, 700)); });
    expect(localStorage.getItem(PROFILE_FILE_STORAGE_KEY)).toBe(original);
    expect(request).not.toHaveBeenCalled();
    expect(container.textContent).toContain('Original data preserved');
  });

  it('keeps a failed device write paused and visibly preserves the backup', async () => {
    const request = vi.fn(async ({ cmd }: { cmd: string }) => cmd === 'get_config'
      ? { ok: true, snapshot: deviceSnapshot() }
      : { ok: false, error: 'simulated partial write' });
    Object.defineProperty(window, 'macropad', { configurable: true, value: {
      getStatus: async () => ({ state: 'connected', device: 'test' }), onStatus: () => () => {}, onHardwareEvent: () => () => {}, onEvent: () => () => {}, request,
    } });
    await act(async () => root.render(createElement(App)));
    await act(async () => { await vi.waitFor(() => expect(request.mock.calls.some(([p]) => p.cmd === 'set_config')).toBe(true), { timeout: 3000 }); });
    await act(async () => { await new Promise(r => setTimeout(r, 2300)); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('device sync failed');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('backup');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Restore device backup');
    expect(localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).not.toBeNull();
  });

  it('restores a multi-action and the selected simulator layer after a restart', async () => {
    const multi = { kind: 'multi', gestures: { onTap: 'A', doubleTap: 'B', onHold: 'C', tapHold: 'D' }, tappingTermMs: 250 };
    localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({ v: 1, activeProfileIndex: 0, activeLayerIndex: 1, profiles: [{ id: 'saved', name: 'Saved', layers: [{}, { r2c1: { label: 'Multi', binding: 'Multi', actionType: 'Multi-step action', execution: multi } }] }] }));
    await act(async () => root.render(createElement(App)));
    expect(container.querySelector('button[data-drop-slot="r2c1"]')?.getAttribute('title')).toBe('Multi');
    const stored = JSON.parse(localStorage.getItem(PROFILE_FILE_STORAGE_KEY)!);
    expect(stored.activeLayerIndex).toBe(1);
    expect(stored.profiles[0].layers[1].r2c1.execution).toMatchObject(multi);
  });

  it('keeps missing actions blank in saved empty layers and preserves explicit dial assignments', async () => {
    window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({
      v: 1,
      activeProfileIndex: 0,
      profiles: [
        { id: 'empty-profile', name: 'Empty layer', layers: [{}] },
        {
          id: 'assigned-profile',
          name: 'Assigned dial',
          layers: [{
            'dial-tl': {
              label: 'Custom dial',
              binding: 'Custom dial',
              encoderActions: {
                cw: { label: 'Next', binding: 'next track' },
              },
            },
          }],
        },
      ],
    }));

    await act(async () => root.render(createElement(App)));
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });

    const savedState = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null') as {
      profiles: Array<{ layers: Array<Record<string, unknown>> }>;
    };
    const emptyDial = savedState.profiles[0]?.layers[0]?.['dial-tl'] as {
      label: string;
      binding: string;
      encoderActions: Record<'cw' | 'press' | 'ccw', { label: string; binding: string }>;
    };
    expect(emptyDial).toMatchObject({
      label: '',
      binding: 'blank',
      encoderActions: {
        cw: { label: '', binding: 'blank' },
        press: { label: '', binding: 'blank' },
        ccw: { label: '', binding: 'blank' },
      },
    });

    const assignedDial = savedState.profiles[1]?.layers[0]?.['dial-tl'] as {
      encoderActions: Record<'cw' | 'press' | 'ccw', { label: string; binding: string }>;
    };
    expect(assignedDial.encoderActions).toEqual({
      cw: { label: 'Next', binding: 'next track' },
      press: { label: '', binding: 'blank' },
      ccw: { label: '', binding: 'blank' },
    });
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
    expect(container.textContent).toContain('Device sync paused: could not read and preserve the existing device keymap');
  });
});
