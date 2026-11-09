# Grid Macro 1 - RP2040-Zero Macropad Firmware & Hardware Setup

This directory contains the firmware and hardware wiring schematic for building the **Grid Macro 1** macropad (9 Keys + 1 Rotary Encoder with Push Button) using the **Waveshare RP2040-Zero** or any standard RP2040 development board.

---

## 🛠️ Hardware Specifications

| Component | Quantity | Connection on RP2040-Zero |
| :--- | :--- | :--- |
| **Mechanical Switches (Keys 1–9)** | 9 | `GP0` to `GP8` (Direct to GND, internal Pull-Up) |
| **EC11 Rotary Encoder Pin A (CW)** | 1 | `GP9` |
| **EC11 Rotary Encoder Pin B (CCW)** | 1 | `GP10` |
| **EC11 Encoder Push Button (SW)** | 1 | `GP11` (Direct to GND, internal Pull-Up) |
| **Onboard WS2812 RGB LED** | 1 | `GP16` (built-in on RP2040-Zero) |
| **Common Ground** | 1 | `GND` pin |

---

## 📌 Pinout & Wiring Table

| Key Slot ID | Macropad Position | RP2040-Zero Pin | Switch Terminal 1 | Switch Terminal 2 |
| :--- | :--- | :--- | :--- | :--- |
| `r1c1` | Top-Left Key (Key 1) | **GP0** | GP0 | Common GND |
| `r1c2` | Top-Center Key (Key 2) | **GP1** | GP1 | Common GND |
| `r1c3` | Top-Right Key (Key 3) | **GP2** | GP2 | Common GND |
| `r2c1` | Mid-Left Key (Key 4) | **GP3** | GP3 | Common GND |
| `r2c2` | Center Key (Key 5) | **GP4** | GP4 | Common GND |
| `r2c3` | Mid-Right Key (Key 6) | **GP5** | GP5 | Common GND |
| `r3c1` | Bottom-Left Key (Key 7) | **GP6** | GP6 | Common GND |
| `r3c2` | Bottom-Center Key (Key 8) | **GP7** | GP7 | Common GND |
| `r3c3` | Bottom-Right Key (Key 9) | **GP8** | GP8 | Common GND |
| `dial-tl` (A) | Rotary Encoder Clockwise | **GP9** | Pin A | Common GND (Pin C) |
| `dial-tl` (B) | Rotary Encoder Counter-CW | **GP10** | Pin B | Common GND (Pin C) |
| `dial-tl` (SW)| Rotary Encoder Push Button | **GP11** | Switch Pin 1 | Common GND (Switch Pin 2) |

> **Note:** Because the firmware enables internal Pull-Up resistors (`Pull.UP`), you do **NOT** need external resistors or matrix diodes. Simply solder one leg of each switch to its designated GPIO pin and the other leg to GND!

---

## ⚡ Quick Start: 3-Step Setup

### Step 1: Install CircuitPython on RP2040-Zero
1. Hold down the **BOOT** button on your RP2040-Zero and plug it into your computer via USB-C.
2. A drive named **`RPI-RP2`** will appear on your computer.
3. Download the latest CircuitPython `.uf2` file for RP2040-Zero from [circuitpython.org](https://circuitpython.org/board/waveshare_rp2040_zero/) and drag it onto the `RPI-RP2` drive.
4. The board will reboot into a new drive named **`CIRCUITPY`**.

### Step 2: Copy Required Libraries
Download the **Adafruit CircuitPython Community Bundle** and copy these folders into the `lib/` directory on your `CIRCUITPY` drive:
- `adafruit_hid/`
- `neopixel.mpy`

### Step 3: Copy Firmware Files
Copy `boot.py` and `code.py` from this `firmware/` directory into the root of your `CIRCUITPY` drive.

---

## 🌐 Web Serial Live Sync & Configuration
1. Open this **Grid Macro 1 Studio** web app in Google Chrome, Edge, or Opera.
2. Click **Connect RP2040** on the top right navigation badge or in the **Settings** tab.
3. Select your RP2040-Zero USB Serial port (`/dev/ttyACM0` or `COMx`).
4. Click **Flash to RP2040** to instantly transfer your custom layers, macros, shortcuts, and dial actions directly to the microcontroller over USB!
5. When you press physical keys or turn the knob on your hardware, the web app's macropad will light up and track live in real time.
