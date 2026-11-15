/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHardwareTriggerController, type SimulationAction } from '../src/actionExecution';
import { DEFAULT_TAPPING_TERM_MS } from '../src/multiActionGestureEngine';

/**
 * Phase 6 performance evidence.
 *
 * These tests measure the *scheduling* delay the app itself introduces between a
 * key-down arriving from the firmware and the action being dispatched. They do
 * not and cannot measure real keystroke-to-OS latency, which needs Windows and
 * physical hardware. Fake timers are used so the numbers are deterministic
 * assertions about the design, not wall-clock benchmarks.
 */

function clock() {
  let now = 0;
  let seq = 0;
  const pending = new Map<number, { at: number; cb: () => void; scheduledAt: number }>();
  const dispatches: { value: unknown; at: number }[] = [];
  return {
    dispatches,
    host: {
      setTimeout: (cb: () => void, ms: number) => {
        const id = ++seq;
        pending.set(id, { at: now + ms, cb, scheduledAt: now });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (id: ReturnType<typeof setTimeout>) => { pending.delete(id as unknown as number); },
      now: () => now,
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...pending.entries()].filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].cb();
      }
      now = target;
    },
    get now() { return now; },
  };
}

function installCapture(clockRef: ReturnType<typeof clock>) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      executeSmartAction: vi.fn(async (payload: Record<string, unknown>) => {
        clockRef.dispatches.push({ value: payload.value, at: clockRef.now });
        return { success: true };
      }),
    },
  });
  Object.defineProperty(window, 'nodeStudioAppSettings', {
    configurable: true,
    value: { read: () => ({ allowTerminalSmartActions: false }) },
  });
}

function multi(gestures: Record<string, string>, tappingTermMs?: number): SimulationAction {
  return {
    id: 'multi',
    binding: `M (${Object.entries(gestures).map(([k, v]) => `${k}: ${v}`).join(', ')})`,
    execution: { kind: 'multi', gestures, ...(tappingTermMs ? { tappingTermMs } : {}) },
  };
}

afterEach(() => {
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { nodeStudioAppSettings?: unknown }).nodeStudioAppSettings;
  vi.restoreAllMocks();
});

describe('Multi-Action dispatch latency vs Basic Actions', () => {
  it('dispatches an unambiguous onTap on the press edge with zero added delay', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);

    c.advance(1000);
    const pressAt = c.now;
    controller.handleSlotEvent('r1c1', true, multi({ onTap: 'Ctrl + C' }));

    expect(c.dispatches).toHaveLength(1);
    // Zero scheduling latency: same edge a firmware-native Basic Action uses.
    expect(c.dispatches[0].at - pressAt).toBe(0);
  });

  it('does not wait for key release, so press duration adds no latency', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);
    const action = multi({ onTap: 'Ctrl + C' });

    const pressAt = c.now;
    controller.handleSlotEvent('r1c1', true, action);
    // Simulate a slow 150ms physical press before release.
    c.advance(150);
    controller.handleSlotEvent('r1c1', false, action);

    expect(c.dispatches).toHaveLength(1);
    expect(c.dispatches[0].at - pressAt).toBe(0);
  });

  it('adds only the necessary disambiguation wait when a hold competes', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);
    const action = multi({ onTap: 'Ctrl + C', onHold: 'Ctrl + V' }, 220);

    const pressAt = c.now;
    controller.handleSlotEvent('r1c1', true, action);
    expect(c.dispatches).toHaveLength(0); // genuinely ambiguous, must wait
    c.advance(100);
    controller.handleSlotEvent('r1c1', false, action);

    // Release before the hold threshold resolves the tap; no extra term is added
    // because doubleTap/tapHold are not configured.
    expect(c.dispatches).toHaveLength(1);
    expect(c.dispatches[0].value).toBe('Ctrl + C');
    expect(c.dispatches[0].at - pressAt).toBe(100);
  });

  it('waits one tapping term for a tap only when doubleTap makes it ambiguous', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);
    const action = multi({ onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' }, 220);

    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);
    expect(c.dispatches).toHaveLength(0);
    c.advance(DEFAULT_TAPPING_TERM_MS);
    expect(c.dispatches).toHaveLength(1);
    expect(c.dispatches[0].value).toBe('Ctrl + C');
  });

  it('adds no per-action delay across a burst of 20 rapid presses', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);
    const action = multi({ onTap: 'Ctrl + C' });

    const start = c.now;
    for (let i = 0; i < 20; i++) {
      controller.handleSlotEvent('r1c1', true, action);
      controller.handleSlotEvent('r1c1', false, action);
    }
    expect(c.dispatches).toHaveLength(20);
    // Every dispatch happened at press time; none were deferred or batched.
    expect(c.dispatches.every((d) => d.at === start)).toBe(true);
  });

  it('dispatches a Basic Action with the same zero scheduling delay as onTap', () => {
    const c = clock();
    installCapture(c);
    const controller = createHardwareTriggerController(() => {}, () => {}, window, c.host);
    const basic: SimulationAction = { id: 'basic', binding: 'Ctrl + C' };

    const at = c.now;
    controller.handleSlotEvent('r1c1', true, basic);
    expect(c.dispatches).toHaveLength(1);
    expect(c.dispatches[0].at - at).toBe(0);
  });
});
