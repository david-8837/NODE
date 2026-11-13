# Grid Macro 1 — QMK/VIA keyboard definition

This directory is a **keyboard-definition fragment**, not a complete QMK checkout. It describes a direct-pin key matrix with nine keys and one encoder push switch, one rotary encoder, four dynamic-keymap layers, and an RP2040-Zero USB target (`VID 0xFEED`, `PID 0x6001`). The VIA keymap supports standard VIA configuration and also sends custom raw-HID input event reports; no Vial-only command or custom profile-storage protocol is enabled.

## Reproducible hosted build

`.github/workflows/qmk-build.yml` pins QMK firmware to commit `d194c077ed964195ec16d255c7a4b89a794cf03b`, QMK CLI to `1.2.0`, the GitHub Actions by commit SHA, and the runner release to Ubuntu 22.04. It compiles both the `via` and `default` keymaps, verifies that each expected UF2 is non-empty, then uploads the VIA UF2 with `SHA256SUMS.txt` and `BUILD-INFO.txt`. The provenance records the repository/QMK commits, run, compiler, installed apt/Python package versions, and binary checksum. Ubuntu's hosted image and apt package repository are still updated over time; capturing exact package versions makes each run traceable, but byte-for-byte reproducibility is not claimed until the compiler/toolchain packages are fully immutable.

