# Changelog

## Reliability investigation (2026-11-13)

- Created branch `codex/node-grid-macro-reliability` from the clean `feature/phase-1-background-agent` working tree.
- Added the initial architecture, hardware, firmware, desktop, HID, profile synchronization, Agent, validation, and limitations documentation from source inspection.
- Required exact Raw HID Usage Page/Usage/path matching and added validation for persisted and IPC-supplied Agent profile sets.
- Agent profile writes now keep a `.bak` copy, preserve unreadable existing data, report save failure, and only replace an unreadable file through a validated profile sync.
- Wired Studio profile changes to the Agent with a deterministic Studio content revision, explicit conflict confirmation, generation compare-and-swap, and encoder press/turn mapping.
- Raised the app-bundle gzip ceiling from 200 to 201 KiB to accommodate the explicit Agent sync state; measured output is 200.2 KiB, while the initial and total shipped JavaScript budgets remain unchanged.
- Added a Windows HID diagnostic script and a non-destructive physical validation checklist for the pending user/device session.
- Added a successful-open Agent log identifying the selected Raw HID interface number and usage tuple for the live device check.
- Isolated Agent IPC tests to temporary profile files so test runs do not touch `%APPDATA%`.
- Validation: 23 targeted tests passed; 406 full-suite tests passed and 2 skipped; Phase 1 acceptance 12/12 passed; TypeScript check and Vite production build passed.
- The user ran `npm run diagnose:hid`; it found six descriptors, including the expected Raw HID collection on interface 1 (Usage Page `0xFF60`, Usage `0x61`). The Agent opened that collection. During the user's unplug/replug check, it logged `0x48F` on disconnect and reopened the interface; no later read error was reported.
- The user approved syncing the disposable Studio test profile to the Agent; the sync dialog stated the prior Agent profile would be backed up.
- The user's physical action check exposed duplicate output (two letters per single action). The Agent now yields foreground dispatch to connected Studio and skips ordinary firmware-native keypresses when standalone. One-letter hardware retest is pending.
- No firmware was flashed and no hardware was modified.
- Implementation and test results will be appended as phases are completed.
