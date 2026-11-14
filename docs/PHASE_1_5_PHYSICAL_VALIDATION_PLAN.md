# Phase 1.5 — Physical Persistence & Synchronization Validation Plan

**Status: NOT RUN — hardware access and the ARM cross-compiler are unavailable in this workspace.** No physical validation or current-working-tree firmware build is claimed. QMK CLI `1.2.0` was installed only in `/tmp/node-qmk-venv`; the ARM compiler, `binutils-arm-none-eabi`, and `libnewlib-arm-none-eabi` are absent. The workflow's apt sources are outside this sandbox's permitted network hosts, so they were not contacted and no system packages were installed. There is no new UF2 artifact to flash. Use this run sheet only after building the exact current source and preserve the completed copy, logs, backups, and firmware provenance with the release record.

## Target and scope

Assumption: “Micro Pad” means the repository's **Grid Macro 1**, RP2040-Zero board, VID:PID `FEED:6001`, running the stock VIA keymap. Confirm the actual board and firmware before starting. This plan validates the existing stock-VIA path only; it does not introduce a custom protocol, atomic transaction, or power-loss guarantee.

Stock VIA writes mappings sequentially. For Test E, interrupt USB communications during a keymap write; do **not** infer brownout/power-cut safety from this test. A partial write is possible by design.

## Required preflight and evidence

Record before testing:

| Field | Value |
| --- | --- |
| Device/board revision and RP2040 identity | |
| VIA firmware version shown in NØDE Studio | |
| Firmware artifact filename, repository commit, QMK commit, SHA-256 | |
| NØDE Studio version / build commit | |
| OS and version | |
| Device serial exposed by HID (redact if needed; record whether stable across reconnect) | |
| External VIA-compatible environment and version (Test B) | |
| Test operator and date | |

Before flashing, export the desktop profile and download both the device keymap and VIA macro recovery backups; verify the files can be parsed. QMK firmware updates can reset dynamic keymaps/macros because of VIA's firmware/build identity, so do not flash unless external backups are available and the board target/recovery procedure is confirmed. Do not use the current checked-in UF2 files: repository notes record unresolved firmware provenance/checksum mismatches. Before the first mapping write, verify the backup path again. Never use a destructive reset as a test shortcut. Keep the desktop-only assignment on a different physical slot than the mapping changed by the external VIA environment in Test B, so the test checks preservation rather than intentionally resolving a same-slot conflict.

## Test A — Device configuration persistence across full computer shutdown

Use at least three distinct supported shortcuts (for example, `Ctrl+Shift+S`, `Alt+F4`, and `Ctrl+Z`) on separate keys. Record slot and layer.

| Step | Action | Pass criteria / evidence |
| --- | --- | --- |
| A1 | Connect the pad; wait for NØDE Studio to report a completed device read. | Connected and verified status is visible. No conflict was silently applied. |
| A2 | Assign the three shortcuts on Layer 1 and apply. | NØDE shows a successful write/verification; a pre-write device backup exists. |
| A3 | Disconnect USB, shut the computer down fully, wait 30 seconds, then restart. | This is a real shutdown, not sleep/hibernate. |
| A4 | Reconnect the pad without opening NØDE Studio; test all three host shortcuts and confirm firmware-native behavior. | All shortcuts work with no desktop app running. Record any OS-reserved shortcut behavior separately. |
| A5 | Open NØDE Studio and wait for device keymap retrieval to finish. | The saved virtual pad displays the three assignments on the correct slots/layer. UI indicates verified state only after the read completes. |
| A6 | Compare app-visible bindings with the written record and an external device read/backup. | Exact supported keycodes and encoder values agree. Save screenshots and exported snapshots. |

**Result:** NOT RUN. Pass/fail: ____  Notes/evidence: ____

## Test B — Device-to-desktop sync after editing elsewhere

Prepare a desktop-only Smart Action on a slot that will not be changed externally, and save/export the desktop profile. Set a different native key on another slot in NØDE and synchronize it first.

