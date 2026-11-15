/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createHardwareTriggerController,
  triggerSimulationAction,
  type SimulationAction,
} from '../src/actionExecution';
import { MultiActionGestureEngine } from '../src/multiActionGestureEngine';

/**
 * Regression coverage for two defects found during pre-release validation:
 *
 * V1 - a resolved gesture was matched against the whole Multi-Action summary, so
 *      `onHold: Layer 2` hijacked `onTap: Ctrl + C` and switched layer instead.
 * V2 - a gesture holding a Smart Action was dispatched as a Shortcut, so the
 *      executor rejected "(Text: hello world)" as an unsupported key.
 */

interface Captured {
  payloads: Record<string, unknown>[];
  toasts: string[];
  layers: number[];
}

function installHost(settings: { allowTerminalSmartActions?: boolean } = {}): Captured {
  const captured: Captured = { payloads: [], toasts: [], layers: [] };
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      executeSmartAction: vi.fn(async (payload: Record<string, unknown>) => {
        captured.payloads.push(payload);
        return { success: true };
      }),
    },
  });
  Object.defineProperty(window, 'nodeStudioAppSettings', {
    configurable: true,
    value: { read: () => ({ allowTerminalSmartActions: settings.allowTerminalSmartActions === true }) },
  });
  Object.defineProperty(window, 'confirm', { configurable: true, value: vi.fn(() => true) });
  return captured;
}

/** Deterministic timer host so gesture resolution needs no real waiting. */
function fakeTimers() {
  let now = 0;
  let seq = 0;
  const pending = new Map<number, { at: number; cb: () => void }>();
  return {
    host: {
      setTimeout: (cb: () => void, ms: number) => {
        const id = ++seq;
        pending.set(id, { at: now + ms, cb });
        return id as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimeout: (id: ReturnType<typeof setTimeout>) => { pending.delete(id as unknown as number); },
      now: () => now,
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...pending.entries()]
          .filter(([, t]) => t.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        pending.delete(due[0]);
        now = due[1].at;
        due[1].cb();
      }
      now = target;
    },
  };
}

function multi(gestures: Record<string, string>, tappingTermMs = 220): SimulationAction {
  const summary = Object.entries(gestures).map(([k, v]) => `${k}: ${v}`).join(', ');
  return {
    id: 'multi-1',
    label: 'My Multi',
    binding: `My Multi (${summary})`,
    execution: { kind: 'multi', gestures, tappingTermMs },
  };
}

beforeEach(() => { window.localStorage.clear(); });

afterEach(() => {
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { nodeStudioAppSettings?: unknown }).nodeStudioAppSettings;
  vi.restoreAllMocks();
});

describe('V1 regression: a resolved gesture is judged on its own binding', () => {
  it('runs onTap even when another gesture in the same key targets a layer', () => {
    const captured = installHost();
    const controller = createHardwareTriggerController(
      (i) => { captured.layers.push(i); },
      (m) => captured.toasts.push(m),
      window
    );
    const action = multi({ onTap: 'Ctrl + C', onHold: 'Layer 2' });

    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);

    expect(captured.payloads).toEqual([
      expect.objectContaining({ type: 'Shortcut', value: 'Ctrl + C', hardwareTrigger: true }),
    ]);
    expect(captured.layers).toEqual([]);
    expect(captured.toasts).not.toContain('Switched to Layer 2');
  });

  it('still switches layer when the resolved gesture itself is the layer action', () => {
    const captured = installHost();
    const timers = fakeTimers();
    const controller = createHardwareTriggerController(
      (i) => { captured.layers.push(i); },
      (m) => captured.toasts.push(m),
      window,
      timers.host
    );
    const action = multi({ onTap: 'Ctrl + C', onHold: 'Layer 3' });

    controller.handleSlotEvent('r1c1', true, action);
    timers.advance(250); // hold threshold reached -> onHold resolves
    controller.handleSlotEvent('r1c1', false, action);

    expect(captured.layers).toEqual([2]);
    expect(captured.payloads).toEqual([]);
  });

  it('does not let a layer-looking label or id hijack a resolved gesture', () => {
    const captured = installHost();
    triggerSimulationAction(
      { ...multi({ onTap: 'Ctrl + V' }), id: 'lyr-3', label: 'L2', gesture: 'onTap' },
      (i) => { captured.layers.push(i); },
      (m) => captured.toasts.push(m),
      window
    );
    expect(captured.layers).toEqual([]);
    expect(captured.payloads).toEqual([
      expect.objectContaining({ type: 'Shortcut', value: 'Ctrl + V' }),
    ]);
  });

  it('keeps plain Basic layer keys working (no structured multi execution)', () => {
    const captured = installHost();
    triggerSimulationAction(
      { id: 'lyr-2', label: 'L2', binding: 'Layer 2' },
      (i) => { captured.layers.push(i); },
      (m) => captured.toasts.push(m),
      window
    );
    expect(captured.layers).toEqual([1]);
    expect(captured.toasts).toContain('Switched to Layer 2');
  });
});

