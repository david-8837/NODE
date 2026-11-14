/* Experimental storage-independent journal. No flash location is reserved here. */
#include "lighting_store.h"
#include <string.h>

_Static_assert(sizeof(node_light_settings) == 16, "Lighting journal requires exactly 16 data bytes");

#define COMMIT_OFFSET 31
#define COMMIT_VALUE 0xA5

static uint16_t crc16(const uint8_t *bytes, unsigned length) {
    uint16_t crc = 0xffff;
    while (length--) {
        crc ^= (uint16_t)*bytes++ << 8;
        for (unsigned bit = 0; bit < 8; ++bit) crc = (uint16_t)((crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1);
    }
    return crc;
}
static bool valid_settings(const node_light_settings *settings) {
    for (unsigned i = 0; i < NODE_LIGHT_LAYERS; ++i) {
        uint8_t effect = settings->layers[i].effect;
        if (effect != 0 && effect != 1 && effect != 2 && effect != 6) return false;
    }
    return true;
}
static bool blank(const uint8_t *record) {
    for (unsigned i = 0; i < NODE_LIGHT_RECORD_SIZE; ++i) if (record[i] != 0xff) return false;
    return true;
}
static bool valid(const uint8_t *record) {
    if (record[0] != 'N' || record[1] != 'L' || record[2] != 1 || record[COMMIT_OFFSET] != COMMIT_VALUE) return false;
    uint16_t crc = crc16(record, 29);
    if (record[29] != (uint8_t)(crc >> 8) || record[30] != (uint8_t)crc) return false;
    node_light_settings data;
    memcpy(&data, record + 7, sizeof(data));
    return valid_settings(&data);
}
static uint32_t sequence(const uint8_t *r) {
    return ((uint32_t)r[3] << 24) | ((uint32_t)r[4] << 16) | ((uint32_t)r[5] << 8) | r[6];
}
static int newest(const uint8_t records[2][NODE_LIGHT_RECORD_SIZE]) {
    bool a = valid(records[0]), b = valid(records[1]);
    if (!a) return b ? 1 : -1;
    if (!b) return 0;
    return (int32_t)(sequence(records[1]) - sequence(records[0])) > 0 ? 1 : 0;
}
static bool read_both(const node_light_storage *storage, uint8_t r[2][NODE_LIGHT_RECORD_SIZE]) {
    return storage && storage->read && storage->erase && storage->write && storage->read(storage->context, 0, r[0]) && storage->read(storage->context, 1, r[1]);
}
node_light_result node_light_load(const node_light_storage *storage, node_light_settings *settings) {
    uint8_t r[2][NODE_LIGHT_RECORD_SIZE];
    if (!settings || !read_both(storage, r)) return NODE_LIGHT_IO_ERROR;
    int slot = newest(r);
    if (slot < 0) return blank(r[0]) && blank(r[1]) ? NODE_LIGHT_EMPTY : NODE_LIGHT_UNKNOWN;
    memcpy(settings, r[slot] + 7, sizeof(*settings));
    return NODE_LIGHT_OK;
}
node_light_result node_light_save(const node_light_storage *storage, const node_light_settings *settings) {
    uint8_t r[2][NODE_LIGHT_RECORD_SIZE], candidate[NODE_LIGHT_RECORD_SIZE], verify[NODE_LIGHT_RECORD_SIZE];
    if (!settings || !valid_settings(settings)) return NODE_LIGHT_INVALID;
    if (!read_both(storage, r)) return NODE_LIGHT_IO_ERROR;
    int active = newest(r);
    if (active < 0 && !(blank(r[0]) && blank(r[1]))) return NODE_LIGHT_UNKNOWN;
    unsigned target = active < 0 ? 0 : (unsigned)(1 - active);
    /* A nonblank invalid inactive slot might belong to another firmware. Never erase it. */
    if (!blank(r[target]) && !valid(r[target])) return NODE_LIGHT_UNKNOWN;
    uint32_t next = active < 0 ? 1 : sequence(r[active]) + 1;
    memset(candidate, 0xff, sizeof(candidate));
    candidate[0] = 'N'; candidate[1] = 'L'; candidate[2] = 1;
    candidate[3] = (uint8_t)(next >> 24); candidate[4] = (uint8_t)(next >> 16); candidate[5] = (uint8_t)(next >> 8); candidate[6] = (uint8_t)next;
    memcpy(candidate + 7, settings, sizeof(*settings));
    uint16_t crc = crc16(candidate, 29); candidate[29] = (uint8_t)(crc >> 8); candidate[30] = (uint8_t)crc;
    if ((!blank(r[target]) && !storage->erase(storage->context, target)) || !storage->write(storage->context, target, 0, candidate, COMMIT_OFFSET) ||
        !storage->read(storage->context, target, verify) || memcmp(candidate, verify, COMMIT_OFFSET) != 0 || verify[COMMIT_OFFSET] != 0xff) return NODE_LIGHT_IO_ERROR;
    uint8_t commit = COMMIT_VALUE;
    if (!storage->write(storage->context, target, COMMIT_OFFSET, &commit, 1) || !storage->read(storage->context, target, verify) || !valid(verify) || memcmp(verify, candidate, COMMIT_OFFSET) != 0) return NODE_LIGHT_IO_ERROR;
    return NODE_LIGHT_OK;
}
