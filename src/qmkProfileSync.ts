import { viaKeycodeToAction, type ViaAction, type ViaConfiguration } from './qmkViaBridge';

export type PresetOperatingSystem = 'mac' | 'win';

interface BindingEntry {
  binding?: string;
  label?: string;
  actionType?: string;
  execution?: unknown;
}

interface EncoderBindingEntry extends BindingEntry {
  encoderActions?: Partial<Record<'cw' | 'press' | 'ccw', BindingEntry>>;
}

interface ParsedBinding {
  action: ViaAction | null;
  warning?: string;
}

const KEY_SLOTS = [
  'r1c1', 'r1c2', 'r1c3',
  'r2c1', 'r2c2', 'r2c3',
  'r3c1', 'r3c2', 'r3c3',
] as const;

const MODIFIER_ALIASES: Record<string, string> = {
  ctrl: 'CONTROL',
  control: 'CONTROL',
  shift: 'SHIFT',
  alt: 'ALT',
  option: 'ALT',
  opt: 'ALT',
  win: 'GUI',
  windows: 'GUI',
  super: 'GUI',
  meta: 'GUI',
  'right ctrl': 'RIGHT_CONTROL',
  right_control: 'RIGHT_CONTROL',
  'right shift': 'RIGHT_SHIFT',
  right_shift: 'RIGHT_SHIFT',
  'right alt': 'RIGHT_ALT',
  right_alt: 'RIGHT_ALT',
  'right win': 'RIGHT_GUI',
  right_gui: 'RIGHT_GUI',
  gui: 'GUI',
};

const KEY_ALIASES: Record<string, string> = {
  enter: 'ENTER',
  return: 'ENTER',
  esc: 'ESCAPE',
  escape: 'ESCAPE',
  back: 'BACKSPACE',
  backspace: 'BACKSPACE',
  tab: 'TAB',
  space: 'SPACEBAR',
  spacebar: 'SPACEBAR',
  spc: 'SPACEBAR',
  delete: 'DELETE',
  del: 'DELETE',
  insert: 'INSERT',
  home: 'HOME',
  end: 'END',
  'page up': 'PAGE_UP',
  pageup: 'PAGE_UP',
  'page down': 'PAGE_DOWN',
  pagedown: 'PAGE_DOWN',
  '→': 'RIGHT_ARROW',
  '←': 'LEFT_ARROW',
  '↓': 'DOWN_ARROW',
  '↑': 'UP_ARROW',
  right: 'RIGHT_ARROW',
  left: 'LEFT_ARROW',
  down: 'DOWN_ARROW',
  up: 'UP_ARROW',
  lock: 'CAPS_LOCK',
  'caps lock': 'CAPS_LOCK',
  'scroll lock': 'SCROLL_LOCK',
  'locking scroll lock': 'SCROLL_LOCK',
  'num lock': 'KEYPAD_NUMLOCK',
  'print screen': 'PRINT_SCREEN',
  pause: 'PAUSE',
  'num enter': 'KEYPAD_ENTER',
  '-': 'MINUS',
  '=': 'EQUALS',
  '[': 'LEFT_BRACKET',
  ']': 'RIGHT_BRACKET',
  '\\': 'BACKSLASH',
  ';': 'SEMICOLON',
  "'": 'QUOTE',
  '`': 'GRAVE_ACCENT',
  ',': 'COMMA',
  '.': 'PERIOD',
  '/': 'FORWARD_SLASH',
  nuhs: 'POUND',
  '*': 'KEYPAD_ASTERISK',
  'num .': 'KEYPAD_PERIOD',
  'num +': 'KEYPAD_PLUS',
  'num -': 'KEYPAD_MINUS',
};

const DIRECT_QMK_KEY_NAMES = new Set([
  'ENTER', 'ESCAPE', 'BACKSPACE', 'TAB', 'SPACEBAR', 'MINUS', 'EQUALS', 'LEFT_BRACKET',
  'RIGHT_BRACKET', 'BACKSLASH', 'POUND', 'SEMICOLON', 'QUOTE', 'GRAVE_ACCENT', 'COMMA',
  'PERIOD', 'FORWARD_SLASH', 'CAPS_LOCK', 'PRINT_SCREEN', 'SCROLL_LOCK', 'PAUSE', 'INSERT',
  'HOME', 'PAGE_UP', 'DELETE', 'END', 'PAGE_DOWN', 'RIGHT_ARROW', 'LEFT_ARROW', 'DOWN_ARROW',
  'UP_ARROW', 'KEYPAD_NUMLOCK', 'KEYPAD_SLASH', 'KEYPAD_ASTERISK', 'KEYPAD_MINUS',
  'KEYPAD_PLUS', 'KEYPAD_ENTER', 'KEYPAD_PERIOD', 'KEYPAD_EQUAL',
]);

