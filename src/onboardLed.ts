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
