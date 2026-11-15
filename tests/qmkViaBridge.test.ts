import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  actionToViaKeycode,
  MP_LAYER_CYCLE,
  MP_PROF_MAX,
  MP_TRIG_MAX,
  QmkViaBridge,
  VIA_PROTOCOL_VERSION,
  VIA_RAW_REPORT_SIZE,
  VIA_RAW_USAGE_ID,
  VIA_RAW_USAGE_PAGE,
  VIA_USB_PRODUCT_ID,
  VIA_USB_VENDOR_ID,
  type HidApiLike,
  type HidDeviceLike,
} from '../src/qmkViaBridge';

afterEach(() => vi.unstubAllGlobals());

function reportBytes(source: BufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  return new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
}

class FakeViaDevice extends EventTarget implements HidDeviceLike {
  public readonly vendorId = VIA_USB_VENDOR_ID;
  public readonly productId = VIA_USB_PRODUCT_ID;
  public readonly productName = 'Grid Macro 1 test device';
  public readonly collections = [{ usagePage: VIA_RAW_USAGE_PAGE, usage: VIA_RAW_USAGE_ID }];
  public opened = false;
  public readonly reports: Uint8Array[] = [];
  public protocolVersion = VIA_PROTOCOL_VERSION;
  public firmwareVersion = 0x01020304;
  public layerCount = 4;
  public readonly keycodes = new Map<string, number>();
  public readonly encoderKeycodes = new Map<string, number>();
  public failNextReport = false;
  public customDeviceState?: Uint8Array;
  /** Firmware-side active layer, so SELECT_LAYER can be modelled realistically. */
  public activeLayer = 0;
  public activeProfile = 0;
  /** When set, the firmware refuses the switch and keeps its current layer. */
  public refuseLayerSwitch = false;
  /** When true, SELECT_LAYER is left unanswered so the host must time out. */
  public swallowLayerSwitch = false;
  public layerSwitchCount = 0;
  private layerStateSeeded = false;

  /** Unsolicited MP_EVT_LAYER_STATE, exactly as layer_state_set_user() sends it. */
  public emitLayerStateEvent(layer = this.activeLayer) {
    const report = new Uint8Array(VIA_RAW_REPORT_SIZE);
    report[0] = 0xfd;
    report[1] = 0x10;
    report[2] = layer;
    report[3] = this.activeProfile;
    this.dispatchEvent(Object.assign(new Event('inputreport'), {
      device: this,
      reportId: 0,
      data: new DataView(report.buffer),
    }));
  }

  public seedKeycode(layer: number, row: number, col: number, keycode: number) {
    this.keycodes.set(`${layer}:${row}:${col}`, keycode);
  }

  public seedEncoder(layer: number, clockwise: boolean, keycode: number) {
    this.encoderKeycodes.set(`${layer}:${Number(clockwise)}`, keycode);
  }

  public async open() {
    this.opened = true;
  }

  public async close() {
    this.opened = false;
  }

