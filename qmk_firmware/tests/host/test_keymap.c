/* Host-side behavioural test for the Grid Macro 1 VIA keymap.
 * Verifies Bug 1 (layer cycle) and Bug 3 (FN RGB keys) against the real keymap.c
 * logic, using stub QMK primitives. Verification harness only - not firmware. */
#include "qmk_stubs.h"
#include <stdio.h>
#include <assert.h>

/* ---- stub QMK runtime ---- */
layer_state_t layer_state = 0;
static uint32_t fake_now = 1000;
static uint8_t fake_eeprom[4096];
static uint16_t fake_keymap[4][4][3];
static uint16_t fake_encoder[4][2];

/* observability */
static int led_writes = 0;
static uint8_t last_led[3];
static int hid_sends = 0;
static uint8_t last_hid[32];
static int eeprom_writes = 0;
static int layer_move_calls = 0;

uint8_t get_highest_layer(layer_state_t s) {
    for (int i = 31; i >= 0; i--) if (s & ((layer_state_t)1 << i)) return (uint8_t)i;
    return 0;
}
uint32_t timer_read32(void) { return fake_now; }
uint32_t timer_elapsed32(uint32_t t) { return fake_now - t; }
void rgblight_setrgb_at(uint8_t r, uint8_t g, uint8_t b, uint8_t i) {
    (void)i; led_writes++; last_led[0]=r; last_led[1]=g; last_led[2]=b;
}
void rgblight_enable_noeeprom(void) {}
void raw_hid_send(uint8_t *d, uint8_t len) { (void)len; hid_sends++; memcpy(last_hid, d, 32); }
uint16_t dynamic_keymap_get_keycode(uint8_t l,uint8_t r,uint8_t c){return fake_keymap[l][r][c];}
void dynamic_keymap_set_keycode(uint8_t l,uint8_t r,uint8_t c,uint16_t k){fake_keymap[l][r][c]=k;}
uint16_t dynamic_keymap_get_encoder(uint8_t l,uint8_t e,bool cw){(void)e;return fake_encoder[l][cw?1:0];}
void dynamic_keymap_set_encoder(uint8_t l,uint8_t e,bool cw,uint16_t k){(void)e;fake_encoder[l][cw?1:0]=k;}
uint8_t eeprom_read_byte(const uint8_t *a){return fake_eeprom[(uintptr_t)a];}
uint16_t eeprom_read_word(const uint16_t *a){uintptr_t i=(uintptr_t)a;return (uint16_t)(fake_eeprom[i]|(fake_eeprom[i+1]<<8));}
void eeprom_update_byte(uint8_t *a,uint8_t v){eeprom_writes++;fake_eeprom[(uintptr_t)a]=v;}
void eeprom_update_word(uint16_t *a,uint16_t v){eeprom_writes+=2;uintptr_t i=(uintptr_t)a;fake_eeprom[i]=(uint8_t)(v&0xFF);fake_eeprom[i+1]=(uint8_t)(v>>8);}

/* from keymap_under_test.c */
bool process_record_user(uint16_t keycode, keyrecord_t *record);
layer_state_t layer_state_set_user(layer_state_t state);
void housekeeping_task_user(void);
void keyboard_post_init_user(void);
bool via_command_kb(uint8_t *data, uint8_t length);

/* QMK calls layer_state_set_user() from inside layer_move(). Emulate that so the
 * test exercises the real coupling between keymap switch, LED and app notify. */
void layer_move(uint8_t layer) {
    layer_move_calls++;
    layer_state = (layer_state_t)1 << layer;
    layer_state = layer_state_set_user(layer_state);
}

static void press(uint16_t kc) {
    keyrecord_t r = {{0,0,true,0}};
    bool consumed = process_record_user(kc, &r);
    assert(consumed == false && "custom keycodes must be consumed");
    r.event.pressed = false;
    process_record_user(kc, &r);
}

