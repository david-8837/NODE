import { describe, expect, it, vi } from 'vitest';
import { buildViaConfiguration } from '../src/qmkProfileSync';
import { actionToViaKeycode } from '../src/qmkViaBridge';
import { referencesAtOrAfter } from '../src/referenceSafety';
import { triggerSimulationAction } from '../src/actionExecution';
import { createRequire } from 'node:module';
const { parseKeyCombo } = createRequire(import.meta.url)('../electron/desktopExecution.cjs');

function code(binding: string) {
  const entry = { binding, label: binding, actionType: 'Basic input' };
  const { config, warnings } = buildViaConfiguration({ layers: [{ r1c1: entry, 'dial-tl': { encoderActions: { cw: entry } } }] }, 'win');
  expect(warnings).toEqual([]);
  const key = config.layers[0].keys!.r1c1;
  expect(config.layers[0].enc!.cw).toEqual(key);
  return actionToViaKeycode(key);
}

describe('basic mapping keycodes', () => {
  it('encodes each alphabet, digit and function key', () => {
    for (let i = 0; i < 26; i++) expect(code(String.fromCharCode(65 + i))).toBe(4 + i);
    for (let i = 0; i < 10; i++) expect(code(String(i))).toBe(i ? 0x1d + i : 0x27);
    for (let i = 1; i <= 24; i++) expect(code(`F${i}`)).toBe(i <= 12 ? 0x39 + i : 0x68 + i - 13);
    expect(code('ctrl + 1')).toBe(0x011e);
  });
  it('distinguishes every keypad key from the regular keyboard', () => {
    for (let i = 0; i < 10; i++) expect(code(`num ${i}`)).toBe(i ? 0x58 + i : 0x62);
    for (const [binding, expected] of Object.entries({ 'num /': 0x54, 'num *': 0x55, 'num -': 0x56, 'num +': 0x57, 'num enter': 0x58, 'num .': 0x63, 'num =': 0x67, 'num ,': 0x85 })) expect(code(binding)).toBe(expected);
    expect(code('+')).toBe(0x022e);
    expect(code('*')).toBe(0x0225);
    expect(code('ctrl + num +')).toBe(0x0157);
    expect(parseKeyCombo('num enter').keys[0].extended).toBe(true);
    expect(parseKeyCombo('ctrl + num +').keys.map((key: {vk: number}) => key.vk)).toEqual([0x11, 0x6b]);
  });
  it('encodes every displayed punctuation and navigation key', () => {
    const values: Record<string, number> = { '-': 0x2d, '=': 0x2e, '[': 0x2f, ']': 0x30, '\\': 0x31, ';': 0x33, "'": 0x34, '`': 0x35, ',': 0x36, '.': 0x37, '/': 0x38, enter: 0x28, esc: 0x29, back: 0x2a, tab: 0x2b, space: 0x2c, 'print screen': 0x46, 'scroll lock': 0x47, pause: 0x48, insert: 0x49, home: 0x4a, 'page up': 0x4b, delete: 0x4c, end: 0x4d, 'page down': 0x4e, 'num lock': 0x53 };
    for (const [name, expected] of Object.entries(values)) expect(code(name), name).toBe(expected);
  });
  it('encodes modifiers, navigation, media and system actions', () => {
    const values: Record<string, number> = { ctrl: 0xe0, shift: 0xe1, alt: 0xe2, win: 0xe3, 'right ctrl': 0xe4, 'right shift': 0xe5, 'right alt': 0xe6, 'right win': 0xe7, 'right arrow': 0x4f, 'left arrow': 0x50, 'down arrow': 0x51, 'up arrow': 0x52, lock: 0x39, mute: 0xa8, 'volume +': 0xa9, 'volume -': 0xaa, 'next track': 0xab, 'previous track': 0xac, 'media stop': 0xad, play: 0xae, 'fast forward': 0xbb, rewind: 0xbc, 'bright up': 0xbd, 'bright down': 0xbe, 'power down': 0xa5, sleep: 0xa6 };
    for (const [name, expected] of Object.entries(values)) expect(code(name), name).toBe(expected);
  });
});

describe('reference safety', () => {
  it('maps each configured permanent, temporary and profile target', () => {
    for (let i = 1; i <= 4; i++) {
      const entries = { r1c1: { binding: `Layer ${i}` }, r1c2: { binding: `Temp Layer ${i}` }, r1c3: { binding: `Profile ${i}` } };
      const { config, warnings } = buildViaConfiguration({ layers: [entries, {}, {}, {}] }, 'win', { profileCount: 4 });
      expect(warnings).toEqual([]);
      expect(actionToViaKeycode(config.layers[0].keys!.r1c1)).toBe(0x5200 + i - 1);
      expect(actionToViaKeycode(config.layers[0].keys!.r1c2)).toBe(0x5220 + i - 1);
      expect(actionToViaKeycode(config.layers[0].keys!.r1c3)).toBe(0x7e40 + i - 1);
    }
  });
  it('detects direct, encoder and gesture references without examining smart text', () => {
    expect(referencesAtOrAfter([{binding: 'Layer 1'}, {execution: { kind: 'multi', gestures: { onTap: 'Layer 2', onHold: 'Temp Layer 4' } }}], 'layer', 3)).toBe(true);
    expect(referencesAtOrAfter({ encoderActions: { cw: { binding: 'Profile 3' } } }, 'profile', 2)).toBe(true);
    expect(referencesAtOrAfter({ execution: { kind: 'smart', value: 'Profile 4' }, binding: 'Text: Profile 4', actionType: 'Smart Action' }, 'profile', 0)).toBe(false);
  });
  it('clears unavailable stored references in both key and encoder payloads', () => {
    const { config, warnings } = buildViaConfiguration({ layers: [{ r1c1: { binding: 'Layer 2' }, r1c2: { binding: 'Profile 3' }, 'dial-tl': { encoderActions: { cw: { binding: 'Temp Layer 4' } } } }] }, 'win', { enableHostTriggers: true, profileCount: 2 });
    expect(config.layers[0].keys).toMatchObject({ r1c1: { t: 'none' }, r1c2: { t: 'none' } });
    expect(config.layers[0].enc!.cw).toEqual({ t: 'none' });
    expect(warnings).toHaveLength(3);
  });
  it('dispatches simulated profile actions to the application instead of a keystroke', () => {
    const onProfileChange = vi.fn();
    const toast = vi.fn();
    triggerSimulationAction({ binding: 'Profile 2' }, vi.fn(), toast, {} as Window & typeof globalThis, { onProfileChange });
    expect(onProfileChange).toHaveBeenCalledWith(1);
  });
});