  public async sendReport(reportId: number, data: BufferSource) {
    this.reports.push(Uint8Array.from(reportBytes(data)));
    if (this.failNextReport) {
      this.failNextReport = false;
      throw new Error('Mock HID write failure');
    }
    const request = reportBytes(data);
    const response = new Uint8Array(VIA_RAW_REPORT_SIZE);
    response[0] = request[0];

    if (request[0] === 0x01) {
      response[1] = (this.protocolVersion >> 8) & 0xff;
      response[2] = this.protocolVersion & 0xff;
    } else if (request[0] === 0x02 && request[1] === 0x04) {
      response[1] = request[1];
      response[2] = (this.firmwareVersion >>> 24) & 0xff;
      response[3] = (this.firmwareVersion >>> 16) & 0xff;
      response[4] = (this.firmwareVersion >>> 8) & 0xff;
      response[5] = this.firmwareVersion & 0xff;
    } else if (request[0] === 0x04) {
      const value = this.keycodes.get(`${request[1]}:${request[2]}:${request[3]}`) ?? 0;
      response[4] = (value >> 8) & 0xff;
      response[5] = value & 0xff;
    } else if (request[0] === 0x05) {
      this.keycodes.set(
        `${request[1]}:${request[2]}:${request[3]}`,
        (request[4] << 8) | request[5]
      );
    } else if (request[0] === 0x11) {
      response[1] = this.layerCount;
    } else if (request[0] === 0x14) {
      const value = this.encoderKeycodes.get(`${request[1]}:${request[3]}`) ?? 0;
      response[4] = (value >> 8) & 0xff;
      response[5] = value & 0xff;
    } else if (request[0] === 0x15) {
      this.encoderKeycodes.set(`${request[1]}:${request[3]}`, (request[4] << 8) | request[5]);
    } else if (request[0] === 0xfd && request[1] === 0x01) {
      // MP_CMD_GET_STATE: real firmware always answers with the full state report.
      if (this.customDeviceState) {
        response.set(this.customDeviceState.subarray(0, response.length));
        // A seeded packet defines the starting state; later switches move it.
        if (!this.layerStateSeeded) {
          this.activeLayer = response[2];
          this.activeProfile = response[3];
          this.layerStateSeeded = true;
        }
      } else {
        response[1] = 0x01;
        response[4] = 4; // MP_MAX_LAYERS
        response[5] = 4; // MP_MAX_PROFILES
        response[6] = 1; // rgb enabled
      }
      response[2] = this.activeLayer;
      response[3] = this.activeProfile;
    } else if (request[0] === 0xfd && request[1] === 0x05) {
      // MP_CMD_SELECT_LAYER: mirror the firmware handler. Switch only when the
      // target is valid and different, then always answer with the real layer.
      this.layerSwitchCount += 1;
      if (this.swallowLayerSwitch) return;
      const target = request[2];
      if (!this.refuseLayerSwitch && target < 4 && target !== this.activeLayer) {
        this.activeLayer = target;
        this.emitLayerStateEvent();
      }
      response[1] = 0x05;
      response[2] = this.activeLayer;
      response[3] = this.activeProfile;
      response[4] = 4;
      response[5] = 4;
      response[6] = 1;
    }

    const event = Object.assign(new Event('inputreport'), {
      device: this,
      reportId,
      data: new DataView(response.buffer),
    });
    this.dispatchEvent(event);
  }
}

class FakeHidApi extends EventTarget implements HidApiLike {
  public readonly device = new FakeViaDevice();
  public filterOptions?: Parameters<HidApiLike['requestDevice']>[0];
  public deviceAvailableForSilentScan = false;

  public async getDevices() {
    return this.deviceAvailableForSilentScan ? [this.device] : [] as HidDeviceLike[];
  }

  public async requestDevice(options: Parameters<HidApiLike['requestDevice']>[0]) {
    this.filterOptions = options;
    return [this.device];
  }
}

