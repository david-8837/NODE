import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BackgroundAgent } = require('../electron/backgroundAgent.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AgentClient } = require('../electron/agentClient.cjs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { encodeHardwareReport, HardwareEventType } = require('../electron/hardwareProtocol.cjs');

describe('BackgroundAgent & AgentClient Full IPC Integration', () => {
  let agent: any = null;
  let client: any = null;
  let testDir: string | null = null;

  afterEach(() => {
    if (client) {
      client.close();
      client = null;
    }
    if (agent) {
      agent.close();
      agent = null;
    }
    if (testDir && existsSync(testDir)) {
      try { rmSync(testDir, { recursive: true, force: true }); } catch {}
      testDir = null;
    }
  });

  it('connects, exchanges status, and updates layer state', async () => {
    const pipeName = `\\\\.\\pipe\\test-agent-pipe-${Date.now()}`;
    testDir = mkdtempSync(join(tmpdir(), 'node-agent-ipc-'));
    agent = new BackgroundAgent({ pipeName, hidModule: null, profilesPath: join(testDir, 'profiles.json') });
    await agent.startServer();

    client = new AgentClient({ pipeName, autoReconnect: false });
    const connected = await client.connect();
    expect(connected).toBe(true);

    const status = await client.getStatus();
    expect(status).toMatchObject({
      hidConnected: false,
      activeLayer: 0,
      activeProfileId: 'prof-default',
    });

    const setLayerOk = await client.setLayer(3);
    expect(setLayerOk).toBe(true);

    const updatedStatus = await client.getStatus();
    expect(updatedStatus.activeLayer).toBe(3);
  });

  it('rejects stale generation in profile synchronization and accepts matching generation', async () => {
    const pipeName = `\\\\.\\pipe\\test-agent-pipe-sync-${Date.now()}`;
    testDir = mkdtempSync(join(tmpdir(), 'node-agent-ipc-'));
    agent = new BackgroundAgent({ pipeName, hidModule: null, profilesPath: join(testDir, 'profiles.json') });
    await agent.startServer();

    client = new AgentClient({ pipeName, autoReconnect: false });
    await client.connect();

    const status = await client.getStatus();
    const currentGen = status.generation; // e.g. "2"

    const emptyRes = await client.syncProfiles({ profiles: [] }, currentGen);
    expect(emptyRes.ok).toBe(false);
    expect(emptyRes.error).toContain('Profiles must contain');

    const invalidGenerationRes = await client.syncProfiles({
      activeProfileId: 'prof-default',
      profiles: [{ id: 'prof-default', layers: [{ slots: {} }] }],
    }, 'not-a-generation');
    expect(invalidGenerationRes.ok).toBe(false);
    expect(invalidGenerationRes.error).toBe('Invalid expected generation');

    // Attempt sync with mismatched expected generation
    const staleRes = await client.syncProfiles(
      { profiles: [{ id: 'prof-default', name: 'Stale Edit', layers: [] }] },
      '999999' // Mismatched generation!
    );
    expect(staleRes.ok).toBe(false);
    expect(staleRes.error).toBe('ERR_STALE_GENERATION');
    expect(staleRes.currentGeneration).toBe(currentGen);

    // Sync with correct expected generation
    const validRes = await client.syncProfiles(
      {
        activeProfileId: 'prof-default',
        profiles: [{ id: 'prof-default', name: 'Fresh Edit', layers: [{ layerIndex: 0, slots: {} }] }],
      },
      currentGen
    );
    expect(validRes.ok).toBe(true);
    expect(BigInt(validRes.generation)).toBeGreaterThan(BigInt(currentGen));
  });

  it('broadcasts hardware and gesture events to connected clients upon report injection', async () => {
    const pipeName = `\\\\.\\pipe\\test-agent-pipe-events-${Date.now()}`;
    testDir = mkdtempSync(join(tmpdir(), 'node-agent-ipc-'));
    agent = new BackgroundAgent({ pipeName, hidModule: null, profilesPath: join(testDir, 'profiles.json') });
    await agent.startServer();

    client = new AgentClient({ pipeName, autoReconnect: false });
    await client.connect();

    const hwEvents: any[] = [];
    const gestureEvents: any[] = [];

    client.on('hardware-event', (e: any) => hwEvents.push(e));
    client.on('gesture-event', (e: any) => gestureEvents.push(e));

    // Simulate key down event from hardware on r1c1 (slot 0)
    const downReport = encodeHardwareReport({
      type: HardwareEventType.BUTTON_DOWN,
      slotIndex: 0,
      sequence: 1,
      activeLayer: 0,
      matrixStateMask: 1,
    });
    agent.handleHidData(downReport);

    // Simulate key up event 40ms later (zero-latency single tap)
    const upReport = encodeHardwareReport({
      type: HardwareEventType.BUTTON_UP,
      slotIndex: 0,
      sequence: 2,
      activeLayer: 0,
      matrixStateMask: 0,
    });
    agent.handleHidData(upReport);

    // Allow IPC tick
    await new Promise((r) => setTimeout(r, 50));

    expect(hwEvents).toHaveLength(2);
    expect(hwEvents[0]).toMatchObject({ slotId: 'r1c1', isPressed: true });
    expect(hwEvents[1]).toMatchObject({ slotId: 'r1c1', isPressed: false });

    expect(gestureEvents).toHaveLength(1);
    expect(gestureEvents[0]).toMatchObject({
      slot: 'r1c1',
      gesture: 'onTap',
    });
  });
});
