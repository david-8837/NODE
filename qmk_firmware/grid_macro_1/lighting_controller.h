/* Experimental storage-independent layer controller; not connected to QMK. */
#pragma once
#include "lighting_store.h"

typedef void (*node_light_apply_fn)(void *context, const node_light_layer *layer);
typedef struct {
    node_light_storage storage;
    node_light_settings settings;
    node_light_apply_fn apply;
    void *apply_context;
    unsigned active_layer;
    bool ready;
} node_light_controller;

/* Empty or unrecognized storage is never initialized automatically. */
node_light_result node_light_controller_open(node_light_controller *controller, node_light_storage storage, node_light_apply_fn apply, void *context, unsigned current_layer);
/* Explicitly supply all four layers on first-time provisioning. */
node_light_result node_light_controller_provision(node_light_controller *controller, const node_light_settings *settings);
node_light_result node_light_controller_set(node_light_controller *controller, unsigned layer, const node_light_layer *setting);
void node_light_controller_select(node_light_controller *controller, unsigned layer);
