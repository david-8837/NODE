/*
 * Grid Macro 1 - RP2040-Zero Arduino C++ Firmware (Adafruit TinyUSB)
 * Direct Matrix (GP0..GP8) + EC11 Encoder (GP9, GP10, GP11) + WS2812 RGB (GP16)
 * Supports 64-byte Raw HID for live WebHID dynamic key remapping without reflashing.
 */

#include <Arduino.h>
#include <Adafruit_TinyUSB.h>
#include <EEPROM.h>

#define EEPROM_MAGIC 0x47524944 // 'GRID'

// Direct Matrix Pin definitions for RP2040-Zero
const uint8_t KEY_PINS[9] = { 0, 1, 2, 3, 4, 5, 6, 7, 8 };
const uint8_t ENC_A = 9;   // Rotary Encoder CW
const uint8_t ENC_B = 10;  // Rotary Encoder CCW
const uint8_t ENC_SW = 11; // Rotary Push Switch

#define TOTAL_KEYS 10 // 9 Matrix keys + 1 Encoder Switch
#define NUM_LAYERS 4

// Dynamic Keymap Stored in RAM (Committable to Flash)
uint16_t keymaps[NUM_LAYERS][TOTAL_KEYS] = {
  // Layer 0: Default Blank (No keys active until mapped in App)
  { 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000 },
  // Layer 1: Media (Prev, Play, Next, Left, Up, Right, Home, Down, End, Mute)
  { 0xE0B6, 0xE0CD, 0xE0B5, 0x0050, 0x0052, 0x004F, 0x004A, 0x0051, 0x004D, 0xE0E2 },
  // Layer 2: Numpad (7, 8, 9, 4, 5, 6, 1, 2, 3, Equal)
  { 0x005F, 0x0060, 0x0061, 0x005C, 0x005D, 0x005E, 0x0059, 0x005A, 0x005B, 0x0067 },
  // Layer 3: Function
  { 0x003A, 0x003B, 0x003C, 0x003D, 0x003E, 0x003F, 0x0040, 0x0041, 0x0000, 0x0000 }
};

// Rotary Encoder Actions per layer: [Layer][0: CCW, 1: CW]
uint16_t encoder_map[NUM_LAYERS][2] = {
  { 0xE0EA, 0xE0E9 }, // L0: VolDown, VolUp
  { 0xE0B6, 0xE0B5 }, // L1: Prev, Next Track
  { 0x011D, 0x011C }, // L2: Undo (Ctrl+Z), Redo (Ctrl+Y)
  { 0xE070, 0xE06F }  // L3: Brightness Down, Up
};

uint8_t current_layer = 0;
bool key_states[TOTAL_KEYS] = { false };
bool raw_key_states[TOTAL_KEYS] = { false };
unsigned long last_raw_change_time[TOTAL_KEYS] = { 0 };
unsigned long debounce_interval_ms = 10; // Default 10ms, configurable up to 25ms

// Robust Quadrature Encoder Gray Code State Machine
// 4-state transition table to completely eliminate contact bounce & direction misreads
static uint8_t enc_state = 0;
static const int8_t ENC_STATES[] = { 0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0 };
static int8_t enc_counter = 0;

// USB HID Descriptors (Keyboard + Consumer Media + 64-byte Raw HID)
uint8_t const desc_hid_report[] = {
  TUD_HID_REPORT_DESC_KEYBOARD(HID_REPORT_ID(1)),
  TUD_HID_REPORT_DESC_CONSUMER(HID_REPORT_ID(2)),
  TUD_HID_REPORT_DESC_GENERIC_INOUT(64, HID_REPORT_ID(3))
};

Adafruit_USBD_HID usb_hid;

void raw_hid_receive_cb(uint8_t report_id, hid_report_type_t report_type, uint8_t const* buffer, uint16_t bufsize);

