import { referencesAtOrAfter } from './referenceSafety';
import { cheatSheetCommand } from './cheatSheet';
import type { ViaAction, ViaConfiguration, ViaKeymapSnapshot } from './qmkViaBridge';
import {
  INITIAL_LAYER_1,
  type LayerKeymap,
  type ProfileData,
  type KeyAssignment,
} from './presetLibrary';

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
  'right shift': 'RIGHT_SHIFT',
  'right alt': 'RIGHT_ALT',
  'right win': 'RIGHT_GUI',
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
  'right arrow': 'RIGHT_ARROW',
  'left arrow': 'LEFT_ARROW',
  'down arrow': 'DOWN_ARROW',
  'up arrow': 'UP_ARROW',
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
  'num /': 'KEYPAD_SLASH',
  'num *': 'KEYPAD_ASTERISK',
  'num =': 'KEYPAD_EQUAL',
  'num ,': 'KEYPAD_COMMA',
  'num 0': 'KEYPAD_0',
  'num 1': 'KEYPAD_1',
  'num 2': 'KEYPAD_2',
  'num 3': 'KEYPAD_3',
  'num 4': 'KEYPAD_4',
  'num 5': 'KEYPAD_5',
  'num 6': 'KEYPAD_6',
  'num 7': 'KEYPAD_7',
  'num 8': 'KEYPAD_8',
  'num 9': 'KEYPAD_9',
  'num .': 'KEYPAD_PERIOD',
  'num +': 'KEYPAD_PLUS',
  'num -': 'KEYPAD_MINUS',
};

const SYMBOL_MODIFIERS: Record<string, string> = {
  '⌘': 'CMD',
  '⇧': 'SHIFT',
  '⌥': 'ALT',
  '⌃': 'CONTROL',
};

