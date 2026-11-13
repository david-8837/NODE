/**
 * firmwareSimulator.ts - Native C/C++ Firmware Simulation Engine
 * Replicates the state machine, debounce filter, quadrature encoder, and Raw HID packet
 * parser of arduino_firmware.ino and QMK grid_macro_1 for automated host testing (Unity style).
 */

export const TOTAL_KEYS = 10; // 9 matrix keys + 1 encoder switch
export const NUM_LAYERS = 4;

export const ENC_STATES = [0, -1, 1, 0, 1, 0, 0, -1, -1, 0, 0, 1, 0, 1, -1, 0];

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export const LAYER_COLORS: Record<number, RGBColor> = {
  0: { r: 0, g: 81, b: 255 },   // NØDE Electric Blue
  1: { r: 16, g: 185, b: 129 }, // Emerald Green
  2: { r: 245, g: 158, b: 11 }, // Amber Yellow
  3: { r: 225, g: 29, b: 72 },  // Crimson Red
};

export class FirmwareSimulator {
  public keymaps: number[][] = [];
  public encoderMap: number[][] = [];
  public currentLayer = 0;
  public keyStates = new Array(TOTAL_KEYS).fill(false);
  public lastDebounceTime = new Array(TOTAL_KEYS).fill(0);
  public debounceDelayMs = 10;

  public encState = 0;
  public encCounter = 0;
  public flashCommitted = false;
  public persistentFlashMemory: number[][] = [];

  public firedKeycodes: number[] = [];
  public rawHidReports: Uint8Array[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.currentLayer = 0;
    this.keyStates.fill(false);
    this.lastDebounceTime.fill(0);
    this.encState = 0;
    this.encCounter = 0;
    this.flashCommitted = false;
    this.firedKeycodes = [];
    this.rawHidReports = [];

    // Default Keymap initialization (Q, W, E, A, S, D, Z, X, Layer1, Play)
    this.keymaps = [
      [0x0014, 0x001a, 0x0008, 0x0004, 0x0016, 0x0007, 0x001d, 0x001b, 0x5101, 0xe0cd],
      [0xe0b6, 0xe0cd, 0xe0b5, 0x0050, 0x0052, 0x004f, 0x004a, 0x0051, 0x004d, 0xe0e2],
      [0x005f, 0x0060, 0x0061, 0x005c, 0x005d, 0x005e, 0x0059, 0x005a, 0x005b, 0x0067],
      [0x003a, 0x003b, 0x003c, 0x003d, 0x003e, 0x003f, 0x0040, 0x0041, 0x0000, 0x0000],
    ];

    // Encoder CW/CCW map per layer: [CCW, CW]
    this.encoderMap = [
      [0xe0ea, 0xe0e9], // VolDown, VolUp
      [0xe0b6, 0xe0b5], // Prev, Next
      [0x011d, 0x011c], // Undo, Redo
      [0xe070, 0xe06f], // Brightness Down, Up
    ];
  }

  public getActiveRGB(): RGBColor {
    return LAYER_COLORS[this.currentLayer] || LAYER_COLORS[0];
  }

  /**
   * Mechanical key scan simulation with integration debouncing
   */
  public updateKeyPin(keyIdx: number, pinLow: boolean, currentTimeMs: number): boolean {
    if (keyIdx < 0 || keyIdx >= TOTAL_KEYS) return false;

    if (pinLow !== this.keyStates[keyIdx]) {
      if (currentTimeMs - this.lastDebounceTime[keyIdx] >= this.debounceDelayMs) {
        this.keyStates[keyIdx] = pinLow;
        this.lastDebounceTime[keyIdx] = currentTimeMs;
        if (pinLow) {
          const keycode = this.keymaps[this.currentLayer][keyIdx];
          this.fireKeycode(keycode);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Quadrature Rotary Encoder step simulation
   */
  public stepEncoder(pinA: number, pinB: number): 'CW' | 'CCW' | 'NONE' {
    const currentPins = ((pinA & 1) << 1) | (pinB & 1);
    this.encState = ((this.encState << 2) | currentPins) & 0x0f;
    const step = ENC_STATES[this.encState];

    if (step !== 0) {
      this.encCounter += step;
      if (this.encCounter >= 4) {
        this.encCounter = 0;
        const cwCode = this.encoderMap[this.currentLayer][1];
        this.fireKeycode(cwCode);
        return 'CW';
      } else if (this.encCounter <= -4) {
        this.encCounter = 0;
        const ccwCode = this.encoderMap[this.currentLayer][0];
        this.fireKeycode(ccwCode);
        return 'CCW';
      }
    }
    return 'NONE';
  }

  public fireKeycode(keycode: number) {
    if (keycode === 0) return;
    this.firedKeycodes.push(keycode);

    // Smart Action range (0x8000)
    if ((keycode & 0x8000) !== 0) {
      const rep = new Uint8Array(64);
      rep[0] = 0xee;
      rep[1] = keycode & 0xff;
      rep[2] = this.currentLayer;
      this.rawHidReports.push(rep);
    }
  }

  /**
   * Raw HID 64-byte command packet receiver (simulating USB HID interrupt)
   */
  public receiveRawHidPacket(buffer: Uint8Array): Uint8Array | null {
    if (!buffer || buffer.length < 1) return null;

    const cmd = buffer[0];

    if (cmd === 0x01) {
      // CMD_GET_DEVICE_INFO
      const rsp = new Uint8Array(64);
      rsp[0] = 0x01;
      rsp[1] = TOTAL_KEYS;
      rsp[2] = NUM_LAYERS;
      rsp[3] = this.currentLayer;
      rsp[4] = 0x01;
      rsp[5] = 0x02;
      return rsp;
    } else if (cmd === 0x02) {
      // CMD_SET_LAYER
      if (buffer.length >= 2) {
        const targetLayer = buffer[1];
        if (targetLayer < NUM_LAYERS) {
          this.currentLayer = targetLayer;
          const ack = new Uint8Array(64);
          ack[0] = 0x02;
          ack[1] = this.currentLayer;
          return ack;
        }
      }
    } else if (cmd === 0x03) {
      // CMD_SET_KEY
      if (buffer.length >= 5) {
        const layer = buffer[1];
        const keyId = buffer[2];
        const keycode = buffer[3] | (buffer[4] << 8);
        if (layer < NUM_LAYERS && keyId < TOTAL_KEYS) {
          this.keymaps[layer][keyId] = keycode;
          const ack = new Uint8Array(64);
          ack[0] = 0x03;
          ack[1] = layer;
          ack[2] = keyId;
          return ack;
        }
      }
    } else if (cmd === 0x04) {
      // CMD_SAVE_FLASH
      this.flashCommitted = true;
      this.persistentFlashMemory = JSON.parse(JSON.stringify(this.keymaps));
      const ack = new Uint8Array(64);
      ack[0] = 0x04;
      ack[1] = 0x01;
      return ack;
    } else if (cmd === 0x05) {
      // CMD_SET_ENCODER
      if (buffer.length >= 5) {
        const layer = buffer[1];
        const dir = buffer[2];
        const keycode = buffer[3] | (buffer[4] << 8);
        if (layer < NUM_LAYERS && dir < 2) {
          this.encoderMap[layer][dir] = keycode;
          const ack = new Uint8Array(64);
          ack[0] = 0x05;
          ack[1] = layer;
          ack[2] = dir;
          return ack;
        }
      }
    }
    return null;
  }
}