void setup() {
  usb_hid.setPollInterval(1);
  usb_hid.setReportDescriptor(desc_hid_report, sizeof(desc_hid_report));
  usb_hid.setReportCallback(NULL, raw_hid_receive_cb);
  usb_hid.begin();

  // Initialize Direct Key Inputs with internal pull-up
  for (int i = 0; i < 9; i++) {
    pinMode(KEY_PINS[i], INPUT_PULLUP);
    key_states[i] = false;
    raw_key_states[i] = false;
    last_raw_change_time[i] = 0;
  }

  // Rotary Encoder Pins
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
  key_states[9] = false;
  raw_key_states[9] = false;
  last_raw_change_time[9] = 0;

  enc_state = (digitalRead(ENC_A) << 1) | digitalRead(ENC_B);

  // Load Non-Volatile Dynamic Keymaps & Encoder Maps from Flash/EEPROM
  EEPROM.begin(512);
  uint32_t magic = 0;
  EEPROM.get(0, magic);
  if (magic == EEPROM_MAGIC) {
    EEPROM.get(4, keymaps);
    EEPROM.get(4 + sizeof(keymaps), encoder_map);
  }
}

// Memory-Safe Raw HID Callback: Bounds checked, safe parsing, layer switching
void raw_hid_receive_cb(uint8_t report_id, hid_report_type_t report_type, uint8_t const* buffer, uint16_t bufsize) {
  if (!buffer || bufsize < 1) return;

  uint8_t cmd = buffer[0];

  if (cmd == 0x01) { // CMD_GET_DEVICE_INFO
    uint8_t rsp[64];
    memset(rsp, 0, sizeof(rsp)); // Zero-initialize memory to prevent RAM leakage
    rsp[0] = 0x01;
    rsp[1] = TOTAL_KEYS;
    rsp[2] = NUM_LAYERS;
    rsp[3] = current_layer;
    rsp[4] = 0x01; // Firmware Version Major
    rsp[5] = 0x02; // Firmware Version Minor
    usb_hid.sendReport(3, rsp, sizeof(rsp));
  } else if (cmd == 0x02) { // CMD_SET_LAYER
    if (bufsize >= 2) {
      uint8_t target_layer = buffer[1];
      if (target_layer < NUM_LAYERS) {
        current_layer = target_layer;
        uint8_t ack[64];
        memset(ack, 0, sizeof(ack));
        ack[0] = 0x02;
        ack[1] = current_layer;
        usb_hid.sendReport(3, ack, sizeof(ack));
      }
    }
  } else if (cmd == 0x03) { // CMD_SET_KEY
    if (bufsize >= 5) {
      uint8_t layer = buffer[1];
      uint8_t key_id = buffer[2];
      uint16_t keycode = (uint16_t)buffer[3] | ((uint16_t)buffer[4] << 8);

      if (layer < NUM_LAYERS && key_id < TOTAL_KEYS) {
        keymaps[layer][key_id] = keycode;
        uint8_t ack[64];
        memset(ack, 0, sizeof(ack));
        ack[0] = 0x03;
        ack[1] = layer;
        ack[2] = key_id;
        usb_hid.sendReport(3, ack, sizeof(ack));
      }
    }
  } else if (cmd == 0x04) { // CMD_SAVE_FLASH
    EEPROM.put(0, (uint32_t)EEPROM_MAGIC);
    EEPROM.put(4, keymaps);
    EEPROM.put(4 + sizeof(keymaps), encoder_map);
    EEPROM.commit();
    uint8_t ack[64];
    memset(ack, 0, sizeof(ack));
    ack[0] = 0x04;
    ack[1] = 0x01; // Success status
    usb_hid.sendReport(3, ack, sizeof(ack));
  } else if (cmd == 0x05) { // CMD_SET_ENCODER: [0x05, layer, dir(0=CCW,1=CW), keycode_lo, keycode_hi]
    if (bufsize >= 5) {
      uint8_t layer = buffer[1];
      uint8_t dir = buffer[2];
      uint16_t keycode = (uint16_t)buffer[3] | ((uint16_t)buffer[4] << 8);

      if (layer < NUM_LAYERS && dir < 2) {
        encoder_map[layer][dir] = keycode;
        uint8_t ack[64];
        memset(ack, 0, sizeof(ack));
        ack[0] = 0x05;
        ack[1] = layer;
        ack[2] = dir;
        usb_hid.sendReport(3, ack, sizeof(ack));
      }
    }
  }
}

