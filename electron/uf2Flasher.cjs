'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { MAX_UF2_BYTES, validateRp2040Uf2 } = require('./uf2Validator.cjs');

const UF2_BLOCK_SIZE = 512;
const MAX_BOOTLOADER_MARKER_BYTES = 4096;

async function copyValidatedUf2ToBootloader({
  firmwarePath,
  markerPath,
  fsModule = fs,
} = {}) {
  if (typeof firmwarePath !== 'string' || !firmwarePath.trim()) {
    return { ok: false, error: 'Choose an RP2040 UF2 firmware file' };
  }
  if (path.extname(firmwarePath).toLowerCase() !== '.uf2') {
    return { ok: false, error: 'Choose a .uf2 firmware file' };
  }
  if (typeof markerPath !== 'string' || !markerPath.trim()) {
    return { ok: false, error: 'Select INFO_UF2.TXT from the mounted RPI-RP2 drive' };
  }
  if (path.basename(markerPath).toLowerCase() !== 'info_uf2.txt') {
    return { ok: false, error: 'Select INFO_UF2.TXT from the mounted RPI-RP2 drive' };
  }

  const firmwareStat = await fsModule.stat(firmwarePath);
  if (!firmwareStat.isFile()) {
    return { ok: false, error: 'The selected firmware path is not a file' };
  }
  if (
    firmwareStat.size < UF2_BLOCK_SIZE ||
    firmwareStat.size > MAX_UF2_BYTES ||
    firmwareStat.size % UF2_BLOCK_SIZE !== 0
  ) {
    return { ok: false, error: 'Firmware is not a valid-size UF2 image (maximum 32 MB)' };
  }

  const firmware = await fsModule.readFile(firmwarePath);
  const validation = validateRp2040Uf2(firmware);
  if (!validation.ok) return validation;

  const markerStat = await fsModule.stat(markerPath);
  if (!markerStat.isFile() || markerStat.size > MAX_BOOTLOADER_MARKER_BYTES) {
    return { ok: false, error: 'The selected bootloader marker is not a valid RPI-RP2 marker file' };
  }
  const marker = await fsModule.readFile(markerPath, 'utf8');
  if (!/\bRPI-RP2\b/i.test(marker)) {
    return { ok: false, error: 'That bootloader marker does not identify the RPI-RP2 drive' };
  }

  const destination = path.join(path.dirname(markerPath), 'firmware.uf2');
  try {
    await fsModule.writeFile(destination, firmware, { flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') {
      return {
        ok: false,
        error: 'A firmware.uf2 file is already on that drive. Eject it, re-enter BOOTSEL mode, and try again.',
      };
    }
    throw error;
  }

  return {
    ok: true,
    message: 'Firmware copied to the RPI-RP2 bootloader drive. The board should flash and reboot automatically; reconnect it after it returns to normal mode.',
    byteLength: firmware.byteLength,
    blockCount: validation.blockCount,
  };
}

module.exports = {
  MAX_BOOTLOADER_MARKER_BYTES,
  copyValidatedUf2ToBootloader,
};
