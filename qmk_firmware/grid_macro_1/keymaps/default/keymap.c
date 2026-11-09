/* keymap.c - Production Ready QMK Keymap for Grid Macro 1 (RP2040-Zero) */
#include QMK_KEYBOARD_H

/* Layers */
enum layers {
    _BASE = 0,
    _MEDIA,
    _NUMPAD,
    _FN
};

/* Keymap Matrix Definitions (Encoder SW + 9 Matrix Keys) */
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    /* Layer 0: Default Production Keymap (QWERTY / Shortcuts)
     * ---------------------------------------------------------
     * [Encoder Press: Play/Pause]
     * | Q (r1c1)  | W (r1c2)  | E (r1c3)  |  [Encoder Turn: Vol +/-]
     * | A (r2c1)  | S (r2c2)  | D (r2c3)  |
     * | Z (r3c1)  | X (r3c2)  | MO(_FN)   |
     */
    [_BASE] = LAYOUT_grid_macro_1(
        KC_MPLY,
        KC_Q,       KC_W,       KC_E,
        KC_A,       KC_S,       KC_D,
        KC_Z,       KC_X,       MO(_FN)
    ),

    /* Layer 1: Media & Navigation
     * ---------------------------------------------------------
     * [Encoder Press: Mute]
     * | PREV_TRACK | PLAY/PAUSE | NEXT_TRACK |  [Encoder Turn: Scrub Track]
     * | LEFT       | UP         | RIGHT      |
     * | HOME       | DOWN       | END        |
     */
    [_MEDIA] = LAYOUT_grid_macro_1(
        KC_MUTE,
        KC_MPRV,    KC_MPLY,    KC_MNXT,
        KC_LEFT,    KC_UP,      KC_RGHT,
        KC_HOME,    KC_DOWN,    KC_END
    ),

    /* Layer 2: Numpad / Calculator Mode
     * ---------------------------------------------------------
     * [Encoder Press: Equal (=)]
     * | 7         | 8          | 9          |  [Encoder Turn: Undo / Redo]
     * | 4         | 5          | 6          |
     * | 1         | 2          | 3          |
     */
    [_NUMPAD] = LAYOUT_grid_macro_1(
        KC_EQL,
        KC_P7,      KC_P8,      KC_P9,
        KC_P4,      KC_P5,      KC_P6,
        KC_P1,      KC_P2,      KC_P3
    ),

    /* Layer 3: Function / RGB / Device Controls
     * ---------------------------------------------------------
     * [Encoder Press: Toggle RGB]
     * | RGB_TOG   | RGB_MOD    | RGB_HUI    |  [Encoder Turn: Brightness +/-]
     * | TO(_BASE) | TO(_MEDIA) | TO(_NUMPAD)|
     * | QK_BOOT   | EE_CLR     | _______    |
     */
    [_FN] = LAYOUT_grid_macro_1(
        RGB_TOG,
        RGB_MOD,    RGB_HUI,    RGB_SAI,
        TO(_BASE),  TO(_MEDIA), TO(_NUMPAD),
        QK_BOOT,    EE_CLR,     _______
    )
};

/* Rotary Encoder Hardware Callback (Native C) */
#if defined(ENCODER_ENABLE) && defined(ENCODER_MAP_ENABLE)
const uint16_t PROGMEM encoder_map[][NUM_ENCODERS][NUM_DIRECTIONS] = {
    [_BASE]   = { ENCODER_CCW_CW(KC_VOLD, KC_VOLU) },
    [_MEDIA]  = { ENCODER_CCW_CW(KC_MPRV, KC_MNXT) },
    [_NUMPAD] = { ENCODER_CCW_CW(C(KC_Z), C(KC_Y)) },
    [_FN]     = { ENCODER_CCW_CW(RGB_VAD, RGB_VAI) },
};
#else
bool encoder_update_user(uint8_t index, bool clockwise) {
    if (index == 0) {
        uint8_t layer = get_highest_layer(layer_state);
        switch (layer) {
            case _BASE:
                if (clockwise) {
                    tap_code16(KC_VOLU);
                } else {
                    tap_code16(KC_VOLD);
                }
                break;
            case _MEDIA:
                if (clockwise) {
                    tap_code16(KC_MNXT);
                } else {
                    tap_code16(KC_MPRV);
                }
                break;
            case _NUMPAD:
                if (clockwise) {
                    tap_code16(C(KC_Y)); // Redo
                } else {
                    tap_code16(C(KC_Z)); // Undo
                }
                break;
            case _FN:
                if (clockwise) {
                    rgblight_increase_val();
                } else {
                    rgblight_decrease_val();
                }
                break;
            default:
                if (clockwise) {
                    tap_code16(KC_VOLU);
                } else {
                    tap_code16(KC_VOLD);
                }
                break;
        }
        return false;
    }
    return true;
}
#endif

/* RGB Status LED Indicator per layer */
layer_state_t layer_state_set_user(layer_state_t state) {
    switch (get_highest_layer(state)) {
        case _BASE:
            rgblight_setrgb_at(0, 81, 255, 0);   // NØDE Electric Blue
            break;
        case _MEDIA:
            rgblight_setrgb_at(16, 185, 129, 0); // Emerald Green
            break;
        case _NUMPAD:
            rgblight_setrgb_at(245, 158, 11, 0); // Amber Yellow
            break;
        case _FN:
            rgblight_setrgb_at(225, 29, 72, 0);  // Crimson Red
            break;
        default:
            rgblight_setrgb_at(0, 81, 255, 0);
            break;
    }
    return state;
}

/* Keyboard Init */
void keyboard_post_init_user(void) {
    rgblight_enable_noeeprom();
    rgblight_setrgb_at(0, 81, 255, 0); // Boot in Electric Blue
}