| Step | Action | Pass criteria / evidence |
| --- | --- | --- |
| B1 | Close NØDE Studio and disconnect the device. | Last known desktop profile export is available. |
| B2 | On a second computer or a compatible VIA environment with the correct Grid Macro 1 definition, change two supported key/encoder mappings on the device. Do not change the host-only slot. | The external tool confirms its writes; export/read back the device keymap if supported. |
| B3 | Reconnect to the original computer and open NØDE Studio. Wait for the read and conflict decision. | The app does not claim the cached desktop state is device-verified while reading. A divergence is surfaced, not silently overwritten. |
| B4 | Choose **Use device mappings**. | Supported changed assignments appear on the correct virtual keys/encoder. No device write is sent for an import-only resolution. A new local checkpoint is saved only after successful import. |
| B5 | Inspect the host-only slot, custom-action library, labels, icons, layer names, and other unchanged metadata. | Host-only assignment and metadata remain intact because the device's slot stayed `KC_NO`. Any unsupported device keycode remains unchanged and is visibly warned. |
| B6 | Export the resulting desktop profile and read the device again. | Device-native mappings and imported app bindings agree; host-only data remains in the desktop export. |

**Result:** NOT RUN. Pass/fail: ____  Notes/evidence: ____

## Test C — Desktop-to-device sync and reconnect

| Step | Action | Pass criteria / evidence |
| --- | --- | --- |
| C1 | In NØDE Studio, change multiple keys, one encoder direction, and a mapping on another layer to supported native actions. | Desktop profile is saved locally; supported mappings are identified. |
| C2 | Apply **Apply desktop mappings** if a conflict is shown; otherwise let a one-sided desktop change sync under the existing flow. | Device pre-sync backup is persisted before any VIA write. Unsupported/host-only actions are not represented as executable keycodes. |
| C3 | Wait for write completion and verification, then disconnect and reconnect. | NØDE rereads the actual device keymap and only reports verified after successful readback. No conflict if both sides still match. |
| C4 | Read/export the device keymap with a compatible VIA tool; test the native keys without the app. | Key and encoder mappings match the requested supported configuration and work app-free. |
| C5 | Inspect every configured layer in the virtual pad. | Keys, layers, and supported encoder directions are displayed on their correct positions. |

**Result:** NOT RUN. Pass/fail: ____  Notes/evidence: ____

## Test D — Explicit conflict resolution choices

For each choice, first export the full desktop profile and save an external device backup. Create a deliberate conflict on the same firmware-native slot, ensure both sides differ, reconnect, and record the pre-choice state.

| Choice | Expected outcome |
| --- | --- |
| **Use device mappings** | Device keymap remains unchanged. Supported device-native mappings are imported. Desktop-only assignments on unchanged `KC_NO` slots and profile/custom-action metadata remain available. Same-slot executable conflicts resolve in favor of the device only after the explicit choice; the desktop export is the recovery route. |
| **Apply desktop mappings** | Desktop profile remains unchanged. The device is backed up before sequential writes, writes are verified by reread, and the checkpoint advances only if persistence succeeds. If a write or checkpoint fails, sync pauses with an accurate warning. |
| **Keep both and pause** | No keymap/profile overwrite is performed. Device and desktop snapshots remain separately recoverable. UI says sync is paused and does not present either side as reconciled. |

After each choice, reconnect and inspect both sides. Confirm a second reconnect does not silently reapply the rejected side. Record request/write logs if available.

**Result:** NOT RUN. Pass/fail by option: ____  Notes/evidence: ____

## Test E — USB interruption during sequential synchronization

This tests communication interruption only. It does not establish atomicity or power-loss safety.

