import {
  GRID_MACRO_KEY_SLOTS,
  GRID_MACRO_ENCODER_SLOT,
  type GridMacroSlotId,
} from './deviceLayout';

export const ALL_DEBOUNCE_SLOTS: readonly GridMacroSlotId[] = [
  ...GRID_MACRO_KEY_SLOTS,
  GRID_MACRO_ENCODER_SLOT,
] as const;

export type DebounceAlgorithm = 'symmetric_defer' | 'eager_lockout';

export interface RawInputTransition {
  slot: GridMacroSlotId;
  rawState: boolean; // true = down/pressed, false = up/released
  timestamp: number;
}

export interface ValidatedButtonEvent {
  slot: GridMacroSlotId;
  type: 'press' | 'release';
  timestamp: number;
  source: 'hardware' | 'simulation';
}

export interface DiagnosticLogEntry {
  category: 'RAW_GPIO' | 'VALIDATED_BUTTON' | 'GESTURE' | 'HID_EXECUTION';
  slot?: GridMacroSlotId;
  detail: string;
  timestamp: number;
}

export interface DebounceEngineOptions {
  debounceIntervalMs?: number; // Default 10ms, configurable up to 25ms
  algorithm?: DebounceAlgorithm; // 'symmetric_defer' (default) or 'eager_lockout'
  now?: () => number;
  setTimeoutFn?: (callback: () => void, ms: number) => unknown;
  clearTimeoutFn?: (handle: unknown) => void;
  onPress?: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void;
  onRelease?: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void;
  onRawTransition?: (transition: RawInputTransition) => void;
  onValidatedEvent?: (event: ValidatedButtonEvent) => void;
  onDiagnosticLog?: (entry: DiagnosticLogEntry) => void;
  maxLogEntries?: number;
}

interface PerSlotDebounceState {
  debouncedState: boolean; // Current validated stable state
  lastRawState: boolean;   // Most recent instantaneous raw state
  lastRawChangeTime: number;
  lastValidatedTime: number;
  timerHandle: unknown | null;
  pendingTargetState: boolean | null;
  source: 'hardware' | 'simulation';
}

export const DEFAULT_DEBOUNCE_INTERVAL_MS = 10;
export const MIN_DEBOUNCE_INTERVAL_MS = 1;
export const MAX_DEBOUNCE_INTERVAL_MS = 50;

/**
 * DebounceEngine
 *
 * Implements a non-blocking, timestamp-based debouncing engine for all
 * RP2040 macropad physical buttons (GP0..GP8 matrix + GP11 encoder push switch).
 *
 * Enforces the strict processing pipeline:
 * Physical GPIO -> Debounce Engine -> Clean Press/Release Events -> Gesture Engine -> Action Execution -> USB HID
 */
export class DebounceEngine {
  private debounceIntervalMs: number;
  private algorithm: DebounceAlgorithm;
  private readonly now: () => number;
  private readonly setTimeoutFn: (callback: () => void, ms: number) => unknown;
  private readonly clearTimeoutFn: (handle: unknown) => void;

  private onPressCallback?: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void;
  private onReleaseCallback?: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void;
  private onRawTransitionCallback?: (transition: RawInputTransition) => void;
  private onValidatedEventCallback?: (event: ValidatedButtonEvent) => void;
  private onDiagnosticLogCallback?: (entry: DiagnosticLogEntry) => void;

  private readonly slots = new Map<GridMacroSlotId, PerSlotDebounceState>();
  private readonly diagnosticLogs: DiagnosticLogEntry[] = [];
  private readonly maxLogEntries: number;

  constructor(options: DebounceEngineOptions = {}) {
    this.debounceIntervalMs = Math.max(
      MIN_DEBOUNCE_INTERVAL_MS,
      Math.min(MAX_DEBOUNCE_INTERVAL_MS, options.debounceIntervalMs ?? DEFAULT_DEBOUNCE_INTERVAL_MS)
    );
    this.algorithm = options.algorithm ?? 'symmetric_defer';
    this.now = options.now ?? (() => Date.now());
    this.setTimeoutFn =
      options.setTimeoutFn ??
      ((cb: () => void, ms: number) => setTimeout(cb, ms));
    this.clearTimeoutFn =
      options.clearTimeoutFn ??
      ((handle: unknown) => clearTimeout(handle as NodeJS.Timeout));

    this.onPressCallback = options.onPress;
    this.onReleaseCallback = options.onRelease;
    this.onRawTransitionCallback = options.onRawTransition;
    this.onValidatedEventCallback = options.onValidatedEvent;
    this.onDiagnosticLogCallback = options.onDiagnosticLog;
    this.maxLogEntries = options.maxLogEntries ?? 500;

    this.initializeSlots();
  }

