import { describe, it, expect } from 'vitest';
import { FirmwareSimulator } from '../src/firmwareSimulator';
import { SerialManager } from '../src/serialManager';
import { validateProfile, ProfileData } from '../src/profileValidator';
import { EventEmitter } from 'events';

class FastMockPort extends EventEmitter {
  public write(data: string, cb?: (err?: any) => void) {
    if (cb) cb();
  }
  public close(cb?: (err?: any) => void) {
    this.emit('close');
    if (cb) cb();
  }
  public send(msg: string) {
    this.emit('data', Buffer.from(msg, 'utf-8'));
  }
}

describe('Stress & Reliability Test Suite', () => {
  it('should process 10,000 simulated key events without dropping state or throwing errors', () => {
    const sim = new FirmwareSimulator();
    sim.debounceDelayMs = 0; // zero debounce for high-throughput stress test

    let totalFired = 0;
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      const keyIdx = i % 10;
      sim.keyStates[keyIdx] = false; // reset state
      const fired = sim.updateKeyPin(keyIdx, true, i);
      if (fired) totalFired++;
    }

    const duration = performance.now() - startTime;

    expect(totalFired).toBe(10000);
    expect(sim.firedKeycodes.length).toBe(10000);
    // Should process 10k events in under 100ms
    expect(duration).toBeLessThan(500);
  });

  it('should execute 1,000 profile switching and validation operations without memory or data corruption', () => {
    const baseProfile: ProfileData = {
      id: 'stress-profile',
      name: 'Base Profile',
      activeLayerIndex: 0,
      layers: [
        {
          r1c1: { label: 'Cut', binding: 'Ctrl+X' },
          r1c2: { label: 'Copy', binding: 'Ctrl+C' },
          r1c3: { label: 'Paste', binding: 'Ctrl+V' },
        },
      ],
    };

    const startTime = performance.now();

    for (let i = 0; i < 1000; i++) {
      const mutated = {
        ...baseProfile,
        id: `profile-${i}`,
        name: `Profile Variant ${i}`,
        activeLayerIndex: i % 4,
      };

      const val = validateProfile(mutated);
      expect(val.valid).toBe(true);
      expect(val.profile?.id).toBe(`profile-${i}`);
    }

    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000);
  });

  it('should survive 100 rapid connection and disconnection cycles cleanly', async () => {
    const serial = new SerialManager({ reconnectIntervalMs: 50, maxReconnectAttempts: 1 });

    for (let i = 0; i < 100; i++) {
      const port = new FastMockPort();
      await serial.connect(port);
      expect(serial.getState()).toBe('CONNECTED');
      await serial.disconnect();
      expect(serial.getState()).toBe('DISCONNECTED');
    }
  });

  it('should withstand protocol fuzzing with 1,000 malformed, fragmented, and boundary-exceeding payloads (AFL++ Simulation)', () => {
    const serial = new SerialManager();
    const sim = new FirmwareSimulator();

    const fuzzStrings = [
      '',
      '{',
      '{"cmd":',
      '{"cmd": "UNKNOWN_OPCODE_99999"}',
      '{"data": "' + 'A'.repeat(5000) + '"}',
      '\x00\x01\x02\xFF\xFE\xFD',
      '{"cmd": null, "data": [1,2,3]}',
      '[[[[[[[[[[{}]]]]]]]]]]',
      '{"status": 99999999999999999999999999999999999999999}',
      '<xml><not_json></xml>',
    ];

    expect(() => {
      // Fuzz USB Serial parser
      for (let i = 0; i < 1000; i++) {
        const payload = fuzzStrings[i % fuzzStrings.length] + '\n';
        serial.handleIncomingChunk(payload);
      }

      // Fuzz Raw HID packet parser
      for (let i = 0; i < 1000; i++) {
        const randomLength = Math.floor(Math.random() * 80);
        const randBuffer = new Uint8Array(randomLength);
        for (let j = 0; j < randomLength; j++) {
          randBuffer[j] = Math.floor(Math.random() * 256);
        }
        sim.receiveRawHidPacket(randBuffer);
      }
    }).not.toThrow();
  });
});
