# Macro Pad Comprehensive Quality Assessment

> **Historical report, not the current release checklist.** This assessment is based on commit `827202f` on an older branch. Some findings have since changed, and its hosted-run links point to historical `david-8837/newww` runs; do not use them as evidence for a current NODE release. See `WINDOWS_APP_AND_FIRMWARE_GUIDE.md` and `HARDWARE_PREPARATION_CHECKLIST.md` for current release-validation requirements.

## Assessment scope

**Baseline point:** branch `arena/0e57631b-newww`, commit `827202f` (the existing state before changes for this assessment). This baseline already includes the earlier 3×3 + encoder layout, shipped-UI fixture, same-origin native-action check, and CI bundle/audit gates; “Before” does not mean the repository’s original upstream state.

The requested UI is treated as the visual baseline. `index.html` remains the served entry. No firmware was connected during this assessment. All findings below distinguish observed runtime behavior from code inspection and simulation. This is a historical baseline snapshot; current entry-point and bundle follow-ups are recorded in Section 8.

## 1. Initial project audit

### Repository and data flow

- **Served renderer at the audit baseline (`827202f`):** Vite served an embedded renderer from `index.html` and loaded `public/icons-data.js`; `src/main.tsx`/`src/App.tsx` was not referenced at that baseline. The source App then had 7,558 lines and did not match every embedded screen. This describes the historical audit baseline, not the current checkout; see Section 8 for the current entry and icon-loading behavior.
- **Profiles:** the embedded renderer persists local state in `localStorage` (`cm2.state.v2`) and has profile/layer editing, preset installation, and export controls. The visible Import action is not a file import: exercising it creates a hard-coded “Imported Profile”; no file input is rendered. The separate `src/profileValidator.ts` is not called by the shipped renderer.
- **Hardware path:** the embedded renderer looks for `window.macropad` (`getStatus`, `onStatus`, `onEvent`, `request`, `getFile`, `putFile`). No implementation of that object is present in this repository. The Electron preload exposes `window.electronAPI`, not `window.macropad`; `SerialManager` is also not imported by the served renderer. Consequently, the hardware bridge/device-configuration path is not connected within the checked-in application. The top-level UI says “Not connected,” while Settings statically reports “Device connected: Grid Macro 1.”
- **Native actions:** the Vite middleware handles `/api/execute-action`, and the embedded UI can invoke the Electron IPC bridge. For a smart action, the renderer invokes both the HTTP route and `electronAPI.executeSmartAction` when both are available. A JSDOM probe with stubbed endpoints observed one call to each, so Electron development mode can execute an action twice.
- **Electron:** `electron/main.cjs` and `electron/preload.cjs` exist, but `electron` is not a package dependency and no Electron launch/package scripts are defined. The main process enables context isolation/sandboxing, but IPC handlers do not validate `event.sender`/frame origin; navigation is not explicitly locked to the local app. Its `App`/`Cmd` handlers expose process-launch capability, so the trust boundary should be hardened before packaging or enabling remote navigation.
- **Firmware variants:** there are three separate implementations: QMK (`qmk_firmware/grid_macro_1`), Arduino/TinyUSB (`firmware/arduino_firmware.ino`), and CircuitPython (`firmware/code.py`). Their transports are not equivalent: QMK uses HID/VIA, the Arduino sketch implements a 64-byte Raw HID command set, and CircuitPython implements newline-delimited JSON over USB CDC. There is no single versioned protocol contract or checked-in host bridge joining these to the renderer. No protocol change is recommended without selecting the production firmware/transport.
- **Firmware behavior by inspection:** QMK includes keymaps, encoder, and RGB support. The Arduino sketch has debounced direct keys, an encoder state table, Raw HID and EEPROM, but contains no RGB implementation or USB-CDC JSON protocol. CircuitPython includes JSON config read/write and RGB, but input edges are not time-debounced; incoming lines/configuration are not size/schema validated before use. `boot.py` has identical `readonly=False` behavior in both branches despite comments describing different modes.
- **Documentation:** `WINDOWS_APP_AND_FIRMWARE_GUIDE.md` describes a much larger component tree, packaged Electron artifacts, and tests not present in this checkout. It should not be treated as build/test evidence.

### Existing tests and CI

- Vitest suite: **59 passing tests across 9 files**. It includes source logic tests, a JSDOM test of the embedded runtime, a synthetic firmware simulator, and a custom EventEmitter serial mock.
- Stress suite: **4 passing simulated tests** for 10,000 simulated key events, 1,000 profile validations, 100 mock connect/disconnect cycles, and malformed/randomized simulated inputs. These are not physical-device, long-duration, window-lifecycle, or AFL++ runs.
- `@serialport/binding-mock` and `serialport` are installed, but the serial tests do not use Binding Mock; they use a small local EventEmitter mock.
- `tests/cppcheck_audit.ts` is a regex heuristic, not Cppcheck. Its bounds-check rule has no finding logic, and findings do not make the process fail. Its baseline “0 critical defects” message is not proof of C/C++ safety.
- `tests/memlab_audit.ts` is a synthetic Node heap-delta exercise, not Meta MemLab or a browser/React lifecycle audit. The baseline measured a 3.84 MB heap delta; it does not establish absence of leaks.
- `tests/uiPlaywright.test.ts` performs static string/file checks, not Playwright. The actual browser regression checks use JSDOM. No Electron runtime or physical device is present.
- CI runs Node 22 typecheck/build/tests and the custom audit scripts, but no real firmware compiler, Cppcheck, Unity/Ceedling, Playwright browser, MemLab, or AFL++ job.

