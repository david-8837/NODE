# NØDE Grid Macro 1 — Architecture & Engineering Guide

## 1. Executive Summary & Deliverables

The **NØDE Grid Macro 1** system is a complete, production-grade hardware macropad ecosystem featuring:
- **3×3 Direct Switch Matrix + 1 Rotary Encoder (with Push Switch) + WS2812 NeoPixel Status LED** driven by the **Waveshare RP2040-Zero MCU**.
- **Triple-Firmware Package**: Native C (QMK / VIA dynamic keymaps), CircuitPython 9.x (instant USB drive JSON live reload), and Arduino C++ (Adafruit TinyUSB HID stack with 64-byte raw HID).
- **Desktop Studio App**: Native Windows Electron executable (`NØDE Grid Macro 1 Studio.exe`) and portable `.zip` distribution package.
- **Enterprise Architecture**: Dynamic icon library chunking (~500 KB bundle reduction), React Error Boundary recovery safeguard, strict sandboxed IPC, automated Vitest testing suite, and CI/CD GitHub Actions workflow.

---

## 2. Hardware Pinout & Wiring Specification

All 9 switches and the rotary encoder connect directly to RP2040 GPIO pins with internal pull-up resistors to GND (no diodes required for direct pin mapping):

| Component / Slot | Function | RP2040 Pin | Wiring Specification | Default Base Action |
| :--- | :--- | :--- | :--- | :--- |
| **Key 1 (`r1c1`)** | Switch 1 (Row 1 Col 1) | **GP0** | Pin GP0 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + X` (Cut) |
| **Key 2 (`r1c2`)** | Switch 2 (Row 1 Col 2) | **GP1** | Pin GP1 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + C` (Copy) |
| **Key 3 (`r1c3`)** | Switch 3 (Row 1 Col 3) | **GP2** | Pin GP2 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + V` (Paste) |
| **Key 4 (`r2c1`)** | Switch 4 (Row 2 Col 1) | **GP3** | Pin GP3 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + Z` (Undo) |
| **Key 5 (`r2c2`)** | Switch 5 (Row 2 Col 2) | **GP4** | Pin GP4 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + Y` (Redo) |
| **Key 6 (`r2c3`)** | Switch 6 (Row 2 Col 3) | **GP5** | Pin GP5 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Ctrl + S` (Save) |
| **Key 7 (`r3c1`)** | Switch 7 (Row 3 Col 1) | **GP6** | Pin GP6 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Win + Shift + S` (Snip) |
| **Key 8 (`r3c2`)** | Switch 8 (Row 3 Col 2) | **GP7** | Pin GP7 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Media Play / Pause` |
| **Key 9 (`r3c3`)** | Switch 9 (Row 3 Col 3) | **GP8** | Pin GP8 $\leftrightarrow$ Switch $\leftrightarrow$ GND | `Media Mute` |
| **Dial Pin A (CW)** | Rotary Encoder Pin A | **GP9** | Pin GP9 $\leftrightarrow$ Terminal A $\leftrightarrow$ Common GND | `Volume Up` (`KC_VOLU`) |
| **Dial Pin B (CCW)** | Rotary Encoder Pin B | **GP10** | Pin GP10 $\leftrightarrow$ Terminal B $\leftrightarrow$ Common GND | `Volume Down` (`KC_VOLD`) |
| **Dial Switch (SW)** | Encoder Push Button | **GP11** | Pin GP11 $\leftrightarrow$ Terminal SW $\leftrightarrow$ Common GND | `Media Mute` (`KC_MUTE`) |
| **RGB Status LED** | Onboard NeoPixel | **GP16** | Factory built-in WS2812 RGB LED | Layer Color Status |

---

## 3. Desktop Application Architecture & Optimizations

