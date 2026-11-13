/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { IconLibrary } from '../src/iconCatalog';
import { hasSavedIconOutsideStartupCatalog } from '../src/iconLibrary';
import { iconBootstrapData, presetBrandIconData } from './presetBrandIconData';

beforeEach(() => {
  const startupLibrary: IconLibrary = {
    d: { ...iconBootstrapData.d, ...presetBrandIconData.d },
    l: [...iconBootstrapData.l, ...presetBrandIconData.l],
  };
  Object.defineProperty(window, '__MACRO_ICONS__', {
    configurable: true,
    value: startupLibrary,
  });
});

afterEach(() => {
  delete window.__MACRO_ICONS__;
});

describe('startup icon library', () => {
  it('does not require the full catalog for preset, curated, or empty saved profiles', () => {
    const savedProfile = JSON.stringify({
      profiles: [{ layers: [{ r1c1: { iconId: 'terminal' }, r1c2: { iconId: 'brand-canva' } }] }],
      customItems: { Action: [{ iconId: 'copy-plus' }] },
    });

    expect(hasSavedIconOutsideStartupCatalog(null)).toBe(false);
    expect(hasSavedIconOutsideStartupCatalog('not valid JSON')).toBe(false);
    expect(hasSavedIconOutsideStartupCatalog('{}')).toBe(false);
    expect(hasSavedIconOutsideStartupCatalog(savedProfile)).toBe(false);
  });

  it('preloads the full catalog when a saved custom icon is absent from startup paths', () => {
    const savedProfile = JSON.stringify({
      profiles: [{ layers: [{ r2c3: { iconId: 'brand-airbnb' } }] }],
    });

    expect(hasSavedIconOutsideStartupCatalog(savedProfile)).toBe(true);
  });
});
