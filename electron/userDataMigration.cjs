// electron/userDataMigration.cjs - Preserves user settings and profiles across the app rename to NODE studio
const fs = require('fs');
const path = require('path');

const LEGACY_USER_DATA_DIR_NAMES = Object.freeze([
  'NØDE Grid Macro 1 Studio',
  'NODE Grid Macro 1 Studio',
  'NØDE Studio',
  'NØDE studio',
  'NODE Studio',
]);

const MIGRATION_MARKER_FILE = '.legacy-userdata-migrated.v1.json';

function isCaseInsensitivePlatform(platform) {
  return platform === 'win32' || platform === 'darwin';
}

function normalizeComparisonPath(targetPath, platform) {
  const resolved = path.resolve(targetPath);
  return isCaseInsensitivePlatform(platform) ? resolved.toLowerCase() : resolved;
}

function isSameFilesystemPath(leftPath, rightPath, platform = process.platform, fsImpl = fs) {
  if (normalizeComparisonPath(leftPath, platform) === normalizeComparisonPath(rightPath, platform)) {
    return true;
  }
  try {
    if (fsImpl.existsSync(leftPath) && fsImpl.existsSync(rightPath)) {
      const leftReal = fsImpl.realpathSync(leftPath);
      const rightReal = fsImpl.realpathSync(rightPath);
      return normalizeComparisonPath(leftReal, platform) === normalizeComparisonPath(rightReal, platform);
    }
  } catch {}
  return false;
}

function hasSettingsFile(dirPath, fsImpl = fs) {
  try {
    return fsImpl.statSync(path.join(dirPath, 'settings.v1.json')).isFile();
  } catch {
    return false;
  }
}

function hasPopulatedLocalStorage(dirPath, fsImpl = fs) {
  try {
    const localStorageDir = path.join(dirPath, 'Local Storage');
    if (!fsImpl.statSync(localStorageDir).isDirectory()) return false;
    return fsImpl.readdirSync(localStorageDir).length > 0;
  } catch {
    return false;
  }
}

/**
 * Copies settings.v1.json and Chromium Local Storage from a previous installation's
 * userData directory into the renamed `NODE studio` userData directory before Chromium
 * opens its profile. The legacy directory is left intact so rolling back to an older
 * installer retains its state as well.
 */
function migrateLegacyUserData({
  currentUserDataDir,
  appDataDir,
  platform = process.platform,
  fsImpl = fs,
} = {}) {
  try {
    if (typeof currentUserDataDir !== 'string' || !currentUserDataDir.trim()) {
      return { migrated: false, reason: 'invalid-destination' };
    }
    const resolvedAppDataDir =
      typeof appDataDir === 'string' && appDataDir.trim()
        ? appDataDir
        : path.dirname(currentUserDataDir);

    const markerPath = path.join(currentUserDataDir, MIGRATION_MARKER_FILE);
    if (fsImpl.existsSync(markerPath)) {
      return { migrated: false, reason: 'already-migrated' };
    }

    if (
      hasSettingsFile(currentUserDataDir, fsImpl) ||
      hasPopulatedLocalStorage(currentUserDataDir, fsImpl)
    ) {
      return { migrated: false, reason: 'destination-populated' };
    }

    for (const legacyName of LEGACY_USER_DATA_DIR_NAMES) {
      const candidateDir = path.join(resolvedAppDataDir, legacyName);
      if (isSameFilesystemPath(candidateDir, currentUserDataDir, platform, fsImpl)) {
        continue;
      }

      const copySettings = hasSettingsFile(candidateDir, fsImpl);
      const copyLocalStorage = hasPopulatedLocalStorage(candidateDir, fsImpl);
      if (!copySettings && !copyLocalStorage) {
        continue;
      }

      fsImpl.mkdirSync(currentUserDataDir, { recursive: true });
      const copied = [];

      if (copySettings) {
        fsImpl.copyFileSync(
          path.join(candidateDir, 'settings.v1.json'),
          path.join(currentUserDataDir, 'settings.v1.json')
        );
        copied.push('settings.v1.json');
      }

      if (copyLocalStorage) {
        fsImpl.cpSync(
          path.join(candidateDir, 'Local Storage'),
          path.join(currentUserDataDir, 'Local Storage'),
          { recursive: true, force: false, errorOnExist: false }
        );
        copied.push('Local Storage');
      }

      fsImpl.writeFileSync(
        markerPath,
        `${JSON.stringify(
          {
            version: 1,
            migratedFrom: legacyName,
            copied,
            migratedAt: new Date().toISOString(),
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      return { migrated: true, migratedFrom: legacyName, copied };
    }

    return { migrated: false, reason: 'no-legacy-data' };
  } catch (error) {
    return {
      migrated: false,
      reason: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

module.exports = {
  LEGACY_USER_DATA_DIR_NAMES,
  MIGRATION_MARKER_FILE,
  isSameFilesystemPath,
  migrateLegacyUserData,
};
