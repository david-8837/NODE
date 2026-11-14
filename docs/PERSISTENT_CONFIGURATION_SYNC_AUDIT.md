# Grid Macro 1 persistent configuration and synchronization audit

**Status:** audit/plan plus a stock-VIA bidirectional-sync implementation in progress. The QMK configuration now requests an RP2040 hardware-ID USB serial; this firmware change has not been compiled or hardware-validated. No storage layout or custom transaction protocol has been changed.
**Scope:** QMK/VIA is the implementation target. CircuitPython was audited for compatibility context only and is out of scope unless explicitly brought back in.
**User decisions:** firmware-native actions must work without the app; desktop-dependent actions remain in the desktop app and must not be moved into firmware. Keep both persistent state sets—the device-executable configuration on the device and the complete desktop profile in the app—and synchronize/reconcile them on reconnect. Start with Phase 1 using stock VIA; no custom atomic-commit protocol in the first implementation.
**Interpretation:** “both configurations” means independent durable device-executable state and desktop-profile state, not copying host-only action definitions into firmware. On reconnect, reconcile the device-executable subset with the desktop profile while retaining desktop-only fields in the app.
**QMK reference:** workflow pins `qmk/qmk_firmware` at `d194c077ed964195ec16d255c7a4b89a794cf03b` (`.github/workflows/qmk-build.yml`).
**Hardware validation:** none. Build success and host-side tests do not establish flash/power-loss behavior on a physical board.

## Executive assessment

The current product already persists a useful subset of configuration and has valuable safety controls. The QMK/VIA path stores dynamic keycodes and macro bytes in QMK's RP2040 flash-backed, wear-levelled EEPROM emulation; desktop profile data is stored in browser/Electron `localStorage`; the CircuitPython alternative stores sanitized JSON in `/keymap.json`. The app reads the device keymap before syncing, saves local recovery snapshots, detects external changes before subsequent writes, and verifies writes by rereading. This working tree adds a first explicit conflict chooser and imports supported device-native mappings into the local profile while retaining desktop-only assignments represented by `KC_NO`.

This is an initial Phase 1 increment, not yet the complete requested sync system. The chooser resolves the whole supported mapping set (use device, apply desktop, or keep both and pause); it does not show a field-by-field diff or automatically perform a true three-way merge. A local per-device checkpoint now records the last acknowledged device snapshot, desktop-state checksum and local revision when a stable USB serial is available; this is not a device-enforced revision or common ancestor for arbitrary concurrent field edits. Stock VIA still exposes no compare-and-swap or multi-key transaction. A device snapshot represents keycodes and encoder keycodes, not profile metadata, labels, custom action definitions or all lighting settings. Disconnect/power loss during sequential VIA writes may leave a partial update; local backups aid recovery but do not make the device update atomic.

The recommended first step is additive: keep stock VIA and its storage untouched, and implement safe reconnect reconciliation for the firmware-executable subset while independently preserving the complete desktop profile locally. Firmware-native keycodes/layers/encoder actions (and native macros only where the exact production firmware supports them) remain device-resident and app-independent. Desktop-dependent actions remain app-resident and execute only while the app is available. Stock VIA multi-mapping writes remain non-atomic; this first phase must state that limitation, save/review recoverable snapshots, and never silently overwrite either side. A custom atomic-commit protocol is not in the approved first phase. Never repurpose QMK EEPROM/flash ranges without a separately approved storage-layout review for the exact board and firmware image.

## Existing architecture and observed behavior

### Device and QMK/VIA

