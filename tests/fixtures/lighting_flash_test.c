#include "lighting_rp2040_flash.h"
#include <assert.h>
#include <string.h>

static uint8_t flash[NODE_LIGHT_FLASH_SIZE];
static int programs, erases;
const uint8_t *node_light_flash_pointer(uint32_t address) {
    if (address < NODE_LIGHT_FLASH_START || address + NODE_LIGHT_SECTOR_SIZE > NODE_LIGHT_QMK_EEPROM_START) return NULL;
    return flash + address;
}
bool node_light_flash_program(uint32_t address, const uint8_t page[NODE_LIGHT_PAGE_SIZE]) {
    if (address < NODE_LIGHT_FLASH_START || address + NODE_LIGHT_PAGE_SIZE > NODE_LIGHT_QMK_EEPROM_START || address % NODE_LIGHT_PAGE_SIZE) return false;
    ++programs;
    for (unsigned i = 0; i < NODE_LIGHT_PAGE_SIZE; ++i) flash[address + i] &= page[i];
    return true;
}
bool node_light_flash_erase(uint32_t address) {
    if (address < NODE_LIGHT_FLASH_START || address + NODE_LIGHT_SECTOR_SIZE > NODE_LIGHT_QMK_EEPROM_START || address % NODE_LIGHT_SECTOR_SIZE) return false;
    ++erases; memset(flash + address, 0xff, NODE_LIGHT_SECTOR_SIZE); return true;
}
int main(void) {
    memset(flash, 0xff, sizeof(flash));
    memset(flash + NODE_LIGHT_QMK_EEPROM_START, 0x42, NODE_LIGHT_FLASH_SIZE - NODE_LIGHT_QMK_EEPROM_START);
    flash[NODE_LIGHT_FLASH_START - 1] = 0x18;
    node_light_storage storage = node_light_rp2040_storage();
    node_light_settings data = {{{1,1,255,100},{1,2,255,100},{1,3,255,100},{1,4,255,100}}}, result;
    assert(node_light_load(&storage, &result) == NODE_LIGHT_EMPTY);
    assert(node_light_save(&storage, &data) == NODE_LIGHT_OK && programs == 2 && erases == 0);
    data.layers[1].hue = 55;
    assert(node_light_save(&storage, &data) == NODE_LIGHT_OK && programs == 4 && erases == 0);
    data.layers[1].hue = 66;
    assert(node_light_save(&storage, &data) == NODE_LIGHT_OK && programs == 6 && erases == 1);
    assert(node_light_load(&storage, &result) == NODE_LIGHT_OK && result.layers[1].hue == 66);
    assert(flash[NODE_LIGHT_FLASH_START - 1] == 0x18);
    for (unsigned i = NODE_LIGHT_QMK_EEPROM_START; i < NODE_LIGHT_FLASH_SIZE; ++i) assert(flash[i] == 0x42);
    /* Unexpected data anywhere in either sector blocks writes and erases. */
    flash[NODE_LIGHT_FLASH_START + NODE_LIGHT_SECTOR_SIZE + 600] = 0;
    int before_programs=programs, before_erases=erases;
    assert(node_light_save(&storage, &data) == NODE_LIGHT_IO_ERROR);
    assert(programs==before_programs && erases==before_erases);
    return 0;
}
