import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const firmwareRoot = join(process.cwd(), 'qmk_firmware/grid_macro_1');
const keyboard = JSON.parse(readFileSync(join(firmwareRoot, 'keyboard.json'), 'utf8'));
const config = readFileSync(join(firmwareRoot, 'config.h'), 'utf8');
const commonRules = readFileSync(join(firmwareRoot, 'rules.mk'), 'utf8');
const viaRules = readFileSync(join(firmwareRoot, 'keymaps/via/rules.mk'), 'utf8');
const keymaps = [
  readFileSync(join(firmwareRoot, 'keymaps/default/keymap.c'), 'utf8'),
  readFileSync(join(firmwareRoot, 'keymaps/via/keymap.c'), 'utf8'),
];

describe('Grid Macro 1 QMK definition preflight', () => {
  it('keeps matrix dimensions, unique direct pins, and layout coordinates consistent', () => {
    const direct = keyboard.matrix_pins.direct as Array<Array<string | null>>;
    expect(direct).toHaveLength(4);
    expect(direct.every((row) => row.length === 3)).toBe(true);
    expect(config).toMatch(/#define MATRIX_ROWS 4\b/);
    expect(config).toMatch(/#define MATRIX_COLS 3\b/);

    const matrixPins = direct.flat().filter((pin): pin is string => typeof pin === 'string');
    expect(matrixPins).toHaveLength(10);
    expect(new Set(matrixPins).size).toBe(matrixPins.length);

    const layout = keyboard.layouts.LAYOUT_grid_macro_1.layout as Array<{ matrix: [number, number] }>;
    expect(layout).toHaveLength(10);
    const coordinates = layout.map(({ matrix }) => matrix.join(':'));
    expect(new Set(coordinates).size).toBe(coordinates.length);
    for (const [row, col] of layout.map(({ matrix }) => matrix)) {
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(direct.length);
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(direct[row].length);
      expect(direct[row][col]).not.toBeNull();
    }
  });

  it('matches the chosen MCU, encoder, LED, and dynamic VIA layer configuration', () => {
    expect(keyboard.processor).toBe('RP2040');
    expect(keyboard.bootloader).toBe('rp2040');
    expect(keyboard.usb).toMatchObject({ vid: '0xFEED', pid: '0x6001' });
    expect(keyboard.features).toMatchObject({ raw: true, via: true, encoder: true, rgblight: true });
    expect(keyboard.encoder.rotary).toHaveLength(1);
    expect(keyboard.encoder.rotary[0]).toMatchObject({ pin_a: 'GP9', pin_b: 'GP10' });
    expect(keyboard.rgblight).toMatchObject({ pin: 'GP16', led_count: 1, driver: 'ws2812' });
    expect(config).toMatch(/#define WS2812_DI_PIN GP16\b/);
    expect(config).toMatch(/#define DYNAMIC_KEYMAP_LAYER_COUNT 4\b/);
    expect(viaRules).toContain('VIA_ENABLE = yes');
    expect(viaRules).toContain('ENCODER_MAP_ENABLE = yes');
    expect(commonRules).toContain('RAW_ENABLE = yes');
    expect(commonRules).not.toMatch(/^\s*VIAL_ENABLE\s*=/m);
  });

  it('uses current QMK underglow keycodes in the standalone default keymap', () => {
    const keymap = keymaps[0];
    expect(keymap).not.toMatch(/\bRGB_(?:TOG|MOD|HUI|SAI|VAI|VAD)\b/);
    expect(keymap).toContain('UG_TOGG');
    expect(keymap).toContain('UG_NEXT');
    expect(keymap).toContain('UG_HUEU');
    expect(keymap).toContain('UG_SATU');
    expect(keymap).toContain('UG_VALD');
    expect(keymap).toContain('UG_VALU');
  });

  it('keeps stock rgblight keycodes out of the VIA keymap, which owns its LED renderer', () => {
    const keymap = keymaps[1];
    // The housekeeping renderer repaints the LED every 20ms from mp_* state, so
    // UG_* edits to QMK's rgblight config would be overwritten immediately.
    expect(keymap).not.toMatch(/\bUG_[A-Z]+\b/);
    expect(keymap).not.toMatch(/\bRGB_(?:TOG|MOD|HUI|SAI|VAI|VAD)\b/);
    for (const keycode of ['MP_RGB_TOGG', 'MP_RGB_MODE', 'MP_RGB_SPDD', 'MP_RGB_SPDU']) {
      expect(keymap).toContain(keycode);
    }
    expect(keymap).toContain('ENCODER_CCW_CW(MP_RGB_SPDD, MP_RGB_SPDU)');
  });

  it('partitions RP2040 emulated EEPROM cleanly between VIA dynamic storage and Micro Pad profiles', () => {
    expect(config).toMatch(/#define WEAR_LEVELING_LOGICAL_SIZE 4096\b/);
    expect(config).toMatch(/#define WEAR_LEVELING_BACKING_SIZE \(WEAR_LEVELING_LOGICAL_SIZE \* 2\)/);

    const viaMaxMatch = config.match(/#define DYNAMIC_KEYMAP_EEPROM_MAX_ADDR\s+(\d+)/);
    const mpMagicMatch = keymaps[1].match(/#define MP_EEPROM_MAGIC_ADDR\s+(\d+)/);
    expect(viaMaxMatch).not.toBeNull();
    expect(mpMagicMatch).not.toBeNull();
    expect(Number(viaMaxMatch![1])).toBeLessThan(Number(mpMagicMatch![1]));

    expect(keymaps[1]).toContain('MP_LED_MODE_RAINBOW');
    expect(keymaps[1]).toContain('MP_LED_MODE_BREATH');
    expect(keymaps[1]).toContain('void housekeeping_task_user(void)');
  });
});

describe('Micro Pad custom keycodes', () => {
  const viaKeymap = keymaps[1];
  const defineValue = (name: string): number => {
    const match = viaKeymap.match(new RegExp(`#define ${name}\\s+(0x[0-9A-Fa-f]+|\\d+)`));
    expect(match, `${name} must be defined in the VIA keymap`).not.toBeNull();
    return Number(match![1]);
  };

  it('assigns layer-cycle and RGB keycodes outside the trigger and profile ranges', () => {
    const trigBase = defineValue('MP_TRIG_BASE');
    const trigMax = defineValue('MP_TRIG_MAX');
    const profBase = defineValue('MP_PROF_BASE');
    const profMax = defineValue('MP_PROF_MAX');
    const custom = [
      'MP_LAYER_CYCLE',
      'MP_RGB_TOGG',
      'MP_RGB_MODE',
      'MP_RGB_SPDD',
      'MP_RGB_SPDU',
    ].map(defineValue);

    // QK_USER spans 0x7E40..0x7FFF; QK_KB (0x7E00..0x7E3F) is fully used by triggers.
    expect(new Set(custom).size).toBe(custom.length);
    for (const code of custom) {
      expect(code).toBeGreaterThanOrEqual(0x7e40);
      expect(code).toBeLessThanOrEqual(0x7fff);
      expect(code < trigBase || code > trigMax).toBe(true);
      expect(code < profBase || code > profMax).toBe(true);
    }
  });

  it('matches the keycode constants exported by the desktop bridge', async () => {
    const bridge = await import('../src/qmkViaBridge');
    expect(defineValue('MP_LAYER_CYCLE')).toBe(bridge.MP_LAYER_CYCLE);
    expect(defineValue('MP_RGB_TOGG')).toBe(bridge.MP_RGB_TOGG);
    expect(defineValue('MP_RGB_MODE')).toBe(bridge.MP_RGB_MODE);
    expect(defineValue('MP_RGB_SPDD')).toBe(bridge.MP_RGB_SPDD);
    expect(defineValue('MP_RGB_SPDU')).toBe(bridge.MP_RGB_SPDU);
    expect(defineValue('MP_EVT_RGB_STATE')).toBe(bridge.MP_EVT_RGB_STATE);
  });

  it('switches the real keymap on layer cycle so the LED and app cannot drift', () => {
    const handler = viaKeymap.slice(
      viaKeymap.indexOf('bool process_record_user'),
      viaKeymap.indexOf('#if defined(VIA_ENABLE)')
    );
    const cycleBlock = handler.slice(
      handler.indexOf('if (keycode == MP_LAYER_CYCLE)'),
      handler.indexOf('if (keycode >= MP_RGB_TOGG')
    );
    // layer_move() runs layer_state_set_user(), which owns both the LED and the
    // app notification. Painting the LED here instead would allow drift.
    expect(cycleBlock).toContain('layer_move(');
    expect(cycleBlock).toContain('% MP_MAX_LAYERS');
    expect(cycleBlock).toContain('record->event.pressed');
    expect(cycleBlock).not.toContain('rgblight_setrgb_at');
    expect(cycleBlock).not.toContain('mp_apply_layer_rgb');
  });

  it('coalesces EEPROM writes for interactive RGB edits instead of writing per tick', () => {
    const rgbBlock = viaKeymap.slice(
      viaKeymap.indexOf('if (keycode >= MP_RGB_TOGG'),
      viaKeymap.indexOf('if (keycode >= MP_PROF_BASE')
    );
    expect(rgbBlock).toContain('mp_mark_rgb_dirty()');
    expect(rgbBlock).not.toContain('mp_persist_state_header()');

    const housekeeping = viaKeymap.slice(viaKeymap.indexOf('void housekeeping_task_user'));
    expect(housekeeping).toContain('mp_rgb_state_dirty');
    expect(housekeeping).toContain('MP_RGB_PERSIST_DELAY_MS');
    expect(housekeeping).toContain('mp_persist_state_header()');
  });

  it('reports GET_STATE and device RGB events from one shared payload builder', () => {
    expect(viaKeymap).toContain('static void mp_fill_state_report(');
    const getState = viaKeymap.slice(
      viaKeymap.indexOf('if (subcmd == MP_CMD_GET_STATE)'),
      viaKeymap.indexOf('if (subcmd == MP_CMD_SELECT_PROFILE)')
    );
    expect(getState).toContain('mp_fill_state_report(data, length, current_layer)');
    const rgbEvent = viaKeymap.slice(
      viaKeymap.indexOf('static void mp_send_rgb_state(void)'),
      viaKeymap.indexOf('bool process_record_user')
    );
    expect(rgbEvent).toContain('MP_EVT_RGB_STATE');
    expect(rgbEvent).toContain('mp_fill_state_report(report, sizeof(report)');
  });
});
