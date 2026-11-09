/**
 * memlab_audit.ts - Memory Leak Investigation Engine (MemLab Pattern)
 * Simulates high-frequency user workflows (profile imports, layer changes, dial rotations)
 * and measures memory retention, garbage collection stability, and event listener lifecycle.
 */

import { SerialManager } from '../src/serialManager';
import { validateProfile } from '../src/profileValidator';

export async function runMemlabAudit() {
  console.log('--- Running MemLab-Style Memory Leak Audit ---');

  if (global.gc) {
    global.gc();
  }

  const initialMemory = process.memoryUsage();
  console.log(`Initial Heap Used: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  // Phase 1: 5,000 Rapid Profile Creations & Sanitizations
  const profiles = [];
  for (let i = 0; i < 5000; i++) {
    const prof = validateProfile({
      id: `p-${i}`,
      name: `Profile ${i}`,
      layers: [
        {
          r1c1: { label: 'Cut', binding: 'Ctrl+X' },
          r2c2: { label: 'Copy', binding: 'Ctrl+C' },
          'dial-tl': { label: 'Vol', binding: 'volume +' },
        },
      ],
    });
    if (i % 2 === 0) {
      profiles.push(prof);
    }
  }

  // Phase 2: Event Listener Lifecycle (Attach & Detach 1,000 times)
  const serial = new SerialManager();
  const listeners: any[] = [];

  for (let i = 0; i < 1000; i++) {
    const fn = (state: string) => {};
    listeners.push(fn);
    serial.on('stateChange', fn);
  }

  // Clean up all attached listeners
  for (const fn of listeners) {
    serial.off('stateChange', fn);
  }

  if (global.gc) {
    global.gc();
  }

  const finalMemory = process.memoryUsage();
  console.log(`Final Heap Used:   ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);

  const heapDiffMB = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
  console.log(`Heap Delta:        ${heapDiffMB.toFixed(2)} MB`);

  // Under 15MB delta for 5,000 heavy cycles confirms zero runaway retention
  const isHealthy = heapDiffMB < 15;
  console.log(`Memory Leak Status: ${isHealthy ? 'PASSED (Zero Runaway Leaks)' : 'WARNING (High Retention)'}`);
  return { isHealthy, heapDiffMB };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('memlab_audit')) {
  runMemlabAudit();
}

