/* Unreleased RP2040 flash adapter. Two 4 KiB sectors immediately before QMK's
 * 8 KiB wear-leveling store; only for the 2 MiB flash layout. */
#pragma once
#include "lighting_store.h"
#define NODE_LIGHT_FLASH_SIZE 0x200000u
#define NODE_LIGHT_SECTOR_SIZE 4096u
#define NODE_LIGHT_PAGE_SIZE 256u
#define NODE_LIGHT_FLASH_START 0x1fc000u
#define NODE_LIGHT_QMK_EEPROM_START 0x1fe000u

/* Hardware functions must check range and serialize flash operations. */
const uint8_t *node_light_flash_pointer(uint32_t address);
bool node_light_flash_program(uint32_t address, const uint8_t page[NODE_LIGHT_PAGE_SIZE]);
bool node_light_flash_erase(uint32_t address);
node_light_storage node_light_rp2040_storage(void);
