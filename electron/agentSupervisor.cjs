'use strict';

const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const SUPERVISOR_PIPE_NAME = '\\\\.\\pipe\\node-studio-supervisor-ipc';
const APPDATA_DIR = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'NODE')
  : path.join(os.homedir(), '.node-studio');
const LOGS_DIR = path.join(APPDATA_DIR, 'logs');
const SUPERVISOR_LOG = path.join(LOGS_DIR, 'supervisor.log');

function logMessage(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(SUPERVISOR_LOG, line, 'utf8');
  } catch {}
  console.log(msg);
}

class AgentSupervisor {
  constructor(options = {}) {
    this.pipeName = options.pipeName || SUPERVISOR_PIPE_NAME;
    this.agentScriptPath = options.agentScriptPath || path.join(__dirname, 'backgroundAgent.cjs');
    this.childProcess = null;
    this.server = null;
    this.isClosed = false;

    this.crashHistory = [];
    this.currentBackoffMs = 1000;
    this.uptimeTimer = null;
    this.restartTimeout = null;
  }

  checkSession() {
    const sessionName = process.env.SESSIONNAME || '';
    if (sessionName.toLowerCase() === 'services') {
      logMessage('ERROR: Cannot run Background Agent in Session 0 (Services). Interactive desktop is required.');
      return false;
    }
    return true;
  }

  startServer() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        socket.on('data', (d) => {
          const str = d.toString().trim();
          if (str === 'PING') socket.write('PONG\n');
        });
      });

      this.server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logMessage('Another supervisor instance is already running.');
        }
        reject(err);
      });

      this.server.listen(this.pipeName, () => {
        resolve();
      });
    });
  }

  start() {
    if (!this.checkSession()) {
      process.exit(1);
    }

    this.startServer()
      .then(() => {
        logMessage(`Supervisor started on ${this.pipeName}`);
        this.spawnAgent();
      })
      .catch((err) => {
        if (err.code === 'EADDRINUSE') {
          process.exit(0); // Gracefully exit duplicate supervisor
        }
        logMessage(`Supervisor failed to start: ${err.message}`);
        process.exit(1);
      });
  }

  spawnAgent() {
    if (this.isClosed) return;

    logMessage(`Launching Background Agent: ${this.agentScriptPath}`);
    const child = spawn(process.execPath, [this.agentScriptPath], {
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
      env: { ...process.env, NODE_AGENT_MANAGED: '1' },
    });

    this.childProcess = child;
    const startTime = Date.now();

    // Reset backoff delay if agent runs stably for >= 5 minutes
    if (this.uptimeTimer) clearTimeout(this.uptimeTimer);
    this.uptimeTimer = setTimeout(() => {
      if (this.childProcess === child && !this.isClosed) {
        logMessage('Agent stable for 5 minutes. Resetting backoff.');
        this.currentBackoffMs = 1000;
      }
    }, 5 * 60 * 1000);

    child.on('exit', (code, signal) => {
      this.childProcess = null;
      if (this.uptimeTimer) {
        clearTimeout(this.uptimeTimer);
        this.uptimeTimer = null;
      }

      if (this.isClosed) return;

      const duration = Date.now() - startTime;
      logMessage(`Agent exited with code ${code}, signal ${signal} (ran for ${duration}ms)`);

      const now = Date.now();
      this.crashHistory.push(now);
      this.crashHistory = this.crashHistory.filter((t) => now - t <= 60000);

      let delay = this.currentBackoffMs;

      // Crash-loop throttling: >= 5 crashes in 60 seconds
      if (this.crashHistory.length >= 5) {
        delay = 30000;
        logMessage(`[CRASH LOOP DETECTED] ${this.crashHistory.length} exits in 60s. Throttling restart for 30s.`);
      } else {
        this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, 30000);
      }

      logMessage(`Scheduling agent restart in ${delay}ms...`);
      this.restartTimeout = setTimeout(() => {
        this.spawnAgent();
      }, delay);
    });
  }

  close() {
    this.isClosed = true;
    if (this.uptimeTimer) clearTimeout(this.uptimeTimer);
    if (this.restartTimeout) clearTimeout(this.restartTimeout);

    if (this.childProcess) {
      logMessage('Terminating child agent process...');
      try {
        this.childProcess.kill('SIGTERM');
      } catch {}
      this.childProcess = null;
    }

    if (this.server) {
      try {
        this.server.close();
      } catch {}
      this.server = null;
    }
  }
}

if (require.main === module) {
  const supervisor = new AgentSupervisor();
  supervisor.start();

  const shutdown = () => {
    logMessage('Shutting down supervisor...');
    supervisor.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = {
  AgentSupervisor,
  SUPERVISOR_PIPE_NAME,
};
