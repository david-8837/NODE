import { describe, expect, it, vi } from 'vitest';
import { createDesktopActionExecutor } from '../native-executor';

function createTestExecutor() {
  return createDesktopActionExecutor({
    platform: 'win32',
    inputAdapter: {
      sendOperations: vi.fn().mockResolvedValue({ success: true }),
      cancelAll: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue(undefined),
    },
  });
}

describe('shared native terminal Smart Action preference', () => {
  it('requires Simulation and rejects terminal commands unless Settings explicitly allows them', async () => {
    const executor = createTestExecutor();
    const blockedBySimulation = await executor.execute({ type: 'Cmd', value: 'echo safe' });
    expect(blockedBySimulation).toMatchObject({
      success: false,
      error: expect.stringContaining('Simulation is disabled'),
    });

    await executor.setSimulationEnabled(true);
    const deniedByDefault = await executor.execute({ type: 'Cmd', value: 'echo safe' });
    const deniedByPreference = await executor.execute(
      { type: 'Cmd', value: 'echo safe' },
      { allowTerminal: false }
    );

    expect(deniedByDefault).toMatchObject({
      success: false,
      error: expect.stringContaining('disabled in Settings'),
    });
    expect(deniedByPreference).toEqual(deniedByDefault);
    await executor.close();
  });

  it('validates shortcuts only after Simulation has been enabled', async () => {
    const executor = createTestExecutor();
    await executor.setSimulationEnabled(true);
    const invalidShortcut = await executor.execute({ type: 'Shortcut', value: 'nonsense word' });
    expect(invalidShortcut.success).toBe(false);
    expect(invalidShortcut.error).toContain('Unsupported key');
    await executor.close();
  });
});
