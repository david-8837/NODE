const UF2_BLOCK_SIZE = 512;
const UF2_MAGIC_START0 = 0x0a324655;
const UF2_MAGIC_START1 = 0x9e5d5157;
const UF2_MAGIC_END = 0x0ab16f30;
const UF2_FLAG_FAMILY_ID_PRESENT = 0x00002000;
const RP2040_FAMILY_ID = 0xe48bff56;
const MAX_UF2_BYTES = 32 * 1024 * 1024;

function validateRp2040Uf2(data) {
  if (!Buffer.isBuffer(data) && !(data instanceof Uint8Array)) {
    return { ok: false, error: 'Firmware file could not be read as binary data' };
  }
  if (data.byteLength < UF2_BLOCK_SIZE || data.byteLength > MAX_UF2_BYTES || data.byteLength % UF2_BLOCK_SIZE !== 0) {
    return { ok: false, error: 'Firmware is not a valid-size UF2 image (maximum 32 MB)' };
  }

  const bytes = Buffer.isBuffer(data)
    ? data
    : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  const totalBlocks = bytes.byteLength / UF2_BLOCK_SIZE;

  for (let index = 0; index < totalBlocks; index += 1) {
    const offset = index * UF2_BLOCK_SIZE;
    if (
      bytes.readUInt32LE(offset) !== UF2_MAGIC_START0 ||
      bytes.readUInt32LE(offset + 4) !== UF2_MAGIC_START1 ||
      bytes.readUInt32LE(offset + 508) !== UF2_MAGIC_END
    ) {
      return { ok: false, error: `Firmware UF2 block ${index + 1} has invalid magic values` };
    }

    const flags = bytes.readUInt32LE(offset + 8);
    const payloadSize = bytes.readUInt32LE(offset + 16);
    const blockNumber = bytes.readUInt32LE(offset + 20);
    const declaredBlockCount = bytes.readUInt32LE(offset + 24);
    const familyId = bytes.readUInt32LE(offset + 28);

    if (payloadSize < 1 || payloadSize > 476 || blockNumber >= totalBlocks || declaredBlockCount !== totalBlocks) {
      return { ok: false, error: `Firmware UF2 block ${index + 1} has invalid block metadata` };
    }
    if ((flags & UF2_FLAG_FAMILY_ID_PRESENT) === 0 || familyId !== RP2040_FAMILY_ID) {
      return { ok: false, error: 'Firmware does not declare the RP2040 target family' };
    }
  }

  return { ok: true, blockCount: totalBlocks, byteLength: bytes.byteLength };
}

module.exports = {
  MAX_UF2_BYTES,
  RP2040_FAMILY_ID,
  validateRp2040Uf2,
};
