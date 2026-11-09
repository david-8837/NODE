import { afterEach, describe, it, expect, beforeEach } from 'vitest';
import { SerialPortMock } from 'serialport';
import { SerialManager } from '../src/serialManager';
import { EventEmitter } from 'events';

class MockSerialPort extends EventEmitter {
  public isOpen = true;
  public writtenData: string[] = [];

  public write(data: string, cb?: (err?: any) => void) {
    this.writtenData.push(data);
    if (cb) cb();
  }

  public close(cb?: (err?: any) => void) {
    this.isOpen = false;
    this.emit('close');
    if (cb) cb();
  }

  // Simulate hardware emitting bytes
  public simulateIncoming(data: string) {
    this.emit('data', Buffer.from(data, 'utf-8'));
  }
}

class SilentCloseMockPort extends MockSerialPort {
  public override close(cb?: (err?: any) => void) {
    this.isOpen = false;
    cb?.();
  }
}

describe('USB Serial Communication: Connection & Protocol Lifecycle', () => {
  let mockPort: MockSerialPort;
  let serial: SerialManager;

  beforeEach(() => {
    mockPort = new MockSerialPort();
    serial = new SerialManager({
      timeoutMs: 500,
      reconnectIntervalMs: 100,
      maxReconnectAttempts: 3,
    });
  });

  afterEach(() => {
    SerialPortMock.binding.reset();
  });

  it('should initialize in DISCONNECTED state', () => {
    expect(serial.getState()).toBe('DISCONNECTED');
  });

  it('should transition to CONNECTED on successful port connect', async () => {
    const states: string[] = [];
    serial.on('stateChange', (s: string) => states.push(s));

    const connected = await serial.connect(mockPort);
    expect(connected).toBe(true);
    expect(serial.getState()).toBe('CONNECTED');
    expect(states).toContain('CONNECTING');
    expect(states).toContain('CONNECTED');
  });

  it('should correctly handle fragmented serial chunks across packet boundaries', async () => {
    await serial.connect(mockPort);

    const receivedMessages: any[] = [];
    serial.on('message', (msg: any) => receivedMessages.push(msg));

    // Send half a JSON frame in chunk 1, rest in chunk 2
    mockPort.simulateIncoming('{"event":"KEY_DOWN"');
    expect(receivedMessages.length).toBe(0);

    mockPort.simulateIncoming(',"slot":"r1c1"}\n');
    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0]).toEqual({ event: 'KEY_DOWN', slot: 'r1c1' });
  });

  it('should survive and recover from malformed JSON and noise without crashing', async () => {
    await serial.connect(mockPort);

    const receivedMessages: any[] = [];
    serial.on('message', (msg: any) => receivedMessages.push(msg));

    // Send garbled non-JSON noise, then a valid frame
    mockPort.simulateIncoming('GARBLED_NOISE_$$$$%\n');
    mockPort.simulateIncoming('{"status":"OK","device":"Grid macro 1"}\n');

    expect(receivedMessages.length).toBe(1);
    expect(receivedMessages[0].device).toBe('Grid macro 1');
  });

  it('should send command and resolve when response is received', async () => {
    await serial.connect(mockPort);

    const pingPromise = serial.sendCommand('PING');

    // Verify mockPort received expected command string
    expect(mockPort.writtenData.length).toBe(1);
    expect(JSON.parse(mockPort.writtenData[0])).toEqual({ cmd: 'PING' });

    // Hardware responds
    mockPort.simulateIncoming(
      JSON.stringify({
        status: 'OK',
        device: 'Grid macro 1',
        mcu: 'RP2040-Zero',
        version: '1.0.2',
        activeLayer: 0,
        layerCount: 4,
      }) + '\n'
    );

    const response = await pingPromise;
    expect(response.status).toBe('OK');
    expect(response.device).toBe('Grid macro 1');
    expect(response.mcu).toBe('RP2040-Zero');
  });

  it('should timeout and reject command if hardware fails to reply within timeoutMs', async () => {
    await serial.connect(mockPort);

    await expect(serial.sendCommand('PING')).rejects.toThrow(/Timeout waiting for response/);
  });

  it('should reject overlapping commands without replacing the original request', async () => {
    await serial.connect(mockPort);
    const firstRequest = serial.sendCommand('PING');

    await expect(serial.sendCommand('PING')).rejects.toThrow('serial responses have no request ID');
    await expect(serial.sendCommand('GET_CONFIG')).rejects.toThrow('serial responses have no request ID');
    mockPort.simulateIncoming(
      JSON.stringify({ status: 'OK', device: 'Grid Macro 1' }) + '\n'
    );

    await expect(firstRequest).resolves.toMatchObject({ status: 'OK' });
  });

  it('should reject pending requests immediately when disconnect does not emit a close event', async () => {
    const silentPort = new SilentCloseMockPort();
    await serial.connect(silentPort);
    const pendingRequest = serial.sendCommand('GET_CONFIG');

    await serial.disconnect();

    await expect(pendingRequest).rejects.toThrow('Connection closed by client');
    expect(serial.getState()).toBe('DISCONNECTED');
  });

  it('should exercise the node-serialport stream through Binding Mock', async () => {
    SerialPortMock.binding.createPort('/dev/grid-macro-test', { record: true });
    const nodePort = new SerialPortMock({
      path: '/dev/grid-macro-test',
      baudRate: 115200,
      autoOpen: false,
    });
    await new Promise<void>((resolve, reject) => {
      nodePort.open((error) => (error ? reject(error) : resolve()));
    });
    await serial.connect(nodePort);

    const responsePromise = serial.sendCommand('PING');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((nodePort.port as any)?.recording.toString('utf-8')).toBe('{"cmd":"PING"}\n');

    (nodePort.port as any)?.emitData(
      Buffer.from(JSON.stringify({ status: 'OK', device: 'Grid Macro 1' }) + '\n')
    );
    await expect(responsePromise).resolves.toMatchObject({
      status: 'OK',
      device: 'Grid Macro 1',
    });
    await serial.disconnect();
  });

  it('should transition to DISCONNECTED on unexpected port closure', async () => {
    await serial.connect(mockPort);
    expect(serial.getState()).toBe('CONNECTED');

    mockPort.close();
    expect(serial.getState()).toBe('DISCONNECTED');
  });
});

