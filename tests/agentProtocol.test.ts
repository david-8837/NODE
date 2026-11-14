import { describe, it, expect } from 'vitest';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AgentMessageType, serializeMessage, JsonLineDecoder } = require('../electron/agentProtocol.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { decodeHardwareReport, calculateChecksum, NODE_HARDWARE_EVENT_MAGIC, NODE_HARDWARE_PROTOCOL_VERSION } = require('../electron/hardwareProtocol.cjs');

describe('agentProtocol & hardwareProtocol CJS', () => {
  it('serializes messages with newline delimiter', () => {
    const serialized = serializeMessage({ id: '1', type: AgentMessageType.PING });
    expect(serialized).toBe('{"id":"1","type":"PING"}\n');
  });

  it('decodes single and fragmented JSON lines', () => {
    const received: any[] = [];
    const decoder = new JsonLineDecoder((msg: any) => received.push(msg));

    decoder.feed(Buffer.from('{"id":"1","type":"PING"}\n{"id":"2"'));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ id: '1', type: 'PING' });

    decoder.feed(Buffer.from(',"type":"PONG"}\n'));
    expect(received).toHaveLength(2);
    expect(received[1]).toEqual({ id: '2', type: 'PONG' });
  });

  it('correctly decodes hardware reports matching QMK firmware output', () => {
    const report = new Uint8Array(32);
    report[0] = NODE_HARDWARE_EVENT_MAGIC; // 0xEE
    report[1] = NODE_HARDWARE_PROTOCOL_VERSION; // 0x01
    report[2] = 0x01; // BUTTON_DOWN
    report[3] = 0; // slot 0 (r1c1)
    report[4] = 42; // sequence
    report[5] = 1; // layer 1
    report[6] = 0x01; // mask low byte
    report[7] = 0x00; // mask high byte
    report[31] = calculateChecksum(report);

    const decoded = decodeHardwareReport(report);
    expect(decoded).not.toBeNull();
    expect(decoded?.slotId).toBe('r1c1');
    expect(decoded?.sequence).toBe(42);
    expect(decoded?.activeLayer).toBe(1);
    expect(decoded?.isPressed).toBe(true);
  });
});
