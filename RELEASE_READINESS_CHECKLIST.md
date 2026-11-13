# Installer and firmware release readiness

## Release gate

**Not ready to publish or flash.** Publish the Windows installer and the matching firmware together only after all applicable items below are complete and the physical checks pass. Do not use a simulated test or a successful compilation as evidence of hardware validation.

The latest published release remains **v1.0.14**. Work on this branch is experimental and unpublished. The user has exported their app profiles, but those exports are not a complete backup of the device.

## 1. Backup, restore, and data preservation

- [ ] Provide a validated, exportable backup and recovery path covering all relevant app profiles, custom actions, settings, device keymaps and encoder mappings, VIA macros, and supported lighting data. Clearly distinguish app-local data from device data and identify anything not covered.
- [ ] Make backups usable after reinstalling the app or switching devices; do not rely solely on browser/local storage. Verify exported files and explain compatibility limits.
- [ ] Complete a safe keymap **and** macro restore from the combined backup. The experimental combined export currently captures both, but its existing restore flow restores **macros only**; it is not a complete restore.
- [ ] Validate file format, version, size, all data, device compatibility and layer count before any write. Preserve conflicting configurations and require explicit user confirmation rather than silently replacing them.
- [ ] Capture and verify a recovery copy of current data before writing. Show progress and clearly report success, partial failure, and whether recovery was verified.
- [ ] Verify device writes and final state; implement and test best-effort recovery for keymaps and macros. Explicitly explain that stock VIA writes are not atomic and power loss or disconnect can defeat rollback.
- [ ] Handle interrupted or incomplete macro and lighting data without presenting it as a valid rollback copy. Provide a safe, explicit recovery procedure.
- [ ] Test malformed files, incompatible devices, changed data, failed storage, failed or interrupted writes, disconnects, and failed recovery using simulated devices; confirm no destructive write occurs when preconditions fail.

**Current progress:** Experimental macro restore has validation, pre-write recovery capture, progress, read-back and best-effort rollback. A combined keymap/macro export double-checks reads. Local recovery copies can be lost on reinstall; the combined file does not yet restore the keymap. These features have not been validated on a physical pad.

## 2. Firmware migration and persistent lighting

- [ ] Resolve the pinned QMK VIA build-date magic issue: a date mismatch can reset dynamic keymaps and macros. Design and test a migration/update path that preserves existing data, including from the currently released firmware. Do not silently reset or overwrite unknown configurations.
- [ ] Confirm the actual pad's flash capacity, board revision and memory layout before using the experimental two-sector reservation. Demonstrate that firmware, lighting storage and QMK's EEPROM backing store do not overlap.
- [ ] Finish the versioned per-layer lighting protocol, initialization and recovery, including handling a torn or unknown journal slot without erasing data belonging to another firmware.
- [ ] Complete the app integration for four layers, including explicit initialization consent, conflict detection, verified read-back and a recovery method that survives reinstall. Ensure unsupported firmware and uncertain state fail safely.
- [ ] Verify LED Off, Solid, Breath and Rainbow as supported; calibrate the reported red/green channel swap on the actual pad. Avoid applying both the desktop swap and a second firmware byte-order correction.
- [ ] Preserve four device layers and confirm per-layer settings remain correct after switching layers, closing the app and power-cycling the pad.
- [ ] Ensure the firmware actually intended for release includes the validated lighting integration. The existing QMK CI workflow uploads the **standard** VIA artifact before its separate experimental compile; a successful experimental compile does not make that uploaded artifact the new lighting firmware.
- [ ] Document any features that remain desktop-dependent, including unsupported standalone multi-actions; do not claim they run after the app exits.

**Current progress:** The experimental lighting firmware has compiled in QMK CI and passed a flash-boundary check and host simulations. This is not proof of the physical board layout, safe migration, or device behavior. It has not been flashed or published.

## 3. App, installer, and regression checks

- [ ] Bring both application and initial JavaScript gzip sizes under the existing 200 KiB budgets without raising the limits or removing required behavior. Run `npm run build` and `npm run check:bundle` on the final release commit.
- [ ] Run `npm run lint` and the complete test suite on the final release commit; investigate failures rather than relying on older results.
- [ ] Build and verify the final Windows installer and ZIP in CI, including installation, upgrade, uninstall/reinstall data preservation, and launch. Confirm the actual NØDE logo header and abstract installer artwork.
- [ ] Check the connection-required screen, reconnect behavior, local assignment retention, styled reset dialog and accessibility, and the transparent click-through cheat-sheet overlay with labels and dial directions on Windows.
- [ ] Verify firmware update warnings, backup and recovery messages, and release documentation are accurate and consistent with the final behavior.
- [ ] Ensure the workflow and release version references are updated from the current v1.0.14-specific configuration, without publishing early.

**Current progress:** The most recent full software run passed 387 tests, lint and a production build. The bundle budget was previously exceeded and must be rechecked after final changes. A Windows installer CI build succeeded for an earlier commit; it is not validation of the latest uncommitted changes.

## 4. Physical pad validation — user assistance required

Do these only after the software and migration safeguards are ready. Keep the exported profiles and an independently verified device backup in a safe place; confirm the board and recovery procedure before flashing.

- [ ] Back up and verify the existing pad's keymaps, encoder mappings and macros, as well as app profiles and settings. Record current firmware and the exact test artifacts.
- [ ] Confirm the correct RP2040-Zero board/flash layout and a usable recovery procedure. Flash only the intended test firmware with explicit consent.
- [ ] Verify the existing configuration survives or is recoverable, and test all four layers, key actions, encoder directions and layer switching.
- [ ] Test LED colors and effects for each layer, including calibration; close the app, restart or power-cycle the pad, and confirm persistence.
- [ ] Test backup and restore, including a controlled interruption or failure and recovery where safe. Never assume rollback after power loss is guaranteed.
- [ ] Test the Windows installer, reconnect behavior, overlay and relevant accessibility/visual behavior on the user's system. Record outcomes and investigate any discrepancy.

## 5. Publish together only after the gates pass

- [ ] Select the final source commit and version. Produce the installer, ZIP and intended firmware from matching, traceable CI builds; do not substitute the standard firmware for the validated per-layer build.
- [ ] Verify artifact names, contents, checksums and provenance (source commit, pinned QMK commit, build tools and CI run). Verify release workflow permissions and conditions.
- [ ] Write accurate release notes, update and recovery instructions, compatibility information, backup warnings, known limitations and hardware test results. Note that installers are unsigned if that remains true.
- [ ] Publish the installer and firmware together, then independently verify the release assets, download links and checksums. Do not claim hardware validation for untested configurations.
