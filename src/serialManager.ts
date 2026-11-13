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
  private discardingOversizedLine = false;
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
  private detachPortListeners: (() => void) | null = null;
  private trackPortWrite: (() => () => void) | null = null;
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
      if (typeof this.port.on !== 'function' && typeof this.port.open === 'function' && !this.port.readable) {
        await this.port.open({ baudRate: this.options.baudRate });
      }

      // Handle Node.js stream / SerialPort object
      if (typeof this.port.on === 'function') {
        const port = this.port;
        const decoder = new TextDecoder();
        const onData = (chunk: Buffer | string) => {
          if (this.port !== port) return;
          this.handleIncomingChunk(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
        };
        const onClose = () => {
          if (this.port === port) this.handleDisconnect('Port closed by hardware');
        };
        const onError = (err: Error) => {
          if (this.port !== port) return;
          this.listeners.error.forEach(fn => fn(err));
          this.handleDisconnect(err.message);
        };
        port.on('data', onData);
        port.on('close', onClose);
        port.on('error', onError);
        let inFlightWrites = 0;
        let detached = false;
        const remove = port.off ?? port.removeListener;
        const removeErrorWhenSafe = () => {
          if (detached && inFlightWrites === 0 && typeof remove === 'function') {
            // Node streams may emit the write error on a later tick after its callback.
            setTimeout(() => remove.call(port, 'error', onError), 0);
          }
        };
        this.trackPortWrite = () => {
          inFlightWrites++;
          let finished = false;
          return () => {
            if (finished) return;
            finished = true;
            inFlightWrites--;
            removeErrorWhenSafe();
          };
        };
        this.detachPortListeners = () => {
          detached = true;
          this.trackPortWrite = null;
          if (typeof remove === 'function') {
            remove.call(port, 'data', onData);
            remove.call(port, 'close', onClose);
          }
          removeErrorWhenSafe();
        };
      }

      this.setState('CONNECTED');
      this.reconnectAttempts = 0;
      if (typeof this.port.on !== 'function' && this.port.readable) {
        void this.startWebSerialReader(this.port);
      }
      return true;
    } catch (err: any) {
      this.setState('DISCONNECTED');
      this.listeners.error.forEach(fn => fn(err));
      this.scheduleReconnect();
      return false;
    }
  }

  private async startWebSerialReader(port: any) {
    const decoder = new TextDecoder();
    try {
      while (this.port === port && port.readable && this.state === 'CONNECTED') {
        const reader = port.readable.getReader();
        this.reader = reader;
        try {
          while (this.port === port && this.state === 'CONNECTED') {
            const { value, done } = await reader.read();
            if (done) {
              // An ended stream is a disconnect, not a reason to spin on it.
              if (this.port === port) this.handleDisconnect('Readable stream closed');
              return;
            }
            if (value) this.handleIncomingChunk(decoder.decode(value, { stream: true }));
          }
        } finally {
          reader.releaseLock();
          if (this.reader === reader) this.reader = null;
        }
      }
    } catch (e: any) {
      if (this.port === port) this.handleDisconnect(e.message);
    }
  }

  /** Process complete lines before limiting the unfinished line, even in large bursts. */
  public handleIncomingChunk(chunk: string) {
    const limit = 64 * 1024;
    let offset = 0;
    while (offset < chunk.length) {
      const newline = chunk.indexOf('\n', offset);
      const end = newline === -1 ? chunk.length : newline;
      const part = chunk.slice(offset, end);
      if (!this.discardingOversizedLine) {
        if (this.buffer.length + part.length > limit) {
          this.buffer = '';
          this.discardingOversizedLine = true;
        } else {
          this.buffer += part;
        }
      }
      if (newline === -1) break;
      if (!this.discardingOversizedLine) {
        const line = this.buffer.trim();
        if (line) this.parseIncomingLine(line);
      }
      this.buffer = '';
      this.discardingOversizedLine = false;
      offset = newline + 1;
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
          const finishWrite = this.trackPortWrite?.();
          try {
            this.port.write(msg, (err: any) => {
              finishWrite?.();
              if (err) failRequest(err);
            });
          } catch (error) {
            finishWrite?.();
            throw error;
          }
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
    this.detachPortListeners?.();
    this.detachPortListeners = null;
    this.port = null;
    this.buffer = '';
    this.discardingOversizedLine = false;
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
    this.discardingOversizedLine = false;
    const port = this.port;
    this.detachPortListeners?.();
    this.detachPortListeners = null;
    this.port = null;
    this.setState('DISCONNECTED');

    if (this.reader) {
      try { await this.reader.cancel(); } catch {}
    }
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
