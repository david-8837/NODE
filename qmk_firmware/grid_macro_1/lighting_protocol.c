#include "lighting_protocol.h"
#include <string.h>

/* Payloads are intentionally fixed-size and versioned. Provisioning is an
 * explicit write containing every layer; merely querying never writes. */
bool node_light_protocol_handle(node_light_controller *controller, uint8_t *report, unsigned length) {
    if (!controller || !report || length < 32 || report[1] != NODE_LIGHT_CHANNEL) return false;
    uint8_t command = report[0], field = report[2];
    if (command == NODE_LIGHT_GET && field == NODE_LIGHT_INFO) {
        report[3] = NODE_LIGHT_PROTOCOL_VERSION;
        report[4] = NODE_LIGHT_LAYERS;
        report[5] = controller->ready ? 1 : 0;
        report[6] = 'N'; report[7] = 'O'; report[8] = 'D'; report[9] = 'E';
        return true;
    }
    if (field == NODE_LIGHT_LAYER && (command == NODE_LIGHT_GET || command == NODE_LIGHT_SET)) {
        unsigned layer = report[3];
        if (layer >= NODE_LIGHT_LAYERS) { report[4] = NODE_LIGHT_INVALID; return true; }
        if (command == NODE_LIGHT_SET) {
            node_light_layer setting = { report[5], report[6], report[7], report[8] };
            /* Compare all four prior layers to avoid overwriting another editor. */
            if (!controller->ready || memcmp(report + 9, &controller->settings, sizeof(controller->settings)) != 0) {
                report[4] = NODE_LIGHT_UNKNOWN;
                return true;
            }
            report[4] = node_light_controller_set(controller, layer, &setting);
            return true;
        }
        node_light_settings settings;
        node_light_result result = node_light_load(&controller->storage, &settings);
        report[4] = result;
        if (result == NODE_LIGHT_OK) {
            const node_light_layer *setting = &settings.layers[layer];
            report[5] = setting->effect; report[6] = setting->hue; report[7] = setting->saturation; report[8] = setting->brightness;
        } else memset(report + 5, 0, 4);
        return true;
    }
    if (field == NODE_LIGHT_PROVISION && command == NODE_LIGHT_SET) {
        node_light_settings settings;
        for (unsigned i = 0; i < NODE_LIGHT_LAYERS; ++i) {
            settings.layers[i].effect = report[4 + 4*i];
            settings.layers[i].hue = report[5 + 4*i];
            settings.layers[i].saturation = report[6 + 4*i];
            settings.layers[i].brightness = report[7 + 4*i];
        }
        report[3] = node_light_controller_provision(controller, &settings);
        return true;
    }
    return false;
}
