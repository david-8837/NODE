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
});
