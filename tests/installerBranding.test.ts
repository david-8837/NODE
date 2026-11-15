import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the Windows installer branding.
 *
 * NSIS is strict about these bitmaps: wrong dimensions or a non-24-bit BMP makes
 * the wizard render stretched or refuse the image, and that only shows up in a
 * packaged Windows build. The artwork is also required to be black and white, so
 * both the SVG sources and the decoded BMP pixels are checked for colour.
 */

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const nsis = pkg.build.nsis as Record<string, string>;

type BmpInfo = { width: number; height: number; bitsPerPixel: number; compression: number; pixelOffset: number };

function readBmpHeader(file: string): BmpInfo {
  const data = readFileSync(file);
  expect(data.subarray(0, 2).toString('ascii')).toBe('BM');
  return {
    pixelOffset: data.readUInt32LE(10),
    width: data.readInt32LE(18),
    height: Math.abs(data.readInt32LE(22)),
    bitsPerPixel: data.readUInt16LE(28),
    compression: data.readUInt32LE(30),
  };
}

/** Decodes an uncompressed 24-bit BMP into RGB triples. */
function readPixels(file: string): Array<[number, number, number]> {
  const data = readFileSync(file);
  const { width, height, bitsPerPixel, pixelOffset } = readBmpHeader(file);
  expect(bitsPerPixel).toBe(24);
  const stride = Math.ceil((width * 3) / 4) * 4;
  const pixels: Array<[number, number, number]> = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = pixelOffset + y * stride + x * 3;
      pixels.push([data[at + 2], data[at + 1], data[at]]);
    }
  }
  return pixels;
}

describe('Windows installer artwork', () => {
  it('sidebar is exactly 164x314, 24-bit and uncompressed', () => {
    const info = readBmpHeader(path.join(root, nsis.installerSidebar));
    expect(info.width).toBe(164);
    expect(info.height).toBe(314);
    expect(info.bitsPerPixel).toBe(24);
    expect(info.compression).toBe(0);
  });

  it('header is exactly 150x57, 24-bit and uncompressed', () => {
    const info = readBmpHeader(path.join(root, nsis.installerHeader));
    expect(info.width).toBe(150);
    expect(info.height).toBe(57);
    expect(info.bitsPerPixel).toBe(24);
    expect(info.compression).toBe(0);
  });

  it('every configured artwork path exists', () => {
    for (const key of ['installerIcon', 'uninstallerIcon', 'installerHeader', 'installerSidebar', 'uninstallerSidebar', 'include']) {
      expect(nsis[key], key).toBeTruthy();
      expect(existsSync(path.join(root, nsis[key])), `${key} -> ${nsis[key]}`).toBe(true);
    }
  });

  it('renders the sidebar in pure black and white, with no colour cast', () => {
    const pixels = readPixels(path.join(root, nsis.installerSidebar));
    const coloured = pixels.filter(([r, g, b]) => r !== g || g !== b);
    expect(coloured).toHaveLength(0);
  });

  it('renders the header in pure black and white, with no colour cast', () => {
    const pixels = readPixels(path.join(root, nsis.installerHeader));
    expect(pixels.filter(([r, g, b]) => r !== g || g !== b)).toHaveLength(0);
  });

  it('sidebar actually uses the full black-to-white range rather than being blank', () => {
    const pixels = readPixels(path.join(root, nsis.installerSidebar));
    const levels = pixels.map(([r]) => r);
    expect(Math.min(...levels)).toBeLessThan(24);
    expect(Math.max(...levels)).toBeGreaterThan(230);
    // A single flat fill would collapse to one distinct level.
    expect(new Set(levels).size).toBeGreaterThan(20);
  });

  it('keeps the editable SVG sources monochrome too', () => {
    for (const name of ['installer-sidebar.svg', 'installer-header.svg']) {
      const svg = readFileSync(path.join(root, 'windows-installer', name), 'utf8');
      const hexes = svg.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      expect(hexes.length, `${name} declares colours`).toBeGreaterThan(0);
      for (const hex of hexes) {
        const r = hex.slice(1, 3);
        const g = hex.slice(3, 5);
        const b = hex.slice(5, 7);
        expect(r.toLowerCase(), `${name} ${hex}`).toBe(g.toLowerCase());
        expect(g.toLowerCase(), `${name} ${hex}`).toBe(b.toLowerCase());
      }
    }
  });
});

describe('custom NSIS welcome page', () => {
  const script = readFileSync(path.join(root, nsis.include), 'utf8');

  it('defines the hook electron-builder actually looks for', () => {
    // assistedInstaller.nsh only emits a welcome page when this macro exists.
    expect(script).toMatch(/!macro\s+customWelcomePage/);
    expect(script).toMatch(/!insertmacro\s+MUI_PAGE_WELCOME/);
    expect(script).toMatch(/!macroend/);
  });

  it('sets a branded title and body text', () => {
    expect(script).toMatch(/!define\s+MUI_WELCOMEPAGE_TITLE\s+"Welcome to NØDE Grid Macro 1 Studio"/);
    expect(script).toMatch(/!define\s+MUI_WELCOMEPAGE_TEXT\s+"/);
  });

  it('tells the user profiles are kept and the pad must be connected', () => {
    expect(script).toMatch(/profiles, key assignments and settings are kept/i);
    expect(script).toMatch(/connect your Micro Pad/i);
    expect(script).toMatch(/stays locked until the pad is detected/i);
  });

  it('undefines the welcome strings so they cannot leak into the uninstaller', () => {
    for (const symbol of ['MUI_WELCOMEPAGE_TEXT', 'MUI_WELCOMEPAGE_TITLE']) {
      expect(script).toContain(`!undef ${symbol}`);
    }
    // Each undef must be guarded, since MUI may already have consumed the define.
    const undefs = script.match(/!undef\s+MUI_WELCOMEPAGE_\w+/g) ?? [];
    const guards = script.match(/!ifdef\s+MUI_WELCOMEPAGE_\w+/g) ?? [];
    expect(guards.length).toBeGreaterThanOrEqual(undefs.length);
  });

  it('uses NSIS line breaks rather than literal newlines in the body', () => {
    const body = /!define\s+MUI_WELCOMEPAGE_TEXT\s+"([^"]*)"/.exec(script)?.[1] ?? '';
    expect(body).toContain('$\\r$\\n');
    expect(body).not.toContain('\n');
  });
});
