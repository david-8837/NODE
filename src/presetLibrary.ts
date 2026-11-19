import {
  GRID_MACRO_ENCODER_SLOT,
  GRID_MACRO_KEY_SLOTS,
  type GridMacroSlotId,
} from './deviceLayout';
import type { DesktopExecutionDefinition } from './actionExecution';
import { PRESET_CATALOG } from './presetCatalog';

export type KeySlotId = GridMacroSlotId;
export type MappingTabId = 'Basic' | 'Action' | 'Multi-A' | 'Smart-A';
export type EncoderSubActionId = 'cw' | 'press' | 'ccw';

export interface EncoderSubBinding {
  label: string;
  binding: string;
  execution?: DesktopExecutionDefinition;
}

export const BLANK_ENCODER_ACTIONS: Record<EncoderSubActionId, EncoderSubBinding> = {
  cw: { label: '', binding: 'blank' },
  press: { label: '', binding: 'blank' },
  ccw: { label: '', binding: 'blank' },
};

export interface KeyAssignment {
  label: string;
  actionType:
    | 'Basic input'
    | 'Shortcut'
    | 'Multi-step action'
    | 'Smart Action'
    | 'Layer Cycle';
  binding: string;
  iconId?: string;
  actionId?: string;
  color?: string;
  customLegend?: string;
  subLegend?: string;
  keycapColor?: string;
  execution?: DesktopExecutionDefinition;
  encoderActions?: Record<EncoderSubActionId, EncoderSubBinding>;
}

export type LayerKeymap = Record<KeySlotId, KeyAssignment> & { presetId?: string };

