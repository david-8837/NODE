import { describe, expect, it } from 'vitest';
import {
  QmkViaBridge,
  VIA_PROTOCOL_VERSION,
  VIA_RAW_REPORT_SIZE,
  VIA_RAW_USAGE_ID,
  VIA_RAW_USAGE_PAGE,
  VIA_USB_PRODUCT_ID,
  VIA_USB_VENDOR_ID,
  type HidApiLike,
  type HidDeviceLike,
  type ViaConfiguration,
} from '../src/qmkViaBridge';

/**
 * Physical-testing report: "Profile switching is inconsistent -- the name changes
 * but the expected profile behaviour is not reliable."
 *
 * Root cause: set_config only wrote the layers/slots a profile defines and left
 * everything else live, but the firmware's SAVE_PROFILE copies the ENTIRE live
 * keymap (all 4 layers, every slot) into the profile's EEPROM slot. Leftovers from
 * the previously active profile were therefore captured into the newly selected
 * profile and kept reappearing on later switches.
 *
 * This fake models the firmware EEPROM semantics exactly (save copies live->slot,
 * select copies slot->live) so the assertions describe what the pad would really
 * execute, not just what the UI displays.
 */

const MAX_LAYERS = 4;
const MAX_PROFILES = 4;

type SlotImage = { keys: Map<string, number>; enc: Map<string, number> };

const emptyImage = (): SlotImage => ({ keys: new Map(), enc: new Map() });

