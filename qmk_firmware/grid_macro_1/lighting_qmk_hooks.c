#include QMK_KEYBOARD_H

#ifdef NODE_EXPERIMENTAL_LAYER_LIGHTING
/* Lab-only hooks: not present in ordinary or published firmware builds. */
#    include "lighting_controller.h"
#    include "lighting_protocol.h"
#    include "lighting_rp2040_flash.h"
#    include "via.h"

static node_light_controller node_lighting;
static void node_apply_lighting(void *context, const node_light_layer *value) {
    (void)context;
    if (!value->effect) { rgblight_disable_noeeprom(); return; }
    rgblight_enable_noeeprom();
    rgblight_mode_noeeprom(value->effect);
    rgblight_sethsv_noeeprom(value->hue, value->saturation, value->brightness);
}
void keyboard_post_init_user(void) {
    (void)node_light_controller_open(&node_lighting, node_light_rp2040_storage(), node_apply_lighting, NULL, get_highest_layer(layer_state));
}
layer_state_t layer_state_set_user(layer_state_t state) {
    node_light_controller_select(&node_lighting, get_highest_layer(state));
    return state;
}
void via_custom_value_command_kb(uint8_t *data, uint8_t length) {
    if (!node_light_protocol_handle(&node_lighting, data, length)) data[0] = id_unhandled;
}
#endif
