import { createRequire } from 'node:module';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  APP_SETTINGS_STORAGE_KEY,
  checkLatestFirmwareRelease,
  createAppSettingsTools,
  DEFAULT_APP_SETTINGS,
  LATEST_FIRMWARE_RELEASE_API,
  SUPPORT_LINKS,
} from '../src/appSettings';

const require = createRequire(import.meta.url);
const { RP2040_FAMILY_ID, validateRp2040Uf2 } = require('../electron/uf2Validator.cjs') as {
  RP2040_FAMILY_ID: number;
  validateRp2040Uf2: (data: Buffer | Uint8Array) => { ok: boolean; error?: string; blockCount?: number };
};

const windows: JSDOM[] = [];

afterEach(() => {
  for (const dom of windows.splice(0)) dom.window.close();
  vi.restoreAllMocks();
});

function createWindow() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://node-studio.test/',
  });
  windows.push(dom);
  return dom.window as unknown as Window & typeof globalThis;
}

describe('Settings persistence and native capabilities', () => {
  it('uses privacy-safe defaults and persists only validated booleans', async () => {
    const host = createWindow();
    const tools = createAppSettingsTools(host);
    expect(tools.read()).toEqual(DEFAULT_APP_SETTINGS);

    const result = await tools.set('allowTerminalSmartActions', true);
    expect(result).toMatchObject({
      ok: true,
      settings: { allowTerminalSmartActions: true },
    });
    expect(JSON.parse(host.localStorage.getItem(APP_SETTINGS_STORAGE_KEY) || 'null'))
      .toMatchObject({ allowTerminalSmartActions: true });

    host.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify({
      allowAnalytics: 'yes',
      allowTerminalSmartActions: true,
      launchAtStartup: 1,
    }));
    expect(tools.read()).toEqual({ ...DEFAULT_APP_SETTINGS, allowTerminalSmartActions: true });
  });

  it('requires the native startup capability and delegates desktop settings to the trusted bridge', async () => {
    const host = createWindow();
    const browserTools = createAppSettingsTools(host);
    const unsupported = await browserTools.set('launchAtStartup', true);
    expect(unsupported).toMatchObject({
      ok: false,
      error: expect.stringContaining('installed desktop app'),
    });
    expect(browserTools.read().launchAtStartup).toBe(false);

    let nativeSettings = { ...DEFAULT_APP_SETTINGS };
    const capabilities = { launchAtStartup: true, firmwareFlash: true, externalLinks: true };
    host.electronAPI = {
      getAppSettings: vi.fn(async () => ({ ok: true, settings: nativeSettings, capabilities })),
      setAppSetting: vi.fn(async (key, value) => {
        nativeSettings = { ...nativeSettings, [key]: value };
        return { ok: true, settings: nativeSettings, capabilities };
      }),
    };

    expect(await browserTools.getDesktop()).toMatchObject({ ok: true, capabilities });
    const enabled = await browserTools.set('launchAtStartup', true);
    expect(enabled).toMatchObject({ ok: true, settings: { launchAtStartup: true } });
    expect(host.electronAPI.setAppSetting).toHaveBeenCalledWith('launchAtStartup', true);
  });

  it('requires notification permission before recording notification consent', async () => {
    const host = createWindow();
    class MockNotification {
      static permission: NotificationPermission = 'default';
      static requestPermission = vi.fn(async () => {
        MockNotification.permission = 'granted';
        return 'granted' as NotificationPermission;
      });
    }
    host.Notification = MockNotification as unknown as typeof Notification;
    const tools = createAppSettingsTools(host);

    const result = await tools.set('allowDeviceNotifications', true);
    expect(result.ok).toBe(true);
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
    expect(tools.read().allowDeviceNotifications).toBe(true);
  });

  it('opens only configured support links and checks the real firmware release feed', async () => {
    const host = createWindow();
    const open = vi.fn(() => ({ opener: null }));
    host.open = open as unknown as typeof host.open;
    const tools = createAppSettingsTools(host);
    expect(await tools.openSupport('Help & Documentation')).toEqual({ ok: true });
    expect(open).toHaveBeenCalledWith(SUPPORT_LINKS.help, '_blank');
    expect(await tools.openSupport('https://evil.test')).toMatchObject({ ok: false });

    const noReleaseFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const noRelease = await checkLatestFirmwareRelease(noReleaseFetch as unknown as typeof fetch);
    expect(noReleaseFetch).toHaveBeenCalledWith(
      LATEST_FIRMWARE_RELEASE_API,
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(noRelease.state).toBe('none');
    expect(noRelease.message).toContain('There is no published firmware release yet');

    const release = await checkLatestFirmwareRelease(vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tag_name: 'firmware-v2',
        html_url: 'https://github.com/david-8837/NODE/releases/tag/firmware-v2',
        assets: [{
          name: 'grid_macro_1_via.uf2',
          browser_download_url: 'https://github.com/david-8837/NODE/releases/download/firmware-v2/grid_macro_1_via.uf2',
        }],
      }),
    }) as unknown as typeof fetch);
    expect(release).toMatchObject({ state: 'available', version: 'firmware-v2' });
    expect(release.message).toContain("cannot compare release tags with the device's VIA build ID");
  });

  it('validates every UF2 block and accepts only RP2040 family images', () => {
    const makeBlock = (familyId = RP2040_FAMILY_ID) => {
      const block = Buffer.alloc(512);
      block.writeUInt32LE(0x0a324655, 0);
      block.writeUInt32LE(0x9e5d5157, 4);
      block.writeUInt32LE(0x00002000, 8);
      block.writeUInt32LE(0x10000000, 12);
      block.writeUInt32LE(256, 16);
      block.writeUInt32LE(0, 20);
      block.writeUInt32LE(1, 24);
      block.writeUInt32LE(familyId, 28);
      block.writeUInt32LE(0x0ab16f30, 508);
      return block;
    };

    expect(validateRp2040Uf2(makeBlock())).toMatchObject({ ok: true, blockCount: 1 });
    expect(validateRp2040Uf2(makeBlock(0x12345678))).toMatchObject({
      ok: false,
      error: 'Firmware does not declare the RP2040 target family',
    });
    const malformed = makeBlock();
    malformed.writeUInt32LE(0, 4);
    expect(validateRp2040Uf2(malformed)).toMatchObject({ ok: false, error: expect.stringContaining('magic') });
    expect(validateRp2040Uf2(Buffer.alloc(513))).toMatchObject({ ok: false, error: expect.stringContaining('valid-size') });
  });
});
