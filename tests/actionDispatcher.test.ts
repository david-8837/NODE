import { describe, it, expect, vi } from 'vitest';
import {
  resolveActionForGesture,
  resolveActionForDial,
  dispatchResolvedAction,
  type ActionDispatcherLayer,
} from '../src/actionDispatcher';

describe('actionDispatcher: Unified Action Resolution and Dispatch', () => {
  const sampleLayer: ActionDispatcherLayer = {
    r1c1: {
      label: 'Undo/Redo',
      binding: 'Undo (onTap: Ctrl+Z, doubleTap: Ctrl+Y)',
      actionType: 'Multiaction',
      execution: {
        kind: 'multi',
        gestures: {
          onTap: 'Ctrl+Z',
          doubleTap: 'Ctrl+Y',
          onHold: 'Ctrl+Alt+Z',
          tapHold: 'Ctrl+Shift+Z',
        },
      },
    },
    r1c2: {
      label: 'Discord',
      binding: 'Discord (App: Discord.exe)',
      actionType: 'Smart Action',
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Discord.exe',
      },
    },
    'dial-tl': {
      label: 'Volume Dial',
      encoderActions: {
        cw: { label: 'Vol Up', binding: 'volume +' },
        ccw: { label: 'Vol Down', binding: 'volume -' },
        press: {
          label: 'Mute',
          binding: 'mute',
          execution: {
            kind: 'multi',
            gestures: {
              onTap: 'mute',
              doubleTap: 'play/pause',
            },
          },
        },
      },
    },
  };

  it('resolves distinct actions for different gestures on a multi-action key', () => {
    const tapAction = resolveActionForGesture('r1c1', 'onTap', sampleLayer);
    expect(tapAction).toMatchObject({
      type: 'Shortcut',
      value: 'Ctrl+Z',
    });

    const doubleTapAction = resolveActionForGesture('r1c1', 'doubleTap', sampleLayer);
    expect(doubleTapAction).toMatchObject({
      type: 'Shortcut',
      value: 'Ctrl+Y',
    });

    const holdAction = resolveActionForGesture('r1c1', 'onHold', sampleLayer);
    expect(holdAction).toMatchObject({
      type: 'Shortcut',
      value: 'Ctrl+Alt+Z',
    });

    const tapHoldAction = resolveActionForGesture('r1c1', 'tapHold', sampleLayer);
    expect(tapHoldAction).toMatchObject({
      type: 'Shortcut',
      value: 'Ctrl+Shift+Z',
    });
  });

  it('resolves Smart Actions for onTap and returns null for unassigned gestures', () => {
    const tapSmart = resolveActionForGesture('r1c2', 'onTap', sampleLayer);
    expect(tapSmart).toMatchObject({
      type: 'App',
      value: 'Discord.exe',
      payload: {
        execution: {
          kind: 'smart',
          actionType: 'App',
          value: 'Discord.exe',
        },
      },
    });

    // doubleTap is not assigned to this Smart Action slot
    const doubleTapSmart = resolveActionForGesture('r1c2', 'doubleTap', sampleLayer);
    expect(doubleTapSmart).toBeNull();
  });

  it('resolves dial rotation actions for cw and ccw directions', () => {
    const cwAction = resolveActionForDial('cw', sampleLayer);
    expect(cwAction).toMatchObject({
      type: 'Shortcut',
      value: 'volume +',
    });

    const ccwAction = resolveActionForDial('ccw', sampleLayer);
    expect(ccwAction).toMatchObject({
      type: 'Shortcut',
      value: 'volume -',
    });
  });

  it('resolves dial push button multi-actions independently of dial rotation', () => {
    const pressTap = resolveActionForGesture('dial-tl', 'onTap', sampleLayer);
    expect(pressTap).toMatchObject({
      type: 'Shortcut',
      value: 'mute',
    });

    const pressDouble = resolveActionForGesture('dial-tl', 'doubleTap', sampleLayer);
    expect(pressDouble).toMatchObject({
      type: 'Shortcut',
      value: 'play/pause',
    });
  });

  it('dispatches actions with executionSource marker to Electron IPC', async () => {
    const mockExecute = vi.fn().mockResolvedValue({ success: true });
    const mockHost: any = {
      electronAPI: { executeSmartAction: mockExecute },
      nodeStudioAppSettings: { read: () => ({ allowTerminalSmartActions: false }) },
    };

    const action = resolveActionForGesture('r1c2', 'onTap', sampleLayer)!;
    const result = await dispatchResolvedAction(action, {
      source: 'hardware',
      host: mockHost,
    });

    expect(result.success).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        executionSource: 'hardware',
        execution: expect.objectContaining({
          kind: 'smart',
          actionType: 'App',
          value: 'Discord.exe',
        }),
      })
    );
  });

  it('never resolves an action if key binding is blank, cleared, or placeholder', () => {
    const layerWithBlanks: ActionDispatcherLayer = {
      r1c1: {
        label: '',
        binding: 'blank',
        actionType: 'Basic input',
      },
      r1c2: {
        label: '—',
        binding: '—',
        actionType: 'Basic input',
      },
      r1c3: {
        label: '',
        binding: 'blank',
        actionType: 'Smart Action',
        execution: {
          kind: 'smart',
          actionType: 'Web',
          value: 'https://youtube.com',
        },
      },
    };

    expect(resolveActionForGesture('r1c1', 'onTap', layerWithBlanks)).toBeNull();
    expect(resolveActionForGesture('r1c2', 'onTap', layerWithBlanks)).toBeNull();
    // Even if execution object was not cleaned up, blank binding must not execute
    expect(resolveActionForGesture('r1c3', 'onTap', layerWithBlanks)).toBeNull();
  });

  it('resolves Cheat-Sheet actions and dispatches toggle/hold/hide/show events', async () => {
    const cheatSheetLayer: ActionDispatcherLayer = {
      r1c1: { label: 'Show', binding: 'Show Cheat-Sheet', actionId: 'cs-show' },
      r1c2: { label: 'Hold', binding: 'Show Cheat-Sheet Hold', actionId: 'cs-hold' },
      r1c3: { label: 'Hide', binding: 'Hide Cheat-Sheet', actionId: 'cs-hide' },
      r2c1: { label: 'Toggle', binding: 'Toggle Cheat-Sheet', actionId: 'cs-tog' },
    };

    const showAction = resolveActionForGesture('r1c1', 'onTap', cheatSheetLayer);
    expect(showAction).toMatchObject({ type: 'CheatSheet', value: 'show' });

    const holdAction = resolveActionForGesture('r1c2', 'onTap', cheatSheetLayer);
    expect(holdAction).toMatchObject({ type: 'CheatSheet', value: 'hold' });

    const hideAction = resolveActionForGesture('r1c3', 'onTap', cheatSheetLayer);
    expect(hideAction).toMatchObject({ type: 'CheatSheet', value: 'hide' });

    const toggleAction = resolveActionForGesture('r2c1', 'onTap', cheatSheetLayer);
    expect(toggleAction).toMatchObject({ type: 'CheatSheet', value: 'toggle' });

    const onCheatSheetToggle = vi.fn();
    await dispatchResolvedAction(showAction!, {
      source: 'hardware',
      onCheatSheetToggle,
    });
    expect(onCheatSheetToggle).toHaveBeenCalledWith('show');

    await dispatchResolvedAction(holdAction!, {
      source: 'hardware',
      onCheatSheetToggle,
    });
    expect(onCheatSheetToggle).toHaveBeenCalledWith('hold');

    await dispatchResolvedAction(hideAction!, {
      source: 'hardware',
      onCheatSheetToggle,
    });
    expect(onCheatSheetToggle).toHaveBeenCalledWith('hide');

    await dispatchResolvedAction(toggleAction!, {
      source: 'hardware',
      onCheatSheetToggle,
    });
    expect(onCheatSheetToggle).toHaveBeenCalledWith('toggle');
  });

  it('resolves and dispatches Layer and Profile switching actions', async () => {
    const layerNavLayer: ActionDispatcherLayer = {
      r1c1: { label: 'L2', binding: 'Layer 2', actionId: 'lyr-2' },
      r1c2: { label: 'TL3', binding: 'Temp Layer 3', actionId: 'tlyr-3' },
      r1c3: { label: 'LC', binding: 'Layer Cycle', actionType: 'Layer Cycle' },
      r2c1: { label: 'P2', binding: 'Profile 2', actionId: 'prf-2' },
      r2c2: { label: 'PC', binding: 'Profile Cycle', actionId: 'prf-cycle' },
    };

    // Layer resolution
    const l2Action = resolveActionForGesture('r1c1', 'onTap', layerNavLayer);
    expect(l2Action).toMatchObject({ type: 'Layer', value: 'Layer 2', payload: { op: 'set', targetLayer: 1 } });

    const tl3Action = resolveActionForGesture('r1c2', 'onTap', layerNavLayer);
    expect(tl3Action).toMatchObject({ type: 'Layer', value: 'Temp Layer 3', payload: { op: 'hold', targetLayer: 2 } });

    const lcAction = resolveActionForGesture('r1c3', 'onTap', layerNavLayer);
    expect(lcAction).toMatchObject({ type: 'Layer', value: 'Layer Cycle', payload: { op: 'next' } });

    // Profile resolution
    const p2Action = resolveActionForGesture('r2c1', 'onTap', layerNavLayer);
    expect(p2Action).toMatchObject({ type: 'Profile', value: 'Profile 2', payload: { op: 'set', targetProfile: 1 } });

    const pcAction = resolveActionForGesture('r2c2', 'onTap', layerNavLayer);
    expect(pcAction).toMatchObject({ type: 'Profile', value: 'Profile Cycle', payload: { op: 'next' } });

    // Dispatch verification
    const onLayerChange = vi.fn();
    const onProfileChange = vi.fn();

    await dispatchResolvedAction(l2Action!, { source: 'hardware', onLayerChange, onProfileChange });
    expect(onLayerChange).toHaveBeenCalledWith(1);

    await dispatchResolvedAction(lcAction!, { source: 'hardware', onLayerChange, onProfileChange });
    expect(onLayerChange).toHaveBeenCalledWith(-1);

    await dispatchResolvedAction(p2Action!, { source: 'hardware', onLayerChange, onProfileChange });
    expect(onProfileChange).toHaveBeenCalledWith(1);

    await dispatchResolvedAction(pcAction!, { source: 'hardware', onLayerChange, onProfileChange });
    expect(onProfileChange).toHaveBeenCalledWith(-1);
  });
});

