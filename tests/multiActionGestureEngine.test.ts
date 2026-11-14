import { describe, expect, it, vi } from 'vitest';
import { MultiActionGestureEngine } from '../src/multiActionGestureEngine';
import { createHardwareTriggerController, extractMultiActionConfig } from '../src/actionExecution';
import { buildViaConfiguration } from '../src/qmkProfileSync';
import { actionToViaKeycode, QmkViaBridge, VIA_PROTOCOL_VERSION, VIA_RAW_REPORT_SIZE, VIA_RAW_USAGE_ID, VIA_RAW_USAGE_PAGE, VIA_USB_PRODUCT_ID, VIA_USB_VENDOR_ID, type HidApiLike, type HidDeviceLike } from '../src/qmkViaBridge';

describe('MultiActionGestureEngine (4-gesture state machine)', () => {
  it('fires onTap immediately on release when neither doubleTap nor tapHold is configured', () => {
    vi.useFakeTimers();
    const fired: Array<{ slotId: string; gesture: string; binding: string }> = [];
    const engine = new MultiActionGestureEngine(
      (event) => fired.push({ slotId: event.slotId, gesture: event.gesture, binding: event.binding }),
      {
        setTimeout: (cb, ms) => setTimeout(cb, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
      }
    );

    const config = { gestures: { onTap: 'Ctrl + C', onHold: 'Ctrl + A' }, tappingTermMs: 250 };
    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(80);
    engine.handleKeyUp('r1c1');

    expect(fired).toEqual([{ slotId: 'r1c1', gesture: 'onTap', binding: 'Ctrl + C' }]);
    vi.useRealTimers();
  });

  it('does NOT prematurely fire onTap when doubleTap is configured, and fires onTap after tappingTermMs expires', () => {
    vi.useFakeTimers();
    const fired: Array<{ slotId: string; gesture: string; binding: string }> = [];
    const engine = new MultiActionGestureEngine(
      (event) => fired.push({ slotId: event.slotId, gesture: event.gesture, binding: event.binding }),
      {
        setTimeout: (cb, ms) => setTimeout(cb, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
      }
    );

    const config = {
      gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
      tappingTermMs: 250,
    };

    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(60);
    engine.handleKeyUp('r1c1');

    // Must not fire prematurely on first release!
    expect(fired).toHaveLength(0);

    vi.advanceTimersByTime(249);
    expect(fired).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(fired).toEqual([{ slotId: 'r1c1', gesture: 'onTap', binding: 'Ctrl + C' }]);
    vi.useRealTimers();
  });

  it('recognizes doubleTap within tappingTermMs without firing onTap', () => {
    vi.useFakeTimers();
    const fired: Array<{ slotId: string; gesture: string; binding: string }> = [];
    const engine = new MultiActionGestureEngine(
      (event) => fired.push({ slotId: event.slotId, gesture: event.gesture, binding: event.binding }),
      {
        setTimeout: (cb, ms) => setTimeout(cb, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
      }
    );

    const config = {
      gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V', tapHold: 'Ctrl + X' },
      tappingTermMs: 250,
    };

    // First tap
    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(50);
    engine.handleKeyUp('r1c1');
    expect(fired).toHaveLength(0);

    // Second tap within 250ms
    vi.advanceTimersByTime(90);
    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(50);
    engine.handleKeyUp('r1c1');

    expect(fired).toEqual([{ slotId: 'r1c1', gesture: 'doubleTap', binding: 'Ctrl + V' }]);
    vi.advanceTimersByTime(500);
    expect(fired).toHaveLength(1);
    vi.useRealTimers();
  });

  it('recognizes onHold when first press is held past holdThresholdMs and suppresses release tap', () => {
    vi.useFakeTimers();
    const fired: Array<{ slotId: string; gesture: string; binding: string }> = [];
    const engine = new MultiActionGestureEngine(
      (event) => fired.push({ slotId: event.slotId, gesture: event.gesture, binding: event.binding }),
      {
        setTimeout: (cb, ms) => setTimeout(cb, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
      }
    );

    const config = {
      gestures: { onTap: 'Ctrl + C', onHold: 'Ctrl + A' },
      tappingTermMs: 250,
    };

    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(250);
    expect(fired).toEqual([{ slotId: 'r1c1', gesture: 'onHold', binding: 'Ctrl + A' }]);

    // Releasing after hold must not trigger onTap
    vi.advanceTimersByTime(100);
    engine.handleKeyUp('r1c1');
    expect(fired).toHaveLength(1);
    vi.useRealTimers();
  });

  it('recognizes tapHold when second press is held past holdThresholdMs', () => {
    vi.useFakeTimers();
    const fired: Array<{ slotId: string; gesture: string; binding: string }> = [];
    const engine = new MultiActionGestureEngine(
      (event) => fired.push({ slotId: event.slotId, gesture: event.gesture, binding: event.binding }),
      {
        setTimeout: (cb, ms) => setTimeout(cb, ms),
        clearTimeout: (id) => clearTimeout(id),
        now: () => Date.now(),
      }
    );

    const config = {
      gestures: {
        onTap: 'Ctrl + C',
        doubleTap: 'Ctrl + V',
        onHold: 'Ctrl + A',
        tapHold: 'Ctrl + Shift + S',
      },
      tappingTermMs: 250,
    };

    // First tap
    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(50);
    engine.handleKeyUp('r1c1');
    expect(fired).toHaveLength(0);

    // Second press held down past 250ms
    vi.advanceTimersByTime(80);
    engine.handleKeyDown('r1c1', config);
    vi.advanceTimersByTime(250);
    expect(fired).toEqual([{ slotId: 'r1c1', gesture: 'tapHold', binding: 'Ctrl + Shift + S' }]);

    // Release does not fire doubleTap
    engine.handleKeyUp('r1c1');
    expect(fired).toHaveLength(1);
    vi.useRealTimers();
  });
});

describe('Hardware Trigger Keycodes & Host Execution Integration', () => {
  it('maps host_trigger actions to 0x7E00 | (layer << 4) | slotIndex and builds host_trigger for Smart/Multi/Sequence when enableHostTriggers is true', () => {
    expect(actionToViaKeycode({ t: 'host_trigger', layer: 0, slotIndex: 0 })).toBe(0x7e00);
    expect(actionToViaKeycode({ t: 'host_trigger', layer: 2, slotIndex: 11 })).toBe(0x7e2b);

    const profile = {
      id: 'p1',
      name: 'Profile 1',
      layers: [
        {
          r1c1: {
            label: 'Open Docs',
            binding: 'Open Docs (Web: https://example.com)',
            actionType: 'Smart Action',
            execution: { kind: 'smart' as const, actionType: 'Web' as const, value: 'https://example.com' },
          },
          r1c2: {
            label: 'Multi Copy/Paste',
            binding: 'Multi (onTap: Ctrl+C, doubleTap: Ctrl+V)',
            actionType: 'Multi-Action',
            execution: {
              kind: 'multi' as const,
              gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
              tappingTermMs: 250,
            },
          },
        },
      ],
    };

    const withHostTriggers = buildViaConfiguration(profile, 'win', { enableHostTriggers: true });
    expect(withHostTriggers.config.layers[0]?.keys?.r1c1).toEqual({ t: 'host_trigger', layer: 0, slotIndex: 0 });
    expect(withHostTriggers.config.layers[0]?.keys?.r1c2).toEqual({ t: 'host_trigger', layer: 0, slotIndex: 1 });
    expect(withHostTriggers.warnings).toHaveLength(0);
  });

  it('extracts Multi-Action configuration from structured execution and legacy summary bindings', () => {
    expect(
      extractMultiActionConfig({
        label: 'Copy/Paste',
        binding: 'Copy/Paste',
        execution: {
          kind: 'multi',
          gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
          tappingTermMs: 300,
        },
      })
    ).toEqual({
      gestures: { onTap: 'Ctrl + C', doubleTap: 'Ctrl + V' },
      tappingTermMs: 300,
    });

    expect(
      extractMultiActionConfig({
        label: 'Legacy Multi',
        binding: 'Legacy Multi (onTap: Ctrl+C, onHold: Ctrl+A)',
      })
    ).toEqual({
      gestures: { onTap: 'Ctrl+C', onHold: 'Ctrl+A' },
    });
  });

  it('dispatches hardware_trigger and layer_state events from QMK 0xFD Raw HID packets', async () => {
    class MockHidDevice extends EventTarget implements HidDeviceLike {
      public readonly vendorId = VIA_USB_VENDOR_ID;
      public readonly productId = VIA_USB_PRODUCT_ID;
      public readonly productName = 'Grid Macro 1';
      public readonly collections = [{ usagePage: VIA_RAW_USAGE_PAGE, usage: VIA_RAW_USAGE_ID }];
      public opened = false;
      public async open() { this.opened = true; }
      public async close() { this.opened = false; }
      public async sendReport(reportId: number, data: BufferSource) {
        const req = data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const res = new Uint8Array(VIA_RAW_REPORT_SIZE);
        res[0] = req[0];
        if (req[0] === 0x01) {
          res[1] = (VIA_PROTOCOL_VERSION >> 8) & 0xff;
          res[2] = VIA_PROTOCOL_VERSION & 0xff;
        } else if (req[0] === 0x11) {
          res[1] = 4;
        }
        this.dispatchEvent(Object.assign(new Event('inputreport'), {
          device: this,
          reportId,
          data: new DataView(res.buffer),
        }));
      }
    }

    const device = new MockHidDevice();
    const hid: HidApiLike = Object.assign(new EventTarget(), {
      getDevices: async () => [device],
      requestDevice: async () => [device],
    });

    const bridge = new QmkViaBridge(hid, { timeoutMs: 20 });
    await bridge.connect();

    const events: unknown[] = [];
    bridge.onEvent((evt) => events.push(evt));

    // 1. Emit MP_EVT_LAYER_STATE (0xFD, 0x10, activeLayer=2, activeProfile=1, layerCount=4)
    const layerPacket = new Uint8Array(VIA_RAW_REPORT_SIZE);
    layerPacket.set([0xfd, 0x10, 2, 1, 4]);
    device.dispatchEvent(Object.assign(new Event('inputreport'), {
      device,
      reportId: 0,
      data: new DataView(layerPacket.buffer),
    }));

    expect(events).toContainEqual({
      type: 'layer_state',
      deviceActiveLayer: 2,
      activeProfileSlot: 1,
    });

    // 2. Emit MP_EVT_HOST_TRIGGER (0xFD, 0x11, seq=7, profile=1, layer=2, slot=0 (r1c1), pressed=1, checksum)
    const triggerPacket = new Uint8Array(VIA_RAW_REPORT_SIZE);
    const checksum = 0xfd ^ 0x11 ^ 7 ^ 1 ^ 2 ^ 0 ^ 1;
    triggerPacket.set([0xfd, 0x11, 7, 1, 2, 0, 1, checksum]);
    device.dispatchEvent(Object.assign(new Event('inputreport'), {
      device,
      reportId: 0,
      data: new DataView(triggerPacket.buffer),
    }));

    expect(events).toContainEqual({
      type: 'hardware_trigger',
      seq: 7,
      profileSlot: 1,
      layer: 2,
      slotIndex: 0,
      slotId: 'r1c1',
      pressed: true,
    });
  });

  it('executes Smart Actions and Multi-Actions from physical hardware triggers with hardwareTrigger=true', async () => {
    const executeSmartAction = vi.fn().mockResolvedValue({ success: true });
    const fakeWindow = {
      electronAPI: { executeSmartAction },
      setTimeout: (cb: () => void, ms: number) => window.setTimeout(cb, ms),
      clearTimeout: (id: number) => window.clearTimeout(id),
    } as unknown as Window & typeof globalThis;

    const toasts: string[] = [];
    const controller = createHardwareTriggerController(
      () => undefined,
      (msg) => toasts.push(msg),
      fakeWindow
    );

    const smartAction = {
      label: 'Launch Docs',
      binding: 'Launch Docs (Web: https://example.com)',
      actionType: 'Smart Action',
      execution: { kind: 'smart' as const, actionType: 'Web' as const, value: 'https://example.com' },
    };

    controller.handleSlotEvent('r1c1', true, smartAction);
    await vi.waitFor(() => expect(executeSmartAction).toHaveBeenCalledOnce());
    expect(executeSmartAction).toHaveBeenCalledWith(
      expect.objectContaining({
        hardwareTrigger: true,
        execution: {
          kind: 'smart',
          actionType: 'Web',
          value: 'https://example.com',
          requiresConsent: false,
        },
      })
    );
  });
});
