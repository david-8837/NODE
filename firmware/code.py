"""
GRID MACRO 1 - RP2040-Zero Macropad Firmware
Hardware: Waveshare RP2040-Zero (or standard RP2040)
Matrix: 9 Direct Keys (GP0 - GP8) + 1 Rotary Encoder (GP9, GP10, GP11) + Onboard WS2812 RGB LED (GP16)
Protocol: USB HID (Keyboard + Consumer Control) + Web Serial Bidirectional Config
"""

import time
import json
import board
import digitalio
import rotaryio
import usb_hid
import usb_cdc
import neopixel

from adafruit_hid.keyboard import Keyboard
from adafruit_hid.keyboard_layout_us import KeyboardLayoutUS
from adafruit_hid.keycode import Keycode
from adafruit_hid.consumer_control import ConsumerControl
from adafruit_hid.consumer_control_code import ConsumerControlCode

# ---------------------------------------------------------------------------
# HARDWARE PINOUT MAPPING (RP2040-Zero)
# ---------------------------------------------------------------------------
KEY_PINS = [
    board.GP0,  # r1c1 (Key 1)
    board.GP1,  # r1c2 (Key 2)
    board.GP2,  # r1c3 (Key 3)
    board.GP3,  # r2c1 (Key 4)
    board.GP4,  # r2c2 (Key 5)
    board.GP5,  # r2c3 (Key 6)
    board.GP6,  # r3c1 (Key 7)
    board.GP7,  # r3c2 (Key 8)
    board.GP8,  # r3c3 (Key 9)
]

SLOT_NAMES = [
    "r1c1", "r1c2", "r1c3",
    "r2c1", "r2c2", "r2c3",
    "r3c1", "r3c2", "r3c3",
]

ENCODER_PIN_A = board.GP9    # CW
ENCODER_PIN_B = board.GP10   # CCW
ENCODER_PIN_SW = board.GP11  # Encoder Press Switch

NEOPIXEL_PIN = board.GP16
NEOPIXEL_COUNT = 1

# ---------------------------------------------------------------------------
# INITIALIZE HARDWARE
# ---------------------------------------------------------------------------
# USB HID Devices
kbd = Keyboard(usb_hid.devices)
layout = KeyboardLayoutUS(kbd)
cc = ConsumerControl(usb_hid.devices)

# RGB Status LED
pixel = neopixel.NeoPixel(NEOPIXEL_PIN, NEOPIXEL_COUNT, brightness=0.25, auto_write=True)
pixel[0] = (0, 81, 255)  # Electric Blue

# Key Inputs (Direct GPIO with internal pull-up)
keys = []
for pin in KEY_PINS:
    k = digitalio.DigitalInOut(pin)
    k.direction = digitalio.Direction.INPUT
    k.pull = digitalio.Pull.UP
    keys.append(k)

# Encoder Inputs
encoder = rotaryio.IncrementalEncoder(ENCODER_PIN_A, ENCODER_PIN_B)
encoder_sw = digitalio.DigitalInOut(ENCODER_PIN_SW)
encoder_sw.direction = digitalio.Direction.INPUT
encoder_sw.pull = digitalio.Pull.UP

last_encoder_pos = encoder.position
last_sw_state = encoder_sw.value
last_key_states = [k.value for k in keys]

