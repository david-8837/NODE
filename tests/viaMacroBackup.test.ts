/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { latestViaRecoveryKey, parseViaMacroFile, saveViaRecovery, type ViaMacroFile } from '../src/viaMacroBackup';

const file: ViaMacroFile = { format: 'node-studio-via-macros', version: 1, device: 'Grid Macro 1', firmware: null, createdAt: '2026-01-01T00:00:00.000Z', count: 2, bytes: [0, 1, 0] };
describe('VIA macro file safety', () => {
  beforeEach(() => localStorage.clear());
  it('validates all macro bytes and metadata before restore', () => {
    expect(parseViaMacroFile(JSON.stringify(file))).toEqual(file);
    for (const bad of [ { ...file, bytes: [256] }, { ...file, count: 1.2 }, { ...file, version: 2 }, { ...file, keymap: {} }, { ...file, bytes: Array(4097).fill(0) } ]) {
      expect(() => parseViaMacroFile(JSON.stringify(bad))).toThrow();
    }
  });
  it('keeps independent recovery copies and finds the newest after restart', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const first = saveViaRecovery(localStorage, file);
    const second = saveViaRecovery(localStorage, { ...file, count: 0, bytes: [0] });
    expect(first).not.toBe(second);
    expect(parseViaMacroFile(localStorage.getItem(first)!).bytes).toEqual([0, 1, 0]);
    const diagnostic = saveViaRecovery(localStorage, { ...file, bytes: [255] }, true);
    expect(latestViaRecoveryKey(localStorage)).toBe(second);
    expect(latestViaRecoveryKey(localStorage, true)).toBe(diagnostic);
    vi.restoreAllMocks();
  });
  it('refuses recovery storage that cannot persist a matching copy', () => {
    const broken = { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() } as unknown as Storage;
    expect(() => saveViaRecovery(broken, file)).toThrow('could not be verified');
  });
});
