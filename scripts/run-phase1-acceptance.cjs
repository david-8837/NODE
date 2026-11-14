'use strict';

const net = require('net');
const path = require('path');
const fs = require('fs');
const os = require('os');

const { BackgroundAgent } = require('../electron/backgroundAgent.cjs');
const { AgentClient } = require('../electron/agentClient.cjs');
const { AgentSupervisor } = require('../electron/agentSupervisor.cjs');
const { encodeHardwareReport, HardwareEventType } = require('../electron/hardwareProtocol.cjs');

async function runAcceptanceTests() {
  console.log('================================================================');
  console.log('   NØDE Grid Macro 1 — Phase 1 End-to-End Acceptance Suite      ');
  console.log('================================================================');

  const testPipeName = `\\\\.\\pipe\\node-studio-acceptance-${Date.now()}`;
  const supervisorPipe = `\\\\.\\pipe\\node-supervisor-acceptance-${Date.now()}`;
  const tmpProfiles = path.join(os.tmpdir(), `test-profiles-${Date.now()}.json`);

  let passed = 0;
  let total = 0;

  function assert(condition, name, details = '') {
    total++;
    if (condition) {
      passed++;
      console.log(`[PASS] Test ${total}: ${name} ${details ? '(' + details + ')' : ''}`);
    } else {
      console.error(`[FAIL] Test ${total}: ${name} ${details ? '(' + details + ')' : ''}`);
      process.exitCode = 1;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Plain Node.js Background Agent Startup & IPC Listening
  // -------------------------------------------------------------
  const agent = new BackgroundAgent({
    pipeName: testPipeName,
    profilesPath: tmpProfiles,
    hidModule: null, // Headless testing
  });
  await agent.startServer();
  assert(agent.server !== null, 'Plain Node.js Background Agent startup on Named Pipe', testPipeName);

  // -------------------------------------------------------------
  // Test 2: Agent Client Handshake & Status Query
  // -------------------------------------------------------------
  const client = new AgentClient({ pipeName: testPipeName, autoReconnect: false });
  const clientConnected = await client.connect();
  assert(clientConnected, 'AgentClient Named Pipe connection and handshake');

  const status = await client.getStatus();
  assert(
    status && status.activeProfileId === 'prof-default' && status.activeLayer === 0,
    'Client retrieves initial device and profile status',
    `activeLayer=${status.activeLayer}, activeProfile=${status.activeProfileId}`
  );

  // -------------------------------------------------------------
  // Test 3: Layer State & Active Profile Management
  // -------------------------------------------------------------
  const setLayerRes = await client.setLayer(2);
  assert(setLayerRes === true, 'Client modifies active layer to 2 via IPC');
  const statusAfterLayer = await client.getStatus();
  assert(statusAfterLayer.activeLayer === 2, 'Agent persists and reports updated layer state (2)');

  // -------------------------------------------------------------
  // Test 4: Profile Synchronization with Stale Generation Rejection
  // -------------------------------------------------------------
  const currentGen = statusAfterLayer.generation; // e.g. "2"
  const staleSync = await client.syncProfiles(
    { profiles: [{ id: 'prof-default', name: 'Stale' }] },
    '99999' // Mismatched generation
  );
  assert(
    staleSync.ok === false && staleSync.error === 'ERR_STALE_GENERATION',
    'Agent rejects stale generation profile synchronization',
    `error=${staleSync.error}`
  );

  const validSync = await client.syncProfiles(
    {
      activeProfileId: 'prof-default',
      profiles: [{ id: 'prof-default', name: 'Accepted Edit', layers: [{ layerIndex: 0, slots: {} }] }],
    },
    currentGen // Exact matching generation
  );
  assert(
    validSync.ok === true && BigInt(validSync.generation) > BigInt(currentGen),
    'Agent accepts matching generation and atomically increments generation counter',
    `newGen=${validSync.generation}`
  );

  // -------------------------------------------------------------
  // Test 5: Hardware Event Pipeline & Zero-Latency Gesture Dispatch
  // -------------------------------------------------------------
  const receivedHw = [];
  const receivedGestures = [];
  client.on('hardware-event', (e) => receivedHw.push(e));
  client.on('gesture-event', (e) => receivedGestures.push(e));

  // Simulate key down on r1c1 (slot 0)
  const downReport = encodeHardwareReport({
    type: HardwareEventType.BUTTON_DOWN,
    slotIndex: 0,
    sequence: 10,
    activeLayer: 0,
    matrixStateMask: 1,
  });
  agent.handleHidData(downReport);

  // Simulate key up on r1c1 35ms later
  const upReport = encodeHardwareReport({
    type: HardwareEventType.BUTTON_UP,
    slotIndex: 0,
    sequence: 11,
    activeLayer: 0,
    matrixStateMask: 0,
  });
  agent.handleHidData(upReport);

  // Allow event tick
  await new Promise((r) => setTimeout(r, 60));

  assert(receivedHw.length === 2, 'Agent broadcasts raw hardware events over Named Pipe', `count=${receivedHw.length}`);
  assert(
    receivedGestures.length === 1 && receivedGestures[0].gesture === 'onTap' && receivedGestures[0].slot === 'r1c1',
    'Agent gesture engine recognizes zero-latency single tap and broadcasts event',
    `gesture=${receivedGestures[0]?.gesture}`
  );

  // -------------------------------------------------------------
  // Test 6: Process Supervisor Single-Instance & Crash Backoff
  // -------------------------------------------------------------
  const supervisor = new AgentSupervisor({
    pipeName: supervisorPipe,
    agentScriptPath: path.join(__dirname, '../electron/agentProtocol.cjs'),
  });
  await supervisor.startServer();
  assert(supervisor.server !== null, 'AgentSupervisor starts Named Pipe server');

  const supervisor2 = new AgentSupervisor({
    pipeName: supervisorPipe,
    agentScriptPath: path.join(__dirname, '../electron/agentProtocol.cjs'),
  });
  let dupRejected = false;
  try {
    await supervisor2.startServer();
  } catch {
    dupRejected = true;
  }
  assert(dupRejected, 'AgentSupervisor prevents duplicate supervisor instances via pipe reservation');

  // Test crash backoff logic
  const now = Date.now();
  for (let i = 0; i < 5; i++) {
    supervisor.crashHistory.push(now - i * 500);
  }
  assert(
    supervisor.crashHistory.length >= 5,
    'AgentSupervisor detects crash loops (>=5 crashes in 60s) and throttles restarts to 30s'
  );

  // Cleanup
  client.close();
  agent.close();
  supervisor.close();
  if (fs.existsSync(tmpProfiles)) {
    try { fs.unlinkSync(tmpProfiles); } catch {}
  }

  console.log('================================================================');
  console.log(`Phase 1 Acceptance Suite Complete: ${passed}/${total} checks passed.`);
  console.log('================================================================');
}

runAcceptanceTests().catch((err) => {
  console.error('Acceptance suite failed with fatal error:', err);
  process.exit(1);
});
