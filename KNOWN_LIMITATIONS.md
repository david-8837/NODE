# Known limitations

## Source review limitations

- No schematic, board revision, live firmware version/configuration, or physical electrical test was available. Windows HID listing and one Agent open/error/reopen sequence were supplied; stable reads and controlled reconnect remain unverified.
- Browser/Electron-origin `localStorage` and `%APPDATA%\NODE\profiles.json` are not part of the repository. They were not backed up or modified during the source investigation.
- The Agent IPC test initially attempted the default profile path and received `EPERM`; it did not alter the file. All Agent IPC tests now use temporary profile files. The live Studio/Agent profiles therefore still need an external backup before the user's next configuration session.
- The current repo's QMK firmware directory is a keyboard fragment, not a complete QMK checkout.
- The checked-in QMK firmware provenance notes document a checksum/name mismatch and warn that VIA migration may reset dynamic keymaps/macros.
- The optional per-layer lighting flash journal is laboratory-only and unvalidated; its partition assumptions must not be used for a production flash.

## Product limitations identified

- Full Studio profile, Agent executable profile, QMK dynamic keymap, and CircuitPython config are separate stores.
- Smart Actions and Multi Actions are host-side and need the Agent plus an active Windows session. Firmware keycodes can continue to execute separately.
- Stock VIA synchronization does not transfer custom actions or profile metadata.
- Current volatile RGB settings may not survive power loss.
- The Agent HID descriptor match and corrupt-profile fallback were source-level defects at review start; both are now repaired and covered by regression tests on this branch.

The source-level HID filter and Agent profile overwrite hazards have been repaired on the review branch. Studio-to-Agent profile sync is now wired with revision confirmation and generation compare-and-swap. The Agent lifecycle/connection-state model remains incomplete.

- Studio-to-Agent sync has profile-conversion and Agent IPC tests, but the full Electron main/preload/React handshake has not yet been exercised in a running desktop window.
- Agent HID errors still close the handle immediately, reconnect state remains a boolean, and Named Pipe request schemas/line size need hardening.
- Agent startup-at-login and Windows sleep/resume behavior still need host validation.

## Validation limitations

Any automated or simulated result in `TESTING_AND_VALIDATION.md` must be kept distinct from Windows device validation and physical board tests. No firmware flash, EEPROM erase, factory reset, or destructive recovery was performed or authorized by this review.
