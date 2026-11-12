import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GestureEngine, type RecognizedGestureEvent } from '../src/gestureEngine';
import {
  encodeHardwareReport,
  decodeHardwareReport,
  HardwareEventType,
  type DecodedHardwareEvent,
} from '../src/hardwareEventProtocol';
import {
  resolveActionForGesture,
  resolveActionForDial,
  dispatchResolvedAction,
  type ActionDispatcherLayer,
  type ResolvedAction,
} from '../src/actionDispatcher';
import { GRID_MACRO_ENCODER_SLOT } from '../src/deviceLayout';

describe('Unified Hardware & Simulation Execution Pipeline Integration', () => {
  let virtualTime = 1000;
  const now = () => virtualTime;
  const timers: { id: number; fn: () => void; triggerAt: number }[] = [];
  let timerSeq = 1;

  const fakeSetTimeout = (fn: () => void, ms: number) => {
    const id = timerSeq++;
    timers.push({ id, fn, triggerAt: virtualTime + ms });
    return id;
  };

  const fakeClearTimeout = (handle: unknown) => {
    const idx = timers.findIndex((t) => t.id === handle);
    if (idx !== -1) timers.splice(idx, 1);
  };

  const advanceTime = (ms: number) => {
    virtualTime += ms;
    const due = timers
      .filter((t) => t.triggerAt <= virtualTime)
      .sort((a, b) => a.triggerAt - b.triggerAt);
    for (const t of due) {
      const idx = timers.indexOf(t);
      if (idx !== -1) {
        timers.splice(idx, 1);
        t.fn();
      }
    }
  };

  let engine: GestureEngine;
  let dispatchedActions: { action: ResolvedAction; source: string }[] = [];

  const mockLayer: ActionDispatcherLayer = {
    r1c1: {
      id: 'key-1',
      label: 'Spot',
      binding: 'Spotify (App: Spotify)',
      actionType: 'Smart Action',
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Spotify',
      },
    },
    r1c2: {
      id: 'key-2',
      label: 'Multi',
      binding: 'Multi (onTap: Ctrl+C, doubleTap: Ctrl+V, onHold: Ctrl+A, tapHold: Ctrl+Z)',
      actionType: 'Multi-step action',
      execution: {
        kind: 'multi',
        gestures: {
          onTap: 'Ctrl+C',
          doubleTap: 'Ctrl+V',
          onHold: 'Ctrl+A',
          tapHold: 'Ctrl+Z',
        },
        tappingTermMs: 250,
      },
    },
    [GRID_MACRO_ENCODER_SLOT]: {
      id: 'dial-main',
      label: 'Vol',
      binding: 'Volume',
      encoderActions: {
        cw: {
          id: 'dial-cw',
          label: 'Vol+',
          binding: 'Vol+ (Shortcut: VolumeUp)',
          execution: { kind: 'shortcut', value: 'VolumeUp' },
        },
        ccw: {
          id: 'dial-ccw',
          label: 'Vol-',
          binding: 'Vol- (Shortcut: VolumeDown)',
          execution: { kind: 'shortcut', value: 'VolumeDown' },
        },
        press: {
          id: 'dial-press',
          label: 'Mute',
          binding: 'Mute (Shortcut: VolumeMute)',
          execution: { kind: 'shortcut', value: 'VolumeMute' },
        },
      },
    },
  };

  const mockHost = {
    electronAPI: {
      executeSmartAction: vi.fn(async (_payload: Record<string, unknown>) => ({
        success: true,
      })),
    },
    nodeStudioAppSettings: {
      read: () => ({ allowTerminalSmartActions: true }),
    },
  };

  beforeEach(() => {
    virtualTime = 1000;
    timers.length = 0;
    timerSeq = 1;
    dispatchedActions = [];
    vi.clearAllMocks();

    engine = new GestureEngine({
      now,
      setTimeoutFn: fakeSetTimeout,
      clearTimeoutFn: fakeClearTimeout,
      onGesture: (event: RecognizedGestureEvent) => {
        const action = resolveActionForGesture(event.slot, event.gesture, mockLayer);
        if (action) {
          dispatchedActions.push({ action, source: event.source || 'hardware' });
          void dispatchResolvedAction(action, {
            source: (event.source as 'hardware' | 'simulation') || 'hardware',
            host: mockHost as any,
          });
        }
      },
      onDial: (event) => {
        const action = resolveActionForDial(event.direction, mockLayer);
        if (action) {
          dispatchedActions.push({ action, source: event.source || 'hardware' });
          void dispatchResolvedAction(action, {
            source: (event.source as 'hardware' | 'simulation') || 'hardware',
            host: mockHost as any,
          });
        }
      },
    });

    engine.configureSlot('r1c1', {});
    engine.configureSlot('r1c2', {
      hasDoubleTap: true,
      hasHold: true,
      hasTapHold: true,
      tappingTermMs: 250,
      holdThresholdMs: 400,
    });
  });

  afterEach(() => {
    engine.resetAll();
  });

  it('executes Smart Action from physical Raw HID binary packet exactly like desktop simulation', async () => {
    // 1. Physical Hardware Input: QMK binary Raw HID packet
    const downPacket = encodeHardwareReport({
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 0,
      matrixStateMask: 0x0001,
      sequence: 1,
    });
    const upPacket = encodeHardwareReport({
      type: HardwareEventType.BUTTON_UP,
      slotIndex: 0,
      matrixStateMask: 0x0000,
      sequence: 2,
    });

    const decodedDown = decodeHardwareReport(downPacket)!;
    const decodedUp = decodeHardwareReport(upPacket)!;

    engine.buttonDown(decodedDown.slotId!, 'hardware');
    advanceTime(40);
    engine.buttonUp(decodedUp.slotId!);

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toMatchObject({
      action: {
        type: 'App',
        value: 'Spotify',
        payload: {
          execution: {
            kind: 'smart',
            actionType: 'App',
            value: 'Spotify',
          },
        },
      },
      source: 'hardware',
    });
    expect(mockHost.electronAPI.executeSmartAction).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionSource: 'hardware',
        execution: expect.objectContaining({ value: 'Spotify' }),
      })
    );

    // 2. Desktop Simulation Input: pointer down + pointer up
    dispatchedActions = [];
    engine.buttonDown('r1c1', 'simulation');
    advanceTime(40);
    engine.buttonUp('r1c1');

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toMatchObject({
      action: {
        type: 'App',
        value: 'Spotify',
        payload: {
          execution: {
            kind: 'smart',
            actionType: 'App',
            value: 'Spotify',
          },
        },
      },
      source: 'simulation',
    });
    expect(mockHost.electronAPI.executeSmartAction).toHaveBeenLastCalledWith(
      expect.objectContaining({
        executionSource: 'simulation',
        execution: expect.objectContaining({ value: 'Spotify' }),
      })
    );
  });

  it('executes doubleTap multi-action identically across physical and simulation inputs', () => {
    // Physical hardware double-tap on slotIndex 1 (r1c2)
    const pDown1 = decodeHardwareReport(
      encodeHardwareReport({
        type: HardwareEventType.BUTTON_DOWN,
        slotIndex: 1,
        matrixStateMask: 0x0002,
        sequence: 10,
      })
    )!;
    const pUp1 = decodeHardwareReport(
      encodeHardwareReport({
        type: HardwareEventType.BUTTON_UP,
        slotIndex: 1,
        matrixStateMask: 0x0000,
        sequence: 11,
      })
    )!;
    const pDown2 = decodeHardwareReport(
      encodeHardwareReport({
        type: HardwareEventType.BUTTON_DOWN,
        slotIndex: 1,
        matrixStateMask: 0x0002,
        sequence: 12,
      })
    )!;
    const pUp2 = decodeHardwareReport(
      encodeHardwareReport({
        type: HardwareEventType.BUTTON_UP,
        slotIndex: 1,
        matrixStateMask: 0x0000,
        sequence: 13,
      })
    )!;

    engine.buttonDown(pDown1.slotId!, 'hardware');
    advanceTime(30);
    engine.buttonUp(pUp1.slotId!);
    advanceTime(50); // within 250ms double-tap term
    engine.buttonDown(pDown2.slotId!, 'hardware');
    advanceTime(30);
    engine.buttonUp(pUp2.slotId!);

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toMatchObject({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+V',
        payload: { type: 'Shortcut', value: 'Ctrl+V' },
      },
      source: 'hardware',
    });

    // Simulation double-tap
    dispatchedActions = [];
    advanceTime(500); // clear any trailing state
    engine.buttonDown('r1c2', 'simulation');
    advanceTime(30);
    engine.buttonUp('r1c2');
    advanceTime(50);
    engine.buttonDown('r1c2', 'simulation');
    advanceTime(30);
    engine.buttonUp('r1c2');

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+V',
        payload: { type: 'Shortcut', value: 'Ctrl+V' },
      },
      source: 'simulation',
    });
  });

  it('executes onHold action identically across physical and simulation inputs', () => {
    // Physical button held
    engine.buttonDown('r1c2', 'hardware');
    advanceTime(450); // past 400ms threshold
    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+A',
        payload: { type: 'Shortcut', value: 'Ctrl+A' },
      },
      source: 'hardware',
    });
    engine.buttonUp('r1c2');

    // Simulation button held
    dispatchedActions = [];
    advanceTime(500);
    engine.buttonDown('r1c2', 'simulation');
    advanceTime(450);
    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+A',
        payload: { type: 'Shortcut', value: 'Ctrl+A' },
      },
      source: 'simulation',
    });
    engine.buttonUp('r1c2');
  });

  it('executes tapHold action identically across physical and simulation inputs', () => {
    // Tap then hold
    engine.buttonDown('r1c2', 'hardware');
    advanceTime(40);
    engine.buttonUp('r1c2');
    advanceTime(60);
    engine.buttonDown('r1c2', 'hardware');
    advanceTime(450);

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+Z',
        payload: { type: 'Shortcut', value: 'Ctrl+Z' },
      },
      source: 'hardware',
    });
    engine.buttonUp('r1c2');

    // Simulation tap then hold
    dispatchedActions = [];
    advanceTime(500);
    engine.buttonDown('r1c2', 'simulation');
    advanceTime(40);
    engine.buttonUp('r1c2');
    advanceTime(60);
    engine.buttonDown('r1c2', 'simulation');
    advanceTime(450);

    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'Ctrl+Z',
        payload: { type: 'Shortcut', value: 'Ctrl+Z' },
      },
      source: 'simulation',
    });
    engine.buttonUp('r1c2');
  });

  it('dispatches rotary encoder rotation and dial press identically', () => {
    // Physical encoder rotation
    engine.dialRotate('cw', 'hardware');
    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'VolumeUp',
        payload: { type: 'Shortcut', value: 'VolumeUp' },
      },
      source: 'hardware',
    });

    // Simulation encoder rotation
    dispatchedActions = [];
    engine.dialRotate('ccw', 'simulation');
    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'VolumeDown',
        payload: { type: 'Shortcut', value: 'VolumeDown' },
      },
      source: 'simulation',
    });

    // Encoder push button
    dispatchedActions = [];
    engine.buttonDown(GRID_MACRO_ENCODER_SLOT, 'hardware');
    advanceTime(50);
    engine.buttonUp(GRID_MACRO_ENCODER_SLOT);
    expect(dispatchedActions).toHaveLength(1);
    expect(dispatchedActions[0]).toEqual({
      action: {
        type: 'Shortcut',
        value: 'VolumeMute',
        payload: { type: 'Shortcut', value: 'VolumeMute' },
      },
      source: 'hardware',
    });
  });

  it('updates multi-action gesture binding dynamically when edited (e.g. B -> D)', () => {
    // 1. Initial layer with Double Tap = B
    const dynamicLayer: ActionDispatcherLayer = {
      r2c1: {
        id: 'multiaction-key',
        label: 'My MultiAction',
        binding: 'My MultiAction',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: {
            onTap: 'A',
            doubleTap: 'B',
            onHold: 'C',
            tapHold: 'D',
          },
        },
      },
    };

    const initialDoubleTap = resolveActionForGesture('r2c1', 'doubleTap', dynamicLayer);
    expect(initialDoubleTap?.value).toBe('B');

    // 2. User edits Double Tap from 'B' to 'D'
    dynamicLayer.r2c1.execution = {
      kind: 'multi',
      gestures: {
        onTap: 'A',
        doubleTap: 'D',
        onHold: 'C',
        tapHold: 'D',
      },
    };

    const updatedDoubleTap = resolveActionForGesture('r2c1', 'doubleTap', dynamicLayer);
    expect(updatedDoubleTap?.value).toBe('D');
    expect(updatedDoubleTap?.value).not.toBe('B');
  });
});
