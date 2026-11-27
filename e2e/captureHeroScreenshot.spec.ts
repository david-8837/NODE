import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('Hero Screenshot Capture', () => {
  test.use({ viewport: { width: 1350, height: 942 }, deviceScaleFactor: 1 });

  test('captures crisp authentic 1350x942 dark mode hero screenshot for website home', async ({ page }) => {
    await page.addInitScript(() => {
      // 1. Enable Dark Mode in App Settings
      try {
        window.localStorage.setItem(
          'node-studio.settings.v1',
          JSON.stringify({
            launchAtStartup: false,
            startHiddenInTray: false,
            allowTerminalSmartActions: false,
            allowDeviceNotifications: false,
            autoSwitchProfile: false,
            appProfileRules: [],
            cheatSheetGlobalHotkeyEnabled: true,
            cheatSheetGlobalHotkey: 'Ctrl+Alt+M',
            rotaryStepMultiplier: 1,
            rotaryAcceleration: true,
            darkMode: true,
            rgbIdleTimeoutMinutes: 0,
            rgbDimOnScreenLock: true,
          })
        );
      } catch {}

      const slots = ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3'];
      const snapshot = {
        protocolVersion: 13,
        layerCount: 4,
        capturedLayerCount: 4,
        layers: Array.from({ length: 4 }, () => ({
          keys: Object.fromEntries(slots.map((s) => [s, 0])),
          enc: { ccw: 0, cw: 0, press: 0 },
        })),
      };
      const statusObj = {
        state: 'connected',
        device: 'Grid Macro 1',
        fw: 'VIA v13 (RP2040-Zero)',
        path: 'Raw HID 0xFEED:0x6001',
        layerCount: 4,
        deviceActiveLayer: 0,
        activeProfileSlot: 0,
      };

      (window as unknown as { macropad: unknown }).macropad = {
        getStatus: () => Promise.resolve(statusObj),
        onStatus: (cb: (s: typeof statusObj) => void) => {
          cb(statusObj);
          return () => {};
        },
        onEvent: () => () => {},
        getFile: async () => ({ ok: true, data: new Uint8Array([0x01, 0x02, 0x03]) }),
        putFile: async () => ({ ok: true }),
        disconnect: async () => {},
        connect: async () => statusObj,
        request: async (p: { cmd: string }) => {
          if (p.cmd === 'get_config') return { ok: true, snapshot, warnings: [] };
          return { ok: true, warnings: [] };
        },
      };

      (window as unknown as { electronAPI: unknown }).electronAPI = {
        isElectron: true,
        platform: 'win32',
        getVersion: async () => '1.1.24',
        getAppSettings: async () => ({
          ok: true,
          settings: {
            launchAtStartup: true,
            startHiddenInTray: true,
            allowTerminalSmartActions: true,
            allowDeviceNotifications: true,
            rotaryAcceleration: true,
            darkMode: true,
          },
          capabilities: { launchAtStartup: true, firmwareFlash: true, externalLinks: true },
        }),
        setAppSetting: async () => ({ ok: true }),
        getInstalledApplications: async () => ({
          ok: true,
          apps: [],
        }),
      };
    });

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Keymap', exact: true })).toBeVisible({ timeout: 15000 });

    // Hide transient toast notifications
    await page.addStyleTag({ content: '[data-testid="feedback-toast"] { display: none !important; }' });
    await page.waitForTimeout(600);

    // Install a vibrant preset to populate illuminated keys
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    await page.waitForTimeout(600);
    const installBtn = page.locator('button:has-text("Install")').first();
    if (await installBtn.isVisible()) {
      await installBtn.click();
      await page.waitForTimeout(600);
    }
    await page.getByRole('button', { name: 'Keymap', exact: true }).click();
    await page.waitForTimeout(800);

    const targetPath = path.resolve(process.cwd(), 'website/assets/grid-macro-studio-current.png');
    await page.screenshot({ path: targetPath });
    console.log('Saved dark mode hero screenshot to:', targetPath);
  });
});
