# NØDE Grid Macro 1 Studio — Windows and firmware guide

## Current product shape

NØDE Grid Macro 1 Studio is a React/Vite configurator that can run in a browser and is packaged as a Windows x64 Electron app. The current hardware connection path is **QMK/VIA over WebHID**. Profiles and custom actions are kept in browser/app storage; only mappings supported by standard VIA are synchronized to the keyboard.

The project contains three firmware implementations, but they do **not** share a common host protocol:

| Firmware source | Transport | Current Studio integration | Release status |
| --- | --- | --- | --- |
| `qmk_firmware/grid_macro_1/` | QMK/VIA Raw HID | Yes, for supported VIA keycodes and encoder maps | Intended app-compatible firmware; must be built and hash-verified for the release commit |
| `firmware/code.py` (CircuitPython) | USB keyboard HID plus newline-delimited JSON over USB CDC | No; the Studio does not send the CircuitPython CDC protocol | Experimental source; requires separate runtime and physical validation |
| `firmware/arduino_firmware.ino` (Arduino) | Adafruit TinyUSB custom 64-byte Raw HID protocol | No; this is not the stock VIA protocol used by the Studio | Separate implementation; requires its own host bridge and validation |

Do not present CircuitPython or Arduino firmware as interchangeable with the current QMK/VIA device integration. In particular, copying `code.py` to a board does not enable the Studio's QMK/VIA Connect/Sync controls.

## Windows app development and packaging

Requirements: Node.js 22 and npm.

```sh
npm ci
npm run lint
npm test
npm run build
npm run check:bundle
npm run build:win
```

`npm run build:win` is intended to run on a Windows x64 runner and produces an NSIS installer and portable ZIP under the ignored `dist_electron/` directory. The installer is unsigned; Windows may display a security warning. The GitHub Actions Windows workflow runs type checks, tests, packaging, and packaged-app smoke/persistence checks before publishing tagged Windows assets.

Use the exact package version and source commit intended for release. Check `package.json`, `package-lock.json`, the release tag, installer filenames, and release notes together; do not publish a package built from an older source tree under a newer release tag.

## QMK/VIA firmware

`qmk_firmware/grid_macro_1/` is a keyboard-definition fragment, not a complete QMK checkout. The pinned workflow in `.github/workflows/qmk-build.yml` builds `via` and `default` keymaps from a pinned QMK firmware commit and QMK CLI version, verifies non-empty UF2 outputs, and uploads the VIA UF2 with checksum and build provenance as a short-lived GitHub Actions artifact. It does **not** attach firmware assets to GitHub Releases; the Windows workflow currently publishes only the installer and portable ZIP.

Before publishing firmware for a release:

1. Confirm the intended release commit contains the app, firmware, and workflow changes and has a successful verification run.
2. Run the pinned QMK workflow for that exact commit/tag.
3. Verify both keymap builds pass; download the artifact from that exact run and validate `SHA256SUMS.txt` against the UF2.
4. Manually attach `grid_macro_1_via.uf2`, `SHA256SUMS.txt`, and `BUILD-INFO.txt` to the intended GitHub Release, then confirm the uploaded assets and checksums.
5. Follow `HARDWARE_PREPARATION_CHECKLIST.md` before flashing. A successful compile does not verify board wiring or physical behavior.

The current Studio uses standard VIA Raw HID, not a custom JSON profile-storage protocol. Full profile data and custom actions stay local and are not stored on the keyboard.

## CircuitPython source variant

See `firmware/README.md` for the source-file installation procedure and dependencies. `npm run test:firmware` runs host-side validation, serial-framing, and debounce tests. Those tests do not run the CircuitPython VM or board hardware. This source variant has no built UF2 in this repository and is not synchronized by the Studio UI; do not publish it as a supported, Studio-integrated firmware without end-to-end host support and a physical device test.

## Arduino source variant

`firmware/arduino_firmware.ino` is a separate TinyUSB implementation using its own Raw HID command layout. The current Studio's stock-VIA bridge does not speak that protocol. This variant needs a matching host bridge and toolchain build before it can be considered a release firmware.

## Release validation notes

For each release candidate, record:

- Repository commit and package/release version.
- Typecheck, full test, dependency-audit, production build, and bundle-budget results.
- Windows installer/ZIP build and packaged-app smoke results from a Windows runner.
- QMK build run ID, pinned toolchain provenance, UF2 checksum, and exact release asset names.
- Hardware board revision, wiring source, firmware hash, and physical test results—or explicitly state that no physical validation was performed.

The Windows installer is currently unsigned. No documentation, host-side simulator, or compiler success is a substitute for validating the target board's wiring, USB identity, bootloader recovery, keys, encoder, and LED behavior.