'use strict';

const net = require('net');
const EventEmitter = require('events');
const {
  NODE_STUDIO_PIPE_NAME,
  AgentMessageType,
  serializeMessage,
  JsonLineDecoder,
} = require('./agentProtocol.cjs');

class AgentClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.pipeName = options.pipeName || NODE_STUDIO_PIPE_NAME;
    this.reconnectIntervalMs = options.reconnectIntervalMs || 2000;
    this.socket = null;
    this.connected = false;
    this.pendingRequests = new Map();
    this.nextRequestId = 1;
    this.reconnectTimer = null;
    this.autoReconnect = options.autoReconnect ?? true;
    this.isClosed = false;
  }

  connect() {
    if (this.socket || this.isClosed) return Promise.resolve(this.connected);

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (ok) => {
        if (!resolved) {
          resolved = true;
          resolve(ok);
        }
      };

      try {
        const socket = net.createConnection(this.pipeName, async () => {
          this.socket = socket;
          this.connected = true;
          try {
            // Handshake ping to ensure bi-directional channel is established
            await this.sendRequest(AgentMessageType.PING, {}, 1000);
            this.emit('connected');
            finish(true);
          } catch {
            this.emit('connected');
            finish(true);
          }
        });

        const decoder = new JsonLineDecoder((msg) => this.handleMessage(msg));
        socket.on('data', (chunk) => decoder.feed(chunk));

        socket.on('close', () => {
          this.handleDisconnect();
          finish(false);
        });

        socket.on('error', (err) => {
          this.handleDisconnect();
          finish(false);
        });
      } catch (err) {
        this.handleDisconnect();
        finish(false);
      }
    });
  }

  handleDisconnect() {
    const wasConnected = this.connected;
    this.connected = false;
    this.socket = null;

    for (const [id, req] of this.pendingRequests) {
      clearTimeout(req.timer);
      req.reject(new Error('Agent disconnected'));
    }
    this.pendingRequests.clear();

    if (wasConnected) {
      this.emit('disconnected');
    }

    if (this.autoReconnect && !this.isClosed && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, this.reconnectIntervalMs);
    }
  }

  handleMessage(msg) {
    if (!msg) return;

    // Check if it's a response to a pending request
    if (msg.id && this.pendingRequests.has(msg.id)) {
      const req = this.pendingRequests.get(msg.id);
      this.pendingRequests.delete(msg.id);
      clearTimeout(req.timer);
      req.resolve(msg);
      return;
    }

    // Otherwise it's a broadcast event from the agent
    switch (msg.type) {
      case AgentMessageType.HARDWARE_EVENT:
        this.emit('hardware-event', msg.event);
        break;
      case AgentMessageType.GESTURE_EVENT:
        this.emit('gesture-event', { slot: msg.slot, gesture: msg.gesture, timestamp: msg.timestamp });
        break;
      case AgentMessageType.DEVICE_STATE_CHANGE:
        this.emit('device-change', { connected: msg.connected, deviceName: msg.deviceName });
        break;
      case AgentMessageType.PROFILE_STATE_CHANGE:
        this.emit('profile-change', { activeProfileId: msg.activeProfileId, generation: msg.generation });
        break;
    }
  }

  sendRequest(type, payload = {}, timeoutMs = 3000) {
    if (!this.connected || !this.socket) {
      return Promise.reject(new Error('Not connected to Background Agent'));
    }

    const id = String(this.nextRequestId++);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Agent request ${type} timed out`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timer });

      try {
        this.socket.write(serializeMessage({ id, type, payload }));
      } catch (err) {
        this.pendingRequests.delete(id);
        clearTimeout(timer);
        reject(err);
      }
    });
  }

  async getStatus() {
    const res = await this.sendRequest(AgentMessageType.GET_STATUS);
    return res.status;
  }

  async setLayer(activeLayer) {
    const res = await this.sendRequest(AgentMessageType.SET_LAYER, { activeLayer });
    return res.ok;
  }

  async setProfile(activeProfileId) {
    const res = await this.sendRequest(AgentMessageType.SET_PROFILE, { activeProfileId });
    return res.ok;
  }

  async syncProfiles(profilesData, expectedGeneration) {
    const res = await this.sendRequest(AgentMessageType.SYNC_PROFILES, { profilesData, expectedGeneration });
    return res;
  }

  async sendViaReport(reportBytes) {
    const res = await this.sendRequest(AgentMessageType.VIA_COMMAND, { report: Array.from(reportBytes) }, 2000);
    if (!res.ok) throw new Error(res.error || 'VIA command failed');
    return new Uint8Array(res.report);
  }

  close() {
    this.isClosed = true;
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.destroy();
      } catch {}
      this.socket = null;
    }
    this.connected = false;
  }
}

module.exports = {
  AgentClient,
};
