#!/usr/bin/env bash
# build_uf2.sh - Automated QMK Native C Compilation Script for Grid Macro 1
set -e

KEYBOARD="grid_macro_1"
KEYMAP="${1:-via}"

echo "=========================================================="
echo "Compiling Grid Macro 1 QMK Native C Firmware (.uf2)"
echo "Target MCU: RP2040-Zero | Keymap: ${KEYMAP}"
echo "=========================================================="

if command -v qmk &> /dev/null; then
    echo "-> Using local QMK CLI..."
    qmk compile -kb "$KEYBOARD" -km "$KEYMAP"
elif command -v docker &> /dev/null; then
    echo "-> Using QMK Docker container..."
    docker run --rm -v "$(pwd):/qmk_firmware" -w /qmk_firmware qmkfm/qmk_cli qmk compile -kb "$KEYBOARD" -km "$KEYMAP"
else
    echo "Error: Neither 'qmk' nor 'docker' was found."
    echo "Please install QMK CLI: python3 -m pip install qmk && qmk setup"
    exit 1
fi

echo "✓ Build complete! Drag the .uf2 file onto your RPI-RP2 drive."
