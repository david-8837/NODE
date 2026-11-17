import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
const { makeWindowsBlur } = createRequire(import.meta.url)('../electron/cheatSheetBlur.cjs');

function fakeKoffi() {
  const supported = vi.fn(() => 1);
  const attach = vi.fn(() => 100n);
  const detach = vi.fn();
  const func = vi.fn((signature: string) => {
    if (signature.includes('haze_supported')) return supported;
    if (signature.includes('haze_attach')) return attach;
    if (signature.includes('haze_detach')) return detach;
    throw new Error('unexpected function');
  });
  const koffi = { load: vi.fn(() => ({ func })) };
  return { koffi, supported, attach, detach };
}

describe('Cheat-Sheet rounded Windows blur', () => {
  it('does not load native code on other platforms', () => {
    const loadKoffi = vi.fn();
    expect(makeWindowsBlur({ platform: 'linux', loadKoffi })(Buffer.alloc(8))).toBeNull();
    expect(loadKoffi).not.toHaveBeenCalled();
  });
  it('attaches untinted rounded blur and cleans it up once', () => {
    const { koffi, attach, detach } = fakeKoffi();
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => koffi, dllPath: 'haze.dll' });
    const hwnd = Buffer.alloc(8); hwnd.writeBigUInt64LE(42n);
    const dispose = blur(hwnd);
    expect(koffi.load).toHaveBeenCalledWith('haze.dll');
    expect(attach).toHaveBeenCalledWith(42n, 22, 6, 0, 0, 1);
    expect(typeof dispose).toBe('function');
    dispose(); dispose();
    expect(detach).toHaveBeenCalledOnce();
    expect(detach).toHaveBeenCalledWith(100n);
  });
  it('falls back to a transparent overlay for unsupported Windows, invalid handles or attach failure', () => {
    const { koffi, supported, attach } = fakeKoffi();
    supported.mockReturnValueOnce(0);
    expect(makeWindowsBlur({ platform: 'win32', loadKoffi: () => koffi })(Buffer.alloc(8))).toBeNull();
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => koffi });
    expect(blur(Buffer.alloc(8))).toBeNull();
    expect(blur(Buffer.alloc(1))).toBeNull();
    expect(attach).not.toHaveBeenCalled();
    attach.mockReturnValueOnce(0n);
    const hwnd = Buffer.alloc(4); hwnd.writeUInt32LE(1);
    expect(blur(hwnd)).toBeNull();
  });
  it('falls back when the native library is unavailable', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blur = makeWindowsBlur({ platform: 'win32', loadKoffi: () => { throw new Error('unavailable'); } });
    expect(blur(Buffer.alloc(8))).toBeNull();
    warning.mockRestore();
  });
});
