# Grid Macro 1 — QMK/VIA keyboard definition

This directory is a **keyboard-definition fragment**, not a complete QMK checkout. It describes a direct-pin key matrix with nine keys and one encoder push switch, one rotary encoder, four dynamic-keymap layers, and an RP2040-Zero USB target (`VID 0xFEED`, `PID 0x6001`). The VIA keymap uses stock QMK/VIA commands; no Vial-only command or custom profile-storage protocol is enabled.

## Reproducible hosted build

`.github/workflows/qmk-build.yml` pins QMK firmware to commit `d194c077ed964195ec16d255c7a4b89a794cf03b`, QMK CLI to `1.2.0`, the GitHub Actions by commit SHA, and the runner release to Ubuntu 22.04. It compiles both the `via` and `default` keymaps, verifies that each expected UF2 is non-empty, then uploads the VIA UF2 with `SHA256SUMS.txt` and `BUILD-INFO.txt`. The provenance records the repository/QMK commits, run, compiler, installed apt/Python package versions, and binary checksum. Ubuntu's hosted image and apt package repository are still updated over time; capturing exact package versions makes each run traceable, but byte-for-byte reproducibility is not claimed until the compiler/toolchain packages are fully immutable.

The previously successful hosted build [run 42662058460](https://github.com/david-8837/newww/actions/runs/42662058460) used the earlier workflow that cloned the moving QMK `master` branch. It is historical compile/artifact evidence, not proof that this newly pinned workflow has run. The first successful run of the pinned workflow should be used as the current release artifact. Artifacts are retained for seven days; download the `grid-macro-1-via-firmware` artifact from that run and verify its SHA-256 before flashing. No UF2 is committed to this repository.

## Build locally

1. Install QMK CLI `1.2.0` in a virtual environment and initialize a full QMK checkout. To match the hosted source, check out the pinned firmware commit:

   ```sh
   python3 -m venv .venv
   . .venv/bin/activate
   python -m pip install qmk==1.2.0
   git clone https://github.com/qmk/qmk_firmware.git ~/qmk_firmware
   cd ~/qmk_firmware
   git checkout --detach d194c077ed964195ec16d255c7a4b89a794cf03b
   qmk setup
   ```

2. Install this keyboard fragment in the full checkout:

   ```sh
   cp -a /path/to/newww/qmk_firmware/grid_macro_1 ~/qmk_firmware/keyboards/
   ```

3. Build and record provenance from the QMK checkout:

   ```sh
   cd ~/qmk_firmware
   /path/to/newww/qmk_firmware/grid_macro_1/build_uf2.sh via
   /path/to/newww/qmk_firmware/grid_macro_1/build_uf2.sh default
   ```

   The script prints the QMK commit, CLI/compiler version, and SHA-256. Set `QMK_FIRMWARE_REF=d194c077ed964195ec16d255c7a4b89a794cf03b` to make it reject a different QMK checkout. Expected outputs are `.build/grid_macro_1_via.uf2` and `.build/grid_macro_1_default.uf2`.

Compilation and a non-empty UF2 are not board validation. Confirm the intended target/revision and recovery procedure before flashing.

## Browser configurator and data safety

The shipped embedded configurator loads `src/qmkViaBridge.ts` and uses WebHID. Connect from a Chromium-based browser (Chrome or Edge) on HTTPS or `localhost`; permission is requested from the explicit Connect button. The adapter filters for VID/PID above and the QMK Raw HID collection (usage page `0xFF60`, usage `0x61`), then verifies VIA protocol `0x000D`.

- Complete profiles, profile names, custom items, and unsupported actions are stored in this browser's `localStorage`; they are not stored on the keyboard and do not follow the device to another browser/origin. Profile JSON Import/Export is a browser file operation.
- Before any automatic profile-to-device write, the app reads the supported dynamic key and encoder maps with stock VIA GET commands and saves a pre-sync snapshot to a bounded browser-local history. If the read or local save fails, the app pauses the device write. Settings can download a backup JSON; restoring one requires a user confirmation and a connected device, then reads and saves the current keymap locally before issuing any restore writes. A failed read or local save blocks restore.
- Device backups contain key and encoder mappings only. They use standard VIA keycode/encoder-map SET commands on restore; the bridge does not send custom firmware commands or persist profile JSON on-device.
- Basic HID keys, supported modifier chords, media keycodes, `TO(layer)` / `MO(layer)` targets present in firmware, and encoder maps can sync. Smart/multistep actions, unsupported sequences, and unavailable layer targets are skipped with warnings. Explicit blank assignments clear to `KC_NO`.
- The configurator supports up to eight profile layers; this board declares four. Higher device layers are left unchanged and are called out in warnings/backups.

Fake-HID tests verify command framing, supported keycode translation, read-only snapshots, restore behavior, and failure gates. They are not a physical USB, firmware-flash, or real-browser permission test. No schematic or physical board was available for the current work; see `HARDWARE_PREPARATION_CHECKLIST.md` before flashing or claiming device operation.
