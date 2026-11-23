import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('Tutorial Screenshots Capture', () => {
  test.use({ viewport: { width: 1280, height: 820 } });

  test('captures crisp authentic screenshots for tutorial page', async ({ page }) => {
    await page.addInitScript(() => {
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

      const richState = {
        v: 1,
        profiles: [{
          id: 'profile-creator',
          name: 'Creator Studio',
          color: '#0051ff',
          layers: [{
            r1c1: { label: 'Play', binding: 'Media Play/Pause', customLegend: 'PLAY', subLegend: 'SPACE', keycapColor: '#0051ff' },
            r1c2: { label: 'Vol+', binding: 'Volume Up', customLegend: 'VOL+', subLegend: 'UP', keycapColor: '#10b981' },
            r1c3: { label: 'Mute', binding: 'Audio Mute', customLegend: 'MUTE', subLegend: 'M', keycapColor: '#ef4444' },
            r2c1: { label: 'Undo', binding: 'Ctrl + Z', customLegend: 'UNDO', subLegend: 'Z', keycapColor: '#8b5cf6' },
            r2c2: { label: 'Save', binding: 'Ctrl + S', customLegend: 'SAVE', subLegend: 'S', keycapColor: '#0051ff' },
            r2c3: { label: 'Redo', binding: 'Ctrl + Y', customLegend: 'REDO', subLegend: 'Y', keycapColor: '#8b5cf6' },
            r3c1: { label: 'Cut', binding: 'Ctrl + X', customLegend: 'CUT', subLegend: 'X' },
            r3c2: { label: 'Copy', binding: 'Ctrl + C', customLegend: 'COPY', subLegend: 'C' },
            r3c3: { label: 'Paste', binding: 'Ctrl + V', customLegend: 'PASTE', subLegend: 'V' },
            dial: { label: 'Timeline Scrub', binding: 'Timeline Scrub (CCW: Left / CW: Right)' },
          }],
        }],
        activeProfileIndex: 0,
      };
      try {
        window.localStorage.setItem('cm2.state.v2', JSON.stringify(richState));
      } catch {}

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

      // Mock Electron API for rich desktop features
      (window as unknown as { electronAPI: unknown }).electronAPI = {
        isElectron: true,
        platform: 'win32',
        getVersion: async () => '1.1.14',
        getAppSettings: async () => ({
          ok: true,
          settings: {
            launchAtStartup: true,
            startHiddenInTray: true,
            allowTerminalSmartActions: true,
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
    // Hide transient toast notifications so tutorial screenshots remain pristine and uncluttered
    await page.addStyleTag({ content: '[data-testid="feedback-toast"] { display: none !important; }' });
    await page.waitForTimeout(600);

    const assetsDir = path.resolve(process.cwd(), 'website/assets');

    // Populate the macropad with a real creative preset for authentic, vibrant screenshots
    await page.getByRole('button', { name: 'Preset', exact: true }).click();
    await page.waitForTimeout(600);
    const installBtn = page.locator('button:has-text("Install")').first();
    if (await installBtn.isVisible()) {
      await installBtn.click();
      await page.waitForTimeout(600);
    }
    await page.getByRole('button', { name: 'Keymap', exact: true }).click();
    await page.waitForTimeout(600);

    // 1. Capture Main Studio View (now fully populated with 3x3 keys and dial)
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
  });
});
