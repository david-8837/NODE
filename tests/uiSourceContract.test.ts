import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Embedded app regression checks', () => {
  const htmlContent = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
  const bridgeSource = fs.readFileSync(path.join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf-8');
  const backupSource = fs.readFileSync(path.join(process.cwd(), 'src/deviceKeymapFiles.ts'), 'utf-8');

  it('should contain the complete Macropad 3x3 direct matrix DOM structure', () => {
    // Verifies 9 key matrix elements and grid containers exist in the markup
    expect(htmlContent).toContain('r1c1');
    expect(htmlContent).toContain('r1c2');
    expect(htmlContent).toContain('r1c3');
    expect(htmlContent).toContain('r2c1');
    expect(htmlContent).toContain('r2c2');
    expect(htmlContent).toContain('r2c3');
    expect(htmlContent).toContain('r3c1');
    expect(htmlContent).toContain('r3c2');
    expect(htmlContent).toContain('r3c3');
  });

  it('should contain one Grid Macro 1 encoder and no second-knob layout', () => {
    expect(htmlContent).toContain('Grid Macro 1');
    expect(htmlContent).toContain('dial-tl');
    expect(htmlContent).toContain('encoderActions');
    expect(htmlContent).toContain('volume +');
    expect(htmlContent).toContain('volume -');
    expect(htmlContent).not.toContain('knob-tr');
    expect(htmlContent).not.toContain('Creator Micro 2');
  });

  it('should include the required Creator and Power-User presets in the embedded app', () => {
    // Verify preset identifiers
    const requiredPresets = [
      'obs',
      'discord',
      'vscode',
      'windows',
      'spotify',
      'framer',
      'figma',
      'photoshop',
      'premiere',
      'blender',
      'davinci',
    ];

    for (const preset of requiredPresets) {
      const regex = new RegExp(`id:\\s*[\`'"]${preset}[\`'"]`);
      expect(regex.test(htmlContent), `Expected preset "${preset}" to exist in index.html`).toBe(true);
    }
  });

  it('should include Simulation Mode toggle and real-time PC action bridge trigger', () => {
    expect(htmlContent).toContain('/api/execute-action');
    expect(htmlContent).toContain('Simulation');
  });

  it('loads the stock VIA bridge, profile-file helpers, and local backup controls', () => {
    expect(htmlContent).toContain('src="/src/qmkViaBridge.ts"');
    expect(htmlContent).toContain('src="/src/profileFiles.ts"');
    expect(htmlContent).toContain('src="/src/deviceKeymapFiles.ts"');
    expect(htmlContent).toContain('Connect Grid Macro 1 via QMK/VIA');
    expect(htmlContent).toContain('Profile saved locally; keymap synced to device');
    expect(htmlContent).toContain('sync warning');
    expect(htmlContent).toContain('Pre-sync device keymap backup');
    expect(htmlContent).toContain('get_config');
    expect(htmlContent).toContain('restoreFromFile');
    expect(bridgeSource).toContain("cmd === 'restore_config'");
    expect(backupSource).toContain('savePreSyncSnapshot');
    expect(htmlContent).not.toContain('children:`Device connected:`');
  });

  it('should load the full 8,703 vector icon library via static public script', () => {
    expect(htmlContent).toContain('src="/icons-data.js"');
    const iconDataPath = path.join(process.cwd(), 'public', 'icons-data.js');
    expect(fs.existsSync(iconDataPath)).toBe(true);
    expect(fs.statSync(iconDataPath).size).toBeGreaterThan(6 * 1024 * 1024); // >6MB
  });
});