# ---------------------------------------------------------------------------
# KEYCODE & CONSUMER CONTROL LOOKUP DICTIONARY
# ---------------------------------------------------------------------------
KEY_MAP = {
    "a": Keycode.A, "b": Keycode.B, "c": Keycode.C, "d": Keycode.D,
    "e": Keycode.E, "f": Keycode.F, "g": Keycode.G, "h": Keycode.H,
    "i": Keycode.I, "j": Keycode.J, "k": Keycode.K, "l": Keycode.L,
    "m": Keycode.M, "n": Keycode.N, "o": Keycode.O, "p": Keycode.P,
    "q": Keycode.Q, "r": Keycode.R, "s": Keycode.S, "t": Keycode.T,
    "u": Keycode.U, "v": Keycode.V, "w": Keycode.W, "x": Keycode.X,
    "y": Keycode.Y, "z": Keycode.Z,
    "0": Keycode.ZERO, "1": Keycode.ONE, "2": Keycode.TWO, "3": Keycode.THREE,
    "4": Keycode.FOUR, "5": Keycode.FIVE, "6": Keycode.SIX, "7": Keycode.SEVEN,
    "8": Keycode.EIGHT, "9": Keycode.NINE,
    "enter": Keycode.ENTER, "return": Keycode.ENTER,
    "esc": Keycode.ESCAPE, "escape": Keycode.ESCAPE,
    "backspace": Keycode.BACKSPACE, "bksp": Keycode.BACKSPACE,
    "tab": Keycode.TAB, "space": Keycode.SPACEBAR, "spacebar": Keycode.SPACEBAR,
    "minus": Keycode.MINUS, "equal": Keycode.EQUALS,
    "left_bracket": Keycode.LEFT_BRACKET, "right_bracket": Keycode.RIGHT_BRACKET,
    "backslash": Keycode.BACKSLASH, "semicolon": Keycode.SEMICOLON,
    "quote": Keycode.QUOTE, "grave": Keycode.GRAVE_ACCENT,
    "comma": Keycode.COMMA, "period": Keycode.PERIOD, "slash": Keycode.FORWARD_SLASH,
    "caps_lock": Keycode.CAPS_LOCK,
    "f1": Keycode.F1, "f2": Keycode.F2, "f3": Keycode.F3, "f4": Keycode.F4,
    "f5": Keycode.F5, "f6": Keycode.F6, "f7": Keycode.F7, "f8": Keycode.F8,
    "f9": Keycode.F9, "f10": Keycode.F10, "f11": Keycode.F11, "f12": Keycode.F12,
    "print_screen": Keycode.PRINT_SCREEN, "scroll_lock": Keycode.SCROLL_LOCK,
    "pause": Keycode.PAUSE, "insert": Keycode.INSERT,
    "home": Keycode.HOME, "page_up": Keycode.PAGE_UP,
    "delete": Keycode.DELETE, "del": Keycode.DELETE,
    "end": Keycode.END, "page_down": Keycode.PAGE_DOWN,
    "right": Keycode.RIGHT_ARROW, "left": Keycode.LEFT_ARROW,
    "down": Keycode.DOWN_ARROW, "up": Keycode.UP_ARROW,
    # Modifiers
    "ctrl": Keycode.LEFT_CONTROL, "control": Keycode.LEFT_CONTROL,
    "shift": Keycode.LEFT_SHIFT,
    "alt": Keycode.LEFT_ALT, "option": Keycode.LEFT_ALT, "opt": Keycode.LEFT_ALT,
    "gui": Keycode.LEFT_GUI, "cmd": Keycode.LEFT_GUI, "command": Keycode.LEFT_GUI, "win": Keycode.LEFT_GUI,
}

MEDIA_MAP = {
    "volume +": ConsumerControlCode.VOLUME_INCREMENT,
    "volume -": ConsumerControlCode.VOLUME_DECREMENT,
    "volume_up": ConsumerControlCode.VOLUME_INCREMENT,
    "volume_down": ConsumerControlCode.VOLUME_DECREMENT,
    "vol_up": ConsumerControlCode.VOLUME_INCREMENT,
    "vol_down": ConsumerControlCode.VOLUME_DECREMENT,
    "mute": ConsumerControlCode.MUTE,
    "play": ConsumerControlCode.PLAY_PAUSE,
    "play / pause": ConsumerControlCode.PLAY_PAUSE,
    "play_pause": ConsumerControlCode.PLAY_PAUSE,
    "next": ConsumerControlCode.SCAN_NEXT_TRACK,
    "next_track": ConsumerControlCode.SCAN_NEXT_TRACK,
    "prev": ConsumerControlCode.SCAN_PREVIOUS_TRACK,
    "prev_track": ConsumerControlCode.SCAN_PREVIOUS_TRACK,
    "stop": ConsumerControlCode.STOP,
    "fast_forward": ConsumerControlCode.FAST_FORWARD,
    "rewind": ConsumerControlCode.REWIND,
    "brightness +": ConsumerControlCode.BRIGHTNESS_INCREMENT,
    "brightness -": ConsumerControlCode.BRIGHTNESS_DECREMENT,
}

