import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DebounceEngine,
  type DiagnosticLogEntry,
  DEFAULT_DEBOUNCE_INTERVAL_MS,
} from '../src/debounceEngine';
import {
  GestureEngine,
  type RecognizedGestureEvent,
} from '../src/gestureEngine';
import {
  resolveActionForGesture,
  dispatchResolvedAction,
  type ActionDispatcherLayer,
} from '../src/actionDispatcher';
import { GRID_MACRO_ENCODER_SLOT } from '../src/deviceLayout';
import { buildViaConfiguration } from '../src/qmkProfileSync';

describe('RP2040 Micro Pad Button Debouncing System (Phase 6 Verification)', () => {
  let currentTime = 1000;
  const advanceTime = (ms: number) => {
    currentTime += ms;
  };

  // Mock virtual timer harness for deterministic time testing
  type TimerCallback = { id: number; callback: () => void; triggerAt: number };
  let timerIdCounter = 1;
  let activeTimers: TimerCallback[] = [];

  const mockSetTimeout = (cb: () => void, ms: number) => {
    const id = timerIdCounter++;
    activeTimers.push({ id, callback: cb, triggerAt: currentTime + ms });
    return id;
  };

  const mockClearTimeout = (handle: unknown) => {
    activeTimers = activeTimers.filter((t) => t.id !== handle);
  };

  const drainTimersUntil = (targetTime: number) => {
    while (true) {
      activeTimers.sort((a, b) => a.triggerAt - b.triggerAt);
      const nextTimer = activeTimers[0];
      if (!nextTimer || nextTimer.triggerAt > targetTime) {
        currentTime = targetTime;
        break;
      }
      currentTime = nextTimer.triggerAt;
      activeTimers.shift();
      nextTimer.callback();
    }
  };

  const simulateSwitchBounce = (
    debouncer: DebounceEngine,
    slot: any,
    targetDown: boolean,
    bounceCount = 4,
    bounceDurationMs = 6
  ) => {
    // Generate rapid electrical contact chatter before settling
    const step = bounceDurationMs / (bounceCount * 2);
    for (let i = 0; i < bounceCount; i++) {
      debouncer.handleRawInput(slot, targetDown, currentTime);
      drainTimersUntil(currentTime + step);
      debouncer.handleRawInput(slot, !targetDown, currentTime);
      drainTimersUntil(currentTime + step);
    }
    // Finally settle at target state
    debouncer.handleRawInput(slot, targetDown, currentTime);
  };

  beforeEach(() => {
    currentTime = 1000;
    timerIdCounter = 1;
    activeTimers = [];
  });

  it('handles firmware-debounced transitions immediately and filters duplicate states', () => {
    const events: string[] = [];
    const debouncer = new DebounceEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => events.push(`${slot}:down`),
      onRelease: (slot) => events.push(`${slot}:up`),
    });
    expect(debouncer.handleFirmwareTransition('r1c1', true)).toBe(true);
    expect(debouncer.handleFirmwareTransition('r1c1', true)).toBe(false);
    expect(debouncer.handleFirmwareTransition('r1c1', false)).toBe(true);
    expect(debouncer.handleFirmwareTransition('r1c1', false)).toBe(false);
    expect(events).toEqual(['r1c1:down', 'r1c1:up']);
    expect(activeTimers).toHaveLength(0);
    debouncer.handleRawInput('r1c2', true, currentTime, 'simulation');
    expect(events).toHaveLength(2);
    drainTimersUntil(currentTime + 10);
    expect(events).toEqual(['r1c1:down', 'r1c1:up', 'r1c2:down']);
  });

  it('1. Twenty individual button presses: each press produces exactly 1 press and 1 release', () => {
    const pressEvents: string[] = [];
    const releaseEvents: string[] = [];

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => pressEvents.push(slot),
      onRelease: (slot) => releaseEvents.push(slot),
    });

    const slot = 'r1c1';

    for (let pressIndex = 0; pressIndex < 20; pressIndex++) {
      // Physical Press with 6ms of contact chatter
      simulateSwitchBounce(debouncer, slot, true, 4, 6);
      drainTimersUntil(currentTime + 50); // Hold for 50ms (well beyond 10ms debounce)

      // Physical Release with 5ms of contact chatter
      simulateSwitchBounce(debouncer, slot, false, 3, 5);
      drainTimersUntil(currentTime + 50); // Rest for 50ms
    }

    expect(pressEvents.length).toBe(20);
    expect(releaseEvents.length).toBe(20);
    expect(pressEvents.every((s) => s === 'r1c1')).toBe(true);
    expect(releaseEvents.every((s) => s === 'r1c1')).toBe(true);
  });

  it('2. Long button holds: holding key for 1000ms produces 1 press event, no repeat reports, 1 release on release', () => {
    const pressEvents: { slot: string; time: number }[] = [];
    const releaseEvents: { slot: string; time: number }[] = [];

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot, time) => pressEvents.push({ slot, time }),
      onRelease: (slot, time) => releaseEvents.push({ slot, time }),
    });

    const slot = 'r2c2';

    // Press with contact bounce
    simulateSwitchBounce(debouncer, slot, true, 5, 8);
    drainTimersUntil(currentTime + 10); // Debounce completes
    expect(pressEvents.length).toBe(1);

    // Hold down for 1000ms
    drainTimersUntil(currentTime + 1000);
    expect(pressEvents.length).toBe(1); // No repeated press reports
    expect(releaseEvents.length).toBe(0);

    // Release with bounce
    simulateSwitchBounce(debouncer, slot, false, 4, 7);
    drainTimersUntil(currentTime + 10); // Debounce completes
    expect(releaseEvents.length).toBe(1);
    expect(debouncer.getSlotDebouncedState(slot)).toBe(false);
  });

  it('3. Rapid tapping: rapid succession of taps above debounce interval are validated cleanly', () => {
    const pressEvents: number[] = [];
    const releaseEvents: number[] = [];

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: () => pressEvents.push(currentTime),
      onRelease: () => releaseEvents.push(currentTime),
    });

    const slot = 'r1c2';

    // Perform 5 rapid taps: 25ms down, 25ms up each
    for (let i = 0; i < 5; i++) {
      simulateSwitchBounce(debouncer, slot, true, 2, 4);
      drainTimersUntil(currentTime + 25);
      simulateSwitchBounce(debouncer, slot, false, 2, 4);
      drainTimersUntil(currentTime + 25);
    }

    expect(pressEvents.length).toBe(5);
    expect(releaseEvents.length).toBe(5);
  });

  it('4. Double taps: switch bounce does not accidentally trigger false double tap, real double tap is recognized', () => {
    const recognizedGestures: string[] = [];

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event: RecognizedGestureEvent) => {
        recognizedGestures.push(event.gesture);
      },
    });

    gestureEngine.configureSlot('r1c3', {
      hasDoubleTap: true,
      tappingTermMs: 180,
    });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // Sub-test A: Single tap with violent 8ms bounce chatter MUST NOT trigger doubleTap!
    simulateSwitchBounce(debouncer, 'r1c3', true, 5, 8);
    drainTimersUntil(currentTime + 40); // 40ms press
    simulateSwitchBounce(debouncer, 'r1c3', false, 5, 8);
    drainTimersUntil(currentTime + 250); // Wait for tapping term to expire

    expect(recognizedGestures).toEqual(['onTap']); // Exactly one single tap!

    recognizedGestures.length = 0;

    // Sub-test B: Legitimate double tap (Tap 1 + Tap 2 within 120ms)
    // Tap 1
    simulateSwitchBounce(debouncer, 'r1c3', true, 3, 5);
    drainTimersUntil(currentTime + 30);
    simulateSwitchBounce(debouncer, 'r1c3', false, 3, 5);
    drainTimersUntil(currentTime + 40); // 40ms pause between taps

    // Tap 2
    simulateSwitchBounce(debouncer, 'r1c3', true, 3, 5);
    drainTimersUntil(currentTime + 30);
    simulateSwitchBounce(debouncer, 'r1c3', false, 3, 5);
    drainTimersUntil(currentTime + 200);

    expect(recognizedGestures).toEqual(['doubleTap']);
  });

  it('5. Hold gestures: long press recognizes onHold gesture without spurious taps', () => {
    const recognizedGestures: string[] = [];

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event: RecognizedGestureEvent) => {
        recognizedGestures.push(event.gesture);
      },
    });

    gestureEngine.configureSlot('r2c1', {
      hasHold: true,
      hasDoubleTap: true,
      holdThresholdMs: 300,
    });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // Press and hold for 400ms
    simulateSwitchBounce(debouncer, 'r2c1', true, 4, 7);
    drainTimersUntil(currentTime + 400);

    expect(recognizedGestures).toEqual(['onHold']);

    // Release after hold
    simulateSwitchBounce(debouncer, 'r2c1', false, 4, 7);
    drainTimersUntil(currentTime + 200);

    // No subsequent onTap emitted
    expect(recognizedGestures).toEqual(['onHold']);
  });

  it('6. Tap-and-hold gestures: tap followed by hold triggers tapHold gesture cleanly', () => {
    const recognizedGestures: string[] = [];

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event: RecognizedGestureEvent) => {
        recognizedGestures.push(event.gesture);
      },
    });

    gestureEngine.configureSlot('r2c3', {
      hasTapHold: true,
      hasDoubleTap: true,
      tappingTermMs: 180,
      holdThresholdMs: 300,
    });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // Tap 1 (40ms)
    simulateSwitchBounce(debouncer, 'r2c3', true, 3, 5);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r2c3', false, 3, 5);
    drainTimersUntil(currentTime + 30); // 30ms gap

    // Tap 2 held for 400ms
    simulateSwitchBounce(debouncer, 'r2c3', true, 3, 5);
    drainTimersUntil(currentTime + 400);

    expect(recognizedGestures).toEqual(['tapHold']);

    // Release
    simulateSwitchBounce(debouncer, 'r2c3', false, 3, 5);
    drainTimersUntil(currentTime + 100);
    expect(recognizedGestures).toEqual(['tapHold']);
  });

  it('7. Two simultaneous button presses: debounce engines operate independently without cross-talk or lockup', () => {
    const pressLog: { slot: string; time: number }[] = [];
    const releaseLog: { slot: string; time: number }[] = [];

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot, time) => pressLog.push({ slot, time }),
      onRelease: (slot, time) => releaseLog.push({ slot, time }),
    });

    // Press r1c1 at t=1000
    simulateSwitchBounce(debouncer, 'r1c1', true, 4, 6);
    // Press r1c2 at t=1005 (5ms later, simultaneous overlap)
    drainTimersUntil(currentTime + 5);
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);

    drainTimersUntil(currentTime + 50);

    expect(debouncer.getSlotDebouncedState('r1c1')).toBe(true);
    expect(debouncer.getSlotDebouncedState('r1c2')).toBe(true);
    expect(pressLog.length).toBe(2);

    // Release r1c1 first
    simulateSwitchBounce(debouncer, 'r1c1', false, 3, 5);
    drainTimersUntil(currentTime + 20);
    expect(debouncer.getSlotDebouncedState('r1c1')).toBe(false);
    expect(debouncer.getSlotDebouncedState('r1c2')).toBe(true);

    // Release r1c2
    simulateSwitchBounce(debouncer, 'r1c2', false, 3, 5);
    drainTimersUntil(currentTime + 20);
    expect(debouncer.getSlotDebouncedState('r1c2')).toBe(false);

    expect(releaseLog.length).toBe(2);
  });

  it('8. All four existing action types execute cleanly through the debounced architecture', async () => {
    const executedActions: string[] = [];

    const mockHost: any = {
      electronAPI: {
        executeSmartAction: vi.fn().mockImplementation((payload) => {
          executedActions.push(`Smart:${payload.execution.actionType}:${payload.execution.value}`);
          return Promise.resolve({ success: true });
        }),
      },
      nodeStudioAppSettings: { read: () => ({ allowTerminalSmartActions: true }) },
    };

    const layer: ActionDispatcherLayer = {
      // 1. Basic Key (single character 'A')
      r1c1: { label: 'A', binding: 'A', actionType: 'Basic input' },
      // 2. Action Shortcut ('Ctrl+C')
      r1c2: { label: 'Copy', binding: 'Copy (Ctrl+C)', actionType: 'Shortcut' },
      // 3. Multi Action
      r1c3: {
        label: 'Multi',
        binding: 'Multi (onTap: Ctrl+Z, doubleTap: Ctrl+Y)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Ctrl+Z', doubleTap: 'Ctrl+Y' },
        },
      },
      // 4. Smart Action (App launch)
      r2c1: {
        label: 'Discord',
        binding: 'Discord (App: Discord.exe)',
        actionType: 'Smart Action',
        execution: {
          kind: 'smart',
          actionType: 'App',
          value: 'Discord.exe',
        },
      },
    };

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => {
        const action = resolveActionForGesture(event.slot, event.gesture, layer);
        if (action) {
          if (action.type === 'Shortcut') {
            executedActions.push(`Shortcut:${action.value}`);
          } else {
            void dispatchResolvedAction(action, { source: 'hardware', host: mockHost });
          }
        }
      },
    });

    gestureEngine.configureSlot('r1c3', { hasDoubleTap: true, tappingTermMs: 180 });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // Test 1: Basic Key 'A' (Single press with bounce)
    simulateSwitchBounce(debouncer, 'r1c1', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c1', false, 4, 6);
    drainTimersUntil(currentTime + 50);

    // Test 2: Action Shortcut 'Ctrl+C'
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 50);

    // Test 3: Multi Action Double Tap 'Ctrl+Y'
    simulateSwitchBounce(debouncer, 'r1c3', true, 3, 5);
    drainTimersUntil(currentTime + 30);
    simulateSwitchBounce(debouncer, 'r1c3', false, 3, 5);
    drainTimersUntil(currentTime + 30);
    simulateSwitchBounce(debouncer, 'r1c3', true, 3, 5);
    drainTimersUntil(currentTime + 30);
    simulateSwitchBounce(debouncer, 'r1c3', false, 3, 5);
    drainTimersUntil(currentTime + 200);

    // Test 4: Smart Action App Launch
    simulateSwitchBounce(debouncer, 'r2c1', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r2c1', false, 4, 6);
    drainTimersUntil(currentTime + 50);

    expect(executedActions).toEqual([
      'Shortcut:A',
      'Shortcut:Ctrl+C',
      'Shortcut:Ctrl+Y',
      'Smart:App:Discord.exe',
    ]);
  });

  it('9. Rotary encoder rotation is separate from button debouncing, push button is independently debounced', () => {
    const dialEvents: string[] = [];
    const pushEvents: string[] = [];

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onDial: (event) => dialEvents.push(event.direction),
      onGesture: (event) => pushEvents.push(event.gesture),
    });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // Rotary encoder CW rotation events bypass button debouncer directly into gestureEngine
    gestureEngine.dialRotate('cw', 'hardware');
    gestureEngine.dialRotate('cw', 'hardware');
    gestureEngine.dialRotate('ccw', 'hardware');

    expect(dialEvents).toEqual(['cw', 'cw', 'ccw']);

    // Encoder Push Switch goes through debouncer independently
    simulateSwitchBounce(debouncer, GRID_MACRO_ENCODER_SLOT, true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, GRID_MACRO_ENCODER_SLOT, false, 4, 6);
    drainTimersUntil(currentTime + 50);

    expect(pushEvents).toEqual(['onTap']);
  });

  it('10. USB HID press/release reliability: 1:1 down/up parity, no stuck keys, diagnostic logs captured', () => {
    let pressCount = 0;
    let releaseCount = 0;
    const diagnosticLogs: DiagnosticLogEntry[] = [];

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: () => pressCount++,
      onRelease: () => releaseCount++,
      onDiagnosticLog: (entry) => diagnosticLogs.push(entry),
    });

    // Simulate 5 bouncy keypresses across different buttons
    const slots = ['r1c1', 'r2c2', 'r3c3', 'r1c3', 'dial-tl'] as const;
    for (const s of slots) {
      simulateSwitchBounce(debouncer, s, true, 4, 6);
      drainTimersUntil(currentTime + 30);
      simulateSwitchBounce(debouncer, s, false, 4, 6);
      drainTimersUntil(currentTime + 30);
    }

    expect(pressCount).toBe(5);
    expect(releaseCount).toBe(5);
    expect(pressCount).toBe(releaseCount); // 1:1 parity

    // Verify all diagnostic categories were populated
    const rawLogs = diagnosticLogs.filter((l) => l.category === 'RAW_GPIO');
    const validatedLogs = diagnosticLogs.filter((l) => l.category === 'VALIDATED_BUTTON');

    expect(rawLogs.length).toBeGreaterThan(20); // Multiple raw bounces per key
    expect(validatedLogs.length).toBe(10); // Exactly 5 validated presses + 5 validated releases!
  });

  it('11. Debounce interval is configurable from 10ms up to 25ms', () => {
    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
    });

    expect(debouncer.getDebounceInterval()).toBe(10);

    debouncer.setDebounceInterval(25);
    expect(debouncer.getDebounceInterval()).toBe(25);

    let validatedPress = false;
    debouncer.setOnPress(() => {
      validatedPress = true;
    });

    // Chatter lasting 18ms should be suppressed under 25ms debounce
    debouncer.handleRawInput('r1c1', true, currentTime);
    drainTimersUntil(currentTime + 8);
    debouncer.handleRawInput('r1c1', false, currentTime);
    drainTimersUntil(currentTime + 8);
    debouncer.handleRawInput('r1c1', true, currentTime);
    drainTimersUntil(currentTime + 10);

    // At t=26 (10ms after last raw transition), not yet validated because debounce is 25ms
    expect(validatedPress).toBe(false);

    // Advance to 25ms after last raw transition
    drainTimersUntil(currentTime + 15);
    expect(validatedPress).toBe(true);
  });

  it('12. Multi Action gesture execution produces pristine single keystrokes without dual emission or auto-repeat', () => {
    const executedHostActions: string[] = [];
    const mockHost: any = {
      electronAPI: {
        executeSmartAction: vi.fn(async (payload: any) => {
          executedHostActions.push(`${payload.type || payload.actionType}:${payload.value}`);
          return { success: true };
        }),
      },
      nodeStudioAppSettings: { read: () => ({ allowTerminalSmartActions: true }) },
    };

    const multiActionLayer: ActionDispatcherLayer = {
      r1c1: {
        label: 'A',
        binding: 'A',
        actionType: 'Basic input',
      },
      r1c2: {
        label: 'Multi',
        binding: 'My Multiaction (onTap: A, doubleTap: B, onHold: C, tapHold: D)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: {
            onTap: 'A',
            doubleTap: 'B',
            onHold: 'C',
            tapHold: 'D',
          },
          tappingTermMs: 180,
        },
      },
    };

    // Test buildViaConfiguration sets KC_NO for r1c2
    const { config } = buildViaConfiguration({ layers: [multiActionLayer] }, 'win');
    expect(config.layers[0]?.keys?.r1c1).toEqual({ t: 'keys', k: ['A'] });
    expect(config.layers[0]?.keys?.r1c2).toEqual({ t: 'none' }); // KC_NO in hardware!

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => {
        const slotAssignment = multiActionLayer[event.slot];
        const action = resolveActionForGesture(event.slot, event.gesture, multiActionLayer);
        if (!action) return;

        const isMultiAction =
          slotAssignment?.actionType === 'Multi-step action' ||
          slotAssignment?.execution?.kind === 'multi' ||
          /(?:onTap|doubleTap|onHold|tapHold):/i.test(slotAssignment?.binding || '');

        // Hardware-native basic keys are emitted by QMK hardware directly over USB HID.
        // Desktop injection is suppressed for hardware-native keys to prevent duplicate typing!
        if (event.source === 'hardware' && !isMultiAction) {
          return;
        }

        void dispatchResolvedAction(action, { source: event.source as any, host: mockHost });
      },
    });

    gestureEngine.configureSlot('r1c2', {
      hasDoubleTap: true,
      hasHold: true,
      hasTapHold: true,
      tappingTermMs: 180,
      holdThresholdMs: 400,
    });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => gestureEngine.buttonDown(slot, 'hardware'),
      onRelease: (slot) => gestureEngine.buttonUp(slot),
    });

    // 1. Single tap on r1c2: user taps button once
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 50);
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 200); // drain tapping term
    expect(executedHostActions).toEqual(['Shortcut:A']); // Exactly 1 'A', NOT 'AA'!

    executedHostActions.length = 0;

    // 2. Double tap on r1c2: tap twice within tapping term
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 250);
    expect(executedHostActions).toEqual(['Shortcut:B']); // Exactly 1 'B', NOT 'AAB'!

    executedHostActions.length = 0;

    // 3. Hold on r1c2: press and hold for 500ms
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 450); // triggers hold
    expect(executedHostActions).toEqual(['Shortcut:C']); // Exactly 1 'C', NO auto-repeating 'A'!
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 50);

    executedHostActions.length = 0;

    // 4. Tap + Hold on r1c2: tap once, then press and hold
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 40);
    simulateSwitchBounce(debouncer, 'r1c2', true, 4, 6);
    drainTimersUntil(currentTime + 450); // triggers tapHold
    expect(executedHostActions).toEqual(['Shortcut:D']); // Exactly 1 'D', NOT 'AADAAAAAAA'!
    simulateSwitchBounce(debouncer, 'r1c2', false, 4, 6);
    drainTimersUntil(currentTime + 50);

    executedHostActions.length = 0;

    // 5. Basic key r1c1: physical press is typed by QMK hardware; desktop suppresses duplicate injection
    simulateSwitchBounce(debouncer, 'r1c1', true, 4, 6);
    drainTimersUntil(currentTime + 50);
    simulateSwitchBounce(debouncer, 'r1c1', false, 4, 6);
    drainTimersUntil(currentTime + 50);
    expect(executedHostActions).toEqual([]); // Suppressed in desktop to avoid duplicate keystroke!
  });
});

