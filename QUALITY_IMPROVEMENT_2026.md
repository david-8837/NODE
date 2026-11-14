# Macro Pad quality improvement assessment — 2026-11-12

## Initial audit and BEFORE baseline

Baseline: commit `605a93b`, version 1.0.7, Node 22.22.3 on Linux. This is a new assessment; `QUALITY_ASSESSMENT.md` contains historical baselines and should not be read as the current run. The initial audit and measurements below were completed before implementation changes for this assessment.

### Architecture and scope

- `index.html` loads `src/main.tsx`, the React application and `qmkViaBridge.ts`; profiles and custom actions are persisted locally. Electron supplies privileged operations through a preload/IPC boundary. The app's actual QMK/VIA path uses WebHID, not the separate `SerialManager` abstraction. There are also Arduino Raw HID and CircuitPython JSON/USB CDC alternatives; they are not interchangeable. No protocol change is assumed.
- QMK is a keyboard fragment with a pinned build workflow, not a complete checkout. CircuitPython and Arduino sources are separate firmware targets. No board was connected. The firmware README's Web Serial flashing instructions conflict with the app's WebHID implementation and should not be treated as verified.
- CI runs Vitest, TypeScript, bundle budgets, dependency audit, real Cppcheck (when installed), a Node heap smoke, QMK build in a separate workflow, and Windows package/smoke workflows. Existing UI tests largely use JSDOM; the packaged Electron smoke is not Playwright. The existing serial suite exercises a real SerialPort MockBinding stream and a local EventEmitter fake. Firmware simulator tests are JavaScript models, not tests of compiled firmware.
- The stress test covers 10,000 simulated key events, 1,000 profile validation operations (not actual UI profile switching), 100 fake connection cycles and deterministic malformed inputs. It is not a long-running soak or a hardware test. Electron renderer heap-smoke code exists but was not run here. `src/App.tsx` remains over 8,500 lines.

### Baseline measurements

- `npm test`: 314 passing tests in 43 files.
- `npm run lint`, `npm run build`, `npm run check:bundle`: passed. App JavaScript 194.3 KiB gzip / 200 KiB; initial JS 195.3 / 200 KiB; total shipped JS 2.41 / 2.5 MiB. Full optional icon library is 2,261.3 KiB gzip.
- `npm audit --audit-level=low`: zero reported vulnerabilities.
- `npm run audit:mem`: Node synthetic heap delta +1.31 MiB, without forced GC; noisy allocation smoke, not a leak measurement or MemLab.
- `npm run audit:cpp`: skipped, Cppcheck not installed. Python host syntax compilation of `boot.py` and `code.py` passed; no CircuitPython runtime execution. No local QMK/Arduino compilation, Windows app, browser automation or hardware test was performed.
- Confirmed by isolated in-memory reproduction: a Web Serial port connects but receives zero messages because its reader starts while state is CONNECTING; an 84,000-character batch of 4,000 valid JSON lines delivers only 780 because the buffer is truncated before complete lines are processed. These affect the standalone serial manager; the production QMK/VIA WebHID path does not use that manager.

### BEFORE scorecard

Scores are subjective evidence-based estimates, not measured defect rates. Overall is the unweighted mean of the nine categories. Changes to scores require new relevant evidence, not just a different opinion.

| Category | Before /100 | Evidence |
|---|---:|---|
| UI reliability | 75 | JSDOM integration, source contracts and Windows smoke infrastructure; no browser/desktop runtime tested in this run. |
| Application logic | 78 | Broad profiles, gestures and sync tests; large stateful app and no physical end-to-end confirmation. |
| USB Serial reliability | 53 | MockBinding and protocol tests, but reproduced Web Serial reader and burst loss defects; separate from actual VIA path. |
| Firmware stability | 60 | QMK build workflow and simulated input coverage, but no local compiler or hardware validation. |
| Memory management | 57 | Synthetic Node smoke; packaged renderer heap checks exist but not executed here. |
| Performance | 65 | Budgets pass; initial JS within 5 KiB of limit; no latency traces. |
| Code quality | 60 | Typed modules and security boundaries, but large application and multiple firmware transports/docs. |
| Security | 75 | IPC security tests and clean dependency audit; privileged actions remain sensitive. |
| Test coverage | 76 | 314 passing automated tests, mostly unit/integration/simulation; browser, actual firmware and physical-device gaps. |
| **Overall** | **67** | Rounded arithmetic mean (599 / 9 = 66.6). |

