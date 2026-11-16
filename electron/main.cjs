// electron/main.cjs - NODE studio Desktop Application Entry Point for Windows
const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, shell, Tray } = require('electron');
const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { validateRp2040Uf2 } = require('./uf2Validator.cjs');
const { createDesktopActionExecutor } = require('./desktopExecution.cjs');
const { listInstalledApplications } = require('./installedApplications.cjs');
const { migrateLegacyUserData } = require('./userDataMigration.cjs');
const { createCheatSheetController } = require('./cheatSheet.cjs');
const cheatSheet = createCheatSheetController({ BrowserWindow, screen });

const desktopActionExecutor = createDesktopActionExecutor({
  openExternal: (url) => shell.openExternal(url),
  openApplicationShortcut: async (shortcutPath) => {
    try {
      const error = await shell.openPath(shortcutPath);
      return error
        ? { success: false, error }
        : { success: true, message: `Started ${path.basename(shortcutPath, path.extname(shortcutPath))}` };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
let mainWindow = null;
let appTray = null;
let visualSmokeCaptureStarted = false;
let completingQuit = false;

// Unpackaged Electron is development. Never let a user-level NODE_ENV value make
// an installed app load a local development server instead of its bundled UI.
const isDev = !app.isPackaged;
const DEFAULT_DEV_SERVER_URL = 'http://localhost:5173/';

function isPersistenceSmokeTest() {
  return app.isPackaged &&
    app.commandLine.hasSwitch('persistence-smoke-test') &&
    process.env.NODE_GRID_PERSISTENCE_SMOKE === '1';
}

// Electron resolves Windows userData through the OS Known Folder API rather
// than APPDATA alone. Point only the packaged persistence smoke test at its
// isolated runner directories before Chromium initializes its profile.
if (isPersistenceSmokeTest() && process.env.APPDATA && path.isAbsolute(process.env.APPDATA)) {
  const userDataDirectoryName = path.basename(app.getPath('userData'));
  app.setPath('appData', process.env.APPDATA);
  app.setPath('userData', path.join(process.env.APPDATA, userDataDirectoryName));
}

// Preserve profiles, key assignments, and native settings for users upgrading
// from earlier `NØDE Grid Macro 1 Studio` installations into `NODE studio`.
if (app.isPackaged) {
  const currentUserDataDir = app.getPath('userData');
  migrateLegacyUserData({
    currentUserDataDir,
    appDataDir: path.dirname(currentUserDataDir),
  });
}

function getDevServerUrl() {
  try {
    const candidate = new URL(process.env.VITE_DEV_SERVER_URL || DEFAULT_DEV_SERVER_URL);
    if (
      candidate.protocol === 'http:' &&
      (candidate.hostname === 'localhost' || candidate.hostname === '127.0.0.1')
    ) {
      return candidate.href;
    }
  } catch {}
  return DEFAULT_DEV_SERVER_URL;
}

function getAppEntryUrl() {
  return app.isPackaged
    ? pathToFileURL(path.join(__dirname, '../dist/index.html')).href
    : getDevServerUrl();
}

function isTrustedAppUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const entry = new URL(getAppEntryUrl());
    if (app.isPackaged) {
      if (url.protocol !== 'file:') return false;
      const requestedPath = path.resolve(fileURLToPath(url));
      const expectedPath = path.resolve(fileURLToPath(entry));
      // Windows file paths are case-insensitive; Chromium and Node may preserve
      // different drive/path casing for the same packaged app entry.
      return process.platform === 'win32'
        ? requestedPath.toLowerCase() === expectedPath.toLowerCase()
        : requestedPath === expectedPath;
    }
    return url.origin === entry.origin && url.pathname === entry.pathname;
  } catch {
    return false;
  }
}

function isTrustedRenderer(event) {
  const frame = event.senderFrame;
  // WebFrameMain identifies the top frame with a null parent; `isMainFrame`
  // is available in renderer process APIs, not on IPC's senderFrame object.
  return Boolean(
    mainWindow &&
    event.sender === mainWindow.webContents &&
    frame?.parent === null &&
    isTrustedAppUrl(frame.url)
  );
}

function getRendererTrustDiagnostics(event) {
  const frame = event.senderFrame;
  const senderUrl = event.sender?.getURL?.() || '';
  return {
    hasMainWindow: Boolean(mainWindow),
    senderMatchesMainWindow: Boolean(mainWindow && event.sender === mainWindow.webContents),
    hasSenderFrame: Boolean(frame),
    senderFrameIsMain: frame ? frame.parent === null : null,
    senderFrameUrl: frame?.url || null,
    senderUrl: senderUrl || null,
    expectedAppUrl: getAppEntryUrl(),
    senderFrameUrlTrusted: frame ? isTrustedAppUrl(frame.url) : false,
    senderUrlTrusted: senderUrl ? isTrustedAppUrl(senderUrl) : false,
  };
}

const DEFAULT_APP_SETTINGS = Object.freeze({
  launchAtStartup: false,
  allowTerminalSmartActions: false,
  allowDeviceNotifications: false,
});
const APP_SETTING_KEYS = new Set(Object.keys(DEFAULT_APP_SETTINGS));

function getAppSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.v1.json');
}

function readStoredAppSettings() {
  const settings = { ...DEFAULT_APP_SETTINGS };
  try {
    const stored = JSON.parse(fs.readFileSync(getAppSettingsPath(), 'utf8'));
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
      for (const key of ['allowTerminalSmartActions', 'allowDeviceNotifications']) {
        if (typeof stored[key] === 'boolean') settings[key] = stored[key];
      }
    }
  } catch {}
  return settings;
}

