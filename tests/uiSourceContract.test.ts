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
  const loadingScript = fs.readFileSync(
    path.join(process.cwd(), 'src/loadingScreen.ts'),
    'utf-8'
  );
  const loadingStyles = fs.readFileSync(
    path.join(process.cwd(), 'src/loadingScreen.css'),
    'utf-8'
  );
  const appSource = fs.readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf-8');
  const entranceAnimations = fs.readFileSync(
    path.join(process.cwd(), 'src/entranceAnimations.ts'),
    'utf-8'
  );
  const macropadMovement = fs.readFileSync(
    path.join(process.cwd(), 'src/macropadMovement.ts'),
    'utf-8'
  );
  const embeddedEntranceRuntime = fs.readFileSync(
    path.join(process.cwd(), 'src/embeddedEntranceRuntime.js'),
    'utf-8'
  ).trim();
  const shippedInlineBundle = htmlContent.match(
    /<script type="module">([\s\S]*?)<\/script>/
  )?.[1] ?? '';

  it('prepares relative packaged assets and Windows Electron titlebar interaction', () => {
    expect(viteConfig).toContain("base: './'");
    expect(htmlContent).toContain("desktopApi?.isElectron");
    expect(htmlContent).toContain("desktopApi.platform === 'win32'");
    expect(htmlContent).toContain('padding-right: 146px');
    expect(htmlContent).toContain('-webkit-app-region: drag');
    expect(htmlContent).toContain('-webkit-app-region: no-drag');
    expect(htmlContent).toContain("document.documentElement.classList.add('grid-macro-ui')");
  });

  it('keeps the startup loader visible for at least four seconds before revealing the app', () => {
    expect(htmlContent).toContain('id="app-loading-screen"');
    expect(htmlContent).toContain('src="/src/loadingScreen.ts"');
    expect(htmlContent).toContain('/src/loadingScreen.css');
    expect(htmlContent).toContain('Loading your studio');
    expect(loadingScript).toContain('const minimumVisibleMs = 4000');
    expect(loadingScript).toContain('new MutationObserver');
    expect(loadingScript).toContain('appRoot.childElementCount > 0');
    expect(loadingScript).toContain('hidden || appRoot.childElementCount === 0');
    expect(loadingScript).toContain("appRoot.classList.add('is-ready')");
    expect(loadingStyles).toContain('#app-loading-screen.is-hidden');
    expect(loadingScript).toContain('window.dispatchEvent(new Event(APP_READY_EVENT))');
    expect(loadingStyles).toContain('#root.is-ready .app-shell::before');
    expect(loadingStyles).toContain('transition: opacity 450ms cubic-bezier(0.22, 1, 0.36, 1)');
    expect(loadingStyles).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('stagger-animates the initial home screen once and respects reduced motion', () => {
    expect(appSource).toContain('useReducedMotion()');
    expect(appSource).toContain('window.addEventListener(APP_READY_EVENT, beginEntrance)');
    expect(appSource).toContain('getEntranceMotionProps(entrancePhase');
    expect(appSource).toContain('fadeOnly: true');
    expect(appSource).toContain('delay: 0.35');
    expect(appSource).toContain('entranceIndex={index}');
    expect(appSource).toContain("setEntrancePhase('complete')");
    expect(entranceAnimations).toContain('[0.22, 1, 0.36, 1]');
    expect(entranceAnimations).toContain('0.58 + row * 0.11 + column * 0.035');
    expect(entranceAnimations).toContain('initialScale: 0.975');
    expect(shippedInlineBundle.endsWith(embeddedEntranceRuntime)).toBe(true);
    expect(embeddedEntranceRuntime).toContain('node:app-ready');
    expect(embeddedEntranceRuntime).toContain('prefers-reduced-motion: reduce');
    expect(embeddedEntranceRuntime).toContain('0.58 + row * 0.11 + column * 0.035');
  });

  it('keeps the entire Macropad movement unit inside the open canvas in source and shipped app', () => {
    expect(appSource).toContain('macropadMoveUnitRef');
    expect(appSource).toContain('clampMacropadOffsetToArea');
    expect(appSource).toContain('bottom: rect.bottom - 132');
    expect(appSource).toContain('isEncoderPopupOpen ? 300 : 132');
    expect(appSource).toContain('stiffness: 320, damping: 40');
    expect(appSource).toContain('setMacropadOffset(clampMacropadOffset(0, 0))');
    expect(appSource).toContain('new ResizeObserver(reclampMacropad)');
    expect(macropadMovement).toContain('area.left');
    expect(macropadMovement).toContain('area.right');
    expect(macropadMovement).toContain('area.top');
    expect(macropadMovement).toContain('area.bottom');
    expect(shippedInlineBundle).toContain('rect.left+8');
    expect(shippedInlineBundle).toContain('rect.bottom-132');
    expect(shippedInlineBundle).toContain('offsetWidth');
    expect(shippedInlineBundle).toContain('offsetHeight');
    expect(shippedInlineBundle).toContain('l===`dial-tl`?240:95');
    expect(shippedInlineBundle).toContain('It(Rn(0,0))');
    expect(shippedInlineBundle).toContain('mass:.5}:{type:`spring`,stiffness:320,damping:40}');
  });

  it('edits profile names inside their capsules and keeps the top field display-only', () => {
    expect(appSource).toContain('handleUpdateProfileName(idx, event.target.value)');
    expect(appSource).toContain("title={currentProfile.name || 'Untitled Profile'}");
    expect(appSource).toContain('aria-label={`Rename profile ${prof.name || idx + 1}`}');
    expect(shippedInlineBundle).toContain('rr=(e,t=a)=>');
    expect(shippedInlineBundle).toContain('Rename profile ${e.name||t+1}');
  });

  it('refreshes every preset app badge in source and shipped library views', () => {
    const presetIconIds = [
      'chatgpt', 'vscode', 'github', 'terminal', 'docker', 'chrome_devtools', 'photoshop',
      'illustrator', 'premiere', 'aftereffects', 'davinci', 'blender', 'figma', 'framer',
      'canva', 'audacity', 'affinity', 'excel', 'word', 'powerpoint', 'notion', 'slack',
      'zoom', 'obs', 'discord', 'spotify', 'windows',
    ];
    const sourcePresetIcons = appSource.slice(
      appSource.indexOf('const PRESET_APP_ICON_CONFIGS'),
      appSource.indexOf('function getPresetAppIconPath')
    );
    const shippedPresetIcons = shippedInlineBundle.slice(
      shippedInlineBundle.indexOf('function Bd({id:e})'),
      shippedInlineBundle.indexOf('function Vd({size:e=16')
    );

    expect(appSource).toContain('data-preset-icon={id}');
    expect(shippedInlineBundle).toContain('data-preset-icon');
    expect(sourcePresetIcons).not.toBe('');
    expect(shippedPresetIcons).not.toBe('');
    for (const id of presetIconIds) {
      expect(sourcePresetIcons).toContain(`${id}:`);
      expect(shippedPresetIcons).toContain(`${id}:{`);
    }
    expect(appSource).toContain('getPresetAppIconPath(config.iconId)');
    expect(shippedInlineBundle).toContain('window.__MACRO_ICONS__?.d?.[t.icon]');
  });

  it('keeps the Tip widget height fixed while its text rotates', () => {
    expect(appSource).toContain('group h-[54px] shrink-0');
    expect(appSource).not.toContain('group min-h-[54px]');
    expect(shippedInlineBundle).toContain('group h-[54px] shrink-0');
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

  it('routes both app implementations through real profile and device backup file helpers', () => {
    expect(appSource).toContain('profileFileTools.pickFile()');
    expect(appSource).toContain('profileFileTools.merge(');
    expect(appSource).toContain('profileFileTools.download(source, customItemsByTab)');
    expect(appSource).toContain('deviceKeymapFileTools.downloadLatestBackup()');
    expect(appSource).toContain('deviceKeymapFileTools.restoreFromFile(bridge');
    expect(appSource).toContain('deviceKeymapFileTools.savePreSyncSnapshot(current.snapshot');
    expect(appSource).not.toContain("name: 'Imported Profile'");
    expect(shippedInlineBundle).toContain('window.nodeStudioProfileFiles');
    expect(shippedInlineBundle).toContain('await e.pickFile()');
    expect(shippedInlineBundle).toContain('n.download(t,ae)');
    expect(shippedInlineBundle).toContain('window.nodeStudioDeviceKeymapFiles?.restoreFromFile');
    expect(shippedInlineBundle).toContain('window.nodeStudioDeviceKeymapFiles?.downloadLatestBackup');
    expect(shippedInlineBundle).toContain('savePreSyncSnapshot(e.snapshot');
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