### Resource compatibility and licenses checked

| Resource | Baseline availability / compatibility | License and assessment |
|---|---|---|
| Playwright | Not installed; no browser binary. Relevant for end-to-end UI, but cannot currently run here. | Apache-2.0; do not claim it was used. |
| Vitest | Installed and used; current suite runs on the available Node 22 environment. | MIT. |
| SerialPort | `serialport` 13 installed (Node >=20). `SerialManager` is not connected to the served renderer. | MIT. |
| Binding Mock | `@serialport/binding-mock` 10 installed and compatible with the installed SerialPort stack; unused in current tests. | MIT. |
| Unity | Not installed. Firmware code is not factored into a host-testable C unit. | MIT; no source copied. |
| Ceedling | Not installed; Ruby is unavailable. | MIT; not appropriate to add without a C test seam/toolchain. |
| Cppcheck | Binary unavailable. Current “Cppcheck” script is only a heuristic. | GPL-3.0; no code copied or binary added. |
| MemLab | Not installed; upstream repository now resolves to `meta/memlab`. | MIT; current heap script is not MemLab. |
| AFL++ | Not installed; no standalone host parser target exists. | AGPL-3.0; no code copied or binary added. |
| GitHub Actions | Existing workflow uses `actions/checkout` and `actions/setup-node`. | MIT for the referenced actions. |

No root `LICENSE` file is present, so the project’s own licensing terms are not stated. Direct npm dependency licenses were checked in `package-lock.json`; no third-party source is copied as part of this assessment.

### Confirmed baseline defects and risks

1. **Import is a placeholder:** JSDOM interaction with the visible Import button added a preset-derived hard-coded profile; it did not open/read a profile file (zero file inputs).
2. **Hardware bridge is absent from this checkout:** renderer code expects `window.macropad`, but no implementation is exposed by the Electron preload or imported from `SerialManager`.
3. **Misleading Settings status:** JSDOM showed “Not connected” in the header and “Device connected: Grid Macro 1” in Settings simultaneously.
4. **Duplicate native-action call in Electron development mode:** a JSDOM stub probe observed both the HTTP endpoint and Electron IPC called for one smart action.
5. **Concurrent serial requests can strand a promise:** `SerialManager` keys pending operations only by command name. Reproduction: a second `PING` replaces the first pending map entry; the first times out despite one valid response.
6. **Manual serial disconnect leaves pending requests alive:** reproduction showed a pending request still pending immediately after `disconnect()` rather than being rejected/cleared.
7. **Profile validation accepts a non-numeric active-layer index as `NaN`:** `validateProfile({activeLayerIndex: 'not-a-number', layers:[{}]})` returned `valid: true` and `activeLayerIndex: NaN`.
8. **CircuitPython configuration is trusted without validation:** `SET_CONFIG` assigns and saves arbitrary JSON `data`, then the main loop uses it as a mapping/layer list. Malformed but valid JSON can produce type errors or invalid state. The input path has no explicit maximum line length. These are code-inspection findings; they were not exercised on hardware.
9. **CircuitPython lacks explicit key/encoder-switch debounce:** it reacts to state transitions directly; unlike Arduino/QMK, there is no time-based debounce in `code.py`.
10. **The firmware/build/test claims are overstated:** no firmware target was compiled; the “Cppcheck,” “MemLab,” “Playwright,” and “AFL++” labels in tests do not correspond to runs of those tools.
11. **Electron native IPC trust boundary is incomplete:** IPC actions do not validate the sender frame/origin, and top-level navigation is not explicitly restricted. Since Electron is not installed/launched by this package, this is a code-inspection risk, not an observed exploit.
12. **Performance budget is nearly used:** Vite reports a 618.14 kB minified JS chunk (177.76 kB gzip estimate) and warns above 500 kB. The project’s gzip gate measures 171.7 KiB for app JS and 2.38 MiB total shipped JS; `icons-data.js` alone is 2,261.3 KiB gzip.

## 2. BEFORE scorecard

Scores are an evidence-based, subjective assessment of the **expanded scope in this request**, not a claim that every unexecuted feature fails. Overall is the arithmetic mean of the nine category scores.

