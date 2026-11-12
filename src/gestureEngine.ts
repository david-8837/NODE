import {
  GRID_MACRO_KEY_SLOTS,
  GRID_MACRO_ENCODER_SLOT,
  type GridMacroSlotId,
} from './deviceLayout';

export type GestureType = 'onTap' | 'doubleTap' | 'onHold' | 'tapHold';

export interface RecognizedGestureEvent {
  slot: GridMacroSlotId;
  gesture: GestureType;
  timestamp: number;
  source?: 'hardware' | 'simulation';
}

export interface RecognizedDialEvent {
  slot: typeof GRID_MACRO_ENCODER_SLOT;
  direction: 'cw' | 'ccw';
  timestamp: number;
  source?: 'hardware' | 'simulation';
}

export interface SlotGestureConfig {
  hasDoubleTap?: boolean;
  hasTapHold?: boolean;
  hasHold?: boolean;
  tappingTermMs?: number;
  holdThresholdMs?: number;
}

export interface GestureEngineOptions {
  now?: () => number;
  setTimeoutFn?: (callback: () => void, ms: number) => unknown;
  clearTimeoutFn?: (handle: unknown) => void;
  onGesture?: (event: RecognizedGestureEvent) => void;
  onDial?: (event: RecognizedDialEvent) => void;
}

const DEFAULT_TAPPING_TERM_MS = 180;
const DEFAULT_HOLD_THRESHOLD_MIN_MS = 300;

export const ALL_GRID_MACRO_SLOTS: readonly GridMacroSlotId[] = [
  ...GRID_MACRO_KEY_SLOTS,
  GRID_MACRO_ENCODER_SLOT,
] as const;

type SlotState =
  | 'IDLE'
  | 'PRESSED_1'
  | 'RELEASED_1_WAITING'
  | 'PRESSED_2'
  | 'HELD_1'
  | 'HELD_2';

interface InternalSlotState {
  state: SlotState;
  pressStartTime: number;
  releaseStartTime: number;
  holdTimer: unknown | null;
  doubleTapTimer: unknown | null;
  lastSource?: 'hardware' | 'simulation';
}

export class GestureEngine {
  private readonly now: () => number;
  private readonly setTimeoutFn: (callback: () => void, ms: number) => unknown;
  private readonly clearTimeoutFn: (handle: unknown) => void;
  private onGestureCallback?: (event: RecognizedGestureEvent) => void;
  private onDialCallback?: (event: RecognizedDialEvent) => void;

  private readonly configs = new Map<GridMacroSlotId, SlotGestureConfig>();
  private readonly slots = new Map<GridMacroSlotId, InternalSlotState>();

  constructor(options: GestureEngineOptions = {}) {
    this.now = options.now ?? (() => Date.now());
    this.setTimeoutFn =
      options.setTimeoutFn ??
      ((cb: () => void, ms: number) => setTimeout(cb, ms));
    this.clearTimeoutFn =
      options.clearTimeoutFn ??
      ((handle: unknown) => clearTimeout(handle as NodeJS.Timeout));
    this.onGestureCallback = options.onGesture;
    this.onDialCallback = options.onDial;

    this.initializeSlots();
  }

  private initializeSlots(): void {
    for (const slot of ALL_GRID_MACRO_SLOTS) {
      this.slots.set(slot, {
        state: 'IDLE',
        pressStartTime: 0,
        releaseStartTime: 0,
        holdTimer: null,
        doubleTapTimer: null,
      });
      this.configs.set(slot, {});
    }
  }

  public setOnGesture(callback: (event: RecognizedGestureEvent) => void): void {
    this.onGestureCallback = callback;
  }

  public setOnDial(callback: (event: RecognizedDialEvent) => void): void {
    this.onDialCallback = callback;
  }

  public configureSlot(slot: GridMacroSlotId, config: SlotGestureConfig): void {
    this.configs.set(slot, { ...config });
  }

  public configureAllSlots(
    configResolver: (slot: GridMacroSlotId) => SlotGestureConfig
  ): void {
    for (const slot of ALL_GRID_MACRO_SLOTS) {
      this.configs.set(slot, configResolver(slot));
    }
  }

  public getSlotConfig(slot: GridMacroSlotId): SlotGestureConfig {
    return this.configs.get(slot) || {};
  }

  private getEffectiveTappingTerm(slot: GridMacroSlotId): number {
    const config = this.getSlotConfig(slot);
    const term = config.tappingTermMs;
    return typeof term === 'number' && term > 0
      ? term
      : DEFAULT_TAPPING_TERM_MS;
  }

  private getEffectiveHoldThreshold(slot: GridMacroSlotId): number {
    const config = this.getSlotConfig(slot);
    if (typeof config.holdThresholdMs === 'number' && config.holdThresholdMs > 0) {
      return config.holdThresholdMs;
    }
    const tappingTerm = this.getEffectiveTappingTerm(slot);
    return Math.max(tappingTerm * 2, DEFAULT_HOLD_THRESHOLD_MIN_MS);
  }

  private clearSlotTimers(state: InternalSlotState): void {
    if (state.holdTimer !== null) {
      this.clearTimeoutFn(state.holdTimer);
      state.holdTimer = null;
    }
    if (state.doubleTapTimer !== null) {
      this.clearTimeoutFn(state.doubleTapTimer);
      state.doubleTapTimer = null;
    }
  }

