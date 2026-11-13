import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  MAX_BOOTLOADER_MARKER_BYTES,
  copyValidatedUf2ToBootloader,
} = require('../electron/uf2Flasher.cjs') as {
  MAX_BOOTLOADER_MARKER_BYTES: number;
  copyValidatedUf2ToBootloader: (options: {
    firmwarePath: string;
    markerPath: string;
    fsModule?: unknown;
  }) => Promise<{ ok: boolean; error?: string; message?: string; byteLength?: number; blockCount?: number }>;
};

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

function makeRp2040Uf2(): Buffer {
  const block = Buffer.alloc(512);
  block.writeUInt32LE(0x0a324655, 0);
  block.writeUInt32LE(0x9e5d5157, 4);
  block.writeUInt32LE(0x00002000, 8);
  block.writeUInt32LE(256, 16);
  block.writeUInt32LE(0, 20);
  block.writeUInt32LE(1, 24);
  block.writeUInt32LE(0xe48bff56, 28);
  block.writeUInt32LE(0x0ab16f30, 508);
  return block;
}

async function createBootloaderFixture(markerContents = 'Model: Raspberry Pi RPI-RP2 Bootloader\n') {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'node-studio-uf2-'));
  temporaryDirectories.push(directory);
  const firmwarePath = path.join(directory, 'grid-macro.uf2');
  const markerPath = path.join(directory, 'INFO_UF2.TXT');
  await writeFile(firmwarePath, makeRp2040Uf2());
  await writeFile(markerPath, markerContents);
  return { directory, firmwarePath, markerPath };
}

describe('validated RP2040 UF2 copy', () => {
  it('copies only a valid RP2040 image to an identified bootloader drive', async () => {
    const { directory, firmwarePath, markerPath } = await createBootloaderFixture();

    const result = await copyValidatedUf2ToBootloader({ firmwarePath, markerPath });

    expect(result).toMatchObject({ ok: true, byteLength: 512, blockCount: 1 });
    expect(result.message).toContain('copied to the RPI-RP2 bootloader drive');
    expect(await readFile(path.join(directory, 'firmware.uf2'))).toEqual(makeRp2040Uf2());
  });

  it('rejects a non-UF2 file before reading it', async () => {
    const { firmwarePath, markerPath } = await createBootloaderFixture();
    const readFirmware = vi.fn(async () => makeRp2040Uf2());
    const fsModule = {
      stat: vi.fn(async () => ({ size: 512, isFile: () => true })),
      readFile: readFirmware,
      writeFile: vi.fn(),
    };

    const result = await copyValidatedUf2ToBootloader({
      firmwarePath: firmwarePath.replace(/\.uf2$/, '.bin'),
      markerPath,
      fsModule,
    });

    expect(result).toMatchObject({ ok: false, error: 'Choose a .uf2 firmware file' });
    expect(readFirmware).not.toHaveBeenCalled();
  });

  it('rejects oversized firmware before allocating the file contents', async () => {
    const { firmwarePath, markerPath } = await createBootloaderFixture();
    const readFileMock = vi.fn();
    const fsModule = {
      stat: vi.fn(async () => ({ size: 32 * 1024 * 1024 + 512, isFile: () => true })),
      readFile: readFileMock,
      writeFile: vi.fn(),
    };

    const result = await copyValidatedUf2ToBootloader({ firmwarePath, markerPath, fsModule });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('valid-size UF2') });
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('requires the exact bootloader marker filename and an RP2040 drive marker', async () => {
    const { directory, firmwarePath, markerPath } = await createBootloaderFixture('Model: OTHER\n');

    const wrongFilename = await copyValidatedUf2ToBootloader({
      firmwarePath,
      markerPath: path.join(directory, 'other.txt'),
    });
    expect(wrongFilename).toMatchObject({ ok: false, error: expect.stringContaining('INFO_UF2.TXT') });

    const wrongDrive = await copyValidatedUf2ToBootloader({ firmwarePath, markerPath });
    expect(wrongDrive).toMatchObject({ ok: false, error: expect.stringContaining('does not identify the RPI-RP2') });
    await expect(stat(path.join(directory, 'firmware.uf2'))).rejects.toThrow();
  });

  it('bounds marker-file reads and never overwrites an existing firmware image', async () => {
    const oversizedMarker = await createBootloaderFixture('x'.repeat(MAX_BOOTLOADER_MARKER_BYTES + 1));
    const badMarker = await copyValidatedUf2ToBootloader(oversizedMarker);
    expect(badMarker).toMatchObject({ ok: false, error: expect.stringContaining('valid RPI-RP2 marker') });
    await expect(stat(path.join(oversizedMarker.directory, 'firmware.uf2'))).rejects.toThrow();

    const existingImage = await createBootloaderFixture();
    const destination = path.join(existingImage.directory, 'firmware.uf2');
    await writeFile(destination, 'keep existing image');
    const duplicate = await copyValidatedUf2ToBootloader(existingImage);
    expect(duplicate).toMatchObject({ ok: false, error: expect.stringContaining('already on that drive') });
    expect(await readFile(destination, 'utf8')).toBe('keep existing image');
  });

  it('rejects malformed UF2 blocks before writing to the drive', async () => {
    const { directory, firmwarePath, markerPath } = await createBootloaderFixture();
    await writeFile(firmwarePath, Buffer.alloc(512, 0));

    const result = await copyValidatedUf2ToBootloader({ firmwarePath, markerPath });

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('invalid magic') });
    await expect(stat(path.join(directory, 'firmware.uf2'))).rejects.toThrow();
  });
});

describe('firmware flash safety gate', () => {
  it('warns about keymap and macro loss and defaults to cancel before opening firmware', () => {
    const source = readFileSync('electron/main.cjs', 'utf8');
    const handler = source.slice(source.indexOf("ipcMain.handle('flash-uf2'"), source.indexOf("ipcMain.handle('set-simulation-enabled'"));
    expect(handler).toContain('may reset your device keymap and VIA macros');
    expect(handler).toContain('does not include VIA macros');
    expect(handler).toContain('defaultId: 0');
    expect(handler).toContain('warning.response !== 1');
    expect(handler.indexOf('warning.response !== 1')).toBeLessThan(handler.indexOf('dialog.showOpenDialog'));
  });
});
