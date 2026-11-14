import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'vitest';

describe('portable lighting journal', () => {
  it.skipIf(process.platform === 'win32')('preserves prior settings across simulated I/O failures and refuses unknown data', () => {
    const directory = mkdtempSync(join(tmpdir(), 'node-lighting-'));
    try {
      const executable = join(directory, 'test');
      execFileSync('cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Iqmk_firmware/grid_macro_1', 'qmk_firmware/grid_macro_1/lighting_store.c', 'qmk_firmware/grid_macro_1/lighting_controller.c', 'qmk_firmware/grid_macro_1/lighting_protocol.c', 'tests/fixtures/lighting_store_test.c', '-o', executable]);
      execFileSync(executable);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it.skipIf(process.platform === 'win32')('keeps simulated RP2040 writes out of VIA storage and refuses unknown sector contents', () => {
    const directory = mkdtempSync(join(tmpdir(), 'node-flash-'));
    try {
      const executable = join(directory, 'test');
      execFileSync('cc', ['-std=c11', '-Wall', '-Wextra', '-Werror', '-Iqmk_firmware/grid_macro_1', 'qmk_firmware/grid_macro_1/lighting_store.c', 'qmk_firmware/grid_macro_1/lighting_rp2040_flash.c', 'tests/fixtures/lighting_flash_test.c', '-o', executable]);
      execFileSync(executable);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

});