- `qmk_firmware/grid_macro_1/keyboard.json`, `config.h`, and `keymaps/via/keymap.c` describe an RP2040-Zero, a 3x3 direct-key matrix, one encoder with a push switch, and one onboard WS2812. The VIA keymap defines four layers; the dynamic-keymap maximum address is 4095.
- The build workflow installs the keyboard definition into a checkout of the pinned QMK commit. This is a keyboard-definition fragment, not a full QMK source tree.
- In the pinned QMK tree, RP2040 EEPROM emulation uses the wear-leveling driver and reserves an 8 KiB backing region at the end of flash by default (the logical EEPROM is smaller). This gives wear levelling, but does not provide an app-level multi-key transaction or revision/checksum protocol. Confirm the effective build configuration/linker map in CI for each production image before making address/layout assumptions.
- VIA Raw HID is the stock 32-byte report protocol (`src/qmkViaBridge.ts`), protocol version `0x000d`. The app reads/writes dynamic keycodes and encoder mappings, and reads the dynamic layer count. Keymap snapshots use a local JSON shape with protocol version, counts, keys and encoder keycodes; that version is not a full profile schema or device revision.
- The bridge serializes operations and times out exchanges. The `get_config`/`set_config` names are renderer APIs; the implementation uses stock VIA commands, not firmware commands carrying profile JSON.
- This working change enables QMK's `SERIAL_NUMBER_USE_HARDWARE_ID TRUE` on RP2040 and reads the USB serial string as the per-unit ID. At pinned QMK commit `d194c077ed964195ec16d255c7a4b89a794cf03b`, `usb_descriptor.c` tests that macro against `TRUE`; ChibiOS `hardware_id.c` calls `flash_get_unique_id()` on RP2040. The currently modified `config.h` line is not in checked-in `HEAD`, so the successful CI build below does not compile this addition. QMK CLI 1.2.0 is installed only in `/tmp/node-qmk-venv`; the ARM compiler is absent.
- Writes are performed mapping-by-mapping, not committed as one payload. QMK/VIA storage persistence for individual writes is separate from transactionality across a multi-mapping update.
- Pinned QMK source review confirmed the decoder's standard keycode ranges: `QK_MODS` `0x0100–0x1FFF`, `QK_TO` `0x5200–0x521F`, `QK_MOMENTARY` `0x5220–0x523F`, and `QK_MACRO` keycodes. The keycode enum has macro references 0–31, while `quantum/dynamic_keymap.h` defaults `DYNAMIC_KEYMAP_MACRO_COUNT` to 16 and stock VIA exposes macro count/buffer commands. The app intentionally maps only macro references 0–15; verify the effective exact-build capacity and physical behavior before claiming device-side macro operation. `src/viaMacroTransaction.ts` and `src/deviceKeymapFiles.ts` provide separate macro/keymap snapshot and restore paths; desktop macro bytecode editing remains out of scope.
- `keymaps/via/keymap.c` also emits custom input-event reports (`0xEE`) alongside standard VIA replies. Do not change this established event framing to implement configuration sync.
- Experimental per-layer lighting is separately opt-in via `NODE_EXPERIMENTAL_LAYER_LIGHTING`, has separate flash storage code, and is not production-enabled. Its flash layout assumptions and physical behavior remain unvalidated. Do not allocate or share its reserved areas for keymap/profile storage without a separate flash-layout review.

### Desktop application and local persistence

- The desktop app is React/TypeScript (`src/App.tsx`); validated profiles and editor state are loaded/saved through `profileFiles.ts` in `localStorage` (`cm2.state.v2`). A previous serialized state is copied to a single backup key before replacement. Saved state includes profiles, active profile/layer, layer names, lighting preferences and custom items.
- `profileFiles.ts` validates import/export profile schemas. `deviceKeymapFiles.ts` holds a bounded local history of device keymap backups (up to ten), exports/restores them, and now records an available USB hardware ID so same-looking boards are not deduplicated together; restoring a backup for another identified unit requires explicit confirmation. `deviceSyncCheckpoint.ts` stores a versioned local checkpoint per device with local revision, keymap CRC32, and desktop-state CRC32. This remains browser-profile storage and cannot enforce a device-side compare-and-swap.
- On connection, `App.tsx` reads the current keymap, saves a pre-sync local snapshot and compares it with the active desktop profile. A differing keymap now offers explicit `Use device mappings`, `Apply desktop mappings`, or `Keep both and pause` choices. The device-import path translates supported native keycodes/media/layer actions/macro references into editor bindings; assignments with unsupported codes are left unchanged with a warning, and a desktop action represented by `KC_NO` is retained when the device also stores `KC_NO`. Before a desktop write, the bridge rereads for external changes, saves another pre-sync snapshot, writes and verifies by rereading. Failures pause sync and warn that a partial update may have occurred.
- The implementation resolves the full supported mapping direction, not per-field conflicts. On reconnect, a validated per-device checkpoint lets the app detect whether the device keymap and/or desktop state differs from the last acknowledged sync; it is a local heuristic, not a firmware-enforced common-base revision. The local full profile is still the only place for labels, icons, custom action definitions and host-only actions. A user who selects device mappings replaces supported executable assignments; host-only fields are retained.
- Device discovery still filters by USB vendor/product ID and VIA usage collection. The bridge now surfaces `HIDDevice.serialNumber` as a normalized per-unit `deviceId` when present; the new QMK config requests an RP2040 hardware-ID USB serial, but older firmware may expose no ID. Without it, the app deliberately uses no per-device checkpoint and warns rather than inventing an identity. `serialManager.ts` and its line-delimited JSON protocol are a distinct serial path and are unchanged.
- `src/qmkProfileSync.ts` translates representable key bindings, media controls, encoder actions, certain layer actions and QMK macro references into standard keycodes. Reverse decoding is limited to the same representable subset; unsupported keycodes are preserved rather than guessed. Desktop-only actions (e.g. arbitrary text/app/web actions, multiactions and smart actions) execute through the desktop app/agent machinery and are not executable when the host app is absent. Existing keycode representation is limited by standard 16-bit QMK/VIA keycodes.
- The app currently treats the profile-to-device direction as sync; it has no device revision, cloud sync, or three-way merge. Existing safety guards are valuable and should be retained while the sync model is evolved.