describe('QMK/VIA keycode translation', () => {
  it.each([
    [{ t: 'keys', k: ['A'] }, 0x04],
    [{ t: 'keys', k: ['ONE'] }, 0x1e],
    [{ t: 'keys', k: ['NINE'] }, 0x26],
    [{ t: 'keys', k: ['ZERO'] }, 0x27],
    [{ t: 'keys', k: ['F12'] }, 0x45],
    [{ t: 'keys', k: ['CONTROL', 'SHIFT', 'S'] }, 0x0316],
    [{ t: 'keys', k: ['RIGHT_CONTROL', 'Z'] }, 0x111d],
    [{ t: 'keys', k: ['RIGHT_SHIFT', 'A'] }, 0x1204],
    [{ t: 'keys', k: ['RIGHT_ALT', 'F'] }, 0x1409],
    [{ t: 'media', c: 'VOLUME_INCREMENT' }, 0x00a9],
    [{ t: 'media', c: 'BRIGHTNESS_INCREMENT' }, 0x00bd],
    [{ t: 'media', c: 'BRIGHTNESS_DECREMENT' }, 0x00be],
    [{ t: 'layer', op: 'set', n: 2 }, 0x5202],
    [{ t: 'layer', op: 'hold', n: 1 }, 0x5221],
    // Layer Cycle previously returned null and was silently dropped before ever
    // reaching the device. It now maps to a firmware-handled custom keycode.
    [{ t: 'layer', op: 'next' }, 0x7e44],
    [{ t: 'layer', op: 'next', n: 0 }, 0x7e44],
  ])('translates supported action %j to VIA keycode %j', (action, expected) => {
    expect(actionToViaKeycode(action)).toBe(expected);
  });

  it('returns zero for an empty slot and declines unsupported sequences', () => {
    expect(actionToViaKeycode(undefined)).toBe(0);
    expect(actionToViaKeycode({ t: 'keys', k: ['A', 'B'] })).toBeNull();
    expect(actionToViaKeycode({ t: 'keys', k: ['CONTROL', 'RIGHT_SHIFT', 'A'] })).toBeNull();
    expect(actionToViaKeycode({ t: 'media', c: 'UNKNOWN' })).toBeNull();
    expect(actionToViaKeycode({ t: 'layer', op: 'unknown', n: 1 })).toBeNull();
    expect(actionToViaKeycode({ t: 'layer', op: 'set' })).toBeNull();
  });

  it('keeps Layer Cycle clear of the host-trigger and profile keycode ranges', () => {
    const cycle = actionToViaKeycode({ t: 'layer', op: 'next' });
    expect(cycle).toBe(MP_LAYER_CYCLE);
    expect(cycle).toBeGreaterThan(MP_TRIG_MAX);
    expect(cycle).toBeGreaterThan(MP_PROF_MAX);
    // Layer Cycle takes no target layer, so it must survive an out-of-range n.
    expect(actionToViaKeycode({ t: 'layer', op: 'next', n: 99 })).toBe(MP_LAYER_CYCLE);
  });
});

