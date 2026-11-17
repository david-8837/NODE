# Grid Macro 1 — QMK/VIA keyboard definition

This directory is a **keyboard-definition fragment**, not a complete QMK checkout. It describes nine direct-pin keys, one encoder push switch, one rotary encoder, a single RGB indicator, four dynamic keymap layers, and an RP2040-Zero USB target (`VID 0xFEED`, `PID 0x6001`). Verify actual board wiring and recovery procedures before flashing; see the [hardware checklist](../../HARDWARE_PREPARATION_CHECKLIST.md).

## Hosted build

The [QMK firmware workflow](../../.github/workflows/qmk-build.yml) pins QMK firmware to commit `d194c077ed964195ec16d255c7a4b89a794cf03b` and QMK CLI to `1.2.0`. It compiles `via` and `default` keymaps, checks the UF2 outputs, and publishes build provenance and a checksum with the VIA artifact. Toolchain and runner updates mean byte-identical builds are not guaranteed.

## Build locally

Install QMK CLI `1.2.0` in a virtual environment and initialize a full QMK checkout. Check out the pinned QMK commit, set up the toolchain, and copy this directory to `keyboards/grid_macro_1` in that checkout. Then, from the QMK checkout:

```sh
/path/to/NODE/qmk_firmware/grid_macro_1/build_uf2.sh via
/path/to/NODE/qmk_firmware/grid_macro_1/build_uf2.sh default
```

The script prints the source and toolchain versions and SHA-256. Set `QMK_FIRMWARE_REF=d194c077ed964195ec16d255c7a4b89a794cf03b` to reject a different QMK checkout. Compilation and a non-empty UF2 are not evidence of physical board operation.

## Synchronization and safety

The VIA keymap implements stock VIA key/encoder mapping along with Micro Pad custom commands and events for layer, profile, RGB and host-assisted triggers. Supported device mappings and state are stored by the firmware. Full profile metadata and custom action definitions remain in local browser/app storage and do not follow the board to another computer. Studio must be running for host-assisted actions; it may be minimized.

The application backs up the existing device keymap before synchronizing and blocks writes if the required read or backup fails. Test backup and restore with the target device before relying on it. Unsupported mappings are reported rather than assumed to work. Browser access uses WebHID in a supported Chromium browser on HTTPS or localhost.

Host-compiled firmware tests and simulated HID tests exercise logic and protocol framing, but do not verify electrical wiring, USB behavior or actual key and encoder operation on a board. Record physical test results for the exact hardware and firmware build.
