import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Embedded app regression checks', () => {
  const htmlContent = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
  const bridgeSource = fs.readFileSync(path.join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf-8');
  const backupSource = fs.readFileSync(path.join(process.cwd(), 'src/deviceKeymapFiles.ts'), 'utf-8');
  const viteConfig = fs.readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf-8');
  const electronMain = fs.readFileSync(path.join(process.cwd(), 'electron/main.cjs'), 'utf-8');
  const windowsWorkflow = fs.readFileSync(
    path.join(process.cwd(), '.github/workflows/windows-installer.yml'),
    'utf-8'
  );
  const packageConfig = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')
  );

  it('prepares relative packaged assets and Windows Electron titlebar interaction', () => {
    expect(viteConfig).toContain("base: './'");
    expect(htmlContent).toContain("desktopApi?.isElectron");
    expect(htmlContent).toContain("desktopApi.platform === 'win32'");
    expect(htmlContent).toContain('padding-right: 146px');
    expect(htmlContent).toContain('-webkit-app-region: drag');
    expect(htmlContent).toContain('-webkit-app-region: no-drag');
    expect(htmlContent).toContain("document.documentElement.classList.add('grid-macro-ui')");
  });

  it('adapts the desktop geometry only at constrained window sizes', () => {
    expect(htmlContent).toContain('@media (max-width: 1180px)');
    expect(htmlContent).toContain('@media (max-height: 760px)');
    expect(htmlContent).toContain('min-height: 360px');
    expect(htmlContent).toContain('position: relative');
    expect(electronMain).toContain('Math.min(1280');
    expect(electronMain).toContain('Math.min(840');
    expect(electronMain).toContain('minWidth: Math.min(900, width)');
    expect(electronMain).toContain('minHeight: Math.min(600, height)');
  });

  it('checks and captures the responsive UI from an installed Windows package', () => {
    expect(electronMain).toContain("hasSwitch('visual-smoke-test')");
    expect(electronMain).toContain("capturePage()");
    expect(electronMain).toContain('renderedUi.keyCount !== 9');
    expect(windowsWorkflow).toContain('Install packaged app and capture responsive UI');
    expect(windowsWorkflow).toContain('--visual-smoke-test');
    expect(windowsWorkflow).toContain('packaged-ui-visual-smoke.png');
  });

  it('defines the Windows NSIS installer and ZIP package without discarding app data', () => {
    expect(packageConfig.main).toBe('electron/main.cjs');
    expect(packageConfig.scripts['desktop:dev']).toContain('electron .');
    expect(packageConfig.scripts['build:win']).toContain('electron-builder --win');
    expect(packageConfig.build.appId).toBe('com.node.gridmacro1');
    expect(packageConfig.build.directories.output).toBe('dist_electron');
    expect(packageConfig.build.files).toContain('electron/**/*');
    expect(packageConfig.build.files).toContain('dist/**/*');
    expect(packageConfig.build.win.icon).toBe('public/favicon.ico');
    expect(packageConfig.build.win.target.map(({ target }: { target: string }) => target)).toEqual([
      'nsis',
      'zip',
    ]);
    expect(packageConfig.build.nsis.oneClick).toBe(false);
    expect(packageConfig.build.nsis.deleteAppDataOnUninstall).toBe(false);
  });

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
