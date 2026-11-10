#!/usr/bin/env bash
# Build a Grid Macro 1 UF2 from an initialized QMK firmware checkout.
set -euo pipefail

KEYBOARD="grid_macro_1"
KEYMAP="${1:-via}"
case "$KEYMAP" in
  via|default) ;;
  *) echo "Usage: $0 [via|default]" >&2; exit 2 ;;
esac

if ! command -v qmk >/dev/null 2>&1; then
  echo "Error: QMK CLI is required. Install qmk==1.2.0 in a virtual environment." >&2
  exit 1
fi

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Error: run this script from inside a full QMK firmware checkout." >&2
  exit 1
fi

QMK_ROOT="$(git rev-parse --show-toplevel)"
QMK_COMMIT="$(git -C "$QMK_ROOT" rev-parse HEAD)"
if [[ -n "${QMK_FIRMWARE_REF:-}" && "$QMK_COMMIT" != "$QMK_FIRMWARE_REF" ]]; then
  echo "Error: QMK checkout is $QMK_COMMIT, expected $QMK_FIRMWARE_REF." >&2
  exit 1
fi

printf '%s\n' '=========================================================='
printf 'Keyboard: %s | Keymap: %s\n' "$KEYBOARD" "$KEYMAP"
printf 'QMK commit: %s\n' "$QMK_COMMIT"
printf 'QMK CLI: %s\n' "$(qmk --version)"
if command -v arm-none-eabi-gcc >/dev/null 2>&1; then
  printf 'ARM compiler: %s\n' "$(arm-none-eabi-gcc --version | head -n 1)"
fi
printf '%s\n' '=========================================================='

qmk compile -kb "$KEYBOARD" -km "$KEYMAP"
UF2=".build/${KEYBOARD}_${KEYMAP}.uf2"
if [[ ! -s "$UF2" ]]; then
  echo "Error: expected a non-empty UF2 at $QMK_ROOT/$UF2" >&2
  exit 1
fi
printf '\nBuild complete: %s\n' "$QMK_ROOT/$UF2"
sha256sum "$UF2"