const MEDIA_ACTIONS: Record<string, string> = {
  'power down': 'SYSTEM_POWER',
  sleep: 'SYSTEM_SLEEP',
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
  if (normalized === '+') return ['SHIFT', 'EQUALS'];
  if (normalized === '*') return ['SHIFT', 'EIGHT'];

  const keys: string[] = [];
  const tokens = value.replace(/num\s*\+/gi, 'num __plus__').split('+').map((token) => token.replace(/__plus__/gi, '+'));
  for (const token of tokens) {
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

  const profileMatch = clean.match(/^profile ([1-4])$/i);
  if (profileMatch) {
    return { action: { t: 'profile', n: Number(profileMatch[1]) - 1 } };
  }

  const layer = clean.match(/^layer (\d)$/i);
  if (layer) return { action: { t: 'layer', op: 'set', n: Number(layer[1]) - 1 } };
  const temporaryLayer = clean.match(/^temp layer (\d)$/i);
  if (temporaryLayer) {
    return { action: { t: 'layer', op: 'hold', n: Number(temporaryLayer[1]) - 1 } };
  }
  if (actionType === 'Layer Cycle') return { action: { t: 'layer', op: 'next' } };

  const offlineMulti = tryParseOfflineMultiBindingString(clean, os);
  if (offlineMulti) return { action: offlineMulti };

  const onTap = clean.match(/onTap:\s*([^,)]+)/i);
  if (onTap) {
    const keys = parseShortcut(onTap[1], os);
    if (keys) return { action: { t: 'keys', k: keys } };
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

function tryBuildOfflineTapHoldAction(
  onTapRaw: string,
  onHoldRaw: string,
  os: PresetOperatingSystem
): ViaAction | null {
  const tapClean = onTapRaw.trim();
  const holdClean = onHoldRaw.trim();
  if (!tapClean || !holdClean) return null;

  const tapKey = basicKeyName(tapClean);
  if (!tapKey) return null;

  const holdMod = modifierName(holdClean, os);
  if (holdMod) {
    return { t: 'mod_tap', mod: holdMod, key: tapKey };
  }

  const holdLayerMatch = holdClean.match(/^(?:temp\s+)?layer\s+([1-4])$/i);
  if (holdLayerMatch) {
    return { t: 'layer_tap', layer: Number(holdLayerMatch[1]) - 1, key: tapKey };
  }

  return null;
}

function tryParseOfflineMultiBindingString(
  binding: string,
  os: PresetOperatingSystem
): ViaAction | null {
  if (/(doubleTap|tapHold):\s*([^,)]+)/i.test(binding)) return null;
  const onTapMatch = binding.match(/onTap:\s*([^,)]+)/i);
  const onHoldMatch = binding.match(/onHold:\s*([^,)]+)/i);
  if (!onTapMatch || !onHoldMatch) return null;
  return tryBuildOfflineTapHoldAction(onTapMatch[1], onHoldMatch[1], os);
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
      action: null,
      warning: 'Multi-step sequences cannot be represented by stock VIA keycodes',
    };
  }

  if (execution.kind === 'multi') {
    const gestures = isRecord(execution.gestures) ? execution.gestures : {};
    const onTap = typeof gestures.onTap === 'string' ? gestures.onTap.trim() : '';
    const onHold = typeof gestures.onHold === 'string' ? gestures.onHold.trim() : '';
    const doubleTap = typeof gestures.doubleTap === 'string' ? gestures.doubleTap.trim() : '';
    const tapHold = typeof gestures.tapHold === 'string' ? gestures.tapHold.trim() : '';

    if (onTap && onHold && !doubleTap && !tapHold) {
      const offlineAction = tryBuildOfflineTapHoldAction(onTap, onHold, os);
      if (offlineAction) {
        return { action: offlineAction };
      }
    }

    const parsed = onTap
      ? parseBinding(onTap, '', 'Shortcut', os)
      : { action: null, warning: 'This multiaction has no onTap keycode for the device' };
    const additionalGestures = ['doubleTap', 'onHold', 'tapHold']
      .filter((gesture) => typeof gestures[gesture] === 'string' && (gestures[gesture] as string).trim());
    if (additionalGestures.length) {
      const suffix = `Stock VIA can send onTap only; ${additionalGestures.join(', ')} ${additionalGestures.length === 1 ? 'gesture is' : 'gestures are'} not available on the device`;
      parsed.warning = parsed.warning ? `${parsed.warning}; ${suffix}` : suffix;
    }
    return parsed;
  }

  if (execution.kind === 'text') {
    return { action: null, warning: 'Text actions cannot be represented by a stock VIA keycode' };
  }

  if (execution.kind === 'smart') {
    return { action: null, warning: 'Smart Actions run on the desktop and are not executable by device firmware' };
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

export interface BuildViaConfigurationOptions {
  enableHostTriggers?: boolean;
  /** Number of configured profiles, when known by the caller. */
  profileCount?: number;
  layerCount?: number;
}

const SLOT_TRIGGER_INDEX: Record<string, number> = {
  r1c1: 0, r1c2: 1, r1c3: 2,
  r2c1: 3, r2c2: 4, r2c3: 5,
  r3c1: 6, r3c2: 7, r3c3: 8,
  cw: 9, press: 10, ccw: 11,
};

function isHostExecutableEntry(entry: BindingEntry, os: PresetOperatingSystem): boolean {
  if (cheatSheetCommand(entry.binding)) return true;
  const exec = entry.execution;
  if (isRecord(exec) && typeof exec.kind === 'string') {
    if (exec.kind === 'smart' || exec.kind === 'text' || exec.kind === 'sequence') {
      return true;
    }
    if (exec.kind === 'multi') {
      const gestures = isRecord(exec.gestures) ? exec.gestures : {};
      const onTap = typeof gestures.onTap === 'string' ? gestures.onTap.trim() : '';
      const onHold = typeof gestures.onHold === 'string' ? gestures.onHold.trim() : '';
      const doubleTap = typeof gestures.doubleTap === 'string' ? gestures.doubleTap.trim() : '';
      const tapHold = typeof gestures.tapHold === 'string' ? gestures.tapHold.trim() : '';
      if (onTap && onHold && !doubleTap && !tapHold && tryBuildOfflineTapHoldAction(onTap, onHold, os)) {
        return false;
      }
      return ['doubleTap', 'onHold', 'tapHold'].some(
        (g) => typeof gestures[g] === 'string' && (gestures[g] as string).trim().length > 0
      );
    }
  }
  const binding = entry.binding ?? '';
  if (/\((Web|App|Cmd|Text):\s*([^)]+)\)/i.test(binding)) return true;
  if (tryParseOfflineMultiBindingString(binding, os)) return false;
  if (/(doubleTap|onHold|tapHold):\s*([^,)]+)/i.test(binding)) return true;
  return false;
}

