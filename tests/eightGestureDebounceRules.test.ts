import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DebounceEngine } from '../src/debounceEngine';
import {
  GestureEngine,
  type RecognizedGestureEvent,
} from '../src/gestureEngine';
import {
  resolveActionForGesture,
  dispatchResolvedAction,
  type ActionDispatcherLayer,
} from '../src/actionDispatcher';
import { buildViaConfiguration } from '../src/qmkProfileSync';

describe('Validation of the 8 Button Debouncing & Gesture Recognition Rules', () => {
  let currentTime = 1000;
  const advanceTime = (ms: number) => {
    currentTime += ms;
  };

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

  beforeEach(() => {
    currentTime = 1000;
    timerIdCounter = 1;
    activeTimers = [];
  });

  const simulateSwitchBounce = (
    debouncer: DebounceEngine,
    slot: any,
    targetState: boolean,
    bounces = 4,
    intervalMs = 2
  ) => {
    for (let i = 0; i < bounces; i++) {
      const intermediateState = i % 2 === 0 ? targetState : !targetState;
      debouncer.handleRawInput(slot, intermediateState, currentTime, 'hardware');
      currentTime += intervalMs;
    }
    debouncer.handleRawInput(slot, targetState, currentTime, 'hardware');
  };

  // --------------------------------------------------------------------------
  // Rule 1: Debouncing happens before gesture recognition
  // --------------------------------------------------------------------------
  it('Rule 1: Debouncing happens before gesture recognition (chatter is fully filtered)', () => {
    const rawEvents: Array<{ slot: string; isDown: boolean }> = [];
    const validatedEvents: Array<{ slot: string; isDown: boolean }> = [];
    const gestureEvents: RecognizedGestureEvent[] = [];

    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestureEvents.push(event),
    });
    gestureEngine.configureSlot('r1c1', { hasDoubleTap: false });

    const debouncer = new DebounceEngine({
      debounceIntervalMs: 10,
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onPress: (slot) => {
        validatedEvents.push({ slot, isDown: true });
        gestureEngine.buttonDown(slot, 'hardware');
      },
      onRelease: (slot) => {
        validatedEvents.push({ slot, isDown: false });
        gestureEngine.buttonUp(slot);
      },
    });

    // Simulate mechanical switch chatter on button press: 5 bouncy transitions within 8ms
    for (let i = 0; i < 5; i++) {
      const state = i % 2 === 0;
      rawEvents.push({ slot: 'r1c1', isDown: state });
      debouncer.handleRawInput('r1c1', state, currentTime, 'hardware');
      currentTime += 2;
    }
    debouncer.handleRawInput('r1c1', true, currentTime, 'hardware');
    rawEvents.push({ slot: 'r1c1', isDown: true });

    // During the 10ms debounce period, gestureEngine must NOT have received any press!
    expect(validatedEvents).toHaveLength(0);
    expect(gestureEvents).toHaveLength(0);

    // Drain timers past the 10ms debounce window
    drainTimersUntil(currentTime + 15);

    // Exactly one validated press reached gesture engine
    expect(validatedEvents).toEqual([{ slot: 'r1c1', isDown: true }]);

    // Release with contact bounce
    simulateSwitchBounce(debouncer, 'r1c1', false, 4, 2);
    drainTimersUntil(currentTime + 15);

    expect(validatedEvents).toEqual([
      { slot: 'r1c1', isDown: true },
      { slot: 'r1c1', isDown: false },
    ]);
    expect(gestureEvents).toHaveLength(1);
    expect(gestureEvents[0].gesture).toBe('onTap');
  });

  // --------------------------------------------------------------------------
  // Rule 2: A gesture can execute only once per recognition cycle
  // --------------------------------------------------------------------------
  it('Rule 2: A gesture can execute only once per recognition cycle', () => {
    const gestures: string[] = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestures.push(event.gesture),
    });

    gestureEngine.configureSlot('r1c1', {
      hasDoubleTap: true,
      hasHold: true,
      hasTapHold: true,
      tappingTermMs: 180,
      holdThresholdMs: 400,
    });

    // Cycle 1: Single tap
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');
    drainTimersUntil(currentTime + 200);
    expect(gestures).toEqual(['onTap']); // Exactly 1

    gestures.length = 0;

    // Cycle 2: Double tap
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');
    advanceTime(40);
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');
    drainTimersUntil(currentTime + 250);
    expect(gestures).toEqual(['doubleTap']); // Exactly 1, no trailing onTap

    gestures.length = 0;

    // Cycle 3: Hold
    gestureEngine.buttonDown('r1c1');
    drainTimersUntil(currentTime + 450); // crosses hold threshold
    expect(gestures).toEqual(['onHold']); // Exactly 1
    // Keep held for another 500ms
    advanceTime(500);
    gestureEngine.buttonUp('r1c1');
    drainTimersUntil(currentTime + 100);
    expect(gestures).toEqual(['onHold']); // Still only 1, no duplicate on release
  });

  // --------------------------------------------------------------------------
  // Rule 3: Single tap must wait for the double-tap window
  // --------------------------------------------------------------------------
  it('Rule 3: Single tap must wait for the double-tap window', () => {
    const gestures: string[] = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestures.push(event.gesture),
    });

    gestureEngine.configureSlot('r1c1', {
      hasDoubleTap: true,
      tappingTermMs: 180,
    });

    gestureEngine.buttonDown('r1c1');
    advanceTime(50);
    gestureEngine.buttonUp('r1c1');

    // Immediately after release at t=0, single tap must NOT have executed yet
    expect(gestures).toHaveLength(0);

    // Advance 100ms (still inside the 180ms double-tap window)
    drainTimersUntil(currentTime + 100);
    expect(gestures).toHaveLength(0);

    // Advance past the 180ms window
    drainTimersUntil(currentTime + 90);
    expect(gestures).toEqual(['onTap']);
  });

  // --------------------------------------------------------------------------
  // Rule 4: Double tap must cancel the pending single-tap action
  // --------------------------------------------------------------------------
  it('Rule 4: Double tap must cancel the pending single-tap action', () => {
    const gestures: string[] = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestures.push(event.gesture),
    });

    gestureEngine.configureSlot('r1c1', {
      hasDoubleTap: true,
      tappingTermMs: 180,
    });

    // Tap 1
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');
    advanceTime(50); // 50ms into 180ms window

    expect(gestures).toHaveLength(0);

    // Tap 2 arrives: cancels pending single-tap timer
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');

    // Advance past all timers
    drainTimersUntil(currentTime + 300);

    // Result must ONLY be doubleTap. Single tap was successfully canceled!
    expect(gestures).toEqual(['doubleTap']);
  });

  // --------------------------------------------------------------------------
  // Rule 5: Hold must not accidentally execute single tap
  // --------------------------------------------------------------------------
  it('Rule 5: Hold must not accidentally execute single tap', () => {
    const gestures: string[] = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestures.push(event.gesture),
    });

    gestureEngine.configureSlot('r1c1', {
      hasHold: true,
      hasDoubleTap: true,
      holdThresholdMs: 400,
    });

    gestureEngine.buttonDown('r1c1');
    drainTimersUntil(currentTime + 450); // hold triggers

    expect(gestures).toEqual(['onHold']);

    // Release button after holding for 1 second
    advanceTime(600);
    gestureEngine.buttonUp('r1c1');
    drainTimersUntil(currentTime + 250);

    // Releasing must NOT trigger an accidental onTap
    expect(gestures).toEqual(['onHold']);
  });

  // --------------------------------------------------------------------------
  // Rule 6: Tap + Hold must not accidentally execute the individual tap action
  // --------------------------------------------------------------------------
  it('Rule 6: Tap + Hold must not accidentally execute the individual tap action', () => {
    const gestures: string[] = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => gestures.push(event.gesture),
    });

    gestureEngine.configureSlot('r1c1', {
      hasDoubleTap: true,
      hasHold: true,
      hasTapHold: true,
      tappingTermMs: 180,
      holdThresholdMs: 400,
    });

    // Tap 1
    gestureEngine.buttonDown('r1c1');
    advanceTime(40);
    gestureEngine.buttonUp('r1c1');

    // Advance 50ms (within double-tap window)
    advanceTime(50);
    expect(gestures).toHaveLength(0); // single tap is waiting

    // Press 2 and hold
    gestureEngine.buttonDown('r1c1'); // Cancels single tap!
    drainTimersUntil(currentTime + 450); // Crosses hold threshold for second press

    // Exactly tapHold fires
    expect(gestures).toEqual(['tapHold']);

    // Release after holding
    advanceTime(200);
    gestureEngine.buttonUp('r1c1');
    drainTimersUntil(currentTime + 200);

    // No accidental onTap or doubleTap occurred
    expect(gestures).toEqual(['tapHold']);
  });

  // --------------------------------------------------------------------------
  // Rule 7: Every HID key-down must have a corresponding key-up
  // --------------------------------------------------------------------------
  it('Rule 7: Every HID key-down must have a corresponding key-up (zero stuck keys)', async () => {
    const hidEvents: Array<{ type: 'down' | 'up'; key: string }> = [];

    const mockHost: any = {
      electronAPI: {
        executeSmartAction: vi.fn(async (payload: any) => {
          // Emulate standard press-release operation of desktopExecution
          hidEvents.push({ type: 'down', key: payload.value });
          hidEvents.push({ type: 'up', key: payload.value });
          return { success: true };
        }),
      },
      nodeStudioAppSettings: { read: () => ({ allowTerminalSmartActions: true }) },
    };

    const action = {
      type: 'Shortcut',
      value: 'Ctrl+C',
      payload: { type: 'Shortcut', value: 'Ctrl+C' },
    };

    const result = await dispatchResolvedAction(action, {
      source: 'simulation',
      host: mockHost,
    });

    expect(result.success).toBe(true);
    expect(hidEvents).toEqual([
      { type: 'down', key: 'Ctrl+C' },
      { type: 'up', key: 'Ctrl+C' },
    ]);

    // Count down vs up parity
    const downs = hidEvents.filter((e) => e.type === 'down').length;
    const ups = hidEvents.filter((e) => e.type === 'up').length;
    expect(downs).toBe(ups);
    expect(downs).toBe(1);
  });

  // --------------------------------------------------------------------------
  // Rule 8: Different physical buttons must operate independently
  // --------------------------------------------------------------------------
  it('Rule 8: Different physical buttons operate independently (no cross-talk)', () => {
    const gestureLog: Array<{ slot: string; gesture: string }> = [];
    const gestureEngine = new GestureEngine({
      now: () => currentTime,
      setTimeoutFn: mockSetTimeout,
      clearTimeoutFn: mockClearTimeout,
      onGesture: (event) => {
        gestureLog.push({ slot: event.slot, gesture: event.gesture });
      },
    });

    // Configure r1c1 as Hold key, r1c2 as DoubleTap key, r1c3 as Basic key
    gestureEngine.configureSlot('r1c1', { hasHold: true, holdThresholdMs: 400 });
    gestureEngine.configureSlot('r1c2', { hasDoubleTap: true, tappingTermMs: 180 });
    gestureEngine.configureSlot('r1c3', { hasDoubleTap: false, hasHold: false });

    // 1. Press and hold r1c1
    gestureEngine.buttonDown('r1c1');
    advanceTime(100);

    // 2. While r1c1 is held, perform double-tap on r1c2
    gestureEngine.buttonDown('r1c2');
    advanceTime(40);
    gestureEngine.buttonUp('r1c2');
    advanceTime(40);
    gestureEngine.buttonDown('r1c2');
    advanceTime(40);
    gestureEngine.buttonUp('r1c2');

    // 3. r1c1 hold threshold crosses
    drainTimersUntil(currentTime + 300);

    // Release r1c1
    gestureEngine.buttonUp('r1c1');

    // 4. Tap r1c3
    gestureEngine.buttonDown('r1c3');
    advanceTime(30);
    gestureEngine.buttonUp('r1c3');

    // Drain all remaining timers
    drainTimersUntil(currentTime + 300);

    expect(gestureLog).toEqual([
      { slot: 'r1c2', gesture: 'doubleTap' },
      { slot: 'r1c1', gesture: 'onHold' },
      { slot: 'r1c3', gesture: 'onTap' },
    ]);
  });
});

