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
    expect(sidebarSvg).toContain('DESIGNED FOR YOUR FLOW.');
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

describe('Windows assisted installer welcome page', () => {
  it('registers the MUI welcome page without replacing the install flow', () => {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(config.build.nsis.oneClick).toBe(false);
    expect(config.build.nsis.include).toBe('windows-installer/installer.nsh');
    expect(config.build.nsis.allowToChangeInstallationDirectory).toBe(true);
    expect(config.build.nsis.deleteAppDataOnUninstall).toBe(false);
    const include = readFileSync(join(process.cwd(), config.build.nsis.include), 'utf8');
    expect(include).toMatch(/!macro customWelcomePage[\s\S]*!insertmacro MUI_PAGE_WELCOME[\s\S]*!macroend/);
    expect(include).toContain('Your keys. Your flow.');
    expect(include).not.toMatch(/!macro custom(?:Install|UnInstall|FinishPage)\b/i);
  });
});
