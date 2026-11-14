# Micro Pad V1 — Master Product & System Specification

**Document Status:** Baseline Master Specification (Phase 0 Audit)  
**Product Name:** Micro Pad V1 / NØDE Grid Macro 1 Studio  
**Target MCU:** Waveshare RP2040-Zero  

---

## 1. Product Vision & Priorities

Micro Pad is a compact, wired, programmable macro pad designed to operate as a commercial-grade control surface with both standalone on-device firmware capabilities and host-assisted desktop automation.

### Physical Controls & Indicators
- **Nine programmable mechanical keys** arranged in a 3×3 grid (`r1c1`–`r3c3`).
- **One EC11 rotary encoder** with clockwise (`CW`), counter-clockwise (`CCW`), and push-button (`PRESS`) inputs (`dial-tl`).
- **One onboard WS2812 RGB LED** providing layer-aware visual feedback.
- **Four independently configurable device layers** (`BASE`, `MEDIA`, `NUMPAD`, `FN`).
- **Desktop Configuration Studio & Background Agent** (React + Electron) for configuring profiles, syncing keymaps, managing presets/macros, and executing host-dependent Smart Actions.

### Engineering Priorities (Ordered)
1. **Reliability** — Deterministic state handling, zero lost or phantom inputs, safe flash/EEPROM operations.
2. **Responsiveness** — Consistent low-latency scanning (1000 Hz USB polling, 3 ms eager per-key debounce) without blocking loops.
3. **Correct Key Press/Release Behaviour** — Proper key-down sustain on hold, OS auto-repeat compatibility, and guaranteed key-up/modifier-release on physical release, layer switch, or disconnect.
4. **Reliable Firmware & Desktop Communication** — Single physical HID owner per runtime environment, framed commands/events, sequence tracking, and explicit error recovery.
5. **Easy Configuration & Polished UX** — Clear separation between physical device state and editor state; immediate visual feedback.
6. **Maintainable Architecture** — Single source of truth for hardware layout, keycode translation, and storage schemas.

---

## 2. Hardware Baseline & GPIO Allocation

**Strict Rule:** Hardware pin assignments are fixed to the physical PCB/wiring baseline and must never be modified without explicit hardware owner approval.

| Physical Control / Peripheral | Logical Slot ID | QMK Matrix Coordinate | RP2040 GPIO | Electrical Configuration |
|---|---|---|---|---|
| Key 1 (Top-Left) | `r1c1` | Row 0, Col 0 (`[0,0]`) | `GP0` | Direct pin to GND, internal pull-up |
| Key 2 (Top-Center) | `r1c2` | Row 0, Col 1 (`[0,1]`) | `GP1` | Direct pin to GND, internal pull-up |
| Key 3 (Top-Right) | `r1c3` | Row 0, Col 2 (`[0,2]`) | `GP2` | Direct pin to GND, internal pull-up |
| Key 4 (Mid-Left) | `r2c1` | Row 1, Col 0 (`[1,0]`) | `GP3` | Direct pin to GND, internal pull-up |
| Key 5 (Center) | `r2c2` | Row 1, Col 1 (`[1,1]`) | `GP4` | Direct pin to GND, internal pull-up |
| Key 6 (Mid-Right) | `r2c3` | Row 1, Col 2 (`[1,2]`) | `GP5` | Direct pin to GND, internal pull-up |
| Key 7 (Bot-Left) | `r3c1` | Row 2, Col 0 (`[2,0]`) | `GP6` | Direct pin to GND, internal pull-up |
| Key 8 (Bot-Center) | `r3c2` | Row 2, Col 1 (`[2,1]`) | `GP7` | Direct pin to GND, internal pull-up |
| Key 9 (Bot-Right) | `r3c3` | Row 2, Col 2 (`[2,2]`) | `GP8` | Direct pin to GND, internal pull-up |
| Rotary Encoder Channel A | `dial-tl` (CW/CCW) | Encoder 0 Pin A | `GP9` | Quadrature input, internal pull-up |
| Rotary Encoder Channel B | `dial-tl` (CW/CCW) | Encoder 0 Pin B | `GP10` | Quadrature input, internal pull-up |
| Rotary Encoder Push Switch | `dial-tl` (`press`) | Row 3, Col 0 (`[3,0]`) | `GP11` | Direct pin to GND, internal pull-up |
| Unused Matrix Padding | — | `[3,1]`, `[3,2]` | `NO_PIN` | Unpopulated virtual matrix slots |
| Onboard RGB Status LED | — | WS2812 (`DI`) | `GP16` | PIO WS2812 driver, 1 LED (`RGBLIGHT_LED_COUNT 1`) |

