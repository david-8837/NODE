#include "lighting_rp2040_flash.h"
#include <string.h>

_Static_assert(NODE_LIGHT_FLASH_START + 2 * NODE_LIGHT_SECTOR_SIZE == NODE_LIGHT_QMK_EEPROM_START, "Lighting sectors must end before QMK EEPROM");
_Static_assert(NODE_LIGHT_QMK_EEPROM_START + 2 * NODE_LIGHT_SECTOR_SIZE == NODE_LIGHT_FLASH_SIZE, "Unexpected EEPROM backing range");

/* All bytes not belonging to the record must be erased. This prevents erasing
 * an apparently valid journal record surrounded by another firmware's data. */
static bool read_slot(void *context, unsigned slot, uint8_t out[NODE_LIGHT_RECORD_SIZE]) {
    (void)context;
    if (slot >= 2) return false;
    const uint8_t *sector = node_light_flash_pointer(NODE_LIGHT_FLASH_START + slot * NODE_LIGHT_SECTOR_SIZE);
    if (!sector) return false;
    for (unsigned i = 31; i < NODE_LIGHT_SECTOR_SIZE; i++)
        if (i != NODE_LIGHT_PAGE_SIZE && sector[i] != 0xff) return false;
    memcpy(out, sector, 31);
    out[31] = sector[NODE_LIGHT_PAGE_SIZE];
    return true;
}
static bool erase_slot(void *context, unsigned slot) {
    (void)context;
    if (slot >= 2) return false;
    uint8_t record[NODE_LIGHT_RECORD_SIZE];
    if (!read_slot(NULL, slot, record)) return false;
    return node_light_flash_erase(NODE_LIGHT_FLASH_START + slot * NODE_LIGHT_SECTOR_SIZE);
}
static bool write_slot(void *context, unsigned slot, unsigned offset, const uint8_t *data, unsigned length) {
    (void)context;
    if (slot >= 2 || !data || !((offset == 0 && length == 31) || (offset == 31 && length == 1))) return false;
    uint8_t record[NODE_LIGHT_RECORD_SIZE], page[NODE_LIGHT_PAGE_SIZE];
    if (!read_slot(NULL, slot, record)) return false;
    /* Never reprogram a page; staging and commit each get their own page. */
    if (offset == 0) { for (unsigned i = 0; i < 31; i++) if (record[i] != 0xff) return false; }
    else if (record[31] != 0xff) return false;
    memset(page, 0xff, sizeof(page)); memcpy(page, data, length);
    return node_light_flash_program(NODE_LIGHT_FLASH_START + slot * NODE_LIGHT_SECTOR_SIZE + (offset ? NODE_LIGHT_PAGE_SIZE : 0), page);
}
node_light_storage node_light_rp2040_storage(void) {
    node_light_storage storage = { NULL, read_slot, erase_slot, write_slot };
    return storage;
}