### Separate CircuitPython firmware

- `firmware/code.py` implements another firmware/runtime, with USB HID execution and a distinct Web Serial newline-delimited JSON protocol; `config_validation.py` sanitizes up to eight layers and supported assignment fields.
- It loads `/keymap.json` from CIRCUITPY and saves by opening the same file with mode `w`. This is not an atomic replace/journal: an interruption during write can damage the file. Load errors fall back to defaults, which risks appearing successful while persisted user data was unreadable. Its `SET_CONFIG` reports whether storage succeeded, but this path has no stable config revision/checksum and is not the same schema/protocol as QMK/VIA.
- CircuitPython is not included in the approved implementation scope. Do not alter or unify its serial protocol in the QMK/VIA phase.

## Principal gaps against the target experience

1. **Partial reverse sync:** supported device-native keycodes now import into the editor by explicit user choice, but there is no field-level three-way merge or restoration of desktop-only profile metadata from the device.
2. **Partial state coverage:** device keycodes do not carry desktop profile names, labels, custom action definitions, active desktop profile, macro bytecode as part of the app profile, or all UI metadata. Some actions are desktop-dependent by design.
3. **Only local sync metadata:** the app now stores a local per-device checkpoint and CRC32 checksums when the USB serial is available. It is not firmware-enforced; stock VIA has no device generation/CAS, and older firmware may lack the serial descriptor. Local checkpoint loss/corruption requires manual conflict review.
4. **Limited conflict resolution:** whole-config device-wins, desktop-wins and keep-both/pause choices are present; there is no field-level merge UI or persisted base to identify which side changed.
5. **Non-transactional device writes:** a series of VIA updates can be interrupted partway. A local pre-write backup is not a device-side commit/rollback mechanism.
6. **Uncertain macro support boundary:** macro read/restore infrastructure exists but should be validated against this exact firmware build, capacity and failure behavior before being included in a synchronization promise.
7. **Local storage durability limits:** browser localStorage has quota/clear/profile-isolation risks; backup history and profile state use separate keys and are not a single atomic durable transaction. Device backups need user-visible export and recovery.
8. **Identity and firmware migration:** VID/PID/product strings identify a model, not a physical unit. A hardware-ID serial is now requested for new RP2040 firmware, but must be compiled and verified on hardware; older firmware exposes no per-unit identity. Firmware/layout changes can reset or reinterpret QMK's dynamic keymap and macros; production releases must document migration/backup behavior.
9. **Validation boundary:** fake-HID, unit, and CI build tests cannot confirm actual hardware identity, flash write endurance, brownout recovery, USB disconnect behavior, or app-free execution.

## Proposed target architecture

### Separate executable device state from desktop-only state

Define an explicit `DeviceExecutableConfig` schema containing only behavior the firmware can execute with no host: physical key slots, encoder CW/CCW/press, supported layer transitions, supported key/media codes, and firmware-native macros if separately implemented and tested. Keep labels, icons, profiles, layout annotations, Smart Actions, app/text/web execution and host-agent metadata in a separate `DesktopProfile` schema. The UI must identify unsupported/host-dependent assignments rather than imply they work unplugged. Never silently encode host-only actions as `KC_NO` or an ambiguous no-op.

### Revisions, checksums and identity

