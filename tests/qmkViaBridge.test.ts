import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  actionToViaKeycode,
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
  public readonly ledValues = new Map<number, number[]>();

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
    } else if (request[0] === 0x07 && request[1] === 2) {
      const count = request[2] === 4 ? 2 : 1;
      this.ledValues.set(request[2], Array.from(request.slice(3, 3 + count)));
      response.set(request.slice(1, 3), 1);
    } else if (request[0] === 0x08 && request[1] === 2) {
      response.set(request.slice(1, 3), 1);
      response.set(this.ledValues.get(request[2]) ?? [0], 3);
    } else if (request[0] === 0x11) {
      response[1] = this.layerCount;
    } else if (request[0] === 0x14) {
      const value = this.encoderKeycodes.get(`${request[1]}:${request[3]}`) ?? 0;
      response[4] = (value >> 8) & 0xff;
      response[5] = value & 0xff;
    } else if (request[0] === 0x15) {
      this.encoderKeycodes.set(`${request[1]}:${request[3]}`, (request[4] << 8) | request[5]);
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
  ])('translates supported action %j to VIA keycode %j', (action, expected) => {
    expect(actionToViaKeycode(action)).toBe(expected);
  });

  it('returns zero for an empty slot and declines unsupported sequences', () => {
    expect(actionToViaKeycode(undefined)).toBe(0);
    expect(actionToViaKeycode({ t: 'keys', k: ['A', 'B'] })).toBeNull();
    expect(actionToViaKeycode({ t: 'keys', k: ['CONTROL', 'RIGHT_SHIFT', 'A'] })).toBeNull();
    expect(actionToViaKeycode({ t: 'layer', op: 'next', n: 0 })).toBeNull();
    expect(actionToViaKeycode({ t: 'media', c: 'UNKNOWN' })).toBeNull();
  });
});

describe('QMK/VIA WebHID bridge', () => {
  it('applies and verifies volatile onboard LED settings without writing keymaps or EEPROM', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    hid.device.reports.length = 0;
    const result = await bridge.request({ cmd: 'set_onboard_led', lighting: { effect: 1, hue: 85, saturation: 255, brightness: 128 } });
    expect(result.ok).toBe(true);
    expect(hid.device.reports.map(report => [...report.slice(0, 5)])).toEqual([
      [7, 2, 4, 85, 255], [7, 2, 1, 128, 0], [7, 2, 2, 1, 0],
      [8, 2, 4, 0, 0], [8, 2, 1, 0, 0], [8, 2, 2, 0, 0],
    ]);
    hid.device.reports.length = 0;
    expect((await bridge.request({ cmd: 'set_onboard_led', lighting: { effect: 15, hue: 0, saturation: 0, brightness: 0 } })).ok).toBe(false);
    expect(hid.device.reports).toHaveLength(0);
    await bridge.disconnect();
  });

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
    expect(result.warnings).toContain('Layer 1 R1C3: unsupported action was not synced');
    const writes = hid.device.reports.filter((report) => report[0] === 0x05);
    expect(writes.find((report) => report[1] === 0 && report[2] === 0 && report[3] === 0)?.slice(4, 6))
      .toEqual(new Uint8Array([0x03, 0x16]));
    expect(writes.find((report) => report[1] === 0 && report[2] === 0 && report[3] === 1)?.slice(4, 6))
      .toEqual(new Uint8Array([0x52, 0x21]));
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

  it('ignores a permission chooser that finishes after an explicit disconnect', async () => {
    const hid = new FakeHidApi();
    let finish!: (devices: FakeViaDevice[]) => void;
    vi.spyOn(hid, 'requestDevice').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    const connecting = bridge.connect();
    await bridge.disconnect();
    finish([hid.device]);
    await connecting;
    expect(hid.device.opened).toBe(false);
    expect(hid.device.reports).toHaveLength(0);
  });

  it('ignores a silent scan that finishes after an explicit disconnect', async () => {
    const hid = new FakeHidApi();
    let finish!: (devices: HidDeviceLike[]) => void;
    vi.spyOn(hid, 'getDevices').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    const scanning = bridge.getStatus();
    await bridge.disconnect();
    finish([hid.device]);
    await scanning;
    expect(hid.device.opened).toBe(false);
    expect(hid.device.reports).toHaveLength(0);
  });

  it('reconnects previously authorized devices on USB connect without resetting mappings', async () => {
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();
    let connectionState = 'connected';
    bridge.onStatus(status => { connectionState = status.state; });
    hid.device.seedKeycode(0, 1, 0, 4);
    for (let i = 0; i < 3; i++) {
      hid.dispatchEvent(Object.assign(new Event('disconnect'), { device: hid.device }));
      hid.device.opened = false;
      hid.deviceAvailableForSilentScan = true;
      hid.dispatchEvent(Object.assign(new Event('connect'), { device: hid.device }));
      await vi.waitFor(() => expect(connectionState).toBe('connected'), { timeout: 2500 });
      expect(hid.device.keycodes.get('0:1:0')).toBe(4);
    }
    expect(hid.device.reports.some(report => report[0] === 0x05)).toBe(false);
    await bridge.disconnect();
    hid.dispatchEvent(Object.assign(new Event('connect'), { device: hid.device }));
    await new Promise(r => setTimeout(r, 10));
    expect(hid.device.opened).toBe(false);
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

  it('receives unsolicited hardware events and dispatches them without waiting for pending commands', async () => {
    const { encodeHardwareReport, HardwareEventType } = await import('../src/hardwareEventProtocol');
    const hid = new FakeHidApi();
    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const receivedEvents: any[] = [];
    bridge.onHardwareEvent((event) => receivedEvents.push(event));

    // Simulate an unsolicited hardware report from the device (Button 0 down)
    const reportBytes = encodeHardwareReport({
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 0,
      sequence: 1,
      matrixStateMask: 1,
    });

    const reportEvent = Object.assign(new Event('inputreport'), {
      device: hid.device,
      reportId: 0,
      data: new DataView(reportBytes.buffer),
    });
    hid.device.dispatchEvent(reportEvent);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0]).toMatchObject({
      slotId: 'r1c1',
      isPressed: true,
      sequence: 1,
    });
  });
});
