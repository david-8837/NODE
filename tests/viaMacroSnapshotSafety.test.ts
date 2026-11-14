import { describe, expect, it, vi } from 'vitest';
import { runMacroOperation } from '../src/viaMacroTransaction';
import type { ViaKeymapSnapshot } from '../src/qmkViaBridge';

const snapshot = (keycode: number): ViaKeymapSnapshot => ({
  protocolVersion: 13, layerCount: 1, capturedLayerCount: 1,
  layers: [{ keys: { r1c1: keycode }, enc: { ccw: 0, cw: 0, press: 0 } }],
});

describe('macro recovery snapshot consistency', () => {
  it('fails the combined backup when the keymap changes across macro capture', async () => {
    let reads = 0;
    const exchange = vi.fn(async (command: Uint8Array) => {
      const report = new Uint8Array(32); report.set(command);
      if (command[0] === 12) report[1] = 1;
      if (command[0] === 13) report[2] = 4;
      if (command[0] === 14) report.set([0, 42, 0, 0], 4);
      return report;
    });
    const result = await runMacroOperation({ cmd: 'read_via_device_backup' }, {
      exchange, readLayerCount: async () => 1,
      readDeviceKeymap: async () => snapshot(++reads >= 3 ? 5 : 4),
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('changed during backup') });
    expect(result.snapshot).toBeUndefined();
    expect(exchange.mock.calls.every(([report]) => report[0] !== 15)).toBe(true);
  });
  it('does not write if the keymap changes while the macros are captured', async () => {
    let reads = 0;
    const exchange = vi.fn(async (command: Uint8Array) => {
      const report = new Uint8Array(32); report.set(command);
      if (command[0] === 12) report[1] = 1;
      if (command[0] === 13) { report[1] = 0; report[2] = 4; }
      if (command[0] === 14) report.set([0, 42, 0, 0], 4);
      return report;
    });
    const saveRecovery = vi.fn();
    const result = await runMacroOperation({ cmd: 'restore_via_macros', macroRestore: { count: 1, bytes: [0, 55, 0, 0] }, saveRecovery }, {
      exchange, readLayerCount: async () => 1,
      readDeviceKeymap: async () => snapshot(++reads >= 3 ? 5 : 4),
    });
    expect(result).toMatchObject({ ok: false, rollback: 'not-needed', error: expect.stringContaining('changed during') });
    expect(saveRecovery).not.toHaveBeenCalled();
    expect(exchange.mock.calls.every(([report]) => report[0] !== 15)).toBe(true);
  });
  it('restores keymap and macros together when keymapRestore is provided', async () => {
    let currentKeycode = 10;
    const macroBuffer = [0, 42, 0, 0];
    const exchange = vi.fn(async (command: Uint8Array) => {
      const report = new Uint8Array(32); report.set(command);
      if (command[0] === 12) report[1] = 1;
      if (command[0] === 13) { report[1] = 0; report[2] = 4; }
      if (command[0] === 14) {
        const offset = (command[1] << 8) | command[2];
        const len = command[3];
        report.set(macroBuffer.slice(offset, offset + len), 4);
      }
      if (command[0] === 15) {
        const offset = (command[1] << 8) | command[2];
        const len = command[3];
        for (let i = 0; i < len; i++) macroBuffer[offset + i] = command[4 + i];
      }
      return report;
    });
    const saveRecovery = vi.fn();
    const targetKeymap = snapshot(99);
    const restoreDeviceKeymap = vi.fn(async (candidate: ViaKeymapSnapshot | undefined) => {
      if (candidate?.layers[0].keys.r1c1 !== undefined) currentKeycode = candidate.layers[0].keys.r1c1;
      return { changedMappings: 1, warnings: [] };
    });
    const result = await runMacroOperation({
      cmd: 'restore_via_macros',
      macroRestore: { count: 1, bytes: [0, 88, 0, 0] },
      keymapRestore: targetKeymap,
      saveRecovery,
    }, {
      exchange,
      readLayerCount: async () => 1,
      readDeviceKeymap: async () => snapshot(currentKeycode),
      restoreDeviceKeymap,
    });
    expect(result).toMatchObject({ ok: true, rollback: 'not-needed' });
    expect(restoreDeviceKeymap).toHaveBeenCalledWith(targetKeymap, 1);
    expect(currentKeycode).toBe(99);
    expect(macroBuffer).toEqual([0, 88, 0, 0]);
    expect(saveRecovery).toHaveBeenCalledOnce();
    expect(saveRecovery.mock.calls[0][0].keymap.layers[0].keys.r1c1).toBe(10);
    expect(saveRecovery.mock.calls[0][0].macros.bytes).toEqual([0, 42, 0, 0]);
  });
  it('rolls back keymap and macros when macro write fails after keymap restore', async () => {
    let currentKeycode = 10;
    const macroBuffer = [0, 42, 0, 0];
    let writeAttempts = 0;
    const exchange = vi.fn(async (command: Uint8Array) => {
      const report = new Uint8Array(32); report.set(command);
      if (command[0] === 12) report[1] = 1;
      if (command[0] === 13) { report[1] = 0; report[2] = 4; }
      if (command[0] === 14) {
        const offset = (command[1] << 8) | command[2];
        const len = command[3];
        report.set(macroBuffer.slice(offset, offset + len), 4);
      }
      if (command[0] === 15) {
        writeAttempts++;
        if (writeAttempts === 1) {
          throw new Error('USB write error');
        }
        const offset = (command[1] << 8) | command[2];
        const len = command[3];
        for (let i = 0; i < len; i++) macroBuffer[offset + i] = command[4 + i];
      }
      return report;
    });
    const saveRecovery = vi.fn();
    const targetKeymap = snapshot(99);
    const restoreDeviceKeymap = vi.fn(async (candidate: ViaKeymapSnapshot | undefined) => {
      if (candidate?.layers[0].keys.r1c1 !== undefined) currentKeycode = candidate.layers[0].keys.r1c1;
      return { changedMappings: 1, warnings: [] };
    });
    const result = await runMacroOperation({
      cmd: 'restore_via_macros',
      macroRestore: { count: 1, bytes: [0, 88, 0, 0] },
      keymapRestore: targetKeymap,
      saveRecovery,
    }, {
      exchange,
      readLayerCount: async () => 1,
      readDeviceKeymap: async () => snapshot(currentKeycode),
      restoreDeviceKeymap,
    });
    expect(result).toMatchObject({ ok: false, rollback: 'verified', error: 'USB write error' });
    expect(currentKeycode).toBe(10);
  });
});