const SYMBOL_MODIFIERS: Record<string, string> = {
  '⌘': 'CMD',
  '⇧': 'SHIFT',
  '⌥': 'ALT',
  '⌃': 'CONTROL',
};

const MEDIA_ACTIONS: Record<string, string> = {
  mute: 'MUTE',
  'volume +': 'VOLUME_INCREMENT',
  'volume -': 'VOLUME_DECREMENT',
  'next track': 'SCAN_NEXT_TRACK',
  'previous track': 'SCAN_PREVIOUS_TRACK',
  'media stop': 'STOP',
  stop: 'STOP',
  play: 'PLAY_PAUSE',
  'play/pause': 'PLAY_PAUSE',
  'fast forward': 'FAST_FORWARD',
  rewind: 'REWIND',
  'bright up': 'BRIGHTNESS_INCREMENT',
  'brightness up': 'BRIGHTNESS_INCREMENT',
  'brightness +': 'BRIGHTNESS_INCREMENT',
  'bright down': 'BRIGHTNESS_DECREMENT',
  'brightness down': 'BRIGHTNESS_DECREMENT',
  'brightness -': 'BRIGHTNESS_DECREMENT',
};

const BLANK_ENCODER_ACTION: BindingEntry = { label: '', binding: 'blank' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function basicKeyName(value: string): string | null {
  const key = normalizeKey(value);
  if (!key) return null;
  if (KEY_ALIASES[key]) return KEY_ALIASES[key];
  const canonical = key.toUpperCase();
  if (DIRECT_QMK_KEY_NAMES.has(canonical) || /^KEYPAD_[0-9]$/.test(canonical)) return canonical;
  if (/^[a-z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) {
    return ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'][Number(key)];
  }
  const functionKey = key.match(/^f(\d{1,2})$/);
  if (functionKey && Number(functionKey[1]) >= 1 && Number(functionKey[1]) <= 24) {
    return `F${functionKey[1]}`;
  }
  return null;
}

function platformCommand(os: PresetOperatingSystem): string {
  return os === 'mac' ? 'GUI' : 'CONTROL';
}

function modifierName(value: string, os: PresetOperatingSystem): string | null {
  const key = normalizeKey(value);
  if (key === 'cmd' || key === 'command' || key === 'mod') return platformCommand(os);
  return MODIFIER_ALIASES[key] ?? null;
}

function parseShortcut(value: string, os: PresetOperatingSystem): string[] | null {
  const normalized = normalizeKey(value);
  if (!normalized) return null;

  const standaloneModifier = modifierName(normalized, os);
  if (standaloneModifier) return [standaloneModifier];
  const standaloneKey = basicKeyName(normalized);
  if (standaloneKey) return [standaloneKey];
  if (normalized === '+') return ['KEYPAD_PLUS'];

  const keys: string[] = [];
  for (const token of value.split('+')) {
    const clean = normalizeKey(token);
    if (!clean) continue;
    const key = modifierName(clean, os) ?? basicKeyName(clean);
    if (!key) return null;
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.length > 0 && keys.length <= 6 ? keys : null;
}

function parseGlyphShortcut(value: string, os: PresetOperatingSystem): string[] | null {
  const characters = [...value.trim()];
  const modifiers: string[] = [];
  let index = 0;
  while (index < characters.length && SYMBOL_MODIFIERS[characters[index]]) {
    const symbol = SYMBOL_MODIFIERS[characters[index]];
    const modifier = symbol === 'CMD' ? platformCommand(os) : symbol;
    if (!modifiers.includes(modifier)) modifiers.push(modifier);
    index += 1;
  }
  if (modifiers.length === 0) return null;
  const key = basicKeyName(characters.slice(index).join(''));
  return key ? [...modifiers, key] : null;
}

function parseBinding(
  binding: string,
  label: string,
  actionType: string,
  os: PresetOperatingSystem
): ParsedBinding {
  const clean = binding.replace(/\s+/g, ' ').trim();
  if (!clean || normalizeKey(clean) === 'blank') return { action: null };

  const media = MEDIA_ACTIONS[normalizeKey(clean)];
  if (media) return { action: { t: 'media', c: media } };

  const macro = clean.match(/^(?:qmk\s+)?macro\s+([1-9]\d*)$/i);
  if (macro) {
    const index = Number(macro[1]) - 1;
    return index < 16
      ? { action: { t: 'macro', n: index } }
      : { action: null, warning: 'QMK macro index is outside the supported 1 to 16 range' };
  }

  const layer = clean.match(/^layer (\d)$/i);
  if (layer) return { action: { t: 'layer', op: 'set', n: Number(layer[1]) - 1 } };
  const temporaryLayer = clean.match(/^temp layer (\d)$/i);
  if (temporaryLayer) {
    return { action: { t: 'layer', op: 'hold', n: Number(temporaryLayer[1]) - 1 } };
  }
  if (actionType === 'Layer Cycle' || /layer\s*cycle/i.test(clean)) {
    return { action: { t: 'none' } };
  }

  // Profile keys and profile cycle run on desktop; hardware key is set to host-event mode (KC_NO)
  if (/^profile\s*\d+/i.test(clean) || /profile\s*cycle/i.test(clean)) {
    return { action: { t: 'none' } };
  }

  if (/cheat-?sheet/i.test(clean) || /cheat-?sheet/i.test(label)) {
    return { action: { t: 'none' } };
  }

  // Multiactions are handled by desktop gesture engine; device matrix is set to host-event mode (KC_NO)
  if (/multi/i.test(actionType) || /(?:onTap|doubleTap|onHold|tapHold):/i.test(clean)) {
    return { action: { t: 'none' } };
  }

  // Smart Actions run on desktop; device matrix is set to host-event mode (KC_NO)
  if (/smart/i.test(actionType) || /\((?:Text|Cmd|Web|App):/i.test(clean)) {
    return { action: { t: 'none' } };
  }

  const wrapped = clean.match(/^(.*?)\s*\((.*)\)\s*$/);
  const candidates = wrapped ? [wrapped[2], wrapped[1], clean] : [clean];
  for (const candidate of candidates) {
    const keys = parseShortcut(candidate, os);
    if (keys) return { action: { t: 'keys', k: keys } };
  }

  const glyphKeys = parseGlyphShortcut(label, os);
  if (glyphKeys) return { action: { t: 'keys', k: glyphKeys } };
  if (label.trim().length > 0 && label.trim().length <= 3) {
    const key = basicKeyName(label);
    if (key) return { action: { t: 'keys', k: [key] } };
  }

  return {
    action: null,
    warning: `"${clean}" has no key press the device can send yet`,
  };
}

function parseStructuredExecution(
  execution: unknown,
  os: PresetOperatingSystem,
): ParsedBinding | undefined {
  if (!isRecord(execution) || typeof execution.kind !== 'string') {
    return { action: null, warning: 'Structured execution data is invalid and cannot be sent to the device' };
  }

  if (execution.kind === 'shortcut') {
    const value = typeof execution.value === 'string' ? execution.value : '';
    return parseBinding(value, '', 'Shortcut', os);
  }

  if (execution.kind === 'sequence') {
    if (
      Array.isArray(execution.steps) &&
      execution.steps.length === 1 &&
      isRecord(execution.steps[0]) &&
      execution.steps[0].kind === 'key' &&
      (execution.steps[0].mode === undefined || execution.steps[0].mode === 'press-release') &&
      (execution.steps[0].delayAfterMs === undefined || execution.steps[0].delayAfterMs === 0)
    ) {
      const step = execution.steps[0];
      const value = typeof step.key === 'string' ? step.key : '';
      return parseBinding(value, '', 'Shortcut', os);
    }
    return {
      action: { t: 'none' },
      warning: 'Multi-step sequences cannot be represented by stock VIA keycodes',
    };
  }

  if (execution.kind === 'multi') {
    return {
      action: { t: 'none' },
      warning: 'Multiactions are handled by desktop software; hardware key is set to host-event mode',
    };
  }

  if (execution.kind === 'text') {
    return {
      action: { t: 'none' },
      warning: 'Text actions cannot be represented by a stock VIA keycode',
    };
  }

  if (execution.kind === 'smart') {
    return {
      action: { t: 'none' },
      warning: 'Smart Actions run on the desktop and are not executable by device firmware',
    };
  }

  return { action: null, warning: `Unsupported structured execution kind "${execution.kind}"` };
}

function readEntry(layer: unknown, slot: string): BindingEntry | undefined {
  if (!isRecord(layer)) return undefined;
  const value = layer[slot];
  if (!isRecord(value)) return undefined;
  return value as BindingEntry;
}

function readEncoderEntry(layer: unknown): EncoderBindingEntry | undefined {
  if (!isRecord(layer)) return undefined;
  const value = layer['dial-tl'];
  if (!isRecord(value)) return undefined;
  return value as EncoderBindingEntry;
}

function applyBinding(
  entry: BindingEntry,
  os: PresetOperatingSystem,
  layerNumber: number,
  location: string,
  warnings: string[]
): ViaAction | undefined {
  const cleanBinding = (entry.binding ?? '').trim();
  if (!cleanBinding || cleanBinding === 'blank' || entry.label === '—') {
    return { t: 'none' };
  }
  const parsed = entry.execution === undefined
    ? parseBinding(entry.binding ?? '', entry.label ?? '', entry.actionType ?? '', os)
    : parseStructuredExecution(entry.execution, os)!;
  if (parsed.warning) warnings.push(`Layer ${layerNumber} ${location}: ${parsed.warning}`);
  if (parsed.action) return parsed.action;
  return parsed.warning ? undefined : { t: 'none' };
}

export interface ImportedViaBinding {
  label: string;
  binding: string;
  actionType: 'Basic input' | 'Shortcut';
}

/** Convert a stock VIA keycode to an editor binding, or null when it is not losslessly representable. */
export function viaKeycodeToProfileBinding(keycode: number): ImportedViaBinding | null {
  const action = viaKeycodeToAction(keycode);
  if (!action) return null;
  if (action.t === 'none') return { label: '', binding: 'blank', actionType: 'Basic input' };

  let binding: string;
  if (action.t === 'keys' && Array.isArray(action.k) && action.k.length) {
    binding = action.k.join(' + ');
  } else if (action.t === 'media' && action.c) {
    const names: Record<string, string> = {
      MUTE: 'mute', VOLUME_INCREMENT: 'volume +', VOLUME_DECREMENT: 'volume -',
      SCAN_NEXT_TRACK: 'next track', SCAN_PREVIOUS_TRACK: 'previous track', STOP: 'stop',
      PLAY_PAUSE: 'play', FAST_FORWARD: 'fast forward', REWIND: 'rewind',
      BRIGHTNESS_INCREMENT: 'bright up', BRIGHTNESS_DECREMENT: 'bright down',
    };
    binding = names[action.c];
    if (!binding) return null;
  } else if (action.t === 'layer' && Number.isInteger(action.n) && action.n! >= 0 && action.n! < 8) {
    binding = action.op === 'set'
      ? `Layer ${action.n! + 1}`
      : action.op === 'hold'
        ? `Temp Layer ${action.n! + 1}`
        : '';
    if (!binding) return null;
  } else if (action.t === 'macro' && Number.isInteger(action.n) && action.n! >= 0 && action.n! < 16) {
    binding = `QMK Macro ${action.n! + 1}`;
  } else {
    return null;
  }

  return { label: binding, binding, actionType: 'Shortcut' };
}

/** Build the stock VIA keycode/encoder payload without modifying local profile data. */
export function buildViaConfiguration(
  profile: unknown,
  os: PresetOperatingSystem
): { config: ViaConfiguration; warnings: string[] } {
  const sourceLayers = isRecord(profile) && Array.isArray(profile.layers)
    ? profile.layers.slice(0, 8)
    : [];
  const warnings: string[] = [];
  const layers = sourceLayers.map((sourceLayer, layerIndex) => {
    const keys: Record<string, ViaAction> = {};
    for (const slot of KEY_SLOTS) {
      const entry = readEntry(sourceLayer, slot);
      if (!entry) continue;
      const action = applyBinding(entry, os, layerIndex + 1, slot.toUpperCase(), warnings);
      if (action) keys[slot] = action;
    }

    const encoder: Record<string, ViaAction> = {};
    const encoderEntry = readEncoderEntry(sourceLayer);
    for (const direction of ['cw', 'press', 'ccw'] as const) {
      const entry = encoderEntry?.encoderActions?.[direction] ?? BLANK_ENCODER_ACTION;
      const action = applyBinding(
        entry,
        os,
        layerIndex + 1,
        `dial ${direction.toUpperCase()}`,
        warnings
      );
      if (action) encoder[direction] = action;
    }
    return { keys, enc: encoder };
  });

  return { config: { version: 1, layers }, warnings };
}
