# NODE Studio v1.1.11 — Release Notes & Changelog

**Release Date**: November 2026  
**Target Hardware**: Grid Macro 1 Macropad (RP2040-Zero, 3×3 matrix keys + EC11 rotary encoder)  
**Binary Packages**: Windows x64 NSIS Installer (`NODE studio-Setup-1.1.11.exe`) & Portable ZIP (`NODE studio-1.1.11-win.zip`)

---

## What's New in v1.1.11

### 1. Active Window Profile Auto-Switching
- **Win32 Active Window Tracking**: Seamlessly tracks active foreground window changes using native Win32 API calls via `koffi`.
- **Intelligent 3-Tier Matcher**:
  1. Priority evaluation of explicit user-defined application rules.
  2. Exact process executable name matching (e.g., `blender.exe`, `Code.exe`, `photoshop.exe`, `obs64.exe`).
  3. Window title substring heuristics fallback.
- **Hardware Profile & Layer Sync**: Automatically triggers firmware layer updates and displays desktop notifications when switching applications.

### 2. Custom App-to-Profile Mapping Rule Editor
- Built a dedicated rule editor card directly in the **Settings** screen.
- Allows defining process name patterns, optional window title filters, and target profile assignments.
- Integrated with detected installed applications quick-picker to auto-fill process names with one click.
- Interactive toggle switch to enable/disable rules individually, plus one-click deletion.

### 3. Keycap Custom Legend & Color Tint Personalization
- **Primary Legend & Sub-Legend Override**: Customize keycap text and assign subscript labels (e.g., `CMD`, `F5`, `BUILD`, `CUT`).
- **7-Swatch Keycap Color Palette**: Tint individual keycaps with curated studio colors (Dark Grey, Emerald, Electric Blue, Amber, Crimson, Royal Purple, Slate).
- **Responsive 2D/3D Canvas Rendering**: Keycap styling renders directly on the interactive hardware canvas with active tactile press states.
- **Full Schema Persistence**: Custom legends and colors are preserved across JSON profile exports, imports, and backups.

### 4. Acrylic Cheat Sheet HUD System-Wide Global Hotkey
- **OS-Level Global Shortcut**: Registered via Electron `globalShortcut` (Default: `Ctrl+Alt+M`). Works even when NODE Studio is minimized in the system tray.
- **Non-Focus-Stealing Overlay**: The transparent, click-through acrylic live-blur HUD summons over any fullscreen game, 3D viewport, or video editor timeline without minimizing or stealing keyboard focus (`showInactive()`).
- **Settings Card & Quick Presets**: Built a dedicated HUD management card with an on/off toggle, quick preset pills (`Ctrl+Alt+M`, `Ctrl+Shift+Space`, `Alt+Space`, `Ctrl+Shift+H`), and a 1-click preview test button.

### 5. Community Profile Sharing Hub
- Built the interactive Community Profile Sharing modal featuring curated 4-layer profiles for:
  - **Blender 3D Suite**: Modeling, Sculpting, Shading, and Render controls.
  - **VS Code**: Navigation, Git actions, Debugging, and Terminal triggers.
  - **Adobe Photoshop**: Brush, Selection, Layer management, and Quick Export.
  - **DaVinci Resolve / Premiere Pro**: Timeline trimming, Blade, Playback scrub, and Color grading.
- One-click profile installation and JSON sharing export.

### 6. Interactive Visual Tutorial & Documentation
- Published [`tutorial.html`](https://david-8837.github.io/NODE/tutorial.html) featuring authentic software screenshots and 10 feature deep-dives.
- Hardware-software architecture guide detailing the RP2040-Zero pinout, Raw HID `0xFEED:0x6001` framing, and EEPROM wear-leveling partitioning.
- 7-Step Macropad Configuration Walkthrough from USB-C connection to flash commit.

### 7. Modular Architecture & Performance Polish
- **React Hook Decomposition**: Extracted modular custom hooks into `src/hooks/` (`useTipRotation`, `useInstalledApplications`, `useDeviceNotifications`, `useKeymapHistory`, `useAppSettings`) with 100% unit test coverage.
- **Dead Code Purge**: Reclaimed 980 lines of obsolete legacy scripts and stubs; pruned 22 unreferenced packages from `node_modules`.
- **Motion v12 Migration**: Upgraded all animation components to native `motion/react`.
- **Automated Verification**:
  - `npx tsc --noEmit` & `npm run lint`: 0 errors, 0 warnings.
  - `npm test`: **57 test files, 496 tests passed (100%)**.
  - `npm run test:e2e`: **10/10 Playwright E2E tests passed**.
  - `npm run check:bundle`: Shipped bundles well within size limits.

---

## Assets & Checksums

| File | Description | Target |
|:---|:---|:---|
| `NODE studio-Setup-1.1.11.exe` | Windows NSIS Standalone Installer | Windows 10/11 x64 |
| `NODE studio-1.1.11-win.zip` | Portable Standalone Distribution | Windows 10/11 x64 |
| `grid_macro_1_via.uf2` | Production QMK / VIA Firmware (1000 Hz, RP2040) | RP2040-Zero |

---

## Installation & Upgrade

1. **Windows Desktop App**:
   - Download `NODE studio-Setup-1.1.11.exe` and run the installer.
   - Or extract `NODE studio-1.1.11-win.zip` to your preferred folder and launch `NODE studio.exe`.
2. **QMK Firmware Update (Optional)**:
   - Hold the `BOOT` button on the RP2040-Zero while plugging in the USB-C cable to mount as `RPI-RP2`.
   - Drag and drop `grid_macro_1_via.uf2` into the drive. The device will automatically reboot with the latest firmware.