export function formatEncoderShortLabel(text: string): string {
  const clean = text.trim();
  if (!clean) return '—';
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 2).toLowerCase()}...`;
}

export function getEncoderActions(
  assignment: KeyAssignment
): Record<EncoderSubActionId, EncoderSubBinding> {
  return assignment.encoderActions || BLANK_ENCODER_ACTIONS;
}

export interface ProfileData {
  id: string;
  name: string;
  color: string;
  layers: LayerKeymap[];
}

export function isPresetInstalledInProfile(profile: ProfileData, presetId: string): boolean {
  const preset = PRESET_CATALOG.find((entry) => entry.id === presetId);
  const actionIdPrefix = `preset-${presetId}-`;
  const minimumLegacyKeyMatches = Math.max(
    2,
    (preset?.keys.length ?? GRID_MACRO_KEY_SLOTS.length) - 1
  );

  return profile.layers.some((layer) => {
    if (layer.presetId === presetId) return true;

    const matchingKeyCount = GRID_MACRO_KEY_SLOTS.filter((slot) =>
      layer[slot]?.actionId?.startsWith(actionIdPrefix)
    ).length;
    const hasLegacyDialSignature =
      preset !== undefined &&
      layer[GRID_MACRO_ENCODER_SLOT]?.binding === `${preset.title} Dial`;

    return (
      matchingKeyCount > 0 &&
      (hasLegacyDialSignature || matchingKeyCount >= minimumLegacyKeyMatches)
    );
  });
}

export interface BasicTileItem {
  id: string;
  top?: string;
  main: string;
  listLabel?: string;
  macropadLabel: string;
  isClearIcon?: boolean;
  arrowDir?: 'right' | 'left' | 'down' | 'up';
  iconId?: string;
  emoji?: string;
  execution?: DesktopExecutionDefinition;
}

export type CustomItemsByTab = Record<Exclude<MappingTabId, 'Basic'>, BasicTileItem[]>;

export interface PresetItem {
  id: string;
  title: string;
  description: string;
  author: string;
  hasPreview: boolean;
  color: string;
  layerKeymap: LayerKeymap;
  actionItems: CustomItemsByTab;
}

export const INITIAL_LAYER_1: LayerKeymap = {
  'dial-tl': {
    label: '',
    actionType: 'Basic input',
    binding: 'blank',
    encoderActions: BLANK_ENCODER_ACTIONS,
  },
  r1c1: { label: '', actionType: 'Basic input', binding: 'blank' },
  r1c2: { label: '', actionType: 'Basic input', binding: 'blank' },
  r1c3: { label: '', actionType: 'Basic input', binding: 'blank' },
  r2c1: { label: '', actionType: 'Basic input', binding: 'blank' },
  r2c2: { label: '', actionType: 'Basic input', binding: 'blank' },
  r2c3: { label: '', actionType: 'Basic input', binding: 'blank' },
  r3c1: { label: '', actionType: 'Basic input', binding: 'blank' },
  r3c2: { label: '', actionType: 'Basic input', binding: 'blank' },
  r3c3: { label: '', actionType: 'Basic input', binding: 'blank' },
};

export const PRESET_MACROPAD_LABELS: Record<string, string> = {
  Duplicate: 'Dupl.',
  Rectangle: 'Rect',
  Eyedropper: 'Eyedrop',
  Instructions: 'Instr.',
  Shortcuts: 'Keys',
  Component: 'Comp.',
  Transform: 'Xform',
};

export const PRESET_DIAL_LABELS: Record<string, string> = {
  'Scroll Down': 'dn',
  Latest: 'end',
  'Scroll Up': 'up',
  'Zoom In': 'zo+',
  'Zoom Fit': 'fit',
  'Zoom Out': 'zo-',
  Fit: 'fit',
  'Fit Screen': 'fit',
  'Brush +': 'br+',
  'Brush -': 'br-',
  'Next Frame': 'nxt',
  Play: 'ply',
  'Prev Frame': 'prv',
  Redo: 'rdo',
  Undo: 'und',
  'View Selected': 'sel',
};

export const ROTARY_PAIRS: Record<string, string> = {
  'volume up': 'Volume Down',
  'volume down': 'Volume Up',
  'volume +': 'volume -',
  'volume -': 'volume +',
  'zoom in': 'Zoom Out',
  'zoom out': 'Zoom In',
  'redo': 'Undo',
  'undo': 'Redo',
  'scroll up': 'Scroll Down',
  'scroll down': 'Scroll Up',
  'wheel up': 'Wheel Down',
  'wheel down': 'Wheel Up',
  'next tab': 'Prev Tab',
  'prev tab': 'Next Tab',
  'previous tab': 'Next Tab',
  'brush +': 'Brush -',
  'brush -': 'Brush +',
  'next frame': 'Prev Frame',
  'prev frame': 'Next Frame',
  'arrow up': 'Arrow Down',
  'arrow down': 'Arrow Up',
  'arrow right': 'Arrow Left',
  'arrow left': 'Arrow Right',
  'page up': 'Page Down',
  'page down': 'Page Up',
  'right': 'Left',
  'left': 'Right',
  'up': 'Down',
  'down': 'Up',
};

export function isActionAllowedOnEncoderRotation(item: {
  actionType?: string;
  execution?: { kind?: string; actionType?: string } | null;
  binding?: string;
}): { allowed: boolean; reason?: string } {
  if (item.execution) {
    if (item.execution.kind === 'multi') {
      return { allowed: false, reason: 'Multi-actions cannot be assigned to rotary rotation (CW/CCW)' };
    }
    if (item.execution.kind === 'smart') {
      return { allowed: false, reason: 'Smart actions (Apps, text blocks, commands) cannot be assigned to rotary rotation (CW/CCW)' };
    }
  }
  if (item.actionType === 'Multi-step action') {
    return { allowed: false, reason: 'Multi-actions cannot be assigned to rotary rotation (CW/CCW)' };
  }
  if (item.actionType === 'Smart Action') {
    return { allowed: false, reason: 'Smart actions cannot be assigned to rotary rotation (CW/CCW)' };
  }
  if (item.binding && /^MO\(\d+\)$/i.test(item.binding)) {
    return { allowed: false, reason: 'Momentary layer switch (MO) requires holding a key down and cannot be used on rotation' };
  }
  return { allowed: true };
}

export const PRESET_SINGLE_MODIFIERS = new Set([
  'win', 'ctrl', 'alt', 'shift', 'cmd', 'option', 'command', 'control', 'super',
]);

export function formatPresetSequence(sequence: string, os: 'mac' | 'win'): string {
  return sequence
    .split('+')
    .map((key) => key === 'Mod' ? (os === 'mac' ? 'Cmd' : 'Ctrl') : key)
    .join(' + ');
}

export function isPresetShortcut(sequence: string): boolean {
  const clean = sequence.trim();
  if (!clean || PRESET_SINGLE_MODIFIERS.has(clean.toLowerCase())) return false;
  return clean.includes('+') || clean.includes(' ') || clean.toLowerCase().includes('mod+');
}

export function isPresetSingleKey(value: string): boolean {
  const clean = value.trim().toLowerCase();
  const singleSymbols = new Set([
    '`', '~', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=',
    '[', ']', '{', '}', '\\', '|', ';', ':', "'", '"', ',', '.', '<', '>', '/', '?',
  ]);
  return Boolean(
    PRESET_SINGLE_MODIFIERS.has(clean) ||
      /^(?:[a-z0-9]|f(?:[1-9]|1[0-2])|numpad (?:[0-9]|\.))$/.test(clean) ||
      /^(?:enter|return|tab|space|space bar|esc|escape|backspace|delete|del|insert|home|end|page up|page down|up|down|left|right|caps lock|num lock|scroll lock|volume up|volume down|media mute|media play \/ pause)$/.test(clean) ||
      (value.trim().length === 1 && singleSymbols.has(value.trim()))
  );
}

