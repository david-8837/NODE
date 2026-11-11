import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const installerDirectory = join(process.cwd(), 'windows-installer');

function readBitmapDimensions(fileName: string) {
  const bitmap = readFileSync(join(installerDirectory, fileName));
  return {
    signature: bitmap.toString('ascii', 0, 2),
    width: bitmap.readInt32LE(18),
    height: bitmap.readInt32LE(22),
    bitsPerPixel: bitmap.readUInt16LE(28),
  };
}

describe('Windows installer artwork', () => {
  it('keeps the reference-inspired welcome sidebar branded for NØDE', () => {
    const sidebarSvg = readFileSync(join(installerDirectory, 'installer-sidebar.svg'), 'utf8');
    expect(sidebarSvg).toContain('NØDE');
    expect(sidebarSvg).toContain('MAKE IT');
    expect(sidebarSvg).toContain('YOUR OWN.');
    expect(sidebarSvg).toContain('Your keys. Your flow.');
    expect(sidebarSvg).toContain('NINE KEYS. ONE DIAL.');
    expect(readBitmapDimensions('installerSidebar.bmp')).toEqual({
      signature: 'BM',
      width: 164,
      height: 314,
      bitsPerPixel: 24,
    });
  });

  it('keeps the NSIS wizard header at its expected Windows dimensions', () => {
    expect(readBitmapDimensions('installerHeader.bmp')).toEqual({
      signature: 'BM',
      width: 150,
      height: 57,
      bitsPerPixel: 24,
    });
  });
});