  private initializeSlots(): void {
    for (const slot of ALL_DEBOUNCE_SLOTS) {
      this.slots.set(slot, {
        debouncedState: false,
        lastRawState: false,
        lastRawChangeTime: 0,
        lastValidatedTime: 0,
        timerHandle: null,
        pendingTargetState: null,
        source: 'hardware',
      });
    }
  }

  public setDebounceInterval(intervalMs: number): void {
    this.debounceIntervalMs = Math.max(
      MIN_DEBOUNCE_INTERVAL_MS,
      Math.min(MAX_DEBOUNCE_INTERVAL_MS, intervalMs)
    );
  }

  public getDebounceInterval(): number {
    return this.debounceIntervalMs;
  }

  public setAlgorithm(algo: DebounceAlgorithm): void {
    this.algorithm = algo;
  }

  public getAlgorithm(): DebounceAlgorithm {
    return this.algorithm;
  }

  public setOnPress(callback: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void): void {
    this.onPressCallback = callback;
  }

  public setOnRelease(callback: (slot: GridMacroSlotId, timestamp: number, source: 'hardware' | 'simulation') => void): void {
    this.onReleaseCallback = callback;
  }

  public setOnRawTransition(callback: (transition: RawInputTransition) => void): void {
    this.onRawTransitionCallback = callback;
  }

  public setOnValidatedEvent(callback: (event: ValidatedButtonEvent) => void): void {
    this.onValidatedEventCallback = callback;
  }

  public setOnDiagnosticLog(callback: (entry: DiagnosticLogEntry) => void): void {
    this.onDiagnosticLogCallback = callback;
  }

  /**
   * Primary entry point for raw button transitions from hardware GPIO or pointer events.
   * Returns true if a state transition was immediately committed, false if deferred or filtered.
   */
  public handleRawInput(
    slot: GridMacroSlotId,
    isDown: boolean,
    timestamp?: number,
    source: 'hardware' | 'simulation' = 'hardware'
  ): boolean {
    const slotState = this.slots.get(slot);
    if (!slotState) return false;

    const currentTime = typeof timestamp === 'number' ? timestamp : this.now();
    slotState.source = source;

    // Log raw GPIO transition
    this.logDiagnostic({
      category: 'RAW_GPIO',
      slot,
      detail: `Raw pin transition: ${isDown ? 'LOW (pressed)' : 'HIGH (released)'} [${source}]`,
      timestamp: currentTime,
    });
    this.onRawTransitionCallback?.({
      slot,
      rawState: isDown,
      timestamp: currentTime,
    });

    slotState.lastRawState = isDown;
    slotState.lastRawChangeTime = currentTime;

    if (this.algorithm === 'eager_lockout') {
      return this.handleEagerLockout(slot, slotState, isDown, currentTime, source);
    }

    return this.handleSymmetricDefer(slot, slotState, isDown, currentTime, source);
  }

  /**
   * Symmetric deferred debouncing: waits for signal to be continuously stable
   * for debounceIntervalMs before committing either press or release.
   */
  private handleSymmetricDefer(
    slot: GridMacroSlotId,
    slotState: PerSlotDebounceState,
    isDown: boolean,
    currentTime: number,
    source: 'hardware' | 'simulation'
  ): boolean {
    // If raw state already matches validated debounced state, clear any pending flip
    if (isDown === slotState.debouncedState) {
      if (slotState.timerHandle !== null) {
        this.clearTimeoutFn(slotState.timerHandle);
        slotState.timerHandle = null;
        slotState.pendingTargetState = null;
      }
      return false;
    }

    // Cancel any prior timer because raw state changed again (contact chatter)
    if (slotState.timerHandle !== null) {
      this.clearTimeoutFn(slotState.timerHandle);
      slotState.timerHandle = null;
    }

    slotState.pendingTargetState = isDown;

    // Schedule validation after debounceIntervalMs
    slotState.timerHandle = this.setTimeoutFn(() => {
      this.onDebounceTimerExpired(slot);
    }, this.debounceIntervalMs);

    return false;
  }

  /**
   * Eager press with lockout debouncing: immediately commits press on first edge,
   * then locks out subsequent transitions for debounceIntervalMs.
   */
  private handleEagerLockout(
    slot: GridMacroSlotId,
    slotState: PerSlotDebounceState,
    isDown: boolean,
    currentTime: number,
    source: 'hardware' | 'simulation'
  ): boolean {
    const elapsedSinceLastValidation = currentTime - slotState.lastValidatedTime;

    if (isDown && !slotState.debouncedState) {
      // Eager press if outside lockout
      if (elapsedSinceLastValidation >= this.debounceIntervalMs || slotState.lastValidatedTime === 0) {
        this.commitStateChange(slot, slotState, true, currentTime, source);
        return true;
      }
    } else if (!isDown && slotState.debouncedState) {
      // Release is deferred to filter release bounce
      if (slotState.timerHandle !== null) {
        this.clearTimeoutFn(slotState.timerHandle);
        slotState.timerHandle = null;
      }
      slotState.pendingTargetState = false;
      slotState.timerHandle = this.setTimeoutFn(() => {
        this.onDebounceTimerExpired(slot);
      }, this.debounceIntervalMs);
    }

    return false;
  }

