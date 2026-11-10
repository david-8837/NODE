// electron/main.cjs - NØDE Grid Macro 1 Desktop Application Entry Point for Windows
const { app, BrowserWindow, dialog, ipcMain, Menu, screen, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const { fileURLToPath, pathToFileURL } = require('url');
const { validateRp2040Uf2 } = require('./uf2Validator.cjs');

let mainWindow = null;
let psWorker = null;
let visualSmokeCaptureStarted = false;

// Unpackaged Electron is development. Never let a user-level NODE_ENV value make
// an installed app load a local development server instead of its bundled UI.
const isDev = !app.isPackaged;
const DEFAULT_DEV_SERVER_URL = 'http://localhost:5173/';

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
      return url.protocol === 'file:' &&
        path.resolve(fileURLToPath(url)) === path.resolve(fileURLToPath(entry));
    }
    return url.origin === entry.origin && url.pathname === entry.pathname;
  } catch {
    return false;
  }
}

function isTrustedRenderer(event) {
  const frame = event.senderFrame;
  return Boolean(
    mainWindow &&
    event.sender === mainWindow.webContents &&
    frame?.isMainFrame &&
    isTrustedAppUrl(frame.url)
  );
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
    console.log(`Packaged UI visual smoke test passed: ${screenshotPath} (${png.length} bytes)`);
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

// Safe Virtual Keycode Map for Native Keystroke Injection
const VK_MAP = {
  win: 0x5b,
  lwin: 0x5b,
  rwin: 0x5c,
  gui: 0x5b,
  cmd: 0x5b,
  meta: 0x5b,
  ctrl: 0x11,
  control: 0x11,
  lctrl: 0x11,
  rctrl: 0x11,
  alt: 0x12,
  lalt: 0x12,
  ralt: 0x12,
  opt: 0x12,
  option: 0x12,
  shift: 0x10,
  lshift: 0x10,
  rshift: 0x10,
  enter: 0x0d,
  return: 0x0d,
  esc: 0x1b,
  escape: 0x1b,
  tab: 0x09,
  space: 0x20,
  backspace: 0x08,
  delete: 0x2e,
  del: 0x2e,
  insert: 0x2d,
  ins: 0x2d,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pagedown: 0x22,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  f1: 0x70,
  f2: 0x71,
  f3: 0x72,
  f4: 0x73,
  f5: 0x74,
  f6: 0x75,
  f7: 0x76,
  f8: 0x77,
  f9: 0x78,
  f10: 0x79,
  f11: 0x7a,
  f12: 0x7b,
  prtscr: 0x2c,
  printscreen: 0x2c,
  volup: 0xaf,
  'volume+': 0xaf,
  volume: 0xaf,
  voldown: 0xae,
  'volume-': 0xae,
  mute: 0xad,
  play: 0xb3,
  'play/pause': 0xb3,
  next: 0xb0,
  prev: 0xb1,
};

function parseShortcutToVK(rawStr) {
  const clean = (rawStr || '').toLowerCase().replace(/[\(\)]/g, ' ').trim();
  if (
    clean.includes('volume +') ||
    clean.includes('vol+') ||
    clean.includes('volume up')
  )
    return [0xaf];
  if (
    clean.includes('volume -') ||
    clean.includes('vol-') ||
    clean.includes('volume down')
  )
    return [0xae];
  if (clean.includes('mute')) return [0xad];
  if (clean.includes('play') || clean.includes('pause')) return [0xb3];
  if (clean.includes('next')) return [0xb0];
  if (clean.includes('prev')) return [0xb1];

  const parts = clean
    .split(/[+\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const codes = [];
  for (const part of parts) {
    if (VK_MAP[part]) {
      codes.push(VK_MAP[part]);
    } else if (part.length === 1) {
      codes.push(part.toUpperCase().charCodeAt(0));
    }
  }
  return codes;
}

function initFastWindowsInjector() {
  if (process.platform !== 'win32') return;
  try {
    psWorker = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', '-'],
      { stdio: ['pipe', 'ignore', 'ignore'] }
    );

    const initScript = `
$w = Add-Type -MemberDefinition '[DllImport("user32.dll")]public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);' -Name FastWin32Keybd -PassThru
function Press-Keys([byte[]]$codes) {
  foreach ($c in $codes) { [FastWin32Keybd]::keybd_event($c, 0, 0, 0) }
  [System.Threading.Thread]::Sleep(15)
  for ($i = $codes.Length - 1; $i -ge 0; $i--) { [FastWin32Keybd]::keybd_event($codes[$i], 0, 2, 0) }
}
`;
    psWorker.stdin.write(initScript + '\n');
    psWorker.on('error', () => {
      psWorker = null;
    });
    psWorker.on('exit', () => {
      psWorker = null;
    });
  } catch (e) {
    psWorker = null;
  }
}

function injectWindowsKeystrokes(vkCodes) {
  if (!vkCodes || vkCodes.length === 0) return;
  if (psWorker && psWorker.stdin && !psWorker.stdin.destroyed) {
    psWorker.stdin.write(`Press-Keys @(${vkCodes.join(',')})\n`);
  } else {
    initFastWindowsInjector();
    if (psWorker && psWorker.stdin) {
      psWorker.stdin.write(`Press-Keys @(${vkCodes.join(',')})\n`);
    }
  }
}

function startVisualSmokeCapture() {
  if (!isVisualSmokeTest() || visualSmokeCaptureStarted || !mainWindow) return;
  visualSmokeCaptureStarted = true;
  writeVisualSmokeDiagnostics({ stage: 'capture-started', pageUrl: mainWindow.webContents.getURL() });
  mainWindow.show();
  void captureVisualSmokeScreenshot();
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

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (
      webContents !== mainWindow?.webContents ||
      !isTrustedAppUrl(webContents.getURL()) ||
      !isAllowedHardwareOrigin(requestingOrigin)
    ) {
      return false;
    }
    return permission === 'serial' || permission === 'hid';
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
    mainWindow.show();
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
    mainWindow = null;
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

ipcMain.handle('get-app-settings', (event) => {
  if (!isTrustedRenderer(event)) return { ok: false, error: 'Untrusted renderer' };
  try {
    return getNativeAppSettings();
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('set-app-setting', (event, key, value) => {
  if (!isTrustedRenderer(event)) return { ok: false, error: 'Untrusted renderer' };
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

// Sanitized & Safe Smart Action Execution (Open URL, Launch App, Safe Commands, Inject Keystrokes)
ipcMain.handle('execute-smart-action', async (event, payload) => {
  if (!isTrustedRenderer(event)) {
    return { success: false, error: 'Untrusted renderer' };
  }
  if (!payload || typeof payload !== 'object') {
    return { success: false, error: 'Invalid payload' };
  }
  const { type, value } = payload;
  if (!value || typeof value !== 'string') {
    return { success: false, error: 'Invalid action value' };
  }

  try {
    if (type === 'Web') {
      let urlStr = value.trim();
      if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
        urlStr = 'https://' + urlStr;
      }
      const parsedUrl = new URL(urlStr);
      if (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') {
        await shell.openExternal(parsedUrl.href);
        return { success: true, message: `Opened URL: ${parsedUrl.href}` };
      }
      return { success: false, error: 'Unsupported URL protocol' };
    } else if (type === 'App') {
      const appTarget = value.trim();
      // Safe execution using shell.openPath or direct sanitized execFile
      if (path.isAbsolute(appTarget)) {
        await shell.openPath(appTarget);
        return { success: true, message: `Opened Path: ${appTarget}` };
      }
      // Common Windows app aliases allowlist
      const SAFE_WIN_APPS = {
        calc: 'calc.exe',
        calculator: 'calc.exe',
        notepad: 'notepad.exe',
        explorer: 'explorer.exe',
        cmd: 'cmd.exe',
        powershell: 'powershell.exe',
        taskmgr: 'taskmgr.exe',
        spotify: 'spotify.exe',
        code: 'code.cmd',
      };
      const cleanKey = appTarget.toLowerCase().replace(/\.exe$/i, '');
      const binaryName = SAFE_WIN_APPS[cleanKey] || appTarget;

      if (process.platform === 'win32') {
        execFile('cmd.exe', ['/c', 'start', '', binaryName], { windowsHide: true }, (err) => {
          if (err) console.error('App launch error:', err);
        });
      } else {
        execFile('open', ['-a', appTarget], (err) => {
          if (err) console.error('App launch fallback error:', err);
        });
      }
      return { success: true, message: `Launched App: ${appTarget}` };
    } else if (type === 'Cmd') {
      if (!readStoredAppSettings().allowTerminalSmartActions) {
        return {
          success: false,
          error: 'Terminal commands are disabled in Settings. Enable them only for commands you trust.',
        };
      }
      // Command sanitization & execution protection
      const rawCmd = value.trim();
      // Block dangerous chaining operators when untrusted
      const containsDangerousPipes = /[;&|`$><]/.test(rawCmd);
      if (containsDangerousPipes) {
        return {
          success: false,
          error: 'Security Warning: Command contains restricted shell characters.',
        };
      }
      // Execute command safely as an isolated argument
      const parts = rawCmd.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        const bin = parts[0];
        const args = parts.slice(1);
        execFile(bin, args, { windowsHide: true, timeout: 5000 }, (err) => {
          if (err) console.error('Cmd execution error:', err);
        });
        return { success: true, message: `Executed Command: ${rawCmd}` };
      }
    } else if (type === 'Shortcut' || type === 'Key' || !type) {
      if (process.platform === 'win32') {
        const vkCodes = parseShortcutToVK(value);
        if (vkCodes.length > 0) {
          injectWindowsKeystrokes(vkCodes);
          return { success: true, message: `Injected Keystroke: ${value}` };
        }
      }
      return { success: true, message: `Shortcut: ${value}` };
    } else if (type === 'Text') {
      return { success: true, message: `Text: ${value}` };
    }
  } catch (err) {
    console.error('Smart Action Error:', err);
    return { success: false, error: err.message };
  }
  return { success: false };
});

// App Lifecycle
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.node.gridmacro1');
  }
  writeVisualSmokeDiagnostics({ stage: 'app-ready', packaged: app.isPackaged });
  if (!isVisualSmokeTest()) {
    initFastWindowsInjector();
  }
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

app.on('window-all-closed', () => {
  if (psWorker) {
    try {
      psWorker.kill();
    } catch {}
    psWorker = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
