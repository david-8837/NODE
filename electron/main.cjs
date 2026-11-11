// electron/main.cjs - NØDE Grid Macro 1 Desktop Application Entry Point for Windows
const { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { copyValidatedUf2ToBootloader } = require('./uf2Flasher.cjs');
const { evaluateRendererHeapSoak } = require('./memoryBudget.cjs');
const { createDesktopActionExecutor } = require('./desktopExecution.cjs');
const { listInstalledApplications } = require('./installedApplications.cjs');
const {
  getIconPickerBrowserSmokeScript,
  getIconPickerMemorySoakScript,
} = require('./browserSmoke.cjs');
const {
  canGrantAppPermissionCheck,
  canGrantAppPermissionRequest,
  getAllowedExternalNavigationUrl,
  isAllowedHardwareOrigin: isAllowedHardwareOriginForContext,
  isTrustedAppFrame: isTrustedAppFrameForEntry,
  isTrustedAppUrl: isTrustedAppUrlForEntry,
} = require('./securityPolicy.cjs');

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

function securityPolicyContext() {
  return {
    packaged: app.isPackaged,
    platform: process.platform,
    devServerUrl: getDevServerUrl(),
  };
}

function isTrustedAppUrl(rawUrl) {
  return isTrustedAppUrlForEntry(rawUrl, getAppEntryUrl(), securityPolicyContext());
}

function isTrustedAppFrame(frame) {
  return isTrustedAppFrameForEntry(frame, getAppEntryUrl(), securityPolicyContext());
}

function isAllowedHardwareOrigin(origin) {
  return isAllowedHardwareOriginForContext(origin, securityPolicyContext());
}

function isTrustedRenderer(event) {
  return Boolean(
    mainWindow &&
    event.sender === mainWindow.webContents &&
    isTrustedAppFrame(event.senderFrame)
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
  allowAnalytics: false,
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
      for (const key of ['allowAnalytics', 'allowTerminalSmartActions', 'allowDeviceNotifications']) {
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

// These V8/Chromium diagnostics are enabled only for the packaged visual smoke.
// Normal launches keep the production runtime flags unchanged.
if (isVisualSmokeTest()) {
  app.commandLine.appendSwitch('enable-precise-memory-info');
  app.commandLine.appendSwitch('js-flags', '--expose-gc');
}

function getRendererProcessMemorySnapshot() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error('Cannot sample memory after the packaged app window is closed');
  }

  const rendererPid = mainWindow.webContents.getOSProcessId();
  const metric = app.getAppMetrics().find(({ pid }) => pid === rendererPid);
  if (!metric) {
    throw new Error(`Electron did not report memory metrics for renderer process ${rendererPid}`);
  }

  return {
    pid: metric.pid,
    type: metric.type,
    workingSetKb: metric.memory.workingSetSize,
    privateBytesKb: Number.isFinite(metric.memory.privateBytes) ? metric.memory.privateBytes : null,
    peakWorkingSetKb: metric.memory.peakWorkingSetSize,
  };
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
  let browserSmokeResult = null;
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
      return {
        title: document.title,
        appMounted: Boolean(root?.firstElementChild),
        keyCount: keySlots.length,
        hasEncoder: Boolean(root?.querySelector('button[title^="Dial:"]')),
        hasNavigation: ['Keymap', 'Preset', 'Settings'].every((label) => navText.includes(label)),
        centerPadPosition: centerPad ? getComputedStyle(centerPad).position : null,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      };
    })()`);

    if (
      !renderedUi.appMounted ||
      renderedUi.keyCount !== 9 ||
      !renderedUi.hasEncoder ||
      !renderedUi.hasNavigation ||
      renderedUi.centerPadPosition !== 'relative'
    ) {
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

    const iconPickerSmokeResult = await mainWindow.webContents.executeJavaScript(
      getIconPickerBrowserSmokeScript()
    );
    browserSmokeResult = iconPickerSmokeResult;
    if (
      !iconPickerSmokeResult.fullIconCatalogAvailable ||
      iconPickerSmokeResult.browseCount !== 8507 ||
      !iconPickerSmokeResult.deferredIconLibraryLoadedAfterClick ||
      !iconPickerSmokeResult.iconSearchSelected ||
      !iconPickerSmokeResult.emojiSearchSelected
    ) {
      throw new Error(`Packaged browser smoke checks returned unexpected results: ${JSON.stringify(iconPickerSmokeResult)}`);
    }

    const rendererMemoryBefore = getRendererProcessMemorySnapshot();
    const rawMemorySoakResult = await mainWindow.webContents.executeJavaScript(
      getIconPickerMemorySoakScript()
    );
    const heapSoakAssessment = evaluateRendererHeapSoak(rawMemorySoakResult);
    const rendererMemoryAfter = getRendererProcessMemorySnapshot();
    const rendererMemoryDeltaKb = {
      workingSet: rendererMemoryAfter.workingSetKb - rendererMemoryBefore.workingSetKb,
      privateBytes:
        rendererMemoryAfter.privateBytesKb === null || rendererMemoryBefore.privateBytesKb === null
          ? null
          : rendererMemoryAfter.privateBytesKb - rendererMemoryBefore.privateBytesKb,
    };
    browserSmokeResult = {
      ...iconPickerSmokeResult,
      memorySoak: {
        ...rawMemorySoakResult,
        ...heapSoakAssessment,
        rendererProcess: {
          before: rendererMemoryBefore,
          after: rendererMemoryAfter,
          deltaKb: rendererMemoryDeltaKb,
        },
      },
    };
    if (
      !heapSoakAssessment.passed ||
      rawMemorySoakResult.gcAvailable !== true ||
      rawMemorySoakResult.preciseMemoryInfoEnabled !== true ||
      rawMemorySoakResult.iterations !== 30 ||
      rawMemorySoakResult.checkpoints?.length !== 6
    ) {
      throw new Error(`Packaged Chromium memory soak failed: ${JSON.stringify(browserSmokeResult.memorySoak)}`);
    }

    writeVisualSmokeDiagnostics({
      stage: 'browser-smoke-passed',
      renderedUi,
      browserSmokeResult,
    });
    console.log(`Packaged UI and icon-picker browser smoke tests passed: ${screenshotPath} (${png.length} bytes); ${JSON.stringify(browserSmokeResult)}`);
    app.exit(0);
  } catch (error) {
    const diagnostics = {
      stage: 'capture-failed',
      error: error instanceof Error ? error.message : String(error),
      renderedUi,
      browserSmokeResult,
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
        const startupSetting = await window.electronAPI?.setAppSetting('launchAtStartup', true);
        if (!startupSetting?.ok || startupSetting.settings?.launchAtStartup !== true) {
          throw new Error(startupSetting?.error || 'Windows did not enable launch at startup');
        }
        window.localStorage.setItem('cm2.state.v2', ${JSON.stringify(serializedState)});
        const savedState = JSON.parse(window.localStorage.getItem('cm2.state.v2') || 'null');
        if (savedState?.profiles?.[0]?.name !== ${JSON.stringify(profileName)}) {
          throw new Error('The profile state was not written to the installed app storage');
        }
        return { settingSaved: true, launchAtStartupEnabled: true, profileSaved: true };
      })()`);
      await new Promise((resolve) => setTimeout(resolve, 750));
      writePersistenceSmokeDiagnostics({ stage: 'write-complete', ...result });
    } else if (phase === 'verify') {
      const result = await mainWindow.webContents.executeJavaScript(`(async () => {
        const expectedName = ${JSON.stringify(profileName)};
        const deadline = Date.now() + 30000;
        while (Date.now() < deadline) {
          const profileVisible = Array.from(document.querySelectorAll('[title]')).some((element) =>
            element.getAttribute('title') === expectedName && element.textContent?.trim() === expectedName
          );
          if (profileVisible) {
            const native = await window.electronAPI?.getAppSettings();
            const rawState = window.localStorage.getItem('cm2.state.v2');
            const state = rawState ? JSON.parse(rawState) : null;
            const shortcut = state?.profiles?.[0]?.layers?.[0]?.r1c1?.execution;
            const custom = state?.customItems?.Action?.[0]?.execution;
            if (native?.ok && native.settings?.allowTerminalSmartActions === true &&
                native.settings?.launchAtStartup === true &&
                shortcut?.kind === 'shortcut' && shortcut?.value === 'Ctrl + Shift + S' &&
                custom?.kind === 'sequence' && custom?.steps?.[0]?.key === 'Ctrl + S') {
              const disabledStartup = await window.electronAPI?.setAppSetting('launchAtStartup', false);
              if (!disabledStartup?.ok || disabledStartup.settings?.launchAtStartup !== false) {
                throw new Error(disabledStartup?.error || 'Could not clean up the smoke-test startup entry');
              }
              return {
                settingRestored: true,
                launchAtStartupRestored: true,
                launchAtStartupCleanedUp: true,
                profileLoaded: true,
                structuredExecutionRestored: true,
                profileName: expectedName,
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
    title: 'NØDE — Grid Macro 1 Studio',
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
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
    show: false,
  });

  const ses = mainWindow.webContents.session;

  // Limit device access to the expected VIA Raw HID keyboard and RP2040 serial
  // interface, and only from the trusted app window/origin.
  ses.setDevicePermissionHandler((details) => {
    if (!isAllowedHardwareOrigin(details.origin) || !details.device) return false;
    if (details.deviceType === 'hid') {
      return details.device.vendorId === 0xfeed && details.device.productId === 0x6001;
    }
    if (details.deviceType === 'serial') {
      return details.device.vendorId?.toLowerCase() === '2e8a';
    }
    return false;
  });

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details = {}) =>
    canGrantAppPermissionCheck({
      webContentsIsMainWindow: webContents === mainWindow?.webContents,
      permission,
      requestingUrl: details.requestingUrl,
      requestingOrigin,
      securityOrigin: details.securityOrigin,
      isMainFrame: details.isMainFrame,
    }, getAppEntryUrl(), securityPolicyContext())
  );

  // Deny every permission by default. The app only needs WebHID/Web Serial for
  // device access and notifications after the user opts in from Settings.
  ses.setPermissionRequestHandler((webContents, permission, callback, details = {}) => {
    callback(canGrantAppPermissionRequest({
      webContentsIsMainWindow: webContents === mainWindow?.webContents,
      permission,
      requestingUrl: details.requestingUrl,
      isMainFrame: details.isMainFrame,
    }, getAppEntryUrl(), securityPolicyContext()));
  });

  // Select only the supported RP2040 USB serial device; never fall back to an
  // unrelated port that happened to be connected.
  ses.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (webContents !== mainWindow?.webContents || !isTrustedAppUrl(webContents.getURL())) {
      callback('');
      return;
    }
    const rp2040Port = (portList || []).find(
      (port) => port.vendorId?.toLowerCase() === '2e8a'
    );
    callback(rp2040Port?.portId || '');
  });

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    if (!isTrustedAppFrame(details?.frame)) {
      callback('');
      return;
    }
    const viaDevice = (details.deviceList || []).find(
      (device) => device.vendorId === 0xfeed && device.productId === 0x6001
    );
    callback(viaDevice?.deviceId || '');
  });

  const openExternalNavigation = (rawUrl) => {
    const externalUrl = getAllowedExternalNavigationUrl(rawUrl);
    if (externalUrl) void shell.openExternal(externalUrl).catch(() => undefined);
  };
  const handleUntrustedFrameNavigation = (details) => {
    if (details.isMainFrame && isTrustedAppUrl(details.url)) return;
    details.preventDefault();
    if (details.isMainFrame) openExternalNavigation(details.url);
  };
  mainWindow.webContents.on('will-frame-navigate', handleUntrustedFrameNavigation);
  mainWindow.webContents.on('will-redirect', (details) => {
    if (details.isMainFrame && isTrustedAppUrl(details.url)) return;
    details.preventDefault();
    if (details.isMainFrame) openExternalNavigation(details.url);
  });

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
    openExternalNavigation(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    void desktopActionExecutor.setSimulationEnabled(false);
  });
}

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
    const bootloaderSelection = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose INFO_UF2.TXT on the mounted RPI-RP2 bootloader drive',
      properties: ['openFile'],
      filters: [{ name: 'RP2040 bootloader marker', extensions: ['txt'] }],
    });
    if (bootloaderSelection.canceled || bootloaderSelection.filePaths.length !== 1) {
      return { ok: false, cancelled: true };
    }

    return await copyValidatedUf2ToBootloader({
      firmwarePath,
      markerPath: bootloaderSelection.filePaths[0],
    });
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
    });
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

// App Lifecycle
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.node.gridmacro1');
  }
  writeVisualSmokeDiagnostics({ stage: 'app-ready', packaged: app.isPackaged });
  createWindow();

  const template = [
    {
      label: 'NØDE Studio',
      submenu: [
        {
          label: 'Reload Configurator',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () =>
            mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
        { type: 'separator' },
        {
          label: 'Quit NØDE Studio',
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
