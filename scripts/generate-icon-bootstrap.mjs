import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

function parseAssignedJson(source, assignment) {
  const start = source.indexOf(assignment);
  if (start < 0) throw new Error(`Missing ${assignment}`);
  const valueStart = start + assignment.length;
  const sourceTail = source.slice(valueStart);
  const terminator = /;\r?\n/.exec(sourceTail);
  const jsonEnd = terminator?.index ?? (sourceTail.endsWith(';') ? sourceTail.length - 1 : -1);
  if (jsonEnd < 0) throw new Error(`Unterminated ${assignment}`);
  return JSON.parse(sourceTail.slice(0, jsonEnd));
}

const fullIconSource = readFileSync(path.join(root, 'public/icons-data.js'), 'utf8');
const fullIcons = parseAssignedJson(fullIconSource, 'window.__MACRO_ICONS__ = ');
const brandIcons = parseAssignedJson(
  readFileSync(path.join(root, 'public/preset-brand-icons.js'), 'utf8'),
  'window.__PRESET_BRAND_ICON_DATA__ = '
);
const presetSource = readFileSync(path.join(root, 'src/presetCatalog.ts'), 'utf8');
const presetJson = presetSource
  .split('export const PRESET_CATALOG: readonly PresetCatalogEntry[] = [', 2)[1]
  ?.split('];', 1)[0];
if (!presetJson) throw new Error('Could not find PRESET_CATALOG');
const presets = JSON.parse(`[${presetJson}]`);
const presetIconIds = new Set();
for (const preset of presets) {
  for (const action of [...preset.keys, ...Object.values(preset.dial)]) {
    if (action.iconId) presetIconIds.add(action.iconId);
  }
}

const appSource = readFileSync(path.join(root, 'src/components/StudioIcons.tsx'), 'utf8');
const badgeConfig = appSource
  .split('const PRESET_APP_ICON_CONFIGS:', 2)[1]
  ?.split('\n};', 1)[0];
if (!badgeConfig) throw new Error('Could not find PRESET_APP_ICON_CONFIGS');
const presetBadgeIconIds = new Set(
  [...badgeConfig.matchAll(/iconId: '([^']+)'/g)].map(([, iconId]) => iconId)
);
const requiredIconIds = new Set([...presetIconIds, ...presetBadgeIconIds]);

const missingIconIds = [...requiredIconIds].filter(
  (iconId) => !fullIcons.d[iconId] && !brandIcons.d[iconId]
);
if (missingIconIds.length) {
  throw new Error(`No vector path for startup preset icon(s): ${missingIconIds.join(', ')}`);
}

// Keep only the paths and fill metadata needed before the full picker is opened.
const paths = Object.fromEntries(
  [...requiredIconIds]
    .filter((iconId) => fullIcons.d[iconId])
    .map((iconId) => [iconId, fullIcons.d[iconId]])
);
const metadata = [];
for (const id of Object.keys(paths)) {
  const matches = fullIcons.l.filter((entry) => entry.id === id);
  const preferred = matches.find((entry) => entry.t === 'f') ?? matches[0];
  if (preferred) metadata.push({ id, ...(preferred.t ? { t: preferred.t } : {}) });
}

if (metadata.length !== Object.keys(paths).length || metadata.some((entry) => entry.t !== 'f' && entry.t !== 'o')) {
  throw new Error('Unexpected bootstrap icon metadata; cannot compact it safely');
}
const filledIds = metadata.filter((entry) => entry.t === 'f').map((entry) => entry.id);
const source = [
  '/* Minimal startup paths for preset badges and preset action tiles. */',
  `window.__MACRO_ICON_BOOTSTRAP__ = { d: ${JSON.stringify(paths)}, l: [] };`,
  `const filledBootstrapIcons = new Set(${JSON.stringify(filledIds)});`,
  "window.__MACRO_ICON_BOOTSTRAP__.l = Object.keys(window.__MACRO_ICON_BOOTSTRAP__.d).map(id => ({ id, t: filledBootstrapIcons.has(id) ? 'f' : 'o' }));",
  'window.__MACRO_ICONS__ = window.__MACRO_ICONS__ || { d: {}, l: [] };',
  'Object.assign(window.__MACRO_ICONS__.d, window.__MACRO_ICON_BOOTSTRAP__.d);',
  'window.__MACRO_ICONS__.l.push(...window.__MACRO_ICON_BOOTSTRAP__.l);',
  '',
].join('\n');
writeFileSync(path.join(root, 'public/icon-bootstrap.js'), source);
console.log(
  `Wrote ${Object.keys(paths).length} startup paths and ${metadata.length} metadata rows ` +
    `(${Buffer.byteLength(source)} bytes) for ${requiredIconIds.size} preset icon IDs.`
);