function applyBinding(
  entry: BindingEntry,
  os: PresetOperatingSystem,
  layerNumber: number,
  location: string,
  warnings: string[],
  slotId?: string,
  options?: BuildViaConfigurationOptions
): ViaAction | undefined {
  if ((options?.layerCount !== undefined && referencesAtOrAfter(entry, 'layer', options.layerCount)) ||
      (options?.profileCount !== undefined && referencesAtOrAfter(entry, 'profile', options.profileCount))) {
    warnings.push(`Layer ${layerNumber} ${location}: reference points to an unavailable layer or profile; cleared on device`);
    return { t: 'none' };
  }
  if (
    options?.enableHostTriggers &&
    layerNumber >= 1 &&
    layerNumber <= 4 &&
    slotId &&
    SLOT_TRIGGER_INDEX[slotId] !== undefined &&
    isHostExecutableEntry(entry, os)
  ) {
    return {
      t: 'host_trigger',
      layer: layerNumber - 1,
      slotIndex: SLOT_TRIGGER_INDEX[slotId],
    };
  }
  const parsed = entry.execution === undefined
    ? parseBinding(entry.binding ?? '', entry.label ?? '', entry.actionType ?? '', os)
    : parseStructuredExecution(entry.execution, os)!;
  if (parsed.warning) warnings.push(`Layer ${layerNumber} ${location}: ${parsed.warning}`);
  if (parsed.action) return parsed.action;
  return parsed.warning ? undefined : { t: 'none' };
}

/** Build the stock VIA keycode/encoder payload without modifying local profile data. */
export function buildViaConfiguration(
  profile: unknown,
  os: PresetOperatingSystem,
  options?: BuildViaConfigurationOptions
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
      const action = applyBinding(
        entry,
        os,
        layerIndex + 1,
        slot.toUpperCase(),
        warnings,
        slot,
        { ...options, layerCount: sourceLayers.length }
      );
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
        warnings,
        direction,
        { ...options, layerCount: sourceLayers.length }
      );
      if (action) encoder[direction] = action;
    }
    return { keys, enc: encoder };
  });

  return { config: { version: 1, layers }, warnings };
}

const REVERSE_MEDIA_KEYCODES: Record<number, { label: string; binding: string }> = {
  0x00a8: { label: 'mute', binding: 'mute' },
  0x007f: { label: 'mute', binding: 'mute' },
  0x00a9: { label: 'vol+', binding: 'volume +' },
  0x0080: { label: 'vol+', binding: 'volume +' },
  0x00aa: { label: 'vol-', binding: 'volume -' },
  0x0081: { label: 'vol-', binding: 'volume -' },
  0x00ab: { label: 'next', binding: 'next track' },
  0x00ac: { label: 'prev', binding: 'previous track' },
  0x00ad: { label: 'stop', binding: 'media stop' },
  0x00ae: { label: 'play', binding: 'play' },
  0x00a5: { label: 'pwr', binding: 'power down' },
  0x00a6: { label: 'slp', binding: 'sleep' },
  0x00bb: { label: 'ffwd', binding: 'fast forward' },
  0x00bc: { label: 'rwnd', binding: 'rewind' },
  0x00bd: { label: 'brt+', binding: 'bright up' },
  0x00be: { label: 'brt-', binding: 'bright down' },
};

