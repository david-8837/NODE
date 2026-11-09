/* config.h - Grid Macro 1 QMK Hardware Definitions (RP2040-Zero) */
#pragma once

#include "config_common.h"

/* USB Device descriptor */
#define VENDOR_ID       0xFEED
#define PRODUCT_ID      0x6001
#define DEVICE_VER      0x0001
#define MANUFACTURER    NØDE
#define PRODUCT         Grid Macro 1

/* Matrix dimensions: 3 rows for keys + 1 row for Encoder Press Switch */
#define MATRIX_ROWS 4
#define MATRIX_COLS 3

/* Direct GPIO Pin Connections (RP2040-Zero) */
#define DIRECT_PINS { \
    { GP0,  GP1,  GP2  }, \
    { GP3,  GP4,  GP5  }, \
    { GP6,  GP7,  GP8  }, \
    { GP11, NO_PIN, NO_PIN } \
}

/* 1000Hz High-Speed USB Polling & 0ms Eager Debounce Filtering */
#define USB_POLLING_INTERVAL_MS 1
#define QMK_KEYS_PER_SCAN 12
#define DEBOUNCE 3

/* EC11 Rotary Encoder Configuration */
#define ENCODERS_PAD_A { GP9 }
#define ENCODERS_PAD_B { GP10 }
#define ENCODER_RESOLUTION 4
#define ENCODER_DIRECTION_FLIP

/* Onboard WS2812 NeoPixel on GP16 */
#define WS2812_DI_PIN GP16
#define RGBLIGHT_LED_COUNT 1
#define RGBLIGHT_LIMIT_VAL 220
#define RGBLIGHT_VAL_STEP 10
#define RGBLIGHT_EFFECT_BREATHING
#define RGBLIGHT_EFFECT_RAINBOW_MOOD
#define RGBLIGHT_EFFECT_STATIC_GRADIENT

/* Dynamic Keymap / VIA EEPROM emulation on RP2040 Flash */
#define DYNAMIC_KEYMAP_EEPROM_MAX_ADDR 4095
#define DYNAMIC_KEYMAP_LAYER_COUNT 4

/* Tap-Dance & Combo configuration */
#define TAPPING_TERM 200
#define FORCE_NKRO
