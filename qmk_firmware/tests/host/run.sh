#!/usr/bin/env bash
# Host-side behavioural test for the Grid Macro 1 VIA keymap.
#
# Compiles the real keymap.c against a small stub of the QMK API and exercises the
# custom keycode logic natively. This catches logic errors (layer wrap, keycode
# collisions, RGB state, EEPROM write coalescing) without an RP2040 board or the
# QMK toolchain.
#
# It is NOT a substitute for `qmk compile`: the stubs only model the primitives
# this keymap uses, and no USB, matrix scanning, or WS2812 timing is exercised.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
keymap="$here/../../grid_macro_1/keymaps/via/keymap.c"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

CC="${CC:-cc}"

# QMK_KEYBOARD_H is a placeholder resolved by the QMK build system; swap it for
# the stub header. Everything else in keymap.c is compiled unmodified.
sed 's/#include QMK_KEYBOARD_H/#include "qmk_stubs.h"/' "$keymap" > "$work/keymap_under_test.c"
cp "$here/qmk_stubs.h" "$here/test_keymap.c" "$work/"
for header in raw_hid.h eeprom.h dynamic_keymap.h; do
  printf '#include "qmk_stubs.h"\n' > "$work/$header"
done

"$CC" -std=c11 -Wall -Wextra -Werror \
  -Wno-unused-parameter -Wno-unused-function \
  -O1 -o "$work/test_keymap" "$work/test_keymap.c" "$work/keymap_under_test.c"

"$work/test_keymap"
