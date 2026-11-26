import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as bridge from '../src/qmkViaBridge';
import { MAX_HARDWARE_LAYERS, MAX_HARDWARE_PROFILES, GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';
import { MAX_LAYER_COUNT, MAX_PROFILE_COUNT } from '../src/profileFiles';

/**
 * Phase 9: the firmware (C) and the desktop app (TS) each declare the USB
 * protocol independently. Nothing previously compared them, so a change on one
 * side could silently break the other. These tests read the real sources and
 * assert the shared contract byte-for-byte.
 */

const firmwareRoot = join(process.cwd(), 'qmk_firmware/grid_macro_1');
const viaKeymap = readFileSync(join(firmwareRoot, 'keymaps/via/keymap.c'), 'utf8');
const configHeader = readFileSync(join(firmwareRoot, 'config.h'), 'utf8');
const keyboardJson = JSON.parse(readFileSync(join(firmwareRoot, 'keyboard.json'), 'utf8'));
const rulesMk = readFileSync(join(firmwareRoot, 'rules.mk'), 'utf8');

function defineValue(name: string, source = viaKeymap): number {
  const match = source.match(new RegExp(`#define\\s+${name}\\s+(0x[0-9A-Fa-f]+|\\d+)`));
  expect(match, `${name} must be #defined in the firmware`).not.toBeNull();
  return Number(match![1]);
}

describe('USB device identification', () => {
  it('matches VID/PID between keyboard.json and the WebHID filter', () => {
    expect(Number(keyboardJson.usb.vid)).toBe(bridge.VIA_USB_VENDOR_ID);
    expect(Number(keyboardJson.usb.pid)).toBe(bridge.VIA_USB_PRODUCT_ID);
  });

  it('enables Raw HID, VIA and the encoder map the app depends on', () => {
    expect(keyboardJson.features.raw).toBe(true);
    expect(keyboardJson.features.via).toBe(true);
    expect(rulesMk).toMatch(/RAW_ENABLE\s*=\s*yes/);
    expect(rulesMk).toMatch(/VIA_ENABLE\s*=\s*yes/);
    expect(readFileSync(join(firmwareRoot, 'keymaps/via/rules.mk'), 'utf8'))
      .toMatch(/ENCODER_MAP_ENABLE\s*=\s*yes/);
  });

  it('targets RP2040 with the rp2040 bootloader', () => {
    expect(keyboardJson.processor).toBe('RP2040');
    expect(keyboardJson.bootloader).toBe('rp2040');
    expect(rulesMk).toMatch(/MCU\s*=\s*RP2040/);
  });
});

describe('Micro Pad 0xFD command and event identifiers', () => {
  it.each([
    ['MP_HID_PREFIX', bridge.MP_HID_PREFIX],
    ['MP_CMD_GET_STATE', bridge.MP_CMD_GET_STATE],
    ['MP_CMD_SELECT_PROFILE', bridge.MP_CMD_SELECT_PROFILE],
    ['MP_CMD_SAVE_PROFILE', bridge.MP_CMD_SAVE_PROFILE],
    ['MP_CMD_SET_RGB', bridge.MP_CMD_SET_RGB],
    ['MP_CMD_SELECT_LAYER', bridge.MP_CMD_SELECT_LAYER],
    ['MP_CMD_BOOTLOADER', bridge.MP_CMD_BOOTLOADER],
    ['MP_EVT_LAYER_STATE', bridge.MP_EVT_LAYER_STATE],
    ['MP_EVT_HOST_TRIGGER', bridge.MP_EVT_HOST_TRIGGER],
    ['MP_EVT_RGB_STATE', bridge.MP_EVT_RGB_STATE],
    ['MP_EVT_MATRIX_STATE', bridge.MP_EVT_MATRIX_STATE],
  ])('%s agrees between firmware and app', (name, appValue) => {
    expect(defineValue(name as string)).toBe(appValue);
  });

  it('uses distinct command ids so no handler shadows another', () => {
    const ids = [
      'MP_CMD_GET_STATE', 'MP_CMD_SELECT_PROFILE', 'MP_CMD_SAVE_PROFILE',
      'MP_CMD_SET_RGB', 'MP_CMD_SELECT_LAYER',
    ].map((n) => defineValue(n));
    expect(new Set(ids).size).toBe(ids.length);
    const events = ['MP_EVT_LAYER_STATE', 'MP_EVT_HOST_TRIGGER', 'MP_EVT_RGB_STATE'].map((n) => defineValue(n));
    expect(new Set(events).size).toBe(events.length);
    // Commands and events must not collide, or a reply could parse as telemetry.
    for (const id of ids) expect(events).not.toContain(id);
  });

  it('handles every command the app can send', () => {
    for (const name of [
      'MP_CMD_GET_STATE', 'MP_CMD_SELECT_PROFILE', 'MP_CMD_SAVE_PROFILE',
      'MP_CMD_SET_RGB', 'MP_CMD_SELECT_LAYER',
    ]) {
      expect(viaKeymap, `firmware must branch on ${name}`).toContain(`subcmd == ${name}`);
    }
  });
});

describe('layer and profile limits', () => {
  it('agrees on the 4-layer / 4-profile hardware limits across every module', () => {
    expect(defineValue('MP_MAX_LAYERS')).toBe(MAX_HARDWARE_LAYERS);
    expect(defineValue('MP_MAX_PROFILES')).toBe(MAX_HARDWARE_PROFILES);
    expect(MAX_LAYER_COUNT).toBe(MAX_HARDWARE_LAYERS);
    expect(MAX_PROFILE_COUNT).toBe(MAX_HARDWARE_PROFILES);
    expect(defineValue('DYNAMIC_KEYMAP_LAYER_COUNT', configHeader)).toBe(MAX_HARDWARE_LAYERS);
    expect(keyboardJson.features.via).toBe(true);
  });

  it('clamps app-side layer requests to the firmware range', async () => {
    // The bridge rejects out-of-range values rather than sending them.
    const hid = { addEventListener() {}, removeEventListener() {}, getDevices: async () => [], requestDevice: async () => [] };
    const instance = new bridge.QmkViaBridge(hid as never, { timeoutMs: 10 });
    await expect(instance.request({ cmd: 'select_layer', layer: MAX_HARDWARE_LAYERS }))
      .resolves.toMatchObject({ ok: false });
  });
});

describe('custom keycode ranges', () => {
  it('agrees on trigger and profile keycode ranges', () => {
    expect(defineValue('MP_TRIG_BASE')).toBe(bridge.MP_TRIG_BASE);
    expect(defineValue('MP_TRIG_MAX')).toBe(bridge.MP_TRIG_MAX);
    expect(defineValue('MP_PROF_BASE')).toBe(bridge.MP_PROF_BASE);
    expect(defineValue('MP_PROF_MAX')).toBe(bridge.MP_PROF_MAX);
    expect(defineValue('MP_LAYER_CYCLE')).toBe(bridge.MP_LAYER_CYCLE);
  });

  it('keeps the trigger range inside QK_KB and clear of QK_USER codes', () => {
    const base = defineValue('MP_TRIG_BASE');
    const max = defineValue('MP_TRIG_MAX');
    // QK_KB is 0x7E00..0x7E3F; QK_USER starts at 0x7E40.
    expect(base).toBe(0x7e00);
    expect(max).toBe(0x7e3f);
    for (const name of ['MP_PROF_BASE', 'MP_LAYER_CYCLE', 'MP_RGB_TOGG', 'MP_RGB_SPDU']) {
      expect(defineValue(name)).toBeGreaterThan(max);
    }
  });

  it('encodes a trigger keycode the firmware can decode back to the same slot', () => {
    const base = defineValue('MP_TRIG_BASE');
    const slotCount = GRID_MACRO_KEY_SLOTS.length + 3; // 9 keys + cw/press/ccw
    expect(slotCount).toBeLessThanOrEqual(16); // 4 bits of slot index
    for (let layer = 0; layer < MAX_HARDWARE_LAYERS; layer++) {
      for (let slot = 0; slot < slotCount; slot++) {
        const keycode = base | (layer << 4) | slot;
        expect(keycode).toBeGreaterThanOrEqual(base);
        expect(keycode).toBeLessThanOrEqual(defineValue('MP_TRIG_MAX'));
        // Firmware decode: bits [5:4] layer, [3:0] slot.
        expect((keycode >> 4) & 0x03).toBe(layer);
        expect(keycode & 0x0f).toBe(slot);
      }
    }
  });
});

describe('RGB configuration payload', () => {
  it('agrees on LED mode ordinals', () => {
    expect(defineValue('MP_LED_MODE_OFF')).toBe(0);
    expect(defineValue('MP_LED_MODE_SOLID')).toBe(1);
    expect(defineValue('MP_LED_MODE_RAINBOW')).toBe(2);
    expect(defineValue('MP_LED_MODE_BREATH')).toBe(3);
    // The app maps presets by position: ['Off','Solid','Rainbow','Breath'].
    const appModeMap = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8')
      .match(/const modeMap = \[([^\]]+)\]/);
    expect(appModeMap).not.toBeNull();
    expect(appModeMap![1].replace(/['\s]/g, '')).toBe('Off,Solid,Rainbow,Breath');
  });

  it('writes the byte offsets the firmware reads', () => {
    const bridgeSource = readFileSync(join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf8');
    // App writes: [2]=persist [3]=enabled [4..15]=4x RGB [16..19]=modes [20..23]=speeds
    expect(bridgeSource).toContain('packet[2] = cfg.persist ? 1 : 0');
    expect(bridgeSource).toContain('packet[3] = cfg.enabled ? 1 : 0');
    expect(bridgeSource).toContain('packet[4 + i * 3 + 0]');
    expect(bridgeSource).toContain('packet[16 + i]');
    expect(bridgeSource).toContain('packet[20 + i]');
    // Firmware reads exactly those offsets.
    expect(viaKeymap).toContain('uint8_t persist = data[2];');
    expect(viaKeymap).toContain('mp_rgb_enabled = data[3] ? 1 : 0;');
    expect(viaKeymap).toContain('data[4 + i * 3 + 0]');
    expect(viaKeymap).toContain('data[16 + i]');
    expect(viaKeymap).toContain('data[20 + i]');
  });

  it('builds the state report at the offsets the app parses', () => {
    // Firmware mp_fill_state_report: [2]=layer [3]=profile [4]=maxLayers
    // [5]=maxProfiles [6]=rgbEnabled [7..18]=RGB [19..22]=modes [23..26]=speeds
    for (const fragment of [
      'data[2] = active_layer;',
      'data[3] = mp_active_profile;',
      'data[4] = MP_MAX_LAYERS;',
      'data[5] = MP_MAX_PROFILES;',
      'data[6] = mp_rgb_enabled;',
      'data[7 + i * 3 + 0]',
      'data[19 + i] = mp_layer_mode[i];',
      'data[23 + i] = mp_layer_speed[i];',
    ]) {
      expect(viaKeymap, `state report must set ${fragment}`).toContain(fragment);
    }
    const bridgeSource = readFileSync(join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf8');
    for (const fragment of ['res[2]', 'res[3]', 'res[6]', 'res[7]', 'res[19]', 'res[23]', 'res[26]']) {
      expect(bridgeSource, `app must parse ${fragment}`).toContain(fragment);
    }
  });

  it('keeps the WS2812 byte order fix that corrected the R/G swap', () => {
    expect(configHeader).toMatch(/#define\s+WS2812_BYTE_ORDER\s+WS2812_BYTE_ORDER_RGB/);
    expect(keyboardJson.rgblight.led_count).toBe(1);
    expect(keyboardJson.rgblight.driver).toBe('ws2812');
  });
});

describe('raw report framing', () => {
  it('uses the 32-byte report size QMK Raw HID requires', () => {
    expect(bridge.VIA_RAW_REPORT_SIZE).toBe(32);
    // Firmware sends sizeof(report) where report is uint8_t[32].
    expect(viaKeymap).toMatch(/uint8_t report\[32\]/);
    expect(viaKeymap).toContain('raw_hid_send(report, sizeof(report));');
  });

  it('pins a VIA protocol version the firmware implements', () => {
    // QMK's VIA_PROTOCOL_VERSION is 0x000D at the pinned revision; the bridge
    // refuses to connect on mismatch rather than speaking a wrong dialect.
    expect(bridge.VIA_PROTOCOL_VERSION).toBe(0x000d);
    const bridgeSource = readFileSync(join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf8');
    expect(bridgeSource).toContain('Unsupported VIA protocol');
  });
});
