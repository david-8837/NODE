import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { SELECTABLE_EMOJI_LIST } from '../src/emojiCatalog';

describe('emoji picker catalog', () => {
  it('preserves all 405 emoji choices from the previously shipped app', () => {
    expect(SELECTABLE_EMOJI_LIST).toHaveLength(405);
    // All labels, keywords, and their order must match the uncompressed catalog.
    expect(createHash('sha256').update(JSON.stringify(SELECTABLE_EMOJI_LIST)).digest('hex')).toBe('e76aac4b3923e6d0aef53bbc38f19f4ceda206752e99880693168f811121d2de');
    expect(SELECTABLE_EMOJI_LIST.some(({ emoji }) => emoji === '🧠')).toBe(true);
    expect(SELECTABLE_EMOJI_LIST.some(({ emoji }) => emoji === '🍰')).toBe(true);
  });
});
