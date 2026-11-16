'use strict';

// Windows' legacy blur-behind accent is not part of the public Win32 API.
// It can be unavailable or behave differently across Windows releases. This
// is deliberately best-effort: the ordinary transparent HUD is the fallback.
function makeWindowsBlur({ platform = process.platform, loadKoffi = () => require('koffi') } = {}) {
  if (platform !== 'win32') return () => false;
  let api;
  try {
    const koffi = loadKoffi();
    const accent = koffi.struct({
      state: 'int32_t', flags: 'int32_t', color: 'uint32_t', animation: 'int32_t',
    });
    const data = koffi.struct({
      attribute: 'int32_t', policy: koffi.pointer(accent), size: 'size_t',
    });
    const user32 = koffi.load('user32.dll');
    const setComposition = user32.func('__stdcall', 'SetWindowCompositionAttribute', 'int', ['uintptr_t', koffi.pointer(data)]);
    api = { koffi, accent, setComposition };
  } catch (error) {
    console.warn('Cheat-Sheet native blur unavailable:', error.message);
    return () => false;
  }
  return (nativeHandle, enabled = true) => {
    try {
      if (!Buffer.isBuffer(nativeHandle) || (nativeHandle.length !== 4 && nativeHandle.length !== 8)) return false;
      const handle = nativeHandle.length === 8 ? nativeHandle.readBigUInt64LE() : BigInt(nativeHandle.readUInt32LE());
      if (handle === 0n) return false;
      const { koffi, accent, setComposition } = api;
      const policy = koffi.alloc(accent, 1);
      try {
        // Mode 3 (blur behind), zero flags, and zero tint avoid acrylic's dark fill.
        koffi.encode(policy, accent, { state: enabled ? 3 : 0, flags: 0, color: 0, animation: 0 });
        return !!setComposition(handle, { attribute: 19, policy, size: koffi.sizeof(accent) });
      } finally { koffi.free(policy); }
    } catch (error) {
      console.warn('Cheat-Sheet native blur failed:', error.message);
      return false;
    }
  };
}

module.exports = { makeWindowsBlur };
