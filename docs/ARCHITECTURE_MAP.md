# Micro Pad V1 — System Architecture & Storage Ownership Map

---

## 1. Current vs. Target System Architecture

### 1.1 Current Repository Architecture (As Audited)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Physical Micro Pad (RP2040-Zero)                    │
│  QMK Firmware (qmk_firmware/grid_macro_1/keymaps/via/keymap.c)          │
│  • 9 Direct Pins (GP0–GP8) + Encoder (GP9/GP10, SW GP11) + LED (GP16)   │
│  • Stock VIA Raw HID (0xFF60 / 0x61, 32-byte reports, protocol 0x000D)  │
│  • Hardcoded per-layer RGB in layer_state_set_user                      │
│  • NO custom key/encoder/active-layer telemetry packets emitted         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ USB Raw HID (WebHID directly in Renderer)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                Renderer Process (Chromium / Browser)                    │
│  • src/qmkViaBridge.ts (navigator.hid owner — both Web and Electron!)   │
│  • src/qmkProfileSync.ts (translates Basic & single-chord Shortcuts)    │
│  • src/App.tsx (UI editor, activeLayerIndex, Simulation click trigger)  │
│  • src/actionExecution.ts (dispatches Simulation clicks to IPC/HTTP)    │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Electron IPC (window.electronAPI)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   Electron Main Process (electron/main.cjs)             │
│  • Grants WebHID device permissions to Renderer                         │
│  • electron/desktopExecution.cjs (PowerShell SendInput worker, Cmd/App) │
│  • electron/installedApplications.cjs (Start Menu .lnk/.exe discovery)  │
│  • electron/uf2Validator.cjs (RP2040 UF2 image validation & copy)       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Target Architecture (Agreed Master Specification)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Physical Micro Pad (RP2040-Zero)                    │
│  QMK Firmware (Sole Authority for Physical Active Layer & On-Device IO) │
│  • Basic & Single-Chord Shortcuts executed directly via USB HID KBD/CON │
│  • Physical Layer State (0: BASE, 1: MEDIA, 2: NUMPAD, 3: FN)           │
│  • Layer-Following WS2812 RGB (GP16) with EEPROM-persisted layer colors │
│  • Raw HID Extension:                                                   │
│    - Reports confirmed deviceActiveLayer on query & layer transition    │
│    - Emits sequenced key/encoder down/up events for Smart/Multi-Actions │
│    - Accepts per-layer RGB config (volatile preview vs EEPROM commit)   │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │ (Packaged Electron App)           │ (Browser-Only Mode)
                   ▼                                   ▼
┌──────────────────────────────────────┐   ┌──────────────────────────────┐
│ Electron Main Process / HID Agent    │   │ Browser WebHID Bridge        │
│ (Sole Physical HID Owner in Desktop) │   │ (src/qmkViaBridge.ts)        │
│ • Owns USB Raw HID connection        │   │ • Direct WebHID for browser  │
│ • Mirrors confirmed deviceActiveLayer│   │   configuration when not     │
│ • Runs Multi-Action gesture timers & │   │   running inside Electron    │
│   Smart Action executor in background│   └──────────────┬───────────────┘
│ • Reconciles/releases held keys on   │                  │
│   disconnect or layer switch         │                  │
└──────────────────┬───────────────────┘                  │
                   │ Electron IPC                         │
                   ▼                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      React Configurator UI (src/App.tsx)                │
│  • Displays confirmed `deviceActiveLayer` (Read-Only Hardware Status)   │
│  • Edits `editorSelectedLayer` (0..3: BASE, MEDIA, NUMPAD, FN)          │
│  • Never opens competing WebHID when running inside Electron            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Data Flows

