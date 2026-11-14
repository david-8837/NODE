import sys
import types
import unittest
from pathlib import Path


class _DigitalInput:
    def __init__(self, _pin, value):
        self.value = value
        self.direction = None
        self.pull = None
        self.deinitialized = False

    def deinit(self):
        self.deinitialized = True


def run_boot_py(key_held):
    calls = {"remount": [], "cdc": []}
    modules = {}

    usb_cdc = types.ModuleType("usb_cdc")
    usb_cdc.enable = lambda **kwargs: calls["cdc"].append(kwargs)
    modules["usb_cdc"] = usb_cdc

    storage = types.ModuleType("storage")
    storage.remount = lambda path, **kwargs: calls["remount"].append((path, kwargs))
    modules["storage"] = storage

    board = types.ModuleType("board")
    board.GP0 = object()
    modules["board"] = board

    digitalio = types.ModuleType("digitalio")
    digitalio.Direction = types.SimpleNamespace(INPUT="input")
    digitalio.Pull = types.SimpleNamespace(UP="up")
    digitalio.DigitalInOut = lambda pin: _DigitalInput(pin, not key_held)
    modules["digitalio"] = digitalio

    original = {name: sys.modules.get(name) for name in modules}
    try:
        sys.modules.update(modules)
        source = Path(__file__).resolve().parents[1] / "firmware" / "boot.py"
        exec(compile(source.read_text(encoding="utf-8"), str(source), "exec"), {})
    finally:
        for name, prior in original.items():
            if prior is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = prior
    return calls


class FirmwareBootStorageModeTests(unittest.TestCase):
    def test_held_key_selects_host_edit_mode_and_read_only_python_view(self):
        calls = run_boot_py(key_held=True)
        self.assertEqual(calls["remount"], [("/", {"readonly": True})])

    def test_normal_boot_selects_writable_firmware_mode(self):
        calls = run_boot_py(key_held=False)
        self.assertEqual(calls["remount"], [("/", {"readonly": False})])

    def test_boot_enables_both_usb_cdc_interfaces(self):
        calls = run_boot_py(key_held=False)
        self.assertEqual(calls["cdc"], [{"console": True, "data": True}])


if __name__ == "__main__":
    unittest.main()