Use canonical serialization and explicit schema versions for the local desktop profile and the device-executable projection. The app now stores a local checkpoint per reported hardware identity with a monotonically increasing local revision and CRC32 digests for device keymap and desktop state. These are **client-side change detectors only**, not device revisions; stock VIA cannot reject a stale compare-and-swap. QMK is configured to expose the RP2040 hardware ID in the USB serial descriptor, pending compile and physical validation. Older firmware with no serial number gets no per-device checkpoint. Keep firmware identity, local schema version and VIA protocol version distinct.

### Safe synchronization algorithm (Phase 1, stock VIA)

1. Load and display the last validated desktop profile immediately; clearly mark cached state while the asynchronous device read is pending.
2. Read and validate the device's supported keymap/macro snapshot. Reject malformed, truncated, unstable or unsupported reads. Use the USB hardware serial when available; on older firmware without it, warn that identity is model-level and do not create a per-unit checkpoint.
3. Before any write, persist a pre-change device snapshot and the local sync base (last acknowledged common executable projection plus its local digest). If backup persistence fails, do not write.
4. Compare three projections: last common base, current device executable state, and current executable projection of the desktop profile. If only one side changed, present or apply the documented one-sided policy. If both changed in disjoint fields, offer a reviewable merge; if the same field diverged, require an explicit choice. Keep-both/export and cancel must remain safe options. Never silently prefer the desktop or device.
5. For device-to-desktop changes, update only the profile's executable assignments and retain labels, icons, custom action definitions and all host-only fields. For desktop-to-device changes, write only representable firmware-native assignments; prominently identify unsupported/desktop-only actions rather than encoding them as no-op.
6. Apply writes using stock VIA, reread and verify. Since stock VIA has no transactional commit or device-side compare-and-swap, an interrupted or ambiguous write requires a fresh read and explicit recovery/reconciliation; do not advance the local common base until verification succeeds.
7. Persist the newly acknowledged common base after verified synchronization. Treat it as a local checkpoint, not as a hardware-enforced revision. Preserve the full desktop profile independently of device keycodes.

### Persistence boundary for the approved first phase

The device remains the durable source for firmware-executable state using its current QMK/VIA keymap and any validated native macro store. The app remains the durable source for the full desktop profile, including desktop-only actions. A local acknowledged common-base snapshot links the two for reconnect reconciliation; it is not a device revision and must not be described as atomic or device-enforced. Leave the existing QMK wear-levelled EEPROM and experimental lighting flash areas unchanged. Any future separate flash journal would require its own approval and audited space reservation, linker-size limits, RP2040 erase/program constraints, synchronization/IRQ safety, interaction with the bootloader and QMK EEPROM, flash-size guards, and power-failure testing.

## Phased implementation plan

### Phase 0 — contracts and capability verification

The product scope is set: QMK/VIA is the target, CircuitPython is excluded, firmware-native actions must work without the app, desktop-dependent actions remain app-only, and the first implementation uses stock VIA. Before changing behavior:

- Freeze a capability matrix for key/media/layer/encoder/native macro assignments, including which exact actions execute without the app, which stock VIA can represent, and which remain host-only.
- Review the pinned QMK build's effective storage/linker map and macro configuration/capacity. Confirm supported board/flash-size assumptions and whether the hardware exposes a usable stable UID. These are validation gates, not reasons to invent a new protocol.
- Define separate schemas for the complete desktop profile and device-executable projection, local common-base persistence, identity confidence, conflict states and migration behavior.

### Phase 1 — bidirectional reconcile for the two persistent state sets (approved first implementation)

- Keep the complete desktop profile durable in the app and device-executable keymap/native macro state durable on the QMK device. Do not serialize or execute desktop-dependent actions in firmware.
- Keep the current standard VIA bridge and its existing safety checks. Separate cached desktop display from device hydration so the app can restore its last-known profile immediately while showing device-read progress.
- Reconcile the device projection against the last locally acknowledged common base and current desktop projection. Import device-side native mapping changes into the matching desktop profile without erasing labels, icons, custom actions or host-only actions; apply desktop-side native mapping changes to the device only after conflict review.
- Provide field-level conflict review, explicit device/desktop/merge choices, keep-both/export and cancel. Preserve the desktop-only definitions regardless of device changes. Do not infer or overwrite desktop-dependent action contents from keycodes.
- Add local canonical digests/checkpoints for detecting divergence; clearly label them as local-only (no device revision/CAS in stock VIA). Persist full recovery snapshots before writes; if persistence fails, stop.
- Validate availability and behavior of QMK/VIA native macro storage in this exact build. Sync native macros only if capacity and stock protocol support are confirmed; otherwise disclose the gap rather than calling host-side actions standalone macros.
- On interrupted/ambiguous writes, reread and verify before choosing recovery. Stock VIA's multi-entry write is not atomic; retain an explicit warning and do not automatically retry or silently pick a winner.

