/* Experimental only: built when NODE_EXPERIMENTAL_LAYER_LIGHTING=yes. */
#include "lighting_rp2040_flash.h"
#include "hardware/flash.h"
#include "hardware/sync.h"
#include "hardware/regs/addressmap.h"
#include "wear_leveling_rp2040_flash_config.h"
#include <stdint.h>

#if PICO_FLASH_SIZE_BYTES != 0x200000
#    error "Experimental lighting storage is only defined for 2 MiB RP2040 flash"
#endif
_Static_assert(WEAR_LEVELING_RP2040_FLASH_BASE == NODE_LIGHT_QMK_EEPROM_START, "Unexpected QMK EEPROM location");
_Static_assert(WEAR_LEVELING_BACKING_SIZE == 8192, "Unexpected QMK EEPROM backing size");
extern const uint8_t __flash_binary_end[];

static bool region_safe(uint32_t address, uint32_t size) {
    return (uintptr_t)__flash_binary_end <= XIP_BASE + NODE_LIGHT_FLASH_START &&
        address >= NODE_LIGHT_FLASH_START && address <= NODE_LIGHT_QMK_EEPROM_START &&
        size <= NODE_LIGHT_QMK_EEPROM_START - address;
}
const uint8_t *node_light_flash_pointer(uint32_t address) {
    return region_safe(address, NODE_LIGHT_SECTOR_SIZE) ? (const uint8_t *)(XIP_BASE + address) : NULL;
}
bool node_light_flash_program(uint32_t address, const uint8_t page[NODE_LIGHT_PAGE_SIZE]) {
    if (!page || address % NODE_LIGHT_PAGE_SIZE || !region_safe(address, NODE_LIGHT_PAGE_SIZE)) return false;
    uint32_t state = save_and_disable_interrupts();
    flash_range_program(address, page, NODE_LIGHT_PAGE_SIZE);
    restore_interrupts(state);
    return true; /* The journal independently reads back every write. */
}
bool node_light_flash_erase(uint32_t address) {
    if (address % NODE_LIGHT_SECTOR_SIZE || !region_safe(address, NODE_LIGHT_SECTOR_SIZE)) return false;
    uint32_t state = save_and_disable_interrupts();
    flash_range_erase(address, NODE_LIGHT_SECTOR_SIZE);
    restore_interrupts(state);
    return true;
}
