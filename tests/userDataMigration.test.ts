import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  MIGRATION_MARKER_FILE,
  isSameFilesystemPath,
  migrateLegacyUserData,
} = require('../electron/userDataMigration.cjs') as {
  MIGRATION_MARKER_FILE: string;
  isSameFilesystemPath: (left: string, right: string, platform?: string) => boolean;
  migrateLegacyUserData: (options: {
    currentUserDataDir: string;
    appDataDir?: string;
    platform?: string;
  }) => {
    migrated: boolean;
    reason?: string;
    migratedFrom?: string;
    copied?: string[];
  };
};

const tempDirs: string[] = [];

function makeTempAppData(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'node-studio-userdata-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop()!;
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('legacy userData migration into NODE studio', () => {
  it('migrates settings.v1.json and Local Storage from NØDE Grid Macro 1 Studio while preserving legacy files for rollback', () => {
    const appData = makeTempAppData();
    const legacyDir = path.join(appData, 'NØDE Grid Macro 1 Studio');
    const legacyLevelDb = path.join(legacyDir, 'Local Storage', 'leveldb');
    mkdirSync(legacyLevelDb, { recursive: true });
    writeFileSync(
      path.join(legacyDir, 'settings.v1.json'),
      JSON.stringify({ allowTerminalSmartActions: true, allowDeviceNotifications: true }),
      'utf8'
    );
    writeFileSync(path.join(legacyLevelDb, '000003.log'), 'saved-profiles-payload', 'utf8');

    // Electron may create the empty userData folder on startup before migration runs.
    const currentDir = path.join(appData, 'NODE studio');
    mkdirSync(currentDir, { recursive: true });

    const result = migrateLegacyUserData({
      currentUserDataDir: currentDir,
      appDataDir: appData,
      platform: 'win32',
    });

    expect(result).toEqual({
      migrated: true,
      migratedFrom: 'NØDE Grid Macro 1 Studio',
      copied: ['settings.v1.json', 'Local Storage'],
    });
    expect(JSON.parse(readFileSync(path.join(currentDir, 'settings.v1.json'), 'utf8'))).toEqual({
      allowTerminalSmartActions: true,
      allowDeviceNotifications: true,
    });
    expect(
      readFileSync(path.join(currentDir, 'Local Storage', 'leveldb', '000003.log'), 'utf8')
    ).toBe('saved-profiles-payload');
    expect(existsSync(path.join(currentDir, MIGRATION_MARKER_FILE))).toBe(true);

    // Legacy directory remains untouched so rolling back to an older installer works cleanly.
    expect(existsSync(path.join(legacyDir, 'settings.v1.json'))).toBe(true);
    expect(existsSync(path.join(legacyLevelDb, '000003.log'))).toBe(true);

    // Subsequent startup is a fast no-op.
    const secondRun = migrateLegacyUserData({
      currentUserDataDir: currentDir,
      appDataDir: appData,
      platform: 'win32',
    });
    expect(secondRun).toEqual({ migrated: false, reason: 'already-migrated' });
  });

  it('never overwrites existing NODE studio settings or profiles', () => {
    const appData = makeTempAppData();
    const legacyDir = path.join(appData, 'NØDE Grid Macro 1 Studio');
    mkdirSync(path.join(legacyDir, 'Local Storage', 'leveldb'), { recursive: true });
    writeFileSync(path.join(legacyDir, 'settings.v1.json'), '{"allowTerminalSmartActions":true}', 'utf8');

    const currentDir = path.join(appData, 'NODE studio');
    mkdirSync(currentDir, { recursive: true });
    writeFileSync(path.join(currentDir, 'settings.v1.json'), '{"allowTerminalSmartActions":false}', 'utf8');

    const result = migrateLegacyUserData({
      currentUserDataDir: currentDir,
      appDataDir: appData,
      platform: 'win32',
    });

    expect(result).toEqual({ migrated: false, reason: 'destination-populated' });
    expect(readFileSync(path.join(currentDir, 'settings.v1.json'), 'utf8')).toBe(
      '{"allowTerminalSmartActions":false}'
    );
  });

  it('treats NODE Studio and NODE studio as the same path on case-insensitive Windows filesystems', () => {
    expect(
      isSameFilesystemPath(
        'C:\\Users\\Demo\\AppData\\Roaming\\NODE Studio',
        'C:\\Users\\Demo\\AppData\\Roaming\\NODE studio',
        'win32'
      )
    ).toBe(true);
    expect(
      isSameFilesystemPath(
        '/tmp/appdata/NODE Studio',
        '/tmp/appdata/NODE studio',
        'linux'
      )
    ).toBe(false);
  });
});
