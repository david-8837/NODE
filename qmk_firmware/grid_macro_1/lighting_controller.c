/* This module has no flash address or QMK hooks. A hardware backend must be
 * independently validated before it can be used on a device. */
#include "lighting_controller.h"
#include <string.h>

static void apply_active(node_light_controller *controller) {
    if (controller->ready && controller->apply && controller->active_layer < NODE_LIGHT_LAYERS)
        controller->apply(controller->apply_context, &controller->settings.layers[controller->active_layer]);
}
node_light_result node_light_controller_open(node_light_controller *controller, node_light_storage storage, node_light_apply_fn apply, void *context, unsigned current_layer) {
    if (!controller || current_layer >= NODE_LIGHT_LAYERS) return NODE_LIGHT_INVALID;
    memset(controller, 0, sizeof(*controller));
    controller->storage = storage; controller->apply = apply; controller->apply_context = context; controller->active_layer = current_layer;
    node_light_result result = node_light_load(&controller->storage, &controller->settings);
    if (result == NODE_LIGHT_OK) { controller->ready = true; apply_active(controller); }
    return result;
}
node_light_result node_light_controller_provision(node_light_controller *controller, const node_light_settings *settings) {
    if (!controller || !settings || controller->ready) return NODE_LIGHT_INVALID;
    node_light_settings existing;
    node_light_result state = node_light_load(&controller->storage, &existing);
    if (state != NODE_LIGHT_EMPTY) return state == NODE_LIGHT_OK ? NODE_LIGHT_INVALID : state;
    node_light_result result = node_light_save(&controller->storage, settings);
    if (result == NODE_LIGHT_OK) { controller->settings = *settings; controller->ready = true; apply_active(controller); }
    return result;
}
node_light_result node_light_controller_set(node_light_controller *controller, unsigned layer, const node_light_layer *setting) {
    if (!controller || !controller->ready || !setting || layer >= NODE_LIGHT_LAYERS) return NODE_LIGHT_INVALID;
    node_light_settings current;
    node_light_result result = node_light_load(&controller->storage, &current);
    if (result != NODE_LIGHT_OK) return result;
    if (memcmp(&current, &controller->settings, sizeof(current)) != 0) return NODE_LIGHT_UNKNOWN;
    current.layers[layer] = *setting;
    if (memcmp(&current, &controller->settings, sizeof(current)) == 0) return NODE_LIGHT_OK;
    result = node_light_save(&controller->storage, &current);
    if (result == NODE_LIGHT_OK) { controller->settings = current; if (layer == controller->active_layer) apply_active(controller); }
    return result;
}
void node_light_controller_select(node_light_controller *controller, unsigned layer) {
    if (!controller || layer >= NODE_LIGHT_LAYERS || controller->active_layer == layer) return;
    controller->active_layer = layer; apply_active(controller);
}
