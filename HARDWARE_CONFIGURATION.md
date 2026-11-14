# Hardware configuration and evidence

## Source-defined target

The QMK keyboard definition targets an RP2040-based Grid Macro 1 and declares VID `0xFEED`, PID `0x6001`, a 3-row × 3-column direct-pin matrix plus an encoder push row, one rotary encoder, and one WS2812 indicator. The CircuitPython source separately documents the Waveshare RP2040-Zero mapping below. These are repository assumptions, not a verified schematic or physical board measurement.

| Function | Source pin(s) | Evidence |
| --- | --- | --- |
| Keys 1–9 | GP0–GP8 | `keyboard.json` direct matrix rows 0–2; `firmware/code.py` |
| Encoder A/B | GP9 / GP10, resolution 4 | `keyboard.json`; `firmware/code.py`; QMK direction flip in `config.h` |
| Encoder push | GP11 | `keyboard.json` direct matrix row 3, col 0; `grid_macro_1.h`; CircuitPython source |
| WS2812 | GP16, one LED | `keyboard.json`, `config.h`, CircuitPython source |
| Switch topology | Per-pin input with pull-up and common ground in CircuitPython notes | No schematic available; QMK matrix electrical wiring not independently confirmed |
| Diodes | No `diode_direction` declared; QMK direct matrix pin list | CircuitPython notes describe no diodes; do not infer board wiring without inspection |
| USB identity | VID `0xFEED`, PID `0x6001`, descriptor version `1.0.8` | QMK `keyboard.json`; not a readout of currently flashed firmware |
| Observed Raw HID collection | MI_01, interface 1, Usage Page `0xFF60`, Usage `0x61` | User-provided Windows listing on 2026-11-13; one exact candidate among six descriptors |

## USB interfaces

QMK source enables VIA and Raw HID. The Agent intends to use the vendor Raw HID collection at Usage Page `0xFF60`, Usage `0x61`. The supplied listing confirms this is MI_01; the other descriptors are in MI_00/MI_02. Descriptor enumeration alone does not prove which collection a `node-hid` handle opened.

## Flash and persistence

The QMK config declares `DYNAMIC_KEYMAP_EEPROM_MAX_ADDR 4095` and four dynamic layers. RP2040 EEPROM is emulated in flash by the pinned QMK implementation. The laboratory lighting experiment describes a hypothetical 2 MiB/sector layout but is disabled and unvalidated. Neither that experiment nor the build settings establish actual partition boundaries for a device. The CircuitPython alternative writes `/keymap.json` and has distinct host/board remount behavior.

## Risks and required physical evidence

- No schematic, board revision, firmware version readout, flash map, or physical electrical diagnostics were available. The Windows HID descriptor listing was supplied and is recorded above.
- Do not flash a firmware artifact with unresolved checksum/provenance mismatch.
- Before a hardware session, export Studio profile, save VIA keymap/encoder snapshot, back up VIA macros separately, record firmware identity, and confirm the board recovery method.
- Verify continuity, pin assignment, encoder direction, LED color/order, debounce, and USB collection behavior on the actual revision before claiming physical validation.
- The descriptor listing confirms the expected Raw HID usage; next, verify the Agent opens and reconnects that interface without a read error.
