import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rgbHexToQmkHsv } from '../src/onboardLed';
describe('onboard LED color conversion', () => {
  it('maps RGB to QMK HSV and rejects incomplete input', () => {
    expect(rgbHexToQmkHsv('#ff0000')).toEqual({ hue: 0, saturation: 255 });
    expect(rgbHexToQmkHsv('#00ff00')).toEqual({ hue: 85, saturation: 255 });
    expect(rgbHexToQmkHsv('#ffffff')).toEqual({ hue: 0, saturation: 0 });
    expect(rgbHexToQmkHsv('#fff')).toBeNull();
  });
  it('does not force an LED color on boot or layer changes', () => {
    const firmware = readFileSync('qmk_firmware/grid_macro_1/keymaps/via/keymap.c', 'utf8');
    expect(firmware).not.toContain('rgblight_setrgb_at');
    expect(firmware).not.toContain('layer_state_set_user');
  });
});
