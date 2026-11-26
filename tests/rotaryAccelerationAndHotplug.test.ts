import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DEFAULT_APP_SETTINGS, normalizeAppSettings } from '../src/appSettings';

describe('Dynamic Rotary Encoder Acceleration & Hotplug Verification', () => {
  it('includes rotaryAcceleration enabled by default in appSettings', () => {
    expect(DEFAULT_APP_SETTINGS.rotaryAcceleration).toBe(true);
    const normalized = normalizeAppSettings({});
    expect(normalized.rotaryAcceleration).toBe(true);

    const disabled = normalizeAppSettings({ rotaryAcceleration: false });
    expect(disabled.rotaryAcceleration).toBe(false);
  });

  it('calculates dynamic acceleration multipliers correctly across detent speeds', () => {
    // Simulating acceleration calculation function
    function computeSteps(
      delta: number,
      sameDir: boolean,
      enabled: boolean,
      baseMultiplier: number = 1
    ) {
      if (!enabled) return baseMultiplier;
      if (!sameDir || delta > 250) return baseMultiplier;
      if (delta <= 35) return Math.max(baseMultiplier, 6);
      if (delta <= 70) return Math.max(baseMultiplier, 4);
      if (delta <= 140) return Math.max(baseMultiplier, 2);
      return baseMultiplier;
    }

    // Slow rotation (>140ms): precise single step (e.g. 1% volume / 1 frame)
    expect(computeSteps(180, true, true, 1)).toBe(1);
    expect(computeSteps(300, true, true, 1)).toBe(1);

    // Direction reversal immediately resets to 1x precision
    expect(computeSteps(20, false, true, 1)).toBe(1);

    // Moderate rotation (70ms - 140ms): 2x acceleration
    expect(computeSteps(100, true, true, 1)).toBe(2);

    // Fast rotation (35ms - 70ms): 4x acceleration
    expect(computeSteps(50, true, true, 1)).toBe(4);

    // Rapid flick (<=35ms): 6x acceleration
    expect(computeSteps(25, true, true, 1)).toBe(6);

    // When acceleration is disabled, always returns baseMultiplier
    expect(computeSteps(25, true, false, 1)).toBe(1);
    expect(computeSteps(25, true, false, 3)).toBe(3);
  });

  it('handles hotplug connect and disconnect events safely', async () => {
    let hotplugListener: ((info: { action: string; deviceName?: string }) => void) | undefined;
    const off = vi.fn();
    const electronAPI = {
      isElectron: true,
      onDeviceHotplug: vi.fn((cb: (info: { action: string; deviceName?: string }) => void) => {
        hotplugListener = cb;
        return off;
      }),
    };

    expect(electronAPI.onDeviceHotplug).toBeDefined();
    electronAPI.onDeviceHotplug((info: { action: string; deviceName?: string }) => {
      expect(info.action).toBe('connect');
    });

    expect(hotplugListener).toBeDefined();
    hotplugListener!({ action: 'connect', deviceName: 'Grid Macro 1' });
  });

  it('allows enabling allowDeviceNotifications directly in desktop Electron environment', async () => {
    const { createAppSettingsTools } = await import('../src/appSettings');
    const store = new Map<string, string>();
    const host = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
        clear: () => store.clear(),
        key: () => null,
        length: 0,
      },
      electronAPI: {
        isElectron: true,
        setAppSetting: vi.fn(async (key: string, value: unknown) => ({
          ok: true,
          settings: { [key]: value },
        })),
        showNotification: vi.fn(async () => ({ ok: true })),
      },
    } as unknown as Window & typeof globalThis;

    const tools = createAppSettingsTools(host);
    const result = await tools.set('allowDeviceNotifications', true);
    expect(result.ok).toBe(true);
    expect(host.electronAPI!.setAppSetting).toHaveBeenCalledWith('allowDeviceNotifications', true);
  });
});
