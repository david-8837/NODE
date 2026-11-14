'use strict';

const NODE_HARDWARE_EVENT_MAGIC = 0xee;
const NODE_HARDWARE_PROTOCOL_VERSION = 0x01;
const RAW_HID_REPORT_SIZE = 32;

const HardwareEventType = Object.freeze({
  BUTTON_DOWN: 0x01,
  BUTTON_UP: 0x02,
  ENC_CW: 0x03,
  ENC_CCW: 0x04,
  DIAL_DOWN: 0x05,
  DIAL_UP: 0x06,
});

const SLOT_INDEX_TO_SLOT_ID = Object.freeze([
  'r1c1', 'r1c2', 'r1c3',
  'r2c1', 'r2c2', 'r2c3',
  'r3c1', 'r3c2', 'r3c3',
  'dial-tl',
]);

const SLOT_ID_TO_SLOT_INDEX = Object.freeze({
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

function calculateChecksum(bytes) {
  let checksum = 0;
  const len = Math.min(bytes.length, 31);
  for (let i = 0; i < len; i++) {
    checksum ^= bytes[i];
  }
  return checksum & 0xff;
}

function isHardwareEventReport(bytes) {
  return Boolean(bytes && bytes.length >= 1 && bytes[0] === NODE_HARDWARE_EVENT_MAGIC);
}

function isSequentialReport(newSeq, lastSeq) {
  if (lastSeq === null || lastSeq === undefined) return true;
  const diff = (newSeq - lastSeq) & 0xff;
  return diff >= 1 && diff <= 128;
}

function decodeHardwareReport(bytes) {
  if (!bytes || bytes.length < RAW_HID_REPORT_SIZE) return null;
  if (bytes[0] !== NODE_HARDWARE_EVENT_MAGIC) return null;
  if (bytes[1] !== NODE_HARDWARE_PROTOCOL_VERSION) return null;

  const expectedChecksum = calculateChecksum(bytes);
  if (bytes[31] !== expectedChecksum) return null;

  const type = bytes[2];
  const slotIndex = bytes[3];
  const sequence = bytes[4];
  const activeLayer = bytes[5] & 0x0f;
  const matrixStateMask = (bytes[6] | (bytes[7] << 8)) & 0x03ff;

  const isDialRotation = type === HardwareEventType.ENC_CW || type === HardwareEventType.ENC_CCW;
  const isPressed = type === HardwareEventType.BUTTON_DOWN || type === HardwareEventType.DIAL_DOWN;
  const dialDirection = type === HardwareEventType.ENC_CW ? 'cw' : type === HardwareEventType.ENC_CCW ? 'ccw' : undefined;

  const slotId = slotIndex < SLOT_INDEX_TO_SLOT_ID.length ? SLOT_INDEX_TO_SLOT_ID[slotIndex] : null;

  return {
    version: bytes[1],
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

function encodeHardwareReport(params) {
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
  report[31] = calculateChecksum(report);
  return report;
}

module.exports = {
  NODE_HARDWARE_EVENT_MAGIC,
  NODE_HARDWARE_PROTOCOL_VERSION,
  RAW_HID_REPORT_SIZE,
  HardwareEventType,
  SLOT_INDEX_TO_SLOT_ID,
  SLOT_ID_TO_SLOT_INDEX,
  calculateChecksum,
  isHardwareEventReport,
  isSequentialReport,
  decodeHardwareReport,
  encodeHardwareReport,
};
