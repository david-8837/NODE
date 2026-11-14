# Micro Pad V1 — Known Issues, Risks & Decisions Requiring Approval

---

## 1. Confirmed Bugs & Broken Checks in the Current Repository

### ISSUE-01: CI JavaScript Bundle Budget Check Fails (`npm run check:bundle`)
- **Severity:** High (Breaks `.github/workflows/ci.yml` on every push/PR)
- **Location:** `/scripts/check-bundle-budget.mjs` (lines 7, 84–86, 103–106) and `/vite.config.ts` (lines 21–32)
- **Evidence:** Running `npm run build && npm run check:bundle` fails with exit code `1`:
  `App bundle gzip: 252.1 / 200 KiB — Application bundle gzip budget exceeded.`
- **Root Cause:** `vite.config.ts` splits `node_modules` into `dist/assets/vendor-*.js` (`168.8 KiB` gzip) alongside `dist/assets/index-*.js` (`71.3 KiB` gzip) and `dist/assets/emojiCatalog-*.js` (`11.5 KiB` gzip). `scripts/check-bundle-budget.mjs` sums all files starting with `assets/` against a 200 KiB `appGzipBudgetBytes` cap.

### ISSUE-02: Physical Smart Actions and Multi-Step Sequences Do Not Execute from Hardware Keys
- **Severity:** Critical (Core Product Feature Gap)
- **Location:** `/src/qmkProfileSync.ts` (lines 222–288), `/qmk_firmware/grid_macro_1/keymaps/via/keymap.c`, `/electron/desktopExecution.cjs` (line 52)
- **Evidence:**
  1. `src/qmkProfileSync.ts` skips all `Smart Action` assignments (`t: 'none'`, keycode `0x0000`) and warns *"Smart Actions run through the desktop app and are not written to stock VIA firmware"*.
  2. Multi-step sequences (`steps.length > 1`) are also skipped (`t: 'none'`).
  3. `electron/desktopExecution.cjs` refuses to execute any action unless `simulationEnabled === true` (which is only toggled by clicking the UI "Simulation on" button and clicking virtual keys on screen).
  4. QMK `keymap.c` does not emit Raw HID packets when a physical key assigned to a host action is pressed.

### ISSUE-03: Multi-Action Only Supports `onTap`; `doubleTap`, `onHold`, and `tapHold` Are Non-Functional
- **Severity:** High (Core Product Feature Gap)
- **Location:** `/src/qmkProfileSync.ts` (lines 274–287), `/src/actionExecution.ts` (lines 171–175), `/src/App.tsx` (lines 2581–2600)
- **Evidence:**
  - `src/qmkProfileSync.ts` only converts `gestures.onTap` to a VIA keycode and drops `doubleTap`, `onHold`, and `tapHold`.
  - Neither QMK firmware nor the desktop app implements a gesture timing state machine (tapping window, hold threshold, preventing premature `onTap` before `doubleTap` resolves).

### ISSUE-04: Desktop Layer Editor Allows 8 Layers While Hardware Supports 4 Layers, and Conflates `deviceActiveLayer` with `editorSelectedLayer`
- **Severity:** High (Architectural Rule Violation)
- **Location:** `/src/App.tsx` (lines 1703, 2592, 3948–3988), `/src/profileFiles.ts` (line 9), `/src/profileValidator.ts` (line 7)
- **Evidence:**
  - `src/App.tsx` allows creating up to 8 layers (`currentProfile.layers.length < 8`), whereas QMK defines 4 layers (`_BASE`, `_MEDIA`, `_NUMPAD`, `_FN` with `DYNAMIC_KEYMAP_LAYER_COUNT 4`). Layers 5–8 cannot be synced to the hardware.
  - There is only a single `activeLayerIndex` variable in `src/App.tsx`. The UI has no indicator for the physical device's confirmed active layer (`deviceActiveLayer`), and QMK does not report `layer_state` changes to the desktop app.

### ISSUE-05: Electron App Uses Renderer WebHID Instead of a Main-Process HID Background Agent
- **Severity:** High (Architectural Rule Violation)
- **Location:** `/electron/main.cjs` (lines 461–529), `/src/qmkViaBridge.ts` (lines 483–554)
- **Evidence:** `electron/main.cjs` configures `select-hid-device` permissions for Chromium's `navigator.hid` in the renderer rather than owning the physical HID connection in the Electron main process. If the renderer reloads or closes, HID ownership is lost.

### ISSUE-06: RGB Lighting UI Is Disconnected from Hardware and Misrepresents the Single Onboard WS2812 LED
- **Severity:** Medium
- **Location:** `/src/App.tsx` (lines 1346–1378, 4141–4445) and `/qmk_firmware/grid_macro_1/keymaps/via/keymap.c` (lines 75–97)
- **Evidence:**
  - `src/App.tsx` displays "Backlight / Underglow" tabs and "Snake / Gradient" presets that do not exist on the 1-LED (`GP16`) RP2040-Zero hardware.
  - Changes in the lighting popover only mutate local React state (`lightingConfig`), are never saved to `localStorage`, and are never sent over HID.
  - QMK `keymap.c` hardcodes 4 static RGB colors in `layer_state_set_user`.

### ISSUE-07: Connect Flow Immediately Overwrites Physical Device Keymap & Manual Backup Restore Controls Are Hidden
- **Severity:** Medium (Data Safety Risk)
- **Location:** `/src/App.tsx` (lines 1467–1557)
- **Evidence:**
  - When a user connects a physical Grid Macro 1 via WebHID, `src/App.tsx` saves a pre-sync snapshot to `localStorage['cm2.device-keymap-backups.v1']` and then **immediately overwrites** the device's keymap with `currentProfile` (`set_config`).
  - Although `src/deviceKeymapFiles.ts` implements `downloadLatestBackup()` and `restoreFromFile()`, those buttons were removed from the Settings tab in `src/App.tsx`, leaving the user no UI button to restore the automatic pre-sync backup!

