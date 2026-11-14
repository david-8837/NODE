/* Grid Macro 1 QMK configuration (RP2040-Zero). */
#pragma once

/* Matrix dimensions: 3 rows for keys + 1 row for encoder press switch. */
#define MATRIX_ROWS 4
#define MATRIX_COLS 3

#define USB_POLLING_INTERVAL_MS 1
#define DEBOUNCE 10

/* Expose the RP2040 hardware ID as the USB serial number for per-unit sync identity. */
#define SERIAL_NUMBER_USE_HARDWARE_ID TRUE

/* EC11 encoder direction is reversed by the board's wiring. */
#define ENCODER_DIRECTION_FLIP

/* VIA dynamic keymap is stored in RP2040 flash emulated EEPROM. */
#define DYNAMIC_KEYMAP_EEPROM_MAX_ADDR 4095
#define DYNAMIC_KEYMAP_LAYER_COUNT 4

#define TAPPING_TERM 180

/* One onboard WS2812 indicator on GP16. */
#define WS2812_DI_PIN GP16
#define RGBLIGHT_LIMIT_VAL 220
#define RGBLIGHT_VAL_STEP 10
#define RGBLIGHT_EFFECT_BREATHING
#define RGBLIGHT_EFFECT_RAINBOW_MOOD
#define RGBLIGHT_EFFECT_STATIC_GRADIENT
