import {
  GRID_MACRO_KEY_SLOTS,
  GRID_MACRO_ENCODER_SLOT,
  type GridMacroSlotId,
} from './deviceLayout';

export const NODE_HARDWARE_EVENT_MAGIC = 0xee;
export const NODE_HARDWARE_PROTOCOL_VERSION = 0x01;
export const RAW_HID_REPORT_SIZE = 32;

export enum HardwareEventType {
  BUTTON_DOWN = 0x01,
  BUTTON_UP = 0x02,
  ENC_CW = 0x03,
  ENC_CCW = 0x04,
  DIAL_DOWN = 0x05,
  DIAL_UP = 0x06,
}

export const SLOT_INDEX_TO_SLOT_ID: readonly GridMacroSlotId[] = [
  ...GRID_MACRO_KEY_SLOTS, // 0..8
  GRID_MACRO_ENCODER_SLOT, // 9
] as const;

export const SLOT_ID_TO_SLOT_INDEX: Readonly<Record<GridMacroSlotId, number>> = Object.freeze({
  r1c1: 0,
  r1c2: 1,
  r1c3: 2,
  r2c1: 3,
  r2c2: 4,
  r2c3: 5,
  r3c1: 6,
  r3c2: 7,
  r3c3: 8,
  'dial-tl': 9,
});

export interface DecodedHardwareEvent {
  version: number;
  type: HardwareEventType;
  slotIndex: number;
  slotId: GridMacroSlotId | null;
  sequence: number;
  activeLayer: number;
  matrixStateMask: number; // 10-bit instantaneous bitmask (bits 0..8 keys, bit 9 dial)
  isPressed: boolean;
  isDialRotation: boolean;
  dialDirection?: 'cw' | 'ccw';
}

/** Calculate simple XOR checksum across bytes 0..30 */
export function calculateChecksum(bytes: Uint8Array): number {
  let checksum = 0;
  const len = Math.min(bytes.length, 31);
  for (let i = 0; i < len; i++) {
    checksum ^= bytes[i];
  }
  return checksum & 0xff;
}

/** Check if report starts with the custom hardware magic byte */
export function isHardwareEventReport(bytes: Uint8Array): boolean {
  return bytes.length >= 1 && bytes[0] === NODE_HARDWARE_EVENT_MAGIC;
}

/**
 * Checks sequence validity with 8-bit wraparound (0..255).
 * Drops exact duplicates (diff == 0) and out-of-order/stale reports (diff > 128).
 */
export function isSequentialReport(
  newSeq: number,
  lastSeq: number | null
): boolean {
  if (lastSeq === null) return true;
  const diff = (newSeq - lastSeq) & 0xff;
  // If diff is between 1 and 128, newSeq is newer
  return diff >= 1 && diff <= 128;
}

/**
 * Serializes a hardware event into a 32-byte Raw HID packet.
 */
export function encodeHardwareReport(params: {
  type: HardwareEventType;
  slotIndex: number;
  sequence: number;
  activeLayer?: number;
  matrixStateMask?: number;
}): Uint8Array {
  const report = new Uint8Array(RAW_HID_REPORT_SIZE);
  report[0] = NODE_HARDWARE_EVENT_MAGIC;
  report[1] = NODE_HARDWARE_PROTOCOL_VERSION;
  report[2] = params.type;
  report[3] = params.slotIndex & 0xff;
  report[4] = params.sequence & 0xff;
  report[5] = (params.activeLayer ?? 0) & 0x0f;
  const mask = params.matrixStateMask ?? 0;
  report[6] = mask & 0xff;
  report[7] = (mask >> 8) & 0x03;
  // bytes 8..30 are left 0
  report[31] = calculateChecksum(report);
  return report;
}

/**
 * Decodes and validates a 32-byte Raw HID packet from hardware.
 */
export function decodeHardwareReport(
  buffer: Uint8Array
): DecodedHardwareEvent | null {
  if (!buffer || buffer.length !== RAW_HID_REPORT_SIZE) {
    return null;
  }
  if (buffer[0] !== NODE_HARDWARE_EVENT_MAGIC) {
    return null;
  }
  if (buffer[1] !== NODE_HARDWARE_PROTOCOL_VERSION) {
    return null;
  }
  const expectedChecksum = calculateChecksum(buffer);
  if (buffer[31] !== expectedChecksum) {
    return null;
  }

  const type = buffer[2] as HardwareEventType;
  if (![
    HardwareEventType.BUTTON_DOWN,
    HardwareEventType.BUTTON_UP,
    HardwareEventType.ENC_CW,
    HardwareEventType.ENC_CCW,
    HardwareEventType.DIAL_DOWN,
    HardwareEventType.DIAL_UP,
  ].includes(type)) {
    return null;
  }

  const slotIndex = buffer[3];
  const sequence = buffer[4];
  const activeLayer = buffer[5];
  const matrixStateMask = buffer[6] | ((buffer[7] & 0x03) << 8);

  const slotId =
    slotIndex >= 0 && slotIndex < SLOT_INDEX_TO_SLOT_ID.length
      ? SLOT_INDEX_TO_SLOT_ID[slotIndex]
      : null;

  const isPressed =
    type === HardwareEventType.BUTTON_DOWN ||
    type === HardwareEventType.DIAL_DOWN;

  const isDialRotation =
    type === HardwareEventType.ENC_CW || type === HardwareEventType.ENC_CCW;

  const dialDirection =
    type === HardwareEventType.ENC_CW
      ? 'cw'
      : type === HardwareEventType.ENC_CCW
      ? 'ccw'
      : undefined;

  return {
    version: buffer[1],
    type,
    slotIndex,
    slotId,
    sequence,
    activeLayer,
    matrixStateMask,
    isPressed,
    isDialRotation,
    dialDirection,
  };
}

/**
 * Compares two 10-bit matrix state bitmasks and returns slots that were released or pressed.
 */
export function reconcileMatrixState(
  previousMask: number,
  currentMask: number
): {
  releasedSlots: GridMacroSlotId[];
  pressedSlots: GridMacroSlotId[];
} {
  const releasedSlots: GridMacroSlotId[] = [];
  const pressedSlots: GridMacroSlotId[] = [];

  for (let i = 0; i < SLOT_INDEX_TO_SLOT_ID.length; i++) {
    const bit = 1 << i;
    const wasPressed = (previousMask & bit) !== 0;
    const isPressed = (currentMask & bit) !== 0;

    if (wasPressed && !isPressed) {
      releasedSlots.push(SLOT_INDEX_TO_SLOT_ID[i]);
    } else if (!wasPressed && isPressed) {
      pressedSlots.push(SLOT_INDEX_TO_SLOT_ID[i]);
    }
  }

  return { releasedSlots, pressedSlots };
}

