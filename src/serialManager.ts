/**
 * serialManager.ts - Industrial USB Serial Communication Manager for Grid Macro 1
 * Implements packet framing, auto-reconnection, malformed frame resilience, and device discovery.
 * Designed for interoperability with Web Serial in browser/Electron and node-serialport with MockBinding in tests.
 */

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

export interface DeviceInfo {
  status: string;
  device: string;
  mcu: string;
  version: string;
  activeLayer: number;
  layerCount: number;
}

export interface SerialManagerOptions {
  baudRate?: number;
  reconnectIntervalMs?: number;
  maxReconnectAttempts?: number;
  timeoutMs?: number;
  portProvider?: () => Promise<any>;
}

export class SerialManager {
  private state: ConnectionState = 'DISCONNECTED';
  private buffer: string = '';
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void; timer: any }>();
  private listeners: {
    stateChange: ((state: ConnectionState) => void)[];
    message: ((msg: any) => void)[];
    error: ((err: Error) => void)[];
  } = { stateChange: [], message: [], error: [] };

  public port: any = null;
  private reader: any = null;
  private writer: any = null;
  private options: Required<SerialManagerOptions>;

  constructor(opts?: SerialManagerOptions) {
    this.options = {
      baudRate: opts?.baudRate ?? 115200,
      reconnectIntervalMs: opts?.reconnectIntervalMs ?? 1500,
      maxReconnectAttempts: opts?.maxReconnectAttempts ?? 5,
      timeoutMs: opts?.timeoutMs ?? 2000,
      portProvider: opts?.portProvider ?? (async () => null),
    };
  }

  public getState(): ConnectionState {
    return this.state;
  }

  private setState(newState: ConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.listeners.stateChange.forEach(fn => fn(newState));
    }
  }

  public on(event: 'stateChange' | 'message' | 'error', callback: any) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  public off(event: 'stateChange' | 'message' | 'error', callback: any) {
    if (event === 'stateChange') {
      this.listeners.stateChange = this.listeners.stateChange.filter(fn => fn !== callback);
    } else if (event === 'message') {
      this.listeners.message = this.listeners.message.filter(fn => fn !== callback);
    } else if (event === 'error') {
      this.listeners.error = this.listeners.error.filter(fn => fn !== callback);
    }
  }

  /**
   * Connect to a port (supports Web Serial port or node-serialport stream)
   */
  public async connect(customPort?: any): Promise<boolean> {
    if (this.state === 'CONNECTED') return true;

    this.setState(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.port = customPort || (await this.options.portProvider());
      if (!this.port) {
        throw new Error('No compatible Serial device found');
      }

      // Handle Web Serial API (browser/Electron)
      if (typeof this.port.open === 'function' && !this.port.readable && typeof this.port.readable === 'undefined') {
        await this.port.open({ baudRate: this.options.baudRate });
      }

      // Handle Node.js stream / SerialPort object
      if (typeof this.port.on === 'function') {
        this.port.on('data', (chunk: Buffer | string) => {
          this.handleIncomingChunk(chunk.toString('utf-8'));
        });
        this.port.on('close', () => {
          this.handleDisconnect('Port closed by hardware');
        });
        this.port.on('error', (err: Error) => {
          this.listeners.error.forEach(fn => fn(err));
          this.handleDisconnect(err.message);
        });
      } else if (this.port.readable) {
        this.startWebSerialReader();
      }

      this.setState('CONNECTED');
      this.reconnectAttempts = 0;
      return true;
    } catch (err: any) {
      this.setState('DISCONNECTED');
      this.listeners.error.forEach(fn => fn(err));
      this.scheduleReconnect();
      return false;
    }
  }

  private async startWebSerialReader() {
    try {
      while (this.port && this.port.readable && this.state === 'CONNECTED') {
        const textDecoder = new (globalThis as any).TextDecoderStream();
        const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        this.reader = reader;

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) this.handleIncomingChunk(value);
          }
        } finally {
          reader.releaseLock();
          await readableStreamClosed.catch(() => {});
        }
      }
    } catch (e: any) {
      this.handleDisconnect(e.message);
    }
  }

  /**
   * Delimiter-based line parsing: handles chunk fragmentation and rapid messages
   */
  public handleIncomingChunk(chunk: string) {
    this.buffer += chunk;

    // Safety buffer clamp against flood DoS
    if (this.buffer.length > 64 * 1024) {
      this.buffer = this.buffer.slice(-16 * 1024);
    }

    let newlineIdx: number;
    while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIdx).trim();
      this.buffer = this.buffer.slice(newlineIdx + 1);

      if (line.length > 0) {
        this.parseIncomingLine(line);
      }
    }
  }

  /**
   * Safe JSON line parser with error recovery (ignores malformed/noisy lines)
   */
  public parseIncomingLine(line: string) {
    try {
      const parsed = JSON.parse(line);
      this.listeners.message.forEach(fn => fn(parsed));

      // Resolve matching pending request
      if (parsed.cmd || parsed.status || parsed.type) {
        for (const [reqKey, req] of this.pendingRequests.entries()) {
          if (
            (reqKey === 'PING' && parsed.status === 'OK' && parsed.device) ||
            (reqKey === 'GET_CONFIG' && parsed.type === 'CONFIG_DATA') ||
            (reqKey === 'SET_CONFIG' && (parsed.status === 'OK' || parsed.status === 'ERROR_READONLY')) ||
            (reqKey === 'SET_LAYER' && parsed.activeLayer !== undefined)
          ) {
            clearTimeout(req.timer);
            req.resolve(parsed);
            this.pendingRequests.delete(reqKey);
            break;
          }
        }
      }
    } catch {
      // Intentionally drop garbled/partial serial fragments without crashing
    }
  }

  /**
   * Send JSON command with timeout and automatic error recovery
   */
  public async sendCommand<T = any>(cmdName: string, payload: any = {}): Promise<T> {
    if (this.state !== 'CONNECTED') {
      throw new Error(`Cannot send command "${cmdName}": Serial port is ${this.state}`);
    }
    // The current wire protocol has no request IDs; concurrent replies can be ambiguous.
    if (this.pendingRequests.size > 0) {
      const pendingCommand = this.pendingRequests.keys().next().value as string;
      throw new Error(
        `Cannot send "${cmdName}" while "${pendingCommand}" is pending; serial responses have no request ID`
      );
    }

    const msg = JSON.stringify({ cmd: cmdName, ...payload }) + '\n';

    return new Promise<T>((resolve, reject) => {
      const request = { resolve, reject, timer: undefined as any };
      const failRequest = (error: any) => {
        if (this.pendingRequests.get(cmdName) !== request) return;
        clearTimeout(request.timer);
        this.pendingRequests.delete(cmdName);
        reject(error);
      };

      request.timer = setTimeout(() => {
        failRequest(new Error(`Timeout waiting for response to "${cmdName}" after ${this.options.timeoutMs}ms`));
      }, this.options.timeoutMs);
      this.pendingRequests.set(cmdName, request);

      try {
        if (typeof this.port.write === 'function') {
          this.port.write(msg, (err: any) => {
            if (err) failRequest(err);
          });
        } else if (this.port.writable) {
          const writer = this.port.writable.getWriter();
          writer.write(new TextEncoder().encode(msg)).then(
            () => writer.releaseLock(),
            (error: any) => {
              try {
                writer.releaseLock();
              } catch {}
              failRequest(error);
            }
          );
        } else {
          throw new Error('Serial port writable stream unavailable');
        }
      } catch (error) {
        failRequest(error);
      }
    });
  }

  private rejectPendingRequests(error: Error) {
    for (const request of this.pendingRequests.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    this.pendingRequests.clear();
  }

  public handleDisconnect(reason: string) {
    if (this.state === 'DISCONNECTED') return;
    this.setState('DISCONNECTED');
    this.port = null;
    this.buffer = '';
    this.rejectPendingRequests(new Error(`Connection lost: ${reason}`));
    this.scheduleReconnect();
  }

  public scheduleReconnect() {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      return;
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    const delay = this.options.reconnectIntervalMs * Math.pow(1.5, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, delay);
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.options.maxReconnectAttempts; // suppress auto-reconnect

    // Reject outstanding operations before closing: Web Serial and some stream
    // implementations do not emit a close event that SerialManager can observe.
    this.rejectPendingRequests(new Error('Connection closed by client'));
    this.buffer = '';
    const port = this.port;
    this.port = null;
    this.setState('DISCONNECTED');

    if (port && typeof port.close === 'function') {
      try {
        if (port.close.length === 0) {
          await port.close(); // Web Serial returns a promise
        } else {
          await new Promise<void>((resolve) => {
            port.close(() => resolve()); // node-serialport uses a callback
          });
        }
      } catch {}
    }
  }
}