### USB & Scanning Parameters
- **USB Identifiers:** Vendor ID `0xFEED`, Product ID `0x6001`, Device Version `0.0.1` (`0x0001`).
- **Polling Interval:** `1 ms` (`USB_POLLING_INTERVAL_MS 1`).
- **Debounce Strategy:** `3 ms` (`DEBOUNCE 3`) using `sym_eager_pr` (symmetric eager per-key press and release).
- **Encoder Resolution:** `4` pulses per detent (`encoder.rotary[0].resolution = 4`) with `ENCODER_DIRECTION_FLIP`.

---

## 3. Core Key Assignment System

Every programmable key slot across all four layers must support four assignment modes:

### 3.1 Mode A — BASIC
One physical key triggers one standard HID keyboard, keypad, media, or layer keycode.
- **Examples:** `A`–`Z`, `0`–`9`, `Enter`, `Space`, `Escape`, `F1`–`F12`, `Play/Pause`, `Mute`, `MO(layer)`, `TO(layer)`.
- **Behavioural Requirements:**
  - Physical key-down sends USB HID key-down immediately.
  - Physical hold maintains the USB HID key-down state so the host OS handles native typematic repeat.
  - Physical key-up sends USB HID key-up immediately.
  - Zero stuck keys and zero duplicate key-down reports.
  - **Execution Authority:** 100% standalone on-device (QMK firmware) when synced to the device.

### 3.2 Mode B — ACTIONS (Shortcuts & Key Sequences)
Assign modifier combinations (`Ctrl+C`, `Ctrl+Shift+S`, `Alt+Tab`, `Win+X`) or ordered multi-step keystroke/delay sequences.
- **Behavioural Requirements:**
  - Deterministic modifier press-before-key and release-after-key ordering.
  - Guaranteed modifier cleanup on release, cancel, or disconnect (no stuck `Ctrl`, `Shift`, `Alt`, or `Win`).
  - **Execution Authority:**
    - **Single-chord modifier combinations** (e.g., `Ctrl+C`, `Ctrl+Shift+S`, `Win+E` using uniform left or right modifiers + 1 basic key): Executed directly by QMK firmware via 16-bit `QK_MODS` keycodes (`0x0100`–`0x1FFF`), working without the desktop app.
    - **Multi-step timed sequences, mixed left+right modifier chords, or text macros** that cannot fit in a single 16-bit VIA keycode: Executed either via QMK dynamic macros (if mapped to `QK_MACRO`) or via the host background agent triggered by a dedicated Raw HID trigger keycode.

### 3.3 Mode C — MULTI-ACTION (4 Gesture Triggers per Key)
A single physical key supports four independent interaction gestures, each assignable to its own action:
1. **Single Tap (`onTap`)**
2. **Double Tap (`doubleTap`)**
3. **Hold (`onHold`)**
4. **Tap and Hold (`tapHold`)**
- **Behavioural Requirements:**
  - Must not fire `onTap` prematurely while waiting to resolve whether a second tap (`doubleTap` / `tapHold`) occurs within the tapping term (`TAPPING_TERM`, default 200 ms, configurable).
  - If only `onTap` is configured on a key (no `doubleTap` or `tapHold`), single tap may resolve without unnecessary double-tap delay, or follow deterministic gesture state machine rules.
  - `onHold` triggers when a key is pressed and held past the hold threshold without an intervening release.
  - `tapHold` triggers when a key is tapped once and then pressed and held within the tapping window.
  - Proper press/release ordering and zero duplicate or missed actions.

### 3.4 Mode D — SMART ACTIONS (Host-Dependent Execution)
Host-dependent actions executed by the desktop application / Electron background agent:
1. **CMD:** Controlled command execution (`execFile` without shell interpolation, gated by explicit user opt-in `allowTerminalSmartActions`, blocked dangerous binaries, and explicit user consent for imported commands).
2. **Text:** Types configured Unicode text strings (`SendInput` / `KEYEVENTF_UNICODE` on Windows).
3. **Link (`Web`):** Validates `http:` / `https:` URLs and opens them in the default browser (`shell.openExternal`).
4. **Apps (`App`):** Launches user-selected installed applications (`.lnk` shortcuts or validated `.exe` paths).
- **Behavioural Requirements:**
  - Triggered reliably by physical key presses on the Micro Pad when the desktop app / background agent is connected, as well as via optional UI Simulation mode.
  - Input validation, timeout bounds, execution status feedback, and deduplication against key-bounce/repeat.
  - Explicit UI indication when a key uses a host-dependent Smart Action (requires desktop agent running).

---

## 4. Four Device Layers & Layer State Authority

### 4.1 Hardware Layer Definitions
The Micro Pad has **4 hardware layers**:
1. **Layer 0:** `BASE` (`_BASE`)
2. **Layer 1:** `MEDIA` (`_MEDIA`)
3. **Layer 2:** `NUMPAD` (`_NUMPAD`)
4. **Layer 3:** `FN` (`_FN`)

