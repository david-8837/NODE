import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { SerialManager } from '../src/serialManager';

describe('serial framing and Web Serial lifecycle', () => {
  it('reads fragmented UTF-8 from a Web Serial stream and releases it on disconnect', async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const port = { readable, writable: new WritableStream(), close: vi.fn(async () => {
      expect(readable.locked).toBe(false);
    }) };
    const manager = new SerialManager({ maxReconnectAttempts: 0 });
    const messages: unknown[] = [];
    manager.on('message', (value: unknown) => messages.push(value));
    expect(await manager.connect(port)).toBe(true);
    const encoded = new TextEncoder().encode('{"name":"é"}\n');
    const split = encoded.indexOf(0xc3) + 1;
    input.enqueue(encoded.slice(0, split));
    input.enqueue(encoded.slice(split));
    await vi.waitFor(() => expect(messages).toEqual([{ name: 'é' }]));
    await manager.disconnect();
    expect(port.close).toHaveBeenCalledOnce();
    expect(manager.getState()).toBe('DISCONNECTED');
  });

  it('opens a Web Serial port whose readable stream is initially null', async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const port: { readable: ReadableStream<Uint8Array> | null; open: () => Promise<void>; close: () => Promise<void> } = {
      readable: null,
      open: vi.fn(async () => { port.readable = readable; }),
      close: async () => {},
    };
    const manager = new SerialManager({ maxReconnectAttempts: 0 });
    const messages: unknown[] = [];
    manager.on('message', (message: unknown) => messages.push(message));
    expect(await manager.connect(port)).toBe(true);
    expect(port.open).toHaveBeenCalledOnce();
    input.enqueue(new TextEncoder().encode('{"ready":true}\n'));
    await vi.waitFor(() => expect(messages).toEqual([{ ready: true }]));
    await manager.disconnect();
  });

  it('removes old stream listeners when reconnecting the same port', async () => {
    class Port extends EventEmitter {
      close(callback: () => void) { callback(); }
    }
    const port = new Port();
    const manager = new SerialManager({ maxReconnectAttempts: 0 });
    let received = 0;
    manager.on('message', () => received++);
    await manager.connect(port);
    await manager.disconnect();
    expect(port.listenerCount('data')).toBe(0);
    await manager.connect(port);
    port.emit('data', Buffer.from('{"ok":true}\n'));
    expect(received).toBe(1);
    await manager.disconnect();
  });

  it('automatically reconnects using the provider after a stream closes', async () => {
    class Port extends EventEmitter {
      close(callback: () => void) { callback(); }
    }
    const first = new Port();
    const second = new Port();
    const provider = vi.fn(async () => second);
    const manager = new SerialManager({ portProvider: provider, reconnectIntervalMs: 5, maxReconnectAttempts: 2 });
    await manager.connect(first);
    first.emit('close');
    await vi.waitFor(() => expect(manager.port).toBe(second));
    expect(manager.getState()).toBe('CONNECTED');
    expect(provider).toHaveBeenCalledOnce();
    await manager.disconnect();
  });

  it('delivers every complete message in a large burst', () => {
    const manager = new SerialManager();
    let received = 0;
    manager.on('message', () => received++);
    manager.handleIncomingChunk('{"event":"KEY_DOWN"}\n'.repeat(4000));
    expect(received).toBe(4000);
  });

  it('discards an oversized line until its delimiter and recovers the following frame', () => {
    const manager = new SerialManager();
    const received: unknown[] = [];
    manager.on('message', (message: unknown) => received.push(message));
    manager.handleIncomingChunk('x'.repeat(65537));
    manager.handleIncomingChunk('{"fake":true}\n{"valid":true}\n');
    expect(received).toEqual([{ valid: true }]);
  });

  it('marks an ended Web Serial stream disconnected', async () => {
    let input!: ReadableStreamDefaultController<Uint8Array>;
    const readable = new ReadableStream<Uint8Array>({ start(controller) { input = controller; } });
    const manager = new SerialManager({ maxReconnectAttempts: 0 });
    await manager.connect({ readable, close: async () => {} });
    input.close();
    await vi.waitFor(() => expect(manager.getState()).toBe('DISCONNECTED'));
  });
});
