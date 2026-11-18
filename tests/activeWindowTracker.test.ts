import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  matchProfileForApplication,
  createActiveWindowTracker,
  COMMON_APP_PATTERNS,
} = require('../electron/activeWindowTracker.cjs') as {
  matchProfileForApplication: (
    windowInfo: { processName: string; title: string },
    profiles: Array<{ name: string }>
  ) => { profileIndex: number; profile: { name: string }; matchType: string } | null;
  createActiveWindowTracker: (options?: {
    onActiveWindowChange?: (info: unknown) => void;
    intervalMs?: number;
    apis?: unknown;
  }) => {
    start: () => void;
    stop: () => void;
    tick: () => void;
    getLastDetails: () => string;
  };
  COMMON_APP_PATTERNS: Array<{ match: RegExp; keywords: string[] }>;
};

describe('electron/activeWindowTracker.cjs', () => {
  describe('matchProfileForApplication', () => {
    const mockProfiles = [
      { name: 'Default Keys' },
      { name: 'Full-Stack Dev' },
      { name: 'Blender 3D & Animation' },
      { name: 'Photo Retouch' },
    ];

    it('matches VS Code process to developer profile via keyword', () => {
      const match = matchProfileForApplication(
        { processName: 'Code.exe', title: 'Project - Visual Studio Code' },
        mockProfiles
      );
      expect(match).not.toBeNull();
      expect(match?.profileIndex).toBe(1);
      expect(match?.profile.name).toBe('Full-Stack Dev');
    });

    it('matches Photoshop process to Photo Retouch profile', () => {
      const match = matchProfileForApplication(
        { processName: 'Photoshop.exe', title: 'photo_edit.psd @ 100%' },
        mockProfiles
      );
      expect(match).not.toBeNull();
      expect(match?.profileIndex).toBe(3);
      expect(match?.profile.name).toBe('Photo Retouch');
    });

    it('matches Blender process to 3D profile', () => {
      const match = matchProfileForApplication(
        { processName: 'blender.exe', title: 'scene.blend' },
        mockProfiles
      );
      expect(match).not.toBeNull();
      expect(match?.profileIndex).toBe(2);
      expect(match?.profile.name).toBe('Blender 3D & Animation');
    });

    it('ignores own NODE studio application window', () => {
      const match = matchProfileForApplication(
        { processName: 'NODE studio.exe', title: 'NODE studio' },
        mockProfiles
      );
      expect(match).toBeNull();
    });

    it('returns null when no matching profile is found', () => {
      const match = matchProfileForApplication(
        { processName: 'CalculatorApp.exe', title: 'Calculator' },
        mockProfiles
      );
      expect(match).toBeNull();
    });

    it('matches an application through explicit custom mapping rules', () => {
      const customRules = [
        {
          id: 'rule-fl',
          processPattern: 'fl64.exe',
          targetProfileName: 'Default Keys',
          enabled: true,
        },
      ];
      const match = matchProfileForApplication(
        { processName: 'fl64.exe', title: 'FL Studio - MyTrack.flp' },
        mockProfiles,
        customRules
      );
      expect(match).not.toBeNull();
      expect(match?.matchType).toBe('custom_rule');
      expect(match?.profile.name).toBe('Default Keys');
    });

    it('matches with window title pattern filtering', () => {
      const customRules = [
        {
          id: 'rule-yt',
          processPattern: 'chrome.exe',
          titlePattern: 'YouTube Music',
          targetProfileName: 'Default Keys',
          enabled: true,
        },
      ];
      const hit = matchProfileForApplication(
        { processName: 'chrome.exe', title: 'Song - YouTube Music - Google Chrome' },
        mockProfiles,
        customRules
      );
      expect(hit?.matchType).toBe('custom_rule');
      expect(hit?.profile.name).toBe('Default Keys');

      // Different title should not match the custom rule
      const miss = matchProfileForApplication(
        { processName: 'chrome.exe', title: 'Wikipedia - Google Chrome' },
        mockProfiles,
        customRules
      );
      expect(miss?.matchType).not.toBe('custom_rule');
    });

    it('ignores disabled custom rules', () => {
      const customRules = [
        {
          id: 'rule-disabled',
          processPattern: 'customapp.exe',
          targetProfileName: 'Default Keys',
          enabled: false,
        },
      ];
      const match = matchProfileForApplication(
        { processName: 'customapp.exe', title: 'Custom App Window' },
        mockProfiles,
        customRules
      );
      expect(match).toBeNull();
    });
  });

  describe('createActiveWindowTracker', () => {
    it('emits onActiveWindowChange only when active window signature changes', () => {
      let currentMockHwnd = 1001n;
      let currentMockTitle = 'Project - Code';

      const mockApis = {
        ok: true,
        GetForegroundWindow: () => currentMockHwnd,
        GetWindowTextW: (_hwnd: unknown, buf: Buffer) => {
          buf.write(currentMockTitle, 'utf16le');
          return currentMockTitle.length;
        },
        GetWindowThreadProcessId: (_hwnd: unknown, pidBuf: number[]) => {
          pidBuf[0] = 4321;
          return 1;
        },
        OpenProcess: () => 0x5555n,
        QueryFullProcessImageNameW: (_hProc: unknown, _flags: unknown, buf: Buffer, sizeBuf: number[]) => {
          const exePath = 'C:\\Program Files\\Microsoft VS Code\\Code.exe';
          buf.write(exePath, 'utf16le');
          sizeBuf[0] = exePath.length;
          return 1;
        },
        CloseHandle: vi.fn(),
      };

      const onChange = vi.fn();
      const tracker = createActiveWindowTracker({
        onActiveWindowChange: onChange,
        apis: mockApis,
      });

      // First tick should emit
      tracker.tick();
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          processName: 'Code.exe',
          title: 'Project - Code',
        })
      );

      // Second tick with same window should not emit duplicate
      tracker.tick();
      expect(onChange).toHaveBeenCalledTimes(1);

      // Changed window title should emit
      currentMockTitle = 'Settings - Code';
      tracker.tick();
      expect(onChange).toHaveBeenCalledTimes(2);

      tracker.stop();
    });
  });
});
