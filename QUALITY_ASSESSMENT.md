# Macro Pad Comprehensive Quality Assessment

## Assessment scope

**Baseline point:** branch `arena/0e57631b-newww`, commit `827202f` (the existing state before changes for this assessment). This baseline already includes the earlier 3×3 + encoder layout, shipped-UI fixture, same-origin native-action check, and CI bundle/audit gates; “Before” does not mean the repository’s original upstream state.

The requested UI is treated as the visual baseline. `index.html` remains the served entry. No firmware was connected during this assessment. All findings below distinguish observed runtime behavior from code inspection and simulation.

## 1. Initial project audit

### Repository and data flow

- **Served renderer:** Vite serves `index.html`, which embeds a minified React runtime (~622 KB inline module source) and loads `public/icons-data.js`. The separate `src/main.tsx`/`src/App.tsx` is not referenced by that HTML entry. The source App is 7,558 lines and does not match every shipped screen: its preset library has 9 entries while the embedded app has 27. The existing Keymap fixture protects only the initial screen; keep `index.html` as the UI baseline until full-screen parity is demonstrated.
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
| USB Serial reliability | 42 | 7 tests cover a custom mock, fragmentation, malformed lines, timeout, and close. Binding Mock is unused, the manager is not wired into the app, and concurrent/disconnect request lifecycle defects reproduce. |
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

The original audit improvements preserved the shipped UI snapshot and serial command format. The QMK/VIA follow-up adds a keyboard-accessible Connect/Disconnect control within the existing status chip and updates save feedback to distinguish browser-local profiles from the device keymap; the UI baseline was updated for that intentional change. The adapter uses stock VIA commands only, with no custom firmware protocol. The QMK USB string macros were quoted and the Vial-only build flag was removed to keep this target standard VIA; no QMK build or device test has been possible.

1. **Profile validation:** `activeLayerIndex` now defaults only when omitted/null, rejects non-numeric, non-finite, and fractional values, and still clamps valid integers to the available layer range. Array-shaped values are no longer accepted as layer records. Added coverage for `NaN`, infinity, strings, booleans, fractional values, and clamping.
2. **Serial request lifecycle:** `SerialManager` now allows only one in-flight command because the protocol has no request ID and several response shapes overlap; a concurrent same- or different-command request fails clearly instead of overwriting or misattributing a response. Timeout/write cleanup is tied to the exact pending request. Explicit disconnect rejects pending operations immediately and resets partial input before closing; close handles Node callback-style ports and Web Serial promise-style ports. Added regressions for overlapping commands and a close implementation that emits no event.
3. **Native-action duplication:** the shipped renderer now selects Electron IPC when that bridge exists, otherwise uses the Vite HTTP endpoint. A single smart action or shortcut goes through one backend, not both. JSDOM tests verify both Electron-preferred and HTTP-fallback paths. The rendered UI tree is unchanged.
4. **Actual firmware static analysis:** replaced the misleading regex “Cppcheck-style” scan with a runner for the real Cppcheck binary, including a nonzero findings exit code. CI now installs Cppcheck before running it. A real run of **Cppcheck 2.23 dev** against the Arduino `.ino`, QMK keyboard headers/config, and both QMK keymaps completed with no findings. Cppcheck’s GPL-3.0 executable/source was not added to the app or copied into the repository; only CI installs the tool.
5. **Test honesty and repeatability:** the Node heap smoke check no longer retains half of its generated profiles and no longer claims to prove “zero leaks.” The CI step explicitly calls it a synthetic Node heap-delta check, not MemLab. Random Raw HID bytes now come from a fixed-seed generator, making stress failures repeatable. Test filenames/descriptions no longer imply that Playwright or Unity/Ceedling ran.
6. **QMK metadata preflight:** quoted the `MANUFACTURER` and `PRODUCT` strings in the selected keyboard's `config.h` and added its config/header to Cppcheck's checked source set. A host syntax-only macro check passes; a full QMK build is still unavailable.
7. **SerialPort integration coverage:** added an end-to-end `SerialManager` test using the installed SerialPort `SerialPortMock`/Binding Mock stack. It verifies the Node SerialPort stream write and response path without claiming a physical USB test.
8. **Stock QMK/VIA WebHID bridge:** added `src/qmkViaBridge.ts`, loaded by the shipped embedded page. It requests WebHID permission from the status-chip click, verifies stock VIA protocol/layer count, translates supported HID/media/layer keycodes and encoder maps, leaves unsupported mappings and unconfigured device layers intact, and keeps full profile JSON in browser storage. Added fake-HID protocol/write tests and a JSDOM Connect-control test. No custom QMK command was introduced; no real device was available.