# ---------------------------------------------------------------------------
# DEFAULT CONFIGURATION
# ---------------------------------------------------------------------------
DEFAULT_CONFIG = {
    "version": "1.0.2",
    "deviceName": "Grid macro 1",
    "activeLayerIndex": 0,
    "layers": [
        {
            "dial-tl": {
                "label": "Vol",
                "binding": "Volume / Play",
                "encoderActions": {
                    "cw": {"label": "vo...", "binding": "volume +"},
                    "press": {"label": "pl...", "binding": "play"},
                    "ccw": {"label": "vo...", "binding": "volume -"}
                }
            },
            "r1c1": {"label": "Q", "binding": "q"},
            "r1c2": {"label": "W", "binding": "w"},
            "r1c3": {"label": "E", "binding": "e"},
            "r2c1": {"label": "A", "binding": "a"},
            "r2c2": {"label": "S", "binding": "s"},
            "r2c3": {"label": "D", "binding": "d"},
            "r3c1": {"label": "Z", "binding": "z"},
            "r3c2": {"label": "X", "binding": "x"},
            "r3c3": {"label": "C", "binding": "c"}
        }
    ]
}

# ---------------------------------------------------------------------------
# STORAGE / CONFIG MANAGEMENT
# ---------------------------------------------------------------------------
def load_config():
    try:
        with open("/keymap.json", "r") as f:
            data = json.load(f)
            return data
    except Exception as e:
        print("[GridMacro1] Using default config:", e)
        return DEFAULT_CONFIG

def save_config(cfg):
    try:
        with open("/keymap.json", "w") as f:
            json.dump(cfg, f)
        print("[GridMacro1] Saved config to /keymap.json")
        return True
    except Exception as e:
        print("[GridMacro1] Save error (storage may be read-only):", e)
        return False

current_config = load_config()
active_layer_idx = current_config.get("activeLayerIndex", 0)

# ---------------------------------------------------------------------------
# ACTION EXECUTION ENGINE
# ---------------------------------------------------------------------------
def execute_binding(binding_str):
    if not binding_str or binding_str.lower() in ["blank", "—", ""]:
        return

    b = binding_str.strip().lower()

    # Check for Consumer Control Media Action
    for media_name, media_code in MEDIA_MAP.items():
        if b == media_name or f"({media_name})" in b or media_name in b:
            cc.send(media_code)
            return

    # Extract shortcut tokens inside parentheses or direct string
    if "(" in b and ")" in b:
        start = b.find("(") + 1
        end = b.find(")")
        shortcut_part = b[start:end].strip()
    else:
        shortcut_part = b

    # Split tokens by '+'
    tokens = [t.strip().replace("cmd", "gui").replace("command", "gui").replace("win", "gui")
              for t in shortcut_part.split("+")]

    keycodes = []
    for t in tokens:
        if t in KEY_MAP:
            keycodes.append(KEY_MAP[t])
        elif len(t) == 1 and t in KEY_MAP:
            keycodes.append(KEY_MAP[t])

    if keycodes:
        # Press all modifiers and key simultaneously, then release
        kbd.send(*keycodes)
    else:
        # Fallback: type as raw text string
        try:
            layout.write(shortcut_part)
        except Exception:
            pass

def send_serial_json(obj):
    msg = json.dumps(obj) + "\n"
    # Send via usb_cdc.data if connected, fallback to console
    if usb_cdc.data and usb_cdc.data.connected:
        try:
            usb_cdc.data.write(msg.encode("utf-8"))
        except Exception:
            pass
    if usb_cdc.console and usb_cdc.console.connected:
        try:
            usb_cdc.console.write(msg.encode("utf-8"))
        except Exception:
            pass

