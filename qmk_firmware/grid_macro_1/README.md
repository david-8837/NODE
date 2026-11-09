# Grid Macro 1 — QMK/VIA keyboard definition

This directory is a **keyboard-definition fragment**, not a complete QMK checkout. It describes a 3×3 direct-pin key matrix, one encoder with a push switch, four dynamic-keymap layers, and an RP2040-Zero USB device (`VID 0xFEED`, `PID 0x6001`). The VIA keymap uses stock QMK/VIA commands; no Vial-only command or custom profile-storage protocol is enabled.

The definition has not been compiled in this repository: a QMK firmware checkout, QMK CLI, and the RP2040 toolchain are required. Validate it with the QMK version used for your firmware before flashing hardware.

## Build with QMK CLI

1. Install and initialize QMK using the [official QMK setup instructions](https://docs.qmk.fm/newbs_getting_started).
2. Copy this keyboard fragment into the full checkout's `keyboards` directory:

   ```sh
   cp -a /path/to/newww/qmk_firmware/grid_macro_1 ~/qmk_firmware/keyboards/
   ```

3. Build from the QMK checkout:

   ```sh
   cd ~/qmk_firmware
   qmk compile -kb grid_macro_1 -km via
   ```

   Use `-km default` to build the static default keymap instead. The VIA keymap enables dynamic keymaps and `ENCODER_MAP_ENABLE`.

4. Check QMK's build output for the generated RP2040 `.uf2`, then flash it using the RP2040-Zero BOOT/`RPI-RP2` workflow. Do not flash a build until the target and output file have been verified.

## Browser configurator bridge

The shipped embedded configurator imports `src/qmkViaBridge.ts` and uses WebHID. Connect using the status button in a Chromium-based browser (Chrome or Edge) on HTTPS or `localhost`; the browser asks for device permission from that click. The adapter filters for the VID/PID above and the QMK Raw HID collection (usage page `0xFF60`, usage `0x61`), verifies VIA protocol `0x000D`, then uses standard VIA keycode and encoder-map commands.

- The device stores only its dynamic keymap. Full configurator profiles, names, custom items, and unsupported actions stay in `localStorage` for the current browser origin/profile; they are not saved to the device and do not follow the keyboard to another browser.
- Basic HID keys, supported modifier chords, media keycodes, `TO(layer)` / `MO(layer)` targets that exist in the firmware, and encoder directions can sync. Layer switches to unavailable firmware layers, multi-step/smart actions, and unsupported key sequences are skipped and reported as sync limitations.
- The UI supports up to eight profile layers; this board declares four. Only configured layers supported by the firmware are written. Device layers outside the active profile are left unchanged, and unsupported actions are not used to erase an existing hardware mapping. An explicit blank mapping clears its key to `KC_NO`.

The WebHID adapter and fake-HID tests are source-level verification only. No full QMK build, firmware flash, real browser/device permission test, or physical USB test has been performed in this environment.
