'use strict';

const { SLOT_INDEX_TO_SLOT_ID } = require('./hardwareProtocol.cjs');

const DEFAULT_TAPPING_TERM_MS = 180;
const DEFAULT_HOLD_THRESHOLD_MIN_MS = 300;

class AgentGestureEngine {
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now());
    this.setTimeoutFn = options.setTimeoutFn ?? ((cb, ms) => setTimeout(cb, ms));
    this.clearTimeoutFn = options.clearTimeoutFn ?? ((handle) => clearTimeout(handle));
    this.onGestureCallback = options.onGesture;
    this.onDialCallback = options.onDial;

    this.configs = new Map();
    this.slots = new Map();

    this.initializeSlots();
  }

  initializeSlots() {
    for (const slot of SLOT_INDEX_TO_SLOT_ID) {
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

  setOnGesture(callback) {
    this.onGestureCallback = callback;
  }

  setOnDial(callback) {
    this.onDialCallback = callback;
  }

  configureSlot(slot, config) {
    this.configs.set(slot, { ...config });
  }

  configureAllSlots(configResolver) {
    for (const slot of SLOT_INDEX_TO_SLOT_ID) {
      this.configs.set(slot, configResolver(slot));
    }
  }

  getSlotConfig(slot) {
    return this.configs.get(slot) || {};
  }

  getEffectiveTappingTerm(slot) {
    const config = this.getSlotConfig(slot);
    const term = config.tappingTermMs;
    return typeof term === 'number' && term > 0 ? term : DEFAULT_TAPPING_TERM_MS;
  }

  getEffectiveHoldThreshold(slot) {
    const config = this.getSlotConfig(slot);
    if (typeof config.holdThresholdMs === 'number' && config.holdThresholdMs > 0) {
      return config.holdThresholdMs;
    }
    const tappingTerm = this.getEffectiveTappingTerm(slot);
    return Math.max(tappingTerm * 2, DEFAULT_HOLD_THRESHOLD_MIN_MS);
  }

  clearSlotTimers(state) {
    if (state.holdTimer !== null) {
      this.clearTimeoutFn(state.holdTimer);
      state.holdTimer = null;
    }
    if (state.doubleTapTimer !== null) {
      this.clearTimeoutFn(state.doubleTapTimer);
      state.doubleTapTimer = null;
    }
  }

  buttonDown(slot, source = 'hardware') {
    const state = this.slots.get(slot);
    if (!state) return;

    state.lastSource = source;
    const currentTime = this.now();
    const config = this.getSlotConfig(slot);
    const tappingTerm = this.getEffectiveTappingTerm(slot);
    const holdThreshold = this.getEffectiveHoldThreshold(slot);

    switch (state.state) {
      case 'IDLE': {
        state.state = 'PRESSED_1';
        state.pressStartTime = currentTime;

        state.holdTimer = this.setTimeoutFn(() => {
          this.onHoldThresholdExpired(slot);
        }, holdThreshold);
        break;
      }

      case 'RELEASED_1_WAITING': {
        this.clearSlotTimers(state);
        const elapsedSinceRelease = currentTime - state.releaseStartTime;

        if (elapsedSinceRelease <= tappingTerm) {
          state.state = 'PRESSED_2';
          state.pressStartTime = currentTime;

          if (config.hasTapHold) {
            state.holdTimer = this.setTimeoutFn(() => {
              this.onTapHoldThresholdExpired(slot);
            }, holdThreshold);
          }
        } else {
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
        break;
    }
  }

  buttonUp(slot) {
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
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        this.emitGesture(slot, 'doubleTap', currentTime);
        break;
      }

      case 'HELD_1': {
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        break;
      }

      case 'HELD_2': {
        this.clearSlotTimers(state);
        state.state = 'IDLE';
        break;
      }

      case 'RELEASED_1_WAITING':
      case 'IDLE':
        break;
    }
  }

  dialRotate(direction, source = 'hardware') {
    const timestamp = this.now();
    this.onDialCallback?.({
      slot: 'dial-tl',
      direction,
      timestamp,
      source,
    });
  }

  onHoldThresholdExpired(slot) {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'PRESSED_1') return;

    state.state = 'HELD_1';
    state.holdTimer = null;
    this.emitGesture(slot, 'onHold', this.now());
  }

  onTapHoldThresholdExpired(slot) {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'PRESSED_2') return;

    state.state = 'HELD_2';
    state.holdTimer = null;
    this.emitGesture(slot, 'tapHold', this.now());
  }

  onDoubleTapTimerExpired(slot) {
    const state = this.slots.get(slot);
    if (!state || state.state !== 'RELEASED_1_WAITING') return;

    state.state = 'IDLE';
    state.doubleTapTimer = null;
    this.emitGesture(slot, 'onTap', state.releaseStartTime);
  }

  emitGesture(slot, gesture, timestamp) {
    const slotState = this.slots.get(slot);
    this.onGestureCallback?.({
      slot,
      gesture,
      timestamp,
      source: slotState?.lastSource || 'hardware',
    });
  }

  cancelSlot(slot) {
    const state = this.slots.get(slot);
    if (state) {
      this.clearSlotTimers(state);
      state.state = 'IDLE';
    }
  }

  resetAll() {
    for (const [, state] of this.slots) {
      this.clearSlotTimers(state);
      state.state = 'IDLE';
    }
  }

  getSlotState(slot) {
    return this.slots.get(slot)?.state ?? 'IDLE';
  }
}

module.exports = {
  AgentGestureEngine,
  DEFAULT_TAPPING_TERM_MS,
  DEFAULT_HOLD_THRESHOLD_MIN_MS,
};
