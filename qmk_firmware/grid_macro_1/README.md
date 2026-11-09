# Grid Macro 1 — QMK/VIA keyboard definition

This directory is a **keyboard-definition fragment**, not a complete QMK checkout. It describes a 3×3 direct-pin key matrix, one encoder with a push switch, four dynamic-keymap layers, and an RP2040-Zero USB device (`VID 0xFEED`, `PID 0x6001`). The VIA keymap uses stock QMK/VIA commands; no Vial-only command or custom profile-storage protocol is enabled.

## Latest hosted build

The VIA firmware compiled successfully in [GitHub Actions run 42660825626](https://github.com/david-8837/newww/actions/runs/42660825626), for source commit `2dab75256d7ac3585060162322e819e481e5aa67`. The workflow cloned QMK `master`, ran `qmk compile -kb grid_macro_1 -km via`, verified that `.build/grid_macro_1_via.uf2` was non-empty, and uploaded the artifact **`grid-macro-1-via-firmware`** with a seven-day retention period.

To download it, open the Actions run above, select the `grid-macro-1-via-firmware` artifact, and extract `grid_macro_1_via.uf2`. The compiled binary is not committed to this repository. The sandbox could not retrieve a local copy of the Actions artifact, so no UF2 is present in this checkout. Compilation and non-empty-file verification do not prove that the firmware has been flashed or tested on a physical board. The workflow follows the moving QMK `master` branch, so future builds may use a different QMK revision.

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

4. Check the build output for `.build/grid_macro_1_via.uf2`; before flashing, verify the target and follow the RP2040-Zero BOOT/`RPI-RP2` workflow.

## Browser configurator bridge

The shipped embedded configurator imports `src/qmkViaBridge.ts` and uses WebHID. Connect using the status button in a Chromium-based browser (Chrome or Edge) on HTTPS or `localhost`; the browser asks for device permission from that click. The adapter filters for the VID/PID above and the QMK Raw HID collection (usage page `0xFF60`, usage `0x61`), verifies VIA protocol `0x000D`, then uses standard VIA keycode and encoder-map commands.

- The device stores only its dynamic keymap. Full configurator profiles, names, custom items, and unsupported actions stay in `localStorage` for the current browser origin/profile; they are not saved to the device and do not follow the keyboard to another browser.
- Basic HID keys, supported modifier chords, media keycodes, `TO(layer)` / `MO(layer)` targets that exist in the firmware, and encoder directions can sync. Layer switches to unavailable firmware layers, multi-step/smart actions, and unsupported key sequences are skipped and reported as sync limitations.
- The UI supports up to eight profile layers; this board declares four. Only configured layers supported by the firmware are written. Device layers outside the active profile are left unchanged, and unsupported actions are not used to erase an existing hardware mapping. An explicit blank mapping clears its key to `KC_NO`.

The bridge and fake-HID tests are source-level verification. The hosted build verifies the QMK compile and a non-empty UF2 artifact, but no firmware flash, physical USB test, or real-browser WebHID permission/device test has been performed.