| Category | Before | Evidence supporting score |
|---|---:|---|
| UI reliability | 70 | Embedded Keymap fixture and 3 JSDOM runtime tests protect initial UI/navigation/Simulation/encoder; no real browser, full screen parity, or complete profile workflows. Settings status is inconsistent and Import is a placeholder. |
| Application logic | 58 | 9 unit tests cover some key parsing/profile sanitization; the shipped renderer does not use the separate validator, Import is not file-based, and `NaN` layer index is accepted. |
| USB/device transport reliability | 42 | 7 tests cover a custom mock, fragmentation, malformed lines, timeout, and close. Binding Mock is unused, the manager is not wired into the app, and concurrent/disconnect request lifecycle defects reproduce. |
| Firmware stability | 35 | 13 JS simulator tests cover modeled debounce/encoder/Raw-HID behavior. Actual Arduino/QMK firmware was not built, CircuitPython only received a host syntax check, and no hardware test ran. |
| Memory management | 45 | Synthetic Node audit reports 3.84 MB heap delta, but is not MemLab and does not model the renderer or validate a real lifecycle. |
| Performance | 44 | Build succeeds, but JS payload is 2.38 MiB gzip with a 2.26 MiB icon dataset; Vite warns on the 618.14 kB app chunk. No device latency or UI performance trace. |
| Code quality | 52 | Existing tests, typecheck, and modular helper files are positives. Risks include a 7,558-line source App, a separate embedded runtime, source/shipped preset mismatch, and stale architecture/build documentation. |
| Security | 58 | Vite native-action same-origin/preview tests are positives. Electron IPC lacks sender validation, process actions are broad, and no Electron runtime security tests exist. |
| Test coverage | 55 | 59 Vitest tests and 4 stress tests pass; most stress/firmware/serial coverage is simulated. No actual Playwright, Unity/Ceedling, Cppcheck, MemLab, AFL++, firmware build, or hardware tests. |
| **Overall quality** | **51** | Arithmetic mean: 459 / 9 = 51.0. The largest deductions reflect the disconnected hardware path and lack of native firmware/hardware verification. |

### BEFORE validation results (at `827202f`)

- `npm run lint` — passed.
- `npm run build` — passed; emits the >500 kB chunk warning.
- `npm run check:bundle` — passed: app 171.7 KiB gzip / 200 KiB; total 2.38 / 2.5 MiB.
- `npm test` — passed: 59 tests, 9 files.
- `npm run test:stress` — passed: 4 simulated tests.
- `npm run audit:cpp` — custom heuristic printed no findings; **not Cppcheck**.
- `npm run audit:mem` — passed its custom heap-delta threshold at 3.84 MB; **not MemLab**.
- `npm audit --audit-level=low` — 0 vulnerabilities.
- CircuitPython host `compile()` — syntax only; no CircuitPython imports, firmware runtime, or hardware executed.
- **Actual hardware tests: none. Electron application tests: none. Native firmware build tests: none.**

## 3. Incremental improvements made

The original audit improvements preserved the shipped UI snapshot and serial command format. The QMK/VIA follow-up adds a keyboard-accessible Connect/Disconnect control within the existing status chip and updates save feedback to distinguish browser-local profiles from the device keymap; the UI baseline was updated for that intentional change. The adapter uses stock VIA commands only, with no custom firmware protocol. The QMK USB string macros were quoted and the Vial-only build flag was removed to keep this target standard VIA. At the time this bridge work was recorded, no QMK build had yet succeeded; the later hosted build result is documented in Section 6. Physical-device testing remains outstanding.

1. **Profile validation:** `activeLayerIndex` now defaults only when omitted/null, rejects non-numeric, non-finite, and fractional values, and still clamps valid integers to the available layer range. Array-shaped values are no longer accepted as layer records. Added coverage for `NaN`, infinity, strings, booleans, fractional values, and clamping.
2. **Serial request lifecycle:** `SerialManager` now allows only one in-flight command because the protocol has no request ID and several response shapes overlap; a concurrent same- or different-command request fails clearly instead of overwriting or misattributing a response. Timeout/write cleanup is tied to the exact pending request. Explicit disconnect rejects pending operations immediately and resets partial input before closing; close handles Node callback-style ports and Web Serial promise-style ports. Added regressions for overlapping commands and a close implementation that emits no event.
3. **Native-action duplication:** the shipped renderer now selects Electron IPC when that bridge exists, otherwise uses the Vite HTTP endpoint. A single smart action or shortcut goes through one backend, not both. JSDOM tests verify both Electron-preferred and HTTP-fallback paths. The rendered UI tree is unchanged.
4. **Actual firmware static analysis:** replaced the misleading regex “Cppcheck-style” scan with a runner for the real Cppcheck binary, including a nonzero findings exit code. CI now installs Cppcheck before running it. A real run of **Cppcheck 2.23 dev** against the Arduino `.ino`, QMK keyboard headers/config, and both QMK keymaps completed with no findings. Cppcheck’s GPL-3.0 executable/source was not added to the app or copied into the repository; only CI installs the tool.
5. **Test honesty and repeatability:** the Node heap smoke check no longer retains half of its generated profiles and no longer claims to prove “zero leaks.” The CI step explicitly calls it a synthetic Node heap-delta check, not MemLab. Random Raw HID bytes now come from a fixed-seed generator, making stress failures repeatable. Test filenames/descriptions no longer imply that Playwright or Unity/Ceedling ran.
6. **QMK metadata preflight:** quoted the `MANUFACTURER` and `PRODUCT` strings in the selected keyboard's `config.h` and added its config/header to Cppcheck's checked source set. A host syntax-only macro check passes; the later full hosted QMK build result is documented in Section 6.
7. **SerialPort integration coverage:** added an end-to-end `SerialManager` test using the installed SerialPort `SerialPortMock`/Binding Mock stack. It verifies the Node SerialPort stream write and response path without claiming a physical USB test.
8. **Stock QMK/VIA WebHID bridge:** added `src/qmkViaBridge.ts`, loaded by the shipped embedded page. It requests WebHID permission from the status-chip click, verifies stock VIA protocol/layer count, translates supported HID/media/layer keycodes and encoder maps, leaves unsupported mappings and unconfigured device layers intact, and keeps full profile JSON in browser storage. Added fake-HID protocol/write tests and a JSDOM Connect-control test. No custom QMK command was introduced; no real device was available.

