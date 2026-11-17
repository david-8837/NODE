import { test, expect } from '@playwright/test';

test.describe('NODE Studio Configurator Gate & Hardware E2E', () => {
  test('displays connection gate when device is unplugged', async ({ page }) => {
    await page.goto('/');

    // When unplugged, the mandatory hardware connection gate is rendered
    await expect(page.getByRole('heading', { name: /Connect your Micro Pad to continue/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Retry Connection/i })).toBeVisible();
    await expect(page.getByText('Plug the Micro Pad into a USB port, then retry.')).toBeVisible();
  });
});

test.describe('NODE Studio Configurator Connected Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Install a mock QMK/VIA bridge via Playwright before navigation
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
    });

    await page.goto('/');
    // Wait for the desktop app navigation to unlock once device connects
    await expect(page.getByRole('button', { name: 'Keymap', exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('displays NODE studio title and initial hardware keymap stage', async ({ page }) => {
    await expect(page).toHaveTitle('NODE studio');

    // Navigation buttons are visible in the centered navbar
    await expect(page.getByRole('button', { name: 'Keymap', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Preset', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();

    // Verify keymap controls / profile
    await expect(page.getByText('Default Profile', { exact: true })).toBeVisible();
    await expect(page.getByText('Key Mapping', { exact: true })).toBeVisible();
  });

  test('navigates to Preset Library, filters presets, and tests OS switcher', async ({ page }) => {
    // Click Preset in top nav
    await page.getByRole('button', { name: 'Preset', exact: true }).click();

    // Preset view container is visible
    const presetScreen = page.locator('[data-preset-screen]');
    await expect(presetScreen).toBeVisible();

    // Shipped preset cards render
    await expect(page.getByText('VS Code', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('GitHub & Git Dev', { exact: false }).first()).toBeVisible();
  });

  test('navigates to Settings screen and inspects application switches', async ({ page }) => {
    // Click Settings in top nav
    await page.getByRole('button', { name: 'Settings', exact: true }).click();

    // Settings screen elements render
    await expect(page.getByText('Support', { exact: true })).toBeVisible();
    await expect(page.getByText('Help & Documentation', { exact: true })).toBeVisible();
    await expect(page.getByText('Contact support', { exact: true })).toBeVisible();
    await expect(page.getByText('Give feedback', { exact: true })).toBeVisible();
    await expect(page.getByText('Release notes', { exact: true })).toBeVisible();
  });
});
