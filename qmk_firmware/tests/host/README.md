# Host-compiled keymap logic tests

Runs the real `grid_macro_1/keymaps/via/keymap.c` as a native executable against a
small stub of the QMK API, so keymap logic can be verified without an RP2040 board
or the QMK toolchain.

```bash
bash qmk_firmware/tests/host/run.sh
```

Requires only a C compiler (`cc`, override with `CC=clang`). Runs in CI after the
Vitest suite.

## What this covers

- **Layer Cycle (`MP_LAYER_CYCLE`)** — advances the real keymap via `layer_move()`,
  wraps at `MP_MAX_LAYERS`, ignores key release, and produces both the LED update
  and the `MP_EVT_LAYER_STATE` report from the single `layer_state_set_user()` hook.
- **FN RGB keys (`MP_RGB_*`)** — drive `mp_*` renderer state rather than QMK's
  rgblight config, so the 20 ms housekeeping renderer does not overwrite them.
  Covers toggle, mode cycling (never selects Off), speed clamping at 0/100, and
  per-layer isolation.
- **EEPROM wear** — rapid encoder steps coalesce into one deferred write; a host
  `SET_RGB` with `persist=0` cancels a pending local write.
- **Protocol consistency** — the RGB event and `GET_STATE` payloads agree
  byte-for-byte, since both use `mp_fill_state_report()`.
- **Keycode isolation** — new codes collide with neither `MP_TRIG` nor `MP_PROF`,
  and ordinary keycodes still return `true`.

## What this does NOT cover

This is **not** a substitute for `qmk compile` or testing on hardware. The stubs
model only the primitives this keymap calls. Not exercised:

- Real QMK compilation, link-time symbol resolution, and firmware size
- USB enumeration, Raw HID transport, matrix scanning, debounce, encoder timing
- Actual WS2812 output, colour accuracy, or animation smoothness
- Real EEPROM/flash wear-levelling behaviour and persistence across power cycles

The `layer_move()` stub calls `layer_state_set_user()` to mirror QMK's documented
behaviour; that coupling is assumed here and should be confirmed on hardware.