### ISSUE-08: Bugs in Alternative `/firmware/` Implementations (CircuitPython & Arduino)
- **Severity:** Low (If deprecated) / High (If used)
- **Location:** `/firmware/boot.py`, `/firmware/code.py`, `/firmware/arduino_firmware.ino`
- **Evidence:**
  - `/firmware/boot.py` lines 16–22 call `storage.remount("/", readonly=False)` in **both** `if` and `else` branches.
  - `/firmware/code.py` `execute_binding()` calls `kbd.send(*keycodes)` on key press (immediate tap+release, breaking key hold) and lacks switch debounce.
  - `/firmware/arduino_firmware.ino` `fire_keycode()` calls `delay(10)` and `keyboardRelease(1)` on key press (breaking key hold), and `SAVE_FLASH` (`0x04`) omits `encoder_map` from EEPROM.

---

## 2. Unverified Hardware & Platform Risks

1. **Physical Hardware Verification Pending:**
   - No physical Waveshare RP2040-Zero board is attached to this cloud container environment. Switch bounce characteristics, EC11 encoder detent polarity (`ENCODER_DIRECTION_FLIP`), and WS2812 `GP16` PIO timing are verified by configuration inspection and unit tests, not physical electrical probing.
2. **Windows Native `SendInput` & Start Menu Shortcut Discovery:**
   - The PowerShell C# `SendInput` worker (`electron/desktopExecution.cjs`) and Start Menu `.lnk` scanner (`electron/installedApplications.cjs`) are unit-tested with mocked processes/filesystems on Linux and smoke-tested in `.github/workflows/windows-installer.yml`, but cannot execute live Windows Win32 API calls inside a Linux container.
3. **RP2040 Flash Wear-Leveling Under Power Loss:**
   - QMK uses wear-leveled flash emulation on the RP2040 for dynamic keymaps (`4095` bytes). Power-failure safety during an active flash sector erase has not been physically fault-injection tested.

---

## 3. Architectural Decisions Requiring Owner Approval Before Phase 1

Please review and confirm your preferences on the following decisions before we begin Phase 1 implementation:

1. **Decision 1 — Deprecation/Archival of Experimental `/firmware/` (CircuitPython & Arduino):**
   - **Recommendation:** Keep **QMK (`qmk_firmware/grid_macro_1/`)** as the single supported production firmware for Micro Pad V1, and move `/firmware/boot.py`, `/firmware/code.py`, `/firmware/arduino_firmware.ino`, and `/src/serialManager.ts` into a clearly marked `legacy/experimental` status (or archive directory) so there is only one authoritative firmware and protocol.
   - *Do you approve making QMK the sole supported firmware for Micro Pad V1?*

2. **Decision 2 — Enforcing Exactly 4 Layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`) in the Desktop Editor:**
   - **Recommendation:** Cap profile layers in the desktop UI to the **4 hardware layers** (`BASE`, `MEDIA`, `NUMPAD`, `FN`) instead of allowing 1–8 variable layers, so every layer in the desktop configurator maps 1:1 to a real hardware layer on the RP2040.
   - *Do you approve fixing the desktop editor to the 4 hardware layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`)?*

3. **Decision 3 — Multi-Action Gesture Execution Location (Firmware vs. Host Agent vs. Hybrid):**
   - **Recommendation (Hybrid):**
     - When a Multi-Action key uses only device-compatible actions (Basic keys / single-chord Shortcuts / Layer switches), or when running with the Electron background agent for Smart Actions, use sequenced Raw HID key-down/key-up events (`MP_TRIG_*`) processed by a deterministic gesture timing state machine (default `200 ms` tapping term, configurable) in the background agent, **or** QMK Tap Dance in firmware for standalone keys.
     - *Do you prefer Multi-Action gestures (`onTap`, `doubleTap`, `onHold`, `tapHold`) to be resolved in QMK firmware (standalone for keyboard/shortcut actions, emitting resolved gesture IDs to the host for Smart Actions), or resolved in the Electron background agent from raw key-down/key-up events?*

4. **Decision 4 — Connect Synchronization Behaviour (Auto-Push Local Profile vs. Read-First / Prompt):**
   - **Recommendation:** Currently, connecting the device backs up the device keymap to `localStorage` and immediately overwrites the device with the desktop's active profile. We recommend re-exposing the **Download Backup / Restore from Backup** buttons in Settings immediately in Phase 1, and optionally reading the device's current keymap/active layer on connect without overwriting unless the user edits or clicks Sync.
   - *Should connecting the device keep automatic sync-on-edit (with visible backup/restore controls in Settings), or require an explicit "Sync to Device" action on initial connect?*

5. **Decision 5 — RGB Lighting UI Scope for the Single Onboard WS2812 LED (`GP16`):**
   - **Recommendation:** Replace the fake "Backlight / Underglow" and "Snake / Gradient" controls in `src/App.tsx` with a hardware-accurate **Onboard RGB Indicator** panel supporting: Enable/Disable toggle, Brightness slider, Mode (`Solid Layer Color`, `Breathing`, `Rainbow Cycle`), and independent RGB color pickers for each of the 4 layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`).
   - *Do you approve replacing the placeholder Backlight/Underglow popover with the 1-LED per-layer RGB indicator panel?*
