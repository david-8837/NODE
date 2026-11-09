import { describe, it, expect, beforeEach } from 'vitest';
import { FirmwareSimulator, TOTAL_KEYS, NUM_LAYERS, LAYER_COLORS } from '../src/firmwareSimulator';

describe('Firmware Unit Tests (Unity / Ceedling Pattern)', () => {
  let sim: FirmwareSimulator;

  beforeEach(() => {
    sim = new FirmwareSimulator();
  });

  describe('Key Scanning & Debounce Filtering', () => {
    it('should fire keycode on genuine physical key press', () => {
      // Key 0 (r1c1: Q = 0x0014) pressed at t=10ms
      const fired = sim.updateKeyPin(0, true, 10);
      expect(fired).toBe(true);
      expect(sim.firedKeycodes).toContain(0x0014);
    });

    it('should suppress switch contact bounce (rapid chatter within 5ms)', () => {
      // Switch makes initial contact
      sim.updateKeyPin(0, true, 10);
      expect(sim.firedKeycodes.length).toBe(1);

      // Contact bounces to released after 1ms (chatter)
      const bounce1 = sim.updateKeyPin(0, false, 11);
      expect(bounce1).toBe(false); // Ignored due to debounce

      // Contact bounces back to pressed after 2ms (chatter)
      const bounce2 = sim.updateKeyPin(0, true, 12);
      expect(bounce2).toBe(false); // Ignored due to debounce

      // Only the genuine initial press was registered
      expect(sim.firedKeycodes.length).toBe(1);
    });

    it('should register legitimate second press after debounce window passes', () => {
      sim.updateKeyPin(0, true, 10); // First press
      sim.updateKeyPin(0, false, 25); // Released after 15ms
      sim.updateKeyPin(0, true, 40); // Second press after 15ms

      expect(sim.firedKeycodes.length).toBe(2);
      expect(sim.firedKeycodes).toEqual([0x0014, 0x0014]);
    });
  });

  describe('Rotary Encoder Quadrature State Machine', () => {
    it('should register clockwise (CW) rotation on standard Gray code cycle', () => {
      // Gray code sequence for CW: (0,0) -> (1,0) -> (1,1) -> (0,1) -> (0,0)
      sim.stepEncoder(1, 0);
      sim.stepEncoder(1, 1);
      sim.stepEncoder(0, 1);
      const res = sim.stepEncoder(0, 0);

      expect(res).toBe('CW');
      expect(sim.firedKeycodes).toContain(0xe0e9); // L0 CW = VolUp (0xE0E9)
    });

    it('should register counter-clockwise (CCW) rotation on reverse Gray code cycle', () => {
      // Gray code sequence for CCW: (0,0) -> (0,1) -> (1,1) -> (1,0) -> (0,0)
      sim.stepEncoder(0, 1);
      sim.stepEncoder(1, 1);
      sim.stepEncoder(1, 0);
      const res = sim.stepEncoder(0, 0);

      expect(res).toBe('CCW');
      expect(sim.firedKeycodes).toContain(0xe0ea); // L0 CCW = VolDown (0xE0EA)
    });

    it('should reject invalid invalid/illegal state transitions (contact bounce noise)', () => {
      // Illegal jump: (0,0) -> (1,1) directly without intermediate state
      sim.stepEncoder(1, 1);
      expect(sim.encCounter).toBe(0); // Ignored by transition table
      expect(sim.firedKeycodes.length).toBe(0);
    });
  });

  describe('Layer Switching & RGB Status LED Mapping', () => {
    it('should display Electric Blue on Layer 0 (Default)', () => {
      expect(sim.currentLayer).toBe(0);
      expect(sim.getActiveRGB()).toEqual(LAYER_COLORS[0]);
    });

    it('should update layer and change RGB indicator color on CMD_SET_LAYER', () => {
      const setLayerPacket = new Uint8Array([0x02, 1]); // Set to Layer 1 (Media)
      const ack = sim.receiveRawHidPacket(setLayerPacket);

      expect(ack).toBeDefined();
      expect(ack![0]).toBe(0x02);
      expect(sim.currentLayer).toBe(1);
      expect(sim.getActiveRGB()).toEqual(LAYER_COLORS[1]); // Emerald Green
    });

    it('should fire layer-specific keycode after layer change', () => {
      // Switch to Media layer (1)
      sim.receiveRawHidPacket(new Uint8Array([0x02, 1]));

      // Press Key 0 (Layer 1 key 0 = Prev Track 0xE0B6)
      sim.updateKeyPin(0, true, 10);
      expect(sim.firedKeycodes).toContain(0xe0b6);
    });
  });

  describe('Raw HID 64-Byte Packet Protocol & Safety Bounds', () => {
    it('should respond to CMD_GET_DEVICE_INFO (0x01) with correct metadata', () => {
      const query = new Uint8Array([0x01]);
      const rsp = sim.receiveRawHidPacket(query);

      expect(rsp).toBeDefined();
      expect(rsp!.length).toBe(64);
      expect(rsp![0]).toBe(0x01); // CMD
      expect(rsp![1]).toBe(TOTAL_KEYS); // 10
      expect(rsp![2]).toBe(NUM_LAYERS); // 4
      expect(rsp![4]).toBe(0x01); // Major v1
      expect(rsp![5]).toBe(0x02); // Minor v2
    });

    it('should persist keymaps to non-volatile flash memory on CMD_SAVE_FLASH (0x04)', () => {
      // 1. Remap key
      sim.receiveRawHidPacket(new Uint8Array([0x03, 0, 0, 0x99, 0x88]));
      expect(sim.keymaps[0][0]).toBe(0x8899);

      // 2. Commit to flash
      const saveAck = sim.receiveRawHidPacket(new Uint8Array([0x04]));
      expect(saveAck).toBeDefined();
      expect(saveAck![0]).toBe(0x04);
      expect(saveAck![1]).toBe(0x01); // OK
      expect(sim.flashCommitted).toBe(true);
      expect(sim.persistentFlashMemory[0][0]).toBe(0x8899);
    });

    it('should dynamically remap keys via CMD_SET_KEY (0x03)', () => {
      // Remap Layer 0, Key 1 (r1c2) to 0x1234
      const setKey = new Uint8Array([0x03, 0, 1, 0x34, 0x12]);
      const ack = sim.receiveRawHidPacket(setKey);

      expect(ack).toBeDefined();
      expect(ack![0]).toBe(0x03);
      expect(sim.keymaps[0][1]).toBe(0x1234);

      // Trigger key 1
      sim.updateKeyPin(1, true, 10);
      expect(sim.firedKeycodes).toContain(0x1234);
    });

    it('should gracefully handle truncated or empty buffers without exceptions', () => {
      expect(sim.receiveRawHidPacket(new Uint8Array([]))).toBeNull();
      // Truncated CMD_SET_KEY with fewer than 5 bytes
      expect(sim.receiveRawHidPacket(new Uint8Array([0x03, 0]))).toBeNull();
    });
  });
});
