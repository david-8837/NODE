/* keymap.c - Production VIA & Dynamic Keymap for Grid Macro 1 (RP2040-Zero) */
#include QMK_KEYBOARD_H

/* Dynamic EEPROM Layers (Configurable live via VIA / Web App) */
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT_grid_macro_1(
        KC_MPLY,
        KC_Q,       KC_W,       KC_E,
        KC_A,       KC_S,       KC_D,
        KC_Z,       KC_X,       MO(1)
    ),
    [1] = LAYOUT_grid_macro_1(
        KC_MUTE,
        KC_MPRV,    KC_MPLY,    KC_MNXT,
        KC_LEFT,    KC_UP,      KC_RGHT,
        KC_HOME,    KC_DOWN,    KC_END
    ),
    [2] = LAYOUT_grid_macro_1(
        KC_EQL,
        KC_P7,      KC_P8,      KC_P9,
        KC_P4,      KC_P5,      KC_P6,
        KC_P1,      KC_P2,      KC_P3
    ),
    [3] = LAYOUT_grid_macro_1(
        RGB_TOG,
        RGB_MOD,    RGB_HUI,    RGB_SAI,
        TO(0),      TO(1),      TO(2),
        QK_BOOT,    EE_CLR,     _______
    )
};

#if defined(ENCODER_MAP_ENABLE)
const uint16_t PROGMEM encoder_map[][NUM_ENCODERS][NUM_DIRECTIONS] = {
    [0] = { ENCODER_CCW_CW(KC_VOLD, KC_VOLU) },
    [1] = { ENCODER_CCW_CW(KC_MPRV, KC_MNXT) },
    [2] = { ENCODER_CCW_CW(C(KC_Z), C(KC_Y)) },
    [3] = { ENCODER_CCW_CW(RGB_VAD, RGB_VAI) },
};
#endif

layer_state_t layer_state_set_user(layer_state_t state) {
    switch (get_highest_layer(state)) {
        case 0: rgblight_setrgb_at(0, 81, 255, 0); break;   // Electric Blue
        case 1: rgblight_setrgb_at(16, 185, 129, 0); break; // Green
        case 2: rgblight_setrgb_at(245, 158, 11, 0); break; // Amber
        case 3: rgblight_setrgb_at(225, 29, 72, 0); break;  // Red
        default: rgblight_setrgb_at(0, 81, 255, 0); break;
    }
    return state;
}

void keyboard_post_init_user(void) {
    rgblight_enable_noeeprom();
    rgblight_setrgb_at(0, 81, 255, 0);
}
