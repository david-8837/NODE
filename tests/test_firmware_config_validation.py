import copy
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "firmware"))
from config_validation import MAX_CONFIG_BYTES, sanitize_config  # noqa: E402
from input_debounce import DebouncedInput  # noqa: E402
from serial_line_reader import SerialLineReader  # noqa: E402


class FirmwareSerialLineReaderTests(unittest.TestCase):
    def test_accumulates_fragmented_lines_until_newline(self):
        reader = SerialLineReader(16)
        lines, rejected = reader.feed(b'{"cmd":')
        self.assertEqual((lines, rejected), ([], 0))
        lines, rejected = reader.feed(b'"PING"}\n')
        self.assertEqual((lines, rejected), ([b'{"cmd":"PING"}'], 0))

    def test_accepts_exact_limit_and_rejects_one_byte_over(self):
        reader = SerialLineReader(4)
        lines, rejected = reader.feed(b"1234\n12345\n")
        self.assertEqual(lines, [b"1234"])
        self.assertEqual(rejected, 1)

    def test_discards_oversized_frame_then_recovers_on_following_line(self):
        reader = SerialLineReader(4)
        lines, rejected = reader.feed(b"abcdef\nok\n")
        self.assertEqual(lines, [b"ok"])
        self.assertEqual(rejected, 1)
        self.assertEqual(len(reader.buffer), 0)
        self.assertFalse(reader.discarding_oversized_line)

    def test_internal_buffer_never_grows_past_configured_limit(self):
        reader = SerialLineReader(8)
        lines, rejected = reader.feed(b"x" * 10_000)
        self.assertEqual((lines, rejected), ([], 0))
        self.assertLessEqual(len(reader.buffer), reader.max_line_bytes)
        lines, rejected = reader.feed(b"\nnext\n")
        self.assertEqual((lines, rejected), ([b"next"], 1))


class FirmwareInputDebounceTests(unittest.TestCase):
    def test_ignores_short_contact_bounce(self):
        button = DebouncedInput(True, debounce_seconds=0.005)
        self.assertIsNone(button.update(False, 1.000))
        self.assertIsNone(button.update(True, 1.002))
        self.assertIsNone(button.update(True, 1.010))
        self.assertTrue(button.stable_value)

    def test_reports_press_and_release_only_after_stable_interval(self):
        button = DebouncedInput(True, debounce_seconds=0.005)
        self.assertIsNone(button.update(False, 2.000))
        self.assertIsNone(button.update(False, 2.004))
        self.assertIs(button.update(False, 2.005), False)
        self.assertIsNone(button.update(True, 2.100))
        self.assertIsNone(button.update(True, 2.104))
        self.assertIs(button.update(True, 2.105), True)

    def test_rejects_negative_debounce_window(self):
        with self.assertRaises(ValueError):
            DebouncedInput(True, debounce_seconds=-0.001)

    def test_ignores_ten_thousand_millisecond_bounce_transitions(self):
        button = DebouncedInput(True, debounce_seconds=0.005)
        raw_value = True
        for index in range(10_000):
            raw_value = not raw_value
            self.assertIsNone(button.update(raw_value, index / 1000.0))
        self.assertTrue(button.stable_value)


