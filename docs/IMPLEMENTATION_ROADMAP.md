# Micro Pad V1 — Phased Implementation Roadmap

**Important Governance Rule:**  
Each phase below is scoped to a focused, verifiable set of changes with explicit acceptance criteria. No phase may begin until the preceding phase's build and test gates pass and any required architectural decisions are approved by the project owner.

---

## Phase 0 — Repository Audit, Documentation & CI Baseline (COMPLETED)

- **Scope:**
  - Inspect all firmware, Electron, React, protocol, storage, and test files.
  - Run baseline lint, unit/integration test suites, production build, bundle budget check, and static/memory audits.
  - Author the 6 foundational engineering documents in `/docs/`.
- **Deliverables:**
  - `/docs/MICRO_PAD_MASTER_SPEC.md`
  - `/docs/REPOSITORY_AUDIT.md`
  - `/docs/FEATURE_INVENTORY.md`
  - `/docs/ARCHITECTURE_MAP.md`
  - `/docs/IMPLEMENTATION_ROADMAP.md`
  - `/docs/KNOWN_ISSUES.md`
- **Status:** Complete. Waiting for owner review and approval to proceed to Phase 1.

---

## Phase 1 — CI Bundle Gate Fix, Firmware Authority Consolidation & Layer Model Alignment

### Objectives
1. Fix the failing `npm run check:bundle` CI gate (`252.1 / 200 KiB` gzip).
2. Establish `qmk_firmware/grid_macro_1/` as the single authoritative firmware and isolate/deprecate experimental `/firmware/` files so there is zero ambiguity.
3. Align the desktop layer model to the **4 hardware layers** (`BASE`, `MEDIA`, `NUMPAD`, `FN`) and strictly separate `deviceActiveLayer` (confirmed hardware state) from `editorSelectedLayer` (UI editing state).

### Key Tasks
- **Bundle Budget Fix (`scripts/check-bundle-budget.mjs` / `vite.config.ts`):**
  - Separate application code budget (`index-*.js`, `emojiCatalog-*.js`) from third-party `vendor-*.js` or lazy-load heavy modal/preset chunks so `npm run check:bundle` passes cleanly in CI.
- **Layer Model & Authority (`src/deviceLayout.ts`, `src/profileFiles.ts`, `src/profileValidator.ts`, `src/App.tsx`):**
  - Define canonical 4-layer constants: `BASE` (0), `MEDIA` (1), `NUMPAD` (2), `FN` (3).
  - Cap profile layer creation in the editor to 4 layers (`MAX_HARDWARE_LAYERS = 4`) and normalize legacy profiles with >4 layers safely.
  - Split React state into `editorSelectedLayer` (used by the canvas/drawer editor) and `deviceActiveLayer` (`number | null`, updated only by confirmed device reports or simulation indicator).
  - Ensure clicking a layer pill in the editor never mutates `deviceActiveLayer`, and ensure default QMK keymaps provide a physical layer-navigation path across all 4 layers.
- **Backup & Restore Controls in Settings (`src/App.tsx`):**
  - Re-expose the tested `Save backup`, `Download backup`, and `Restore from file` controls from `src/deviceKeymapFiles.ts` in the Settings screen so users can manually back up and restore device keymaps.

### Risks & Trade-Offs
- Existing tests in `tests/reactAppFileOperations.test.tsx` (which currently assert manual backup buttons are hidden) and `tests/embeddedApp.test.ts` will need targeted updates to match the approved UI behavior.

### Acceptance Criteria
- `npm run lint`, `npm test`, `npm run build`, and `npm run check:bundle` all exit with code `0`.
- Selecting a layer in the editor changes `editorSelectedLayer` without altering `deviceActiveLayer`.
- Profiles enforce the 4 hardware layers (`BASE`, `MEDIA`, `NUMPAD`, `FN`).

---

## Phase 2 — QMK Custom Raw HID Extension & Electron Background HID Agent

### Objectives
1. Extend QMK `qmk_firmware/grid_macro_1/keymaps/via/keymap.c` to report real-time `deviceActiveLayer` and physical key/encoder trigger events while preserving 100% stock VIA compatibility.
2. Implement the **Electron Background HID Agent** in `electron/` as the sole physical HID owner in the packaged desktop app, while keeping `src/qmkViaBridge.ts` (WebHID) for browser-only mode.

### Key Tasks
- **QMK Firmware Custom HID Channel (`qmk_firmware/grid_macro_1/keymaps/via/keymap.c`):**
  - Implement `via_command_kb` / `raw_hid_receive_kb` handling a dedicated Micro Pad command prefix (e.g., `0xFD` custom channel or VIA custom menu channel `id_custom_set_value` / `id_custom_get_value`) for:
    - Querying current `layer_state` (`GET_ACTIVE_LAYER`).
    - Emitting unsolicited `LAYER_STATE_EVT` whenever `layer_state_set_user` transitions layers.
    - Defining custom trigger keycodes (`MP_TRIG_00`..`MP_TRIG_47` in `SAFE_RANGE` / `QK_KB_0`+) for slots configured with host-side Smart Actions or Multi-Actions, emitting sequenced `[header, seq, layer, slot_id, is_pressed, checksum]` packets on physical press and release.
