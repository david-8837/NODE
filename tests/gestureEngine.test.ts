import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GestureEngine,
  type RecognizedGestureEvent,
  type RecognizedDialEvent,
} from '../src/gestureEngine';

describe('GestureEngine: Deterministic Multi-Gesture Recognition', () => {
  let virtualTime = 1000;
  let engine: GestureEngine;
  let gestures: RecognizedGestureEvent[];
  let dials: RecognizedDialEvent[];

  beforeEach(() => {
    vi.useFakeTimers();
    virtualTime = 1000;
    gestures = [];
    dials = [];

    engine = new GestureEngine({
      now: () => virtualTime,
      onGesture: (e) => gestures.push(e),
      onDial: (e) => dials.push(e),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advanceTime = (ms: number) => {
    virtualTime += ms;
    vi.advanceTimersByTime(ms);
  };

  it('fires immediate single tap on release when double-tap is not configured (0ms latency)', () => {
    engine.configureSlot('r1c1', { hasDoubleTap: false, hasTapHold: false });

    engine.buttonDown('r1c1');
    advanceTime(50);
    engine.buttonUp('r1c1');

    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'onTap',
    });
  });

  it('delays single tap until double-tap window expires when double-tap is configured', () => {
    engine.configureSlot('r1c1', {
      hasDoubleTap: true,
      tappingTermMs: 200,
    });

    engine.buttonDown('r1c1');
    advanceTime(40);
    engine.buttonUp('r1c1');

    // Has not fired yet because it's waiting for potential second tap
    expect(gestures).toHaveLength(0);

    // Advance 150ms (still within 200ms)
    advanceTime(150);
    expect(gestures).toHaveLength(0);

    // Advance remaining time (past 200ms)
    advanceTime(60);
    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'onTap',
    });
  });

  it('recognizes double tap when second press occurs within tapping term', () => {
    engine.configureSlot('r1c1', {
      hasDoubleTap: true,
      tappingTermMs: 250,
    });

    // Press 1
    engine.buttonDown('r1c1');
    advanceTime(40);
    engine.buttonUp('r1c1');

    // Wait 100ms
    advanceTime(100);

    // Press 2
    engine.buttonDown('r1c1');
    advanceTime(30);
    engine.buttonUp('r1c1');

    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'doubleTap',
    });
  });

  it('treats two taps outside the tapping term as two separate single taps', () => {
    engine.configureSlot('r1c1', {
      hasDoubleTap: true,
      tappingTermMs: 200,
    });

    // Tap 1
    engine.buttonDown('r1c1');
    advanceTime(30);
    engine.buttonUp('r1c1');

    // Wait 250ms (exceeds 200ms tapping term)
    advanceTime(250);
    expect(gestures).toHaveLength(1);
    expect(gestures[0].gesture).toBe('onTap');

    // Tap 2
    engine.buttonDown('r1c1');
    advanceTime(30);
    engine.buttonUp('r1c1');

    advanceTime(250);
    expect(gestures).toHaveLength(2);
    expect(gestures[1].gesture).toBe('onTap');
  });

  it('recognizes onHold when button is held past the hold threshold and fires only once', () => {
    engine.configureSlot('r1c2', {
      hasHold: true,
      holdThresholdMs: 500,
    });

    engine.buttonDown('r1c2');
    advanceTime(300);
    expect(gestures).toHaveLength(0);

    advanceTime(250); // Total 550ms, crosses 500ms
    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r1c2',
      gesture: 'onHold',
    });

    // Continue holding for another 500ms - should NOT fire again
    advanceTime(500);
    expect(gestures).toHaveLength(1);

    // Release should NOT trigger onTap
    engine.buttonUp('r1c2');
    advanceTime(300);
    expect(gestures).toHaveLength(1);
  });

  it('releases before hold threshold to trigger tap, not hold', () => {
    engine.configureSlot('r1c2', {
      hasHold: true,
      holdThresholdMs: 500,
      hasDoubleTap: false,
    });

    engine.buttonDown('r1c2');
    advanceTime(250); // Less than 500ms
    engine.buttonUp('r1c2');

    expect(gestures).toHaveLength(1);
    expect(gestures[0].gesture).toBe('onTap');
  });

  it('recognizes tapHold when tap 1 is released and tap 2 is held past threshold', () => {
    engine.configureSlot('r2c2', {
      hasTapHold: true,
      hasDoubleTap: true,
      tappingTermMs: 250,
      holdThresholdMs: 400,
    });

    // Tap 1
    engine.buttonDown('r2c2');
    advanceTime(40);
    engine.buttonUp('r2c2');

    // Press 2 within double-tap window
    advanceTime(100);
    engine.buttonDown('r2c2');

    // Hold press 2 past threshold (400ms)
    advanceTime(450);
    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r2c2',
      gesture: 'tapHold',
    });

    // Releasing press 2 should not fire doubleTap or onTap
    engine.buttonUp('r2c2');
    advanceTime(300);
    expect(gestures).toHaveLength(1);
  });

  it('maintains independent gesture state across multiple simultaneous keys', () => {
    engine.configureSlot('r1c1', { hasDoubleTap: true, tappingTermMs: 250 });
    engine.configureSlot('r3c3', { hasHold: true, holdThresholdMs: 400 });

    // Press Key 1
    engine.buttonDown('r1c1');
    advanceTime(20);

    // Press Key 2 while Key 1 is held
    engine.buttonDown('r3c3');
    advanceTime(30);

    // Release Key 1
    engine.buttonUp('r1c1');
    advanceTime(50);

    // Tap Key 1 again (making double-tap on Key 1)
    engine.buttonDown('r1c1');
    advanceTime(30);
    engine.buttonUp('r1c1');

    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'doubleTap',
    });

    // Key 2 is STILL held! Advance until its hold threshold expires
    advanceTime(350); // Key 2 total hold time = 30 + 50 + 30 + 350 = 460ms (> 400ms)
    expect(gestures).toHaveLength(2);
    expect(gestures[1]).toMatchObject({
      slot: 'r3c3',
      gesture: 'onHold',
    });

    engine.buttonUp('r3c3');
  });

  it('handles the rotary encoder push switch as slot dial-tl independently', () => {
    engine.configureSlot('dial-tl', {
      hasDoubleTap: true,
      tappingTermMs: 200,
    });

    engine.buttonDown('dial-tl');
    advanceTime(30);
    engine.buttonUp('dial-tl');
    advanceTime(50);
    engine.buttonDown('dial-tl');
    advanceTime(30);
    engine.buttonUp('dial-tl');

    expect(gestures).toHaveLength(1);
    expect(gestures[0]).toMatchObject({
      slot: 'dial-tl',
      gesture: 'doubleTap',
    });
  });

  it('dispatches dial rotation events with clockwise and counter-clockwise directions', () => {
    engine.dialRotate('cw');
    advanceTime(10);
    engine.dialRotate('ccw');

    expect(dials).toHaveLength(2);
    expect(dials[0]).toMatchObject({
      slot: 'dial-tl',
      direction: 'cw',
    });
    expect(dials[1]).toMatchObject({
      slot: 'dial-tl',
      direction: 'ccw',
    });
  });

  it('cancels all active timers and clears state on resetAll', () => {
    engine.configureSlot('r1c1', { hasDoubleTap: true, tappingTermMs: 300 });
    engine.configureSlot('r2c2', { hasHold: true, holdThresholdMs: 500 });

    engine.buttonDown('r1c1');
    advanceTime(30);
    engine.buttonUp('r1c1'); // Waiting in double-tap window

    engine.buttonDown('r2c2'); // Waiting in hold window

    // Reset before either timer fires (e.g. device disconnected or profile changed)
    engine.resetAll();

    advanceTime(600);
    expect(gestures).toHaveLength(0);
    expect(engine.getSlotState('r1c1')).toBe('IDLE');
    expect(engine.getSlotState('r2c2')).toBe('IDLE');
  });

  it('ignores duplicate buttonDown and buttonUp bounce events safely', () => {
    engine.configureSlot('r1c1', { hasDoubleTap: false });

    engine.buttonDown('r1c1');
    engine.buttonDown('r1c1'); // Duplicate down (contact chatter)
    advanceTime(30);
    engine.buttonUp('r1c1');
    engine.buttonUp('r1c1'); // Duplicate up

    expect(gestures).toHaveLength(1);
    expect(gestures[0].gesture).toBe('onTap');
  });
});

