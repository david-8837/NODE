#include "lighting_protocol.h"
#include <assert.h>
#include <string.h>
typedef struct { uint8_t slots[2][NODE_LIGHT_RECORD_SIZE]; int fail_at; int operations; int torn_after; } memory;
static bool fail(memory *m) { return m->fail_at && ++m->operations == m->fail_at; }
static bool read_slot(void *ctx, unsigned slot, uint8_t *out) { memory *m = ctx; if (fail(m)) return false; memcpy(out, m->slots[slot], NODE_LIGHT_RECORD_SIZE); return true; }
static bool erase_slot(void *ctx, unsigned slot) { memory *m = ctx; if (fail(m)) return false; memset(m->slots[slot], 0xff, NODE_LIGHT_RECORD_SIZE); return true; }
static bool write_slot(void *ctx, unsigned slot, unsigned offset, const uint8_t *data, unsigned length) { memory *m = ctx; if (fail(m)) return false; for (unsigned i=0;i<length;i++) { if (m->torn_after > 0 && (int)i == m->torn_after) return false; m->slots[slot][offset+i] &= data[i]; } return true; }
typedef struct { unsigned calls; node_light_layer value; } output;
static void apply(void *ctx, const node_light_layer *value) { output *out = ctx; out->calls++; out->value = *value; }
int main(void) {
    memory m; memset(&m, 0, sizeof(m)); memset(m.slots, 0xff, sizeof(m.slots));
    node_light_storage s = { &m, read_slot, erase_slot, write_slot };
    node_light_settings a = {{{1,10,255,100},{2,20,255,110},{6,30,255,120},{0,0,0,0}}}, b = a, result;
    b.layers[2].hue = 200;
    assert(node_light_load(&s, &result) == NODE_LIGHT_EMPTY);
    assert(node_light_save(&s, &a) == NODE_LIGHT_OK);
    assert(node_light_load(&s, &result) == NODE_LIGHT_OK && !memcmp(&a, &result, sizeof(a)));
    memory base = m;
    for (int i=1;i<=7;i++) { m=base; m.fail_at=i; m.operations=0; (void)node_light_save(&s, &b); m.fail_at=0; assert(node_light_load(&s, &result)==NODE_LIGHT_OK); assert(!memcmp(&a,&result,sizeof(a)) || !memcmp(&b,&result,sizeof(b))); }
    for (int i=1;i<31;i++) {
        m=base; m.fail_at=0; m.torn_after=i;
        assert(node_light_save(&s, &b)==NODE_LIGHT_IO_ERROR);
        m.torn_after=0;
        assert(node_light_load(&s, &result)==NODE_LIGHT_OK && !memcmp(&a,&result,sizeof(a)));
        assert(node_light_save(&s, &b)==NODE_LIGHT_UNKNOWN); /* Do not erase an unrecognized partial record. */
    }
    m=base; m.fail_at=0; assert(node_light_save(&s, &b)==NODE_LIGHT_OK); assert(node_light_load(&s, &result)==NODE_LIGHT_OK && !memcmp(&b,&result,sizeof(b)));
    memset(m.slots,0xff,sizeof(m.slots)); m.slots[0][0]=42; assert(node_light_save(&s,&a)==NODE_LIGHT_UNKNOWN); assert(m.slots[0][0]==42);
    b.layers[0].effect=255; assert(node_light_save(&s,&b)==NODE_LIGHT_INVALID);
    memset(m.slots,0xff,sizeof(m.slots));
    output out = {0}; node_light_controller controller;
    assert(node_light_controller_open(&controller,s,apply,&out,0)==NODE_LIGHT_EMPTY && out.calls==0);
    assert(node_light_controller_provision(&controller,&a)==NODE_LIGHT_OK && out.calls==1 && out.value.hue==10);
    node_light_controller_select(&controller,2); assert(out.calls==2 && out.value.hue==30);
    node_light_layer changed = {1,44,200,99};
    assert(node_light_controller_set(&controller,1,&changed)==NODE_LIGHT_OK && out.calls==2);
    node_light_controller_select(&controller,1); assert(out.calls==3 && out.value.hue==44);
    node_light_controller restarted; output after_restart={0};
    assert(node_light_controller_open(&restarted,s,apply,&after_restart,1)==NODE_LIGHT_OK && after_restart.value.hue==44);
    assert(restarted.settings.layers[0].hue==10 && restarted.settings.layers[2].hue==30);
    assert(node_light_controller_provision(&restarted,&a)==NODE_LIGHT_INVALID);
    uint8_t report[32] = { NODE_LIGHT_GET, NODE_LIGHT_CHANNEL, NODE_LIGHT_INFO };
    assert(node_light_protocol_handle(&restarted,report,32) && report[3]==1 && report[4]==4 && report[5]==1 && !memcmp(report+6,"NODE",4));
    memset(report,0,sizeof(report)); report[0]=NODE_LIGHT_GET; report[1]=NODE_LIGHT_CHANNEL; report[2]=NODE_LIGHT_LAYER; report[3]=1;
    assert(node_light_protocol_handle(&restarted,report,32) && report[4]==NODE_LIGHT_OK && report[6]==44);
    report[0]=NODE_LIGHT_SET; report[5]=1; report[6]=99; report[7]=255; report[8]=100;
    memcpy(report+9, &restarted.settings, sizeof(restarted.settings));
    report[9] ^= 1;
    assert(node_light_protocol_handle(&restarted,report,32) && report[4]==NODE_LIGHT_UNKNOWN && after_restart.value.hue==44);
    memcpy(report+9, &restarted.settings, sizeof(restarted.settings));
    assert(node_light_protocol_handle(&restarted,report,32) && report[4]==NODE_LIGHT_OK && after_restart.value.hue==99);
    memset(report,0,sizeof(report)); report[0]=NODE_LIGHT_GET; report[1]=NODE_LIGHT_CHANNEL; report[2]=NODE_LIGHT_LAYER; report[3]=5;
    assert(node_light_protocol_handle(&restarted,report,32) && report[4]==NODE_LIGHT_INVALID);
    assert(!node_light_protocol_handle(&restarted,report,8));
    memset(report,0,sizeof(report)); report[0]=NODE_LIGHT_SET; report[1]=NODE_LIGHT_CHANNEL; report[2]=NODE_LIGHT_PROVISION;
    assert(node_light_protocol_handle(&restarted,report,32) && report[3]==NODE_LIGHT_INVALID);


    return 0;
}
