# Rounded Windows backdrop

The six Rust source files and LICENSE in this directory are from
[Haze](https://github.com/spectrvm1337/Haze-blur), MIT license, pinned at
`f1935808c290e2c41a2fa1dcf1f671b121aa4d1b` (version 0.4.0). The sources are
unmodified. The Cargo manifest here is reduced to the cdylib and dependencies
needed for NODE's Windows build; Tauri, examples, animations via JS, and upstream
tests are not included.

The Windows packaging workflow builds `haze.dll` from source with the `ffi`
feature and copies it into `electron/native/` for inclusion (unpacked) in the
installer. A local Windows release build likewise needs to build the DLL before
packaging. Without the DLL or on unsupported systems the overlay falls back to
its transparent outline, not the legacy rectangular blur. Haze uses Windows
Composition to clip the live backdrop brush to a rounded rectangle; it does not
capture screen pixels. Host backdrop setup uses an undocumented Windows API,
so the appearance and support must be checked on target systems.
