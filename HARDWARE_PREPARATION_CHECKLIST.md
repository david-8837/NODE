# Grid Macro 1 pre-hardware and first-flash checklist

This checklist is for the **QMK/VIA HID** target. It separates repository/host checks from work that can only be completed with the real board. The checkout contains no schematic and no physical hardware was available for this work; all board wiring, pin assignment, USB enumeration, and on-device behavior remain **unverified** until the hardware steps below are completed.

## Before connecting or flashing a board

- [ ] Record the board revision and confirm it uses the intended RP2040-Zero MCU and bootloader.
- [ ] Obtain the schematic or an authoritative wiring table. Compare it against `qmk_firmware/grid_macro_1/keyboard.json` and `config.h`; do not infer electrical wiring from the firmware definition alone.
- [ ] Confirm the 3×3 switch matrix and encoder push switch really connect to the declared direct pins (GP0–GP8 and GP11), and that encoder A/B and the WS2812 data line match GP9/GP10 and GP16. Verify GPIO voltage, LED power/current, ground, and any required series resistor/level shifting from the actual schematic.
- [ ] Confirm the board USB identity is intended to be VID/PID `0xFEED:0x6001`, that QMK exposes Raw HID usage page `0xFF60`, usage `0x61`, and that the firmware reports VIA protocol `0x000D`.
- [ ] Confirm a known recovery path: BOOT button / `RPI-RP2` drive procedure and a known-good firmware image for this exact board revision.
- [ ] Export important browser profiles/custom actions to JSON. Profiles remain local to the browser origin; they are not stored in the keyboard.
- [ ] If the device already has mappings, connect in the configurator and verify a pre-sync keymap snapshot appears in Settings. Download that backup JSON to storage outside this browser before intentionally replacing the device map.

## Build and artifact provenance

- [x] Run the `QMK firmware build` GitHub Actions workflow and confirm both `via` and `default` compile jobs pass ([run 42731355502](https://github.com/david-8837/newww/actions/runs/42731355502)).
- [ ] Download the `grid-macro-1-via-firmware` artifact from the exact Actions run being evaluated.
- [ ] Verify `SHA256SUMS.txt` against `grid_macro_1_via.uf2` before flashing.
- [ ] Confirm `BUILD-INFO.txt` records the repository commit, pinned QMK firmware commit, QMK CLI version, Ubuntu release, installed apt/Python package versions, ARM compiler, run ID, and artifact SHA-256.
- [ ] Keep the artifact and build provenance together. Do not use a UF2 from a different board/firmware revision.

## First boot and physical I/O checks

Perform these only after the electrical mapping has been checked against the schematic:

- [ ] Flash the VIA UF2 using the documented RP2040 bootloader workflow; record the board revision, image hash, date, and operator.
- [ ] Confirm normal boot and the expected USB VID/PID / Raw HID interface in the OS. Confirm a bootloader recovery still works.
- [ ] In Chrome or Edge over HTTPS/localhost, test WebHID permission grant, permission cancellation, explicit disconnect, physical unplug, reconnect, and unsupported-protocol reporting.
- [ ] Confirm Settings and the header report the same live device/firmware status; disconnected state must not claim a device is connected.
- [ ] Read the device keymap before writes. Verify the local browser backup is saved; deliberately simulate a read/storage failure and confirm the app refuses to sync.
- [ ] Test each of the nine physical keys individually and in combinations. Verify row/column mapping, bounce behavior, and no phantom keys.
- [ ] Test encoder clockwise, counter-clockwise, and push switch separately. Confirm direction matches the product label and the VIA encoder map.
- [ ] Test all supported VIA layers, blank-key clearing, repeated unchanged sync (no unnecessary writes), and recovery by restoring the downloaded pre-sync backup. Confirm the current device map is saved locally before restore writes begin.
- [ ] Verify unsupported smart/multistep actions are skipped with a clear warning and do not erase existing mappings; test layer targets outside firmware capacity.
- [ ] Test RGB/WS2812 operation and board power/thermal behavior under expected brightness. Confirm no brownout or USB instability.
- [ ] Build/flash the `default` keymap separately if that mode is a supported recovery/product configuration.
- [ ] Record pass/fail, firmware hash, OS/browser versions, logs, and any wiring corrections. Re-run the relevant checks after a board revision or pin-map change.

## Not yet verified by this repository work

- No schematic or board was inspected; the pin assignments above are code declarations, not verified wiring.
- No firmware was flashed or run on a physical board.
- No physical key, encoder, RGB, USB identity, bootloader, VIA communication, or WebHID permission flow was exercised.
- Automated fake-HID tests validate software framing/translation only. A hosted compiler success and non-empty UF2 do not establish electrical or device correctness.
