import { describe, expect, it } from 'vitest';
import { SELECTABLE_EMOJI_LIST } from '../src/emojiCatalog';

describe('emoji picker catalog', () => {
  it('preserves all 405 emoji choices from the previously shipped app', () => {
    expect(SELECTABLE_EMOJI_LIST).toHaveLength(405);
    expect(SELECTABLE_EMOJI_LIST.some(({ emoji }) => emoji === '🧠')).toBe(true);
    expect(SELECTABLE_EMOJI_LIST.some(({ emoji }) => emoji === '🍰')).toBe(true);
  });
});