  /**
   * Called when debounce timer expires without interruption from bounce chatter.
   */
  private onDebounceTimerExpired(slot: GridMacroSlotId): void {
    const slotState = this.slots.get(slot);
    if (!slotState) return;

    slotState.timerHandle = null;
    const targetState = slotState.pendingTargetState;
    slotState.pendingTargetState = null;

    if (targetState === null) return;

    // Verify raw state has stayed at targetState for at least debounceIntervalMs
    const currentTime = this.now();
    const elapsed = currentTime - slotState.lastRawChangeTime;

    if (slotState.lastRawState === targetState && elapsed >= this.debounceIntervalMs) {
      if (slotState.debouncedState !== targetState) {
        this.commitStateChange(slot, slotState, targetState, currentTime, slotState.source);
      }
    } else if (slotState.lastRawState === targetState) {
      // Re-arm for remaining time if not yet fully elapsed
      const remaining = Math.max(1, this.debounceIntervalMs - elapsed);
      slotState.pendingTargetState = targetState;
      slotState.timerHandle = this.setTimeoutFn(() => {
        this.onDebounceTimerExpired(slot);
      }, remaining);
    }
  }

  private commitStateChange(
    slot: GridMacroSlotId,
    slotState: PerSlotDebounceState,
    newState: boolean,
    currentTime: number,
    source: 'hardware' | 'simulation'
  ): void {
    slotState.debouncedState = newState;
    slotState.lastValidatedTime = currentTime;

    const eventType: 'press' | 'release' = newState ? 'press' : 'release';

    this.logDiagnostic({
      category: 'VALIDATED_BUTTON',
      slot,
      detail: `Validated event: ${eventType.toUpperCase()} after ${this.debounceIntervalMs}ms debounce stability [${source}]`,
      timestamp: currentTime,
    });

    const event: ValidatedButtonEvent = {
      slot,
      type: eventType,
      timestamp: currentTime,
      source,
    };
    this.onValidatedEventCallback?.(event);

    if (newState) {
      this.onPressCallback?.(slot, currentTime, source);
    } else {
      this.onReleaseCallback?.(slot, currentTime, source);
    }
  }

  /**
   * Get validated debounced state of a given slot (true = pressed, false = released).
   */
  public getSlotDebouncedState(slot: GridMacroSlotId): boolean {
    return this.slots.get(slot)?.debouncedState ?? false;
  }

  /**
   * Get latest raw state of a given slot before debouncing.
   */
  public getSlotRawState(slot: GridMacroSlotId): boolean {
    return this.slots.get(slot)?.lastRawState ?? false;
  }

  /**
   * Flush any pending debounce timers immediately (e.g. for testing or disconnect).
   */
  public flushPending(): void {
    for (const [slot, slotState] of this.slots) {
      if (slotState.timerHandle !== null) {
        this.clearTimeoutFn(slotState.timerHandle);
        slotState.timerHandle = null;
        if (slotState.pendingTargetState !== null && slotState.pendingTargetState !== slotState.debouncedState) {
          this.commitStateChange(
            slot,
            slotState,
            slotState.pendingTargetState,
            this.now(),
            slotState.source
          );
        }
        slotState.pendingTargetState = null;
      }
    }
  }

  /**
   * Reset all per-slot debouncer states to IDLE (false).
   */
  public reset(): void {
    for (const [, slotState] of this.slots) {
      if (slotState.timerHandle !== null) {
        this.clearTimeoutFn(slotState.timerHandle);
        slotState.timerHandle = null;
      }
      slotState.debouncedState = false;
      slotState.lastRawState = false;
      slotState.lastRawChangeTime = 0;
      slotState.lastValidatedTime = 0;
      slotState.pendingTargetState = null;
    }
  }

  // Diagnostic logging methods
  public logDiagnostic(entry: DiagnosticLogEntry): void {
    this.diagnosticLogs.push(entry);
    if (this.diagnosticLogs.length > this.maxLogEntries) {
      this.diagnosticLogs.shift();
    }
    this.onDiagnosticLogCallback?.(entry);
  }

  public getDiagnosticLogs(category?: DiagnosticLogEntry['category']): readonly DiagnosticLogEntry[] {
    if (category) {
      return this.diagnosticLogs.filter((entry) => entry.category === category);
    }
    return this.diagnosticLogs;
  }

  public clearDiagnosticLogs(): void {
    this.diagnosticLogs.length = 0;
  }
}
