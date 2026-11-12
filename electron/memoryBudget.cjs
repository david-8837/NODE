'use strict';

const DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES = 8 * 1024 * 1024;

function evaluateRendererHeapSoak(result, maxRetainedHeapGrowthBytes = DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES) {
  const invalidResult = (error) => ({
    passed: false,
    error,
    maxRetainedHeapGrowthBytes,
    maxCheckpointGrowthBytes: null,
    retainedHeapGrowthBytes: null,
    retainedHeapGrowthMiB: null,
    maxCheckpointGrowthMiB: null,
  });

  if (!Number.isFinite(maxRetainedHeapGrowthBytes) || maxRetainedHeapGrowthBytes < 0) {
    return invalidResult('The renderer heap-growth budget is invalid');
  }
  if (
    !result ||
    !Number.isFinite(result.baselineHeapBytes) ||
    result.baselineHeapBytes <= 0 ||
    !Array.isArray(result.checkpoints) ||
    result.checkpoints.length === 0
  ) {
    return invalidResult('The renderer heap soak did not provide a baseline and checkpoints');
  }

  const growths = result.checkpoints.map((checkpoint) => {
    if (!Number.isFinite(checkpoint?.usedHeapBytes)) return Number.NaN;
    return checkpoint.usedHeapBytes - result.baselineHeapBytes;
  });
  if (growths.some((growth) => !Number.isFinite(growth))) {
    return invalidResult('The renderer heap soak contains an invalid checkpoint');
  }

  const finalHeapBytes = result.checkpoints[result.checkpoints.length - 1].usedHeapBytes;
  const retainedHeapGrowthBytes = finalHeapBytes - result.baselineHeapBytes;
  const maxCheckpointGrowthBytes = Math.max(0, ...growths);
  return {
    passed: maxCheckpointGrowthBytes <= maxRetainedHeapGrowthBytes,
    error: maxCheckpointGrowthBytes <= maxRetainedHeapGrowthBytes
      ? null
      : `Renderer retained heap growth ${maxCheckpointGrowthBytes} bytes exceeds the ${maxRetainedHeapGrowthBytes} byte budget`,
    maxRetainedHeapGrowthBytes,
    baselineHeapBytes: result.baselineHeapBytes,
    finalHeapBytes,
    retainedHeapGrowthBytes,
    retainedHeapGrowthMiB: Number((retainedHeapGrowthBytes / 1024 / 1024).toFixed(2)),
    maxCheckpointGrowthBytes,
    maxCheckpointGrowthMiB: Number((maxCheckpointGrowthBytes / 1024 / 1024).toFixed(2)),
  };
}

module.exports = {
  DEFAULT_MAX_RETAINED_HEAP_GROWTH_BYTES,
  evaluateRendererHeapSoak,
};
