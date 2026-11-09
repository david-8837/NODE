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

All tests run via `npm test` (powered by Vitest) and standalone runner `tsx test_firmware_and_keys.ts`:

- **19 Test Cases Passed**:
  1. `ErrorBoundary.test.tsx`: Child UI rendering & unhandled exception recovery boundary.
  2. `hardwareProtocol.test.ts`: 16-bit binary transcoding, modifiers, 64-byte Raw HID packets, and firmware source integrity.
  3. `matrixSimulation.test.ts`: Complete 9 direct matrix keys + 3 dial actions across 4 layers.
  4. `presets.test.ts`: Tool icon heuristics, preset builders, and profile application checks.

---

## 5. Building & Packaging Commands

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Launch Vite development server on `0.0.0.0:3000` |
| `npm run lint` | Execute TypeScript strict type check (`tsc --noEmit`) |
| `npm test` | Execute complete Vitest automated unit & matrix test suites |
| `npm run build` | Compile optimized production web assets with Rolldown code-splitting |
| `npm run build:win` | Package native Windows executable (`.exe`) and portable distribution `.zip` |

---

## 6. Packaged Artifact Locations

- **Windows Unpacked Executable**: `dist_electron/win-unpacked/NØDE Grid Macro 1 Studio.exe`
- **Windows Portable Distribution Zip**: `dist_electron/NØDE Grid Macro 1 Studio-1.0.2-win.zip` (172 MB)
- **QMK Native C Firmware Source**: `qmk_firmware/grid_macro_1/`
