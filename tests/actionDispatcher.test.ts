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
});

