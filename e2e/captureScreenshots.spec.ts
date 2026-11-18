import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('Tutorial Screenshots Capture', () => {
  test.use({ viewport: { width: 1280, height: 820 } });

  test('captures crisp authentic screenshots for tutorial page', async ({ page }) => {
    await page.addInitScript(() => {
      const slots = ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3'];
      const snapshot = {
        protocolVersion: 12,
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
        fw: 'VIA 01020304',
        path: 'VIA 4 layers',
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
        getFile: async () => ({ ok: false }),
        putFile: async () => ({ ok: true }),
        disconnect: async () => {},
        connect: async () => statusObj,
        request: async (p: { cmd: string }) => {
          if (p.cmd === 'get_config') return { ok: true, snapshot, warnings: [] };
          return { ok: true, warnings: [] };
        },
      };

      // Mock Electron API for rich desktop features
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        isElectron: true,
        platform: 'win32',
        getVersion: async () => '1.1.11',
        getAppSettings: async () => ({
          ok: true,
          settings: {
            launchAtStartup: true,
            allowTerminalSmartActions: false,
            allowDeviceNotifications: true,
            autoSwitchProfile: true,
            appProfileRules: [
              {
                id: 'rule-code',
                processPattern: 'Code.exe',
                titlePattern: 'Visual Studio Code',
                targetProfileName: 'Full-Stack Dev',
                enabled: true,
              },
              {
                id: 'rule-blender',
                processPattern: 'blender.exe',
                targetProfileName: 'Blender 3D',
                enabled: true,
              },
            ],
          },
          capabilities: { launchAtStartup: true, firmwareFlash: true, externalLinks: true, autoSwitchProfile: true },
        }),
        setAppSetting: async () => ({ ok: true }),
        getInstalledApplications: async () => ({
          ok: true,
          apps: [
            { name: 'Visual Studio Code', shortcutPath: 'C:\\Users\\dev\\Code.lnk' },
            { name: 'Adobe Photoshop', shortcutPath: 'C:\\Users\\dev\\Photoshop.lnk' },
            { name: 'Blender', shortcutPath: 'C:\\Users\\dev\\Blender.lnk' },
          ],
        }),
      };
    });

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Keymap', exact: true })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(600);

    const assetsDir = path.resolve(process.cwd(), 'website/assets');

    // 1. Capture Main Studio View
    await page.screenshot({ path: path.join(assetsDir, 'tutorial-main-studio.png') });

    // 2. Click Key 1 to open drawer with Keycap Legend & Color Personalization
    const key1 = page.locator('[data-drop-slot="r1c1"]');
    if (await key1.isVisible()) {
      await key1.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(assetsDir, 'tutorial-keycap-personalization.png') });
    }

    // 3. Capture Presets Library View
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(assetsDir, 'tutorial-preset-library.png') });

    // 4. Capture Settings & App-to-Profile Rules View
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(assetsDir, 'tutorial-settings-rules.png') });

    // 5. Navigate back to Keymap and open Community Profile Sharing Hub
    await page.getByRole('button', { name: 'Keymap', exact: true }).click();
    await page.waitForTimeout(400);

    const toggleProfileMenu = page.locator('button[aria-label="Toggle profile list"]');
    if (await toggleProfileMenu.isVisible()) {
      await toggleProfileMenu.click();
      await page.waitForTimeout(300);

      const hubBtn = page.locator('button[title*="community-shared profiles"]');
      if (await hubBtn.isVisible()) {
        await hubBtn.click();
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(assetsDir, 'tutorial-community-hub.png') });
      }
    }
  });
});
