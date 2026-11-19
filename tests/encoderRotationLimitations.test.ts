import { describe, it, expect } from 'vitest';
import {
  isActionAllowedOnEncoderRotation,
  ROTARY_PAIRS,
  formatEncoderShortLabel,
} from '../src/presetLibrary';

describe('Rotary encoder rotation limitations and guardrails', () => {
  it('disallows multi-actions on rotary rotation (CW / CCW)', () => {
    const multiActionByKind = {
      execution: { kind: 'multi', gestures: { tap: 'Ctrl + C' } },
    };
    const multiActionByType = {
      actionType: 'Multi-step action',
      binding: 'Copy & Paste Sequence',
    };

    expect(isActionAllowedOnEncoderRotation(multiActionByKind)).toEqual({
      allowed: false,
      reason: 'Multi-actions cannot be assigned to rotary rotation (CW/CCW)',
    });
    expect(isActionAllowedOnEncoderRotation(multiActionByType)).toEqual({
      allowed: false,
      reason: 'Multi-actions cannot be assigned to rotary rotation (CW/CCW)',
    });
  });

  it('disallows smart actions (apps, scripts, text paste) on rotary rotation', () => {
    const appAction = {
      execution: { kind: 'smart', actionType: 'App', value: 'Spotify' },
    };
    const textAction = {
      execution: { kind: 'smart', actionType: 'Text', value: 'My long string' },
    };
    const smartByType = {
      actionType: 'Smart Action',
      binding: 'Launch Terminal',
    };

    expect(isActionAllowedOnEncoderRotation(appAction)).toEqual({
      allowed: false,
      reason: 'Smart actions (Apps, text blocks, commands) cannot be assigned to rotary rotation (CW/CCW)',
    });
    expect(isActionAllowedOnEncoderRotation(textAction)).toEqual({
      allowed: false,
      reason: 'Smart actions (Apps, text blocks, commands) cannot be assigned to rotary rotation (CW/CCW)',
    });
    expect(isActionAllowedOnEncoderRotation(smartByType)).toEqual({
      allowed: false,
      reason: 'Smart actions cannot be assigned to rotary rotation (CW/CCW)',
    });
  });

  it('disallows momentary layer switches (MO) on rotary rotation', () => {
    const momentaryLayer = {
      binding: 'MO(2)',
    };
    expect(isActionAllowedOnEncoderRotation(momentaryLayer)).toEqual({
      allowed: false,
      reason: 'Momentary layer switch (MO) requires holding a key down and cannot be used on rotation',
    });
  });

  it('allows single atomic keystrokes, media keys, shortcuts, and navigation', () => {
    const volumeUp = {
      actionType: 'Basic input',
      binding: 'Volume Up',
    };
    const shortcut = {
      actionType: 'Shortcut',
      binding: 'Ctrl + Tab',
      execution: { kind: 'shortcut', value: 'Ctrl + Tab' },
    };
    const undo = {
      actionType: 'Shortcut',
      binding: 'Ctrl + Z',
    };

    expect(isActionAllowedOnEncoderRotation(volumeUp).allowed).toBe(true);
    expect(isActionAllowedOnEncoderRotation(shortcut).allowed).toBe(true);
    expect(isActionAllowedOnEncoderRotation(undo).allowed).toBe(true);
  });

  it('provides bidirectional smart pairs for common dial rotation actions', () => {
    expect(ROTARY_PAIRS['volume up']).toBe('Volume Down');
    expect(ROTARY_PAIRS['volume down']).toBe('Volume Up');
    expect(ROTARY_PAIRS['zoom in']).toBe('Zoom Out');
    expect(ROTARY_PAIRS['zoom out']).toBe('Zoom In');
    expect(ROTARY_PAIRS['redo']).toBe('Undo');
    expect(ROTARY_PAIRS['undo']).toBe('Redo');
    expect(ROTARY_PAIRS['next tab']).toBe('Prev Tab');
    expect(ROTARY_PAIRS['scroll up']).toBe('Scroll Down');
    expect(ROTARY_PAIRS['wheel up']).toBe('Wheel Down');
    expect(ROTARY_PAIRS['arrow up']).toBe('Arrow Down');
    expect(ROTARY_PAIRS['page up']).toBe('Page Down');
  });

  it('disallows mouse click buttons on rotary rotation', () => {
    const mouseClicks = ['left click', 'right click', 'middle click', 'mouse 4', 'mouse 5'];
    for (const click of mouseClicks) {
      expect(isActionAllowedOnEncoderRotation({ binding: click })).toEqual({
        allowed: false,
        reason: 'Mouse click buttons cannot be assigned to rotary rotation (CW/CCW). Assign to Keys 1–9 or Dial Press instead.',
      });
    }
  });

  it('formats short dial labels correctly for paired actions', () => {
    expect(formatEncoderShortLabel('vol')).toBe('vol');
    expect(formatEncoderShortLabel('')).toBe('—');
    expect(formatEncoderShortLabel('Volume Up')).toBe('vo...');
  });
});