  public buttonDown(
    slot: GridMacroSlotId,
    source?: 'hardware' | 'simulation'
  ): void {
    const state = this.slots.get(slot);
    if (!state) return;

    if (source) {
      state.lastSource = source;
    }

    const currentTime = this.now();
    const config = this.getSlotConfig(slot);
    const tappingTerm = this.getEffectiveTappingTerm(slot);
    const holdThreshold = this.getEffectiveHoldThreshold(slot);

    switch (state.state) {
      case 'IDLE': {
        state.state = 'PRESSED_1';
        state.pressStartTime = currentTime;

        // Start hold threshold timer if hold is possible
        state.holdTimer = this.setTimeoutFn(() => {
          this.onHoldThresholdExpired(slot);
        }, holdThreshold);
        break;
      }

      case 'RELEASED_1_WAITING': {
        // Second press arrived within the double-tap window!
        this.clearSlotTimers(state);
        const elapsedSinceRelease = currentTime - state.releaseStartTime;

        if (elapsedSinceRelease <= tappingTerm) {
          state.state = 'PRESSED_2';
          state.pressStartTime = currentTime;

          // If tapHold is configured, start timer to detect hold on the second tap
          if (config.hasTapHold) {
            state.holdTimer = this.setTimeoutFn(() => {
              this.onTapHoldThresholdExpired(slot);
            }, holdThreshold);
          }
        } else {
          // Window expired right as press happened, treat as fresh press 1
          this.emitGesture(slot, 'onTap', state.releaseStartTime);
          state.state = 'PRESSED_1';
          state.pressStartTime = currentTime;
          state.holdTimer = this.setTimeoutFn(() => {
            this.onHoldThresholdExpired(slot);
          }, holdThreshold);
        }
        break;
      }

      case 'PRESSED_1':
      case 'PRESSED_2':
      case 'HELD_1':
      case 'HELD_2':
        // Key is already down; ignore duplicate press events (e.g. bounce or OS repeat)
        break;
    }
  }

  public buttonUp(slot: GridMacroSlotId): void {
    const state = this.slots.get(slot);
    if (!state) return;

    const currentTime = this.now();
    const config = this.getSlotConfig(slot);
    const tappingTerm = this.getEffectiveTappingTerm(slot);

    switch (state.state) {
      case 'PRESSED_1': {
        this.clearSlotTimers(state);
        state.releaseStartTime = currentTime;

        const needsWaiting = Boolean(config.hasDoubleTap || config.hasTapHold);
        if (!needsWaiting) {
          // Zero-latency optimization: Neither double-tap nor tap-hold is configured,
          // so release immediately triggers single tap without waiting for timeout!
          state.state = 'IDLE';
          this.emitGesture(slot, 'onTap', currentTime);
        } else {
          state.state = 'RELEASED_1_WAITING';
          state.doubleTapTimer = this.setTimeoutFn(() => {
            this.onDoubleTapTimerExpired(slot);
          }, tappingTerm);
        }
        break;
      }

      case 'PRESSED_2': {
        // Second press was released before hold threshold -> confirm doubleTap!
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        this.emitGesture(slot, 'doubleTap', currentTime);
        break;
      }

      case 'HELD_1': {
        // Hold was already fired when threshold crossed; simply return to IDLE
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        break;
      }

      case 'HELD_2': {
        // Tap-Hold was already fired when threshold crossed; return to IDLE
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        break;
      }

      case 'RELEASED_1_WAITING':
      case 'IDLE':
        // Already released or idle; ignore duplicate release
        break;
    }
  }

  public dialRotate(
    direction: 'cw' | 'ccw',
    source?: 'hardware' | 'simulation'
  ): void {
    const timestamp = this.now();
    this.onDialCallback?.({
      slot: GRID_MACRO_ENCODER_SLOT,
      direction,
      timestamp,
      source: source || 'hardware',
    });
  }

  private onHoldThresholdExpired(slot: GridMacroSlotId): void {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'PRESSED_1') return;

    state.state = 'HELD_1';
    state.holdTimer = null;
    this.emitGesture(slot, 'onHold', this.now());
  }

  private onTapHoldThresholdExpired(slot: GridMacroSlotId): void {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'PRESSED_2') return;

    state.state = 'HELD_2';
    state.holdTimer = null;
    this.emitGesture(slot, 'tapHold', this.now());
  }

  private onDoubleTapTimerExpired(slot: GridMacroSlotId): void {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'RELEASED_1_WAITING') return;

    state.state = 'IDLE';
    state.doubleTapTimer = null;
    // Window expired without second press -> confirm onTap!
    this.emitGesture(slot, 'onTap', state.releaseStartTime);
  }

  private emitGesture(
    slot: GridMacroSlotId,
    gesture: GestureType,
    timestamp: number
  ): void {
    const slotState = this.slots.get(slot);
    this.onGestureCallback?.({
      slot,
      gesture,
      timestamp,
      source: slotState?.lastSource || 'hardware',
    });
  }

  public cancelSlot(slot: GridMacroSlotId): void {
    const state = this.slots.get(slot);
    if (state) {
      this.clearSlotTimers(state);
      state.state = 'IDLE';
    }
  }

  public resetAll(): void {
    for (const [, state] of this.slots) {
      this.clearSlotTimers(state);
      state.state = 'IDLE';
    }
  }

  public getSlotState(slot: GridMacroSlotId): SlotState {
    return this.slots.get(slot)?.state ?? 'IDLE';
  }
}
