# Micro Pad V1 — Repository Audit Report

**Audit Date:** Baseline Repository Inspection (Phase 0)  
**Repository Version:** `grid-macro-1-configurator@1.0.5`  
**Audit Scope:** Complete static and runtime inspection of firmware (`qmk_firmware/`, `firmware/`), desktop host (`electron/`, `native-executor.ts`), frontend application (`src/`, `index.html`), CI/CD workflows (`.github/workflows/`), and automated test suites (`tests/`).

---

## 1. Executive Summary of Actual Repository Contents

The imported repository is a substantially developed React 19 + TypeScript + Vite 8 + Electron 45 + QMK/VIA project branded as **NØDE Studio — Grid Macro 1 Configurator**.

Contrary to older notes in `QUALITY_ASSESSMENT.md` (which described an earlier state where `index.html` ran a 465 KB inline Babel script and `src/App.tsx` was an unused Creator Micro 2 prototype), the current repository **has already migrated production rendering to `/src/main.tsx` and `/src/App.tsx`** while retaining the old inline bundle at `/tests/fixtures/legacyEmbeddedApp.js` for regression comparison.

However, several critical product capabilities described in the Master Specification are **partially implemented, disconnected across layers, or missing**:
1. **Physical Smart Actions & Multi-Actions cannot be triggered by pressing physical keys on the QMK hardware** because QMK firmware (`qmk_firmware/grid_macro_1/keymaps/via/keymap.c`) only runs stock VIA without custom Raw HID key/encoder event reporting, and `src/qmkProfileSync.ts` skips Smart Actions and non-tap gestures (`doubleTap`, `onHold`, `tapHold`) with warnings.
2. **No Electron Main-Process HID Agent exists yet:** `electron/main.cjs` delegates WebHID permissions to the Chromium renderer (`src/qmkViaBridge.ts`) rather than owning the physical USB HID device in the Node/Electron background process.
3. **`deviceActiveLayer` and `editorSelectedLayer` are not separated:** Only `activeLayerIndex` exists in `src/App.tsx`, profiles allow up to 8 layers in software (`handleAddLayer` allows `< 8`) while hardware has 4 layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`), and there is no live active-layer telemetry from QMK firmware.
4. **RGB Lighting UI is disconnected from hardware:** `src/App.tsx` renders a complex "Backlight / Underglow" popover with "Snake / Rainbow / Breath / Gradient" sliders in volatile React state (`lightingConfig`), which is neither persisted to `localStorage` nor sent to the device, while QMK `keymap.c` hardcodes 4 fixed RGB colors in `layer_state_set_user` for the single WS2812 LED on `GP16`.

---

## 2. Subsystem-by-Subsystem Audit Findings

### 2.1 QMK Firmware (`/qmk_firmware/grid_macro_1/`)
- **Files:** `keyboard.json`, `config.h`, `grid_macro_1.h`, `rules.mk`, `via.json`, `build_uf2.sh`, `keymaps/default/keymap.c`, `keymaps/via/keymap.c`, `keymaps/via/rules.mk`.
- **Hardware Mapping (Verified Correct):**
  - MCU: `RP2040`, bootloader `rp2040`, USB VID `0xFEED`, PID `0x6001`.
  - Direct pins (`matrix_pins.direct` in `keyboard.json`):
    - Row 0: `["GP0", "GP1", "GP2"]` (Keys 1–3 / `r1c1`–`r1c3`)
    - Row 1: `["GP3", "GP4", "GP5"]` (Keys 4–6 / `r2c1`–`r2c3`)
    - Row 2: `["GP6", "GP7", "GP8"]` (Keys 7–9 / `r3c1`–`r3c3`)
    - Row 3: `["GP11", null, null]` (Encoder Push / `dial-tl press`)
  - Rotary Encoder: `pin_a: "GP9"`, `pin_b: "GP10"`, `resolution: 4`, plus `#define ENCODER_DIRECTION_FLIP` in `config.h`.
  - Onboard RGB LED: `ws2812.pin: "GP16"`, `driver: "vendor"`, `RGBLIGHT_LED_COUNT 1`, `RGBLIGHT_LIMIT_VAL 180`.
