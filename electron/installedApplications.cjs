'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MAX_SCAN_DEPTH = 8;
const MAX_SHORTCUTS_TO_INSPECT = 1500;
const MAX_APPLICATIONS = 300;

function getWindowsApplicationRoots(env, pathApi = path.win32) {
  const roots = [
    env.APPDATA && pathApi.join(env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    (env.PROGRAMDATA || env.ProgramData) && pathApi.join(
      env.PROGRAMDATA || env.ProgramData,
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
    ),
    env.USERPROFILE && pathApi.join(env.USERPROFILE, 'Desktop'),
    env.PUBLIC && pathApi.join(env.PUBLIC, 'Desktop'),
  ];
  return [...new Set(roots.filter((root) => typeof root === 'string' && root.trim()))];
}

function isFile(filePath, fsModule) {
  try {
    return fsModule.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function normalizeName(shortcutPath, pathApi) {
  return pathApi.basename(shortcutPath)
    .replace(/\.lnk$/i, '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Find launchable Windows applications from the user's and machine's Start Menu
 * and Desktop shortcuts. Reading shortcut metadata lets us omit stale links and
 * links to documents/websites while still launching Store-app shortcuts through
 * the Windows shell.
 */
function listInstalledApplications({
  platform = process.platform,
  env = process.env,
  fsModule = fs,
  readShortcutLink,
  roots,
  excludedExecutables = [],
  pathApi = platform === 'win32' ? path.win32 : path,
} = {}) {
  if (platform !== 'win32') {
    return {
      ok: false,
      apps: [],
      error: 'Installed app search is available in the Windows desktop app.',
    };
  }
  if (typeof readShortcutLink !== 'function') {
    return { ok: false, apps: [], error: 'Windows shortcut discovery is unavailable.' };
  }

  const searchRoots = Array.isArray(roots) ? roots : getWindowsApplicationRoots(env, pathApi);
  const excludedTargets = new Set(excludedExecutables
    .filter((target) => typeof target === 'string' && target.trim())
    .map((target) => pathApi.normalize(target).toLowerCase()));
  const applications = [];
  const seenLaunchers = new Set();
  let inspectedShortcuts = 0;

  const walk = (directory, depth) => {
    if (depth > MAX_SCAN_DEPTH || inspectedShortcuts >= MAX_SHORTCUTS_TO_INSPECT) return;

    let entries;
    try {
      entries = fsModule.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (inspectedShortcuts >= MAX_SHORTCUTS_TO_INSPECT) return;
      if (!entry || typeof entry.name !== 'string' || !entry.name || entry.name === '.' || entry.name === '..') continue;

      const entryPath = pathApi.join(directory, entry.name);
      if (typeof entry.isDirectory === 'function' && entry.isDirectory()) {
        if (depth < MAX_SCAN_DEPTH) walk(entryPath, depth + 1);
        continue;
      }
      if (typeof entry.isFile !== 'function' || !entry.isFile() || !/\.lnk$/i.test(entry.name)) continue;

      inspectedShortcuts += 1;
      try {
        const details = readShortcutLink(entryPath);
        if (!details || typeof details.target !== 'string' || !details.target.trim()) continue;

        const target = pathApi.normalize(details.target.trim());
        if (!pathApi.isAbsolute(target) || pathApi.extname(target).toLowerCase() !== '.exe') continue;
        if (excludedTargets.has(target.toLowerCase()) || !isFile(target, fsModule)) continue;

        const name = normalizeName(entryPath, pathApi);
        if (!name) continue;
        const argumentsKey = typeof details.args === 'string' ? details.args.trim().toLowerCase() : '';
        const launcherKey = `${target.toLowerCase()}\u0000${argumentsKey}`;
        if (seenLaunchers.has(launcherKey)) continue;
        seenLaunchers.add(launcherKey);

        applications.push({
          name,
          shortcutPath: pathApi.resolve(entryPath),
        });
      } catch {
        // Individual Start Menu shortcuts may be damaged or inaccessible. Keep
        // scanning so one bad entry cannot hide the rest of the installed apps.
      }
    }
  };

  for (const root of searchRoots) {
    if (typeof root === 'string' && root.trim()) walk(root, 0);
    if (inspectedShortcuts >= MAX_SHORTCUTS_TO_INSPECT) break;
  }

  applications.sort((left, right) =>
    left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  );
  return { ok: true, apps: applications.slice(0, MAX_APPLICATIONS) };
}

module.exports = {
  getWindowsApplicationRoots,
  listInstalledApplications,
};
