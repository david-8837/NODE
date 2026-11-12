import { describe, it, expect } from 'vitest';
import {
  NODE_HARDWARE_EVENT_MAGIC,
  NODE_HARDWARE_PROTOCOL_VERSION,
  RAW_HID_REPORT_SIZE,
  HardwareEventType,
  calculateChecksum,
  isHardwareEventReport,
  isSequentialReport,
  encodeHardwareReport,
  decodeHardwareReport,
  reconcileMatrixState,
} from '../src/hardwareEventProtocol';

describe('hardwareEventProtocol: 32-byte Binary USB Raw HID Protocol', () => {
  it('correctly encodes and decodes a BUTTON_DOWN event for slot 0 (r1c1)', () => {
    const encoded = encodeHardwareReport({
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 0,
      sequence: 42,
      activeLayer: 1,
      matrixStateMask: 0x0001, // Key 0 down
    });

    expect(encoded).toHaveLength(RAW_HID_REPORT_SIZE);
    expect(encoded[0]).toBe(NODE_HARDWARE_EVENT_MAGIC); // 0xEE
    expect(encoded[1]).toBe(NODE_HARDWARE_PROTOCOL_VERSION); // 0x01
    expect(encoded[2]).toBe(HardwareEventType.BUTTON_DOWN);
    expect(encoded[3]).toBe(0);
    expect(encoded[4]).toBe(42);
    expect(encoded[5]).toBe(1);
    expect(isHardwareEventReport(encoded)).toBe(true);

    const decoded = decodeHardwareReport(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded).toMatchObject({
      version: 1,
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 0,
      slotId: 'r1c1',
      sequence: 42,
      activeLayer: 1,
      matrixStateMask: 1,
      isPressed: true,
      isDialRotation: false,
    });
  });

  it('correctly encodes and decodes dial push and dial rotation events', () => {
    // Dial Push Down
    const dialDown = encodeHardwareReport({
      type: HardwareEventType.DIAL_DOWN,
      slotIndex: 9,
      sequence: 5,
      matrixStateMask: 1 << 9,
    });
    const decodedDial = decodeHardwareReport(dialDown);
    expect(decodedDial?.slotId).toBe('dial-tl');
    expect(decodedDial?.isPressed).toBe(true);
    expect(decodedDial?.isDialRotation).toBe(false);

    // Dial CW Rotation
    const dialCw = encodeHardwareReport({
      type: HardwareEventType.ENC_CW,
      slotIndex: 0xff,
      sequence: 6,
    });
    const decodedCw = decodeHardwareReport(dialCw);
    expect(decodedCw?.isDialRotation).toBe(true);
    expect(decodedCw?.dialDirection).toBe('cw');

    // Dial CCW Rotation
    const dialCcw = encodeHardwareReport({
      type: HardwareEventType.ENC_CCW,
      slotIndex: 0xff,
      sequence: 7,
    });
    const decodedCcw = decodeHardwareReport(dialCcw);
    expect(decodedCcw?.isDialRotation).toBe(true);
    expect(decodedCcw?.dialDirection).toBe('ccw');
  });

  it('rejects reports that do not start with magic byte 0xEE (e.g. VIA commands 0x01..0x1F)', () => {
    const viaResponse = new Uint8Array(RAW_HID_REPORT_SIZE);
    viaResponse[0] = 0x01; // VIA getProtocolVersion
    viaResponse[1] = 0x00;
    viaResponse[2] = 0x0d;

    expect(isHardwareEventReport(viaResponse)).toBe(false);
    expect(decodeHardwareReport(viaResponse)).toBeNull();
  });

  it('rejects reports with corrupted checksums or invalid versions', () => {
    const valid = encodeHardwareReport({
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 3,
      sequence: 10,
    });

    // Corrupt one byte
    const corrupted = new Uint8Array(valid);
    corrupted[3] = 4; // Changed slot without updating checksum
    expect(decodeHardwareReport(corrupted)).toBeNull();

    // Invalid version
    const invalidVer = new Uint8Array(valid);
    invalidVer[1] = 2; // Unsupported version
    invalidVer[31] = calculateChecksum(invalidVer);
    expect(decodeHardwareReport(invalidVer)).toBeNull();
  });

  it('rejects truncated or oversized report buffers', () => {
    const tooShort = new Uint8Array(16);
    tooShort[0] = NODE_HARDWARE_EVENT_MAGIC;
    expect(decodeHardwareReport(tooShort)).toBeNull();

    const tooLong = new Uint8Array(64);
    tooLong[0] = NODE_HARDWARE_EVENT_MAGIC;
    expect(decodeHardwareReport(tooLong)).toBeNull();
  });

  it('handles 8-bit sequence number wraparound and deduplication', () => {
    // Initial report
    expect(isSequentialReport(0, null)).toBe(true);

    // Incremental sequence
    expect(isSequentialReport(1, 0)).toBe(true);
    expect(isSequentialReport(5, 1)).toBe(true);

    // Exact duplicate (dropped)
    expect(isSequentialReport(5, 5)).toBe(false);

    // Wraparound 255 -> 0 -> 1
    expect(isSequentialReport(0, 255)).toBe(true);
    expect(isSequentialReport(1, 255)).toBe(true);

    // Stale/old out-of-order report (diff > 128: last was 10, receiving 200 is behind)
    expect(isSequentialReport(200, 10)).toBe(false);
  });

  it('reconciles matrix state bitmask to identify released and pressed slots', () => {
    // Previously keys 0, 1 were pressed: 0b0000000011 (3)
    const prevMask = 0x0003;
    // Currently key 1 released, key 2 pressed: 0b0000000101 (5)
    const currMask = 0x0005;

    const { releasedSlots, pressedSlots } = reconcileMatrixState(
      prevMask,
      currMask
    );

    expect(releasedSlots).toEqual(['r1c2']); // Key 1 was released
    expect(pressedSlots).toEqual(['r1c3']); // Key 2 was pressed
  });
});
