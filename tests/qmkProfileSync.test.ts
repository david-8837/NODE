import { describe, expect, it } from 'vitest';
import { actionToViaKeycode } from '../src/qmkViaBridge';
import {
  buildViaConfiguration,
  decodeViaKeycode,
  decodeViaSnapshotToProfile,
  isProfileKeymapBlank,
} from '../src/qmkProfileSync';

const blankKey = { label: '', binding: 'blank', actionType: 'Basic input' };

function oneLayer(overrides: Record<string, unknown> = {}) {
  return {
    layers: [{
      r1c1: { label: 'Save', binding: 'Save (Ctrl + S)', actionType: 'Shortcut' },
      r1c2: { label: '⌘B', binding: '⌘B', actionType: 'Shortcut' },
      r1c3: blankKey,
      r2c1: { label: 'Volume', binding: 'volume +', actionType: 'Shortcut' },
      'dial-tl': {
        encoderActions: {
          cw: { label: 'next', binding: 'next track' },
          press: { label: 'play', binding: 'play' },
          ccw: { label: 'down', binding: 'Page Down' },
        },
      },
      ...overrides,
    }],
  };
}

describe('QMK profile-to-VIA configuration', () => {
  it('converts keyboard chords, platform symbols, media keys, blanks, and encoder actions', () => {
    const { config, warnings } = buildViaConfiguration(oneLayer(), 'mac');
    expect(warnings).toEqual([]);
    expect(config.layers[0].keys).toMatchObject({
      r1c1: { t: 'keys', k: ['CONTROL', 'S'] },
      r1c2: { t: 'keys', k: ['GUI', 'B'] },
      r1c3: { t: 'none' },
      r2c1: { t: 'media', c: 'VOLUME_INCREMENT' },
    });
    expect(config.layers[0].enc).toEqual({
      cw: { t: 'media', c: 'SCAN_NEXT_TRACK' },
      press: { t: 'media', c: 'PLAY_PAUSE' },
      ccw: { t: 'keys', k: ['PAGE_DOWN'] },
    });
  });

  it('keeps a missing or partially empty dial unassigned instead of supplying media defaults', () => {
    const empty = buildViaConfiguration({ layers: [{}] }, 'win');
    expect(empty.warnings).toEqual([]);
    expect(empty.config.layers[0]?.enc).toEqual({
      cw: { t: 'none' },
      press: { t: 'none' },
      ccw: { t: 'none' },
    });

    const partial = buildViaConfiguration({
      layers: [{
        'dial-tl': {
          encoderActions: {
            cw: { label: 'Next', binding: 'next track' },
          },
        },
      }],
    }, 'win');
    expect(partial.warnings).toEqual([]);
    expect(partial.config.layers[0]?.enc).toEqual({
      cw: { t: 'media', c: 'SCAN_NEXT_TRACK' },
      press: { t: 'none' },
      ccw: { t: 'none' },
    });
  });

  it.each([
    ['bright up', 'BRIGHTNESS_INCREMENT', 0x00bd],
    ['brightness up', 'BRIGHTNESS_INCREMENT', 0x00bd],
    ['brightness +', 'BRIGHTNESS_INCREMENT', 0x00bd],
    ['bright down', 'BRIGHTNESS_DECREMENT', 0x00be],
    ['brightness down', 'BRIGHTNESS_DECREMENT', 0x00be],
    ['brightness -', 'BRIGHTNESS_DECREMENT', 0x00be],
  ])('syncs %s through to the correct VIA brightness keycode', (binding, action, expectedCode) => {
    const { config, warnings } = buildViaConfiguration(oneLayer({
      r1c1: { label: binding, binding, actionType: 'Shortcut' },
    }), 'win');
    const mapped = config.layers[0]?.keys?.r1c1;

    expect(warnings).toEqual([]);
    expect(mapped).toEqual({ t: 'media', c: action });
    expect(actionToViaKeycode(mapped)).toBe(expectedCode);
  });

  it('uses the selected OS for Cmd and Mod and fails closed on unsupported bindings', () => {
    const profile = oneLayer({
      r1c1: { label: 'Mod', binding: 'Open (Mod + P)', actionType: 'Shortcut' },
      r1c2: { label: 'Cmd', binding: 'Open (Cmd + P)', actionType: 'Shortcut' },
      r1c3: { label: 'Launch', binding: 'Unmapped operation', actionType: 'Shortcut' },
    });
    const mac = buildViaConfiguration(profile, 'mac');
    const windows = buildViaConfiguration(profile, 'win');

    expect(mac.config.layers[0]?.keys?.r1c1).toEqual({ t: 'keys', k: ['GUI', 'P'] });
    expect(windows.config.layers[0]?.keys?.r1c1).toEqual({ t: 'keys', k: ['CONTROL', 'P'] });
    expect(windows.config.layers[0]?.keys?.r1c2).toEqual({ t: 'keys', k: ['CONTROL', 'P'] });
    expect(windows.config.layers[0]?.keys).not.toHaveProperty('r1c3');
    expect(windows.warnings).toContain('Layer 1 R1C3: "Unmapped operation" has no key press the device can send yet');
  });

  it('uses structured key actions and warns instead of flattening unsupported sequences and Smart Actions', () => {
    const profile = oneLayer({
      r1c1: {
        label: 'A',
        binding: 'stale display value',
        actionType: 'Shortcut',
        execution: { kind: 'shortcut', value: 'Ctrl + A' },
      },
      r1c2: {
        label: 'Macro',
        binding: 'Macro (Ctrl + A + Ctrl + B)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'sequence',
          steps: [
            { kind: 'key', key: 'Ctrl + A' },
            { kind: 'key', key: 'Ctrl + B' },
          ],
        },
      },
      r1c3: {
        label: 'Open app',
        binding: 'Open app (App: Calculator)',
        actionType: 'Smart Action',
        execution: { kind: 'smart', actionType: 'App', value: 'Calculator' },
      },
      r2c1: {
        label: 'Tap macro',
        binding: 'Tap macro (onTap: Ctrl + C, doubleTap: Ctrl + V)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
        },
      },
    });

    const { config, warnings } = buildViaConfiguration(profile, 'win');
    expect(config.layers[0]?.keys?.r1c1).toEqual({ t: 'keys', k: ['CONTROL', 'A'] });
    expect(config.layers[0]?.keys).not.toHaveProperty('r1c2');
    expect(config.layers[0]?.keys).not.toHaveProperty('r1c3');
    expect(config.layers[0]?.keys?.r2c1).toEqual({ t: 'keys', k: ['CONTROL', 'C'] });
    expect(warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Multi-step sequences cannot be represented'),
      expect.stringContaining('Smart Actions run on the desktop'),
      expect.stringContaining('doubleTap'),
    ]));
  });

  it('limits VIA writes to eight profile layers and maps layer shortcuts safely', () => {
    const profile = {
      layers: Array.from({ length: 10 }, (_, index) => ({
        ...oneLayer().layers[0],
        r1c1: { label: `Layer ${index + 1}`, binding: `Layer ${index + 1}`, actionType: 'Basic input' },
      })),
    };
    const { config } = buildViaConfiguration(profile, 'win');
    expect(config.layers).toHaveLength(8);
    expect(config.layers[0]?.keys?.r1c1).toEqual({ t: 'layer', op: 'set', n: 0 });
    expect(config.layers[7]?.keys?.r1c1).toEqual({ t: 'layer', op: 'set', n: 7 });
  });

  it('compiles simple onTap + onHold multiactions into offline QMK MT/LT keycodes and supports Profile 1..4', () => {
    const profile = oneLayer({
      r1c1: {
        label: 'Space / Shift',
        binding: 'Space / Shift (onTap: Space, onHold: Shift)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Space', onHold: 'Shift' },
        },
      },
      r1c2: {
        label: 'Esc / L2',
        binding: 'Esc / L2 (onTap: Escape, onHold: Temp Layer 2)',
        actionType: 'Multi-step action',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Escape', onHold: 'Temp Layer 2' },
        },
      },
      r1c3: {
        label: 'Prof 3',
        binding: 'Profile 3',
        actionType: 'Basic input',
      },
    });

    // The hold target must exist in this profile.
    profile.layers.push(oneLayer().layers[0]);
    const { config, warnings } = buildViaConfiguration(profile, 'win', { enableHostTriggers: true });
    expect(warnings).toEqual([]);
    expect(config.layers[0]?.keys?.r1c1).toEqual({ t: 'mod_tap', mod: 'SHIFT', key: 'SPACEBAR' });
    expect(actionToViaKeycode(config.layers[0]?.keys?.r1c1)).toBe(0x222c);
    expect(config.layers[0]?.keys?.r1c2).toEqual({ t: 'layer_tap', layer: 1, key: 'ESCAPE' });
    expect(actionToViaKeycode(config.layers[0]?.keys?.r1c2)).toBe(0x4129);
    expect(config.layers[0]?.keys?.r1c3).toEqual({ t: 'profile', n: 2 });
    expect(actionToViaKeycode(config.layers[0]?.keys?.r1c3)).toBe(0x7e42);
  });

  describe('Hardware Keymap Decoding & Round-tripping', () => {
    it('decodes blank keys', () => {
      expect(decodeViaKeycode(0)).toEqual({ label: '', binding: 'blank', actionType: 'Basic input' });
    });

    it('decodes layer switches including TO(1) for Key 3', () => {
      // TO(1) = 0x5201 (Layer 2)
      expect(decodeViaKeycode(0x5201)).toEqual({ label: 'L2', binding: 'Layer 2', actionType: 'Basic input' });
      // MO(1) = 0x5221 (Temp Layer 2)
      expect(decodeViaKeycode(0x5221)).toEqual({ label: 'TL2', binding: 'Temp Layer 2', actionType: 'Basic input' });
      // Layer Cycle = 0x7e44
      expect(decodeViaKeycode(0x7e44)).toEqual({ label: 'Cycle', binding: 'Layer Cycle', actionType: 'Layer Cycle' });
    });

    it('decodes media keys', () => {
      expect(decodeViaKeycode(0x00a9)).toEqual({ label: 'vol+', binding: 'volume +', actionType: 'Basic input' });
      expect(decodeViaKeycode(0x00aa)).toEqual({ label: 'vol-', binding: 'volume -', actionType: 'Basic input' });
      expect(decodeViaKeycode(0x00a8)).toEqual({ label: 'mute', binding: 'mute', actionType: 'Basic input' });
      expect(decodeViaKeycode(0x00ae)).toEqual({ label: 'play', binding: 'play', actionType: 'Basic input' });
    });

    it('decodes alphanumeric keys and chords', () => {
      expect(decodeViaKeycode(0x04)).toEqual({ label: 'A', binding: 'a', actionType: 'Basic input' });
      expect(decodeViaKeycode(0x1e)).toEqual({ label: '1', binding: '1', actionType: 'Basic input' });
      // Ctrl + C = (0x01 << 8) | 0x06
      expect(decodeViaKeycode(0x0106)).toEqual({ label: 'Ctrl+C', binding: 'ctrl+c', actionType: 'Basic input' });
    });

    it('identifies blank profile correctly', () => {
      expect(isProfileKeymapBlank({ id: 'def', name: 'Def', color: '#0051ff', layers: [{ r1c1: blankKey, r1c2: blankKey } as any] })).toBe(true);
      expect(isProfileKeymapBlank({ id: 'def', name: 'Def', color: '#0051ff', layers: [{ r1c1: { label: 'A', binding: 'a', actionType: 'Basic input' } } as any] })).toBe(false);
    });

    it('decodes a full multi-layer hardware snapshot into ProfileData', () => {
      const snapshot = {
        protocolVersion: 0x000d,
        layerCount: 2,
        capturedLayerCount: 2,
        layers: [
          {
            keys: {
              r1c1: 0x04,   // 'A'
              r1c2: 0x05,   // 'B'
              r1c3: 0x5201, // 'TO(1)' -> Layer 2
              r2c1: 0, r2c2: 0, r2c3: 0,
              r3c1: 0, r3c2: 0, r3c3: 0,
            },
            enc: { cw: 0x00a9, ccw: 0x00aa, press: 0x00a8 },
          },
          {
            keys: {
              r1c1: 0x5200, // 'TO(0)' -> Layer 1
              r1c2: 0, r1c3: 0,
              r2c1: 0, r2c2: 0, r2c3: 0,
              r3c1: 0, r3c2: 0, r3c3: 0,
            },
            enc: { cw: 0, ccw: 0, press: 0 },
          },
        ],
      };

      const profile = decodeViaSnapshotToProfile(snapshot);
      expect(profile.layers.length).toBe(2);
      expect(profile.layers[0].r1c1.binding).toBe('a');
      expect(profile.layers[0].r1c2.binding).toBe('b');
      expect(profile.layers[0].r1c3.binding).toBe('Layer 2');
      expect(profile.layers[0].r1c3.label).toBe('L2');
      expect(profile.layers[0]['dial-tl'].encoderActions?.cw?.binding).toBe('volume +');
      expect(profile.layers[1].r1c1.binding).toBe('Layer 1');
      expect(profile.layers[1].r1c1.label).toBe('L1');
    });
  });
});
