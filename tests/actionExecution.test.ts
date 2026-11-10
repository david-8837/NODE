/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { triggerSimulationAction } from '../src/actionExecution';

const originalFetch = window.fetch;

afterEach(() => {
  Object.defineProperty(window, 'fetch', { configurable: true, value: originalFetch });
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { nodeStudioAppSettings?: unknown }).nodeStudioAppSettings;
});

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, 'fetch', { configurable: true, value: vi.fn().mockResolvedValue({ ok: true }) });
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { nodeStudioAppSettings?: unknown }).nodeStudioAppSettings;
});

describe('simulation actions', () => {
  it('blocks terminal commands until Settings allows them, then uses the Electron bridge', async () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    const showToast = vi.fn();

    triggerSimulationAction(
      { binding: 'Cleanup (Cmd: echo safe)' },
      vi.fn(),
      showToast,
      window
    );
    expect(executeSmartAction).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Terminal commands are disabled in Settings');

    Object.defineProperty(window, 'nodeStudioAppSettings', {
      configurable: true,
      value: { read: () => ({ allowTerminalSmartActions: true }) },
    });
    triggerSimulationAction(
      { binding: 'Cleanup (Cmd: echo safe)' },
      vi.fn(),
      showToast,
      window
    );
    expect(executeSmartAction).toHaveBeenCalledWith({
      type: 'Cmd',
      value: 'echo safe',
      allowTerminal: true,
    });
  });

  it('runs shortcuts through Electron when available and changes layers locally', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    const changeLayer = vi.fn();
    const showToast = vi.fn();

    triggerSimulationAction(
      { binding: 'Save (Ctrl + S)' },
      changeLayer,
      showToast,
      window
    );
    expect(executeSmartAction).toHaveBeenCalledWith({ type: 'Shortcut', value: 'Ctrl + S' });

    triggerSimulationAction(
      { id: 'lyr-2', label: 'L2', binding: 'Layer 2' },
      changeLayer,
      showToast,
      window
    );
    expect(changeLayer).toHaveBeenCalledWith(1);
    expect(showToast).toHaveBeenLastCalledWith('Switched to Layer 2');
  });

  it('preserves the legacy HTTP-only execution path for multi-actions', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ ok: true });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });

    triggerSimulationAction(
      { binding: 'Macro (onTap: Ctrl + C, doubleTap: Ctrl + V)' },
      vi.fn(),
      vi.fn(),
      window
    );

    expect(executeSmartAction).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith('/api/execute-action', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'Shortcut', value: 'Ctrl + C' }),
    }));
  });

  it('uses the relative development endpoint only when the desktop bridge is absent', () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });
    triggerSimulationAction(
      { binding: 'Copy (Ctrl + C)' },
      vi.fn(),
      vi.fn(),
      window
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/execute-action', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ type: 'Shortcut', value: 'Ctrl + C' }),
    }));
  });
});
