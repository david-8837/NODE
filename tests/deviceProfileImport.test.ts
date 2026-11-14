import { describe, expect, it } from 'vitest';
import { importDeviceKeymapIntoProfile } from '../src/deviceProfileImport';
import { VIA_PROTOCOL_VERSION, type ViaKeymapSnapshot } from '../src/qmkViaBridge';

function snapshot(overrides: Partial<ViaKeymapSnapshot['layers'][number]['keys']> = {}): ViaKeymapSnapshot {
  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: 4,
    capturedLayerCount: 1,
    layers: [{
      keys: {
        r1c1: 0x0004, r1c2: 0, r1c3: 0x7702,
        r2c1: 0x00ab, r2c2: 0, r2c3: 0,
        r3c1: 0, r3c2: 0, r3c3: 0,
        ...overrides,
      },
      enc: { cw: 0x5221, press: 0, ccw: 0x00a9 },
    }],
  };
}

const currentProfile = {
  id: 'profile-1',
  name: 'My profile',
  color: '#123456',
  layers: [{
    r1c1: { label: 'Old key', binding: 'B', actionType: 'Basic input', iconId: 'keep-icon' },
    r1c2: { label: 'Type note', binding: 'Text: hello', actionType: 'Smart Action', execution: { kind: 'text', value: 'hello' }, actionId: 'keep-host-action' },
    r1c3: { label: 'Macro', binding: 'Macro: old', actionType: 'Multi-step action', execution: { kind: 'sequence', steps: [] } },
    r2c1: { label: 'Old media', binding: 'volume -', actionType: 'Shortcut' },
    r2c2: { label: 'Existing desktop action', binding: 'Text: preserve', actionType: 'Smart Action', execution: { kind: 'text', value: 'preserve' } },
    r2c3: { label: '', binding: 'blank', actionType: 'Basic input' },
    r3c1: { label: '', binding: 'blank', actionType: 'Basic input' },
    r3c2: { label: '', binding: 'blank', actionType: 'Basic input' },
    r3c3: { label: '', binding: 'blank', actionType: 'Basic input' },
    'dial-tl': {
      label: 'Dial', binding: 'Dial', actionType: 'Basic input',
      encoderActions: {
        cw: { label: 'old', binding: 'A' },
        press: { label: 'desktop only', binding: 'Text', execution: { kind: 'text', value: 'x' } },
        ccw: { label: 'old ccw', binding: 'B' },
      },
    },
  }],
};

describe('device keymap import into desktop profiles', () => {
  it('imports supported device keycodes and macro references while retaining desktop metadata', () => {
    const result = importDeviceKeymapIntoProfile(currentProfile, snapshot(), 'win');
    const layer = result.profile.layers[0];

    expect(layer.r1c1).toMatchObject({ label: 'A', binding: 'A', actionType: 'Shortcut', iconId: 'keep-icon' });
    expect(layer.r1c2).toMatchObject({ label: 'Type note', binding: 'Text: hello', execution: { kind: 'text', value: 'hello' }, actionId: 'keep-host-action' });
    expect(layer.r1c3).toMatchObject({ label: 'QMK Macro 3', binding: 'QMK Macro 3', actionType: 'Shortcut' });
    expect(layer.r1c3).not.toHaveProperty('execution');
    expect(layer.r2c1).toMatchObject({ label: 'next track', binding: 'next track' });
    expect(layer['dial-tl'].encoderActions).toMatchObject({
      cw: { label: 'Temp Layer 2', binding: 'Temp Layer 2' },
      press: { label: 'desktop only', binding: 'Text', execution: { kind: 'text', value: 'x' } },
      ccw: { label: 'volume +', binding: 'volume +' },
    });
    expect(result.importedMappings).toBe(5);
    expect(result.warnings).toEqual([]);
  });

  it('does not erase host-only actions represented on-device as KC_NO', () => {
    const profile = {
      ...currentProfile,
      layers: [{
        ...currentProfile.layers[0],
        r1c1: { label: 'Desktop action', binding: 'Text: keep', actionType: 'Smart Action', execution: { kind: 'text', value: 'keep' } },
      }],
    };
    const result = importDeviceKeymapIntoProfile(profile, snapshot({ r1c1: 0 }), 'win');
    expect(result.profile.layers[0].r1c1).toEqual(profile.layers[0].r1c1);
    expect(result.profile.layers[0].r1c1.execution).toEqual({ kind: 'text', value: 'keep' });
  });

  it('leaves unsupported device keycodes unchanged and reports them', () => {
    const result = importDeviceKeymapIntoProfile(currentProfile, snapshot({ r1c1: 0xffff }), 'win');
    expect(result.profile.layers[0].r1c1).toEqual(currentProfile.layers[0].r1c1);
    expect(result.warnings).toContain('Layer 1 R1C1: unsupported device keycode 0xffff was left unchanged');
  });
});
