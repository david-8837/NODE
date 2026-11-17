import { describe, expect, it, vi } from 'vitest';
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
} from '../src/qmkViaBridge';

/**
 * Phase 2: "an unresponsive device must not be treated as successfully
 * connected". Opening the USB handle is not proof of a working device — only a
 * completed VIA protocol + layer-count handshake is. These tests model devices
 * that enumerate and open but then misbehave.
 */

type Behaviour = 'ok' | 'silent' | 'wrong-protocol' | 'short-reply' | 'bad-layer-count' | 'open-fails';

class FaultyDevice extends EventTarget implements HidDeviceLike {
  public readonly vendorId = VIA_USB_VENDOR_ID;
  public readonly productId = VIA_USB_PRODUCT_ID;
  public readonly productName = 'Grid Macro 1 faulty';
  public readonly collections = [{ usagePage: VIA_RAW_USAGE_PAGE, usage: VIA_RAW_USAGE_ID }];
  public opened = false;
  public reports: Uint8Array[] = [];

  constructor(private behaviour: Behaviour) { super(); }

  async open() {
    if (this.behaviour === 'open-fails') throw new Error('Access denied');
    this.opened = true;
  }
  async close() { this.opened = false; }

  async sendReport(reportId: number, data: BufferSource) {
    const request = data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    this.reports.push(Uint8Array.from(request));
    if (this.behaviour === 'silent') return; // enumerates, opens, never answers

    let response = new Uint8Array(VIA_RAW_REPORT_SIZE);
    response[0] = request[0];
    if (request[0] === 0x01) {
      const version = this.behaviour === 'wrong-protocol' ? 0x0001 : VIA_PROTOCOL_VERSION;
      response[1] = (version >> 8) & 0xff;
      response[2] = version & 0xff;
    } else if (request[0] === 0x11) {
      response[1] = this.behaviour === 'bad-layer-count' ? 0 : 4;
    } else if (request[0] === 0xfd) {
      response[4] = 4; response[5] = 4; response[6] = 1;
    }
    if (this.behaviour === 'short-reply') response = response.slice(0, 1);

    this.dispatchEvent(Object.assign(new Event('inputreport'), {
      device: this, reportId, data: new DataView(response.buffer),
    }));
  }
}

class FaultyHid extends EventTarget implements HidApiLike {
  public device: FaultyDevice;
  constructor(behaviour: Behaviour) {
    super();
    this.device = new FaultyDevice(behaviour);
  }
  async getDevices() { return [this.device]; }
  async requestDevice() { return [this.device]; }
}

describe('connection handshake robustness', () => {
  it('connects only after the protocol and layer-count handshake completes', async () => {
    const hid = new FaultyHid('ok');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 30 });
    const status = await bridge.connect();
    expect(status.state).toBe('connected');
    // Handshake order: protocol version, then dynamic layer count.
    expect(hid.device.reports.slice(0, 2).map((r) => r[0])).toEqual([0x01, 0x11]);
    await bridge.disconnect();
  });

  it('never reports connected for a device that opens but stays silent', async () => {
    const hid = new FaultyHid('silent');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    const states: string[] = [];
    bridge.onStatus((s) => states.push(s.state));

    const status = await bridge.connect();

    expect(status.state).not.toBe('connected');
    expect(states).not.toContain('connected');
    expect(status.error).toBeTruthy();
    // The half-open handle must be released, not left claimed.
    expect(hid.device.opened).toBe(false);
  });

  it('rejects a mismatched VIA protocol version', async () => {
    const hid = new FaultyHid('wrong-protocol');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    const status = await bridge.connect();
    expect(status.state).not.toBe('connected');
    expect(status.error).toContain('Unsupported VIA protocol');
    expect(hid.device.opened).toBe(false);
  });

  it('rejects a truncated handshake reply', async () => {
    const hid = new FaultyHid('short-reply');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    const status = await bridge.connect();
    expect(status.state).not.toBe('connected');
    expect(hid.device.opened).toBe(false);
  });

  it('rejects an invalid dynamic layer count', async () => {
    const hid = new FaultyHid('bad-layer-count');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    const status = await bridge.connect();
    expect(status.state).not.toBe('connected');
    expect(status.error).toContain('layer count');
    expect(hid.device.opened).toBe(false);
  });

  it('reports a device that cannot be opened instead of hanging', async () => {
    const hid = new FaultyHid('open-fails');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    const status = await bridge.connect();
    expect(status.state).not.toBe('connected');
    expect(status.error).toContain('Access denied');
  });

  it('refuses every device command while the handshake has not succeeded', async () => {
    const hid = new FaultyHid('silent');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    await bridge.connect();
    const before = hid.device.reports.length;

    for (const cmd of ['select_layer', 'set_rgb_config', 'get_device_state', 'set_config']) {
      const result = await bridge.request({
        cmd,
        layer: 1,
        rgbConfig: { enabled: true, layerColors: Array.from({ length: 4 }, () => ({ r: 0, g: 0, b: 0 })) },
      } as never);
      expect(result.ok).toBe(false);
    }
    expect(hid.device.reports.length).toBe(before);
  });

  it('recovers on a later retry without an app restart', async () => {
    const hid = new FaultyHid('silent');
    const bridge = new QmkViaBridge(hid, { timeoutMs: 25 });
    expect((await bridge.connect()).state).not.toBe('connected');

    // Device becomes responsive; the same bridge instance must recover.
    const healthy = new FaultyHid('ok');
    const recovered = new QmkViaBridge(healthy, { timeoutMs: 30 });
    const requestDevice = vi.spyOn(healthy, 'requestDevice');
    expect((await recovered.getStatus()).state).toBe('connected');
    // A silent scan of an already-authorised device needs no permission prompt.
    expect(requestDevice).not.toHaveBeenCalled();
    await recovered.disconnect();
  });
});