### Tool compatibility and integration policy

Playwright (Apache-2.0) is appropriate for real browser/Electron interaction but is not currently installed; browser binaries may require network hosts outside this sandbox. Vitest (MIT), SerialPort and Binding Mock (MIT) are already installed and fit the TypeScript tests. Unity (MIT) and Ceedling (MIT) require a meaningful host-testable C seam and build toolchain; the current QMK/Arduino code is embedded in hardware frameworks. Cppcheck (GPL-3.0) is a standalone optional binary, absent locally; CI installs it. MemLab (MIT; the supplied `memlab/memlab` repository returned 404, with `meta/memlab` used for license verification) requires compatible browser automation and is not the existing synthetic audit. AFL++ (GitHub reports AGPL-3.0; individual components may differ) requires an actual host-testable native parser and instrumentation. GitHub Actions workflows already exist. Tools are references or development tools, not copied into the shipped product; third-party licenses must still be checked if code is incorporated.

## Confirmed issues and improvements

1. **Web Serial startup:** a non-Node port with `readable === null` was not opened; and the reader loop was started before the state changed to CONNECTED, so it exited without reading. The manager now opens an unopened Web Serial port, starts the reader after connection and decodes fragmented UTF-8. End-of-stream causes disconnect, and explicit disconnect cancels the reader before closing. Tests use Web Streams, not a real browser device.
2. **Serial batch loss and oversized frames:** previously the 64 KiB limit truncated whole chunks before parsing. A baseline reproduction delivered 780 of 4,000 valid messages. Complete lines are now processed before limiting an individual unfinished line; a line over 64 KiB is discarded through its newline before accepting the next frame. Regression delivers 4,000 of 4,000. This limit can reject previously accepted oversized individual lines; it does not change wire format. Check actual supported config sizes before relying on this standalone adapter.
3. **Node serial listener lifecycle:** reused ports retained callbacks, duplicating delivery and allowing stale events. Connection listeners are detached, while the error handler remains long enough for outstanding writes to settle; MockBinding caught a late `Write canceled` error during development and the final regression covers it. Reconnection and UTF-8 handling are also tested with synthetic streams.
4. **Cppcheck compatibility:** actual Cppcheck 2.17.1 initially failed with an informational branch-limit diagnostic under `--error-exitcode`. The existing audit now enables exhaustive mode when supported, preserving compatibility with older CI versions. It still fails on reported findings; no finding was suppressed.
5. **Unsafe firmware documentation/provenance:** `firmware/SHA256SUMS.txt` names `grid_macro_1_via.uf2` with digest `9972aed247f693ba369194eb5b981ff58b45611f8038c19550f3bfe576da2039`; the file actually hashes to `0f1a86d8039e943718da057bef4079f31d1d19448105d15a3abccbfc831bd395`, while `grid_macro_1_via_rawhid.uf2` matches the manifest digest. The mismatch remains unresolved: do not flash either based on this manifest. Documentation now warns about it, corrects the Web Serial/VIA transport claims, and no binaries or checksum files were modified. Rebuild and verify provenance against trusted hardware/firmware source before flashing.

The new serial tests run under the existing Vitest CI job; no application or firmware protocol was replaced. No new runtime dependency was added. Cppcheck 2.17.1 (GPL-3.0) was built from its GitHub source outside the repository and used as a standalone tool; no source was copied into the product. Existing tests include `@serialport/binding-mock` 10.2.2 and `serialport` 13 (MIT). GitHub metadata reports AFL++ AGPL-3.0, so review its component licenses before distributing it. Playwright, Unity/Ceedling, MemLab and AFL++ were not run or integrated: a compatible browser installation, Ruby/firmware toolchain, and suitable real host-testable firmware seams respectively were not available during this run. The CI workflows were inspected but not executed on GitHub in this assessment.

## AFTER validation and coverage