The pinned workflow passed in [run 42731355502](https://github.com/david-8837/newww/actions/runs/42731355502) for repository commit `cdc6e41eca8e9b9607dbf36eba90f25c2505df59`: both `via` and `default` compiled, non-empty UF2s were verified, and the VIA artifact was uploaded. Artifact **`grid-macro-1-via-firmware`**, ID `13723834419`, is 30,132 bytes as a ZIP and has GitHub archive digest `sha256:7a8f531baeeea5ec98b14815bdc60fcd77a935bf3fd8f89b2883fb942180fbcc` (archive digest, not the UF2 checksum). The artifact expires after seven days. Its `SHA256SUMS.txt` contains the individual UF2 checksum and `BUILD-INFO.txt` contains provenance. The sandbox could not fetch the artifact ZIP because the external storage request ended with EOF, so no local UF2/checksum copy was obtained. The repository now contains UF2 files in `firmware/`. The checked-in manifest names the standard VIA file but its checksum fails for that file and matches the separately named raw-HID file. Treat both binary provenance and names as unverified until independently reconciled; do not replace the manifest merely to silence the mismatch.

The earlier hosted build [run 42662058460](https://github.com/david-8837/newww/actions/runs/42662058460) used the workflow that cloned the moving QMK `master` branch; it is historical and superseded by the pinned run above.

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
- Before any automatic profile-to-device write, the app reads the supported dynamic key and encoder maps with stock VIA GET commands and saves a pre-sync snapshot to a bounded browser-local history. If the read or local save fails, the app pauses the device write. When synchronization is paused, the warning can download a backup JSON or restore one from a file. Restore requires explicit confirmation and a connected device, then reads and saves the current keymap locally before issuing any restore writes. A failed read or local save blocks restore.
- Device backups contain key and encoder mappings only. They use standard VIA keycode/encoder-map SET commands on restore; the bridge does not send custom firmware commands or persist profile JSON on-device.
- Basic HID keys, supported modifier chords, media keycodes, `TO(layer)` / `MO(layer)` targets present in firmware, and encoder maps can sync. Smart/multistep actions are desktop-handled and use `KC_NO` on the device, so they cannot run when the app is fully exited. Unsupported sequences and unavailable layer targets are skipped with warnings. Explicit blank assignments clear to `KC_NO`.
- The configurator supports up to eight profile layers; this board declares four. Higher device layers are left unchanged and are called out in warnings/backups.

Fake-HID tests verify command framing, supported keycode translation, read-only snapshots, restore behavior, and failure gates. They are not a physical USB, firmware-flash, or real-browser permission test. No schematic or physical board was available for the current work; see `HARDWARE_PREPARATION_CHECKLIST.md` before flashing or claiming device operation.

## Onboard LED and desktop cheat sheet

The VIA keymap no longer forces a layer color at startup or on layer changes. The
app can explicitly apply Off, Solid, Breath or Rainbow to the one GP16 WS2812
using the standard VIA RGBLIGHT channel. The settings apply globally, not per
layer. The app uses volatile (no-EEPROM) writes and verifies the returned values;
the LED returns to its firmware-saved/default configuration after power loss.
There is no automatic LED write at app startup or reconnect. A failed or partially
completed update is reported; it may leave the volatile LED configuration partly
changed. The updated firmware is needed to prevent older layer-color callbacks
from replacing the selected effect. Flashing firmware carries risk to existing
configuration; back up the keymap first and follow the recovery checklist. Snake,
Gradient, external backlight, Magic and Speed controls are reserved for later.

The Windows desktop cheat sheet uses a separate transparent always-on-top window,
without bringing the full configurator forward. The app must remain running and
the pad connected for a mapped hardware button to trigger it. The overlay shows assigned key icons and home-screen key labels from the current layer with fallback symbols; unassigned
slots appear as small dots, and switching layers still happens through the device. It is
click-through and can be closed with the mapped toggle action or global shortcut. Windows secure desktop,
exclusive fullscreen applications and other topmost windows may prevent it from
appearing above them. Hardware and actual Windows overlay behavior require testing.

### Color calibration and per-layer persistence investigation

On the reported RP2040-Zero running v1.0.14, an applied red produced green,
 green produced red, and blue produced blue. The app compensates by swapping
red and green before sending the standard VIA HSV values. This is based on that
physical test; other board/LED variants may differ. Do not also change the
firmware WS2812 byte order without removing the desktop compensation. Rainbow
is firmware-generated, so this desktop color correction does not calibrate its
color sequence.

Per-layer persistent lighting is **not implemented**. A portable experimental
two-slot journal, layer controller, and versioned command protocol exist with
simulated tests. The app bridge can probe and perform guarded writes against this experimental
protocol; it checks a device signature, captures the prior four-layer state,
requires compare-and-swap and verifies read-back. No UI invokes these methods.
A laboratory-only opt-in adds QMK hooks and proposes two 4 KiB sectors before
QMK's 8 KiB wear-leveling store on a 2 MiB RP2040. It refuses unexpected sector
contents and uses separate pages for staging and commit. Normal builds leave this
code disabled. This layout and the linker limit have only been tested in a host
simulation, not compiled with QMK or tested on hardware. The build-date VIA reset
and migration issue remains unresolved; do not flash a laboratory build. The pinned QMK VIA
implementation places dynamic keymaps immediately after VIA custom configuration;
increasing `VIA_EEPROM_CUSTOM_CONFIG_SIZE` would move the existing keymap and
encoder locations, while the remaining EEPROM range is available to dynamic
macros. It is not safe to assume unused space. In addition, QMK's VIA magic is
based on firmware build date, and a mismatch invokes `eeconfig_init_via`, which
resets dynamic keymaps and macros. A firmware update may therefore reset device
configuration. Back up both keymaps and any VIA macros before flashing; the
app's existing keymap backup does not include VIA macros. Do not silently apply
or migrate per-layer settings until a versioned layout, complete backup and
verified restore/migration and failure recovery have been implemented and tested.

### VIA macro backup and experimental restore

The Device update panel can download raw VIA macro bytes separately from the
keymap and application profile backups. If a device reports an interrupted macro
write, a known-good macro backup can be restored only after a separate warning
and confirmation. The incomplete buffer is saved as a diagnostic, not a valid
rollback file. If that recovery fails, macros may remain disabled. Verify downloaded files independently;
local browser storage is not a substitute for an external backup. The experimental
restore validates the file, saves a local recovery snapshot of macros and keymap,
reads back writes, and attempts rollback on failure. The recovery file includes
keymap data, but the macro restore only restores macros; use the separate keymap
restore for keymaps. Keep backups of profiles and settings separately too.

QMK's macro buffer is not atomic. An interrupted write or power loss can prevent
rollback, and a local recovery copy can disappear on reinstall or storage clearing.
Fake-HID tests do not validate physical devices or firmware migrations. Do not
flash firmware relying on this experimental feature alone.
