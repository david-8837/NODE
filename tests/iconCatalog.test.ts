import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildIconCatalog,
  CURATED_ICON_LIST,
  findIconMetadata,
  searchIconCatalog,
  type IconLibrary,
} from '../src/iconCatalog';

function loadBundledIconLibrary(): IconLibrary {
  const source = readFileSync('public/icons-data.js', 'utf8');
  const json = source.slice(source.indexOf('=') + 1).trim().replace(/;$/, '');
  return JSON.parse(json) as IconLibrary;
}

describe('icon picker catalog', () => {
  it('includes the bundled icon library, deduplicates metadata and preserves curated icons', () => {
    const library = loadBundledIconLibrary();
    const catalog = buildIconCatalog(library);
    const fullResults = searchIconCatalog(catalog, '', 72, true);
    const curatedResults = searchIconCatalog(catalog, '');

    expect(Object.keys(library.d ?? {})).toHaveLength(8_475);
    expect(catalog).toHaveLength(8_502);
    expect(new Set(catalog.map(({ id }) => id)).size).toBe(catalog.length);
    expect(catalog.slice(0, CURATED_ICON_LIST.length).map(({ id }) => id)).toEqual(
      CURATED_ICON_LIST.map(({ id }) => id)
    );
    expect(fullResults.total).toBe(catalog.length);
    expect(fullResults.icons).toHaveLength(72);
    expect(curatedResults.total).toBe(CURATED_ICON_LIST.length);
    expect(curatedResults.icons.map(({ id }) => id)).toEqual(
      CURATED_ICON_LIST.map(({ id }) => id)
    );
  });

  it('searches metadata by multiple words and returns ranked, capped results', () => {
    const catalog = buildIconCatalog(loadBundledIconLibrary());
    const pagedResults = searchIconCatalog(catalog, 'brand', 5);
    const nextPage = searchIconCatalog(catalog, 'brand', 5, false, 5);
    const exactResults = searchIconCatalog(catalog, 'brand airbnb', 5);

    expect(pagedResults.total).toBeGreaterThan(10);
    expect(pagedResults.icons).toHaveLength(5);
    expect(nextPage.icons).toHaveLength(5);
    expect(nextPage.icons.map(({ id }) => id)).not.toEqual(
      pagedResults.icons.map(({ id }) => id)
    );
    expect(pagedResults.icons[0]?.id.startsWith('brand-')).toBe(true);
    expect(exactResults.total).toBe(1);
    expect(exactResults.icons[0]?.id).toBe('brand-airbnb');
    expect(searchIconCatalog(catalog, 'not-a-real-icon').total).toBe(0);
  });

  it('ignores catalog metadata with no vector path and prefers filled duplicate styles', () => {
    const library: IconLibrary = {
      d: { 'brand-sample': 'M0 0h24', sample: 'M0 0h24' },
      l: {
        first: { id: 'brand-sample', k: 'sample outline', t: 'o' },
        second: { id: 'brand-sample', k: 'sample filled', t: 'f' },
        third: { id: 'sample', k: 'useful sample', t: 'o' },
        missing: { id: 'orphan', k: 'no metadata path' },
      },
    };
    const catalog = buildIconCatalog(library);

    expect(catalog.some(({ id }) => id === 'orphan')).toBe(false);
    expect(catalog.find(({ id }) => id === 'brand-sample')?.keywords).toContain(
      'sample filled'
    );
    expect(findIconMetadata(library, 'brand-sample')?.t).toBe('f');
  });
});