### Deferred — custom firmware atomic transactions (not approved for the first implementation)

A versioned custom Raw HID protocol and dual-slot/journal storage could provide device-side generations and atomic commits, but are outside the selected Phase 1 scope. Do not start this work without a separate approval and a complete storage-layout/hardware review. If later approved, the design must preserve stock VIA interoperability, validate staged payloads, use expected-generation commit semantics, and have fault-injection and physical power-cut qualification before any production claim.

### Phase 2 — production integration and migration for Phase 1

- Complete schema/import migration for app-side profiles and local sync checkpoints; never overwrite unknown or invalid local data. Maintain downloadable device backups and a clear recovery/reset path.
- Add release build provenance/checksums and notes distinguishing app-only and firmware-native behavior. Test the compatibility matrix for supported QMK/VIA firmware.
- Any later atomic protocol/storage project is a separate design and approval phase, not a prerequisite silently bundled into this Phase 1 implementation.

### Phase 3 — physical qualification and release gate

- Validate target hardware/flash assumptions, unplug/reconnect during reads and writes, USB identity confidence, app-free key/media/layer/encoder operation, native macro behavior, and repeated writes on physical devices. Characterize interruption behavior honestly; stock VIA does not guarantee a multi-mapping atomic commit.
- Verify backup restoration across firmware update/reset and on a clean desktop installation. Test supported firmware compatibility and corrupt/unknown local-state UX.
- Release only after reproducible build, exact UF2 checksum/provenance, external keymap+macro backup, and documented hardware pass record. Until then do not claim physical validation.

## Current Phase 1 implementation progress

Implemented in this working tree:

- Added reverse decoding for supported VIA keyboard, media, layer and QMK macro-reference keycodes; unsupported keycodes fail closed. `QMK Macro 1` through `QMK Macro 16` are representable as references to the device's existing native macro buffer.
- Added a pure device-keymap-to-profile importer. It retains desktop-only assignments when the device has the same `KC_NO`, preserves visual metadata, and does not guess unsupported keycodes.
- Replaced the automatic desktop-overwrite confirmation with explicit `Use device mappings`, `Apply desktop mappings`, and `Keep both and pause` choices. The existing pre-write backup, change reread and post-write verification remain in place.
- Added RP2040 hardware-ID USB serial configuration and normalized HID serial identity, with no fabricated fallback identity. Added device identity to keymap backup metadata and explicit cross-device restore warning.
- Added a validated, checksummed local checkpoint per identified device (recording the active profile ID). Reconnect uses the saved device snapshot and desktop checksum for local change detection; successful synchronization/reconciliation advances the checkpoint. Corrupt checkpoint data is rejected rather than overwritten, and devices without a stable ID do not share checkpoint history.
- Added a visible “device keymap is being read / not yet verified” state while retaining the saved desktop profile. Read failures now explicitly state that device state is unverified and leave the local profile untouched.
- Tightened failure handling so a matching keymap that cannot be checkpointed pauses subsequent device writes instead of marking sync ready; an import whose checkpoint save fails also pauses writes.
- Added unit and React integration coverage for import/round-trip, conflict choices, identity and checkpoint revisions, pending/failed reads, corrupt checkpoint refusal, and malformed device layer-count responses.

Not yet implemented: field-level diff/merge or firmware-enforced revisions; editing/synchronizing macro bytecode as part of the desktop profile; device-side atomic writes; a QMK build of the current dirty working tree (including the uncommitted USB-serial config change) and physical qualification. The whole-config choices and local checkpoints are a safe first increment, not the completed target architecture.

## Changed files and remaining first-phase work

This working tree changes `src/App.tsx` (conflict choices and reconnect checkpoint handling), `src/qmkViaBridge.ts` (reverse keycode decode and USB identity), `src/qmkProfileSync.ts` (profile bindings in both directions), `src/deviceKeymapFiles.ts` (device-aware backup metadata), and adds `src/deviceProfileImport.ts` and `src/deviceSyncCheckpoint.ts`. The QMK keyboard config requests an RP2040 hardware-ID USB serial. Coverage includes `tests/reactAppDeviceSync.test.tsx`, `tests/qmkViaBridge.test.ts`, `tests/qmkProfileSync.test.ts`, `tests/deviceKeymapFiles.test.ts`, `tests/qmkKeyboardDefinition.test.ts`, and new import/checkpoint suites; this audit/plan is `docs/PERSISTENT_CONFIGURATION_SYNC_AUDIT.md`.