function getSettingsCapabilities() {
  return {
    launchAtStartup: Boolean(
      app.isPackaged &&
      (process.platform === 'win32' || process.platform === 'darwin') &&
      typeof app.setLoginItemSettings === 'function' &&
      typeof app.getLoginItemSettings === 'function'
    ),
    firmwareFlash: typeof dialog.showOpenDialog === 'function',
    externalLinks: typeof shell.openExternal === 'function',
  };
}

function getNativeAppSettings() {
  const capabilities = getSettingsCapabilities();
  let launchAtStartup = false;
  if (capabilities.launchAtStartup) {
    try {
      launchAtStartup = Boolean(app.getLoginItemSettings().openAtLogin);
    } catch {}
  }
  return {
    ok: true,
    settings: { ...readStoredAppSettings(), launchAtStartup },
    capabilities,
  };
}

function writeStoredAppSettings(settings) {
  const pathToSettings = getAppSettingsPath();
  fs.mkdirSync(path.dirname(pathToSettings), { recursive: true });
  fs.writeFileSync(pathToSettings, JSON.stringify(settings, null, 2), { mode: 0o600 });
}

function isAllowedExternalUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      url.hostname.toLowerCase() === 'github.com'
    );
  } catch {
    return false;
  }
}

function isAllowedHardwareOrigin(origin) {
  if (typeof origin !== 'string') return false;
  if (app.isPackaged) {
    return origin === 'null' || origin === 'file://' || origin.startsWith('file:');
  }
  return origin === new URL(getDevServerUrl()).origin;
}

function getInitialWindowBounds() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1280, Math.max(640, workArea.width - 32));
  const height = Math.min(840, Math.max(520, workArea.height - 32));
  return {
    width,
    height,
    minWidth: Math.min(900, width),
    minHeight: Math.min(600, height),
  };
}

function isVisualSmokeTest() {
  return app.isPackaged && app.commandLine.hasSwitch('visual-smoke-test');
}

function writeVisualSmokeDiagnostics(details) {
  if (!isVisualSmokeTest()) return;
  const diagnosticsPath = process.env.NODE_GRID_VISUAL_SMOKE_DIAGNOSTICS;
  if (!diagnosticsPath) return;
  try {
    fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
    fs.writeFileSync(
      diagnosticsPath,
      JSON.stringify({ ...details, timestamp: new Date().toISOString() }, null, 2)
    );
  } catch (error) {
    console.error('Could not write packaged UI smoke diagnostics:', error);
  }
}