function bytes(source: BufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

class FirmwareProfileDevice extends EventTarget implements HidDeviceLike {
  public readonly vendorId = VIA_USB_VENDOR_ID;
  public readonly productId = VIA_USB_PRODUCT_ID;
  public readonly productName = 'Grid Macro 1 profile fixture';
  public readonly collections = [{ usagePage: VIA_RAW_USAGE_PAGE, usage: VIA_RAW_USAGE_ID }];
  public opened = false;
  public layerCount = MAX_LAYERS;
  public activeProfile = 0;
  public activeLayer = 0;

  /** The live dynamic keymap -- this is what the pad actually executes. */
  public live: SlotImage = emptyImage();
  /** Persistent EEPROM profile slots. */
  public slots: SlotImage[] = Array.from({ length: MAX_PROFILES }, emptyImage);

  public async open() { this.opened = true; }
  public async close() { this.opened = false; }

  /** Firmware mp_save_profile_to_slot(): copy every layer of live into the slot. */
  private saveToSlot(slot: number) {
    if (slot >= MAX_PROFILES) return;
    this.slots[slot] = { keys: new Map(this.live.keys), enc: new Map(this.live.enc) };
  }

  /** Firmware mp_load_profile_from_slot(): slot becomes the live keymap. */
  private loadFromSlot(slot: number) {
    if (slot >= MAX_PROFILES) return;
    this.live = {
      keys: new Map(this.slots[slot].keys),
      enc: new Map(this.slots[slot].enc),
    };
  }

  public keycode(layer: number, row: number, col: number) {
    return this.live.keys.get(`${layer}:${row}:${col}`) ?? 0;
  }

  public encoder(layer: number, clockwise: boolean) {
    return this.live.enc.get(`${layer}:${clockwise ? 1 : 0}`) ?? 0;
  }

  /** Every non-zero live entry, so a test can assert an exact whole-device image. */
  public liveImage() {
    return {
      keys: [...this.live.keys.entries()].filter(([, v]) => v !== 0).sort(),
      enc: [...this.live.enc.entries()].filter(([, v]) => v !== 0).sort(),
    };
  }

  public async sendReport(reportId: number, data: BufferSource) {
    const request = bytes(data);
    const response = new Uint8Array(VIA_RAW_REPORT_SIZE);
    response[0] = request[0];

    if (request[0] === 0x01) {
      response[1] = (VIA_PROTOCOL_VERSION >> 8) & 0xff;
      response[2] = VIA_PROTOCOL_VERSION & 0xff;
    } else if (request[0] === 0x04) {
      const value = this.keycode(request[1], request[2], request[3]);
      response[4] = (value >> 8) & 0xff;
      response[5] = value & 0xff;
    } else if (request[0] === 0x05) {
      this.live.keys.set(`${request[1]}:${request[2]}:${request[3]}`, (request[4] << 8) | request[5]);
    } else if (request[0] === 0x11) {
      response[1] = this.layerCount;
    } else if (request[0] === 0x14) {
      const value = this.encoder(request[1], request[3] === 1);
      response[4] = (value >> 8) & 0xff;
      response[5] = value & 0xff;
    } else if (request[0] === 0x15) {
      this.live.enc.set(`${request[1]}:${request[3]}`, (request[4] << 8) | request[5]);
    } else if (request[0] === 0xfd && request[1] === 0x01) {
      response[1] = 0x01;
      response[2] = this.activeLayer;
      response[3] = this.activeProfile;
      response[4] = MAX_LAYERS;
      response[5] = MAX_PROFILES;
      response[6] = 1;
    } else if (request[0] === 0xfd && request[1] === 0x03) {
      // MP_CMD_SAVE_PROFILE: sets active then saves live into that slot.
      const target = request[2];
      if (target < MAX_PROFILES) {
        this.activeProfile = target;
        this.saveToSlot(target);
      }
      response[1] = 0x03;
      response[2] = this.activeProfile;
      response[3] = this.activeLayer;
    } else if (request[0] === 0xfd && request[1] === 0x02) {
      // MP_CMD_SELECT_PROFILE: save current, switch, load target into live.
      const target = request[2];
      if (target < MAX_PROFILES) {
        if (request[3] !== 0) this.saveToSlot(this.activeProfile);
        this.activeProfile = target;
        this.loadFromSlot(target);
      }
      response[1] = 0x02;
      response[2] = this.activeProfile;
      response[3] = this.activeLayer;
    }

    this.dispatchEvent(Object.assign(new Event('inputreport'), {
      device: this,
      reportId,
      data: new DataView(response.buffer),
    }));
  }
}

class FixtureHidApi extends EventTarget implements HidApiLike {
  public readonly device = new FirmwareProfileDevice();
  public async getDevices() { return [this.device]; }
  public async requestDevice() { return [this.device]; }
}

/** A profile that assigns one distinct letter per defined layer. */
function profileConfig(letters: string[]): ViaConfiguration {
  return {
    version: 1,
    layers: letters.map((letter) => ({
      keys: { r1c1: { t: 'keys', k: [letter] } },
      enc: {},
    })),
  };
}

const LETTER_KEYCODE: Record<string, number> = { A: 0x04, B: 0x05, C: 0x06, D: 0x07 };

async function connect() {
  const hid = new FixtureHidApi();
  const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
  await bridge.connect();
  return { hid, bridge, device: hid.device };
}

describe('profile switching writes an exact device image', () => {
  it('does not leak a longer profile into a shorter one', async () => {
    const { bridge, device } = await connect();

    // Profile 1 defines two layers.
    expect((await bridge.request({
      cmd: 'set_config', config: profileConfig(['A', 'B']), profileSlot: 0,
    })).ok).toBe(true);
    expect(device.keycode(0, 0, 0)).toBe(LETTER_KEYCODE.A);
    expect(device.keycode(1, 0, 0)).toBe(LETTER_KEYCODE.B);

    // Profile 2 defines only one layer. Layer 2 must NOT still fire profile 1's B.
    expect((await bridge.request({
      cmd: 'set_config', config: profileConfig(['C']), profileSlot: 1,
    })).ok).toBe(true);
    expect(device.keycode(0, 0, 0)).toBe(LETTER_KEYCODE.C);
    expect(device.keycode(1, 0, 0)).toBe(0);
    expect(device.liveImage().keys).toEqual([['0:0:0', LETTER_KEYCODE.C]]);
  });

  it('clears a key the new profile leaves unassigned', async () => {
    const { bridge, device } = await connect();
    await bridge.request({
      cmd: 'set_config',
      config: { version: 1, layers: [{ keys: { r1c1: { t: 'keys', k: ['A'] }, r2c2: { t: 'keys', k: ['B'] } } }] },
      profileSlot: 0,
    });
    expect(device.keycode(0, 1, 1)).toBe(LETTER_KEYCODE.B);

    await bridge.request({
      cmd: 'set_config',
      config: { version: 1, layers: [{ keys: { r1c1: { t: 'keys', k: ['C'] } } }] },
      profileSlot: 1,
    });
    expect(device.keycode(0, 0, 0)).toBe(LETTER_KEYCODE.C);
    expect(device.keycode(0, 1, 1)).toBe(0);
  });

  it('keeps all four profiles distinct across forward and backward switching', async () => {
    const { bridge, device } = await connect();
    const letters = ['A', 'B', 'C', 'D'];
    for (let slot = 0; slot < 4; slot += 1) {
      expect((await bridge.request({
        cmd: 'set_config', config: profileConfig([letters[slot]]), profileSlot: slot,
      })).ok).toBe(true);
    }

    // Every transition, forwards and backwards, must leave exactly that profile.
    for (const slot of [0, 1, 2, 3, 2, 1, 0, 3, 1, 2, 0]) {
      await bridge.request({
        cmd: 'set_config', config: profileConfig([letters[slot]]), profileSlot: slot,
      });
      expect(device.activeProfile).toBe(slot);
      expect(device.liveImage().keys).toEqual([['0:0:0', LETTER_KEYCODE[letters[slot]]]]);
    }
  });

  it('survives repeated switching between the same two profiles', async () => {
    const { bridge, device } = await connect();
    for (let i = 0; i < 6; i += 1) {
      const slot = i % 2;
      const letter = slot === 0 ? 'A' : 'D';
      await bridge.request({
        cmd: 'set_config', config: profileConfig([letter, letter]), profileSlot: slot,
      });
      expect(device.liveImage().keys).toEqual([
        ['0:0:0', LETTER_KEYCODE[letter]],
        ['1:0:0', LETTER_KEYCODE[letter]],
      ]);
    }
  });

  it('isolates encoder assignments between profiles', async () => {
    const { bridge, device } = await connect();
    await bridge.request({
      cmd: 'set_config',
      config: { version: 1, layers: [{ keys: {}, enc: { cw: { t: 'keys', k: ['A'] }, ccw: { t: 'keys', k: ['B'] } } }] },
      profileSlot: 0,
    });
    expect(device.encoder(0, true)).toBe(LETTER_KEYCODE.A);
    expect(device.encoder(0, false)).toBe(LETTER_KEYCODE.B);

    await bridge.request({
      cmd: 'set_config',
      config: { version: 1, layers: [{ keys: {}, enc: {} }] },
      profileSlot: 1,
    });
    expect(device.encoder(0, true)).toBe(0);
    expect(device.encoder(0, false)).toBe(0);
  });

  it('persists each profile so a hardware profile key loads the right keys', async () => {
    const { bridge, device } = await connect();
    const letters = ['A', 'B', 'C', 'D'];
    for (let slot = 0; slot < 4; slot += 1) {
      await bridge.request({
        cmd: 'set_config', config: profileConfig([letters[slot]]), profileSlot: slot,
      });
    }

    // Physical profile buttons use SELECT_PROFILE, which loads EEPROM into live.
    for (const slot of [0, 2, 1, 3, 0]) {
      const result = await bridge.request({ cmd: 'select_profile', profileSlot: slot, saveCurrentProfile: false });
      expect(result.ok).toBe(true);
      expect(device.activeProfile).toBe(slot);
      expect(device.keycode(0, 0, 0)).toBe(LETTER_KEYCODE[letters[slot]]);
      expect(device.liveImage().keys).toEqual([['0:0:0', LETTER_KEYCODE[letters[slot]]]]);
    }
  });

  it('reports the cleared-layer behaviour instead of silently leaving layers stale', async () => {
    const { bridge } = await connect();
    const result = await bridge.request({
      cmd: 'set_config', config: profileConfig(['A']), profileSlot: 0,
    });
    expect(result.ok).toBe(true);
    expect(result.warnings?.some((w) => /remaining layers were cleared/.test(w))).toBe(true);
  });
});