- **Electron Main-Process HID Owner (`electron/`):**
  - Add a unified HID manager in Electron that owns the physical device connection, mirrors `deviceActiveLayer`, processes incoming trigger packets even when the window is minimized, and exposes `getStatus`, `connect`, `disconnect`, `request`, `onStatus`, and `onEvent` over Electron IPC (`electron/preload.cjs`).
  - Update `src/qmkViaBridge.ts` so that when `window.electronAPI?.isElectron` is true, `window.macropad` delegates all calls to Electron IPC and **never** opens a competing `navigator.hid` connection.
  - Implement disconnect / layer-change key-release reconciliation (`cancelAll` on held keys).

### Dependencies
- Requires Phase 1 (`deviceActiveLayer` vs. `editorSelectedLayer` separation).

### Acceptance Criteria
- In Electron mode, renderer never calls `navigator.hid`; all HID traffic flows through Electron IPC.
- In browser mode, `navigator.hid` continues to work directly.
- Connecting or reconnecting the device queries and displays the actual physical `deviceActiveLayer` from firmware.
- Physical layer changes on the device update `deviceActiveLayer` in the desktop UI without changing `editorSelectedLayer`.

---

## Phase 3 — Basic & Actions (Shortcuts & Multi-Step Sequences) End-to-End

### Objectives
Verify and complete **Mode A (Basic)** and **Mode B (Actions)** across both device-side execution and host-assisted execution.

### Key Tasks
- **Device-Side Basic & Single-Chord Shortcuts:**
  - Verify all alphanumeric, function, navigation, media, numpad, and `QK_MODS` (`Ctrl`, `Shift`, `Alt`, `Win`) combinations in `src/qmkProfileSync.ts`.
  - Add post-write readback verification in `set_config` so any slot write discrepancy is detected and reported.
- **Host-Assisted Multi-Step Sequences & Mixed Modifiers:**
  - When an Action contains multiple steps, delays, text typing, or mixed left/right modifiers that cannot fit into a single 16-bit QMK keycode, automatically assign its corresponding `MP_TRIG_*` keycode during QMK sync (`src/qmkProfileSync.ts`) instead of leaving the physical key blank (`KC_NO`).
  - Route incoming physical `MP_TRIG_*` press/release events in the Electron HID agent directly to `desktopExecution.cjs` without requiring UI "Simulation mode" to be toggled on.

### Dependencies
- Requires Phase 2 (QMK trigger keycodes + Electron HID event listener).

### Acceptance Criteria
- Single keys and single-chord shortcuts execute standalone on the device with proper hold/repeat and release.
- Multi-step sequences synced to a physical key execute reliably via the Electron agent when the physical key is pressed.
- Disconnecting the device or releasing a key mid-sequence leaves zero stuck modifiers (`Ctrl`, `Shift`, `Alt`, `Win`).

---

## Phase 4 — Multi-Action Gesture Engine (Single Tap, Double Tap, Hold, Tap+Hold)

### Objectives
Complete **Mode C (Multi-Action)** so all four gestures (`onTap`, `doubleTap`, `onHold`, `tapHold`) work deterministically from physical key presses and in UI simulation.

### Key Tasks
- **Gesture State Machine (`src/multiActionGestureEngine.ts` + Electron Agent integration):**
  - Implement a deterministic, unit-tested finite state machine per key slot driven by physical `KEY_DOWN` and `KEY_UP` timestamps:
    - **Single Tap (`onTap`):** Press < `holdThresholdMs` (default 200 ms), followed by no second press within `doubleTapWindowMs` (default 200 ms). (Optimization: if neither `doubleTap` nor `tapHold` is configured on that slot, `onTap` fires immediately on release).
    - **Double Tap (`doubleTap`):** Two presses and releases within `doubleTapWindowMs`.
    - **Hold (`onHold`):** First press held `>= holdThresholdMs` without release.
    - **Tap and Hold (`tapHold`):** First tap released `< holdThresholdMs`, followed by second press within `doubleTapWindowMs` held `>= holdThresholdMs`.
  - Ensure `onTap` never fires prematurely before `doubleTapWindowMs` expires when `doubleTap` or `tapHold` is assigned.
  - Wire `src/qmkProfileSync.ts` to assign `MP_TRIG_*` when any of `doubleTap`, `onHold`, or `tapHold` (or host-dependent `onTap`) is configured; keep pure single-tap basic/shortcut assignments on native QMK keycodes when no other gesture is used.

### Dependencies
- Requires Phase 2 & Phase 3.