Remaining Phase 1 work includes a field-level diff/merge UX and a deliberate policy/UI for editing native macro bytecode versus just backing it up and restoring it. Compile the configured QMK firmware and verify USB serial identity on hardware before release. Any later atomic protocol would additionally touch `qmk_firmware/grid_macro_1/keymaps/via/keymap.c`, `rules.mk`, storage implementation/headers, build workflow and QMK protocol tests, and needs separate approval. CircuitPython files remain unchanged.

## Test plan and current test inventory

Relevant existing suites include `tests/qmkViaBridge.test.ts`, `tests/qmkProfileSync.test.ts`, `tests/deviceKeymapFiles.test.ts`, `tests/deviceSyncSafety` coverage, `tests/viaMacroBackup.test.ts`, `tests/viaMacroSnapshotSafety.test.ts`, `tests/reactAppDeviceSync.test.tsx`, `tests/profileFiles.test.ts`, and Python firmware validation/boot tests. Reuse and extend these rather than duplicate them.

Required new tests should cover: stable cached UI during async read; device-to-desktop import retaining desktop-only metadata; persistence of both the full desktop profile and device executable projection; one-sided changes, disjoint edits and same-field conflicts; unknown schemas; local digest/checkpoint consistency; storage quota/backup failures; disconnect during stock VIA reads and writes; reread after ambiguous timeout; partial stock VIA write recovery; no automatic overwrite; supported native macro round-trip (if available); and explicit unsupported-action reporting. Do not test/claim device CAS or atomic commits in this phase because stock VIA exposes neither. CI QMK compile and fake-HID tests remain software tests. Hardware interrupted-write, real USB and app-free execution are separate qualification results.

## Current verification and limitations

- Current verification: `npm test` passes (63 files, 434 tests); `npm run lint`, `npm run build`, and `git diff --check` pass. The run emits the expected optional `node-hid` unavailable warning and a deliberately malformed profile warning from a safety test.
- The QMK CLI `1.2.0` is installed in an isolated venv at `/tmp/node-qmk-venv` only. The ARM compiler and QMK build packages `binutils-arm-none-eabi`, `gcc-arm-none-eabi`, and `libnewlib-arm-none-eabi` are missing; the host is Debian 12 rather than the workflow's Ubuntu 22.04. The exact workflow uses those apt packages, plus `build-essential`, `git`, `python3-venv`, the isolated CLI, the pinned QMK commit and submodules, then compiles `grid_macro_1` `via` and `default`. Configured apt sources are `deb.debian.org`, outside this sandbox's allowed outbound hosts, so they were not contacted and no system/global packages were installed. A current-tree compile could not be started without the required ARM compiler/runtime.
- GitHub Actions reports a successful QMK VIA/default build for checked-in branch HEAD `137fafde5055ad8817b987a04214547006dfe9a7` ([QMK workflow run](https://github.com/david-8837/NODE/actions/runs/43549084569)). That checked-in config does not contain the current uncommitted `SERIAL_NUMBER_USE_HARDWARE_ID TRUE` change. Thus the current dirty firmware tree is not build-verified. No physical Grid Macro 1 validation has been performed. Software tests and a CI build do not prove real macro behavior, USB identity, power-interruption recovery, or app-free execution.
- The user selected QMK/VIA as the target, firmware-native actions for app-free use, desktop-dependent actions remaining in the app, separate persistence for the device-executable configuration and complete desktop profile, reconnect reconciliation, and a stock-VIA Phase 1 before considering any custom atomic protocol.
- “Persist both configurations” is interpreted as device-resident native state plus app-resident complete profile/desktop-only state, not copying host-only definitions into firmware. The app's native macro support currently represents macro keycode references; macro bytecode remains in QMK's separate device-side buffer and the existing backup/restore path, not the desktop profile schema.
- Remaining work includes field-level merge, explicit macro editing/synchronization policy, QMK compile and real hardware qualification. CircuitPython remains excluded. Custom atomic firmware transactions remain deferred and require separate approval.