class FirmwareConfigValidationTests(unittest.TestCase):
    def test_circuitpython_entrypoint_is_valid_python_syntax(self):
        firmware_source = Path(__file__).resolve().parents[1] / "firmware" / "code.py"
        compile(firmware_source.read_text(encoding="utf-8"), str(firmware_source), "exec")

    def setUp(self):
        self.config = {
            "version": "1.0.2",
            "deviceName": "Grid macro 1",
            "activeLayerIndex": 0,
            "layers": [
                {
                    "r1c1": {"label": "Q", "binding": "q"},
                    "dial-tl": {
                        "label": "Dial",
                        "binding": "blank",
                        "encoderActions": {
                            "cw": {"label": "Volume up", "binding": "volume_up"},
                            "press": {"label": "", "binding": "blank"},
                            "ccw": {"label": "Volume down", "binding": "volume_down"},
                        },
                    },
                }
            ],
        }

    def test_accepts_a_valid_config_and_supplies_missing_encoder_actions(self):
        result = sanitize_config(self.config)
        self.assertEqual(result["layers"][0]["r1c1"]["binding"], "q")
        self.assertEqual(
            result["layers"][0]["dial-tl"]["encoderActions"]["press"]["binding"],
            "blank",
        )
        self.assertNotIn("r1c2", result["layers"][0])

    def test_sanitizes_to_a_copy_and_drops_unrecognized_fields(self):
        original = copy.deepcopy(self.config)
        self.config["unexpected"] = {"large": "payload"}
        self.config["layers"][0]["r1c1"]["execution"] = {"kind": "native"}
        result = sanitize_config(self.config)
        self.assertEqual(self.config["layers"][0]["r1c1"]["execution"], {"kind": "native"})
        self.assertNotIn("unexpected", result)
        self.assertNotIn("execution", result["layers"][0]["r1c1"])
        self.assertEqual(original["layers"][0]["r1c1"]["binding"], "q")

    def test_rejects_non_object_configs_and_layers(self):
        for invalid in (None, [], "config", {"layers": "not-an-array"}, {"layers": [None]}):
            with self.subTest(invalid=invalid):
                with self.assertRaises(ValueError):
                    sanitize_config(invalid)

    def test_rejects_empty_or_excessive_layer_counts(self):
        for layers in ([], [{}] * 9):
            with self.subTest(layer_count=len(layers)):
                with self.assertRaises(ValueError):
                    sanitize_config({"layers": layers, "activeLayerIndex": 0})

    def test_accepts_the_maximum_layer_count_when_active_layer_is_valid(self):
        config = {"layers": [{} for _ in range(8)], "activeLayerIndex": 7}
        self.assertEqual(sanitize_config(config)["activeLayerIndex"], 7)

    def test_rejects_out_of_range_or_non_integer_active_layer(self):
        for active_layer in (-1, 1, True, 0.5, "0", None):
            with self.subTest(active_layer=active_layer):
                with self.assertRaises(ValueError):
                    sanitize_config({"layers": [{}], "activeLayerIndex": active_layer})

    def test_rejects_malformed_key_and_encoder_assignments(self):
        invalid_configs = []
        for slot_value in (None, [], "q", 1):
            config = copy.deepcopy(self.config)
            config["layers"][0]["r1c1"] = slot_value
            invalid_configs.append(config)
        config = copy.deepcopy(self.config)
        config["layers"][0]["dial-tl"]["encoderActions"] = []
        invalid_configs.append(config)
        config = copy.deepcopy(self.config)
        config["layers"][0]["dial-tl"]["encoderActions"]["cw"] = "bad"
        invalid_configs.append(config)
        config = copy.deepcopy(self.config)
        config["layers"][0]["dial-tl"]["encoderActions"]["cw"] = None
        invalid_configs.append(config)
        for config in invalid_configs:
            with self.subTest(config=config):
                with self.assertRaises(ValueError):
                    sanitize_config(config)

    def test_rejects_wrong_field_types_and_overlong_strings(self):
        for field, value in (("binding", 42), ("label", False), ("binding", "x" * 257), ("label", "x" * 129)):
            config = copy.deepcopy(self.config)
            config["layers"][0]["r1c1"][field] = value
            with self.subTest(field=field, value_type=type(value).__name__):
                with self.assertRaises(ValueError):
                    sanitize_config(config)

    def test_rejects_configs_that_exceed_device_storage_budget(self):
        config = {"layers": []}
        for _ in range(8):
            layer = {
                "r{}c{}".format(row, column): {"label": "L" * 128, "binding": "B" * 256}
                for row in range(1, 4)
                for column in range(1, 4)
            }
            layer["dial-tl"] = {
                "label": "D" * 128,
                "binding": "B" * 256,
                "encoderActions": {
                    direction: {"label": "L" * 128, "binding": "B" * 256}
                    for direction in ("cw", "press", "ccw")
                },
            }
            config["layers"].append(layer)
        with self.assertRaisesRegex(ValueError, "device storage limit"):
            sanitize_config(config)
        self.assertGreater(MAX_CONFIG_BYTES, 0)


if __name__ == "__main__":
    unittest.main()