### 2.1 Device Connection & Reconnection Flow
1. **Detection:** HID transport detects `VID 0xFEED`, `PID 0x6001` on usage page `0xFF60`, usage `0x61`.
2. **Protocol Handshake:** Sends VIA `GET_PROTOCOL_VERSION` (`0x01`) and verifies response (`>= 0x0009`).
3. **Active Layer & RGB Query:** Queries current physical `deviceActiveLayer` (`0..3`) and stored per-layer RGB configuration from firmware so UI indicators reflect actual hardware state immediately upon connect/reconnect.
4. **Keymap Snapshot Read:** Reads all 4 layers (9 keys + 3 encoder actions per layer) via `DYNAMIC_KEYMAP_GET_BUFFER` (`0x12`) and `DYNAMIC_KEYMAP_GET_ENCODER` (`0x14`).

### 2.2 Keymap Synchronization & Pre-Sync Backup Flow
1. **Translation (`src/qmkProfileSync.ts`):** Converts the active 4-layer profile into 16-bit QMK keycodes.
2. **Pre-Write Read & Backup (`src/deviceKeymapFiles.ts`):**
   - Calls `get_config` to read the current keymap from the physical RP2040.
   - If `get_config` fails, **aborts sync immediately** (fails closed) and keeps edits local.
   - Saves the verified snapshot into `localStorage['cm2.device-keymap-backups.v1']` (retaining up to 5 rolling snapshots).
3. **Differential Write (`src/qmkViaBridge.ts`):**
   - Compares each key slot (`0..8`, `dial-tl press`) and encoder direction (`ccw`, `cw`) against the current snapshot.
   - Sends `DYNAMIC_KEYMAP_SET_KEYCODE` (`0x05`) and `DYNAMIC_KEYMAP_SET_ENCODER` (`0x15`) **only for changed slots**, minimizing RP2040 flash wear.
4. **Post-Write Readback Verification:** Reads back updated slots to confirm the device stored the expected 16-bit keycode.

### 2.3 Physical Key / Encoder Event & Smart Action Flow
1. **Device-Side Assignments (Basic & Single-Chord Shortcuts):**
   - Resolved entirely inside QMK `process_record_user` / `encoder_update_user` and sent as standard USB HID Keyboard/Consumer reports to the OS. Works with zero desktop software running.
2. **Host-Dependent Assignments (Smart Actions, Multi-Step Sequences, Multi-Action Gestures):**
   - Key/encoder slot is programmed with a custom Micro Pad trigger keycode (in QMK `SAFE_RANGE` / `USER00`–`USER63`).
   - On physical press and release, QMK sends a Raw HID event packet containing `[event_header, seq_num, active_layer, slot_id, pressed_state, checksum]`.
   - The Electron background agent validates the packet, tracks press/release state (or resolves the Multi-Action gesture state machine: Single Tap, Double Tap, Hold, Tap+Hold), and invokes `desktopExecution.cjs` (`executeNativeAction`).
   - On USB disconnect or layer change while a trigger key is held, the agent reconciles and releases any held virtual keys (`input.cancelAll()`).

---

## 3. Complete Storage Ownership Map

Every persistence mechanism in the repository has been inspected and mapped below:

