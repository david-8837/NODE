import { describe, expect, it } from 'vitest';
import { actionToViaKeycode } from '../src/qmkViaBridge';
import { buildViaConfiguration } from '../src/qmkProfileSync';

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
    expect(config.layers[0]?.keys?.r1c2).toEqual({ t: 'none' });
    expect(config.layers[0]?.keys?.r1c3).toEqual({ t: 'none' });
    expect(config.layers[0]?.keys?.r2c1).toEqual({ t: 'none' });
    expect(warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Multi-step sequences cannot be represented'),
      expect.stringContaining('Smart Actions run on the desktop'),
      expect.stringContaining('Multiactions are handled by desktop software'),
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

  it('maps Cheat-Sheet HUD actions to KC_NO so physical keypresses do not emit phantom keystrokes', () => {
    const profile = oneLayer({
      r1c1: { label: 'Cheat-Sheet', binding: 'Show Cheat-Sheet', actionId: 'cs-show' },
      r1c2: { label: 'Peek HUD', binding: 'Show Cheat-Sheet Hold', actionId: 'cs-hold' },
      r1c3: { label: 'Toggle HUD', binding: 'Toggle Cheat-Sheet', actionId: 'cs-tog' },
      r2c1: { label: 'Hide HUD', binding: 'Hide Cheat-Sheet', actionId: 'cs-hide' },
    });
    const { config } = buildViaConfiguration(profile, 'win');
    expect(config.layers[0]?.keys?.r1c1).toEqual({ t: 'none' });
    expect(config.layers[0]?.keys?.r1c2).toEqual({ t: 'none' });
    expect(config.layers[0]?.keys?.r1c3).toEqual({ t: 'none' });
    expect(config.layers[0]?.keys?.r2c1).toEqual({ t: 'none' });
  });
});