def handle_serial_input():
    global current_config, active_layer_idx
    port = usb_cdc.data if (usb_cdc.data and usb_cdc.data.in_waiting) else usb_cdc.console
    if not port or not port.in_waiting:
        return

    try:
        raw_line = port.readline().decode("utf-8").strip()
        if not raw_line:
            return
        msg = json.loads(raw_line)
        cmd = msg.get("cmd")

        if cmd == "PING":
            send_serial_json({
                "status": "OK",
                "device": "Grid macro 1",
                "mcu": "RP2040-Zero",
                "version": current_config.get("version", "1.0.2"),
                "activeLayer": active_layer_idx,
                "layerCount": len(current_config.get("layers", []))
            })
            # Visual feedback on Ping
            pixel[0] = (0, 255, 128)
            time.sleep(0.04)
            pixel[0] = (0, 81, 255)

        elif cmd == "GET_CONFIG":
            send_serial_json({
                "status": "OK",
                "type": "CONFIG_DATA",
                "data": current_config
            })

        elif cmd == "SET_CONFIG":
            new_data = msg.get("data")
            if new_data:
                current_config = new_data
                active_layer_idx = current_config.get("activeLayerIndex", 0)
                saved = save_config(current_config)
                send_serial_json({
                    "status": "OK" if saved else "ERROR_READONLY",
                    "saved": saved,
                    "msg": "Keymap updated successfully" if saved else "Updated in RAM (Boot drive readonly)"
                })
                # Visual success flash
                pixel[0] = (0, 255, 0)
                time.sleep(0.12)
                pixel[0] = (0, 81, 255)

        elif cmd == "SET_LAYER":
            idx = msg.get("layer", 0)
            layers = current_config.get("layers", [])
            if 0 <= idx < len(layers):
                active_layer_idx = idx
                send_serial_json({"status": "OK", "activeLayer": active_layer_idx})

    except Exception as e:
        send_serial_json({"status": "ERROR", "error": str(e)})

# ---------------------------------------------------------------------------
# MAIN LOOP
# ---------------------------------------------------------------------------
print("[GridMacro1] RP2040-Zero Ready! Listening for USB HID + Serial...")

while True:
    # 1. Check Web Serial Commands
    handle_serial_input()

    layers = current_config.get("layers", [])
    active_layer = layers[active_layer_idx] if (0 <= active_layer_idx < len(layers)) else {}

    # 2. Scan 9 Matrix Keys (Direct Pin, active LOW)
    for i, key_in in enumerate(keys):
        val = key_in.value
        slot = SLOT_NAMES[i]
        if val != last_key_states[i]:
            last_key_states[i] = val
            if not val:  # Pressed (LOW)
                pixel[0] = (255, 255, 255)  # Flash white on physical press
                send_serial_json({"event": "KEY_DOWN", "slot": slot})
                key_data = active_layer.get(slot, {})
                execute_binding(key_data.get("binding", key_data.get("label", "")))
            else:  # Released (HIGH)
                pixel[0] = (0, 81, 255)
                send_serial_json({"event": "KEY_UP", "slot": slot})

    # 3. Scan Rotary Encoder Position
    pos = encoder.position
    if pos != last_encoder_pos:
        diff = pos - last_encoder_pos
        last_encoder_pos = pos

        dial_data = active_layer.get("dial-tl", {})
        enc_actions = dial_data.get("encoderActions", {})

        if diff > 0:  # Clockwise rotation
            pixel[0] = (0, 200, 255)
            send_serial_json({"event": "DIAL_ROTATED", "dir": "cw", "slot": "dial-tl"})
            cw_action = enc_actions.get("cw", {}).get("binding", "volume +")
            execute_binding(cw_action)
        else:  # Counter-clockwise rotation
            pixel[0] = (0, 200, 255)
            send_serial_json({"event": "DIAL_ROTATED", "dir": "ccw", "slot": "dial-tl"})
            ccw_action = enc_actions.get("ccw", {}).get("binding", "volume -")
            execute_binding(ccw_action)

        time.sleep(0.01)
        pixel[0] = (0, 81, 255)

    # 4. Scan Rotary Encoder Press Switch (active LOW)
    sw_val = encoder_sw.value
    if sw_val != last_sw_state:
        last_sw_state = sw_val
        if not sw_val:  # Encoder clicked down
            pixel[0] = (255, 120, 0)
            send_serial_json({"event": "DIAL_PRESS", "state": "down", "slot": "dial-tl"})
            dial_data = active_layer.get("dial-tl", {})
            enc_actions = dial_data.get("encoderActions", {})
            press_action = enc_actions.get("press", {}).get("binding", "play")
            execute_binding(press_action)
        else:  # Encoder released
            pixel[0] = (0, 81, 255)
            send_serial_json({"event": "DIAL_PRESS", "state": "up", "slot": "dial-tl"})

    time.sleep(0.002)  # 500 Hz scanning rate