### Acceptance Criteria
- Unit tests cover all 4 gesture transitions, edge timings, bounce rejection, and release cleanup.
- No premature single-tap execution when double-tap or tap-and-hold is configured.
- Both device-side and host-side actions can be assigned to any of the 4 gestures.

---

## Phase 5 — Smart Actions (CMD, Text, Link, Apps) Physical Execution & Feedback

### Objectives
Complete **Mode D (Smart Actions)** so physical Micro Pad keys and encoder actions reliably trigger `CMD`, `Text`, `Web` (Link), and `App` actions through the Electron background agent with clear validation, deduplication, and status feedback.

### Key Tasks
- **Decouple Physical Smart Action Execution from UI Simulation Mode:**
  - In `electron/desktopExecution.cjs`, separate **Physical Device Execution** (always active for connected Micro Pad trigger events) from **UI Canvas Click Simulation** (gated by the `Simulation on` toggle).
- **Deduplication & Cooldown Guard:**
  - Prevent duplicate command/app/URL launches if duplicate HID packets arrive or if a key is held down.
- **Execution Feedback & Error Reporting:**
  - Emit structured execution results (`started`, `succeeded`, `failed`, `blocked_by_settings`, `consent_required`) from the Electron main process back to the renderer toast/status system and optional desktop notifications.
- **System Tray Background Persistence (`electron/main.cjs`):**
  - Add system tray icon and minimize-to-tray support so Smart Actions continue executing when the configurator window is closed.

### Dependencies
- Requires Phase 2 & Phase 3.

### Acceptance Criteria
- Pressing a physical key or encoder assigned to `CMD`, `Text`, `Web`, or `App` executes the action safely without needing "Simulation on".
- Terminal commands remain blocked unless `allowTerminalSmartActions` is enabled in Settings, and imported commands require explicit user confirmation.
- Invalid URLs, missing executables, or timed-out commands report clear error messages without crashing the agent.

---

## Phase 6 — Onboard WS2812 RGB Lighting System (Firmware + Desktop Sync)

### Objectives
Replace the disconnected placeholder lighting UI with a real, hardware-accurate **1-LED WS2812 Per-Layer RGB Lighting System** synchronized with the RP2040-Zero (`GP16`).

### Key Tasks
- **QMK Firmware RGB Storage & Custom HID Commands (`qmk_firmware/grid_macro_1/keymaps/via/keymap.c`):**
  - Store a compact persistent lighting configuration block in QMK EEPROM (enable flag, global brightness capped by `RGBLIGHT_LIMIT_VAL 180`, mode: `Off` / `Solid Layer Color` / `Breath` / `Rainbow`, and 4 `[R, G, B]` tuples for `BASE`, `MEDIA`, `NUMPAD`, `FN` with magic/checksum header).
  - Add HID commands for:
    - `RGB_GET_CONFIG`: Reads current lighting state and 4 layer colors from firmware.
    - `RGB_PREVIEW_COLOR`: Updates LED color in volatile RAM (`rgblight_setrgb_at` without EEPROM write) during slider drag.
    - `RGB_SAVE_CONFIG`: Commits validated per-layer RGB configuration to EEPROM only when changed.
  - Ensure `layer_state_set_user` uses the configured per-layer RGB color automatically even when disconnected from the desktop app.
- **Desktop UI & Profile Persistence (`src/App.tsx`, `src/profileFiles.ts`):**
  - Update the layer lighting popover to accurately represent the physical onboard WS2812 LED: per-layer color picker/swatch (`BASE`, `MEDIA`, `NUMPAD`, `FN`), global brightness slider, enable/disable toggle, and supported single-LED modes.
  - Persist lighting configuration in profile state (`cm2.state.v2`) and sync to the device.

### Dependencies
- Requires Phase 2 (Custom HID command channel).

### Acceptance Criteria
- Changing a layer's RGB color in the desktop UI previews live on the LED without spamming EEPROM writes, and persists across power cycles on save.
- Physical layer switching on the Micro Pad updates the onboard WS2812 LED to each layer's configured color when the desktop app is closed.

---

## Phase 7 — End-to-End Verification, Stress Testing & Release Packaging

### Objectives
Perform comprehensive automated, stress, build, and hardware-in-the-loop verification across all subsystems and update user/developer documentation.

### Key Tasks
- Expand automated Vitest suites (`tests/`) to cover:
  - 4-layer authority separation (`deviceActiveLayer` vs. `editorSelectedLayer`).
  - Electron main-process HID agent & IPC routing.
  - Multi-Action 4-gesture state machine timings.
  - Physical Smart Action execution & held-key release reconciliation.
  - Per-layer RGB configuration sync and EEPROM wear protection.
- Verify all CI pipelines (`ci.yml`, `qmk-build.yml`, `windows-installer.yml`) pass cleanly.
- Update `README.md`, `WINDOWS_APP_AND_FIRMWARE_GUIDE.md`, and `HARDWARE_PREPARATION_CHECKLIST.md` with accurate architecture and verification checklists.