Each layer configures 9 mechanical keys (`r1c1`–`r3c3`) and 3 encoder actions (`cw`, `ccw`, `press`).

### 4.2 Sole Authority Rule
**QMK firmware on the RP2040 is the sole authority for the physical device's active layer.**
- Firmware controls physical layer switching (`MO`, `TG`, `TO`, `TT`, `DF`, or encoder/key layer cycle), device-side keycode resolution, and layer-dependent onboard WS2812 RGB lighting.
- Physical layer switching works completely standalone when the desktop app is closed.

### 4.3 Strict Separation of Desktop Layer Concepts
The desktop application must maintain two separate, non-competing states:
1. **`deviceActiveLayer` (`0..3 | null`):** The actual layer currently active on the physical Micro Pad, reported by QMK firmware over HID upon connect, reconnect, and physical layer transitions. Read-only in the UI indicator.
2. **`editorSelectedLayer` (`0..3`):** The layer currently selected by the user for editing inside the desktop configurator UI.
- **Invariants:**
  - Clicking a layer tab in the desktop editor changes `editorSelectedLayer` only; it must **never** silently switch the physical device's active layer.
  - Switching layers on the physical Micro Pad updates `deviceActiveLayer` in the UI indicator; it must **never** forcibly overwrite `editorSelectedLayer` and disrupt an in-progress edit (unless the user explicitly enables a "Follow physical layer" toggle).
  - Reconnecting the device must query the actual `deviceActiveLayer` from firmware rather than guessing `0`.

---

## 5. Onboard WS2812 RGB Lighting Architecture

- **Hardware:** Single onboard WS2812 RGB LED on `GP16`.
- **Capabilities:**
  - Independent RGB color per layer (`BASE`, `MEDIA`, `NUMPAD`, `FN`).
  - Global lighting enable/disable and brightness control.
  - Supported modes appropriate for a 1-LED indicator (Off, Solid per-layer color, Breath, Rainbow/Cycle) — avoiding misleading multi-LED matrix presets (e.g., "Snake" or "Underglow vs Backlight" split) that do not match the single onboard WS2812 hardware.
  - **Device-Side Layer-Following:** Firmware automatically updates the LED color whenever `layer_state` changes, even without the desktop app open.
  - **Flash Wear Safety:** Live color previews from the desktop UI update volatile RAM (`rgblight_setrgb_at` / `noeeprom`); persistent writes to RP2040 flash/EEPROM occur only on explicit save/sync commit.

---

## 6. HID & Communication Architecture

### 6.1 Packaged Electron Application (`window.electronAPI?.isElectron === true`)
- **Electron Main Process / Background Agent is the sole physical HID owner.**
- The renderer (`src/App.tsx`) communicates with the background agent exclusively via Electron IPC (`contextBridge`).
- **The renderer must never open a competing WebHID connection when running inside Electron.**
- The background agent remains active when the window is minimized to the system tray so physical Smart Actions, Multi-Actions, and host sequences continue to work seamlessly.

### 6.2 Browser-Only Environment (`!window.electronAPI?.isElectron`)
- Direct **WebHID** (`src/qmkViaBridge.ts`) remains available as the standalone communication transport for browser-only keymap configuration and VIA sync.

### 6.3 Protocol Coexistence
- **VIA Protocol (`0x01`–`0x15`):** Preserved for standard dynamic keymap and encoder map reads/writes (`DYNAMIC_KEYMAP_GET_BUFFER`, `DYNAMIC_KEYMAP_SET_KEYCODE`, `DYNAMIC_KEYMAP_SET_ENCODER`) and compatibility with stock VIA tools.
- **Micro Pad Custom HID Extension (via Raw HID / VIA Custom Channel):**
  - Reports confirmed `deviceActiveLayer` on query and on physical layer change.
  - Streams physical key press/release and encoder events (with sequence numbers) for host-executed Smart Actions and Multi-Actions.
  - Synchronizes per-layer RGB lighting configuration safely.
  - Reconciles held keys on disconnect or layer change to guarantee zero stuck host inputs.

---

## 7. Storage & Data Safety Rules

1. **Pre-Write Backup:** Before any destructive keymap or configuration write to the physical device, read the current device snapshot and store a verified local backup (`cm2.device-keymap-backups.v1`). Fail closed if the backup read fails.
2. **Input Validation:** All profile imports, keymap restores, UF2 firmware images, and IPC payloads must pass strict schema and bounds validation before application.
3. **Flash Wear Protection:** Debounce configuration syncs and avoid writing unchanged keycodes or volatile preview states to RP2040 flash-backed EEPROM.
4. **Explicit Ownership:** Every persisted artifact (QMK EEPROM, desktop `localStorage` profiles, Electron `settings.v1.json`, exported `.json` files) has a single documented owner and schema version.
