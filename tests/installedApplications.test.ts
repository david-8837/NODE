import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getWindowsApplicationRoots,
  listInstalledApplications,
} = require('../electron/installedApplications.cjs');

function fileEntry(name: string) {
  return { name, isDirectory: () => false, isFile: () => true };
}

function directoryEntry(name: string) {
  return { name, isDirectory: () => true, isFile: () => false };
}

describe('installed Windows application discovery', () => {
  it('searches user and shared Start Menu/Desktop locations', () => {
    expect(getWindowsApplicationRoots({
      APPDATA: 'C:\\Users\\tester\\AppData\\Roaming',
      PROGRAMDATA: 'C:\\ProgramData',
      USERPROFILE: 'C:\\Users\\tester',
      PUBLIC: 'C:\\Users\\Public',
    })).toEqual([
      'C:\\Users\\tester\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs',
      'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs',
      'C:\\Users\\tester\\Desktop',
      'C:\\Users\\Public\\Desktop',
    ]);
  });

  it('returns existing executable shortcuts, skips broken/non-app links, and deduplicates launch targets', () => {
    const root = 'C:\\Users\\tester\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs';
    const sharedRoot = 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs';
    const desktopRoot = 'C:\\Users\\tester\\Desktop';
    const nested = path.win32.join(root, 'Creative tools');
    const shortcuts = new Map<string, { target: string; args?: string; appUserModelId?: string }>([
      [path.win32.join(root, 'Code.lnk'), { target: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' }],
      [path.win32.join(root, 'Document.lnk'), { target: 'C:\\Users\\tester\\Documents\\guide.pdf' }],
      [path.win32.join(root, 'Missing.lnk'), { target: 'C:\\Apps\\missing.exe' }],
      [path.win32.join(nested, 'Blender.lnk'), { target: 'C:\\Program Files\\Blender Foundation\\Blender\\blender.exe' }],
      [path.win32.join(sharedRoot, 'Code.lnk'), { target: 'C:\\Program Files\\Microsoft VS Code\\Code.exe' }],
      [path.win32.join(desktopRoot, 'Beach Buggy Racing.lnk'), {
        target: 'D:\\XboxGames\\Beach Buggy Racing\\Game.exe',
        appUserModelId: 'Vendor.BeachBuggyRacing!App',
      }],
    ]);
    const existingFiles = new Set([
      'c:\\program files\\microsoft vs code\\code.exe',
      'c:\\program files\\blender foundation\\blender\\blender.exe',
    ]);
    const directories = new Map([
      [root, [directoryEntry('Creative tools'), fileEntry('Code.lnk'), fileEntry('Document.lnk'), fileEntry('Missing.lnk')]],
      [nested, [fileEntry('Blender.lnk')]],
      [sharedRoot, [fileEntry('Code.lnk')]],
      [desktopRoot, [fileEntry('Beach Buggy Racing.lnk')]],
    ]);
    const fsModule = {
      readdirSync: vi.fn((directory: string) => {
        const entries = directories.get(directory);
        if (!entries) throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        return entries;
      }),
      statSync: vi.fn((filePath: string) => {
        if (!existingFiles.has(filePath.toLowerCase())) {
          throw Object.assign(new Error('not found'), { code: 'ENOENT' });
        }
        return { isFile: () => true };
      }),
    };
    const readShortcutLink = vi.fn((shortcutPath: string) => {
      const details = shortcuts.get(shortcutPath);
      if (!details) throw new Error('Damaged shortcut');
      return details;
    });

    const result = listInstalledApplications({
      platform: 'win32',
      env: {},
      fsModule,
      readShortcutLink,
      roots: [root, sharedRoot, desktopRoot],
      pathApi: path.win32,
    });

    expect(result).toEqual({
      ok: true,
      apps: [
        { name: 'Beach Buggy Racing', shortcutPath: path.win32.join(desktopRoot, 'Beach Buggy Racing.lnk') },
        { name: 'Blender', shortcutPath: path.win32.join(nested, 'Blender.lnk') },
        { name: 'Code', shortcutPath: path.win32.join(root, 'Code.lnk') },
      ],
    });
    expect(readShortcutLink).toHaveBeenCalledTimes(6);
  });

  it('keeps shortcuts to executable targets that Windows protects from file inspection', () => {
    const root = 'C:\\Users\\tester\\Desktop';
    const shortcutPath = path.win32.join(root, 'Beach Buggy Racing.lnk');
    const fsModule = {
      readdirSync: vi.fn(() => [fileEntry('Beach Buggy Racing.lnk')]),
      statSync: vi.fn(() => {
        throw Object.assign(new Error('access denied'), { code: 'EACCES' });
      }),
    };

    const result = listInstalledApplications({
      platform: 'win32',
      env: {},
      fsModule,
      readShortcutLink: () => ({ target: 'D:\\XboxGames\\Beach Buggy Racing\\Game.exe' }),
      roots: [root],
      pathApi: path.win32,
    });

    expect(result.apps).toEqual([{ name: 'Beach Buggy Racing', shortcutPath }]);
  });

  it('returns launchable shortcuts beyond the previous 300-app limit, including other drives', () => {
    const root = 'C:\\Users\\tester\\Desktop';
    const shortcuts = new Map<string, { target: string }>();
    const entries = Array.from({ length: 320 }, (_, index) => {
      const name = `Installed App ${String(index).padStart(3, '0')}.lnk`;
      shortcuts.set(path.win32.join(root, name), {
        target: path.win32.join('D:\\Installed Apps', `App${index}.exe`),
      });
      return fileEntry(name);
    });
    const fsModule = {
      readdirSync: vi.fn(() => entries),
      statSync: vi.fn(() => ({ isFile: () => true })),
    };

    const result = listInstalledApplications({
      platform: 'win32',
      env: {},
      fsModule,
      readShortcutLink: (shortcutPath: string) => shortcuts.get(shortcutPath),
      roots: [root],
      pathApi: path.win32,
    });

    expect(result.apps).toHaveLength(320);
    expect(result.apps.some((application: { name: string }) => application.name === 'Installed App 319'))
      .toBe(true);
  });

  it('reports that installed app discovery is Windows-only', () => {
    expect(listInstalledApplications({ platform: 'darwin' })).toMatchObject({
      ok: false,
      apps: [],
      error: expect.stringContaining('Windows desktop app'),
    });
  });
});