- **Scan & Timing Config (`config.h` & `rules.mk`):**
  - `USB_POLLING_INTERVAL_MS 1` (1000 Hz)
  - `DEBOUNCE 3` with `DEBOUNCE_TYPE = sym_eager_pr`
  - `DYNAMIC_KEYMAP_LAYER_COUNT 4`
  - `DYNAMIC_KEYMAP_EEPROM_MAX_ADDR 4095`
  - `TAPPING_TERM 200`
- **Keymaps (`keymaps/via/keymap.c` & `keymaps/default/keymap.c`):**
  - Defines `enum layer_names { _BASE = 0, _MEDIA, _NUMPAD, _FN }`.
  - Uses `ENCODER_MAP_ENABLE = yes` (`encoder_map[4][1][2]`).
  - `keyboard_post_init_user`: calls `rgblight_enable_noeeprom()`, `rgblight_mode_noeeprom(RGBLIGHT_MODE_STATIC_LIGHT)`, `rgblight_setrgb_at(0, 81, 255, 0)`.
  - `layer_state_set_user`: switches the single LED color by highest active layer (`_MEDIA`: `16, 185, 129`, `_NUMPAD`: `245, 158, 11`, `_FN`: `225, 29, 72`, `_BASE`: `0, 81, 255`).
- **Missing in QMK Firmware:**
  - No `raw_hid_receive_kb` / `via_command_kb` extension for reporting `layer_state`, custom Smart Action key triggers, Multi-Action gesture triggers, or custom per-layer RGB configuration.
  - Default keymap puts `MO(_MEDIA)` on Encoder Press (`_BASE`), leaving `_NUMPAD` and `_FN` unreachable from default physical keys unless remapped by the user.

### 2.2 Legacy / Alternative Firmware (`/firmware/`)
- **CircuitPython (`/firmware/boot.py`, `/firmware/code.py`):**
  - Uses identical GPIO pins (`GP0`–`GP8`, `GP9`/`GP10`, `GP11`, `GP16`).
  - Communicates over USB CDC Serial using newline-delimited JSON (`PING`, `GET_CONFIG`, `SET_CONFIG`, `SET_LAYER`) paired with `/src/serialManager.ts`.
  - **Confirmed Bugs:**
    - `boot.py` calls `storage.remount("/", readonly=False)` in **both** `if not encoder_btn.value:` and `else:` branches, making CircuitPython writable and the USB drive read-only to the host PC in both modes.
    - `code.py` `execute_binding()` calls `kbd.send(*keycodes)` on key-down, which immediately presses and releases the key (breaking key hold and OS auto-repeat).
    - `code.py` has no switch debounce logic on `keys[i].value`.
    - `code.py` writes unvalidated `SET_CONFIG` payloads directly to `/keymap.json`.
- **Arduino TinyUSB (`/firmware/arduino_firmware.ino`):**
  - Uses `Adafruit_TinyUSB` with 64-byte Raw HID (Report ID 3) and custom commands `0x01`–`0x04` plus `0xEE` Smart Action event `[0xEE, keycode & 0xFF, current_layer]`.
  - **Confirmed Bugs:**
    - Incompatible with `/src/qmkViaBridge.ts` (which speaks stock VIA protocol `0x000D` on 32-byte reports without Report ID 3).
    - `fire_keycode()` calls `usb_hid.keyboardReport(...)`, `delay(10)`, `usb_hid.keyboardRelease(1)` on key press — breaking key hold and blocking the scan loop for 10 ms.
    - `SAVE_FLASH` (`0x04`) writes `keymaps` to EEPROM (`0x47524944` magic) but **omits `encoder_map`**, losing encoder bindings on power cycle.
    - No WS2812 RGB driver implementation despite header comments.

### 2.3 HID & Device Synchronization (`/src/qmkViaBridge.ts`, `/src/qmkProfileSync.ts`, `/src/deviceKeymapFiles.ts`)
- **`/src/qmkViaBridge.ts`:**
  - Implements a clean, serialized command-queue WebHID client (`commandQueue` with 1000 ms timeout) for stock VIA (`VID 0xFEED`, `PID 0x6001`, usagePage `0xFF60`, usage `0x61`, 32-byte packets).
  - Supports `get_config`, `set_config`, and `restore_config` using `DYNAMIC_KEYMAP_GET_BUFFER` (`0x12`), `DYNAMIC_KEYMAP_SET_KEYCODE` (`0x05`), `DYNAMIC_KEYMAP_GET_ENCODER` (`0x14`), and `DYNAMIC_KEYMAP_SET_ENCODER` (`0x15`).
  - Diffs keycodes and encoder values before writing so unchanged slots do not wear flash.
  - **Limitations:** Runs in the browser/renderer via `navigator.hid`; has no packet listener for incoming unsolicited device events (key presses, encoder turns, or layer changes); cannot query active layer state.