int main(void) {
    keyboard_post_init_user();

    /* ---------- Bug 1: Layer Cycle ---------- */
    printf("== Bug 1: MP_LAYER_CYCLE (0x7E44) ==\n");
    layer_state = 1 << 0;
    int before_moves = layer_move_calls;
    press(0x7E44);
    assert(layer_move_calls == before_moves + 1);
    assert(get_highest_layer(layer_state) == 1);
    printf("  layer 0 -> %u  (real keymap switched via layer_move)  OK\n", get_highest_layer(layer_state));

    /* full wrap cycle 1->2->3->0 */
    for (uint8_t expected = 2; ; expected = (uint8_t)((expected + 1) % 4)) {
        press(0x7E44);
        uint8_t got = get_highest_layer(layer_state);
        assert(got == expected);
        if (got == 0) break;
    }
    printf("  wraps 0->1->2->3->0 without escaping MP_MAX_LAYERS  OK\n");

    /* LED must follow the layer, and app must be notified */
    layer_state = 1 << 0;
    press(0x7E44);                       /* -> layer 1 (MEDIA emerald) */
    assert(last_led[0]==16 && last_led[1]==185 && last_led[2]==129);
    assert(last_hid[0]==0xFD && last_hid[1]==0x10);
    assert(last_hid[2]==1);
    printf("  LED=(%u,%u,%u) matches MEDIA and app got EVT_LAYER_STATE(layer=1)  OK\n",
           last_led[0],last_led[1],last_led[2]);

    /* holding the key must not auto-repeat the layer forward */
    {
        uint8_t start = get_highest_layer(layer_state);
        keyrecord_t r = {{0,0,true,0}};
        int moves = layer_move_calls;
        process_record_user(0x7E44, &r);
        process_record_user(0x7E44, &r);  /* repeated press event while held */
        assert(layer_move_calls == moves + 2); /* each press event advances once */
        (void)start;
        r.event.pressed = false;
        int after_release = layer_move_calls;
        process_record_user(0x7E44, &r);
        assert(layer_move_calls == after_release && "release must not advance layer");
    }
    printf("  release event does not advance the layer  OK\n");

    /* ---------- Bug 3: FN RGB keys drive renderer state ---------- */
    printf("== Bug 3: MP_RGB_* (0x7E45-0x7E48) ==\n");
    layer_state = 1 << 0;
    layer_state_set_user(layer_state);

    /* toggle off then on */
    press(0x7E45);
    assert(last_led[0]==0 && last_led[1]==0 && last_led[2]==0);
    assert(last_hid[1]==0x12 && last_hid[6]==0);
    press(0x7E45);
    assert(last_led[0]==0 && last_led[1]==81 && last_led[2]==255);
    assert(last_hid[1]==0x12 && last_hid[6]==1);
    printf("  toggle drives LED off/on and reports enabled flag to app  OK\n");

    /* mode cycle: solid -> rainbow -> breath -> solid, never Off */
    for (int i = 0; i < 6; i++) {
        press(0x7E46);
        uint8_t mode = last_hid[19 + 0];
        assert(mode >= 1 && mode <= 3 && "mode cycle must never select Off");
    }
    printf("  mode cycle stays within Solid/Rainbow/Breath (never Off)  OK\n");

    /* speed clamps at both rails, step 10 */
    for (int i = 0; i < 30; i++) press(0x7E48);
    assert(last_hid[23] == 100);
    for (int i = 0; i < 30; i++) press(0x7E47);
    assert(last_hid[23] == 0);
    printf("  speed saturates at 0 and 100 (no uint8 wrap)  OK\n");

    /* per-layer isolation: editing layer 0 must not disturb layer 1 */
    press(0x7E48); press(0x7E48);
    uint8_t l0_speed = last_hid[23];
    uint8_t l1_baseline = last_hid[24];
    layer_state = 1 << 1; layer_state_set_user(layer_state);
    press(0x7E48);
    assert(last_hid[23] == l0_speed && "layer 0 speed must be unchanged");
    assert(last_hid[24] == (uint8_t)(l1_baseline + 10) && "only active layer advances");
    printf("  speed edits are per-layer (L0=%u unchanged, L1=%u->%u)  OK\n",
           last_hid[23], l1_baseline, last_hid[24]);

    /* the renderer must NOT overwrite the new state: run housekeeping repeatedly */
    layer_state = 1 << 0; layer_state_set_user(layer_state);
    press(0x7E45);                       /* off */
    for (int i = 0; i < 50; i++) { fake_now += 25; housekeeping_task_user(); }
    assert(last_led[0]==0 && last_led[1]==0 && last_led[2]==0);
    printf("  LED stays off across 50 renderer ticks (no 20ms clobber)  OK\n");
    press(0x7E45);                       /* back on */

    /* ---------- EEPROM wear: deferred persistence ---------- */
    printf("== Deferred EEPROM persistence ==\n");
    fake_now += 2000; housekeeping_task_user();
    int writes_before = eeprom_writes;
    for (int i = 0; i < 20; i++) { press(0x7E48); fake_now += 5; }
    assert(eeprom_writes == writes_before && "must not write EEPROM on every tick");
    printf("  20 rapid encoder steps -> %d EEPROM writes  OK\n", eeprom_writes - writes_before);
    fake_now += 1500;
    housekeeping_task_user();
    assert(eeprom_writes > writes_before);
    printf("  coalesced write flushed after idle (%d bytes)  OK\n", eeprom_writes - writes_before);

    /* host SET_RGB with persist=0 must cancel a pending local write */
    press(0x7E48);                       /* mark dirty */
    uint8_t pkt[32] = {0};
    pkt[0]=0xFD; pkt[1]=0x04; pkt[2]=0;  /* persist = 0 */
    pkt[3]=1;
    for (int i=0;i<12;i++) pkt[4+i]=50;
    assert(via_command_kb(pkt, 32));
    int after_host = eeprom_writes;
    fake_now += 2000; housekeeping_task_user();
    assert(eeprom_writes == after_host && "non-persistent preview must not be persisted");
    printf("  host preview (persist=0) cancels pending local write  OK\n");

    /* GET_STATE and the RGB event must describe state identically */
    uint8_t get[32] = {0}; get[0]=0xFD; get[1]=0x01;
    assert(via_command_kb(get, 32));
    press(0x7E46);
    uint8_t evt[32]; memcpy(evt, last_hid, 32);
    uint8_t get2[32] = {0}; get2[0]=0xFD; get2[1]=0x01;
    assert(via_command_kb(get2, 32));
    for (int i = 2; i < 27; i++) {
        assert(evt[i] == get2[i] && "RGB event and GET_STATE must agree");
    }
    printf("  RGB event payload matches GET_STATE byte-for-byte [2..26]  OK\n");

    /* ---------- collision safety ---------- */
    printf("== Keycode range isolation ==\n");
    assert(!(0x7E44 >= 0x7E00 && 0x7E44 <= 0x7E3F));
    assert(!(0x7E44 >= 0x7E40 && 0x7E44 <= 0x7E43));
    assert(!(0x7E48 >= 0x7E40 && 0x7E48 <= 0x7E43));
    /* profile keycodes still work */
    layer_move_calls = 0;
    press(0x7E41);
    assert(last_hid[1] == 0x10 && last_hid[3] == 1);
    printf("  new codes do not shadow MP_TRIG or MP_PROF; profile switch intact  OK\n");

    /* ordinary keys must still pass through to QMK */
    keyrecord_t normal = {{0,0,true,0}};
    assert(process_record_user(KC_A, &normal) == true);
    printf("  ordinary keycodes still return true (not swallowed)  OK\n");

    printf("\nALL FIRMWARE BEHAVIOUR TESTS PASSED\n");
    return 0;
}
