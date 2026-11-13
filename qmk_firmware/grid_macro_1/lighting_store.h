/* Experimental portable journal; NOT wired to a flash address or QMK yet.
 * Backends must reserve two independent erase units and implement durable,
 * ordered writes. No existing VIA EEPROM space may be used for these slots. */
#pragma once
#include <stdbool.h>
#include <stdint.h>

#define NODE_LIGHT_LAYERS 4
#define NODE_LIGHT_RECORD_SIZE 32

typedef struct { uint8_t effect, hue, saturation, brightness; } node_light_layer;
typedef struct { node_light_layer layers[NODE_LIGHT_LAYERS]; } node_light_settings;
typedef struct {
    void *context;
    bool (*read)(void *context, unsigned slot, uint8_t out[NODE_LIGHT_RECORD_SIZE]);
    bool (*erase)(void *context, unsigned slot);
    bool (*write)(void *context, unsigned slot, unsigned offset, const uint8_t *data, unsigned length);
} node_light_storage;
typedef enum { NODE_LIGHT_OK, NODE_LIGHT_EMPTY, NODE_LIGHT_UNKNOWN, NODE_LIGHT_IO_ERROR, NODE_LIGHT_INVALID } node_light_result;

node_light_result node_light_load(const node_light_storage *storage, node_light_settings *settings);
node_light_result node_light_save(const node_light_storage *storage, const node_light_settings *settings);
