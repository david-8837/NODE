'use strict';
const path = require('node:path');

// Haze draws a clipped Windows Composition backdrop under the renderer instead
// of applying a rectangular system accent. No desktop screenshots are taken.
// If the DLL or compositor is unavailable, leave the overlay transparent.
function makeWindowsBlur({ platform = process.platform, loadKoffi = () => require('koffi'), dllPath } = {}) {
  if (platform !== 'win32') return () => null;
  try {
    const koffi = loadKoffi();
    const libraryPath = dllPath || path.join(__dirname, 'native', 'haze.dll').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    const lib = koffi.load(libraryPath);
    const supported = lib.func('int haze_supported()');
    const attach = lib.func('uintptr_t haze_attach(uintptr_t hwnd, float radius, float strength, float tint, uint32_t rgb, float saturation)');
    const detach = lib.func('void haze_detach(uintptr_t haze)');
    if (!supported()) return () => null;
    return (nativeHandle) => {
      try {
        if (!Buffer.isBuffer(nativeHandle) || (nativeHandle.length !== 4 && nativeHandle.length !== 8)) return null;
        const hwnd = nativeHandle.length === 8 ? nativeHandle.readBigUInt64LE() : BigInt(nativeHandle.readUInt32LE());
        if (hwnd === 0n) return null;
        // Radius matches main's 22px border; strength is intentionally modest,
        // with no tint and normal saturation. Haze accounts for display DPI.
        const handle = attach(hwnd, 22, 6, 0, 0, 1);
        if (!handle) return null;
        let active = true;
        return () => {
          if (!active) return;
          active = false;
          try { detach(handle); } catch (error) { console.warn('Cheat-Sheet blur cleanup failed:', error.message); }
        };
      } catch (error) {
        console.warn('Cheat-Sheet rounded blur failed:', error.message);
        return null;
      }
    };
  } catch (error) {
    console.warn('Cheat-Sheet rounded blur unavailable:', error.message);
    return () => null;
  }
}
module.exports = { makeWindowsBlur };
