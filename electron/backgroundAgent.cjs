'use strict';

const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
let HID;
try {
  HID = require('node-hid');
} catch (e) {
  console.warn('node-hid optional load failed:', e.message);
}

const {
  NODE_STUDIO_PIPE_NAME,
  AgentMessageType,
  serializeMessage,
  JsonLineDecoder,
} = require('./agentProtocol.cjs');
const {
  decodeHardwareReport,
  isHardwareEventReport,
  isSequentialReport,
  RAW_HID_REPORT_SIZE,
} = require('./hardwareProtocol.cjs');
const { AgentGestureEngine } = require('./agentGestureEngine.cjs');
const { createDesktopActionExecutor } = require('./desktopExecution.cjs');

const VIA_USB_VENDOR_ID = 0xfeed;
const VIA_USB_PRODUCT_ID = 0x6001;
const VIA_RAW_USAGE_PAGE = 0xff60;
const VIA_RAW_USAGE_ID = 0x61;

const APPDATA_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'NODE')
  : path.join(os.homedir(), '.node-studio');

const PROFILES_PATH = path.join(APPDATA_DIR, 'profiles.json');
const LOGS_DIR = path.join(APPDATA_DIR, 'logs');
const BACKUPS_DIR = path.join(APPDATA_DIR, 'backups');

function ensureDirectories() {
  for (const dir of [APPDATA_DIR, LOGS_DIR, BACKUPS_DIR]) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (e) {
        console.error('Failed to create directory:', dir, e);
      }
    }
  }
}

class BackgroundAgent {
  constructor(options = {}) {
    this.pipeName = options.pipeName || NODE_STUDIO_PIPE_NAME;
    this.hidModule = options.hidModule || HID;
    this.profilesPath = options.profilesPath || PROFILES_PATH;
    this.allowTerminal = options.allowTerminal ?? true;

    this.server = null;
    this.clients = new Set();
    this.hidDevice = null;
    this.deviceInfo = null;
    this.discoveryTimer = null;
    this.isClosed = false;

    this.activeProfileId = 'prof-default';
    this.activeLayer = 0;
    this.currentGeneration = 1n;
    this.profilesData = null;

    this.lastHardwareSequence = null;
    this.pendingViaRequests = [];

    // Initialize gesture engine
    this.gestureEngine = new AgentGestureEngine({
      onGesture: (event) => this.handleRecognizedGesture(event),
      onDial: (event) => this.handleRecognizedDial(event),
    });

    // Initialize desktop executor
    this.executor = createDesktopActionExecutor({
      platform: process.platform,
      openExternal: null, // Will use native rundll32 fallback on Windows
      openApplicationShortcut: async (shortcutPath) => {
        const { execFile } = require('child_process');
        return new Promise((resolve) => {
          execFile('explorer.exe', [shortcutPath], (err) => {
            if (err) resolve({ success: false, error: String(err) });
            else resolve({ success: true, message: `Started ${path.basename(shortcutPath)}` });
          });
        });
      },
    });
    this.executor.setSimulationEnabled(true);

    this.loadProfiles();
  }