async function captureVisualSmokeScreenshot() {
  const screenshotPath = process.env.NODE_GRID_VISUAL_SMOKE_SCREENSHOT;
  let renderedUi = null;
  try {
    if (!screenshotPath) {
      throw new Error('NODE_GRID_VISUAL_SMOKE_SCREENSHOT must name the PNG output path');
    }

    // Let the initial UI animation finish so the artifact shows the normal app,
    // not its entry transition.
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (!mainWindow || mainWindow.isDestroyed()) {
      throw new Error('The packaged application window closed before capture');
    }

    renderedUi = await mainWindow.webContents.executeJavaScript(`(() => {
      const root = document.querySelector('#root');
      const keySlots = Array.from(root?.querySelectorAll('[data-drop-slot]') || [])
        .map((element) => element.getAttribute('data-drop-slot'))
        .filter((slot) => /^r[1-3]c[1-3]$/.test(slot));
      const navText = root?.querySelector('nav')?.textContent || '';
      const centerPad = root?.querySelector('div.absolute.inset-0.flex.flex-col.items-center.justify-center.pointer-events-none.z-10');
      const gate = root?.querySelector('[data-testid="device-connection-gate"]');
      return {
        title: document.title,
        appMounted: Boolean(root?.firstElementChild),
        keyCount: keySlots.length,
        hasEncoder: Boolean(root?.querySelector('button[title^="Dial:"]')),
        hasNavigation: ['Keymap', 'Preset', 'Settings'].every((label) => navText.includes(label)),
        centerPadPosition: centerPad ? getComputedStyle(centerPad).position : null,
        gateVisible: Boolean(gate),
        gateHeadline: gate?.querySelector('h1')?.textContent?.trim() || '',
        gateHasIllustration: Boolean(gate?.querySelector('[aria-label="Micro Pad illustration"]')),
        gateHasRetry: Boolean(gate?.querySelector('[data-testid="device-gate-retry"]')),
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    })()`);

    // The configurator is gated behind a verified device connection. A CI
    // runner has no Micro Pad, so the gate IS the correct packaged screen here.
    // Assert it rendered properly and that no editing surface leaked through.
    if (!renderedUi.appMounted) {
      throw new Error(`Packaged UI did not pass its visual smoke checks: ${JSON.stringify(renderedUi)}`);
    }
    if (renderedUi.gateVisible) {
      if (
        renderedUi.gateHeadline !== 'Connect your Micro Pad to continue.' ||
        !renderedUi.gateHasIllustration ||
        !renderedUi.gateHasRetry ||
        renderedUi.keyCount !== 0 ||
        renderedUi.hasNavigation
      ) {
        throw new Error(`Packaged connection gate is incomplete or leaked editing controls: ${JSON.stringify(renderedUi)}`);
      }
    } else if (
      renderedUi.keyCount !== 9 ||
      !renderedUi.hasEncoder ||
      !renderedUi.hasNavigation ||
      renderedUi.centerPadPosition !== 'relative'
    ) {
      // A device was attached to the build machine: verify the full editor.
      throw new Error(`Packaged UI did not pass its visual smoke checks: ${JSON.stringify(renderedUi)}`);
    }

    const image = await mainWindow.webContents.capturePage();
    const png = image.toPNG();
    // A clean, compact Windows rendering can compress below 10 KiB; the DOM
    // checks above plus the workflow's PNG header/dimension checks establish
    // validity, so reject only implausibly tiny image data here.
    if (png.length < 4 * 1024) {
      throw new Error(`Screenshot is unexpectedly small (${png.length} bytes)`);
    }
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.writeFileSync(screenshotPath, png);

    // Exercise the actual packaged HUD and trusted IPC without opening another
    // application or claiming a physical-device test. The main window is the
    // sole trusted caller, exactly as in normal use.
    const hudSent = await mainWindow.webContents.executeJavaScript(`(async () => {
      const updated = await window.electronAPI.updateCheatSheet({ layer: 2, available: true, keys: ['Ctrl + C', 'Volume Up', '', '', '', '', '', '', ''], encoder: { ccw: 'Volume Down', press: 'Mute', cw: 'Volume Up' } });
      const shown = await window.electronAPI.commandCheatSheet('show');
      return updated && shown;
    })()`);
    if (!hudSent) throw new Error('Packaged Cheat-Sheet IPC rejected the smoke test');
    const hud = BrowserWindow.getAllWindows().find((candidate) => candidate !== mainWindow);
    if (!hud) throw new Error('Packaged Cheat-Sheet window was not created');
    if (hud.webContents.isLoadingMainFrame()) {
      await Promise.race([
        new Promise((resolve) => hud.webContents.once('did-finish-load', resolve)),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Cheat-Sheet failed to load')), 15000)),
      ]);
    }
    const hudContent = await hud.webContents.executeJavaScript(`({ layer: document.querySelector('#layer')?.textContent, keys: Array.from(document.querySelectorAll('.key'), node => node.textContent), encoder: ['ccw', 'press', 'cw'].map(direction => document.getElementById('dial-' + direction)?.textContent), hasDial: !!document.querySelector('.dial'), actionPanels: document.querySelectorAll('.dial-action').length, hasCopyIcon: !!document.querySelector('.key svg'), transparent: ['html', 'body', 'main', '.key', '.dial-action', '.dial'].every(selector => { const style = getComputedStyle(document.querySelector(selector)); return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.backgroundImage === 'none'; }) })`);
    if (!hud.isVisible() || !hud.isAlwaysOnTop() || hud.isFocusable() ||
        !hudContent.transparent ||
        hudContent.layer !== 'LAYER 2' || hudContent.keys.length !== 9 || !hudContent.hasDial || hudContent.actionPanels !== 3 || !hudContent.hasCopyIcon ||
        hudContent.encoder.join('|') !== 'Volume Down|Mute|Volume Up' ||
        hudContent.keys[0] !== 'Ctrl + C' || hudContent.keys[1] !== 'Volume Up') {
      throw new Error(`Packaged Cheat-Sheet smoke failed: ${JSON.stringify(hudContent)}`);
    }
    await mainWindow.webContents.executeJavaScript(`window.electronAPI.commandCheatSheet('hide')`);
    if (hud.isVisible()) throw new Error('Packaged Cheat-Sheet did not hide');
    console.log('Packaged Cheat-Sheet IPC, rendering, visibility, always-on-top and non-focusable checks passed');
    console.log(
      `Packaged UI visual smoke test passed (${renderedUi.gateVisible ? 'connection gate' : 'configurator'}): `
      + `${screenshotPath} (${png.length} bytes)`
    );
    app.exit(0);
  } catch (error) {
    const diagnostics = {
      stage: 'capture-failed',
      error: error instanceof Error ? error.message : String(error),
      renderedUi,
      windowBounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null,
      pageUrl: mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents.getURL() : null,
    };
    writeVisualSmokeDiagnostics(diagnostics);
    console.error('Packaged UI visual smoke test failed:', JSON.stringify(diagnostics));
    app.exit(1);
  }
}