## 4. AFTER scorecard and comparison

Scoring rubric is unchanged from the BEFORE table: nine equally weighted categories, 0–100, overall is the arithmetic mean. These scores are qualitative, bounded by evidence; simulated transport and host analysis do not receive hardware-validation credit.

| Category | Before | After | Change | After evidence / remaining limit |
|---|---:|---:|---:|---|
| UI reliability | 70 | 76 | +6 | Status chip is now an accessible Connect/Disconnect control and save feedback distinguishes local profiles from keymap sync; JSDOM tests verify connect-on-click, metadata-only no-op sync, and profile resync after reconnect. Import remains a placeholder and Settings still has a static connection label. |
| Application logic | 58 | 66 | +8 | Invalid active-layer values rejected and valid integer range clamped. The embedded app still does not use this standalone validator. |
| USB Serial reliability | 42 | 70 | +28 | Overlapping-command ambiguity and manual disconnect lifecycle fixed; one in-flight operation is enforced because responses have no request IDs. 10 serial tests pass, including actual SerialPort/Binding Mock stream exercise. No physical device. |
| Firmware stability | 35 | 35 | 0 | Quoted QMK USB string macros and removed the Vial-only build flag; the adapter still uses stock VIA. Cppcheck and a narrow host syntax check passed, but no Arduino/QMK build, CircuitPython runtime, or hardware test ran. |
| Memory management | 45 | 45 | 0 | Node smoke now discards profile results and passed; it is still not a browser lifecycle measurement or MemLab run. |
| Performance | 44 | 44 | 0 | No app optimization or device latency work was performed. Bundle size remains essentially unchanged and the >500 kB raw chunk warning persists. |
| Code quality | 52 | 65 | +13 | Real Cppcheck wired into CI; misleading test/tool labels corrected; request cleanup, deterministic stress input, and a typed stock-VIA bridge improved. The shipped inline bundle/source App split remains. |
| Security | 58 | 58 | 0 | Existing native-action origin checks remain. Electron sender validation/navigation restrictions and broad process-launch capability still need a packaged desktop threat-model review. |
| Test coverage | 55 | 69 | +14 | Vitest includes fake-HID protocol/keycode/encoder cases, unavailable-layer rejection, failed-report cleanup, silent-reconnect errors, connect-button behavior, metadata-only sync suppression, and profile resync after reconnect, in addition to profile, dispatch, serial lifecycle, and Binding Mock coverage. Still no Playwright browser, native firmware tests, or hardware. |
| **Overall quality** | **51** | **59** | **+8** | Mean after = 528 / 9 = 58.67, rounded to 59. Hardware/firmware integration remains the principal evidence gap. |

### AFTER validation results

