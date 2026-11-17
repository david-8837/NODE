# NODE studio: Windows app and firmware guide

## Desktop app

Download the Windows x64 installer or portable ZIP from the [releases page](https://github.com/david-8837/NODE/releases). The installer is unsigned; download it only from the official repository. Prereleases are test builds and do not replace the latest stable release.

The Electron app provides configuration, profile import/export, device synchronization, and host-assisted actions. Full profile metadata and custom action definitions are stored on the computer, so export important profiles before migrating or removing app data. Host-assisted actions and the Cheat Sheet overlay need Studio running (it may be minimized). Terminal actions are disabled by default and require opt-in.

The Cheat Sheet displays synchronized assignments and the active device layer. On Windows it attempts a rounded live backdrop blur; where that cannot be initialized it uses a transparent fallback. Desktop composition and behavior should be checked on the target Windows machine.

## Firmware

The supported source in this repository is the [QMK/VIA keyboard fragment](qmk_firmware/grid_macro_1/), not a complete QMK checkout. It defines nine direct-pin keys, an encoder with push switch, a single RGB indicator, and four layers. The VIA keymap includes custom commands/events for profile, layer, RGB and host-assisted trigger synchronization in addition to VIA commands. Device mappings and supported profile/layer state are stored by firmware; desktop-only action definitions remain on the computer.

The [QMK notes](qmk_firmware/grid_macro_1/README.md) describe building and synchronization. Before flashing, follow the [hardware and first-flash checklist](HARDWARE_PREPARATION_CHECKLIST.md): verify the actual board revision and wiring against its schematic, keep a known-good recovery image, and verify firmware checksums. A passing compile or simulated test is not a physical hardware test.

## Development

See the [main README](README.md) for installation and automated checks. `npm run build:win` builds the Windows installer and ZIP on Windows and requires Node.js and Rust with the Windows toolchain. The build compiles the vendored MIT-licensed rounded-backdrop library using its locked Rust dependencies; its license is included in the packaged app.
