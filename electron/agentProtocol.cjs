'use strict';

const NODE_STUDIO_PIPE_NAME = '\\\\.\\pipe\\node-studio-ipc';

const AgentMessageType = Object.freeze({
  PING: 'PING',
  PONG: 'PONG',
  GET_STATUS: 'GET_STATUS',
  STATUS_RESPONSE: 'STATUS_RESPONSE',
  SET_LAYER: 'SET_LAYER',
  SET_LAYER_RESPONSE: 'SET_LAYER_RESPONSE',
  SET_PROFILE: 'SET_PROFILE',
  SET_PROFILE_RESPONSE: 'SET_PROFILE_RESPONSE',
  SYNC_PROFILES: 'SYNC_PROFILES',
  SYNC_PROFILES_RESPONSE: 'SYNC_PROFILES_RESPONSE',
  VIA_COMMAND: 'VIA_COMMAND',
  VIA_RESPONSE: 'VIA_RESPONSE',
  // Broadcasts
  HARDWARE_EVENT: 'HARDWARE_EVENT',
  GESTURE_EVENT: 'GESTURE_EVENT',
  DEVICE_STATE_CHANGE: 'DEVICE_STATE_CHANGE',
  PROFILE_STATE_CHANGE: 'PROFILE_STATE_CHANGE',
});

function serializeMessage(msg) {
  return JSON.stringify(msg) + '\n';
}

class JsonLineDecoder {
  constructor(onMessage) {
    this.buffer = '';
    this.onMessage = onMessage;
  }

  feed(chunk) {
    this.buffer += chunk.toString('utf8');
    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex).trim();
      this.buffer = this.buffer.slice(newlineIndex + 1);
      if (line.length > 0) {
        try {
          const parsed = JSON.parse(line);
          this.onMessage(parsed);
        } catch {
          // Ignore malformed JSON line
        }
      }
    }
  }
}

module.exports = {
  NODE_STUDIO_PIPE_NAME,
  AgentMessageType,
  serializeMessage,
  JsonLineDecoder,
};
