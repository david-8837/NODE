import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  getIconPickerBrowserSmokeScript,
  getIconPickerMemorySoakScript,
} = require('../electron/browserSmoke.cjs') as {
  getIconPickerBrowserSmokeScript: () => string;
  getIconPickerMemorySoakScript: () => string;
};

describe('packaged Chromium icon-picker smoke script', () => {
  it('builds a self-contained parseable browser script covering deferred loading and selection', () => {
    const script = getIconPickerBrowserSmokeScript();

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('icons-data\\.js');
    expect(script).toContain('IconPickerPopover-');
    expect(script).toContain('emojiCatalog-');
    expect(script).toContain('node:icon-picker-module-loaded');
    expect(script).toContain('node:emoji-catalog-module-loaded');
    expect(script).toContain('Lazy icon-picker or emoji module was evaluated at startup');
    expect(script).toContain('Browse all 8,507 icons');
    expect(script).toContain('brand airbnb');
    expect(script).toContain('Search emoji');
    expect(script).toContain('sushi');
  });

  it('builds a self-contained forced-GC picker and navigation memory soak', () => {
    const script = getIconPickerMemorySoakScript();

    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain('globalThis.gc');
    expect(script).toContain('performance.memory.usedJSHeapSize');
    expect(script).toContain('warmupIterations = 4');
    expect(script).toContain('iterations = 30');
    expect(script).toContain('measurementInterval = 5');
    expect(script).toContain('checkpoints.push');
    expect(script).toContain("clickNavigationTab('Settings')");
    expect(script).toContain("clickNavigationTab('Preset')");
    expect(script).toContain("clickNavigationTab('Keymap')");
  });
});
