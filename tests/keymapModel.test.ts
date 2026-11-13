import { describe, expect, it } from 'vitest';
import { BLANK_ENCODER_ACTIONS, formatEncoderShortLabel, getEncoderActions } from '../src/keymapModel';

describe('keymap model', () => {
  it('formats short encoder labels consistently', () => {
    expect(formatEncoderShortLabel('  ')).toBe('—');
    expect(formatEncoderShortLabel(' Play ')).toBe('pl...');
    expect(formatEncoderShortLabel('ABC')).toBe('ABC');
  });

  it('uses blank encoder actions only when none are assigned', () => {
    const assignment = { label: 'Dial', binding: 'blank', actionType: 'Basic input' as const };
    expect(getEncoderActions(assignment)).toBe(BLANK_ENCODER_ACTIONS);
    const actions = { ...BLANK_ENCODER_ACTIONS, cw: { label: 'Up', binding: 'volume-up' } };
    expect(getEncoderActions({ ...assignment, encoderActions: actions })).toBe(actions);
  });
});
