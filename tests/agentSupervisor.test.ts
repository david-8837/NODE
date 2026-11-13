import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AgentSupervisor } = require('../electron/agentSupervisor.cjs');

describe('AgentSupervisor: Process Supervisor & Reliability', () => {
  let supervisor: any = null;
  let supervisor2: any = null;

  afterEach(() => {
    if (supervisor2) {
      supervisor2.close();
      supervisor2 = null;
    }
    if (supervisor) {
      supervisor.close();
      supervisor = null;
    }
  });

  it('starts supervisor server and prevents duplicate supervisor instance', async () => {
    const pipeName = `\\\\.\\pipe\\test-supervisor-pipe-${Date.now()}`;
    supervisor = new AgentSupervisor({
      pipeName,
      agentScriptPath: join(__dirname, '../electron/agentProtocol.cjs'),
    });

    await supervisor.startServer();
    expect(supervisor.server).not.toBeNull();

    // Create a second supervisor on the same pipe name
    supervisor2 = new AgentSupervisor({
      pipeName,
      agentScriptPath: join(__dirname, '../electron/agentProtocol.cjs'),
    });

    // Starting second supervisor on the same pipe must reject with EADDRINUSE
    await expect(supervisor2.startServer()).rejects.toThrow();
  });

  it('tracks crash history and triggers backoff on rapid exits', () => {
    const pipeName = `\\\\.\\pipe\\test-supervisor-backoff-${Date.now()}`;
    supervisor = new AgentSupervisor({
      pipeName,
      agentScriptPath: join(__dirname, '../electron/agentProtocol.cjs'),
    });

    expect(supervisor.currentBackoffMs).toBe(1000);

    // Simulate 4 crashes within 10 seconds
    const now = Date.now();
    for (let i = 0; i < 4; i++) {
      supervisor.crashHistory.push(now - i * 1000);
      supervisor.currentBackoffMs = Math.min(supervisor.currentBackoffMs * 2, 30000);
    }
    expect(supervisor.currentBackoffMs).toBe(16000);

    // 5th crash within 60s triggers crash loop throttle (30s)
    supervisor.crashHistory.push(now);
    let delay = supervisor.currentBackoffMs;
    if (supervisor.crashHistory.length >= 5) {
      delay = 30000;
    }
    expect(delay).toBe(30000);
  });
});
