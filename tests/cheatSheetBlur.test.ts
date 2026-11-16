import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const { makeWindowsBlur } = createRequire(import.meta.url)('../electron/cheatSheetBlur.cjs');

function fakeKoffi() {
  const memory = {};
  const call = vi.fn(() => 1);
  const encode = vi.fn();
  const free = vi.fn();
  const func = vi.fn(() => call);
  const koffi = {
    struct: vi.fn(() => ({})), pointer: vi.fn(() => ({})),
    load: vi.fn(() => ({ func })), alloc: vi.fn(() => memory),
    encode, free, sizeof: vi.fn(() => 16),
  };
  return { koffi, call, encode, free, func, memory };
}

describe('Cheat-Sheet Windows blur adapter', () => {
  it('does not load native code on other platforms', () => {
    const loadKoffi = vi.fn();
    expect(makeWindowsBlur({ platform: 'linux', loadKoffi })(Buffer.alloc(8))).toBe(false);
    expect(loadKoffi).not.toHaveBeenCalled();
  });
  it('uses untinted blur behind and supports cleanup when shape fails', () => {
    const { koffi, call, encode, free, func, memory } = fakeKoffi();
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => koffi });
    const hwnd = Buffer.alloc(8); hwnd.writeBigUInt64LE(42n);
    expect(blur(hwnd)).toBe(true);
    expect(func).toHaveBeenCalledWith('__stdcall', 'SetWindowCompositionAttribute', 'int', expect.any(Array));
    expect(encode).toHaveBeenCalledWith(memory, expect.anything(), { state: 3, flags: 0, color: 0, animation: 0 });
    expect(call).toHaveBeenCalledWith(42n, { attribute: 19, policy: memory, size: 16 });
    expect(free).toHaveBeenCalledWith(memory);
    expect(blur(hwnd, false)).toBe(true);
    expect(encode).toHaveBeenLastCalledWith(memory, expect.anything(), { state: 0, flags: 0, color: 0, animation: 0 });
  });
  it('falls back safely on invalid handles and native errors', () => {
    const { koffi, call, free } = fakeKoffi();
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => koffi });
    expect(blur(Buffer.alloc(8))).toBe(false);
    expect(blur(Buffer.alloc(1))).toBe(false);
    expect(call).not.toHaveBeenCalled();
    call.mockImplementation(() => { throw new Error('unsupported'); });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hwnd = Buffer.alloc(4); hwnd.writeUInt32LE(1);
    expect(blur(hwnd)).toBe(false);
    expect(free).toHaveBeenCalled();
    warning.mockRestore();
  });
  it('falls back when the native library is unavailable', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => { throw new Error('unavailable'); } });
    expect(blur(Buffer.alloc(8))).toBe(false);
    warning.mockRestore();
  });
});
