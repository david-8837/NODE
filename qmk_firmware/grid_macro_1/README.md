# Grid Macro 1 - QMK Native C Firmware (RP2040-Zero)

Production-ready Native C QMK firmware for **Grid Macro 1** (9 Direct-Pin Keys + 1 EC11 Rotary Encoder with Push Switch + Onboard WS2812 RGB LED) on the **Waveshare RP2040-Zero**.

---

## 🚀 How to Compile to `.uf2`

### Option 1: Using QMK CLI (Recommended)
1. Install QMK CLI:
   ```bash
   python3 -m pip install --user qmk
   qmk setup
   ```
2. Copy the `grid_macro_1` folder into your `qmk_firmware/keyboards/` directory:
   ```bash
   cp -r qmk_firmware/grid_macro_1 ~/qmk_firmware/keyboards/
   ```
3. Compile the `.uf2` binary:
   ```bash
   # Compile default keymap
   qmk compile -kb grid_macro_1 -km default

   # Or compile with VIA / VIAL live EEPROM configuration enabled
   qmk compile -kb grid_macro_1 -km via
   ```
4. The compiled binary will be generated at:
   `qmk_firmware/.build/grid_macro_1_default.uf2` or `grid_macro_1_via.uf2`

---

### Option 2: Using Docker (Zero Setup)
```bash
docker run --rm -v $('pwd'):/qmk_firmware -w /qmk_firmware qmkfm/qmk_cli qmk compile -kb grid_macro_1 -km via
```

---

## ⚡ Flashing the `.uf2` to RP2040-Zero
1. Hold down the **BOOT** button on your RP2040-Zero and plug it into your computer via USB-C.
2. A drive named **`RPI-RP2`** will appear on your desktop / file manager.
3. Drag and drop the compiled **`grid_macro_1_via.uf2`** file onto the `RPI-RP2` drive.
4. The RP2040-Zero will immediately reboot as a high-performance native USB HID macropad with 1000 Hz polling rate!
