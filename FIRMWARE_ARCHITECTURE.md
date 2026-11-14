# Firmware architecture

## QMK/VIA fragment

`qmk_firmware/grid_macro_1` is a keyboard-definition fragment. `keyboard.json` declares an RP2040 processor, VID/PID, direct pin matrix, encoder, RGB light, and layout. `config.h` sets a 10 ms debounce, four VIA dynamic layers, and a 4096-byte dynamic-keymap EEPROM address limit. The VIA keymap has ten logical positions (nine keys and encoder push); its source defaults layer 0 to `KC_NO`, while layers 1–3 include example keycodes and layer/lighting/boot/EEPROM actions.

`process_record_user` sends a 32-byte custom Raw HID event for key and encoder-push transitions, then allows ordinary keycodes through except `KC_NO` and a reserved Smart Action range. Encoder rotation also emits a Raw HID event. Thus a single physical key can produce both a host event and a firmware keyboard/media key if its stored VIA keycode is nonzero. The dynamic map is persisted by QMK/VIA, independently of Studio localStorage.

## CircuitPython alternative

`firmware/code.py` is a separate implementation with a 500 Hz loop, 10 ms debounce, direct GPIO inputs, `adafruit_hid` keyboard/consumer reports, encoder and LED handling, and JSON-lines USB CDC. It loads and saves `/keymap.json` on its board filesystem. `boot.py` configures CDC and remount policy. It is not a QMK protocol backend, and its profile persistence does not synchronize with the Electron Agent or VIA map.

## Persistence and migration risk

The pinned QMK notes warn that VIA build-date migration may reset dynamic keymaps/macros. The checked-in UF2 checksum manifest is known to mismatch the file it names; provenance must be reconciled independently. The optional two-sector lighting journal is laboratory-only and not verified with QMK compilation or a board. No firmware change or flash was made during this review.

## Validation boundary

Host-side protocol simulations can verify event framing, checksum, mappings, and source contracts. They cannot prove electrical wiring, debounce on physical switches, encoder direction, USB behavior, LED order, persistence across power loss, flash wear, or firmware migration. Record these separately in `TESTING_AND_VALIDATION.md`.