- `npm run lint` — passed (`tsc --noEmit`).
- `npm test` — passed: **97 tests across 10 files**, including 23 fake-HID bridge tests and embedded-app metadata/reconnect coverage.
- `npm run test:stress` — passed: **4 simulated tests**; seeded input makes the random-byte case reproducible.
- `npm run build` — passed; Vite still emits its >500 kB raw-chunk advisory. Output: `dist/index.html` **211.06 kB / 125.16 kB gzip** and the bundled JS **629.64 kB / 181.91 kB gzip**.
- `npm run check:bundle` — passed: bundled app **614.9 KiB raw / 175.6 KiB gzip** of a 200 KiB gzip budget; all shipped JavaScript **2.38 / 2.5 MiB gzip**. The icon dataset is **6,441.0 KiB raw / 2,261.3 KiB gzip**.
- `CPPCHECK_BIN=/tmp/newww-cppcheck/cppcheck npm run audit:cpp` — passed with **Cppcheck 2.23 dev**, no findings on five selected Arduino/QMK source files (Arduino `.ino`, QMK config/header, and both keymaps). QMK core/macros are absent and missing includes are suppressed, so this is source-local analysis, not a full QMK compile. The temporary Cppcheck build is outside the repository. CI installs the distro Cppcheck package; that hosted workflow has not been run in this session.
- A narrow host `g++ -fsyntax-only` check of the QMK manufacturer/product string macro expansion passed with a stub `config_common.h`. It does not prove the keyboard definition builds under QMK.
- `npm run audit:mem` — passed with a **+0.04 MB** observed Node heap delta after explicit V8 GC. This remains a synthetic Node smoke result, not browser memory/leak evidence. The BEFORE script retained 2,500 profile results, so its +3.84 MB reading is not an apples-to-apples leak baseline.
- `npm audit --audit-level=low` — **0 vulnerabilities**.
- `node --check` on the production JS bundle and `git diff --check` — passed.
- Inspected the production entry: Vite emits one bundled module, and the QMK/VIA bridge registration occurs before the shipped renderer reads `window.macropad`.
- Embedded-app JSDOM snapshots/navigation and the new connect/reconnect sync test pass. A separate React-app baseline fixture prevents the shipped inline UI snapshot change from masking the intentionally separate `src/App.tsx` layout.
- Binding Mock is a software fake serial binding. It validates the SerialPort stream integration, **not a hardware connection**.
- **No physical USB tests, Arduino/QMK build, firmware flash, real-browser WebHID permission/device test, CircuitPython execution on-device, Electron packaged-app test, Playwright browser run, MemLab run, AFL++ campaign, Unity/Ceedling run, or hosted GitHub Actions run was performed.**

## 5. Confirmed findings: resolved vs remaining

### Resolved in this pass

- `profileValidator.ts` no longer accepts a `NaN` active layer index as valid.
- Concurrent `SerialManager` requests no longer overwrite or misattribute replies; a single in-flight command is enforced because the current protocol has no request IDs. No wire-protocol change was made.
- Explicit `SerialManager.disconnect()` immediately rejects pending requests even when the port emits no close event.
- Embedded smart actions/shortcuts no longer invoke both Electron IPC and the local HTTP endpoint for one action.
- The Cppcheck gate now invokes actual Cppcheck when installed and fails on findings; CI installs it. The old script's false “all memory and bounds patterns safe” success message is removed.
- Memory and stress checks now describe their limits accurately; stress random bytes are reproducible.

### Still confirmed / unresolved

- The shipped UI’s Import control does not read a profile file; it synthesizes an “Imported Profile.”
- Settings still has a static “Device connected: Grid Macro 1” label, which can contradict the live status chip until WebHID confirms a connection.
- The shipped renderer now loads `window.macropad` from `src/qmkViaBridge.ts`; `SerialManager` remains separate. Fake-HID tests establish command framing and conversion, but real device detection, permission flow, firmware compatibility, and configuration transfer remain unverified on hardware.
- CircuitPython configuration remains unvalidated and unbounded, key/encoder debounce remains absent, and the GP0 branches in `boot.py` still use the same storage flags. Those non-QMK firmware variants are outside the selected target.
- Electron IPC still needs a sender/frame allowlist, restricted navigation, and a policy for process execution before treating the un-packaged Electron files as production-safe.
- `src/App.tsx` and the embedded shipped app remain divergent (including the 9-vs-27 preset library). No entrypoint switch or large rewrite was made.
- Performance remains constrained by the large icon script; no browser/device performance trace was available.

## 6. QMK/VIA target decision and compatibility gate

The user selected **QMK/VIA HID** and delegated the bridge strategy. The least-risk route is now implemented in `src/qmkViaBridge.ts` and loaded by the shipped embedded app: standard QMK/VIA Raw HID commands for supported dynamic keymaps, with full profiles remaining browser-local. This is source- and fake-HID-tested, not hardware-validated.

