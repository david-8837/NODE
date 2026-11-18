/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useTipRotation } from '../src/hooks/useTipRotation';
import { useKeymapHistory } from '../src/hooks/useKeymapHistory';
import { useAppSettings } from '../src/hooks/useAppSettings';
import { useInstalledApplications } from '../src/hooks/useInstalledApplications';
import { useDeviceNotifications } from '../src/hooks/useDeviceNotifications';
import { DEFAULT_APP_SETTINGS } from '../src/appSettings';

function testHook<T>(useHook: () => T) {
  let currentResult!: T;
  function TestComponent() {
    currentResult = useHook();
    return null;
  }
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(TestComponent));
  });
  return {
    get result() {
      return currentResult;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe('Custom hooks unit tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useTipRotation', () => {
    it('initializes at index 0 and auto-rotates on timer', () => {
      const hook = testHook(() => useTipRotation(3, { intervalMs: 2000 }));
      expect(hook.result.tipIndex).toBe(0);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(hook.result.tipIndex).toBe(1);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(hook.result.tipIndex).toBe(2);

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(hook.result.tipIndex).toBe(0);
      hook.unmount();
    });

    it('allows manual nextTip and prevTip cycling', () => {
      const hook = testHook(() => useTipRotation(3));

      act(() => {
        hook.result.nextTip();
      });
      expect(hook.result.tipIndex).toBe(1);

      act(() => {
        hook.result.prevTip();
      });
      expect(hook.result.tipIndex).toBe(0);

      act(() => {
        hook.result.prevTip();
      });
      expect(hook.result.tipIndex).toBe(2);
      hook.unmount();
    });
  });

  describe('useKeymapHistory', () => {
    it('manages undo and redo stacks with snapshot recording', () => {
      const hook = testHook(() => useKeymapHistory<string>(5));
      expect(hook.result.canUndo).toBe(false);
      expect(hook.result.canRedo).toBe(false);

      act(() => {
        hook.result.recordSnapshot('state-1');
      });
      expect(hook.result.canUndo).toBe(true);
      expect(hook.result.canRedo).toBe(false);

      let reverted: string | null = null;
      act(() => {
        reverted = hook.result.undo('state-2');
      });
      expect(reverted).toBe('state-1');
      expect(hook.result.canUndo).toBe(false);
      expect(hook.result.canRedo).toBe(true);

      let forward: string | null = null;
      act(() => {
        forward = hook.result.redo('state-1');
      });
      expect(forward).toBe('state-2');
      expect(hook.result.canUndo).toBe(true);
      expect(hook.result.canRedo).toBe(false);
      hook.unmount();
    });

    it('clears history completely', () => {
      const hook = testHook(() => useKeymapHistory<string>());
      act(() => {
        hook.result.recordSnapshot('a');
      });
      expect(hook.result.canUndo).toBe(true);

      act(() => {
        hook.result.clearHistory();
      });
      expect(hook.result.canUndo).toBe(false);
      expect(hook.result.canRedo).toBe(false);
      hook.unmount();
    });
  });

  describe('useAppSettings', () => {
    it('loads default settings and updates localStorage on change', () => {
      const hook = testHook(() => useAppSettings());
      expect(hook.result.appSettings).toMatchObject({
        allowTerminalSmartActions: DEFAULT_APP_SETTINGS.allowTerminalSmartActions,
        allowDeviceNotifications: DEFAULT_APP_SETTINGS.allowDeviceNotifications,
      });

      act(() => {
        hook.result.setAppSettings((prev) => ({
          ...prev,
          allowTerminalSmartActions: true,
        }));
      });
      expect(hook.result.appSettings.allowTerminalSmartActions).toBe(true);
      hook.unmount();
    });
  });

  describe('useInstalledApplications', () => {
    it('reports informative error when desktop API is absent', async () => {
      const hook = testHook(() => useInstalledApplications());
      await act(async () => {
        await hook.result.loadInstalledApplications();
      });
      expect(hook.result.installedApplicationsError).toContain('available in the Windows desktop app');
      expect(hook.result.installedApplications).toEqual([]);
      hook.unmount();
    });
  });

  describe('useDeviceNotifications', () => {
    it('does not throw when bridge or permissions are absent', () => {
      expect(() => {
        const hook = testHook(() => useDeviceNotifications(true));
        hook.unmount();
      }).not.toThrow();
    });
  });
});