describe('QMK/VIA WebHID bridge', () => {
  it('requests the matching HID interface and verifies VIA version and layer count', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });

    const status = await bridge.connect();

    expect(hid.filterOptions?.filters).toEqual([{
      vendorId: VIA_USB_VENDOR_ID,
      productId: VIA_USB_PRODUCT_ID,
      usagePage: VIA_RAW_USAGE_PAGE,
      usage: VIA_RAW_USAGE_ID,
    }]);
    expect(status).toMatchObject({
      state: 'connected',
      device: 'Grid Macro 1 test device',
      fw: 'VIA 01020304',
      layerCount: 4,
    });
    expect(hid.device.reports.slice(0, 2).map((report) => report[0])).toEqual([0x01, 0x11]);
    expect(hid.device.reports[0]).toHaveLength(VIA_RAW_REPORT_SIZE);

    await bridge.disconnect();
    expect(hid.device.opened).toBe(false);
  });

  it('reads a keymap-only snapshot with stock VIA GET commands and no writes', async () => {
    const hid = new FakeHidApi();
    hid.device.seedKeycode(0, 0, 0, 0x1204);
    hid.device.seedKeycode(0, 3, 0, 0x0028);
    hid.device.seedEncoder(0, false, 0x00aa);
    hid.device.seedEncoder(0, true, 0x00a9);
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const result = await bridge.request({ cmd: 'get_config' });

    expect(result).toMatchObject({
      ok: true,
      layerCount: 4,
      snapshot: {
        protocolVersion: VIA_PROTOCOL_VERSION,
        layerCount: 4,
        capturedLayerCount: 4,
      },
    });
    expect(result.snapshot?.layers[0]).toMatchObject({
      keys: { r1c1: 0x1204 },
      enc: { ccw: 0x00aa, cw: 0x00a9, press: 0x0028 },
    });
    expect(hid.device.reports.filter((report) => report[0] === 0x04)).toHaveLength(4 * 10);
    expect(hid.device.reports.filter((report) => report[0] === 0x14)).toHaveLength(4 * 2);
    expect(hid.device.reports.some((report) => report[0] === 0x05 || report[0] === 0x15)).toBe(false);
  });

  it('reports a failed silent reconnect instead of remaining stuck in connecting', async () => {
    const hid = new FakeHidApi();
    hid.deviceAvailableForSilentScan = true;
    hid.device.protocolVersion = VIA_PROTOCOL_VERSION - 1;
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });

    const status = await bridge.getStatus();

    expect(status.state).toBe('disconnected');
    expect(status.error).toContain('Unsupported VIA protocol');
    expect(hid.device.opened).toBe(false);
  });

  it('restores a validated VIA snapshot through standard keycode and encoder SET commands', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    const snapshot = {
      protocolVersion: VIA_PROTOCOL_VERSION,
      layerCount: 4,
      capturedLayerCount: 4,
      layers: Array.from({ length: 4 }, () => ({
        keys: Object.fromEntries([
          ['r1c1', 0x0004], ['r1c2', 0x0005], ['r1c3', 0x0006],
          ['r2c1', 0x0007], ['r2c2', 0x0008], ['r2c3', 0x0009],
          ['r3c1', 0x000a], ['r3c2', 0x000b], ['r3c3', 0x000c],
        ]),
        enc: { ccw: 0x00aa, cw: 0x00a9, press: 0x0028 },
      })),
    };

    const restored = await bridge.request({ cmd: 'restore_config', snapshot });

    expect(restored).toMatchObject({ ok: true, layerCount: 4, changedMappings: 48 });
    expect(hid.device.keycodes.get('0:0:0')).toBe(0x0004);
    expect(hid.device.keycodes.get('0:3:0')).toBe(0x0028);
    expect(hid.device.encoderKeycodes.get('0:0')).toBe(0x00aa);
    expect(hid.device.encoderKeycodes.get('0:1')).toBe(0x00a9);
    expect(hid.device.reports.filter((report) => report[0] === 0x05)).toHaveLength(4 * 10);
    expect(hid.device.reports.filter((report) => report[0] === 0x15)).toHaveLength(4 * 2);

    const reportsBeforeIdempotentRestore = hid.device.reports.length;
    await expect(bridge.request({ cmd: 'restore_config', snapshot })).resolves.toMatchObject({
      ok: true,
      changedMappings: 0,
    });
    expect(hid.device.reports.slice(reportsBeforeIdempotentRestore).some(
      (report) => report[0] === 0x05 || report[0] === 0x15
    )).toBe(false);
  });

  it('rejects an invalid VIA restore snapshot before sending any writes', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const result = await bridge.request({
      cmd: 'restore_config',
      snapshot: { protocolVersion: VIA_PROTOCOL_VERSION, layerCount: 4 } as any,
    });

    expect(result).toMatchObject({ ok: false, error: 'Invalid or incomplete device keymap backup' });
    expect(hid.device.reports.some((report) => report[0] === 0x05 || report[0] === 0x15)).toBe(false);
  });

  it('writes the app keymap and encoder actions using stock VIA command IDs', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const result = await bridge.request({
      cmd: 'set_config',
      config: {
        version: 1,
        layers: [{
          keys: {
            r1c1: { t: 'keys', k: ['CONTROL', 'SHIFT', 'S'] },
            r1c2: { t: 'layer', op: 'hold', n: 1 },
            r1c3: { t: 'layer', op: 'next', n: 0 },
          },
          enc: {
            ccw: { t: 'media', c: 'VOLUME_DECREMENT' },
            cw: { t: 'media', c: 'VOLUME_INCREMENT' },
            press: { t: 'keys', k: ['ENTER'] },
          },
        }],
      },
    });

    expect(result.ok).toBe(true);
    // Layer Cycle is now a real keycode, so it must sync without a warning.
    expect(result.warnings ?? []).not.toContain('Layer 1 R1C3: unsupported action was not synced');
    const writes = hid.device.reports.filter((report) => report[0] === 0x05);
    expect(writes.find((report) => report[1] === 0 && report[2] === 0 && report[3] === 0)?.slice(4, 6))
      .toEqual(new Uint8Array([0x03, 0x16]));
    expect(writes.find((report) => report[1] === 0 && report[2] === 0 && report[3] === 1)?.slice(4, 6))
      .toEqual(new Uint8Array([0x52, 0x21]));
    // R1C3 = Layer Cycle -> MP_LAYER_CYCLE (0x7E44) written big-endian to the device.
    expect(writes.find((report) => report[1] === 0 && report[2] === 0 && report[3] === 2)?.slice(4, 6))
      .toEqual(new Uint8Array([0x7e, 0x44]));
    expect(writes.find((report) => report[1] === 0 && report[2] === 3 && report[3] === 0)?.slice(4, 6))
      .toEqual(new Uint8Array([0x00, 0x28]));

    const encoders = hid.device.reports.filter((report) => report[0] === 0x15);
    expect(encoders.find((report) => report[3] === 0)?.slice(4, 6)).toEqual(new Uint8Array([0x00, 0xaa]));
    expect(encoders.find((report) => report[3] === 1)?.slice(4, 6)).toEqual(new Uint8Array([0x00, 0xa9]));

    const writeCount = hid.device.reports.filter((report) => report[0] === 0x05 || report[0] === 0x15).length;
    await bridge.request({
      cmd: 'set_config',
      config: {
        version: 1,
        layers: [{
          keys: {
            r1c1: { t: 'keys', k: ['CONTROL', 'SHIFT', 'S'] },
            r1c2: { t: 'layer', op: 'hold', n: 1 },
            r1c3: { t: 'layer', op: 'next', n: 0 },
          },
          enc: {
            ccw: { t: 'media', c: 'VOLUME_DECREMENT' },
            cw: { t: 'media', c: 'VOLUME_INCREMENT' },
            press: { t: 'keys', k: ['ENTER'] },
          },
        }],
      },
    });
    expect(hid.device.reports.filter((report) => report[0] === 0x05 || report[0] === 0x15)).toHaveLength(writeCount);
  });

  it('does not sync layer-switch keycodes that target unavailable device layers', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const result = await bridge.request({
      cmd: 'set_config',
      config: {
        version: 1,
        layers: [{
          keys: { r1c1: { t: 'layer', op: 'hold', n: 4 } },
          enc: { cw: { t: 'layer', op: 'set', n: 7 } },
        }],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain(
      'Layer 1 R1C1: target layer 5 is not available on this device; action was not synced'
    );
    expect(result.warnings).toContain(
      'Layer 1 encoder CW: target layer 8 is not available on this device; action was not synced'
    );
    expect(hid.device.reports.filter((report) => report[0] === 0x05 || report[0] === 0x15)).toHaveLength(0);
  });

  it('clears only explicit blanks and leaves unsupported or unconfigured mappings intact', async () => {
    const hid = new FakeHidApi();
    hid.device.seedKeycode(0, 0, 0, 0x0004);
    hid.device.seedKeycode(0, 0, 1, 0x0005);
    hid.device.seedKeycode(1, 0, 0, 0x0006);
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const result = await bridge.request({
      cmd: 'set_config',
      config: {
        version: 1,
        layers: [{
          keys: {
            r1c1: { t: 'none' },
            r1c2: { t: 'keys', k: ['UNSUPPORTED'] },
          },
        }],
      },
    });

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('Layer 1 R1C2: unsupported action was not synced');
    expect(hid.device.keycodes.get('0:0:0')).toBe(0);
    expect(hid.device.keycodes.get('0:0:1')).toBe(0x0005);
    expect(hid.device.keycodes.get('1:0:0')).toBe(0x0006);
    const writes = hid.device.reports.filter((report) => report[0] === 0x05);
    expect(writes).toHaveLength(1);
    expect(writes[0].slice(1, 6)).toEqual(new Uint8Array([0, 0, 0, 0, 0]));
  });

  it('recovers cleanly after a HID send failure instead of leaving a request stuck', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    hid.device.failNextReport = true;
    const config = { version: 1 as const, layers: [{}] };

    await expect(bridge.request({ cmd: 'set_config', config })).resolves.toMatchObject({
      ok: false,
      error: 'Mock HID write failure',
    });
    await expect(bridge.request({ cmd: 'set_config', config })).resolves.toMatchObject({ ok: true });
  });

  it('marks a physically disconnected device as disconnected', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    const listener = vi.fn();
    bridge.onStatus(listener);

    hid.dispatchEvent(Object.assign(new Event('disconnect'), { device: hid.device }));

    expect(listener).toHaveBeenCalledWith({ state: 'disconnected', error: 'The device was disconnected' });
    await expect(bridge.request({ cmd: 'set_config', config: { version: 1, layers: [{}] } }))
      .resolves.toMatchObject({ ok: false, error: 'No QMK/VIA device is connected' });
  });

  it('does not claim support for an incompatible VIA version', async () => {
    const hid = new FakeHidApi();
    hid.device.protocolVersion = VIA_PROTOCOL_VERSION - 1;
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });

    const status = await bridge.connect();

    expect(status.state).toBe('disconnected');
    expect(status.error).toContain('Unsupported VIA protocol');
    expect(hid.device.opened).toBe(false);
  });

  it('keeps profile-file semantics local and rejects unsupported requests', async () => {
    const bridge = new QmkViaBridge(new FakeHidApi(), { timeoutMs: 20 });

    await expect(bridge.getFile('app_state')).resolves.toMatchObject({
      ok: false,
      error: 'Full profiles are stored in this browser; VIA stores keymaps only',
    });
    await expect(bridge.request({ cmd: 'get_status' })).resolves.toMatchObject({ ok: false });
    await expect(bridge.putFile('app_state', JSON.stringify({ v: 1, profiles: [] })))
      .resolves.toMatchObject({ ok: true, localOnly: true });
  });

  it('writes the app state only to browser localStorage', async () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    const bridge = new QmkViaBridge(new FakeHidApi(), { timeoutMs: 20 });
    const state = JSON.stringify({ v: 1, profiles: [{ id: 'local-profile', layers: [] }] });

    await expect(bridge.putFile('app_state', state)).resolves.toMatchObject({ ok: true, localOnly: true });
    expect(setItem).toHaveBeenCalledWith('cm2.state.v2', state);
    await expect(bridge.getFile('app_state')).resolves.toMatchObject({ ok: false });
  });

  it('hydrates 0xFD device layer, profile slot, and per-layer RGB modes on connect and writes RGB modes/speeds', async () => {
    const hid = new FakeHidApi();
    const statePacket = new Uint8Array(32);
    statePacket[0] = 0xfd;
    statePacket[1] = 0x01;
    statePacket[2] = 2; // active layer NUMPAD
    statePacket[3] = 1; // active profile slot 1
    statePacket[4] = 4; // MP_MAX_LAYERS
    statePacket[5] = 4; // MP_MAX_PROFILES
    statePacket[6] = 1; // rgb enabled
    statePacket.set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120], 7);
    statePacket.set([1, 2, 3, 0], 19); // Solid, Rainbow, Breath, Off
    statePacket.set([40, 75, 25, 50], 23);
    hid.device.customDeviceState = statePacket;

    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    const status = await bridge.connect();

    expect(status).toMatchObject({
      state: 'connected',
      deviceActiveLayer: 2,
      activeProfileSlot: 1,
      rgbConfig: {
        enabled: true,
        layerModes: [1, 2, 3, 0],
        layerSpeeds: [40, 75, 25, 50],
      },
    });

    const writeResult = await bridge.request({
      cmd: 'set_rgb_config',
      rgbConfig: {
        enabled: true,
        persist: true,
        layerColors: [
          { r: 0, g: 81, b: 255 },
          { r: 16, g: 185, b: 129 },
          { r: 245, g: 158, b: 11 },
          { r: 225, g: 29, b: 72 },
        ],
        layerModes: [2, 3, 1, 0],
        layerSpeeds: [80, 35, 50, 10],
      },
    });
    expect(writeResult.ok).toBe(true);
    const rgbPacket = hid.device.reports.find((r) => r[0] === 0xfd && r[1] === 0x04);
    expect(rgbPacket).toBeDefined();
    expect(Array.from(rgbPacket!.slice(16, 24))).toEqual([2, 3, 1, 0, 80, 35, 50, 10]);
  });

  it('sends SELECT_LAYER and reports the firmware-confirmed layer, not the requested one', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
    await bridge.connect();

    const events: unknown[] = [];
    const unsubscribe = bridge.onEvent((event) => events.push(event));

    await expect(bridge.request({ cmd: 'select_layer', layer: 1 }))
      .resolves.toMatchObject({ ok: true, deviceActiveLayer: 1, requestedLayer: 1, confirmed: true });

    const packet = hid.device.reports.find((r) => r[0] === 0xfd && r[1] === 0x05);
    expect(packet).toBeDefined();
    expect(packet![2]).toBe(1);
    expect(packet).toHaveLength(VIA_RAW_REPORT_SIZE);
    // The firmware's own layer event and the command reply must agree.
    expect(events).toContainEqual({ type: 'layer_state', deviceActiveLayer: 1, activeProfileSlot: 0 });
    await expect(bridge.getStatus()).resolves.toMatchObject({ deviceActiveLayer: 1 });

    unsubscribe();
    await bridge.disconnect();
  });

  it('reports confirmed:false and keeps the real layer when the firmware refuses the switch', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
    await bridge.connect();
    await bridge.request({ cmd: 'select_layer', layer: 2 });
    hid.device.refuseLayerSwitch = true;

    await expect(bridge.request({ cmd: 'select_layer', layer: 3 }))
      .resolves.toMatchObject({ ok: true, deviceActiveLayer: 2, requestedLayer: 3, confirmed: false });
    await expect(bridge.getStatus()).resolves.toMatchObject({ deviceActiveLayer: 2 });

    await bridge.disconnect();
  });

  it('rejects out-of-range layers without writing to the device', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
    await bridge.connect();
    const before = hid.device.reports.length;

    for (const layer of [-1, 4, 99, 1.5, Number.NaN]) {
      await expect(bridge.request({ cmd: 'select_layer', layer }))
        .resolves.toMatchObject({ ok: false, error: 'Layer must be between 0 and 3' });
    }
    expect(hid.device.reports.length).toBe(before);
    expect(hid.device.layerSwitchCount).toBe(0);

    await bridge.disconnect();
  });

  it('fails the request on firmware timeout instead of claiming a layer switch', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    hid.device.swallowLayerSwitch = true;

    const result = await bridge.request({ cmd: 'select_layer', layer: 3 });
    expect(result.ok).toBe(false);
    expect(result.deviceActiveLayer).toBeUndefined();
    await expect(bridge.getStatus()).resolves.toMatchObject({ deviceActiveLayer: 0 });

    await bridge.disconnect();
  });

  it('refuses layer commands while disconnected so no report reaches an absent device', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await expect(bridge.request({ cmd: 'select_layer', layer: 1 }))
      .resolves.toMatchObject({ ok: false, error: 'No QMK/VIA device is connected' });
    expect(hid.device.layerSwitchCount).toBe(0);

    await bridge.connect();
    await bridge.disconnect();
    const before = hid.device.reports.length;
    await expect(bridge.request({ cmd: 'select_layer', layer: 1 }))
      .resolves.toMatchObject({ ok: false, error: 'No QMK/VIA device is connected' });
    expect(hid.device.reports.length).toBe(before);
  });

  it('adopts unsolicited physical layer events without sending any command back', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    const events: unknown[] = [];
    const unsubscribe = bridge.onEvent((event) => events.push(event));
    const reportsBefore = hid.device.reports.length;

    // Physical L1 -> L2 -> L3 -> L4, as layer_state_set_user() reports them.
    for (const layer of [1, 2, 3]) {
      hid.device.activeLayer = layer;
      hid.device.emitLayerStateEvent();
      expect(events).toContainEqual({ type: 'layer_state', deviceActiveLayer: layer, activeProfileSlot: 0 });
      await expect(bridge.getStatus()).resolves.toMatchObject({ deviceActiveLayer: layer });
    }
    // Event-driven adoption must never echo a command: that is the sync loop.
    expect(hid.device.reports.length).toBe(reportsBefore);
    expect(hid.device.layerSwitchCount).toBe(0);

    unsubscribe();
    await bridge.disconnect();
  });

  it('does not mistake an unsolicited layer event for a pending command reply', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
    await bridge.connect();
    hid.device.swallowLayerSwitch = true;

    const pending = bridge.request({ cmd: 'select_layer', layer: 3 });
    // A physical press mid-flight must not resolve the outstanding command.
    hid.device.activeLayer = 1;
    hid.device.emitLayerStateEvent();

    await expect(pending).resolves.toMatchObject({ ok: false });
    // The physical layer is still adopted from the event.
    await expect(bridge.getStatus()).resolves.toMatchObject({ deviceActiveLayer: 1 });

    await bridge.disconnect();
  });

  it('recovers a re-plugged authorised device from the HID connect event alone', async () => {
    const hid = new FakeHidApi();
    hid.deviceAvailableForSilentScan = true;
    const bridge = new QmkViaBridge(hid, { timeoutMs: 50 });
    await bridge.connect();
    await bridge.request({ cmd: 'select_layer', layer: 2 });

    const states: string[] = [];
    const unsubscribe = bridge.onStatus((status) => states.push(status.state));
    hid.dispatchEvent(Object.assign(new Event('disconnect'), { device: hid.device }));
    expect(states).toContain('disconnected');

    // Re-plug: firmware boots on layer 0, and no requestDevice prompt is allowed.
    hid.device.activeLayer = 0;
    hid.device.opened = false;
    const requestDevice = vi.spyOn(hid, 'requestDevice');
    hid.dispatchEvent(Object.assign(new Event('connect'), { device: hid.device }));

    await vi.waitFor(async () => {
      await expect(bridge.getStatus()).resolves.toMatchObject({ state: 'connected', deviceActiveLayer: 0 });
    });
    expect(requestDevice).not.toHaveBeenCalled();

    unsubscribe();
    await bridge.disconnect();
  });

  it('adopts RGB changes made on the device so the editor cannot overwrite them', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const events: unknown[] = [];
    const unsubscribe = bridge.onEvent((event) => events.push(event));

    // Firmware FN key press: LED toggled off, layer 2 speed dropped to 30.
    const report = new Uint8Array(32);
    report[0] = 0xfd;
    report[1] = 0x12; // MP_EVT_RGB_STATE
    report[2] = 1;    // active layer
    report[3] = 2;    // active profile slot
    report[4] = 4;
    report[5] = 4;
    report[6] = 0;    // rgb disabled on the device
    report.set([0, 81, 255, 16, 185, 129, 245, 158, 11, 225, 29, 72], 7);
    report.set([1, 1, 2, 3], 19);
    report.set([50, 30, 50, 50], 23);
    hid.device.dispatchEvent(Object.assign(new Event('inputreport'), {
      device: hid.device,
      reportId: 0,
      data: new DataView(report.buffer),
    }));

    expect(events).toContainEqual({
      type: 'rgb_state',
      rgbConfig: expect.objectContaining({
        enabled: false,
        layerModes: [1, 1, 2, 3],
        layerSpeeds: [50, 30, 50, 50],
      }),
    });
    await expect(bridge.getStatus()).resolves.toMatchObject({
      deviceActiveLayer: 1,
      activeProfileSlot: 2,
      rgbConfig: expect.objectContaining({ enabled: false }),
    });

    unsubscribe();
    await bridge.disconnect();
  });
});