9. **Profile JSON now works in the shipped inline app:** `src/profileFiles.ts` exports the selected profile with custom actions and imports versioned exports, browser-state backups, and legacy raw-profile JSON. Import reads the selected file, validates structure/size, removes prototype-pollution fields, merges into browser state, remaps colliding profile/action IDs, and preserves custom-action references. Full profiles and custom actions remain local to browser storage; they are not synced to the keyboard.
10. **Device keymap backup and restore safety:** `src/deviceKeymapFiles.ts` validates versioned snapshots containing supported VIA key/encoder maps only, stores a bounded/deduplicated browser-local history, and offers download/restore. Automatic keymap sync reads the device and persists a pre-sync snapshot before any writes, failing closed on read/storage errors. Restore requires confirmation, reads and saves the current device map locally first, and only then sends stock VIA restore writes.
11. **Live Settings values:** the shipped Settings row now reports the bridge's actual connection state/device name and firmware value instead of static “connected” text. The JSDOM integration test verifies disconnected and connected/firmware states.
12. **Pinned QMK build workflow:** the new workflow pins the QMK firmware commit, QMK CLI, Actions by commit SHA, and Ubuntu 22.04; it builds both `via` and `default`, verifies non-empty UF2 outputs, and uploads the VIA image with checksum and environment provenance. Apt/Python package versions are captured per run. The apt repository still moves, so this is traceable and source/tool-version pinned, not a claim of bit-for-bit reproducibility.
13. **First-flash preparation:** added `HARDWARE_PREPARATION_CHECKLIST.md` covering schematic/pin confirmation, USB identity, recovery, artifact hash, sync/restore behavior, and physical key/encoder/RGB testing. No physical board or schematic was available, so those checks remain open.

## 4. AFTER scorecard and comparison (previous checkpoint)

Scoring rubric is unchanged from the BEFORE table: nine equally weighted categories, 0–100, overall is the arithmetic mean. These scores are qualitative and bounded by evidence; simulated transport and host analysis do not receive hardware-validation credit. **Rating at that checkpoint (2026-11-09): 64/100.** Profile import/export, backup gating, live Settings, test coverage, dependency resolution, documentation, and a successful pinned hosted QMK build improved. No physical hardware was available. The scorecard and validation numbers below predate the icon-bundle follow-up in Section 8; the performance row is historical.

| Category | Before | After | Change | After evidence / remaining limit |
|---|---:|---:|---:|---|
| UI reliability | 70 | 84 | +14 | The shipped inline app imports/exports profile JSON, shows actual bridge state/firmware in Settings, and distinguishes local saves from keymap sync. JSDOM covers file import, status, sync gating, and the established UI fixture; no real browser/device test. |
| Application logic | 58 | 74 | +16 | Profile-file schemas/size limits, sanitized JSON, ID/reference remapping, VIA snapshot validation, and fail-closed backup gating have unit/integration coverage. Unsupported keycodes remain warnings/no-ops by design. |
| USB/device transport reliability | 42 | 75 | +33 | Serial lifecycle fixes and Binding Mock coverage remain; the selected QMK/VIA WebHID adapter has 26 fake-HID tests, including snapshot/restore behavior. No physical USB device. |
| Firmware stability | 35 | 50 | +15 | Current-branch hosted workflow compiled both keymaps using the pinned QMK commit/CLI and uploaded a non-empty VIA UF2 with provenance. No flash or on-device test; apt package sources are not immutable. |
| Memory management | 45 | 45 | 0 | Fresh synthetic Node heap-delta check passed at +0.35 MB, but forced GC was unavailable; not browser lifecycle/MemLab evidence. |
| Performance | 44 | 44 | 0 | No optimization or device latency work. Build still warns on the 648.94 kB minified JS chunk (187.12 kB gzip). |
| Code quality | 52 | 70 | +18 | Profile/backup helpers are modular and typed; QMK build inputs/provenance, hardware prep, and local-vs-device data boundaries are documented. The shipped inline bundle/source App split remains. |
| Security | 58 | 60 | +2 | Profile and keymap JSON have byte/schema bounds and reserved prototype fields are discarded; device restore is confirmed and backs up before writes. Electron sender validation/process-launch risks remain. |
| Test coverage | 55 | 77 | +22 | **122 Vitest tests across 13 files** pass, including JSDOM profile import/export/live Settings/pre-sync gate, profile-file schema/merge, fake-HID bridge, and backup/restore safety. No real-browser or physical hardware test. |
| **Overall quality** | **51** | **64** | **+13** | Mean after = 579 / 9 = 64.33, rounded to 64. Physical integration remains the largest evidence gap. |