function startVisualSmokeCapture() {
  if (!isVisualSmokeTest() || visualSmokeCaptureStarted || !mainWindow) return;
  visualSmokeCaptureStarted = true;
  writeVisualSmokeDiagnostics({ stage: 'capture-started', pageUrl: mainWindow.webContents.getURL() });
  mainWindow.show();
  void captureVisualSmokeScreenshot();
}

let persistenceSmokeTestStarted = false;

function writePersistenceSmokeDiagnostics(details) {
  const diagnosticsPath = process.env.NODE_GRID_PERSISTENCE_SMOKE_DIAGNOSTICS;
  if (!diagnosticsPath) return;
  try {
    fs.mkdirSync(path.dirname(diagnosticsPath), { recursive: true });
    fs.writeFileSync(
      diagnosticsPath,
      JSON.stringify({
        appDataEnvironment: process.env.APPDATA || null,
        localAppDataEnvironment: process.env.LOCALAPPDATA || null,
        appDataPath: app.getPath('appData'),
        userDataPath: app.getPath('userData'),
        settingsFilePath: getAppSettingsPath(),
        ...details,
        timestamp: new Date().toISOString(),
      }, null, 2)
    );
  } catch (error) {
    console.error('Could not write installed-app persistence diagnostics:', error);
  }
}

