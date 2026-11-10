import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import {
  createDeviceKeymapBackup,
  createDeviceKeymapFileTools,
  DEVICE_KEYMAP_BACKUP_HISTORY_KEY,
  DEVICE_BACKUP_HISTORY_LIMIT,
  parseDeviceKeymapBackup,
  stringifyDeviceKeymapBackup,
} from '../src/deviceKeymapFiles';
import { VIA_PROTOCOL_VERSION, type ViaKeymapSnapshot } from '../src/qmkViaBridge';

function snapshot(seed = 0): ViaKeymapSnapshot {
  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: 1,
    capturedLayerCount: 1,
    layers: [{
      keys: {
        r1c1: seed,
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

function memoryWindow() {
  const entries = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => { entries.set(key, value); },
    removeItem: (key: string) => { entries.delete(key); },
  };
  return {
    entries,
    host: { localStorage } as unknown as Window & typeof globalThis,
  };
}

describe('local VIA keymap backup files', () => {
  it('validates, serializes, and parses a versioned backup without profile data', () => {
    const backup = createDeviceKeymapBackup(snapshot(0x0004), {
      device: 'Grid Macro 1',
      firmware: 'VIA 01020304',
      createdAt: '2026-11-09T00:00:00.000Z',
    });
    const parsed = parseDeviceKeymapBackup(stringifyDeviceKeymapBackup(backup));

    expect(parsed).toMatchObject({
      format: 'node-studio-via-keymap-backup',
      version: 1,
      device: 'Grid Macro 1',
      firmware: 'VIA 01020304',
      snapshot: { protocolVersion: VIA_PROTOCOL_VERSION, layerCount: 1, capturedLayerCount: 1 },
    });
    expect(parsed.snapshot.layers[0].keys.r1c1).toBe(0x0004);
    expect('profiles' in parsed).toBe(false);
  });

  it('rejects invalid protocol, missing mappings, invalid keycodes, and unsupported formats', () => {
    const valid = createDeviceKeymapBackup(snapshot());
    expect(() => parseDeviceKeymapBackup(JSON.stringify({ ...valid, version: 2 })))
      .toThrow('not a supported');
    expect(() => createDeviceKeymapBackup({ ...snapshot(), protocolVersion: 1 }))
      .toThrow('unsupported VIA protocol');
    const missing = snapshot() as any;
    delete missing.layers[0].keys.r2c3;
    expect(() => createDeviceKeymapBackup(missing)).toThrow('r2c3');
    const invalidCode = snapshot() as any;
    invalidCode.layers[0].enc.cw = 0x10000;
    expect(() => createDeviceKeymapBackup(invalidCode)).toThrow('encoder CW');
    expect(() => parseDeviceKeymapBackup('{broken')).toThrow('not valid JSON');
  });

  it('saves pre-sync snapshots locally and retains only a bounded, deduplicated history', () => {
    const { host, entries } = memoryWindow();
    const files = createDeviceKeymapFileTools(host);

    expect(files.savePreSyncSnapshot(snapshot(0x0004), {
      device: 'Grid Macro 1',
      firmware: 'VIA 01020304',
      createdAt: '2026-11-09T00:00:00.000Z',
    })).toMatchObject({ ok: true, localOnly: true });
    expect(entries.has(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).toBe(true);
    expect(files.getLatestBackup()?.snapshot.layers[0].keys.r1c1).toBe(0x0004);
    expect(files.latestSummary()).toContain('Saved locally');

    // A duplicate snapshot does not create redundant entries.
    files.savePreSyncSnapshot(snapshot(0x0004), { createdAt: '2026-11-09T00:00:01.000Z' });
    expect(JSON.parse(entries.get(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)!).entries).toHaveLength(1);

    for (let value = 1; value <= DEVICE_BACKUP_HISTORY_LIMIT + 2; value += 1) {
      files.savePreSyncSnapshot(snapshot(value), { createdAt: `2026-11-09T00:00:${String(value + 2).padStart(2, '0')}.000Z` });
    }
    const history = JSON.parse(entries.get(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)!);
    expect(history.entries).toHaveLength(DEVICE_BACKUP_HISTORY_LIMIT);
    expect(files.getLatestBackup()?.snapshot.layers[0].keys.r1c1).toBe(DEVICE_BACKUP_HISTORY_LIMIT + 2);
  });

  it('saves the connected device locally before restoring an imported backup', async () => {
    const app = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
    const host = app.window as unknown as Window & typeof globalThis;
    vi.spyOn(app.window.HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(app.window, 'confirm', { configurable: true, value: vi.fn(() => true) });
    const currentDevice = snapshot(0x0041);
    const importedBackup = createDeviceKeymapBackup(snapshot(0x0004), {
      device: 'Imported board backup',
      createdAt: '2026-11-08T00:00:00.000Z',
    });
    const bridge = {
      request: vi.fn(async (request: { cmd: 'get_config' | 'restore_config'; snapshot?: ViaKeymapSnapshot }) =>
        request.cmd === 'get_config'
          ? { ok: true, snapshot: currentDevice }
          : { ok: true, changedMappings: 1 }),
    };
    const files = createDeviceKeymapFileTools(host);
    const restoring = files.restoreFromFile(bridge, { device: 'Connected test device', firmware: 'VIA test' });
    const input = app.window.document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new (app.window as any).File(
      [stringifyDeviceKeymapBackup(importedBackup)],
      'keymap-backup.json',
      { type: 'application/json' },
    );
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    const result = await restoring;

    expect(result).toMatchObject({ ok: true, changedMappings: 1, preRestoreBackupSaved: true });
    expect(bridge.request.mock.calls.map(([request]) => request.cmd)).toEqual(['get_config', 'restore_config']);
    expect(bridge.request.mock.calls[1][0].snapshot).toEqual(importedBackup.snapshot);
    expect(files.getLatestBackup()).toMatchObject({
      device: 'Connected test device',
      firmware: 'VIA test',
      snapshot: currentDevice,
    });
    expect(input.isConnected).toBe(false);
    app.window.close();
  });

  it('refuses a restore when the current device keymap cannot be backed up', async () => {
    const app = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
    const host = app.window as unknown as Window & typeof globalThis;
    vi.spyOn(app.window.HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(app.window, 'confirm', { configurable: true, value: vi.fn(() => true) });
    const importedBackup = createDeviceKeymapBackup(snapshot(0x0004));
    const bridge = {
      request: vi.fn(async (request: { cmd: 'get_config' | 'restore_config'; snapshot?: ViaKeymapSnapshot }) =>
        request.cmd === 'get_config'
          ? { ok: false, error: 'Device read timed out' }
          : { ok: true, changedMappings: 1 }),
    };
    const files = createDeviceKeymapFileTools(host);
    const restoring = files.restoreFromFile(bridge);
    const input = app.window.document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new (app.window as any).File(
      [stringifyDeviceKeymapBackup(importedBackup)],
      'keymap-backup.json',
      { type: 'application/json' },
    );
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    const result = await restoring;

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('pre-restore backup') });
    expect(result.preRestoreBackupSaved).toBe(false);
    expect(bridge.request.mock.calls.map(([request]) => request.cmd)).toEqual(['get_config']);
    expect(files.getLatestBackup()).toBeNull();
    app.window.close();
  });

  it('does not restore when the pre-restore snapshot cannot be persisted locally', async () => {
    const app = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
    const host = app.window as unknown as Window & typeof globalThis;
    host.localStorage.setItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY, '{broken');
    vi.spyOn(app.window.HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(app.window, 'confirm', { configurable: true, value: vi.fn(() => true) });
    const importedBackup = createDeviceKeymapBackup(snapshot(0x0004));
    const bridge = {
      request: vi.fn(async (request: { cmd: 'get_config' | 'restore_config'; snapshot?: ViaKeymapSnapshot }) =>
        request.cmd === 'get_config'
          ? { ok: true, snapshot: snapshot(0x0041) }
          : { ok: true, changedMappings: 1 }),
    };
    const files = createDeviceKeymapFileTools(host);
    const restoring = files.restoreFromFile(bridge);
    const input = app.window.document.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new (app.window as any).File(
      [stringifyDeviceKeymapBackup(importedBackup)],
      'keymap-backup.json',
      { type: 'application/json' },
    );
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    const result = await restoring;

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining('pre-restore device keymap locally'),
      preRestoreBackupSaved: false,
    });
    expect(bridge.request.mock.calls.map(([request]) => request.cmd)).toEqual(['get_config']);
    app.window.close();
  });

  it('fails closed if saved backup history is corrupt instead of overwriting it', () => {
    const { host, entries } = memoryWindow();
    entries.set(DEVICE_KEYMAP_BACKUP_HISTORY_KEY, '{broken');
    const files = createDeviceKeymapFileTools(host);

    expect(files.getLatestBackup()).toBeNull();
    expect(files.latestSummary()).toContain('corrupt');
    expect(files.savePreSyncSnapshot(snapshot())).toMatchObject({
      ok: false,
      error: expect.stringContaining('corrupt'),
    });
  });
});
