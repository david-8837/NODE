import { describe, expect, it } from 'vitest';
import { buildPresetLibrary } from '../src/App';
import { GRID_MACRO_ENCODER_SLOT, GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';
import { PRESET_CATALOG } from '../src/presetCatalog';

const expectedPresetIds = [
  'vscode', 'github', 'terminal', 'docker', 'chrome_devtools', 'photoshop',
  'illustrator', 'premiere', 'aftereffects', 'davinci', 'blender', 'figma',
  'framer', 'canva', 'audacity', 'affinity', 'excel', 'word', 'powerpoint',
  'notion', 'slack', 'zoom', 'obs', 'discord', 'spotify', 'windows', 'chatgpt',
];

describe('production preset catalog', () => {
  it('preserves all 27 shipped presets with nine key assignments and three dial actions', () => {
    expect(PRESET_CATALOG.map(({ id }) => id)).toEqual(expectedPresetIds);
    const presets = buildPresetLibrary('win');
    expect(presets).toHaveLength(27);

    for (const preset of presets) {
      expect(Object.keys(preset.layerKeymap).sort()).toEqual(
        [...GRID_MACRO_KEY_SLOTS, GRID_MACRO_ENCODER_SLOT].sort()
      );
      expect(GRID_MACRO_KEY_SLOTS.every((slot) => !!preset.layerKeymap[slot].iconId)).toBe(true);
      expect(preset.layerKeymap[GRID_MACRO_ENCODER_SLOT].encoderActions).toEqual(
        expect.objectContaining({ cw: expect.any(Object), press: expect.any(Object), ccw: expect.any(Object) })
      );
    }
  });

  it('attributes all shipped presets to Node', () => {
    expect(PRESET_CATALOG.every(({ author }) => author === 'Node')).toBe(true);
  });

  it('adapts Mod shortcuts to the selected operating system and retains generated actions', () => {
    const windowsChatgpt = buildPresetLibrary('win').find(({ id }) => id === 'chatgpt')!;
    const macChatgpt = buildPresetLibrary('mac').find(({ id }) => id === 'chatgpt')!;

    expect(windowsChatgpt.layerKeymap.r1c1.binding).toBe('New Chat (Ctrl + Shift + O)');
    expect(macChatgpt.layerKeymap.r1c1.binding).toBe('New Chat (Cmd + Shift + O)');
    expect(macChatgpt.actionItems.Action).toHaveLength(8);
    expect(macChatgpt.actionItems['Smart-A']).toContainEqual(
      expect.objectContaining({ id: 'preset-chatgpt-r3c1', main: 'Instructions' })
    );
    expect(macChatgpt.layerKeymap.r1c1.actionId).toBe('preset-chatgpt-r1c1');
  });
});
