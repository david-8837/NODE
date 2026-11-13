# Testing and validation

## Baseline evidence

The repository has Vitest coverage for profile files, QMK/VIA mapping, Agent IPC, Agent supervisor behavior, HID/USB protocol helpers, action execution, device sync safety, and simulated firmware. `package.json` provides `npm test`, `npm run lint`, `npm run build`, and `npm run test:phase1`. These are source-level test targets; they do not prove physical USB behavior.

## Reliability review results (2026-11-13)

- Targeted: Agent profile conversion, Agent safety, Agent IPC, protocol, and QMK profile mapping suites passed (23 tests).
- Full suite: 60 files passed, 1 skipped; 406 tests passed, 2 skipped.
- Phase 1 acceptance: 12/12 checks passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run check:bundle`: passed at 200.2 KiB app gzip against the adjusted 201 KiB ceiling (initial bundle and total shipped JavaScript remain within their original budgets).
- Windows HID enumeration: user ran `npm run diagnose:hid`; six descriptors were reported and exactly one matched the expected Raw HID usage (`MI_01`, `0xFF60/0x61`). In a live Agent run, the initial open emitted `0x48F` and was rediscovered; a later controlled unplug emitted the same expected error and reconnect reopened interface 1. The user reports no further error after the final open while idle; the idle duration was not timed, and the cause of the initial error remains unverified.
- Physical hardware/Windows action validation: not run.

## Review validation plan

| Validation class | Examples | Status in this review |
| --- | --- | --- |
| Unit tests | HID candidate filtering; Agent profile validation/persistence; VIA translation | To run per implementation phase |
| Integration tests | Electron ↔ pipe ↔ Agent; Studio profile sync; Agent restart | Existing partial coverage; verify gaps |
| Simulated hardware | Fake HID report framing, timeout, reconnect, duplicate events | Safe to run without board; report separately |
| Windows host tests | Device path/collection, unplug/replug, sleep/resume | Requires the target Windows host/device session |
| Physical hardware tests | Key matrix, encoder, LED, persistence, firmware migration | Not performed; no board available |

## Acceptance records

For each command, record command, date, exit code, and limitations. A passing fake-HID test is not a passing physical hardware test. Do not claim production readiness from automated tests alone. Never flash as part of an automated test.

## Prepared Windows device session

No firmware flash is needed for these checks. With the current device connected, the user should run `npm run diagnose:hid` from the repository root and share the VID/PID-filtered interface listing. It reports Usage Page, Usage, interface number, product, and path so the selected `0xFF60/0x61` collection can be confirmed. Then:

1. Start the Background Agent and Studio, verify one connected Raw HID owner, and confirm Studio reports profile sync complete after approving any displayed profile conflict.
2. Unplug and reconnect the pad; verify Agent reconnect and a single test key event. Do not alter firmware or mappings for this check.
3. Close Studio while leaving the Agent running; verify a configured Smart Action and Multi Action execute once. Repeat with Studio open and compare behavior.
4. Reopen Studio and confirm the saved profile is displayed and the Agent revision matches. Compare each ordinary key with the current VIA dynamic keymap and note any firmware-only keycodes.
5. If sleep/resume is in scope, test it in the active Windows user session and capture Agent logs/state before and after.

Record actual firmware version, physical board revision, test date, and results. These checks do not authorize flashing, EEPROM erase, factory reset, or partition changes.
