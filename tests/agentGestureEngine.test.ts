import { describe, it, expect, vi } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AgentGestureEngine } = require('../electron/agentGestureEngine.cjs');

describe('AgentGestureEngine: CommonJS Gesture Recognition Equivalence', () => {
  it('dispatches zero-latency onTap when neither doubleTap nor tapHold is configured', () => {
    let now = 1000;
    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      onGesture: (e: any) => recognized.push(e),
    });

    engine.configureSlot('r1c1', {}); // neither doubleTap nor tapHold

    engine.buttonDown('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('PRESSED_1');
    expect(recognized).toHaveLength(0);

    now += 50; // release after 50ms (well before 300ms)
    engine.buttonUp('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('IDLE');
    expect(recognized).toHaveLength(1);
    expect(recognized[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'onTap',
      timestamp: 1050,
    });
  });

  it('waits for doubleTapTimer (180ms) when doubleTap is configured before emitting onTap', () => {
    let now = 1000;
    let timerCallback: (() => void) | null = null;
    let timerDelay = 0;

    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      setTimeoutFn: (cb: () => void, ms: number) => {
        timerCallback = cb;
        timerDelay = ms;
        return 123;
      },
      clearTimeoutFn: () => {
        timerCallback = null;
      },
      onGesture: (e: any) => recognized.push(e),
    });

    engine.configureSlot('r1c1', { hasDoubleTap: true, tappingTermMs: 180 });

    engine.buttonDown('r1c1');
    now += 50;
    engine.buttonUp('r1c1');

    expect(engine.getSlotState('r1c1')).toBe('RELEASED_1_WAITING');
    expect(timerDelay).toBe(180);
    expect(recognized).toHaveLength(0); // Has NOT emitted yet!

    // Timer expires without second press
    now += 180;
    timerCallback?.();

    expect(engine.getSlotState('r1c1')).toBe('IDLE');
    expect(recognized).toHaveLength(1);
    expect(recognized[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'onTap',
    });
  });

  it('recognizes doubleTap when second press arrives within 180ms', () => {
    let now = 1000;
    let timerCallback: (() => void) | null = null;

    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      setTimeoutFn: (cb: () => void) => {
        timerCallback = cb;
        return 123;
      },
      clearTimeoutFn: () => {
        timerCallback = null;
      },
      onGesture: (e: any) => recognized.push(e),
    });

    engine.configureSlot('r1c1', { hasDoubleTap: true, tappingTermMs: 180 });

    // Press 1
    engine.buttonDown('r1c1');
    now += 40;
    engine.buttonUp('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('RELEASED_1_WAITING');

    // Press 2 within 100ms (< 180ms)
    now += 100;
    engine.buttonDown('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('PRESSED_2');

    // Release 2 before hold threshold
    now += 40;
    engine.buttonUp('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('IDLE');
    expect(recognized).toHaveLength(1);
    expect(recognized[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'doubleTap',
    });
  });

  it('recognizes onHold when key is held continuously past 300ms', () => {
    let now = 1000;
    let holdTimerCallback: (() => void) | null = null;
    let holdDelay = 0;

    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      setTimeoutFn: (cb: () => void, ms: number) => {
        holdTimerCallback = cb;
        holdDelay = ms;
        return 456;
      },
      clearTimeoutFn: () => {
        holdTimerCallback = null;
      },
      onGesture: (e: any) => recognized.push(e),
    });

    engine.configureSlot('r1c2', { holdThresholdMs: 300 });

    engine.buttonDown('r1c2');
    expect(engine.getSlotState('r1c2')).toBe('PRESSED_1');
    expect(holdDelay).toBe(300);

    // Hold threshold reached
    now += 300;
    holdTimerCallback?.();

    expect(engine.getSlotState('r1c2')).toBe('HELD_1');
    expect(recognized).toHaveLength(1);
    expect(recognized[0]).toMatchObject({
      slot: 'r1c2',
      gesture: 'onHold',
    });

    // Later release from HELD_1 transitions to IDLE with no extra events
    now += 500;
    engine.buttonUp('r1c2');
    expect(engine.getSlotState('r1c2')).toBe('IDLE');
    expect(recognized).toHaveLength(1); // Still 1
  });

  it('recognizes tapHold on second press held past 300ms', () => {
    let now = 1000;
    let timerCallback: (() => void) | null = null;

    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      setTimeoutFn: (cb: () => void) => {
        timerCallback = cb;
        return 789;
      },
      clearTimeoutFn: () => {
        timerCallback = null;
      },
      onGesture: (e: any) => recognized.push(e),
    });

    engine.configureSlot('r1c3', { hasTapHold: true, holdThresholdMs: 300 });

    // Press 1 and release within tapping term
    engine.buttonDown('r1c3');
    now += 40;
    engine.buttonUp('r1c3');
    expect(engine.getSlotState('r1c3')).toBe('RELEASED_1_WAITING');

    // Press 2 within 180ms
    now += 80;
    engine.buttonDown('r1c3');
    expect(engine.getSlotState('r1c3')).toBe('PRESSED_2');

    // Hold on second press crosses 300ms
    now += 300;
    timerCallback?.();

    expect(engine.getSlotState('r1c3')).toBe('HELD_2');
    expect(recognized).toHaveLength(1);
    expect(recognized[0]).toMatchObject({
      slot: 'r1c3',
      gesture: 'tapHold',
    });

    // Release from HELD_2
    now += 100;
    engine.buttonUp('r1c3');
    expect(engine.getSlotState('r1c3')).toBe('IDLE');
  });

  it('handles simultaneous overlapping keypresses on different slots independently', () => {
    let now = 1000;
    const recognized: any[] = [];
    const engine = new AgentGestureEngine({
      now: () => now,
      onGesture: (e: any) => recognized.push(e),
    });

    // Press Key 1
    engine.buttonDown('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('PRESSED_1');

    // Press Key 2 while Key 1 is still down
    now += 20;
    engine.buttonDown('r2c2');
    expect(engine.getSlotState('r2c2')).toBe('PRESSED_1');

    // Release Key 1
    now += 30;
    engine.buttonUp('r1c1');
    expect(engine.getSlotState('r1c1')).toBe('IDLE');
    expect(engine.getSlotState('r2c2')).toBe('PRESSED_1'); // Key 2 unaffected!
    expect(recognized).toHaveLength(1);
    expect(recognized[0].slot).toBe('r1c1');

    // Release Key 2
    now += 30;
    engine.buttonUp('r2c2');
    expect(engine.getSlotState('r2c2')).toBe('IDLE');
    expect(recognized).toHaveLength(2);
    expect(recognized[1].slot).toBe('r2c2');
  });
});
