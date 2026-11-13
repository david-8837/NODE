/* Experimental VIA custom-channel protocol, not connected to production HID. */
#pragma once
#include "lighting_controller.h"

#define NODE_LIGHT_CHANNEL 0x5f
#define NODE_LIGHT_PROTOCOL_VERSION 1
#define NODE_LIGHT_GET 0x08
#define NODE_LIGHT_SET 0x07
#define NODE_LIGHT_INFO 1
#define NODE_LIGHT_LAYER 2
#define NODE_LIGHT_PROVISION 3

/* Mutates a 32-byte VIA report. Returns false for an unsupported message. */
bool node_light_protocol_handle(node_light_controller *controller, uint8_t *report, unsigned length);
