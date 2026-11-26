#ifndef QMK_STUBS_H
#define QMK_STUBS_H
#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#include <stdlib.h>

/* Minimal QMK surface: enough to type-check and host-exercise the keymap logic.
 * This is a verification harness, NOT part of the firmware build. */
#define MATRIX_ROWS 4
#define MATRIX_COLS 3
#define NUM_ENCODERS 1
#define NUM_DIRECTIONS 2
#define PROGMEM
#define VIA_ENABLE 1
#define RAW_ENABLE 1
#define ENCODER_MAP_ENABLE 1

typedef uint32_t layer_state_t;
typedef struct {
    struct { uint8_t row, col; bool pressed; uint16_t time; } event;
} keyrecord_t;

#define KC_MPLY 1
#define KC_MUTE 2
#define KC_MPRV 3
#define KC_MNXT 4
#define KC_VOLU 5
#define KC_VOLD 6
#define KC_Q 7
#define KC_W 8
#define KC_E 9
#define KC_A 10
#define KC_S 11
#define KC_D 12
#define KC_Z 13
#define KC_X 14
#define KC_LEFT 15
#define KC_UP 16
#define KC_RGHT 17
#define KC_HOME 18
#define KC_DOWN 19
#define KC_EQL 20
#define KC_P7 21
#define KC_P8 22
#define KC_P9 23
#define KC_P4 24
#define KC_P5 25
#define KC_P6 26
#define KC_P1 27
#define KC_P2 28
#define KC_Y 30
#define QK_BOOT 0x7C00
#define EE_CLR 0x7C01
#define _______ 0x0001
#define TO(l) (0x5200 | (l))
#define MO(l) (0x5220 | (l))
#define C(k) (0x0100 | (k))
#define ENCODER_CCW_CW(a, b) {(a), (b)}
#define LAYOUT_grid_macro_1(k0, k1, k2, k3, k4, k5, k6, k7, k8, k9) \
    { {k0, k1, k2}, {k3, k4, k5}, {k6, k7, k8}, {k9, 0, 0} }

extern layer_state_t layer_state;
uint8_t get_highest_layer(layer_state_t s);
void layer_move(uint8_t layer);
uint32_t timer_read32(void);
uint32_t timer_elapsed32(uint32_t t);
void rgblight_setrgb_at(uint8_t r, uint8_t g, uint8_t b, uint8_t i);
void rgblight_enable_noeeprom(void);
void raw_hid_send(uint8_t *d, uint8_t len);
uint16_t dynamic_keymap_get_keycode(uint8_t l, uint8_t r, uint8_t c);
void dynamic_keymap_set_keycode(uint8_t l, uint8_t r, uint8_t c, uint16_t k);
uint16_t dynamic_keymap_get_encoder(uint8_t l, uint8_t e, bool cw);
void dynamic_keymap_set_encoder(uint8_t l, uint8_t e, bool cw, uint16_t k);
uint8_t eeprom_read_byte(const uint8_t *a);
uint16_t eeprom_read_word(const uint16_t *a);
void eeprom_update_byte(uint8_t *a, uint8_t v);
void eeprom_update_word(uint16_t *a, uint16_t v);
static inline void reset_keyboard(void) {}
static inline void tap_code16(uint16_t kc) { (void)kc; }
#endif