async function runPersistenceSmokeTest() {
  const phase = process.env.NODE_GRID_PERSISTENCE_PHASE;
  const profileName = 'Installed persistence smoke profile';
  try {
    if (!mainWindow || mainWindow.isDestroyed()) throw new Error('Persistence smoke window is unavailable');
    if (phase === 'write') {
      const ready = await mainWindow.webContents.executeJavaScript(`new Promise((resolve, reject) => {
        const deadline = Date.now() + 25000;
        const check = () => {
          if (document.querySelector('#root')?.firstElementChild) return resolve(true);
          if (Date.now() >= deadline) return reject(new Error('Renderer did not mount before the persistence write'));
          setTimeout(check, 100);
        };
        check();
      })`);
      if (!ready) throw new Error('Renderer was not ready to persist test data');
      await new Promise((resolve) => setTimeout(resolve, 250));
      const state = {
        v: 1,
        profiles: [{
          id: 'installed-persistence-smoke-profile',
          name: profileName,
          color: '#0051ff',
          layers: [{
            r1c1: {
              label: 'Smoke shortcut',
              binding: 'Smoke shortcut (Ctrl + Shift + S)',
              actionType: 'Shortcut',
              execution: { kind: 'shortcut', value: 'Ctrl + Shift + S' },
            },
          }],
        }],
        activeProfileIndex: 0,
        customItems: {
          Action: [{
            id: 'installed-persistence-smoke-action',
            main: 'Smoke sequence',
            listLabel: 'Smoke sequence (Ctrl + S)',
            macropadLabel: 'Smoke',
            execution: {
              kind: 'sequence',
              steps: [{ kind: 'key', key: 'Ctrl + S', mode: 'press-release' }],
            },
          }],
          'Multi-A': [],
          'Smart-A': [],
        },
      };
      const serializedState = JSON.stringify(state);
      const result = await mainWindow.webContents.executeJavaScript(`(async () => {
        const setting = await window.electronAPI?.setAppSetting('allowTerminalSmartActions', true);
        if (!setting?.ok || setting.settings?.allowTerminalSmartActions !== true) {
          const error = setting?.error || 'Native Settings did not save the terminal-action preference';
          throw new Error(error + (setting?.diagnostics ? ' ' + JSON.stringify(setting.diagnostics) : ''));
        }
        window.localStorage.setItem('cm2.state.v2', ${JSON.stringify(serializedState)});
        const savedState = JSON.parse(window.localStorage.getItem('cm2.state.v2') || 'null');
        if (savedState?.profiles?.[0]?.name !== ${JSON.stringify(profileName)}) {
          throw new Error('The profile state was not written to the installed app storage');
        }
        return { settingSaved: true, profileSaved: true };
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 750));
      writePersistenceSmokeDiagnostics({ stage: 'write-complete', ...result });
    } else if (phase === 'verify') {
      const result = await mainWindow.webContents.executeJavaScript(`(async () => {
        const expectedName = ${JSON.stringify(profileName)};
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          // The configurator is gated behind a device connection, and a build
          // runner has no Micro Pad. Persistence is about stored data surviving,
          // so assert that directly instead of requiring an editable screen.
          const root = document.querySelector('#root');
          const mounted = Boolean(root?.firstElementChild);
          const gateVisible = Boolean(root?.querySelector('[data-testid="device-connection-gate"]'));
          const profileVisible = Array.from(document.querySelectorAll('[title]')).some((element) =>
            element.getAttribute('title') === expectedName && element.textContent?.trim() === expectedName
          );
          if (mounted) {
            const native = await window.electronAPI?.getAppSettings();
            const rawState = window.localStorage.getItem('cm2.state.v2');
            const state = rawState ? JSON.parse(rawState) : null;
            const shortcut = state?.profiles?.[0]?.layers?.[0]?.r1c1?.execution;
            const custom = state?.customItems?.Action?.[0]?.execution;
            if (native?.ok && native.settings?.allowTerminalSmartActions === true &&
                state?.profiles?.[0]?.name === expectedName &&
                shortcut?.kind === 'shortcut' && shortcut?.value === 'Ctrl + Shift + S' &&
                custom?.kind === 'sequence' && custom?.steps?.[0]?.key === 'Ctrl + S') {
              // With no device the gate must be up AND the data must be intact:
              // that is exactly the "never lose profiles on disconnect" rule.
              if (!gateVisible && !profileVisible) {
                throw new Error('The configurator rendered without the saved profile visible');
              }
              return {
                settingRestored: true,
                profileLoaded: true,
                structuredExecutionRestored: true,
                profileName: expectedName,
                connectionGateVisible: gateVisible,
                profileVisibleInEditor: profileVisible,
              };
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        throw new Error('Native Settings or structured profile data did not survive the app restart');
      })()`);
      writePersistenceSmokeDiagnostics({ stage: 'verify-complete', ...result });
    } else {
      throw new Error('NODE_GRID_PERSISTENCE_PHASE must be write or verify');
    }
    console.log(`Installed-app persistence smoke test passed (${phase})`);
    app.quit();
  } catch (error) {
    const details = {
      stage: 'persistence-smoke-failed',
      phase,
      error: error instanceof Error ? error.message : String(error),
      pageUrl: mainWindow && !mainWindow.isDestroyed() ? mainWindow.webContents.getURL() : null,
    };
    writePersistenceSmokeDiagnostics(details);
    console.error('Installed-app persistence smoke test failed:', JSON.stringify(details));
    app.exit(1);
  }
}

function startPersistenceSmokeTest() {
  if (!isPersistenceSmokeTest() || persistenceSmokeTestStarted || !mainWindow) return;
  persistenceSmokeTestStarted = true;
  void runPersistenceSmokeTest();
}

function createWindow() {
  const bounds = getInitialWindowBounds();
  if (isVisualSmokeTest()) {
    const workArea = screen.getPrimaryDisplay().workAreaSize;
    bounds.width = Math.min(1100, Math.max(640, workArea.width - 32));
    bounds.height = Math.min(700, Math.max(520, workArea.height - 32));
    bounds.minWidth = Math.min(900, bounds.width);
    bounds.minHeight = Math.min(600, bounds.height);
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    center: true,
    backgroundColor: '#0a0a0a',
    title: 'NODE studio',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0e0e0e',
      symbolColor: '#ffffff',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      sandbox: true, // Hardened Sandbox Enabled
      // Multi-action tap/hold gestures are timed in the renderer against a 200ms
      // tapping term. Chromium throttles hidden-window timers to ~1s, which would
      // turn every tap into a hold once the app is minimized or tray-hidden.
      // Physical keys must behave identically whether or not the window is visible.
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
  });

  const ses = mainWindow.webContents.session;

  // Limit device access to the expected QMK/VIA Raw HID keyboard interface
  // and only from the trusted app window/origin.
  ses.setDevicePermissionHandler((details) => {
    if (!isAllowedHardwareOrigin(details.origin) || !details.device) return false;
    if (details.deviceType === 'hid') {
      return details.device.vendorId === 0xfeed && details.device.productId === 0x6001;
    }
    return false;
  });

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (
      webContents !== mainWindow?.webContents ||
      !isTrustedAppUrl(webContents.getURL()) ||
      !isAllowedHardwareOrigin(requestingOrigin)
    ) {
      return false;
    }
    return permission === 'hid';
  });

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const viaDevice = (details.deviceList || []).find(
      (device) => device.vendorId === 0xfeed && device.productId === 0x6001
    );
    callback(viaDevice?.deviceId || '');
  });

  const handleUntrustedNavigation = (event, targetUrl) => {
    if (isTrustedAppUrl(targetUrl)) return;
    event.preventDefault();
    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        shell.openExternal(parsedUrl.href);
      }
    } catch {}
  };
  mainWindow.webContents.on('will-navigate', handleUntrustedNavigation);
  mainWindow.webContents.on('will-redirect', handleUntrustedNavigation);

  if (isPersistenceSmokeTest()) {
    mainWindow.webContents.once('did-finish-load', startPersistenceSmokeTest);
    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        const details = { stage: 'persistence-load-failed', errorCode, errorDescription, validatedURL };
        writePersistenceSmokeDiagnostics(details);
        console.error('Installed-app persistence smoke could not load:', JSON.stringify(details));
        app.exit(1);
      }
    );
  }

  // Packaged builds load the Vite output using file://; its relative asset base
  // keeps the inline configurator and static public assets working inside asar.
  if (isDev) {
    mainWindow.loadURL(getAppEntryUrl());
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  if (isVisualSmokeTest()) {
    // A packaged smoke-test window is initially hidden. Start from
    // did-finish-load so the test cannot hang if ready-to-show is delayed by
    // headless/virtualized Windows graphics; the capture function guards
    // against this and ready-to-show racing each other.
    mainWindow.webContents.once('did-finish-load', startVisualSmokeCapture);
    mainWindow.webContents.on(
      'did-fail-load',
      (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame) return;
        const diagnostics = {
          stage: 'main-frame-load-failed',
          errorCode,
          errorDescription,
          validatedURL,
        };
        writeVisualSmokeDiagnostics(diagnostics);
        console.error('Packaged UI failed to load:', diagnostics);
        app.exit(1);
      }
    );
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      const diagnostics = { stage: 'renderer-process-gone', ...details };
      writeVisualSmokeDiagnostics(diagnostics);
      console.error('Packaged UI renderer exited unexpectedly:', diagnostics);
      app.exit(1);
    });
  }

  mainWindow.once('ready-to-show', () => {
    if (!isPersistenceSmokeTest()) mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } else {
      startVisualSmokeCapture();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch {}
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    cheatSheet.destroy();
    mainWindow = null;
    void desktopActionExecutor.setSimulationEnabled(false);
  });
}

// Only the trusted studio renderer can control the HUD; the HUD has no control IPC.
ipcMain.handle('cheat-sheet-update', (event, snapshot) =>
  isTrustedRenderer(event) && cheatSheet.update(snapshot));
ipcMain.handle('cheat-sheet-command', (event, command, token) =>
  isTrustedRenderer(event) && cheatSheet.command(command, token));

// IPC Handlers for Native Windows Control
ipcMain.handle('window-minimize', (event) => {
  if (isTrustedRenderer(event) && mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', (event) => {
  if (!isTrustedRenderer(event) || !mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', (event) => {
  if (isTrustedRenderer(event) && mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', (event) => {
  return isTrustedRenderer(event) && mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-app-version', (event) => {
  return isTrustedRenderer(event) ? app.getVersion() : null;
});

ipcMain.handle('list-installed-applications', (event) => {
  if (!isTrustedRenderer(event)) {
    return { ok: false, apps: [], error: 'Untrusted renderer' };
  }

  try {
    return listInstalledApplications({
      platform: process.platform,
      env: process.env,
      fsModule: fs,
      readShortcutLink: (shortcutPath) => shell.readShortcutLink(shortcutPath),
      excludedExecutables: [app.getPath('exe')],
    });
  } catch (error) {
    return {
      ok: false,
      apps: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('get-app-settings', (event) => {
  if (!isTrustedRenderer(event)) return { ok: false, error: 'Untrusted renderer' };
  try {
    return getNativeAppSettings();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('set-app-setting', (event, key, value) => {
  if (!isTrustedRenderer(event)) {
    return {
      ok: false,
      error: 'Untrusted renderer',
      ...(isPersistenceSmokeTest() ? { diagnostics: getRendererTrustDiagnostics(event) } : {}),
    };
  }
  if (!APP_SETTING_KEYS.has(key) || typeof value !== 'boolean') {
    return { ok: false, error: 'Invalid app setting' };
  }

  try {
    if (key === 'launchAtStartup') {
      if (!getSettingsCapabilities().launchAtStartup) {
        return { ok: false, error: 'Launch at startup is only supported by an installed Windows or macOS app' };
      }
      app.setLoginItemSettings({ openAtLogin: value, path: process.execPath });
      return getNativeAppSettings();
    }

    const settings = { ...readStoredAppSettings(), [key]: value };
    writeStoredAppSettings(settings);
    return getNativeAppSettings();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('open-external-url', async (event, rawUrl) => {
  if (!isTrustedRenderer(event)) return { ok: false, error: 'Untrusted renderer' };
  if (!isAllowedExternalUrl(rawUrl)) {
    return { ok: false, error: 'Only trusted HTTPS GitHub links can be opened from Settings' };
  }
  try {
    await shell.openExternal(new URL(rawUrl).href);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('flash-uf2', async (event) => {
  if (!isTrustedRenderer(event)) return { ok: false, error: 'Untrusted renderer' };
  if (!mainWindow || !getSettingsCapabilities().firmwareFlash) {
    return { ok: false, error: 'Firmware flashing is unavailable in this desktop environment' };
  }

  try {
    const firmwareSelection = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose Grid Macro 1 RP2040 firmware',
      properties: ['openFile'],
      filters: [{ name: 'RP2040 UF2 firmware', extensions: ['uf2'] }],
    });
    if (firmwareSelection.canceled || firmwareSelection.filePaths.length !== 1) {
      return { ok: false, cancelled: true };
    }

    const firmwarePath = firmwareSelection.filePaths[0];
    if (path.extname(firmwarePath).toLowerCase() !== '.uf2') {
      return { ok: false, error: 'Choose a .uf2 firmware file' };
    }
    const firmware = await fs.promises.readFile(firmwarePath);
    const validation = validateRp2040Uf2(firmware);
    if (!validation.ok) return validation;

    const bootloaderSelection = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose INFO_UF2.TXT on the mounted RPI-RP2 bootloader drive',
      properties: ['openFile'],
      filters: [{ name: 'RP2040 bootloader marker', extensions: ['txt'] }],
    });
    if (bootloaderSelection.canceled || bootloaderSelection.filePaths.length !== 1) {
      return { ok: false, cancelled: true };
    }

    const markerPath = bootloaderSelection.filePaths[0];
    if (path.basename(markerPath).toLowerCase() !== 'info_uf2.txt') {
      return { ok: false, error: 'Select INFO_UF2.TXT from the mounted RPI-RP2 drive' };
    }
    const marker = await fs.promises.readFile(markerPath, 'utf8');
    if (!/\bRPI-RP2\b/i.test(marker)) {
      return { ok: false, error: 'That bootloader marker does not identify the RPI-RP2 drive' };
    }

    const destination = path.join(path.dirname(markerPath), 'firmware.uf2');
    try {
      await fs.promises.writeFile(destination, firmware, { flag: 'wx' });
    } catch (error) {
      if (error && error.code === 'EEXIST') {
        return {
          ok: false,
          error: 'A firmware.uf2 file is already on that drive. Eject it, re-enter BOOTSEL mode, and try again.',
        };
      }
      throw error;
    }

    return {
      ok: true,
      message: 'Firmware copied to the RPI-RP2 bootloader drive. The board should flash and reboot automatically; reconnect it after it returns to normal mode.',
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('set-simulation-enabled', async (event, enabled) => {
  if (!isTrustedRenderer(event)) {
    return { ok: false, enabled: false, error: 'Untrusted renderer' };
  }
  if (typeof enabled !== 'boolean') {
    return { ok: false, enabled: false, error: 'Simulation state must be a boolean' };
  }

  try {
    const result = await desktopActionExecutor.setSimulationEnabled(enabled);
    return { ok: result.success, enabled: result.enabled, error: result.error };
  } catch (error) {
    return {
      ok: false,
      enabled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
});

ipcMain.handle('execute-smart-action', async (event, payload) => {
  if (!isTrustedRenderer(event)) return { success: false, error: 'Untrusted renderer' };
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { success: false, error: 'Invalid action payload' };
  }

  try {
    return await desktopActionExecutor.execute(payload, {
      // Settings are read in the main process; the renderer cannot grant itself
      // terminal-command permission by setting a request field.
      allowTerminal: readStoredAppSettings().allowTerminalSmartActions === true,
      commandConsent: payload.commandConsent === true,
      hardwareTrigger: payload.hardwareTrigger === true,
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

function createSystemTray() {
  if (appTray || isVisualSmokeTest() || isPersistenceSmokeTest()) return;
  try {
    const iconPath = path.join(__dirname, '../public/favicon.ico');
    const trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) return;
    appTray = new Tray(trayIcon);
    appTray.setToolTip('NODE studio (Background Agent Active)');
    const trayMenu = Menu.buildFromTemplate([
      {
        label: 'Open NODE studio',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: 'Hide to Background',
        click: () => {
          if (mainWindow) mainWindow.hide();
        },
      },
      {
        label: 'Sync to RP2040-Zero',
        click: () => {
          if (mainWindow) mainWindow.webContents.send('trigger-hardware-sync');
        },
      },
      { type: 'separator' },
      {
        label: 'Quit NODE studio',
        click: () => {
          app.quit();
        },
      },
    ]);
    appTray.setContextMenu(trayMenu);
    appTray.on('click', () => {
      if (!mainWindow) {
        createWindow();
      } else if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch {}
}

// App Lifecycle
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.node.gridmacro1');
  }
  writeVisualSmokeDiagnostics({ stage: 'app-ready', packaged: app.isPackaged });
  createWindow();
  createSystemTray();

  const template = [
    {
      label: 'NODE studio',
      submenu: [
        {
          label: 'Reload Configurator',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'Hide to Background Tray',
          accelerator: 'CmdOrCtrl+H',
          click: () => mainWindow && mainWindow.hide(),
        },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () =>
            mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: 'separator' },
        {
          label: 'Quit NODE studio',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Hardware',
      submenu: [
        {
          label: 'Sync to RP2040-Zero',
          click: () =>
            mainWindow &&
            mainWindow.webContents.send('trigger-hardware-sync'),
        },
        {
          label: 'Open Hardware Inspector',
          click: () =>
            mainWindow &&
            mainWindow.webContents.send('open-hardware-modal'),
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'QMK Documentation',
          click: () => shell.openExternal('https://docs.qmk.fm'),
        },
        {
          label: 'Waveshare RP2040-Zero Pinout',
          click: () =>
            shell.openExternal(
              'https://www.waveshare.com/wiki/RP2040-Zero'
            ),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', (event) => {
  if (appTray) {
    appTray.destroy();
    appTray = null;
  }
  if (completingQuit) return;
  event.preventDefault();
  completingQuit = true;
  void desktopActionExecutor.close().finally(() => app.quit());
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