| # | Storage Mechanism | Owner Component | Location / Key | What It Stores | How It Is Read / Written / Validated | Recovery & Power-Failure Behaviour |
|---|---|---|---|---|---|---|
| **1** | **QMK Dynamic Keymap EEPROM Emulation** | QMK Firmware (`qmk_firmware/grid_macro_1/`) | RP2040 onboard flash wear-leveled EEPROM (`DYNAMIC_KEYMAP_EEPROM_MAX_ADDR = 4095`) | 4 layers × (4×3 matrix of 16-bit keycodes + 1×2 encoder 16-bit keycodes) + QMK `eeconfig` header | Read/written via VIA commands `0x04`/`0x05`/`0x12`/`0x14`/`0x15`. Validated by bounds checks (`layer < 4`, `row < 4`, `col < 3`) | Backed by QMK RP2040 wear-leveled flash driver and desktop pre-sync snapshot (`cm2.device-keymap-backups.v1`). Differential writes minimize flash erase cycles. *Power-loss safety during active flash page erase is not hardware-tested.* |
| **2** | **QMK Firmware Flash (`PROGMEM`)** | QMK Firmware (`keymaps/via/keymap.c`) | RP2040 XIP Flash (`0x10000000`) | Default compiled keymap (`keymaps[4][4][3]`), default `encoder_map[4][1][2]`, and currently hardcoded layer RGB table | Written by flashing `.uf2` in `RPI-RP2` USB mass-storage bootloader mode. Validated pre-copy by `electron/uf2Validator.cjs` | Immutable at runtime; serves as factory fallback when EEPROM is reset (`EE_CLR`). RP2040 ROM bootloader (`BOOTSEL`) is hardware-ROM resident and cannot be bricked by a bad UF2 copy. |
| **3** | **Desktop Profiles & Custom Actions Store** | React Renderer (`src/App.tsx`, `src/profileFiles.ts`) | Chromium / Browser `localStorage['cm2.state.v2']` | `{ v: 1, profiles: ProfileData[], activeProfileIndex: number, customItems: CustomItemsByTab }` (up to 16 profiles) | Hydrated on startup via `readSavedProfileState()` in `src/App.tsx`; sanitized by `sanitizeKeymapState()` in `src/profileFiles.ts`; written on state change | Malformed JSON falls back safely to `INITIAL_PROFILES` without crashing. Preserved across Windows app updates/uninstalls (`deleteAppDataOnUninstall: false`). |
| **4** | **Pre-Sync Device Keymap Backup History** | React Renderer (`src/deviceKeymapFiles.ts`) | Chromium / Browser `localStorage['cm2.device-keymap-backups.v1']` | Rolling array of up to 5 `DeviceKeymapBackupFile` snapshots (`protocolVersion`, `layerCount`, `layers[].keys`, `layers[].enc`, timestamp, fw) | Written automatically by `savePreSyncSnapshot()` before every `set_config` or `restore_config` write; validated by `validateDeviceKeymapBackup()` | If reading or saving the pre-sync backup fails, `src/App.tsx` aborts the device write (fail-closed). Can be exported/restored via `deviceKeymapFileTools`. |
| **5** | **Desktop Native App Settings** | Electron Main Process (`electron/main.cjs`) | `%APPDATA%/grid-macro-1-configurator/settings.v1.json` | `{ v: 1, settings: { launchOnStartup, startMinimized, allowAnalytics, allowDeviceNotifications, allowTerminalSmartActions } }` | Read by `readStoredAppSettings()` on main process boot; written by `writeStoredAppSettings()` on IPC `set-app-setting`; coerced to strict booleans | Falls back to safe defaults (`allowTerminalSmartActions: false`) if missing or corrupted. Retained on NSIS uninstall. |
| **6** | **Renderer App Settings Mirror** | React Renderer (`src/appSettings.ts`) | Chromium / Browser `localStorage['node-studio.settings.v1']` | Browser-side mirror of `AppSettings` booleans | Read by `readAppSettings()`, written by `saveAppSettings()`, synchronized with Electron main process via `getDesktop()` / `set()` | Defaults `allowTerminalSmartActions` to `false` on parse failure. |
| **7** | **Exported Profile & Backup JSON Files** | User File System (`src/profileFiles.ts`, `src/deviceKeymapFiles.ts`) | User-chosen `.json` files on disk | `node-studio-profile` (`v: 1`) or `node-studio-device-keymap-backup` (`v: 1`) JSON documents | Validated on import by `parseProfileImport()` (rejects files > 1 MB, sanitizes strings/steps, flags imported `Cmd` actions with `requiresConsent: true`) | Imported `Cmd` Smart Actions cannot execute until the user explicitly confirms consent. |
| **8** | **Experimental CircuitPython & Arduino Stores (Deprecated/Non-Production)** | `firmware/code.py` & `firmware/arduino_firmware.ino` | CircuitPython `/keymap.json` on FAT flash; Arduino `EEPROM` (512 bytes, magic `0x47524944`) | Experimental serial/raw-HID keymaps | CircuitPython writes raw JSON without validation; Arduino writes `keymaps` array on command `0x04` (omitting `encoder_map`) | **Unsafe:** CircuitPython `SET_CONFIG` can corrupt `/keymap.json` on power loss; Arduino loses encoder bindings on reboot. Not used by production QMK/VIA flow. |
