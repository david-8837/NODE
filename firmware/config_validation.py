"""Small, CircuitPython-compatible validator for device configuration data.

Keep this module free of CPython-only dependencies so it can be copied beside
code.py on the CIRCUITPY drive and exercised by the host-side unit tests.
"""

import json

MAX_CONFIG_BYTES = 32 * 1024
MAX_LAYERS = 8
MAX_LABEL_LENGTH = 128
MAX_BINDING_LENGTH = 256
KEY_SLOTS = (
    "r1c1", "r1c2", "r1c3",
    "r2c1", "r2c2", "r2c3",
    "r3c1", "r3c2", "r3c3",
)
ENCODER_DIRECTIONS = ("cw", "press", "ccw")


def _text(value, field, default, max_length):
    if value is None:
        value = default
    if not isinstance(value, str):
        raise ValueError(field + " must be text")
    if len(value) > max_length:
        raise ValueError(field + " exceeds the " + str(max_length) + " character limit")
    return value


def _assignment(value, field, with_encoder=False):
    if not isinstance(value, dict):
        raise ValueError(field + " must be an object")

    result = {
        "label": _text(value.get("label"), field + ".label", "", MAX_LABEL_LENGTH),
        "binding": _text(value.get("binding"), field + ".binding", "blank", MAX_BINDING_LENGTH),
    }
    if with_encoder:
        actions = value.get("encoderActions", {})
        if not isinstance(actions, dict):
            raise ValueError(field + ".encoderActions must be an object")
        result["encoderActions"] = {}
        for direction in ENCODER_DIRECTIONS:
            action = actions[direction] if direction in actions else {}
            result["encoderActions"][direction] = _assignment(
                action, field + ".encoderActions." + direction
            )
    return result


def sanitize_config(config):
    """Validate and copy the supported keymap fields, dropping unrelated data."""
    if not isinstance(config, dict):
        raise ValueError("configuration must be an object")

    raw_layers = config.get("layers")
    if not isinstance(raw_layers, list) or not 1 <= len(raw_layers) <= MAX_LAYERS:
        raise ValueError("layers must contain between 1 and " + str(MAX_LAYERS) + " entries")

    active_layer = config.get("activeLayerIndex", 0)
    if type(active_layer) is not int or not 0 <= active_layer < len(raw_layers):
        raise ValueError("activeLayerIndex must reference an existing layer")

    layers = []
    for layer_index, raw_layer in enumerate(raw_layers):
        if not isinstance(raw_layer, dict):
            raise ValueError("layer " + str(layer_index) + " must be an object")
        layer = {}
        for slot in KEY_SLOTS:
            if slot in raw_layer:
                layer[slot] = _assignment(raw_layer[slot], "layer." + slot)
        if "dial-tl" in raw_layer:
            layer["dial-tl"] = _assignment(raw_layer["dial-tl"], "layer.dial-tl", True)
        # Firmware ignores app-only metadata. Do not persist arbitrary payloads.
        if "presetId" in raw_layer and not isinstance(raw_layer["presetId"], str):
            raise ValueError("layer.presetId must be text")
        layers.append(layer)

    result = {
        "version": _text(config.get("version"), "version", "1.0.2", 24),
        "deviceName": _text(config.get("deviceName"), "deviceName", "Grid macro 1", 48),
        "activeLayerIndex": active_layer,
        "layers": layers,
    }
    encoded_size = len(json.dumps(result).encode("utf-8"))
    if encoded_size > MAX_CONFIG_BYTES:
        raise ValueError("configuration exceeds the device storage limit")
    return result