export function getPresetExecution(sequence: string, os: 'mac' | 'win'): DesktopExecutionDefinition {
  const formatted = formatPresetSequence(sequence, os).trim();
  const keys = formatted.split('+').map((key) => key.trim()).filter(Boolean);
  if (keys.length > 1) {
    const nonModifiers = keys.filter((key) => !PRESET_SINGLE_MODIFIERS.has(key.toLowerCase()));
    if (nonModifiers.length > 1) {
      return {
        kind: 'sequence',
        steps: keys.map((key) => ({ kind: 'key', key, mode: 'press-release' })),
      };
    }
    return { kind: 'shortcut', value: formatted };
  }
  return isPresetSingleKey(sequence)
    ? { kind: 'shortcut', value: formatted }
    : { kind: 'text', value: sequence };
}

function makePresetActionItem(
  id: string,
  name: string,
  binding: string,
  iconId: string,
  execution?: DesktopExecutionDefinition
): BasicTileItem {
  return {
    id,
    main: name,
    listLabel: binding,
    macropadLabel: PRESET_MACROPAD_LABELS[name] ?? name,
    iconId,
    execution,
  };
}

export function buildPresetLibrary(os: 'mac' | 'win'): PresetItem[] {
  return PRESET_CATALOG.map((preset) => {
    const actionItems: CustomItemsByTab = {
      Action: [],
      'Multi-A': [],
      'Smart-A': [],
    };
    const keyAssignments = {} as Pick<LayerKeymap, (typeof GRID_MACRO_KEY_SLOTS)[number]>;

    preset.keys.forEach((action, index) => {
      const slot = GRID_MACRO_KEY_SLOTS[index];
      if (!slot) return;

      const itemId = `preset-${preset.id}-${slot}`;
      const iconId = action.iconId ?? 'sparkles';
      const shortName = PRESET_MACROPAD_LABELS[action.name] ?? action.name;
      let actionType: KeyAssignment['actionType'];
      let label: string;
      let binding: string;
      let execution: DesktopExecutionDefinition;

      if (action.multi) {
        actionType = 'Multi-step action';
        label = shortName;
        const onTap = formatPresetSequence(action.multi.onTap, os);
        const doubleTap = action.multi.doubleTap
          ? formatPresetSequence(action.multi.doubleTap, os)
          : '';
        binding = `${action.name} (onTap: ${onTap}${doubleTap ? `, doubleTap: ${doubleTap}` : ''})`;
        execution = {
          kind: 'multi',
          gestures: {
            onTap,
            ...(doubleTap ? { doubleTap } : {}),
          },
        };
        actionItems['Multi-A'].push(
          makePresetActionItem(itemId, action.name, binding, iconId, execution)
        );
      } else {
        execution = getPresetExecution(action.keys, os);
        if (isPresetShortcut(action.keys)) {
          const lowerName = action.name.toLowerCase();
          const isSmartAction =
            lowerName.includes('prompt') ||
            lowerName.includes('ai') ||
            lowerName.includes('smart') ||
            lowerName.includes('auto') ||
            lowerName.includes('instruction');
          actionType = isSmartAction ? 'Smart Action' : 'Shortcut';
          label = shortName;
          binding = `${action.name} (${formatPresetSequence(action.keys, os)})`;
          actionItems[isSmartAction ? 'Smart-A' : 'Action'].push(
            makePresetActionItem(itemId, action.name, binding, iconId, execution)
          );
        } else {
          actionType = 'Basic input';
          label = action.keys.length <= 3 ? action.keys.toUpperCase() : action.keys;
          binding = `${action.name} (${action.keys})`;
        }
      }

      keyAssignments[slot] = {
        label,
        actionType,
        binding,
        iconId,
        actionId: itemId,
        color: preset.color,
        execution,
      };
    });

    const encoderActions = Object.fromEntries(
      (['cw', 'press', 'ccw'] as const).map((direction) => {
        const action = preset.dial[direction];
        return [direction, {
          label: PRESET_DIAL_LABELS[action.name] ?? formatEncoderShortLabel(action.name),
          binding: `${action.name} (${formatPresetSequence(action.keys, os)})`,
          execution: getPresetExecution(action.keys, os),
        }];
      })
    ) as Record<EncoderSubActionId, EncoderSubBinding>;

    return {
      id: preset.id,
      title: preset.title,
      description: preset.description,
      author: preset.author,
      hasPreview: preset.hasPreview,
      color: preset.color,
      layerKeymap: {
        [GRID_MACRO_ENCODER_SLOT]: {
          label: preset.title,
          actionType: 'Shortcut',
          binding: `${preset.title} Dial`,
          color: preset.color,
          encoderActions,
        },
        ...keyAssignments,
      },
      actionItems,
    };
  });
}

