/**
 * Synthetic Node heap-delta smoke check. This is intentionally not presented as
 * Meta MemLab: it exercises allocation and listener cleanup in Node, not a browser.
 */

import { SerialManager } from '../src/serialManager';
import { validateProfile } from '../src/profileValidator';

export function runNodeHeapSmokeAudit() {
  console.log('--- Running synthetic Node heap-delta smoke check (not MemLab) ---');

  if (global.gc) global.gc();

  const initialHeapUsed = process.memoryUsage().heapUsed;
  console.log(`Initial Heap Used: ${(initialHeapUsed / 1024 / 1024).toFixed(2)} MB`);

  // Exercise repeated profile sanitization without retaining the results.
  for (let i = 0; i < 5000; i++) {
    const result = validateProfile({
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
    if (!result.valid) throw new Error(`Profile ${i} failed validation`);
  }

  // Check listener cleanup after repeated attach/detach cycles.
  const serial = new SerialManager();
  for (let i = 0; i < 1000; i++) {
    const listener = () => {};
    serial.on('stateChange', listener);
    serial.off('stateChange', listener);
  }

  if (global.gc) global.gc();

  const finalHeapUsed = process.memoryUsage().heapUsed;
  const heapDeltaMB = (finalHeapUsed - initialHeapUsed) / 1024 / 1024;
  console.log(`Final Heap Used:   ${(finalHeapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Delta:        ${heapDeltaMB.toFixed(2)} MB`);
  console.log(global.gc
    ? 'Forced GC was available; heap delta remains a coarse smoke metric.'
    : 'Forced GC unavailable; heap delta is a noisy smoke metric, not leak evidence.');

  const withinBudget = heapDeltaMB < 15;
  console.log(`Heap smoke status: ${withinBudget ? 'PASSED (under 15 MB)' : 'FAILED (over 15 MB)'}`);
  if (!withinBudget) process.exitCode = 1;
  return { withinBudget, heapDeltaMB };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('memlab_audit')) {
  runNodeHeapSmokeAudit();
}
