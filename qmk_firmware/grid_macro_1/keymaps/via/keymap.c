/* keymap.c - Production VIA & Dynamic Keymap for Grid Macro 1 (RP2040-Zero) */
#include QMK_KEYBOARD_H
#include "raw_hid.h"

#define NODE_HARDWARE_EVENT_MAGIC 0xEE
#define NODE_HARDWARE_PROTOCOL_VERSION 0x01

static uint8_t s_event_sequence = 0;
static uint16_t s_matrix_state_mask = 0;

static void send_hardware_event(uint8_t event_type, uint8_t slot_index) {
    uint8_t report[32] = {0};
    report[0] = NODE_HARDWARE_EVENT_MAGIC;
    report[1] = NODE_HARDWARE_PROTOCOL_VERSION;
    report[2] = event_type;
    report[3] = slot_index;
    report[4] = ++s_event_sequence;
    report[5] = get_highest_layer(layer_state);
    report[6] = (uint8_t)(s_matrix_state_mask & 0xFF);
    report[7] = (uint8_t)((s_matrix_state_mask >> 8) & 0x03);

    uint8_t checksum = 0;
    for (uint8_t i = 0; i < 31; i++) {
        checksum ^= report[i];
    }
    report[31] = checksum;

    raw_hid_send(report, 32);
}

/* Dynamic EEPROM Layers (Configurable live via VIA / Web App) */
const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
    [0] = LAYOUT_grid_macro_1(
        KC_NO,
        KC_NO,      KC_NO,      KC_NO,
        KC_NO,      KC_NO,      KC_NO,
        KC_NO,      KC_NO,      KC_NO
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
        UG_TOGG,
        UG_NEXT,    UG_HUEU,    UG_SATU,
        TO(0),      TO(1),      TO(2),
        QK_BOOT,    EE_CLR,     _______
    )
};

#if defined(ENCODER_MAP_ENABLE)
const uint16_t PROGMEM encoder_map[][NUM_ENCODERS][NUM_DIRECTIONS] = {
    [0] = { ENCODER_CCW_CW(KC_VOLD, KC_VOLU) },
    [1] = { ENCODER_CCW_CW(KC_MPRV, KC_MNXT) },
    [2] = { ENCODER_CCW_CW(C(KC_Z), C(KC_Y)) },
    [3] = { ENCODER_CCW_CW(UG_VALD, UG_VALU) },
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

bool process_record_user(uint16_t keycode, keyrecord_t *record) {
    uint8_t row = record->event.key.row;
    uint8_t col = record->event.key.col;
    uint8_t slot_index = 255;

    if (row < 3 && col < 3) {
        slot_index = row * 3 + col; // 0..8 for 3x3 keys
    } else if (row == 3 && col == 0) {
        slot_index = 9; // 9 for dial push switch
    }

    if (slot_index < 10) {
        if (record->event.pressed) {
            s_matrix_state_mask |= (1 << slot_index);
            send_hardware_event(slot_index == 9 ? 0x05 : 0x01, slot_index);
        } else {
            s_matrix_state_mask &= ~(1 << slot_index);
            send_hardware_event(slot_index == 9 ? 0x06 : 0x02, slot_index);
        }
    }

    // If keycode is KC_NO (0x0000) or in dedicated Smart Action range (0x7E00..0x7E09), suppress normal USB typing
    if (keycode == KC_NO || (keycode >= 0x7E00 && keycode <= 0x7E09)) {
        return false;
    }

    return true;
}

bool encoder_update_user(uint8_t index, bool clockwise) {
    if (index == 0) {
        send_hardware_event(clockwise ? 0x03 : 0x04, 0xFF);
    }
    return true;
}