void press_keycode(uint16_t keycode, uint8_t slot_index) {
  if (keycode == 0x0000) return;

  // Smart Action (0x8000 range): Notify Web App via Raw HID
  if ((keycode & 0x8000) != 0) {
    uint8_t report[64];
    memset(report, 0, sizeof(report));
    report[0] = 0xEE;
    report[1] = 0x01; // BUTTON_DOWN
    report[2] = slot_index;
    report[3] = (uint8_t)(keycode & 0xFF);
    report[4] = current_layer;
    usb_hid.sendReport(3, report, sizeof(report));
    return;
  }

  // Consumer / Media Key (0xE000 range)
  if ((keycode & 0xE000) == 0xE000) {
    usb_hid.sendReport16(2, keycode & 0x0FFF);
    return;
  }

  // Standard Keyboard Key with optional Modifiers (Bit 8: Ctrl, Bit 9: Shift, Bit 10: Alt, Bit 11: GUI)
  uint8_t modifier = 0;
  if (keycode & (1 << 8)) modifier |= KEYBOARD_MODIFIER_LEFTCTRL;
  if (keycode & (1 << 9)) modifier |= KEYBOARD_MODIFIER_LEFTSHIFT;
  if (keycode & (1 << 10)) modifier |= KEYBOARD_MODIFIER_LEFTALT;
  if (keycode & (1 << 11)) modifier |= KEYBOARD_MODIFIER_LEFTGUI;

  uint8_t key_report[6] = { (uint8_t)(keycode & 0xFF), 0, 0, 0, 0, 0 };
  usb_hid.keyboardReport(1, modifier, key_report);
}

void release_keycode(uint16_t keycode, uint8_t slot_index) {
  if (keycode == 0x0000) return;

  if ((keycode & 0x8000) != 0) {
    uint8_t report[64];
    memset(report, 0, sizeof(report));
    report[0] = 0xEE;
    report[1] = 0x02; // BUTTON_UP
    report[2] = slot_index;
    report[3] = (uint8_t)(keycode & 0xFF);
    report[4] = current_layer;
    usb_hid.sendReport(3, report, sizeof(report));
    return;
  }

  if ((keycode & 0xE000) == 0xE000) {
    usb_hid.sendReport16(2, 0);
    return;
  }

  usb_hid.keyboardRelease(1);
}

void fire_encoder_pulse(uint16_t keycode) {
  if (keycode == 0x0000) return;
  press_keycode(keycode, 0xFF);
  release_keycode(keycode, 0xFF);
}

void loop() {
  if (!TinyUSBDevice.mounted()) return;

  unsigned long now = millis();

  // 1. Scan 9 Direct Keys with Non-Blocking Symmetric Timestamp Debounce
  for (int i = 0; i < 9; i++) {
    bool raw_pressed = (digitalRead(KEY_PINS[i]) == LOW);
    if (raw_pressed != raw_key_states[i]) {
      raw_key_states[i] = raw_pressed;
      last_raw_change_time[i] = now;
    } else if (raw_key_states[i] != key_states[i] && (now - last_raw_change_time[i] >= debounce_interval_ms)) {
      key_states[i] = raw_key_states[i];
      if (key_states[i]) {
        press_keycode(keymaps[current_layer][i], i);
      } else {
        release_keycode(keymaps[current_layer][i], i);
      }
    }
  }

  // 2. Scan Encoder Push Switch (Key 10 / index 9) with Non-Blocking Debounce
  bool raw_sw = (digitalRead(ENC_SW) == LOW);
  if (raw_sw != raw_key_states[9]) {
    raw_key_states[9] = raw_sw;
    last_raw_change_time[9] = now;
  } else if (raw_key_states[9] != key_states[9] && (now - last_raw_change_time[9] >= debounce_interval_ms)) {
    key_states[9] = raw_key_states[9];
    if (key_states[9]) {
      press_keycode(keymaps[current_layer][9], 9);
    } else {
      release_keycode(keymaps[current_layer][9], 9);
    }
  }

  // 3. Scan Rotary Encoder with 4-State Gray Code Quadrature State Machine
  uint8_t current_pins = (digitalRead(ENC_A) << 1) | digitalRead(ENC_B);
  enc_state = ((enc_state << 2) | current_pins) & 0x0F;
  int8_t step = ENC_STATES[enc_state];
  if (step != 0) {
    enc_counter += step;
    if (enc_counter >= 4) { // 1 complete detent CW
      fire_encoder_pulse(encoder_map[current_layer][1]);
      enc_counter = 0;
    } else if (enc_counter <= -4) { // 1 complete detent CCW
      fire_encoder_pulse(encoder_map[current_layer][0]);
      enc_counter = 0;
    }
  }

  delayMicroseconds(250); // 4000Hz scan loop
}