const REVERSE_SPECIAL_KEYCODES: Record<number, { label: string; binding: string }> = {
  0x28: { label: 'ent', binding: 'enter' },
  0x29: { label: 'esc', binding: 'esc' },
  0x2a: { label: 'bksp', binding: 'back' },
  0x2b: { label: 'tab', binding: 'tab' },
  0x2c: { label: 'spc', binding: 'space' },
  0x2d: { label: '-', binding: '-' },
  0x2e: { label: '=', binding: '=' },
  0x2f: { label: '[', binding: '[' },
  0x30: { label: ']', binding: ']' },
  0x31: { label: '\\', binding: '\\' },
  0x33: { label: ';', binding: ';' },
  0x34: { label: "'", binding: "'" },
  0x35: { label: '`', binding: '`' },
  0x36: { label: ',', binding: ',' },
  0x37: { label: '.', binding: '.' },
  0x38: { label: '/', binding: '/' },
  0x39: { label: 'lock', binding: 'caps lock' },
  0x46: { label: 'prts', binding: 'print screen' },
  0x47: { label: 'scrl', binding: 'scroll lock' },
  0x48: { label: 'paus', binding: 'pause' },
  0x49: { label: 'ins', binding: 'insert' },
  0x4a: { label: 'home', binding: 'home' },
  0x4b: { label: 'pgup', binding: 'page up' },
  0x4c: { label: 'del', binding: 'delete' },
  0x4d: { label: 'end', binding: 'end' },
  0x4e: { label: 'pgdn', binding: 'page down' },
  0x4f: { label: '→', binding: 'right arrow' },
  0x50: { label: '←', binding: 'left arrow' },
  0x51: { label: '↓', binding: 'down arrow' },
  0x52: { label: '↑', binding: 'up arrow' },
  0x53: { label: 'num', binding: 'num lock' },
  0x54: { label: 'num /', binding: 'num /' },
  0x55: { label: 'num *', binding: 'num *' },
  0x56: { label: 'num -', binding: 'num -' },
  0x57: { label: 'num +', binding: 'num +' },
  0x58: { label: 'nent', binding: 'num enter' },
  0x67: { label: 'num =', binding: 'num =' },
  0x85: { label: 'num ,', binding: 'num ,' },
};

const REVERSE_MODIFIERS: Record<number, { label: string; binding: string }> = {
  0xe0: { label: 'ctrl', binding: 'ctrl' },
  0xe1: { label: 'shft', binding: 'shift' },
  0xe2: { label: 'alt', binding: 'alt' },
  0xe3: { label: 'win', binding: 'win' },
  0xe4: { label: 'rctl', binding: 'right ctrl' },
  0xe5: { label: 'rshf', binding: 'right shift' },
  0xe6: { label: 'ralt', binding: 'right alt' },
  0xe7: { label: 'rwin', binding: 'right win' },
};

function decodeSingleKeycode(kc: number): { label: string; binding: string } | null {
  if (REVERSE_SPECIAL_KEYCODES[kc]) return REVERSE_SPECIAL_KEYCODES[kc];
  if (REVERSE_MEDIA_KEYCODES[kc]) return REVERSE_MEDIA_KEYCODES[kc];
  if (REVERSE_MODIFIERS[kc]) return REVERSE_MODIFIERS[kc];

  if (kc >= 0x04 && kc <= 0x1d) {
    const char = String.fromCharCode(65 + (kc - 0x04));
    return { label: char, binding: char.toLowerCase() };
  }
  if (kc >= 0x1e && kc <= 0x26) {
    const digit = String(kc - 0x1e + 1);
    return { label: digit, binding: digit };
  }
  if (kc === 0x27) return { label: '0', binding: '0' };

  if (kc >= 0x3a && kc <= 0x45) {
    const fn = `F${kc - 0x3a + 1}`;
    return { label: fn, binding: fn };
  }
  if (kc >= 0x68 && kc <= 0x73) {
    const fn = `F${kc - 0x68 + 13}`;
    return { label: fn, binding: fn };
  }
  if (kc >= 0x59 && kc <= 0x61) {
    const num = String(kc - 0x59 + 1);
    return { label: num, binding: `num ${num}` };
  }
  if (kc === 0x62) return { label: '0', binding: 'num 0' };
  if (kc === 0x63) return { label: '.', binding: 'num .' };

  return null;
}

