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
    # Held down on boot: USB drive writable by host PC, read-only to CircuitPython scripts.
    # Use this mode to edit code.py / keymap.json from your computer's file manager.
    storage.remount("/", readonly=False)
else:
    # Default boot: USB drive read-only to host PC, writable by CircuitPython scripts.
    # This allows code.py to save keymap.json via Web Serial SET_CONFIG commands.
    storage.remount("/", readonly=True)

key1.deinit()
