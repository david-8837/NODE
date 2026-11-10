import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PRESET_CATALOG } from '../src/presetCatalog';

describe('Production React source and legacy inline regression checks', () => {
  const htmlContent = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
  const legacyInlineBundle = fs.readFileSync(
    path.join(process.cwd(), 'tests/fixtures/legacyEmbeddedApp.js'),
    'utf-8'
  );
  const mainSource = fs.readFileSync(path.join(process.cwd(), 'src/main.tsx'), 'utf-8');
  const bridgeSource = fs.readFileSync(path.join(process.cwd(), 'src/qmkViaBridge.ts'), 'utf-8');
  const deviceLayoutSource = fs.readFileSync(path.join(process.cwd(), 'src/deviceLayout.ts'), 'utf-8');
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
  const nativeExecutorSource = fs.readFileSync(path.join(process.cwd(), 'native-executor.ts'), 'utf-8');
  const desktopExecutorSource = fs.readFileSync(path.join(process.cwd(), 'electron/desktopExecution.cjs'), 'utf-8');
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
  const shippedInlineBundle = legacyInlineBundle;

  it('prepares relative packaged assets and Windows Electron titlebar interaction', () => {
    expect(viteConfig).toContain("base: './'");
    expect(htmlContent).toContain("desktopApi?.isElectron");
    expect(htmlContent).toContain("desktopApi.platform === 'win32'");
    expect(htmlContent).toContain('margin-right: 128px');
    expect(htmlContent).not.toContain('padding-right: 146px');
    expect(htmlContent).toContain('-webkit-app-region: drag');
    expect(htmlContent).toContain('-webkit-app-region: no-drag');
    expect(htmlContent).toContain("document.documentElement.classList.add('grid-macro-ui')");
  });

  it('uses the React source app as the production entry and splits dependencies into a vendor chunk', () => {
    expect(htmlContent).toContain('src="/src/main.tsx"');
    expect(htmlContent).not.toContain('<script type="module">');
    expect(mainSource).toContain("import './qmkViaBridge'");
    expect(mainSource).toContain("import App from './App.tsx'");
    expect(viteConfig).toContain('codeSplitting:');
    expect(viteConfig).toContain("name: 'vendor'");
    expect(viteConfig).toContain('test: /node_modules/');
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
    expect(loadingStyles).toContain('background: #fff;');
    expect(loadingStyles).toContain('color: #222;');
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

  it('keeps the entire Macropad movement unit inside the open canvas in source and legacy app', () => {
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

  it('refreshes every preset app badge in source and legacy library views', () => {
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

  it('centers the top navigation independently of the side controls and Windows caption buttons', () => {
    expect(appSource).toContain('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(appSource).toContain('justify-self-center flex items-center gap-[28px]');
    expect(appSource).toContain('justify-self-end transition-colors cursor-pointer');
    expect(htmlContent).toContain('margin-right: 128px');
    expect(htmlContent).not.toContain('padding-right: 146px');
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

  it('matches packaged Windows renderer URLs using case-insensitive file paths', () => {
    expect(electronMain).toContain("if (url.protocol !== 'file:') return false");
    expect(electronMain).toContain("process.platform === 'win32'");
    expect(electronMain).toContain('requestedPath.toLowerCase() === expectedPath.toLowerCase()');
    expect(electronMain).toContain('frame?.parent === null');
  });

  it('smoke-tests the installed Windows UI, persists native/profile state, and verifies uninstall data retention', () => {
    expect(electronMain).toContain("hasSwitch('visual-smoke-test')");
    expect(electronMain).toContain("once('did-finish-load', startVisualSmokeCapture)");
    expect(electronMain).toContain("capturePage()");
    expect(electronMain).toContain('renderedUi.keyCount !== 9');
    expect(electronMain).toContain("hasSwitch('persistence-smoke-test')");
    expect(electronMain).toContain("app.setPath('appData', process.env.APPDATA)");
    expect(electronMain).toContain("app.setPath('userData', path.join(process.env.APPDATA, userDataDirectoryName))");
    expect(electronMain).toContain('settingsFilePath: getAppSettingsPath()');
    expect(electronMain).toContain("setAppSetting('allowTerminalSmartActions', true)");
    expect(electronMain).toContain('structuredExecutionRestored: true');
    expect(windowsWorkflow).toContain('Install packaged app and capture responsive UI');
    expect(windowsWorkflow).toContain('NODE_GRID_VISUAL_SMOKE_DIAGNOSTICS');
    expect(windowsWorkflow).toContain('Verify installed-app Settings/profile persistence and uninstall behavior');
    expect(windowsWorkflow).toContain('NODE_GRID_PERSISTENCE_PHASE');
    expect(windowsWorkflow).toContain('Uninstall*.exe');
    expect(windowsWorkflow).toContain('deleteAppDataOnUninstall=false');
    expect(windowsWorkflow).toContain('Report Windows app smoke failure details');
    expect(windowsWorkflow).toContain('--visual-smoke-test');
    expect(windowsWorkflow).toContain('--persistence-smoke-test');
    expect(windowsWorkflow).toContain('packaged-ui-visual-smoke.png');
    expect(windowsWorkflow).toContain('src/**');
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
    expect(packageConfig.build.nsis.installerHeader).toBe('windows-installer/installerHeader.bmp');
    expect(packageConfig.build.nsis.installerSidebar).toBe('windows-installer/installerSidebar.bmp');
    expect(packageConfig.build.nsis.uninstallerSidebar).toBe('windows-installer/installerSidebar.bmp');

    for (const [assetPath, width, height] of [
      [packageConfig.build.nsis.installerHeader, 150, 57],
      [packageConfig.build.nsis.installerSidebar, 164, 314],
    ] as const) {
      const bitmap = fs.readFileSync(path.join(process.cwd(), assetPath));
      expect(bitmap.subarray(0, 2).toString()).toBe('BM');
      expect(bitmap.readInt32LE(18)).toBe(width);
      expect(bitmap.readInt32LE(22)).toBe(height);
      expect(bitmap.readUInt16LE(28)).toBe(24);
    }

    const installerSidebarSource = fs.readFileSync(
      path.join(process.cwd(), 'windows-installer/installer-sidebar.svg'),
      'utf8'
    );
    expect(installerSidebarSource).toContain('NØDE');
    expect(installerSidebarSource).toContain('NINE KEYS.');
  });

  it('renders the complete Macropad 3x3 direct matrix in the production React app', () => {
    for (const slot of ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3']) {
      expect(deviceLayoutSource).toContain(`'${slot}'`);
    }
    expect(appSource).toContain('data-drop-slot={slotId}');
    expect(appSource).toContain('GRID_MACRO_KEY_SLOTS.map');
  });

  it('renders one Grid Macro 1 encoder and no second-knob layout in the production React app', () => {
    expect(deviceLayoutSource).toContain("GRID_MACRO_ENCODER_SLOT = 'dial-tl'");
    expect(appSource).toContain('layer[GRID_MACRO_ENCODER_SLOT]');
    expect(appSource).toContain('encoderActions');
    expect(appSource).toContain('volume +');
    expect(appSource).toContain('volume -');
    expect(appSource).not.toContain('knob-tr');
    expect(appSource).not.toContain('Creator Micro 2');
  });

  it('includes the required Creator and Power-User presets in the production React app', () => {
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
      expect(
        PRESET_CATALOG.some((entry) => entry.id === preset),
        `Expected preset "${preset}" to exist in the React preset catalog`
      ).toBe(true);
    }
  });

  it('keeps Simulation gated across the renderer, Electron IPC, and local development executor', () => {
    expect(appSource).toContain('requestSimulationMode(enabled, window)');
    expect(appSource).toContain('Simulation on');
    expect(nativeExecutorSource).toContain('createDesktopActionExecutor');
    expect(desktopExecutorSource).toContain('Simulation is disabled; no desktop action was executed');
    expect(desktopExecutorSource).toContain('options.allowTerminal !== true');
    expect(electronMain).toContain("'set-simulation-enabled'");
    expect(electronMain).toContain('readStoredAppSettings().allowTerminalSmartActions === true');
    expect(viteConfig).toContain('/api/simulation');
    expect(viteConfig).toContain('/api/execute-action');
  });

  it('routes the React app and legacy inline reference through profile and automatic device-backup helpers', () => {
    expect(appSource).toContain('profileFileTools.pickFile()');
    expect(appSource).toContain('profileFileTools.merge(');
    expect(appSource).toContain('profileFileTools.download(source, customItemsByTab)');
    expect(appSource).toContain('deviceKeymapFileTools.savePreSyncSnapshot(current.snapshot');
    expect(appSource).not.toContain('deviceKeymapFileTools.downloadLatestBackup()');
    expect(appSource).not.toContain('deviceKeymapFileTools.restoreFromFile(bridge');
    expect(appSource).not.toContain("name: 'Imported Profile'");
    expect(shippedInlineBundle).toContain('window.nodeStudioProfileFiles');
    expect(shippedInlineBundle).toContain('await e.pickFile()');
    expect(shippedInlineBundle).toContain('n.download(t,ae)');
    expect(shippedInlineBundle).toContain('window.nodeStudioDeviceKeymapFiles?.restoreFromFile');
    expect(shippedInlineBundle).toContain('window.nodeStudioDeviceKeymapFiles?.downloadLatestBackup');
    expect(shippedInlineBundle).toContain('savePreSyncSnapshot(e.snapshot');
  });

  it('loads the stock VIA bridge and keeps automatic pre-write backups without backup controls in Settings', () => {
    expect(mainSource).toContain("import './qmkViaBridge'");
    expect(appSource).toContain("from './profileFiles'");
    expect(appSource).toContain("from './deviceKeymapFiles'");
    expect(appSource).toContain('Connect Grid Macro 1 via QMK/VIA');
    expect(appSource).not.toContain('Pre-sync device keymap backup');
    expect(appSource).toContain("cmd: 'get_config'");
    expect(appSource).toContain('savePreSyncSnapshot');
    expect(bridgeSource).toContain("cmd === 'restore_config'");
    expect(backupSource).toContain('savePreSyncSnapshot');
    expect(legacyInlineBundle).not.toContain('children:`Device connected:`');
  });

  it('should load the full 8,703 vector icon library via static public script', () => {
    expect(htmlContent).toContain('src="/icons-data.js"');
    const iconDataPath = path.join(process.cwd(), 'public', 'icons-data.js');
    expect(fs.existsSync(iconDataPath)).toBe(true);
    expect(fs.statSync(iconDataPath).size).toBeGreaterThan(6 * 1024 * 1024); // >6MB
  });
});