- **`/src/qmkProfileSync.ts`:**
  - Translates desktop profile bindings into 16-bit QMK keycodes for up to 4 layers.
  - Supports basic keys, media keys, `MO(0..3)`, `TO(0..3)`, and single-chord shortcuts (`QK_MODS` `0x0100`–`0x1FFF`).
  - **Limitations:**
    - Rejects mixed left+right modifier chords.
    - Rejects multi-step sequences (`steps.length !== 1`) with warning *"multi-step sequences need desktop Simulation"*.
    - For `Multi-step action` (Multi-Action), only syncs `gestures.onTap` and warns *"Stock VIA can send onTap only; doubleTap, onHold, tapHold gestures are not available on the device"*.
    - Skips all `Smart Action` bindings with warning *"Smart Actions run through the desktop app and are not written to stock VIA firmware"*.
- **`/src/deviceKeymapFiles.ts`:**
  - Saves up to 5 pre-sync device keymap snapshots in `localStorage` (`cm2.device-keymap-backups.v1`) and validates backup JSON files before restore.
  - **UI Gap:** While `deviceKeymapFileTools.downloadLatestBackup()` and `restoreFromFile()` exist in `/src/deviceKeymapFiles.ts`, `src/App.tsx` intentionally hid the manual backup download/restore controls in Settings (verified by `tests/reactAppFileOperations.test.tsx` line 55: *"keeps device information while hiding manual keymap-backup controls"*).