### Current-branch validation results

- `npm ci` — passed from the lockfile; **258 packages installed, 0 vulnerabilities reported by npm**.
- `npm run lint` — passed (`tsc --noEmit`).
- `npm test` — passed: **122 tests across 13 files**.
- `npm run test:stress` — passed: **4 simulated tests**; these are not physical stress tests.
- `npm run build` — passed. Vite emitted `dist/index.html` **211.06 kB / 125.16 kB gzip** and bundled JS **648.94 kB / 187.12 kB gzip**. It warns that the raw JS chunk exceeds 500 kB.
- `npm audit --audit-level=low` — passed, **0 vulnerabilities**.
- `npm run audit:mem` — passed its synthetic 15 MB threshold at **+0.35 MB**; forced GC was unavailable, so this is not leak evidence.
- `npm run audit:cpp` — exited successfully but **skipped** because Cppcheck is not installed in this sandbox; no current-branch Cppcheck analysis was performed.
- Workflow YAML parsed successfully; every embedded workflow shell block and `qmk_firmware/grid_macro_1/build_uf2.sh` passed `bash -n`. The QMK `keyboard.json` and `via.json` passed JSON parsing, and `git diff --check` passed.
- The pinned hosted QMK workflow passed in [run 42731355502](https://github.com/david-8837/newww/actions/runs/42731355502) for commit `cdc6e41eca8e9b9607dbf36eba90f25c2505df59`; both `via` and `default` compiled, the VIA UF2 was verified non-empty, and artifact upload/provenance staging passed. Artifact `grid-macro-1-via-firmware` (ID `13723834419`, 30,132-byte ZIP, GitHub archive digest `sha256:7a8f531baeeea5ec98b14815bdc60fcd77a935bf3fd8f89b2883fb942180fbcc`) is available in Actions. Downloading the ZIP from this sandbox failed with external-storage EOF, so its inner UF2 checksum was not locally inspected. The local QMK CLI/core/ARM toolchain is unavailable.
- No physical USB/WebHID, firmware flash, hardware, Electron packaged-runtime, real browser/Playwright, MemLab, AFL++, or Unity/Ceedling test was run.

## 5. Confirmed findings: resolved vs remaining

### Resolved in this pass

- Profile JSON import is a real file operation in the shipped inline app; profile/custom-action data remains browser-local. Export is versioned and includes custom actions.
- Settings no longer hard-codes a connected device; it reflects live bridge state/device/firmware values.
- Automatic keymap writes read and save a local pre-sync device snapshot first; failed device reads or browser-storage writes stop the sync.
- File-based keymap restore requires confirmation and also saves the current device map locally before writing the selected snapshot.
- Device backups are bounded, validated, deduplicated, and contain only supported VIA keycode/encoder mappings—no profile JSON or custom firmware protocol.
- QMK build workflow and local build instructions pin the QMK source reference and CLI, verify artifacts, and record provenance. The pinned hosted workflow passed on the current branch (run 42731355502); its artifact ZIP could not be fetched by this sandbox.

### Still confirmed / unresolved

- No schematic or physical board is available. Pin wiring, electrical safety, USB identity, bootloader recovery, WebHID permission, firmware flashing, VIA transfers, key/encoder/RGB behavior, and sync latency remain physically unverified.
- The current pinned QMK workflow passed on the current branch (run 42731355502). The previous successful hosted run used a moving QMK ref and remains historical evidence only. Current local QMK CLI/core/ARM compiler are absent.
- QMK commit, CLI, Actions, and Ubuntu release are pinned; apt and runner package sources are not immutable. Exact apt/Python package versions are recorded per artifact, but byte-for-byte reproducibility is not yet guaranteed. The uploaded artifact ZIP could not be fetched from this sandbox, so verify `SHA256SUMS.txt` after downloading it from GitHub Actions.
- The bridge is tested against fake HID devices only. Concurrent access from another VIA client, real board protocol compatibility, and power-loss/partial-write recovery remain untested.
- CircuitPython configuration remains unvalidated/unbounded and its key/encoder debounce remains absent; the non-QMK variants are outside the selected transport.
- Electron IPC now checks the owning window and exact trusted main frame; device permissions and navigation are further restricted in Section 9. Smart Action terminal execution remains powerful by design and still merits an independent policy/threat-model review before production packaging.
- The legacy embedded renderer remains as `tests/fixtures/legacyEmbeddedApp.js` for regression coverage. The current `index.html` loads `src/main.tsx` and the React `src/App.tsx`; the old source/served-app split description applied to the audit baseline only.
- The full icon library remains a large shipped asset (2.26 MiB gzip), but Section 8 defers it until needed. No real-browser performance trace was taken.

## 6. QMK/VIA target decision and build status

The selected path remains **stock QMK/VIA HID**. `src/qmkViaBridge.ts` uses only standard VIA Raw HID commands for supported keycodes and encoder maps. Complete profiles/custom actions remain in browser storage. No Vial command or custom firmware protocol is introduced. Fake-HID tests cover the host-side translation and report framing; physical behavior remains unknown.

- The QMK fragment enables `RAW_ENABLE`, `VIA_ENABLE`, dynamic keymaps, and encoder maps. The bridge checks VIA protocol `0x000D`; it uses stock command IDs for protocol/firmware/layer discovery (`0x01`, `0x02`, `0x11`), dynamic keycode reads/writes (`0x04`, `0x05`), and encoder-map reads/writes (`0x14`, `0x15`). The target USB identity is VID/PID `0xFEED:0x6001`, Raw HID usage `0xFF60:0x61`.
- `getFile("app_state")` deliberately reports no device profile: stock VIA cannot store arbitrary JSON. Profile JSON and custom actions remain in browser `localStorage`; profile import/export files are handled locally. `putFile("app_state", ...)` persists only to the same browser origin.
- Supported HID/basic, media, supported modifier chords, `TO(layer)` / `MO(layer)`, encoder mappings, and explicit blank-to-`KC_NO` assignments can sync. Unsupported smart/multistep actions and invalid layer targets are skipped with warnings. Missing/extra layers are handled conservatively; this board declares four layers while the app supports up to eight.
- Before automatic sync, the app reads the device keymap and stores a pre-sync browser-local snapshot; failure to read or store blocks writes. File-based restore asks for confirmation, then takes and saves a fresh pre-restore snapshot before sending stock VIA SET commands. Backups contain mappings only and can be downloaded as JSON.
- The status chip requests WebHID permission only from a user click. Settings reflects live bridge status/device/firmware. WebHID still requires a compatible Chromium browser and secure origin (`https` or `localhost`); that permission path has only JSDOM/fake-HID test coverage.
- `.github/workflows/qmk-build.yml` pins QMK firmware commit `d194c077ed964195ec16d255c7a4b89a794cf03b`, QMK CLI `1.2.0`, Actions by commit SHA, and the Ubuntu 22.04 runner release. It builds `via` and `default`, verifies non-empty UF2s, and stages the VIA image with SHA-256 and build provenance. Runner apt/Python versions are captured in `BUILD-INFO.txt`; because Ubuntu/apt package sources move, exact binary reproducibility is not claimed. `qmk_firmware/grid_macro_1/build_uf2.sh` checks an optional expected QMK commit and prints CLI/compiler provenance.

### Hosted and local build results

- **Current branch:** [run 42731355502](https://github.com/david-8837/newww/actions/runs/42731355502) completed successfully for commit `cdc6e41eca8e9b9607dbf36eba90f25c2505df59`. Both `via` and `default` keymaps compiled and their UF2s were verified non-empty; artifact staging and upload passed.
- **Current artifact:** `grid-macro-1-via-firmware`, ID `13723834419`, 30,132 bytes as a ZIP; GitHub reports archive digest `sha256:7a8f531baeeea5ec98b14815bdc60fcd77a935bf3fd8f89b2883fb942180fbcc`, with expiry on 2026-11-17. This is the ZIP digest, not the inner UF2 checksum; `SHA256SUMS.txt` inside the artifact contains that checksum. The sandbox download attempt failed with external-storage EOF, so no local UF2 or inner checksum was obtained.
- **Historical hosted build:** [run 42662058460](https://github.com/david-8837/newww/actions/runs/42662058460), branch `arena/0e57631b-newww`, commit `3da359cf339236ac6017349b06278d3f2e0c3559`, passed with the earlier workflow that cloned moving QMK `master`; it is superseded by the pinned run above.
- **Local build:** unavailable because this sandbox lacks QMK CLI/core and the ARM toolchain; compiler download was blocked by sandbox network restrictions. No firmware was flashed.
- Even a successful hosted compile and non-empty UF2 verify only source compilation/artifact staging. They do not verify target wiring, boot, USB descriptors on the board, VIA behavior, or physical input/RGB operation. Follow `HARDWARE_PREPARATION_CHECKLIST.md` before flashing.

**Scope preserved:** stock VIA remains unchanged; only supported keycodes and encoder maps sync; full profiles stay in browser storage; local profile saves and device sync are reported separately. A custom QMK profile-storage extension is not part of this work.

## 7. Remaining recommendations

1. Download the successful pinned build artifact from [run 42731355502](https://github.com/david-8837/newww/actions/runs/42731355502) and verify its `SHA256SUMS.txt` before flashing (the sandbox could not fetch the artifact ZIP). For strict bit-for-bit reproducibility, pin the ARM compiler/apt packages or a digest-addressed build container rather than only recording their versions.
2. Obtain the board schematic or authoritative wiring table and verify MCU, GPIO/power, LED, USB identity, and bootloader recovery before flashing. Do not infer electrical safety from `keyboard.json`.
3. Use `HARDWARE_PREPARATION_CHECKLIST.md` for first boot and test WebHID permission/cancel/reconnect, VIA protocol/version, all nine switches, encoder rotation/press, each supported layer, blank clearing, failed backup gate, restore, RGB power, and recovery. Record firmware hash and test environment.
4. The Windows installer workflow now exercises the real packaged Chromium renderer and lazy icon/emoji loads; inspect its CI artifact and keep JSDOM/fake-HID claims separate from physical-device evidence.
5. IPC main-frame checks and navigation/device-permission restrictions are in place; independently review the intentionally opt-in terminal Smart Action policy before production packaging.
6. The Section 8 follow-up defers the full icon data and lazy-loads the picker; collect cold-start/interaction traces from the packaged Chromium run before drawing runtime-performance conclusions.
7. Refresh remaining architecture/build documentation to match the repo. Add a root project license only with explicit project-owner direction.

## 8. Icon picker and bundle follow-up (2026-11-09)

This section supersedes the earlier entry-point and performance descriptions for the current checkout; the baseline and scorecard remain historical.

- **Current entry:** `index.html` loads `src/main.tsx` and the React `src/App.tsx`. The former embedded renderer is retained only as `tests/fixtures/legacyEmbeddedApp.js` for regression coverage.
- **Icon startup:** the HTML loads `public/icon-bootstrap.js` (140 vector paths plus fill metadata) and the existing five-logo supplement. Together the startup data covers all 27 preset badges and every preset action icon. The full `public/icons-data.js` is not an HTML script; it is loaded on demand by `src/iconLibrary.ts` when the icon picker is opened. If saved profile data uses an icon outside the bootstrap set, the entry preloads the full library before mounting React so existing keymap icons render immediately.
- **Feature preservation:** the full 8,475-path library remains available; with the five supplemental brand marks, the picker searches 8,507 entries, keeps its 72-item pagination and multiword search, and still renders filled icons correctly. Emoji choices remain lazy-loaded. The picker popover is now a separate lazy React component with its previous classes and animation; `src/App.tsx` is 8,725 lines, down 128 lines from the prior 8,853-line working-tree state.
- **Measured JavaScript gzip:** the prior HTML-loaded script set was approximately 2,436 KiB. Current initial JavaScript is **186.5 KiB / 200 KiB** (about 92% lower); the lazy popover chunk is 1.6 KiB gzip. The app asset set is **185.5 KiB / 200 KiB**. The full icon catalog remains **2,261.3 KiB gzip** as a deferred asset, so total shipped JavaScript is still **2.40 / 2.5 MiB**; this is an initial-load reduction, not a claim that all shipped bytes were removed.
- **Validation at this checkpoint:** `npm run lint`, all **237 tests across 32 files**, the **4 simulated stress tests**, `npm run build`, `npm run check:bundle`, and `git diff --check` passed. Tests verify full-catalog loading/browsing/search/fill, emoji selection, preset startup icon coverage, and existing brand logos. No real-browser performance trace was run.

## 9. Hardware-independent hardening and validation follow-up (2026-11-09)

This follow-up advances tasks that do not require a physical board. The historical scorecard remains a prior checkpoint, and no physical device behavior is claimed here.

- **Packaged Chromium smoke:** the Windows installer workflow now exercises the shipped production renderer in Electron's Chromium. It asserts that the full icon library, picker chunk, and emoji catalog are absent at startup; then opens the picker, browses the 8,507-entry catalog, performs a multiword Airbnb search and selection, switches to Emoji, loads that catalog on demand, and searches/selects sushi. It records deferred-load timing and saves diagnostics plus the initial UI screenshot. This CI smoke has not run in the current Linux sandbox because the Electron runtime binary is not installed; it is not a cold-start performance trace.
- **Renderer memory soak (new, pending CI execution):** visual-smoke-only V8 flags expose forced GC and precise Chromium heap reporting. After warmup, the script performs **30 measured cycles** that visit Settings, Preset, and Keymap and repeatedly open/search/close the icon picker; it samples post-GC `performance.memory.usedJSHeapSize` every five cycles and fails if retained-growth checkpoints exceed **8 MiB**. Electron's renderer working-set/private-byte metrics are also recorded before and after the soak. The threshold is a regression tripwire, not a universal memory limit, and neither measurement has run in this sandbox yet.
- **Electron boundary:** native permission requests/checks now require the trusted app's main frame and allow only HID, Serial, and user-requested notifications. HID device selection also verifies the requesting frame. Renderer frame navigations and redirects are denied unless they target the trusted app entry; only credential-free HTTPS navigation is handed to the operating system. A duplicate legacy hardware-origin function that shadowed the strict policy helper was removed, and a source-contract test now guards against its return. Pure-policy tests cover the URL, frame, permission, and external-navigation cases. The separate Smart Action URL/terminal policy remains a deliberate opt-in capability and still deserves independent review.
- **Firmware file safety:** `electron/uf2Flasher.cjs` rejects non-UF2 files and invalid/oversized images before copying, validates RP2040 UF2 blocks, bounds the selected marker file to 4 KiB, requires `INFO_UF2.TXT` with an `RPI-RP2` marker, and writes with exclusive-create semantics so it cannot overwrite an existing firmware image. Six filesystem-based tests cover success and rejection paths without hardware; they do not verify a physical flash.
- **Windows startup persistence:** the packaged-app persistence smoke now enables Launch at startup, verifies it after an app restart, then disables the test entry. This native Windows behavior remains pending that workflow's run.
- **Local validation:** lint passed; **254 tests across 36 files** and **4 simulated stress tests** passed; production build and bundle budgets passed (**186.5 KiB initial JS gzip, 2.40 MiB total shipped**); changed Electron files passed `node --check`; the Windows workflow YAML parsed; `git diff --check` passed. A real packaged Windows/Chromium memory-soak run and physical-hardware tests are not available in this sandbox.

## 10. Updated project rating (2026-11-09)

This is a fresh, evidence-weighted rating on the same nine equally weighted categories as Section 4. Scores are qualitative, not a standards certification. The Windows package/browser/persistence workflow added in Section 9 has **not** run yet, and no physical device was used for this assessment. The user reports having an RP2040 Zero module but no key switches or rotary encoder; that makes limited BOOTSEL/USB-enumeration/VIA-handshake checks possible if the board is wired and tested, but no such results have been reported. Physical key-matrix and encoder behavior cannot be tested without those peripherals.

| Category | Prior checkpoint | Current | Change | Current evidence and remaining limit |
|---|---:|---:|---:|---|
| UI reliability | 84 | 85 | +1 | The React entry and icon picker have broader regression coverage, including full-catalog browsing, search, and emoji selection. The packaged Chromium smoke is wired into Windows CI but has not executed; no local real-browser run. |
| Application logic | 74 | 75 | +1 | Existing profile/import/export, keymap validation, and backup gates remain covered; icon-library loading and preservation paths add tested behavior. Device/app integration remains unverified on hardware. |
| USB/device transport reliability | 75 | 75 | 0 | SerialPort/Binding Mock and fake-HID coverage remain useful host-side evidence. No physical USB/WebHID session, concurrent VIA-client, or reconnect test. |
| Firmware stability | 50 | 50 | 0 | The previously recorded pinned hosted QMK build is compilation evidence only. Validated UF2-copy tests improve input safety, not firmware execution; no flash or board test. |
| Memory management | 45 | 45 | 0 | A 30-cycle forced-GC Chromium renderer soak and Electron process-memory sampling are now wired into the Windows package smoke, but have not run; the only result so far remains the limited synthetic Node heap exercise. Keep the score unchanged until actual renderer measurements are available. |
| Performance | 44 | 66 | +22 | Initial JavaScript gzip falls from the prior 2,436 KiB shipped-at-start entry set to **186.5 KiB** (about 92% lower), with the 2.26 MiB icon library deferred. Total shipped JavaScript remains 2.40 MiB and no real-browser trace was captured. |
| Code quality | 70 | 75 | +5 | Icon loading, the picker, Electron policy, and UF2 copying have clearer module boundaries and focused tests. `src/App.tsx` is still large and the Smart Action execution boundary needs separate review. |
| Security | 60 | 72 | +12 | Electron IPC/frame trust, navigation, permission, and external-link policy are hardened and unit-tested; UF2 copying validates image/drive and avoids overwrites. No packaged runtime or penetration test, and terminal Smart Actions remain powerful by design. |
| Test coverage | 77 | 84 | +7 | **254 tests across 36 files**, including policy, UF2, icon-library, memory-budget, and smoke-script regressions, plus 4 simulated stress tests. Browser and memory smoke are implemented but not yet run in CI; no physical or native Windows runtime tests. |
| **Overall** | **64** | **70** | **+6** | Current mean: **627 / 9 = 69.67**, rounded to 70. The largest gains are initial-load payload reduction and Electron hardening; lack of real browser, Windows runtime, and hardware evidence still caps the rating. |

**Bottom line:** I rate the current project **70/100**—a meaningful improvement over the previous 64/100 checkpoint, with the score increase driven by measurable initial-payload reduction, security boundaries, and much broader automated coverage. This is not a hardware-readiness or production-security certification. The next evidence that could materially change the rating is a successful packaged Windows workflow run (including Chromium and startup persistence), followed by physical-board validation.