```
repo/
├── electron/
│   ├── main.cjs               # Strict context isolation, permission check, sanitized execFile
│   └── preload.cjs            # Safe context bridge for hardware & system APIs
├── src/
│   ├── __tests__/             # Automated Vitest test suites (19 test cases)
│   │   ├── ErrorBoundary.test.tsx
│   │   ├── hardwareProtocol.test.ts
│   │   ├── matrixSimulation.test.ts
│   │   └── presets.test.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx  # React Exception Safeguard with reload fallback
│   │   ├── Header.tsx         # NØDE Branding, navigation tabs, connection pill
│   │   ├── KeyMatrix/         # Macropad matrix visualizer
│   │   ├── LightingControls/  # NeoPixel RGB control popover
│   │   ├── MacroEditor/       # Smart Actions, Multi-Step macros, lazy IconPicker
│   │   ├── FlatDialControl.tsx
│   │   ├── KnobControl.tsx
│   │   └── MacropadDevice.tsx # 3x3 layout + dial controls
│   ├── constants/
│   │   ├── basicKeys.ts       # Keycode tables, basic sections, layer defaults
│   │   └── presets.ts         # Framer, Photoshop, Premiere, VS Code presets
│   ├── hooks/
│   │   └── useHardwareState.ts # Web Serial lifecycle, packet dispatcher, log state
│   ├── utils/
│   │   └── helpers.tsx        # UI glyphs, settings switch, encoders
│   ├── views/
│   │   ├── KeymapStudioView.tsx    # Interactive Studio & Mapping Stack
│   │   ├── PresetsLibraryView.tsx  # Preset Community Library & Search
│   │   ├── PresetPreviewView.tsx   # Detailed Preset Breakdown Preview
│   │   ├── HardwareManagerView.tsx # Pinout & Firmware flashing view
│   │   └── SettingsView.tsx        # Desktop preferences & sandbox permissions
│   └── hardwareProtocol.ts    # 16-bit USB HID packet encoder & decoder
├── .github/workflows/
│   └── build-and-test.yml     # Automated CI/CD build & test pipeline
├── qmk_firmware/grid_macro_1/ # QMK C Native firmware source tree
└── dist_electron/             # Packaged Windows Executable & Portable Zip
```

---

## 4. Automated Testing & Verification Suite

All automated checks run with `npm test` (Vitest). The latest local run passed **131 tests across 14 files**:

- `tests/embeddedApp.test.ts`: shipped UI structure, interaction, profiles, device sync, and regression baseline.
- `tests/downloadSite.test.ts`: download-page content, live release-asset resolution, first-release fallback, and publishing workflow contracts.
- `tests/uiSourceContract.test.ts`: desktop packaging, responsive geometry, and packaged Windows screenshot smoke-test contracts.
- Hardware and protocol suites cover VIA, USB serial, device layout, keymaps, and native-action safety.

---

## 5. Building & Packaging Commands

Use Node.js 22 and npm. The Windows installer is an unsigned x64 NSIS setup executable; no signing certificate is configured yet.

| Command | Purpose |
| :--- | :--- |
| `npm run desktop:dev` | Start Vite and open the Electron desktop shell together |
| `npm run dev` | Launch the Vite development server on port `5173` |
| `npm run lint` | Execute the TypeScript check (`tsc --noEmit`) |
| `npm test` | Execute the Vitest unit and integration suites |
| `npm run build` | Compile the production UI into `dist/` |
| `npm run package:win:dir` | Create an unpacked Windows x64 app for smoke testing |
| `npm run build:win` | Build the UI, NSIS installer, and ZIP distribution |

`build:win` is intended to run on Windows x64 (or the manual Windows GitHub Actions workflow). The assisted installer offers per-user or per-machine installation, lets the user choose an install folder, creates Start Menu and desktop shortcuts, and preserves local app data on uninstall.

The desktop window keeps its existing 1280×840 starting size when the display has room, and uses the available work area on smaller displays. At constrained widths/heights the same controls flow and scroll without changing the established colors or component styling. The Windows packaging workflow silently installs the generated NSIS app, launches it at a constrained size, checks the rendered nine-key/encoder/navigation UI, captures a PNG, and uploads that screenshot with the installer and ZIP.

### Download website and public releases

The standalone download site source lives in `website/` and is uploaded directly to GitHub Pages when changes reach `main` or the active publishing branch `arena/2eac011b-newww` (or by manually dispatching the **Publish download website** workflow after it is available on the default branch). Before its first deploy, enable Pages in repository **Settings → Pages** and set the source to **GitHub Actions**; the project site URL is `https://david-8837.github.io/NODE/`. Its download buttons resolve the latest `.exe` and `.zip` assets from the public GitHub Releases API. To publish a version, push a `v*` tag such as `v1.0.0`: the Windows workflow builds and smoke-tests the installed app, then attaches the installer and portable ZIP to that release. Until the first release exists, the site shows a clear “not published yet” state and links to the releases page.

---

## 6. Packaged Artifact Locations

`npm run build:win` writes the following x64 artifacts under the ignored `dist_electron/` directory:

- **Windows NSIS installer**: `dist_electron/NØDE Grid Macro 1 Studio-1.0.0-x64.exe`
- **ZIP distribution**: `dist_electron/NØDE Grid Macro 1 Studio-1.0.0-x64.zip`
- **Unpacked smoke-test app** (from `npm run package:win:dir`): `dist_electron/win-unpacked/`
- **QMK Native C Firmware Source**: `firmware/`