export function decodeViaKeycode(keycode: number): { label: string; binding: string; actionType: KeyAssignment['actionType'] } {
  if (!keycode || keycode === 0) {
    return { label: '', binding: 'blank', actionType: 'Basic input' };
  }

  // Host trigger: 0x7e00 - 0x7e3f
  if (keycode >= 0x7e00 && keycode <= 0x7e3f) {
    return { label: 'Host', binding: 'host_trigger', actionType: 'Basic input' };
  }

  // Profile switch: 0x7e40 - 0x7e43
  if (keycode >= 0x7e40 && keycode <= 0x7e43) {
    const pNum = (keycode & 0x03) + 1;
    return { label: `P${pNum}`, binding: `Profile ${pNum}`, actionType: 'Basic input' };
  }

  // Layer cycle: 0x7e44
  if (keycode === 0x7e44) {
    return { label: 'Cycle', binding: 'Layer Cycle', actionType: 'Layer Cycle' };
  }

  // Layer switches: TO(0x5200..0x521f), MO(0x5220..0x523f), TG(0x5240..0x525f), TT(0x5260..0x527f)
  if ((keycode & 0xffe0) === 0x5200) {
    const lNum = (keycode & 0x1f) + 1;
    return { label: `L${lNum}`, binding: `Layer ${lNum}`, actionType: 'Basic input' };
  }
  if ((keycode & 0xffe0) === 0x5220) {
    const lNum = (keycode & 0x1f) + 1;
    return { label: `TL${lNum}`, binding: `Temp Layer ${lNum}`, actionType: 'Basic input' };
  }
  if ((keycode & 0xffe0) === 0x5240) {
    const lNum = (keycode & 0x1f) + 1;
    return { label: `TG${lNum}`, binding: `Toggle Layer ${lNum}`, actionType: 'Basic input' };
  }
  if ((keycode & 0xffe0) === 0x5260) {
    const lNum = (keycode & 0x1f) + 1;
    return { label: `TT${lNum}`, binding: `TT Layer ${lNum}`, actionType: 'Basic input' };
  }

  // Mod-tap: 0x2000 | (mod << 8) | kc
  if ((keycode & 0xe000) === 0x2000) {
    const baseKc = keycode & 0xff;
    const base = decodeSingleKeycode(baseKc);
    if (base) return { label: base.label, binding: base.binding, actionType: 'Basic input' };
  }

  // Layer-tap: 0x4000 | (layer << 8) | kc
  if ((keycode & 0xf000) === 0x4000) {
    const baseKc = keycode & 0xff;
    const base = decodeSingleKeycode(baseKc);
    if (base) return { label: base.label, binding: base.binding, actionType: 'Basic input' };
  }

  // Chords with modifiers: (qmkModifierBits << 8) | baseKeycode
  if (keycode > 0x0100 && (keycode & 0xe000) === 0) {
    const modBits = (keycode >> 8) & 0x1f;
    const baseKc = keycode & 0xff;
    const base = decodeSingleKeycode(baseKc);
    if (base) {
      const isRight = (modBits & 0x10) !== 0;
      const mods: string[] = [];
      if (modBits & 0x01) mods.push(isRight ? 'right ctrl' : 'ctrl');
      if (modBits & 0x02) mods.push(isRight ? 'right shift' : 'shift');
      if (modBits & 0x04) mods.push(isRight ? 'right alt' : 'alt');
      if (modBits & 0x08) mods.push(isRight ? 'right win' : 'win');
      if (mods.length > 0) {
        const binding = [...mods, base.binding].join('+');
        const shortMods = mods.map((m) =>
          m === 'ctrl' || m === 'right ctrl' ? 'Ctrl' :
          m === 'shift' || m === 'right shift' ? 'Shift' :
          m === 'alt' || m === 'right alt' ? 'Alt' : 'Win'
        );
        const label = [...shortMods, base.label].join('+');
        return { label, binding, actionType: 'Basic input' };
      }
    }
  }

  // Single standard key
  const single = decodeSingleKeycode(keycode);
  if (single) {
    return { label: single.label, binding: single.binding, actionType: 'Basic input' };
  }

  return { label: '', binding: 'blank', actionType: 'Basic input' };
}

