import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type IconLibrary = {
  d: Record<string, string>;
  l: Array<{ id: string; k?: string; t?: string }>;
};

type PresetBrandIconData = Pick<IconLibrary, 'd' | 'l'>;

export function parseAssignedJson<T>(source: string, assignment: string): T {
  const assignmentIndex = source.indexOf(assignment);
  if (assignmentIndex < 0) throw new Error(`Missing ${assignment} in preset icon data`);

  const valueStart = assignmentIndex + assignment.length;
  const terminator = /;\r?\n/.exec(source.slice(valueStart));
  if (!terminator) throw new Error(`Unterminated ${assignment} in preset icon data`);

  return JSON.parse(source.slice(valueStart, valueStart + terminator.index)) as T;
}

const iconSource = readFileSync(join(process.cwd(), 'public/icons-data.js'), 'utf8');
const iconJson = iconSource.slice(iconSource.indexOf('=') + 1, iconSource.lastIndexOf(';'));
const iconLibrary = JSON.parse(iconJson) as IconLibrary;
const bootstrapIconScript = readFileSync(join(process.cwd(), 'public/icon-bootstrap.js'), 'utf8');
export const iconBootstrapData = parseAssignedJson<PresetBrandIconData>(
  bootstrapIconScript,
  'window.__MACRO_ICON_BOOTSTRAP__ = '
);
const brandIconScript = readFileSync(join(process.cwd(), 'public/preset-brand-icons.js'), 'utf8');
export const presetBrandIconData = parseAssignedJson<PresetBrandIconData>(
  brandIconScript,
  'window.__PRESET_BRAND_ICON_DATA__ = '
);

const allPresetIcons: IconLibrary = {
  d: { ...iconLibrary.d, ...presetBrandIconData.d },
  l: [...iconLibrary.l, ...presetBrandIconData.l],
};

export const PRESET_BRAND_ICON_IDS = [
  'brand-openai', 'brand-vscode', 'brand-github', 'terminal', 'brand-docker', 'brand-chrome',
  'brand-adobe-photoshop', 'brand-adobe-illustrator', 'brand-adobe-premiere',
  'brand-adobe-after-effects', 'brand-davinciresolve', 'brand-blender', 'brand-figma',
  'brand-framer', 'brand-canva', 'brand-audacity', 'brand-affinity',
  'brand-microsoft-excel', 'brand-microsoft-word', 'brand-microsoft-powerpoint',
  'brand-notion', 'brand-slack', 'brand-zoom', 'brand-obsstudio', 'brand-discord',
  'brand-spotify', 'brand-windows',
] as const;

export const presetBrandIconPaths = Object.fromEntries(
  PRESET_BRAND_ICON_IDS.map((iconId) => {
    const iconPath = allPresetIcons.d[iconId];
    if (!iconPath) throw new Error(`Missing local vector path for preset badge ${iconId}`);
    return [iconId, iconPath];
  })
);
