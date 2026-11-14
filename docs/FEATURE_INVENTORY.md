# Micro Pad V1 — Feature Inventory & Status Matrix

**Classification Legend:**
- **Implemented and verified** — Code is complete and verified by automated tests and/or build checks in this repository.
- **Implemented but not verified** — Code is present in the repository but requires physical RP2040 hardware or a Windows host to verify end-to-end.
- **Partially implemented** — UI or data model exists, but device sync, firmware handling, or runtime execution is incomplete.
- **Experimental** — Prototype or alternative implementation not integrated into the primary production path.
- **Missing** — Required by the Micro Pad V1 Master Specification but not yet implemented.
- **Broken** — Contains a confirmed bug or failing check that prevents correct operation.

---

## 1. Feature-by-Feature Status Table

| Feature | Existing Implementation | Current Status | Missing Work | Dependencies | Priority |
|---|---|---|---|---|---|
| **Hardware 3×3 Direct-Pin Matrix & Encoder Pinout** | `qmk_firmware/grid_macro_1/keyboard.json`, `config.h`, `src/deviceLayout.ts` (`GP0`–`GP8`, `GP9`/`GP10`, `GP11`, `GP16`) | **Implemented and verified** (schema/unit tests); **Implemented but not verified** on physical hardware in this container | Physical hardware electrical & detent direction verification | None | P0 |
| **QMK 1000 Hz Polling & 3 ms Eager Debounce** | `qmk_firmware/grid_macro_1/config.h` (`USB_POLLING_INTERVAL_MS 1`, `DEBOUNCE 3`), `rules.mk` (`sym_eager_pr`) | **Implemented and verified** (static config tests) | Compile & verify UF2 on physical RP2040-Zero | QMK toolchain / CI | P0 |
| **Basic Key Assignments (Device-Side)** | `src/qmkProfileSync.ts`, `src/qmkViaBridge.ts`, `qmk_firmware/grid_macro_1/keymaps/via/keymap.c` | **Implemented and verified** (unit + mock HID tests) | Physical hardware hold/repeat verification | WebHID / Electron HID | P0 |
| **Rotary Encoder CW / CCW / Press (Device-Side)** | `qmk_firmware/grid_macro_1/keymaps/via/keymap.c` (`encoder_map`), `src/qmkViaBridge.ts` (`0x14`/`0x15`) | **Implemented and verified** (unit + UI tests) | Support host-side Smart Action / Multi-Action triggers on encoder events | Custom Raw HID event protocol | P1 |
| **Actions: Single-Chord Shortcuts (Device-Side)** | `src/qmkProfileSync.ts` (`QK_MODS` translation for `Ctrl`/`Shift`/`Alt`/`Win` + key) | **Implemented and verified** | Support mixed left/right modifiers or fallback to host execution | None | P1 |
| **Actions: Multi-Step Sequences & Delays** | UI editor in `src/App.tsx`; host executor in `electron/desktopExecution.cjs` (`sendOperations`) | **Partially implemented** | Cannot be triggered by physical Micro Pad keys (works only when clicking UI keys with "Simulation on"); not synced to QMK | Custom Raw HID trigger protocol + Electron HID agent | P1 |
| **Multi-Action: 4 Gestures (`onTap`, `doubleTap`, `onHold`, `tapHold`)** | UI editor in `src/App.tsx`; schema in `src/profileFiles.ts`; partial `onTap` sync in `src/qmkProfileSync.ts` | **Partially implemented** | `doubleTap`, `onHold`, `tapHold` are dropped during QMK sync; no real-time gesture timing state machine (tapping term, hold threshold, premature tap prevention) in firmware or host agent | Firmware gesture state machine or Raw HID key-down/up stream + host gesture engine | P1 |
| **Smart Actions: CMD / Text / Web / App** | UI in `src/App.tsx`; security in `src/nativeActionSecurity.ts`; executor in `electron/desktopExecution.cjs` | **Partially implemented** | Host executor only runs when UI "Simulation on" is clicked; physical key presses on the Micro Pad do not trigger Smart Actions | Custom Raw HID trigger packets + Electron HID background agent | P1 |
| **4 Hardware Layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`)** | `qmk_firmware/grid_macro_1/keymaps/via/keymap.c` (4 layers); `src/App.tsx` (allows up to 8 layers) | **Partially implemented** | Constrain or clearly align desktop editor to the 4 hardware layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`); ensure default keymap can reach all 4 layers | Layer authority separation | P0 |
| **Separation of `deviceActiveLayer` vs. `editorSelectedLayer`** | `src/App.tsx` has only `activeLayerIndex`; `src/profileValidator.ts` | **Missing** | Add `deviceActiveLayer` state from firmware telemetry; decouple `editorSelectedLayer` from physical device active layer; add UI indicator for physical active layer | QMK Raw HID layer status query & event report | P0 |
| **Onboard WS2812 RGB Lighting (Firmware Layer-Following)** | `qmk_firmware/grid_macro_1/keymaps/via/keymap.c` (`layer_state_set_user` static RGB colors on `GP16`) | **Partially implemented** | Colors are hardcoded in C source; no EEPROM persistence for user-customized per-layer colors; no HID protocol to configure colors from desktop | QMK custom RGB HID commands + EEPROM storage | P2 |
| **Desktop RGB Lighting Configuration UI** | `src/App.tsx` (lines 1346–1378, 4141–4445) | **Broken / Disconnected** | UI shows fake "Backlight / Underglow" and "Snake / Gradient" controls for a 1-LED board, does not persist to `localStorage` or profile JSON, and sends nothing to hardware | Redesign UI for 1 onboard LED per-layer RGB + wire to HID & persistence | P2 |
| **Electron Background HID Agent (Sole Physical HID Owner)** | Not implemented (`electron/main.cjs` delegates WebHID to renderer `src/qmkViaBridge.ts`) | **Missing** | Implement main-process HID service in Electron, route React requests/events over IPC, disable competing renderer WebHID in Electron, keep WebHID for browser-only mode | Node HID transport in Electron main process | P0 |
| **System Tray & Background Operation** | `electron/main.cjs` has `startMinimized` setting only; closing window quits app | **Partially implemented** | Add system tray icon, minimize-to-tray / run-in-background option so Smart Actions work when window is closed | Electron `Tray` in `electron/main.cjs` | P2 |
| **Profile Management & Import/Export** | `src/profileFiles.ts`, `src/profileValidator.ts`, `src/App.tsx` | **Implemented and verified** (232-test suite + Windows persistence smoke workflow) | Align layer count (4 layers) and persist per-layer RGB settings in profile schema | None | P1 |
| **Automatic Pre-Sync Device Keymap Backup & Restore** | `src/deviceKeymapFiles.ts`, `src/App.tsx` (auto backup before `set_config`) | **Partially implemented** | Pre-sync auto-backup works and is verified; manual "Download backup" and "Restore from file" buttons exist in `deviceKeymapFiles.ts` but are hidden from `src/App.tsx` Settings UI | Expose backup download & restore controls in `src/App.tsx` Settings | P1 |
| **UF2 Firmware Update & Validation** | `electron/uf2Validator.cjs`, `electron/main.cjs` (`flash-firmware`), `src/appSettings.ts` | **Implemented and verified** (unit + integration tests) | Physical RP2040 bootloader (`RPI-RP2`) copy verification on Windows | None | P2 |
| **JavaScript Bundle Budget Gate (`npm run check:bundle`)** | `scripts/check-bundle-budget.mjs`, `vite.config.ts` | **Broken** | `dist/assets/*` totals 252.1 KiB gzip vs 200 KiB budget because `vendor-*.js` (168.8 KiB) + `index-*.js` (71.3 KiB) + `emojiCatalog-*.js` (11.5 KiB) are all under `assets/` | Fix bundle splitting or budget calculation in `scripts/check-bundle-budget.mjs` / `vite.config.ts` | P0 |
| **Alternative CircuitPython & Arduino Firmwares** | `firmware/code.py`, `firmware/boot.py`, `firmware/arduino_firmware.ino`, `src/serialManager.ts` | **Experimental / Broken** | Contains hold/release bugs, `boot.py` readonly bug, and incompatible protocols; should be archived or clearly marked deprecated so QMK is the single authoritative firmware | Owner approval to deprecate/archive `/firmware/` | P2 |