describe('V2 regression: Smart Actions bound to a gesture dispatch as their own type', () => {
  it.each([
    ['(Text: hello world)', 'Text', 'hello world'],
    ['(App: Notepad)', 'App', 'Notepad'],
    ['(Web: https://example.com)', 'Web', 'https://example.com'],
    ['Text: no wrapper', 'Text', 'no wrapper'],
  ])('dispatches %s as %s', (binding, type, value) => {
    const captured = installHost();
    const controller = createHardwareTriggerController(() => {}, (m) => captured.toasts.push(m), window);
    const action = multi({ onTap: binding });

    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);

    expect(captured.payloads).toEqual([
      expect.objectContaining({ type, value, hardwareTrigger: true }),
    ]);
  });

  it('preserves text containing colons and parentheses', () => {
    const captured = installHost();
    const controller = createHardwareTriggerController(() => {}, () => {}, window);
    const action = multi({ onTap: '(Text: time: 12:30 (noon))' });
    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);
    expect(captured.payloads[0]).toMatchObject({ type: 'Text', value: 'time: 12:30 (noon)' });
  });

  it('still enforces the terminal allowance for a Cmd gesture', () => {
    const captured = installHost({ allowTerminalSmartActions: false });
    const controller = createHardwareTriggerController(() => {}, (m) => captured.toasts.push(m), window);
    const action = multi({ onTap: '(Cmd: ipconfig)' });
    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);
    expect(captured.payloads).toEqual([]);
    expect(captured.toasts).toContain('Terminal commands are disabled in Settings');
  });

  it('passes allowTerminal when Settings permits a Cmd gesture', () => {
    const captured = installHost({ allowTerminalSmartActions: true });
    const controller = createHardwareTriggerController(() => {}, () => {}, window);
    const action = multi({ onTap: '(Cmd: ipconfig)' });
    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action);
    expect(captured.payloads[0]).toMatchObject({
      type: 'Cmd', value: 'ipconfig', allowTerminal: true, hardwareTrigger: true,
    });
  });
});

describe('Multi-Action ordering and rapid presses', () => {
  it('fires an unambiguous onTap on the press edge, once per press', () => {
    const captured = installHost();
    const controller = createHardwareTriggerController(() => {}, () => {}, window);
    const action = multi({ onTap: 'Ctrl + C' });

    for (let i = 0; i < 5; i++) {
      controller.handleSlotEvent('r1c1', true, action);
      // A duplicate key-down (USB repeat) must not double-fire.
      controller.handleSlotEvent('r1c1', true, action);
      controller.handleSlotEvent('r1c1', false, action);
    }
    expect(captured.payloads).toHaveLength(5);
    expect(captured.payloads.every((p) => p.value === 'Ctrl + C')).toBe(true);
  });

  it('keeps concurrent presses on different slots independent and ordered', () => {
    const captured = installHost();
    const controller = createHardwareTriggerController(() => {}, () => {}, window);
    const a = multi({ onTap: 'Ctrl + A' });
    const b = multi({ onTap: 'Ctrl + B' });

    controller.handleSlotEvent('r1c1', true, a);
    controller.handleSlotEvent('r1c2', true, b);
    controller.handleSlotEvent('r1c1', false, a);
    controller.handleSlotEvent('r1c2', false, b);

    expect(captured.payloads.map((p) => p.value)).toEqual(['Ctrl + A', 'Ctrl + B']);
  });

  it('cancels pending gesture timers so a disconnect cannot fire a stale action', () => {
    const captured = installHost();
    const timers = fakeTimers();
    const controller = createHardwareTriggerController(() => {}, () => {}, window, timers.host);
    const action = multi({ onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' });

    controller.handleSlotEvent('r1c1', true, action);
    controller.handleSlotEvent('r1c1', false, action); // waiting for a second press
    controller.cancelAll();
    timers.advance(1000);

    expect(captured.payloads).toEqual([]);
  });

  it('resolves doubleTap without also firing onTap', () => {
    const captured = installHost();
    const timers = fakeTimers();
    const engine = new MultiActionGestureEngine((e) => { captured.toasts.push(`${e.gesture}:${e.binding}`); }, timers.host);
    const config = { gestures: { onTap: 'A', doubleTap: 'B' }, tappingTermMs: 220 };

    engine.handleKeyDown('r1c1', config);
    engine.handleKeyUp('r1c1');
    timers.advance(50);
    engine.handleKeyDown('r1c1', config);
    engine.handleKeyUp('r1c1');
    timers.advance(500);

    expect(captured.toasts).toEqual(['doubleTap:B']);
  });
});