| Step | Action | Pass criteria / evidence |
| --- | --- | --- |
| E1 | Create a conflict, make a fresh external desktop export and device backup, and select Apply desktop mappings. | Pre-write backup is present and can be opened. |
| E2 | During a multi-mapping write (after at least one mapping has changed), disconnect USB or disable the HID connection. Do not cut power to claim brownout validation. | UI reports an incomplete/failed operation and pauses further writes; it does not report synchronized. |
| E3 | Reconnect and read the complete keymap. | Current partial/ambiguous device state is shown as unverified until reread; no automatic retry or silent winner selection occurs. |
| E4 | Download the recovery snapshot and compare it with the pre-test device backup. | Previous snapshot is intact, device ID is recorded when available, and recovery warning explains possible partial update. |
| E5 | Use the conflict UI to explicitly recover/reconcile; reread and verify. | Retry is deliberate, takes a fresh backup, completes or stops safely, and records a new checkpoint only after success. |

**Result:** NOT RUN. Pass/fail: ____  Notes/evidence: ____

## Test F — Virtual pad restoration and unavailable/stale state

| Step | Action | Pass criteria / evidence |
| --- | --- | --- |
| F1 | Save a profile with multiple layers, varied key types, a supported encoder assignment, labels/icons, and a desktop-only action. Close/reopen NØDE while the device is disconnected. | The desktop profile is preserved locally and can be exported; while disconnected, UI clearly says a device is not connected and does not claim the profile is live device state. |
| F2 | Reconnect the same device and wait for the keymap read. | Last-known desktop profile is retained during the read. A visible progress status says device state is not verified yet. |
| F3 | Simulate/induce a device-read error or use a known unsupported/corrupt response in a controlled test build. | Existing local profile and virtual assignments remain; a clear alert says device state is not verified; no device write or destructive fallback occurs. |
| F4 | Complete a successful read and resolve any conflict. | Verified status is only shown after the device read/reconciliation; all supported layers and encoder assignments display correctly; desktop-only data remains in the local profile. |
| F5 | Restore a downloaded keymap backup to a different identified device only after reviewing the cross-device confirmation; verify current device was backed up first. | A cross-unit warning is shown. Restore is cancelled without writes if consent is declined or the connected-device pre-restore backup cannot be saved. |

**Result:** NOT RUN. Pass/fail: ____  Notes/evidence: ____

## Release evidence gate

Do not mark Phase 1.5 complete until all physical scenarios above have dated evidence, the exact firmware artifact/hash and app build are recorded, and any failure has an issue/fix/retest record. Passing desktop tests or QMK compilation alone is not a physical pass. Do not claim atomic writes, power-loss-safe firmware persistence, or universal VIA compatibility; stock VIA commits mappings sequentially and external configurators may use different layouts/protocol support.

## Final sign-off checklist

Run these seven items against the **newly built, provenance-verified UF2 from the current source**, not an older checked-in artifact. Record pass/fail, date, firmware SHA-256, and evidence for each. Until then every item remains **NOT RUN**.

- [ ] **Persistence across device power loss:** after a successful, verified write, remove USB power completely and reconnect; mappings remain. This validates a clean completed-write power cycle only, not power-loss safety during a write.
- [ ] **Standalone keyboard operation:** with the desktop app closed, test all configured firmware-native key, media, layer, and encoder actions.
- [ ] **Device-to-desktop retrieval:** change supported mappings in a second compatible VIA environment and verify explicit import updates the correct profile mappings while unchanged desktop-only actions stay intact.
- [ ] **Virtual Micro Pad restoration:** close/reopen the app and reconnect; verify last-known desktop state is shown while reading, device state is labelled unverified until read success, and keys/layers/encoder are restored in their correct positions.
- [ ] **Desktop-to-device synchronization:** apply supported assignments, disconnect/reconnect, read back the keymap, and confirm app-free key behavior.
- [ ] **Conflict choices:** separately run Use device mappings, Apply desktop mappings, and Keep both and pause. Compare exported desktop profiles and device backups before/after; verify no rejected side is silently applied.
- [ ] **Interrupted USB synchronization and recovery:** disconnect USB during a multi-mapping write, confirm the app pauses and does not claim sync, reread actual partial state, recover from the saved backup only after explicit review, then reread and verify. Do not infer atomicity or brownout/power-cut recovery.
