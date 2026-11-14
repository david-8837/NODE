/** Convert a six-digit RGB hex color to the 8-bit HSV values used by QMK VIA. */
export function rgbHexToQmkHsv(hex: string): { hue: number; saturation: number } | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return { hue: Math.round(hue * 255 / 360), saturation: max === 0 ? 0 : Math.round(delta * 255 / max) };
}

/**
 * The confirmed RP2040-Zero LED reports red/green reversed with the currently
 * shipped GRB firmware. Swap the requested channels before QMK's HSV conversion.
 * This targets the existing firmware; do not also change WS2812_BYTE_ORDER.
 */
export function rp2040ZeroColorToQmkHsv(hex: string): { hue: number; saturation: number } | null {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return rgbHexToQmkHsv(`#${hex.slice(3, 5)}${hex.slice(1, 3)}${hex.slice(5, 7)}`);
}

/** Decode the current firmware's HSV values back to the user's RGB channels. */
export function qmkHsvToRp2040ZeroHex(hue: number, saturation: number): string {
  const h = ((hue / 255) * 6) % 6, s = saturation / 255;
  const c = s, x = c * (1 - Math.abs((h % 2) - 1)), m = 1 - c;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(g)}${hex(r)}${hex(b)}`;
}
