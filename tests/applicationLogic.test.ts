import { describe, it, expect } from 'vitest';
import { validateProfile } from '../src/profileValidator';
import { parseShortcutToVK } from '../native-executor';

describe('Application Logic: Profile Validation & Sanitization', () => {
  it('should accept and sanitize a valid profile', () => {
    const rawProfile = {
      id: 'test-profile-1',
      name: 'Custom OBS Studio',
      layers: [
        {
          r1c1: { label: 'Rec', binding: 'Ctrl+Shift+R' },
          r1c2: { label: 'Stream', binding: 'Ctrl+Shift+S' },
        },
      ],
    };

    const result = validateProfile(rawProfile);
    expect(result.valid).toBe(true);
    expect(result.profile).toBeDefined();
    expect(result.profile?.name).toBe('Custom OBS Studio');
    expect(result.profile?.layers[0].r1c1.binding).toBe('Ctrl+Shift+R');
    expect(result.profile?.layers[0]['dial-tl'].encoderActions?.cw.binding).toBe('volume +');
  });

  it('should reject profile with missing name', () => {
    const invalid = { id: 'bad-1', name: '', layers: [{}] };
    const result = validateProfile(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('non-empty name');
  });

  it('should reject profile with missing or empty layers array', () => {
    const invalid = { id: 'bad-2', name: 'No Layers', layers: [] };
    const result = validateProfile(invalid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least one layer');
  });

  it('should sanitize malformed layer entries without crashing', () => {
    const malformed = {
      name: 'Corrupt Layer Test',
      layers: [
        {
          r1c1: null,
          r2c2: { label: 12345, binding: false },
        },
      ],
    };

    const result = validateProfile(malformed);
    expect(result.valid).toBe(true);
    expect(result.profile?.layers[0].r1c1.label).toBe('');
    expect(result.profile?.layers[0].r2c2.label).toBe('12345');
  });

  it.each(['not-a-number', Number.NaN, Number.POSITIVE_INFINITY, 0.5, true])(
    'should reject a non-finite, non-integer, or non-numeric active layer index (%s)',
    (activeLayerIndex) => {
      const result = validateProfile({
        name: 'Invalid active layer',
        activeLayerIndex,
        layers: [{}],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('activeLayerIndex');
    }
  );

  it('should clamp an integer active layer index into the available layer range', () => {
    const result = validateProfile({
      name: 'Clamped active layer',
      activeLayerIndex: 9,
      layers: [{}, {}],
    });

    expect(result.valid).toBe(true);
    expect(result.profile?.activeLayerIndex).toBe(1);
  });

  it('should reject an array where a layer object is required', () => {
    const result = validateProfile({ name: 'Array layer', layers: [[]] });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Layer 0 is invalid');
  });
});

describe('Application Logic: Key Mapping & Virtual-Key Parsing', () => {
  it('should correctly parse standard combinations into Windows VK codes', () => {
    const codes = parseShortcutToVK('Ctrl+Shift+Esc');
    expect(codes).toEqual([0x11, 0x10, 0x1b]); // Ctrl, Shift, Esc
  });

  it('should correctly parse Windows Power key combinations', () => {
    const winX = parseShortcutToVK('Win+X');
    expect(winX).toEqual([0x5b, 88]); // Win, 'X' (88)

    const winShiftS = parseShortcutToVK('Win+Shift+S');
    expect(winShiftS).toEqual([0x5b, 0x10, 83]); // Win, Shift, 'S' (83)
  });

  it('should correctly map special keys like Tilde, Backslash, and Function keys', () => {
    const tilde = parseShortcutToVK('Ctrl+Tilde');
    expect(tilde).toEqual([0x11, 0xc0]);

    const fKey = parseShortcutToVK('F5');
    expect(fKey).toEqual([0x74]);
  });

  it('should correctly recognize media keywords', () => {
    expect(parseShortcutToVK('volume +')).toEqual([0xaf]);
    expect(parseShortcutToVK('vol-')).toEqual([0xae]);
    expect(parseShortcutToVK('mute')).toEqual([0xad]);
    expect(parseShortcutToVK('play')).toEqual([0xb3]);
  });

  it('should gracefully handle empty or invalid key strings', () => {
    expect(parseShortcutToVK('')).toEqual([]);
    expect(parseShortcutToVK('???unknown???')).toEqual([]);
  });
});

