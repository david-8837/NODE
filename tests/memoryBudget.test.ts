import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES,
  evaluateRendererHeapSoak,
} = require('../electron/memoryBudget.cjs') as {
  DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES: number;
  evaluateRendererHeapSoak: (
    result: {
      baselineHeapBytes: number;
      checkpoints: Array<{ completedIterations: number; usedHeapBytes: number }>;
    },
    maxRetainedHeapGrowthBytes?: number
  ) => {
    passed: boolean;
    error: string | null;
    baselineHeapBytes?: number;
    finalHeapBytes?: number;
    retainedHeapGrowthBytes: number | null;
    maxCheckpointGrowthBytes: number | null;
    maxRetainedHeapGrowthBytes: number;
  };
};

describe('renderer memory-soak budget evaluation', () => {
  it('passes a stable forced-GC heap series under the configured retention budget', () => {
    expect(DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES).toBe(8 * 1024 * 1024);
    const result = evaluateRendererHeapSoak({
      baselineHeapBytes: 1000,
      checkpoints: [
        { completedIterations: 5, usedHeapBytes: 1250 },
        { completedIterations: 10, usedHeapBytes: 1150 },
      ],
    }, 512);

    expect(result.passed).toBe(true);
    expect(result.error).toBeNull();
    expect(result.retainedHeapGrowthBytes).toBe(150);
    expect(result.maxCheckpointGrowthBytes).toBe(250);
  });

  it('fails on a retained-growth spike even if the final sample later recovers', () => {
    const result = evaluateRendererHeapSoak({
      baselineHeapBytes: 1000,
      checkpoints: [
        { completedIterations: 5, usedHeapBytes: 1800 },
        { completedIterations: 10, usedHeapBytes: 1200 },
      ],
    }, 512);

    expect(result.passed).toBe(false);
    expect(result.error).toContain('exceeds');
    expect(result.retainedHeapGrowthBytes).toBe(200);
    expect(result.maxCheckpointGrowthBytes).toBe(800);
  });

  it('fails closed for missing, invalid, or empty measurements', () => {
    const empty = evaluateRendererHeapSoak({ baselineHeapBytes: 1000, checkpoints: [] });
    const invalid = evaluateRendererHeapSoak({
      baselineHeapBytes: 1000,
      checkpoints: [{ completedIterations: 5, usedHeapBytes: Number.NaN }],
    });
    const invalidBudget = evaluateRendererHeapSoak({
      baselineHeapBytes: 1000,
      checkpoints: [{ completedIterations: 5, usedHeapBytes: 1000 }],
    }, -1);

    expect(empty.passed).toBe(false);
    expect(invalid.error).toContain('invalid checkpoint');
    expect(invalidBudget.error).toContain('budget is invalid');
  });
});
