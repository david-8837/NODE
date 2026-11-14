import type { ViaAction, ViaConfiguration } from './qmkViaBridge';

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
}

const SLOT_TRIGGER_INDEX: Record<string, number> = {
  r1c1: 0, r1c2: 1, r1c3: 2,
  r2c1: 3, r2c2: 4, r2c3: 5,
  r3c1: 6, r3c2: 7, r3c3: 8,
  cw: 9, press: 10, ccw: 11,
};

function isHostExecutableEntry(entry: BindingEntry, os: PresetOperatingSystem): boolean {
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
        options
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
        options
      );
      if (action) encoder[direction] = action;
    }
    return { keys, enc: encoder };
  });

  return { config: { version: 1, layers }, warnings };
}
