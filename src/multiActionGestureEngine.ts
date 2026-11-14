export type MultiActionGestureKind = 'onTap' | 'doubleTap' | 'onHold' | 'tapHold';

export interface MultiActionGestureBindings {
  onTap?: string;
  doubleTap?: string;
  onHold?: string;
  tapHold?: string;
}

export interface MultiActionGestureConfig {
  gestures: MultiActionGestureBindings;
  tappingTermMs?: number;
  holdThresholdMs?: number;
}

export interface MultiActionTimerHost {
  setTimeout: (callback: () => void, ms: number) => ReturnType<typeof globalThis.setTimeout>;
  clearTimeout: (handle: ReturnType<typeof globalThis.setTimeout>) => void;
  now?: () => number;
}

export interface ResolvedGestureEvent {
  slotId: string;
  gesture: MultiActionGestureKind;
  binding: string;
}

export const DEFAULT_TAPPING_TERM_MS = 220;
export const MIN_TAPPING_TERM_MS = 50;
export const MAX_TAPPING_TERM_MS = 2000;

interface SlotGestureState {
  phase: 'idle' | 'first_press' | 'wait_second_press' | 'second_press' | 'resolved_until_release';
  config: MultiActionGestureConfig;
  tappingTermMs: number;
  holdThresholdMs: number;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
}

function clampTermMs(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(MIN_TAPPING_TERM_MS, Math.min(MAX_TAPPING_TERM_MS, Math.round(value)));
}

function normalizeBinding(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function hasConfiguredGesture(
  gestures: MultiActionGestureBindings | undefined,
  kind: MultiActionGestureKind,
): boolean {
  if (!gestures) return false;
  return normalizeBinding(gestures[kind]).length > 0;
}

export class MultiActionGestureEngine {
  private readonly slots = new Map<string, SlotGestureState>();
  private readonly timerHost: MultiActionTimerHost;
  private readonly onGesture: (event: ResolvedGestureEvent) => void;

  public constructor(
    onGesture: (event: ResolvedGestureEvent) => void,
    timerHost: MultiActionTimerHost = {
      setTimeout: (cb, ms) => globalThis.setTimeout(cb, ms),
      clearTimeout: (id) => globalThis.clearTimeout(id),
      now: () => Date.now(),
    },
  ) {
    this.onGesture = onGesture;
    this.timerHost = timerHost;
  }

  private clearSlotTimer(state: SlotGestureState): void {
    if (state.timer !== null) {
      this.timerHost.clearTimeout(state.timer);
      state.timer = null;
    }
  }

  private emitIfConfigured(
    slotId: string,
    gestures: MultiActionGestureBindings,
    gesture: MultiActionGestureKind,
  ): boolean {
    const binding = normalizeBinding(gestures[gesture]);
    if (!binding) return false;
    this.onGesture({ slotId, gesture, binding });
    return true;
  }

  public handleKeyDown(slotId: string, config: MultiActionGestureConfig): void {
    const tappingTermMs = clampTermMs(config.tappingTermMs, DEFAULT_TAPPING_TERM_MS);
    const holdThresholdMs = clampTermMs(config.holdThresholdMs ?? config.tappingTermMs, tappingTermMs);
    const existing = this.slots.get(slotId);

    // Ignore duplicate key-down while already pressed
    if (
      existing &&
      (existing.phase === 'first_press' ||
        existing.phase === 'second_press' ||
        existing.phase === 'resolved_until_release')
    ) {
      return;
    }

    // Second press within tapping term after first tap release
    if (existing && existing.phase === 'wait_second_press') {
      this.clearSlotTimer(existing);
      const gestures = existing.config.gestures;
      const hasTapHold = hasConfiguredGesture(gestures, 'tapHold');
      const hasDoubleTap = hasConfiguredGesture(gestures, 'doubleTap');

      if (!hasTapHold && hasDoubleTap) {
        // Double tap is unambiguous immediately on second press if tapHold is not configured
        existing.phase = 'resolved_until_release';
        this.emitIfConfigured(slotId, gestures, 'doubleTap');
        return;
      }

      existing.phase = 'second_press';
      existing.timer = this.timerHost.setTimeout(() => {
        existing.timer = null;
        if (existing.phase !== 'second_press') return;
        existing.phase = 'resolved_until_release';
        if (!this.emitIfConfigured(slotId, gestures, 'tapHold')) {
          this.emitIfConfigured(slotId, gestures, 'doubleTap');
        }
      }, existing.holdThresholdMs);
      return;
    }

    // Fresh first press
    const state: SlotGestureState = {
      phase: 'first_press',
      config,
      tappingTermMs,
      holdThresholdMs,
      timer: null,
    };
    this.slots.set(slotId, state);

    const gestures = config.gestures;
    const hasHold = hasConfiguredGesture(gestures, 'onHold');
    const hasDouble = hasConfiguredGesture(gestures, 'doubleTap');
    const hasTapHold = hasConfiguredGesture(gestures, 'tapHold');

    // If ONLY onTap is configured, wait for release or hold based on whether onHold exists.
    if (hasHold || hasDouble || hasTapHold) {
      state.timer = this.timerHost.setTimeout(() => {
        state.timer = null;
        if (state.phase !== 'first_press') return;
        if (hasHold) {
          state.phase = 'resolved_until_release';
          this.emitIfConfigured(slotId, gestures, 'onHold');
        }
      }, holdThresholdMs);
    }
  }

  public handleKeyUp(slotId: string): void {
    const state = this.slots.get(slotId);
    if (!state) return;

    if (state.phase === 'resolved_until_release') {
      this.clearSlotTimer(state);
      this.slots.delete(slotId);
      return;
    }

    const { gestures } = state.config;

    if (state.phase === 'first_press') {
      this.clearSlotTimer(state);
      const hasDouble = hasConfiguredGesture(gestures, 'doubleTap');
      const hasTapHold = hasConfiguredGesture(gestures, 'tapHold');

      // If doubleTap or tapHold is configured, do NOT fire onTap prematurely:
      // wait tappingTermMs to see if a second press starts.
      if (hasDouble || hasTapHold) {
        state.phase = 'wait_second_press';
        state.timer = this.timerHost.setTimeout(() => {
          state.timer = null;
          if (state.phase !== 'wait_second_press') return;
          this.slots.delete(slotId);
          this.emitIfConfigured(slotId, gestures, 'onTap');
        }, state.tappingTermMs);
        return;
      }

      // Neither doubleTap nor tapHold is configured: fire onTap immediately on release
      this.slots.delete(slotId);
      this.emitIfConfigured(slotId, gestures, 'onTap');
      return;
    }

    if (state.phase === 'second_press') {
      this.clearSlotTimer(state);
      this.slots.delete(slotId);
      // Released second press before holdThresholdMs -> doubleTap (or fallback to onTap)
      if (!this.emitIfConfigured(slotId, gestures, 'doubleTap')) {
        this.emitIfConfigured(slotId, gestures, 'onTap');
      }
    }
  }

  public cancelSlot(slotId: string): void {
    const state = this.slots.get(slotId);
    if (!state) return;
    this.clearSlotTimer(state);
    this.slots.delete(slotId);
  }

  public cancelAll(): void {
    for (const state of this.slots.values()) {
      this.clearSlotTimer(state);
    }
    this.slots.clear();
  }
}
