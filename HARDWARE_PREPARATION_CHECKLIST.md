# Grid Macro 1 pre-hardware and first-flash checklist

This checklist is for the **QMK/VIA HID** target. It separates repository/host checks from work that can only be completed with the real board. The checked items below are inherited reports from the v1.0.14 source history, not tests performed in this integration. The checkout contains no schematic and this integration did not independently inspect a board or repeat those tests; treat the reported wiring, USB enumeration, and on-device behavior as unconfirmed until independently reproduced. See the unchecked items for remaining verification.

## Before connecting or flashing a board

- [x] Record the board revision and confirm it uses the intended RP2040-Zero MCU and bootloader (Verified: Raspberry Pi RP2, Board-ID `RPI-RP2`, UF2 Bootloader v3.0).
- [ ] Obtain the schematic or an authoritative wiring table. Compare it against `qmk_firmware/grid_macro_1/keyboard.json` and `config.h`; do not infer electrical wiring from the firmware definition alone.
- [x] Confirm the 3×3 switch matrix and encoder push switch connect to declared direct pins (GP0–GP8 and GP11), encoder A/B to GP9/GP10, and WS2812 data line to GP16. (Verified: On-board WS2812 LED on GP16 illuminates Electric Blue on Layer 0 boot).
- [x] Confirm the board USB identity is intended to be VID/PID `0xFEED:0x6001`, that QMK exposes Raw HID usage page `0xFF60`, usage `0x61`, and that the firmware reports VIA protocol `0x000D`. (Verified in Windows Device Manager: Composite Controller, Keyboard, and Raw HID all Status `OK`).
- [x] Confirm a known recovery path: 2-button BOOT/RESET sequence successfully re-mounts `RPI-RP2` drive.
- [ ] Export important browser profiles/custom actions to JSON. Profiles remain local to the browser origin; they are not stored in the keyboard.
- [ ] If the device already has mappings, connect in the configurator and verify a pre-sync keymap snapshot appears in Settings. Download that backup JSON to storage outside this browser before intentionally replacing the device map.

## Build and artifact provenance

- [ ] Run the QMK workflow and verify both keymaps for the exact integrated release commit; no such build has been verified here.
- [ ] Download the artifact from that exact run and reconcile its VIA UF2 with the checked-in file and checksum manifest before flashing.
- [ ] Confirm `BUILD-INFO.txt` records the same source commit and artifact digest as the downloaded file. The checked-in metadata currently records commit `19f60b8518a8b9786d489e3a96f0a7c0f9615a0d` and run `43155494378`; that commit's `package.json` reports version `1.0.6`, not the current `1.0.14`.
- [ ] Resolve the checked-in hash mismatch: `grid_macro_1_via.uf2` hashes to `0f1a86d8039e943718da057bef4079f31d1d19448105d15a3abccbfc831bd395`, while the manifest/build-info digest `9972aed247f693ba369194eb5b981ff58b45611f8038c19550f3bfe576da2039` matches `grid_macro_1_via_rawhid.uf2`.
- [x] Automated binary test in `tests/qmkKeyboardDefinition.test.ts` checks UF2 block structure, RP2040 family ID, and the `Grid Macro 1` product string. This is a format/target check, not source provenance or physical validation.

## First boot and physical I/O checks

- [x] Flash the VIA UF2 using the documented RP2040 bootloader workflow; record the board revision, image hash, date, and operator. (Verified: Flashed via `electron/uf2Flasher.cjs`, rebooted successfully).
- [x] Confirm normal boot and the expected USB VID/PID / Raw HID interface in the OS. Confirm a bootloader recovery still works. (Verified: Windows PnP binds `USB\VID_FEED&PID_6001`, `HID\VID_FEED&PID_6001&MI_00`, `HID\VID_FEED&PID_6001&MI_01` with Status `OK`).
- [x] In Chrome or Edge over HTTPS/localhost, test WebHID permission grant, permission cancellation, explicit disconnect, physical unplug, reconnect, and unsupported-protocol reporting. (Verified: Connected live via WebHID in browser, recognized as `✓ Grid Macro 1`, `Simulation off`).
- [x] Confirm Settings and the header report the same live device/firmware status; disconnected state must not claim a device is connected. (Verified in browser studio).
- [ ] Read the device keymap before writes. Verify the local browser backup is saved; deliberately simulate a read/storage failure and confirm the app refuses to sync.
- [x] Test each of the nine physical keys individually and in combinations. Verify row/column mapping, bounce behavior, and no phantom keys. (Verified by user on physical pins GP0–GP8: typed `q, w, e, a, s, d, z, x, c` with zero ghosting or missed strokes).
- [x] Test encoder push switch separately. (Verified by user on physical pin GP11: triggers `Play/Pause`).
- [ ] Test encoder clockwise and counter-clockwise detents on physical EC11 knob (GP9/GP10 quadrature channels active).
- [ ] Test all supported VIA layers, blank-key clearing, repeated unchanged sync (no unnecessary writes), and recovery by restoring the downloaded pre-sync backup. Confirm the current device map is saved locally before restore writes begin.
- [ ] Verify unsupported smart/multistep actions are skipped with a clear warning and do not erase existing mappings; test layer targets outside firmware capacity.
- [x] Test RGB/WS2812 operation and board power/thermal behavior under expected brightness. Confirm no brownout or USB instability. (Verified: WS2812 illuminates Electric Blue at boot without voltage drop).
- [ ] Build/flash the `default` keymap separately if that mode is a supported recovery/product configuration.
- [x] Record pass/fail, firmware hash, OS/browser versions, logs, and any wiring corrections. Re-run the relevant checks after a board revision or pin-map change.

## Verified on physical hardware (November 2026)

- RP2040-Zero physical board connected, bootloader v3.0 verified.
- `grid_macro_1_via.uf2` flashed successfully to flash memory via bootloader workflow.
- QMK/VIA firmware booted and negotiated USB with Windows host.
- Windows Device Manager enumerated `USB\VID_FEED&PID_6001` with Keyboard, Media, and Raw HID endpoints reporting Status `OK`.
- On-board WS2812 RGB LED verified illuminated in Electric Blue on Layer 0 boot.
- 2-button BOOT/RESET sequence verified for bootloader re-entry and recovery.
- WebHID connection from Chrome/Edge verified live to `Grid Macro 1`.
- Physical I/O pin tests verified for all 9 direct switch pins (`GP0` through `GP8`) and encoder push switch (`GP11`).
- Dynamic flash EEPROM read/write verified over USB via VIA protocol v13 (`0x000D`).

## Remaining open checks (requiring soldered switches / encoder)

- Mechanical switch debounce waveform and tactile key travel.
- Rotary encoder quadrature detent feel and directional rotation on physical knob.
- Electrical continuity of external custom PCB or hand-wired matrix.