---

## 2. Duplicated Functionality Identified

1. **Three Separate Firmware Stacks (`qmk_firmware/grid_macro_1/`, `firmware/code.py`, `firmware/arduino_firmware.ino`):**
   - All three target the exact same RP2040-Zero GPIO pinout (`GP0`–`GP11`, `GP16`) but implement three mutually incompatible communication protocols (32-byte QMK/VIA `0x000D`, USB CDC Serial JSON lines, and 64-byte Report ID 3 TinyUSB Raw HID).
   - Only `qmk_firmware/grid_macro_1/` is wired into the production UI (`src/main.tsx` imports `./qmkViaBridge`) and CI (`.github/workflows/qmk-build.yml`).
2. **Dual Profile Validation & Normalization Modules (`src/profileFiles.ts` vs. `src/profileValidator.ts` vs. `src/App.tsx`):**
   - `src/profileFiles.ts` defines `sanitizeKeymapState`, `sanitizeLayer`, `sanitizeAssignment`, and `parseProfileImport` (allowing 1–8 layers).
   - `src/profileValidator.ts` defines a separate `validateProfile` and `sanitizeString` (also allowing 1–8 layers, used by `SerialManager` and unit tests).
   - `src/App.tsx` defines a third layer of normalization (`normalizeProfileForEditor`, `normalizeCustomItemsForEditor`).
