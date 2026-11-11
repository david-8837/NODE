import { describe, expect, it } from 'vitest';
import { INITIAL_LAYER_1, PRESET_LIBRARY } from '../src/App';
import {
  GRID_MACRO_ENCODER_SLOT,
  GRID_MACRO_KEY_SLOTS,
} from '../src/deviceLayout';

const EXPECTED_KEYS = [
  'r1c1',
  'r1c2',
  'r1c3',
  'r2c1',
  'r2c2',
  'r2c3',
  'r3c1',
  'r3c2',
  'r3c3',
];

const EXPECTED_LAYER_SLOTS = [...EXPECTED_KEYS, GRID_MACRO_ENCODER_SLOT].sort();

describe('Grid Macro 1 device layout', () => {
  it('defines exactly nine keys in a row-major 3x3 matrix and one encoder', () => {
    expect(GRID_MACRO_KEY_SLOTS).toEqual(EXPECTED_KEYS);
    expect(new Set(GRID_MACRO_KEY_SLOTS).size).toBe(9);
    expect(GRID_MACRO_ENCODER_SLOT).toBe('dial-tl');
    expect([...GRID_MACRO_KEY_SLOTS, GRID_MACRO_ENCODER_SLOT]).toHaveLength(10);
  });

  it('uses only the physical 3x3 key slots and the single encoder in defaults', () => {
    expect(Object.keys(INITIAL_LAYER_1).sort()).toEqual(EXPECTED_LAYER_SLOTS);
    expect(Object.keys(INITIAL_LAYER_1).filter((slot) => slot === 'dial-tl')).toHaveLength(1);
    expect(
      GRID_MACRO_KEY_SLOTS.map((slot) => INITIAL_LAYER_1[slot].binding)
    ).toEqual(Array(9).fill('blank'));
    expect(INITIAL_LAYER_1[GRID_MACRO_ENCODER_SLOT]).toMatchObject({
      label: '',
      binding: 'blank',
      encoderActions: {
        cw: { label: '', binding: 'blank' },
        press: { label: '', binding: 'blank' },
        ccw: { label: '', binding: 'blank' },
      },
    });
  });

  it('normalizes every preset to the same 3x3 + single-encoder schema', () => {
    expect(PRESET_LIBRARY.length).toBeGreaterThan(0);
    for (const preset of PRESET_LIBRARY) {
      expect(
        Object.keys(preset.layerKeymap).sort(),
        `${preset.title} should only contain Grid Macro 1 slots`
      ).toEqual(EXPECTED_LAYER_SLOTS);
    }
  });

  it('keeps all nine ChatGPT preset bindings and their custom actions', () => {
    const chatgpt = PRESET_LIBRARY.find((preset) => preset.id === 'chatgpt');
    expect(chatgpt).toBeDefined();
    expect(chatgpt?.layerKeymap.r1c1).toMatchObject({
      label: 'New Chat',
      actionType: 'Shortcut',
      binding: 'New Chat (Ctrl + Shift + O)',
    });
    expect(chatgpt?.layerKeymap.r1c2.label).toBe('Search');
    expect(chatgpt?.layerKeymap.r1c3.label).toBe('Focus Input');
    expect(chatgpt?.layerKeymap.r3c1.actionType).toBe('Smart Action');
    expect(chatgpt?.layerKeymap['dial-tl'].encoderActions?.cw).toMatchObject({
      label: 'dn',
      binding: 'Scroll Down (Page Down)',
    });
    expect(chatgpt?.actionItems.Action).toHaveLength(8);
    expect(chatgpt?.actionItems['Smart-A']).toHaveLength(1);
  });
});