export function isProfileKeymapBlank(profile?: ProfileData | null): boolean {
  if (!profile || !Array.isArray(profile.layers) || profile.layers.length === 0) return true;
  for (const layer of profile.layers) {
    for (const slot of KEY_SLOTS) {
      const entry = layer[slot];
      if (entry && entry.binding && entry.binding !== 'blank') return false;
      if (entry && entry.label && entry.label.trim()) return false;
    }
    const enc = layer['dial-tl'];
    if (enc?.encoderActions) {
      for (const dir of ['cw', 'press', 'ccw'] as const) {
        const sub = enc.encoderActions[dir];
        if (sub && sub.binding && sub.binding !== 'blank') return false;
        if (sub && sub.label && sub.label.trim() && sub.label !== '—') return false;
      }
    }
  }
  return true;
}

export function decodeViaSnapshotToProfile(
  snapshot: ViaKeymapSnapshot,
  baseProfile?: ProfileData
): ProfileData {
  const capturedLayers = Array.isArray(snapshot?.layers) ? snapshot.layers : [];
  if (capturedLayers.length === 0) {
    return baseProfile ?? {
      id: 'default',
      name: 'Grid Macro 1',
      color: '#0051ff',
      layers: [JSON.parse(JSON.stringify(INITIAL_LAYER_1))],
    };
  }

  let maxNonEmptyLayerIdx = 0;
  capturedLayers.forEach((layer, idx) => {
    const hasKeys = Object.values(layer.keys ?? {}).some((kc) => kc !== 0);
    const hasEnc =
      (layer.enc?.cw ?? 0) !== 0 ||
      (layer.enc?.ccw ?? 0) !== 0 ||
      (layer.enc?.press ?? 0) !== 0;
    if (hasKeys || hasEnc) {
      maxNonEmptyLayerIdx = Math.max(maxNonEmptyLayerIdx, idx);
    }
  });

  const activeLayersCount = Math.min(4, Math.max(1, maxNonEmptyLayerIdx + 1));
  const decodedLayers: LayerKeymap[] = [];

  for (let i = 0; i < activeLayersCount; i++) {
    const srcLayer = capturedLayers[i];
    const newLayer: LayerKeymap = JSON.parse(JSON.stringify(INITIAL_LAYER_1));
    if (srcLayer) {
      for (const slot of KEY_SLOTS) {
        const kc = srcLayer.keys?.[slot] ?? 0;
        if (kc !== 0) {
          const decoded = decodeViaKeycode(kc);
          newLayer[slot] = {
            label: decoded.label,
            binding: decoded.binding,
            actionType: decoded.actionType,
          };
        }
      }
      const cwKc = srcLayer.enc?.cw ?? 0;
      const ccwKc = srcLayer.enc?.ccw ?? 0;
      const pressKc = srcLayer.enc?.press ?? 0;
      const decodedCw = decodeViaKeycode(cwKc);
      const decodedCcw = decodeViaKeycode(ccwKc);
      const decodedPress = decodeViaKeycode(pressKc);

      newLayer['dial-tl'] = {
        label: decodedPress.label || decodedCw.label || decodedCcw.label || '',
        binding:
          decodedPress.binding !== 'blank'
            ? decodedPress.binding
            : decodedCw.binding !== 'blank'
            ? decodedCw.binding
            : 'blank',
        actionType: 'Basic input',
        encoderActions: {
          cw: { label: decodedCw.label || '—', binding: decodedCw.binding },
          ccw: { label: decodedCcw.label || '—', binding: decodedCcw.binding },
          press: { label: decodedPress.label || '—', binding: decodedPress.binding },
        },
      };
    }
    decodedLayers.push(newLayer);
  }

  return {
    id: baseProfile?.id || `profile-${Date.now()}`,
    name:
      baseProfile?.name && baseProfile.name !== 'Default Profile'
        ? baseProfile.name
        : 'Grid Macro 1',
    color: baseProfile?.color || '#0051ff',
    layers: decodedLayers,
  };
}