export const PRESET_LIBRARY = buildPresetLibrary('win');

export function formatCustomTileText(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const line1 = words[0].length > 7 ? `${words[0].slice(0, 5)}..` : words[0];
    const rest = words.slice(1).join(' ');
    const line2 = rest.length > 6 ? `${rest.slice(0, 5)}..` : rest;
    return `${line1}\n${line2}`;
  }
  const single = words[0] || 'Action';
  return single.length > 7 ? `${single.slice(0, 5)}..` : single;
}

export interface CustomItemGroup {
  id: string;
  title: string;
  presetId?: string;
  presetColor?: string;
  items: BasicTileItem[];
}

export function groupCustomItemsByPreset(
  items: BasicTileItem[],
  customGroupTitle: string
): CustomItemGroup[] {
  const groups = new Map<string, CustomItemGroup>();

  items.forEach((item) => {
    const preset = PRESET_CATALOG.find((entry) => item.id.startsWith(`preset-${entry.id}-`));
    const groupId = preset ? `preset-${preset.id}` : 'custom';
    const existingGroup = groups.get(groupId);

    if (existingGroup) {
      existingGroup.items.push(item);
      return;
    }

    groups.set(groupId, {
      id: groupId,
      title: preset?.title ?? customGroupTitle,
      presetId: preset?.id,
      presetColor: preset?.color,
      items: [item],
    });
  });

  return [...groups.values()].sort((left, right) => {
    if (!left.presetId && right.presetId) return -1;
    if (left.presetId && !right.presetId) return 1;
    return 0;
  });
}