3. **Production React App (`src/App.tsx`) vs. Legacy Embedded Bundle Fixture (`tests/fixtures/legacyEmbeddedApp.js`):**
   - `tests/embeddedApp.test.ts` and `tests/uiSourceContract.test.ts` run tests against both `src/App.tsx` and the 460 KB minified `tests/fixtures/legacyEmbeddedApp.js` snapshot. Any intentional UI improvement (such as adding a physical active-layer indicator, exposing manual keymap backup restore in Settings, or fixing the RGB lighting panel) must account for these snapshot/contract tests.

---

## 3. Competing Sources of State Identified

1. **Physical Device Active Layer vs. Editor Selected Layer vs. Simulation Layer:**
   - Currently stored in a single React state `activeLayerIndex` in `src/App.tsx` (and `activeLayerIndex` in `src/profileValidator.ts`).
   - Selecting a layer in the editor changes `activeLayerIndex`; triggering a `Layer Cycle` action in Simulation mode also mutates `activeLayerIndex`; meanwhile, the physical QMK device maintains its own internal `layer_state` bitmask that the desktop app never reads.
2. **Desktop Profile State (`localStorage['cm2.state.v2']`) vs. Physical QMK EEPROM State:**
   - On connect, `src/App.tsx` attempts `bridge.getFile('app_state')` (which always returns `{ ok: false }` on stock VIA) and then immediately **overwrites** the physical device's QMK EEPROM keymap with `currentProfile` (`bridge.request({ cmd: 'set_config', config })`), after saving a local pre-sync snapshot (`cm2.device-keymap-backups.v1`).
   - If a user configured their device on another machine or via VIA, connecting NØDE Studio immediately overwrites the device with the browser's default profile unless they restore from the automatic pre-sync backup (whose restore button is currently hidden in `src/App.tsx`!).
3. **App Settings in Renderer `localStorage` (`node-studio.settings.v1`) vs. Electron Native Settings (`userData/settings.v1.json`):**
   - Hydrated asynchronously on mount (`settingsTools.getDesktop()`), with `saveAppSettings` mirroring back to `localStorage`.
