import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { rgbHexToQmkHsv, rp2040ZeroColorToQmkHsv, qmkHsvToRp2040ZeroHex } from '../src/onboardLed';
describe('onboard LED color conversion', () => {
  it('maps RGB to QMK HSV and rejects incomplete input', () => {
    expect(rgbHexToQmkHsv('#ff0000')).toEqual({ hue: 0, saturation: 255 });
    expect(rgbHexToQmkHsv('#00ff00')).toEqual({ hue: 85, saturation: 255 });
    expect(rgbHexToQmkHsv('#ffffff')).toEqual({ hue: 0, saturation: 0 });
    expect(rgbHexToQmkHsv('#fff')).toBeNull();
  });
  it('compensates for the observed red/green channel swap on current firmware', () => {
    expect(rp2040ZeroColorToQmkHsv('#FF0000')).toEqual({ hue: 85, saturation: 255 });
    expect(rp2040ZeroColorToQmkHsv('#00FF00')).toEqual({ hue: 0, saturation: 255 });
    expect(rp2040ZeroColorToQmkHsv('#0000FF')).toEqual({ hue: 170, saturation: 255 });
    expect(rp2040ZeroColorToQmkHsv('#ffffff')).toEqual({ hue: 0, saturation: 0 });
    expect(rp2040ZeroColorToQmkHsv('#zzzzzz')).toBeNull();
  });
  it('decodes calibrated primary colors for editing', () => {
    expect(qmkHsvToRp2040ZeroHex(85, 255)).toBe('#ff0000');
    expect(qmkHsvToRp2040ZeroHex(0, 255)).toBe('#00ff00');
    expect(qmkHsvToRp2040ZeroHex(170, 255)).toBe('#0000ff');
    expect(qmkHsvToRp2040ZeroHex(0, 0)).toBe('#ffffff');
  });
  it('does not force an LED color on boot or layer changes', () => {
    const firmware = readFileSync('qmk_firmware/grid_macro_1/keymaps/via/keymap.c', 'utf8');
    expect(firmware).not.toContain('rgblight_setrgb_at');
    expect(firmware).not.toContain('layer_state_set_user');
  });
});