### 2.4 Electron Main Process & Host Execution (`/electron/`)
- **`/electron/main.cjs` & `/electron/preload.cjs`:**
  - Hardens the BrowserWindow (`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, navigation/window-open guards, origin verification `isTrustedRendererRequest`).
  - Persists native settings (`launchOnStartup`, `startMinimized`, `allowAnalytics`, `allowDeviceNotifications`, `allowTerminalSmartActions`) in `userData/settings.v1.json`.
  - Supports UF2 firmware flashing (`flash-firmware` IPC) with strict RP2040 UF2 block validation (`/electron/uf2Validator.cjs`) and removable drive root verification.
  - Discovers installed Windows Start Menu `.lnk` shortcuts and `.exe` apps (`/electron/installedApplications.cjs`).
  - **Missing Background Agent Capabilities:**
    - No system tray icon or close-to-tray background lifecycle (closing the window quits the app on Windows/Linux).
    - No main-process USB HID ownership (`node-hid` is not used); relies on renderer WebHID.
- **`/electron/desktopExecution.cjs` & `/src/actionExecution.ts`:**
  - Implements a well-hardened Windows input adapter using a persistent PowerShell C# `SendInput` worker (`NodeStudioNativeInput`), with held-key tracking (`heldVkCodes`) and automatic release (`cancelAll`) when Simulation is turned off or the process exits.
  - Enforces strict security boundaries for `Cmd` (requires `allowTerminalSmartActions === true`, blocks dangerous commands in `/src/nativeActionSecurity.ts`, parses arguments without shell interpolation, requires explicit user confirmation for imported profile commands), `Web` (`http:`/`https:` validation), and `App` (validated `.lnk`/`.exe` paths).
  - **Critical Limitation:** `execute()` in `/electron/desktopExecution.cjs` requires `simulationEnabled === true` (line 52: `if (!simulationEnabled || closed) return { success: false, error: 'Simulation is disabled; no desktop action was executed' }`) and is only invoked when the user clicks virtual keys in the UI with "Simulation on" — not from physical Micro Pad key presses!

### 2.5 Frontend Configurator (`/src/App.tsx`)
- Renders the 3×3 key grid (`r1c1`–`r3c3`) and rotary encoder (`dial-tl`) with CW/Press/CCW sub-capsules.
- Supports Profiles (up to 16 profiles, rename, color, import/export `.json`), Presets Library (27 application presets with OS-aware Windows/macOS shortcuts), and Key Mapping Drawer (`Basic`, `Action`, `Multi-A`, `Smart-A`).
- **Identified Issues in `/src/App.tsx`:**
  1. **Layer Count Mismatch:** Allows adding up to **8 layers** per profile (`currentProfile.layers.length < 8` at line 1703 & 3988), whereas the Micro Pad hardware and QMK firmware only support **4 layers** (`BASE`, `MEDIA`, `NUMPAD`, `FN`). Layers 5–8 are silently dropped during QMK sync with a warning.
  2. **Conflated Layer State:** Uses a single `activeLayerIndex` state for both the editor's selected layer and simulation layer switching (`runSimulationAction` mutates `setActiveLayerIndex(targetLayer)` at line 2592). There is no `deviceActiveLayer` indicator.
  3. **Disconnected & Inaccurate Lighting UI:** Lines 1346–1378 and 4141–4445 implement a "Backlight / Underglow" lighting popover with 6 presets (`Off`, `Solid`, `Snake`, `Rainbow`, `Breath`, `Gradient`) and `Light`, `Speed`, `Magic`, `Color` sliders. None of this state is saved to `localStorage` or sent to the device, and "Backlight / Underglow / Snake / Gradient" do not match the single onboard WS2812 LED hardware.
  4. **Multi-Action Gesture Execution:** Clicking a key in Simulation mode calls `runSimulationAction(assignment)` without a gesture timing state machine (it always defaults to `onTap` unless a gesture is explicitly passed), so `doubleTap`, `onHold`, and `tapHold` cannot be tested or triggered from physical or virtual key presses.

### 2.6 Documentation Accuracy Audit
- `QUALITY_ASSESSMENT.md` is **outdated**: Several issues it listed as "Current State" (such as `index.html` using an inline Babel script instead of `src/main.tsx`, `shell: true` command injection in `native-executor.ts`, and `Creator Micro 2` 2-knob layout in `src/App.tsx`) have already been fixed in the codebase, while other issues remain open.
- `WINDOWS_APP_AND_FIRMWARE_GUIDE.md` accurately describes the current stock VIA WebHID workflow and its limitations (noting that Smart Actions and multi-step sequences are not written to stock VIA firmware).

---

## 3. Baseline Verification & Build Execution Results

The following verification commands were executed directly against the repository during this audit:

| Check / Command | Status | Result Details |
|---|---|---|
| `npm run lint` (`tsc --noEmit`) | **PASSED** | Zero TypeScript compilation or type errors across `src/`, `tests/`, and `native-executor.ts`. |
| `npm test` (`vitest run`) | **PASSED** | **31 test files passed, 232 tests passed** in 22.27s (unit, integration, JSDOM React & legacy embedded regression suites). |
| `npm run build` (`vite build`) | **PASSED** | Built production web bundle in 1.33s (`dist/index.html` 125.85 kB gzip, `dist/assets/index-*.js` 73.96 kB gzip, `dist/assets/vendor-*.js` 174.73 kB gzip). |
| `npm run check:bundle` | **FAILED (Exit Code 1)** | `App bundle gzip: 252.1 / 200 KiB — Application bundle gzip budget exceeded.` `scripts/check-bundle-budget.mjs` sums all `assets/*.js` (including `vendor-*.js` at 168.8 KiB + `index-*.js` at 71.3 KiB + `emojiCatalog-*.js` at 11.5 KiB = 252.1 KiB gzip) against a 200 KiB limit. **This currently breaks `.github/workflows/ci.yml` step "Enforce JavaScript Bundle Budget".** |
| `npm run audit:mem` | **PASSED** | Synthetic Node heap-delta smoke check passed (`Initial: 7.91 MB`, `Final: 8.03 MB`, `Delta: 0.12 MB < 15 MB`). |
| `npm run audit:cpp` | **SKIPPED** | `cppcheck` binary is not installed in the local container (`SKIP: Cppcheck is not installed`). |
| QMK Firmware Compile (`qmk compile`) | **NOT EXECUTABLE LOCALLY** | `qmk` CLI and `arm-none-eabi-gcc` are not installed in this container; verified via `.github/workflows/qmk-build.yml` CI definition and `tests/qmkKeyboardDefinition.test.ts`. |
| Windows Packaging (`npm run build:win`) | **NOT EXECUTABLE LOCALLY** | Environment is Linux; Windows NSIS packaging and PowerShell `SendInput` worker require `windows-latest` runner or Windows host. |
