/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestSimulationMode, triggerSimulationAction } from '../src/actionExecution';

const originalFetch = window.fetch;
const originalConfirm = window.confirm;

afterEach(() => {
  Object.defineProperty(window, 'fetch', { configurable: true, value: originalFetch });
  Object.defineProperty(window, 'confirm', { configurable: true, value: originalConfirm });
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

  it('prompts before running a terminal action imported from a profile', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
    const confirm = vi.fn(() => true);
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    Object.defineProperty(window, 'nodeStudioAppSettings', {
      configurable: true,
      value: { read: () => ({ allowTerminalSmartActions: true }) },
    });
    Object.defineProperty(window, 'confirm', { configurable: true, value: confirm });

    triggerSimulationAction({
      execution: {
        kind: 'smart',
        actionType: 'Cmd',
        value: 'echo imported',
        requiresConsent: true,
      },
    }, vi.fn(), vi.fn(), window);

    expect(confirm).toHaveBeenCalledOnce();
    expect(executeSmartAction).toHaveBeenCalledWith({
      execution: {
        kind: 'smart',
        actionType: 'Cmd',
        value: 'echo imported',
        requiresConsent: true,
      },
      commandConsent: true,
      allowTerminal: true,
    });
  });

  it('forwards the chosen installed-app shortcut to the native executor', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    const shortcutPath = 'C:\\Users\\tester\\Start Menu\\Code.lnk';

    triggerSimulationAction({
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Visual Studio Code',
        applicationShortcutPath: shortcutPath,
      },
    }, vi.fn(), vi.fn(), window);

    expect(executeSmartAction).toHaveBeenCalledWith({
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Visual Studio Code',
        requiresConsent: false,
        applicationShortcutPath: shortcutPath,
      },
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

  it('forwards Bright Up/Down bindings unchanged to the shared native executor', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });

    triggerSimulationAction({ binding: 'bright up' }, vi.fn(), vi.fn(), window);
    triggerSimulationAction({ binding: 'bright down' }, vi.fn(), vi.fn(), window);

    expect(executeSmartAction).toHaveBeenNthCalledWith(1, { type: 'Shortcut', value: 'bright up' });
    expect(executeSmartAction).toHaveBeenNthCalledWith(2, { type: 'Shortcut', value: 'bright down' });
  });

  it('routes multi-actions through one shared Electron executor without duplicate HTTP dispatch', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
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

    expect(executeSmartAction).toHaveBeenCalledOnce();
    expect(executeSmartAction).toHaveBeenCalledWith({ type: 'Shortcut', value: 'Ctrl + C' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('executes persisted sequence and multi-action definitions as structured data', () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { executeSmartAction },
    });
    const showToast = vi.fn();

    triggerSimulationAction(
      {
        label: 'Macro',
        binding: 'Macro (onTap: Ctrl + C)',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
          tappingTermMs: 250,
        },
      },
      vi.fn(),
      showToast,
      window
    );
    triggerSimulationAction(
      {
        label: 'Sequence',
        binding: 'Sequence (Ctrl + A + 100ms + End)',
        execution: {
          kind: 'sequence',
          steps: [
            { kind: 'key', key: 'Ctrl + A', mode: 'press-release', delayAfterMs: 100 },
            { kind: 'key', key: 'End', mode: 'press-release' },
          ],
        },
      },
      vi.fn(),
      showToast,
      window
    );

    expect(executeSmartAction).toHaveBeenNthCalledWith(1, { type: 'Shortcut', value: 'Ctrl + C' });
    expect(executeSmartAction).toHaveBeenNthCalledWith(2, {
      type: 'Sequence',
      steps: [
        { kind: 'key', key: 'Ctrl + A', mode: 'press-release', delayAfterMs: 100 },
        { kind: 'key', key: 'End', mode: 'press-release' },
      ],
    });
  });

  it('requires an explicit Simulation handshake through Electron or the relative local endpoint', async () => {
    const setSimulationEnabled = vi.fn().mockResolvedValue({ ok: true, enabled: true });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { setSimulationEnabled },
    });
    expect(await requestSimulationMode(true, window)).toEqual({ ok: true, enabled: true });
    expect(setSimulationEnabled).toHaveBeenCalledWith(true);

    delete (window as Window & { electronAPI?: unknown }).electronAPI;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, enabled: true }),
    });
    Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });
    expect(await requestSimulationMode(true, window)).toEqual({ ok: true, enabled: true, error: undefined });
    expect(fetchMock).toHaveBeenCalledWith('/api/simulation', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ enabled: true }),
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
