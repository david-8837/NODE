# boot.py - Grid Macro 1 RP2040-Zero USB Configuration
# Place this file in the root of your RP2040-Zero (CIRCUITPY drive)

import usb_cdc
import storage
import board
import digitalio

# Enable both console and raw data serial for Web Serial bidirectional configuration
usb_cdc.enable(console=True, data=True)

# Allow the RP2040-Zero internal script to write keymap.json from Web Serial
# If you want to edit files via PC USB drive, hold down Key 1 (GP0) while plugging in.
key1 = digitalio.DigitalInOut(board.GP0)
key1.direction = digitalio.Direction.INPUT
key1.pull = digitalio.Pull.UP

if not key1.value:
    # Held down on boot: read-only to RP2040 script, writable by host PC USB drive
    storage.remount("/", readonly=False)
else:
    # Default boot: Writable by Python script (for Web Serial live flashing)
    storage.remount("/", readonly=False)

key1.deinit()
