/*
 * Grid Macro 1 - RP2040-Zero Arduino C++ Firmware (Adafruit TinyUSB)
 * Direct Matrix (GP0..GP8) + EC11 Encoder (GP9, GP10, GP11) + WS2812 RGB (GP16)
 * Supports 64-byte Raw HID for live WebHID dynamic key remapping without reflashing.
 */

#include <Arduino.h>
#include <Adafruit_TinyUSB.h>

// Direct Matrix Pin definitions for RP2040-Zero
const uint8_t KEY_PINS[9] = { 0, 1, 2, 3, 4, 5, 6, 7, 8 };
const uint8_t ENC_A = 9;   // Rotary Encoder CW
const uint8_t ENC_B = 10;  // Rotary Encoder CCW
const uint8_t ENC_SW = 11; // Rotary Push Switch

#define TOTAL_KEYS 10 // 9 Matrix keys + 1 Encoder Switch
#define NUM_LAYERS 4

// Dynamic Keymap Stored in RAM (Committable to Flash)
uint16_t keymaps[NUM_LAYERS][TOTAL_KEYS] = {
  // Layer 0: Default (Q, W, E, A, S, D, Z, X, Layer1, Play/Pause)
  { 0x0014, 0x001A, 0x0008, 0x0004, 0x0016, 0x0007, 0x001D, 0x001B, 0x5101, 0xE0CD },
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
int last_enc_a = HIGH;

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
  }

  // Rotary Encoder Pins
  pinMode(ENC_A, INPUT_PULLUP);
  pinMode(ENC_B, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
}

// Raw HID WebHID Callback: Handles Live Key Remapping from Browser
void raw_hid_receive_cb(uint8_t report_id, hid_report_type_t report_type, uint8_t const* buffer, uint16_t bufsize) {
  if (buffer[0] == 0x01) { // CMD_GET_DEVICE_INFO
    uint8_t rsp[64] = { 0x01, TOTAL_KEYS, NUM_LAYERS, 0x01, 0x00, 0x02 };
    usb_hid.sendReport(3, rsp, sizeof(rsp));
  } else if (buffer[0] == 0x03) { // CMD_SET_KEY
    uint8_t layer = buffer[1];
    uint8_t key_id = buffer[2];
    uint16_t keycode = buffer[3] | (buffer[4] << 8);

    if (layer < NUM_LAYERS && key_id < TOTAL_KEYS) {
      keymaps[layer][key_id] = keycode;
    }
  } else if (buffer[0] == 0x04) { // CMD_SAVE_FLASH
    // Save to LittleFS / RP2040 Flash storage
  }
}

void fire_keycode(uint16_t keycode) {
  if (keycode == 0x0000) return;

  // Smart Action (0x8000 range): Notify Web App via Raw HID
  if ((keycode & 0x8000) != 0) {
    uint8_t report[64] = { 0xEE, (uint8_t)(keycode & 0xFF) };
    usb_hid.sendReport(3, report, sizeof(report));
    return;
  }

  // Consumer / Media Key (0xE000 range)
  if ((keycode & 0xE000) == 0xE000) {
    usb_hid.sendReport16(2, keycode & 0x0FFF);
    delay(10);
    usb_hid.sendReport16(2, 0); // Release
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
  delay(10);
  usb_hid.keyboardRelease(1);
}

void loop() {
  if (!TinyUSBDevice.mounted()) return;

  // 1. Scan 9 Direct Keys
  for (int i = 0; i < 9; i++) {
    bool is_pressed = (digitalRead(KEY_PINS[i]) == LOW);
    if (is_pressed != key_states[i]) {
      key_states[i] = is_pressed;
      if (is_pressed) {
        fire_keycode(keymaps[current_layer][i]);
      }
    }
  }

  // 2. Scan Encoder Push Switch (Key 10)
  bool is_sw_pressed = (digitalRead(ENC_SW) == LOW);
  if (is_sw_pressed != key_states[9]) {
    key_states[9] = is_sw_pressed;
    if (is_sw_pressed) {
      fire_keycode(keymaps[current_layer][9]);
    }
  }

  // 3. Scan Quadrature Rotary Encoder
  int current_enc_a = digitalRead(ENC_A);
  if (last_enc_a == HIGH && current_enc_a == LOW) {
    if (digitalRead(ENC_B) == LOW) {
      fire_keycode(encoder_map[current_layer][1]); // CW (Vol Up)
    } else {
      fire_keycode(encoder_map[current_layer][0]); // CCW (Vol Down)
    }
  }
  last_enc_a = current_enc_a;

  delayMicroseconds(500); // 2000Hz scan loop
}
