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
    expect(config).toMatch(/#define SERIAL_NUMBER_USE_HARDWARE_ID TRUE\b/);
    expect(viaRules).toContain('VIA_ENABLE = yes');
    expect(viaRules).toContain('ENCODER_MAP_ENABLE = yes');
    expect(commonRules).toContain('RAW_ENABLE = yes');
    expect(commonRules).not.toMatch(/^\s*VIAL_ENABLE\s*=/m);
  });

  it('uses current QMK underglow keycodes in both keymaps', () => {
    for (const keymap of keymaps) {
      expect(keymap).not.toMatch(/\bRGB_(?:TOG|MOD|HUI|SAI|VAI|VAD)\b/);
      expect(keymap).toContain('UG_TOGG');
      expect(keymap).toContain('UG_NEXT');
      expect(keymap).toContain('UG_HUEU');
      expect(keymap).toContain('UG_SATU');
      expect(keymap).toContain('UG_VALD');
      expect(keymap).toContain('UG_VALU');
    }
  });

  it('keeps the experimental lighting build opt-in and separate from the release artifact', () => {
    expect(viaRules).toContain('ifeq ($(strip $(NODE_EXPERIMENTAL_LAYER_LIGHTING)),yes)');
    expect(viaRules).toContain('--defsym=FLASH_LEN=0x1fc000');
    const workflow = readFileSync('.github/workflows/qmk-build.yml', 'utf8');
    expect(workflow.indexOf('Upload the VIA UF2 and provenance files')).toBeLessThan(workflow.indexOf('Build per-layer lighting test firmware (experimental)'));
    expect(workflow).toContain('grid-macro-1-per-layer-lighting-test');
    expect(workflow).toContain('NODE_EXPERIMENTAL_LAYER_LIGHTING=yes');
    expect(workflow).toContain('__flash_binary_end');
    expect(workflow).toContain('TEST ONLY');
  });

  it('validates the checked-in compiled grid_macro_1_via.uf2 firmware binary', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validateRp2040Uf2 } = require('../electron/uf2Validator.cjs');
    const uf2Path = join(process.cwd(), 'firmware/grid_macro_1_via.uf2');
    const uf2Bytes = readFileSync(uf2Path);
    const validation = validateRp2040Uf2(uf2Bytes);
    expect(validation.ok).toBe(true);
    expect(validation.blockCount).toBeGreaterThan(0);
    expect(validation.byteLength).toBe(uf2Bytes.byteLength);

    // Verify USB descriptor strings in the binary payload
    const utf16Text = uf2Bytes.toString('utf16le');
    expect(utf16Text).toContain('Grid Macro 1');
  });
});