- The checked-in QMK fragment enables `RAW_ENABLE`, `VIA_ENABLE`, dynamic keymaps, and encoder maps. The adapter checks VIA protocol `0x000D` and uses stock command IDs for protocol/firmware/layer discovery (`0x01`, `0x02`, `0x11`), dynamic keycode reads/writes (`0x04`, `0x05`), and encoder-map reads/writes (`0x14`, `0x15`). It uses the board's VID/PID (`0xFEED:0x6001`) and QMK Raw HID usage (`0xFF60:0x61`). No custom command or Vial-specific command is used. See QMK's [VIA command handler](https://github.com/qmk/qmk_firmware/blob/master/quantum/via.c) and [VIA command definitions](https://github.com/qmk/qmk_firmware/blob/master/quantum/via.h).
- `getFile("app_state")` deliberately reports no device profile: stock VIA cannot store arbitrary JSON. The renderer loads profiles from browser `localStorage` and displays separate local-save / keymap-sync feedback. `putFile("app_state", ...)` only persists to the same browser origin; the profiles do not travel with the keyboard.
- The renderer's supported mappings are converted to standard QMK basic, media, modifier, `TO(layer)`, `MO(layer)`, and encoder keycodes. Explicit blanks clear to `KC_NO`; unsupported actions and layer switches targeting layers absent from the firmware are skipped rather than destroying an existing device mapping. Only the active profile's configured layers are updated; extra device layers remain unchanged and limitations are shown. This board declares 4 layers while the app allows up to 8.
- The status chip is an accessible Connect/Disconnect control. It requests WebHID permission from a user click, then verifies the protocol before showing the device as connected. WebHID requires a supported Chromium browser and secure origin (`https` or `localhost`).
- The QMK definition remains only a keyboard fragment, not a full QMK checkout. QMK CLI/core and ARM toolchain are absent, so no QMK compile was possible. `MANUFACTURER` and `PRODUCT` are now quoted to match `info.json`; a narrow host syntax check passed, but this is not a full QMK validation.

**Implemented least-risk path:** keep standard VIA unchanged; sync only supported keycodes/encoder maps with WebHID and keep full profiles/custom items in browser storage. The UI now has an explicit user-gesture Connect/Disconnect control and reports local saving separately from device keymap sync. Unsupported mappings and layer-count differences produce sync warnings. The QMK fragment's `VIAL_ENABLE` line was removed so the selected firmware build stays on standard VIA; this remains uncompiled here.

**Alternative:** add a custom QMK VIA/Raw HID extension for profile JSON storage. That changes the firmware protocol, requires a version/capability handshake, firmware update path, EEPROM sizing plan, compatibility behavior for stock VIA/older firmware, and hardware tests. Do not take this route without explicit approval and a compatibility plan.

## 7. Remaining recommendations

1. Compile the checked-in QMK keyboard definition in a reproducible QMK environment. Verify metadata/string macros, stock VIA protocol version, four dynamic layers, encoder-map support, and RP2040 output before flashing.
2. Test the bridge with a physical Grid Macro 1 in Chrome/Edge: permission prompt/cancel, reconnect/disconnect, protocol/version mismatch, all key and encoder positions, blank clearing, unchanged-key no-op behavior, and supported/unsupported mappings. Confirm no concurrent VIA client corrupts writes and measure sync latency/flash effects.
3. Add the real hidden file-picker/import workflow behind the existing Import control and test a valid profile, malformed file, cancel, and oversized input without changing the page layout.
4. Reconcile Settings connection status with the actual bridge; do not display a connected device until the bridge confirms it.
5. Before shipping Electron, add sender-origin/frame checks, deny unexpected navigation, restrict launchable applications/commands, and test the packaged runtime. First confirm whether Electron is an intended supported product; it is not currently a dependency or configured application target.
6. Add a real browser-based Playwright smoke suite when a browser runner is available, and use browser lifecycle instrumentation if memory-leak evidence is required. Continue to label the current checks as JSDOM and Node smoke tests.
7. Consider splitting/loading the icon data on demand; retain the current bundle gates and compare real browser load/interaction traces before changing the shipped UI.
8. Refresh the architecture/build guide so it describes the files and test targets that actually exist. Add a root project license only with explicit project-owner direction.
