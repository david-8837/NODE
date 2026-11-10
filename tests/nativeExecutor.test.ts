import { describe, expect, it } from 'vitest';
import { executeNativeAction } from '../native-executor';

describe('native terminal Smart Action preference', () => {
  it('rejects terminal commands unless the caller has explicitly enabled them', async () => {
    const deniedByDefault = await executeNativeAction({ type: 'Cmd', value: 'echo safe' });
    const deniedByPreference = await executeNativeAction(
      { type: 'Cmd', value: 'echo safe' },
      { allowTerminal: false }
    );

    expect(deniedByDefault).toMatchObject({
      success: false,
      error: expect.stringContaining('disabled in Settings'),
    });
    expect(deniedByPreference).toEqual(deniedByDefault);
  });

  it('leaves non-terminal actions unaffected by the terminal preference', async () => {
    const invalidShortcut = await executeNativeAction({ type: 'Shortcut', value: 'nope unknown' });
    expect(invalidShortcut.success).toBe(false);
    expect(invalidShortcut.error).toContain('Could not parse keys');
  });
});