- `npm test`: **322 passing tests across 44 files**, versus 314 / 43 before. Includes eight additional serial regressions, one using real SerialPort MockBinding; all are simulated.
- `npm run lint`, `npm run build`, `npm run check:bundle`: passed. `npm audit --audit-level=low`: zero known reported vulnerabilities.
- `CPPCHECK_BIN=/tmp/macro-cppcheck/cppcheck npm run audit:cpp`: passed using Cppcheck 2.17.1, exhaustive mode, with missing framework includes suppressed. This is partial static analysis, not compilation or a proof of firmware safety. `CPPCHECK_BIN` is local to this sandbox; CI installs its own analyzer.
- `npm run test:stress`: four passing simulated tests: 10,000 modeled key events, 1,000 validations of generated profiles (not profile switches), 100 connection cycles, and randomized/malformed simulated inputs. New burst regression separately processes 4,000 serial frames. No sustained long-duration communications or repeated real window operations were run.
- TypeScript/JSDOM tests exercise startup rendering, navigation, assignment, layer/profile handling, import/export, invalid profile data, and mock device sync. Shutdown was exercised only through test cleanup, not a real packaged app. WebHID uses fake devices; serial connection, close, reconnect, timeout, malformed, fragmentation and rapid-input checks are mocks, not real USB detection/permissions.
- Firmware key scanning, debounce, encoder direction, RGB and layer behavior are checked primarily through JavaScript models and source contracts, not on-target C execution. CircuitPython host syntax passed; configuration/parsing and raw HID behavior are simulated. Actual board tests, on-device memory/stability, local QMK/Arduino builds, real Playwright browser/Electron tests, Unity/Ceedling firmware tests, MemLab and AFL++ were not performed.
- Bundle sizes are unchanged (194.3 KiB app, 195.3 KiB initial, 2.41 MiB total). The standalone serial module is not in the production QMK UI bundle. Synthetic Node heap delta was +1.35 MiB after versus +1.31 MiB before; without forced GC and with only one run each, this is noise and no memory improvement or leak conclusion is justified.

## BEFORE / AFTER comparison

| Category | Before | After | Improvement | Evidence |
|---|---:|---:|---:|---|
| UI reliability | 75 | 75 | 0 | No real-browser/desktop testing added. |
| Application logic | 78 | 78 | 0 | No changes to main application logic. |
| USB Serial reliability | 53 | 60 | +7 | Reproduced reader/batch defects fixed and tested with Web Streams and MockBinding; still no real serial device, and this adapter is separate from production VIA. |
| Firmware stability | 60 | 60 | 0 | Static analysis ran but no firmware execution or hardware validation; checksum provenance remains unresolved. |
| Memory management | 57 | 57 | 0 | No meaningful before/after leak measurement. |
| Performance | 65 | 65 | 0 | Bundle unchanged; no representative UI/device performance benchmark. |
| Code quality | 60 | 60 | 0 | Targeted cleanup only; large app remains. |
| Security | 75 | 75 | 0 | Audit remains clean; no independent security review. |
| Test coverage | 76 | 78 | +2 | Eight serial tests and a real but partial Cppcheck run; major end-to-end gaps remain. |
| **Overall** | **67** | **68** | **+1** | Rounded unweighted mean: 599/9 before, 608/9 after. |

## Remaining priorities

1. Reconcile both UF2 binaries with trusted build artifacts, hashes and board identity; obtain physical board validation before flashing or distributing as production firmware. The legacy `scripts/fetch-and-verify-firmware.mjs` contains machine-specific paths and writes a downloaded file without checking the artifact manifest; do not use it as verification.
2. Run packaged Electron/Playwright startup, shutdown, navigation, assignment, profile switching and import/export tests on a supported Windows runner; run an actual renderer memory soak and, if suitable, MemLab.
3. Extract a small, unchanged-protocol firmware parser/scanning seam only with appropriate hardware-owner approval, then run Unity/Ceedling and instrument that actual C/C++ code for AFL++; compile the actual targets and exercise RGB, encoder, debounce, persistence and recovery on the real board.
4. Run genuine long-duration USB communication, repeated window lifecycle and 1,000 actual UI profile-switch tests, and measure resource/latency behavior before claiming improvements.
5. Clarify whether SerialManager is intended for a supported production firmware; its JSON/CDC path and QMK's WebHID/VIA path are different. Test disconnect during an in-flight connect and OS-level device discovery on relevant platforms.