  loadProfiles() {
    ensureDirectories();
    if (fs.existsSync(this.profilesPath)) {
      try {
        const raw = fs.readFileSync(this.profilesPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.profilesData = parsed;
        this.activeProfileId = parsed.activeProfileId || parsed.profiles?.[0]?.id || 'prof-default';
        if (parsed.generation) {
          try {
            this.currentGeneration = BigInt(parsed.generation);
          } catch {
            this.currentGeneration = 1n;
          }
        }
        this.updateGestureConfigsFromActiveProfile();
        return;
      } catch (err) {
        console.error('Failed to parse profiles.json:', err);
      }
    }

    // Default minimal profile
    this.profilesData = {
      format: 'node-studio-profile',
      version: 2,
      generation: '1',
      activeProfileId: 'prof-default',
      profiles: [
        {
          id: 'prof-default',
          name: 'Default Profile',
          tappingTermMs: 180,
          holdThresholdMs: 300,
          layers: [{ layerIndex: 0, slots: {} }],
        },
      ],
    };
    this.saveProfilesAtomic();
  }

  saveProfilesAtomic() {
    ensureDirectories();
    this.currentGeneration += 1n;
    this.profilesData.generation = this.currentGeneration.toString();
    this.profilesData.activeProfileId = this.activeProfileId;

    const tmpPath = `${this.profilesPath}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(this.profilesData, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.profilesPath);
    } catch (err) {
      console.error('Failed to write profiles.json:', err);
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
    }
  }

  getActiveProfile() {
    if (!this.profilesData?.profiles) return null;
    return (
      this.profilesData.profiles.find((p) => p.id === this.activeProfileId) ||
      this.profilesData.profiles[0] ||
      null
    );
  }

  getActiveLayerData() {
    const profile = this.getActiveProfile();
    if (!profile?.layers) return null;
    return profile.layers.find((l) => l.layerIndex === this.activeLayer) || profile.layers[0] || null;
  }

  updateGestureConfigsFromActiveProfile() {
    const profile = this.getActiveProfile();
    if (!profile) return;
    const tappingTermMs = profile.tappingTermMs || 180;
    const holdThresholdMs = profile.holdThresholdMs || 300;

    const layerData = this.getActiveLayerData();
    const slots = layerData?.slots || {};

    this.gestureEngine.configureAllSlots((slot) => {
      const slotEntry = slots[slot];
      if (!slotEntry || !slotEntry.execution) {
        return { tappingTermMs, holdThresholdMs };
      }
      if (slotEntry.execution.kind === 'multi') {
        const gestures = slotEntry.execution.gestures || {};
        return {
          tappingTermMs,
          holdThresholdMs,
          hasDoubleTap: Boolean(gestures.doubleTap && gestures.doubleTap.trim()),
          hasTapHold: Boolean(gestures.tapHold && gestures.tapHold.trim()),
          hasHold: Boolean(gestures.onHold && gestures.onHold.trim()),
        };
      }
      return { tappingTermMs, holdThresholdMs };
    });
  }

  startServer() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        this.clients.add(socket);

        const decoder = new JsonLineDecoder((msg) => this.handleClientMessage(socket, msg));
        socket.on('data', (chunk) => decoder.feed(chunk));

        socket.on('close', () => this.clients.delete(socket));
        socket.on('error', () => this.clients.delete(socket));
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn('Named Pipe is already in use by another agent instance.');
        }
        reject(err);
      });

      this.server.listen(this.pipeName, () => {
        resolve();
      });
    });
  }

  broadcast(msg) {
    const payload = serializeMessage(msg);
    for (const socket of this.clients) {
      try {
        socket.write(payload);
      } catch {
        this.clients.delete(socket);
      }
    }
  }

  handleClientMessage(socket, msg) {
    if (!msg || !msg.type) return;
    const id = msg.id;

    switch (msg.type) {
      case AgentMessageType.PING: {
        socket.write(serializeMessage({ id, type: AgentMessageType.PONG }));
        break;
      }

      case AgentMessageType.GET_STATUS: {
        socket.write(
          serializeMessage({
            id,
            type: AgentMessageType.STATUS_RESPONSE,
            status: {
              hidConnected: Boolean(this.hidDevice),
              deviceName: this.deviceInfo?.product || 'NØDE Grid Macro 1',
              activeProfileId: this.activeProfileId,
              activeLayer: this.activeLayer,
              generation: this.currentGeneration.toString(),
            },
          })
        );
        break;
      }

      case AgentMessageType.SET_LAYER: {
        const layer = Number(msg.payload?.activeLayer) || 0;
        this.activeLayer = Math.max(0, Math.min(layer, 7));
        this.updateGestureConfigsFromActiveProfile();
        socket.write(serializeMessage({ id, type: AgentMessageType.SET_LAYER_RESPONSE, ok: true, activeLayer: this.activeLayer }));
        break;
      }

      case AgentMessageType.SET_PROFILE: {
        const targetId = String(msg.payload?.activeProfileId || '');
        if (this.profilesData?.profiles?.some((p) => p.id === targetId)) {
          this.activeProfileId = targetId;
          this.updateGestureConfigsFromActiveProfile();
          this.saveProfilesAtomic();
          socket.write(serializeMessage({ id, type: AgentMessageType.SET_PROFILE_RESPONSE, ok: true, activeProfileId: this.activeProfileId }));
          this.broadcast({ type: AgentMessageType.PROFILE_STATE_CHANGE, activeProfileId: this.activeProfileId, generation: this.currentGeneration.toString() });
        } else {
          socket.write(serializeMessage({ id, type: AgentMessageType.SET_PROFILE_RESPONSE, ok: false, error: 'Profile not found' }));
        }
        break;
      }

      case AgentMessageType.SYNC_PROFILES: {
        const incoming = msg.payload?.profilesData;
        const expectedGen = msg.payload?.expectedGeneration ? BigInt(msg.payload.expectedGeneration) : null;

        if (expectedGen !== null && expectedGen !== this.currentGeneration) {
          socket.write(
            serializeMessage({
              id,
              type: AgentMessageType.SYNC_PROFILES_RESPONSE,
              ok: false,
              error: 'ERR_STALE_GENERATION',
              currentGeneration: this.currentGeneration.toString(),
            })
          );
          return;
        }

        if (incoming && Array.isArray(incoming.profiles)) {
          this.profilesData = incoming;
          if (incoming.activeProfileId) this.activeProfileId = incoming.activeProfileId;
          this.saveProfilesAtomic();
          this.updateGestureConfigsFromActiveProfile();

          socket.write(
            serializeMessage({
              id,
              type: AgentMessageType.SYNC_PROFILES_RESPONSE,
              ok: true,
              generation: this.currentGeneration.toString(),
            })
          );
          this.broadcast({ type: AgentMessageType.PROFILE_STATE_CHANGE, activeProfileId: this.activeProfileId, generation: this.currentGeneration.toString() });
        } else {
          socket.write(serializeMessage({ id, type: AgentMessageType.SYNC_PROFILES_RESPONSE, ok: false, error: 'Invalid profiles format' }));
        }
        break;
      }

      case AgentMessageType.VIA_COMMAND: {
        const report = msg.payload?.report;
        if (!this.hidDevice) {
          socket.write(serializeMessage({ id, type: AgentMessageType.VIA_RESPONSE, ok: false, error: 'Device not connected' }));
          return;
        }
        if (!Array.isArray(report) || report.length < RAW_HID_REPORT_SIZE) {
          socket.write(serializeMessage({ id, type: AgentMessageType.VIA_RESPONSE, ok: false, error: 'Invalid 32-byte report' }));
          return;
        }

        this.sendViaReport(report)
          .then((responseReport) => {
            socket.write(serializeMessage({ id, type: AgentMessageType.VIA_RESPONSE, ok: true, report: Array.from(responseReport) }));
          })
          .catch((err) => {
            socket.write(serializeMessage({ id, type: AgentMessageType.VIA_RESPONSE, ok: false, error: String(err.message || err) }));
          });
        break;
      }
    }
  }

  sendViaReport(reportBytes) {
    return new Promise((resolve, reject) => {
      if (!this.hidDevice) {
        reject(new Error('Device not connected'));
        return;
      }

      const timer = setTimeout(() => {
        const idx = this.pendingViaRequests.findIndex((req) => req.resolve === resolve);
        if (idx !== -1) {
          this.pendingViaRequests.splice(idx, 1);
          reject(new Error('VIA command timed out'));
        }
      }, 1000);

      this.pendingViaRequests.push({ resolve, reject, timer });

      try {
        // Windows node-hid write prepends 0x00 for report ID if required by HID descriptor
        const buffer = Buffer.from(reportBytes.slice(0, RAW_HID_REPORT_SIZE));
        this.hidDevice.write(Array.from(buffer));
      } catch (err) {
        clearTimeout(timer);
        const idx = this.pendingViaRequests.findIndex((req) => req.resolve === resolve);
        if (idx !== -1) this.pendingViaRequests.splice(idx, 1);
        reject(err);
      }
    });
  }

  startDeviceDiscovery() {
    this.pollDevice();
    this.discoveryTimer = setInterval(() => {
      if (!this.hidDevice && !this.isClosed) {
        this.pollDevice();
      }
    }, 1500);
  }

  pollDevice() {
    if (!this.hidModule || this.hidDevice || this.isClosed) return;

    try {
      const devices = this.hidModule.devices();
      const match = devices.find((d) => {
        return (
          d.vendorId === VIA_USB_VENDOR_ID &&
          d.productId === VIA_USB_PRODUCT_ID &&
          (d.usagePage === VIA_RAW_USAGE_PAGE || d.usagePage === undefined)
        );
      });

      if (match && match.path) {
        this.openDevice(match);
      }
    } catch (err) {
      console.error('Error querying HID devices:', err);
    }
  }

  openDevice(deviceDesc) {
    try {
      this.hidDevice = new this.hidModule.HID(deviceDesc.path);
      this.deviceInfo = deviceDesc;

      this.hidDevice.on('data', (data) => this.handleHidData(data));
      this.hidDevice.on('error', (err) => {
        console.warn('HID Device error:', err);
        this.closeDevice();
      });

      this.broadcast({
        type: AgentMessageType.DEVICE_STATE_CHANGE,
        connected: true,
        deviceName: deviceDesc.product || 'NØDE Grid Macro 1',
      });
    } catch (err) {
      console.warn('Could not open HID device:', err);
      this.closeDevice();
    }
  }

  closeDevice() {
    if (this.hidDevice) {
      try {
        this.hidDevice.close();
      } catch {}
      this.hidDevice = null;
      this.deviceInfo = null;

      // Reject pending VIA requests
      for (const req of this.pendingViaRequests) {
        clearTimeout(req.timer);
        req.reject(new Error('Device disconnected'));
      }
      this.pendingViaRequests = [];

      this.broadcast({
        type: AgentMessageType.DEVICE_STATE_CHANGE,
        connected: false,
      });
    }
  }

  handleHidData(data) {
    if (!data || data.length < RAW_HID_REPORT_SIZE) return;
    const bytes = new Uint8Array(data);

    // If it's a response to a pending VIA request (e.g. not custom hardware event 0xEE)
    if (!isHardwareEventReport(bytes)) {
      if (this.pendingViaRequests.length > 0) {
        const req = this.pendingViaRequests.shift();
        clearTimeout(req.timer);
        req.resolve(bytes);
        return;
      }
    }

    // Process custom hardware event
    const event = decodeHardwareReport(bytes);
    if (!event) return;

    if (!isSequentialReport(event.sequence, this.lastHardwareSequence)) {
      // Stale or duplicate report
      return;
    }
    this.lastHardwareSequence = event.sequence;

    // Track active layer from device report if present
    if (typeof event.activeLayer === 'number' && event.activeLayer !== this.activeLayer) {
      this.activeLayer = event.activeLayer;
      this.updateGestureConfigsFromActiveProfile();
    }

    // Broadcast event to connected Studio clients for visualization
    this.broadcast({
      type: AgentMessageType.HARDWARE_EVENT,
      event,
    });

    // Pass to gesture engine
    if (event.slotId) {
      if (event.isDialRotation && event.dialDirection) {
        this.gestureEngine.dialRotate(event.dialDirection, 'hardware');
      } else if (event.isPressed) {
        this.gestureEngine.buttonDown(event.slotId, 'hardware');
      } else {
        this.gestureEngine.buttonUp(event.slotId);
      }
    }
  }

  handleRecognizedGesture(event) {
    // Broadcast gesture recognition
    this.broadcast({
      type: AgentMessageType.GESTURE_EVENT,
      slot: event.slot,
      gesture: event.gesture,
      timestamp: event.timestamp,
    });

    const layerData = this.getActiveLayerData();
    if (!layerData?.slots) return;
    const entry = layerData.slots[event.slot];
    if (!entry) return;

    this.dispatchActionForEntry(entry, event.gesture);
  }

  handleRecognizedDial(event) {
    const layerData = this.getActiveLayerData();
    if (!layerData?.dial) return;
    const dialEntry = layerData.dial[event.direction];
    if (!dialEntry) return;

    this.dispatchActionForEntry(dialEntry, 'onTap');
  }

  dispatchActionForEntry(entry, gesture) {
    if (!entry) return;
    const execution = entry.execution;

    if (execution) {
      if (execution.kind === 'multi') {
        const targetShortcut = execution.gestures?.[gesture]?.trim();
        if (targetShortcut) {
          void this.executor.execute(
            { execution: { kind: 'shortcut', value: targetShortcut } },
            { allowTerminal: this.allowTerminal, authorizedHardwareSource: true }
          );
        }
        return;
      }

      if (gesture === 'onTap') {
        void this.executor.execute(
          { execution },
          { allowTerminal: this.allowTerminal, authorizedHardwareSource: true }
        );
      }
      return;
    }

    // Fallback: binding string
    if (gesture === 'onTap' && entry.binding && entry.binding !== 'blank') {
      void this.executor.execute(
        { type: entry.actionType || 'Shortcut', value: entry.binding },
        { allowTerminal: this.allowTerminal, authorizedHardwareSource: true }
      );
    }
  }

  close() {
    this.isClosed = true;
    if (this.discoveryTimer) clearInterval(this.discoveryTimer);
    this.closeDevice();

    if (this.executor) {
      try {
        this.executor.close();
      } catch {}
    }

    for (const socket of this.clients) {
      try {
        socket.destroy();
      } catch {}
    }
    this.clients.clear();

    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
  }
}

// Standalone execution entrypoint
if (require.main === module) {
  const agent = new BackgroundAgent();
  agent
    .startServer()
    .then(() => {
      console.log(`NØDE Grid Macro 1 Background Agent listening on ${agent.pipeName}`);
      agent.startDeviceDiscovery();
    })
    .catch((err) => {
      console.error('Failed to start Background Agent:', err.message);
      process.exit(1);
    });

  const cleanup = () => {
    console.log('Shutting down Background Agent...');
    agent.close();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

module.exports = {
  BackgroundAgent,
  PROFILES_PATH,
  APPDATA_DIR,
};
