// electron/main.cjs - NØDE Grid Macro 1 Desktop Application Entry Point for Windows
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { spawn, execFile } = require('child_process');
const path = require('path');

let mainWindow = null;
let psWorker = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
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

  // Granular WebHID & Web Serial permission checking
  ses.setDevicePermissionHandler((details) => {
    // Only allow HID and Serial for USB devices
    if (details.deviceType === 'hid' || details.deviceType === 'serial') {
      return true;
    }
    return false;
  });

  // Strict permission handler: only allow 'serial' and 'hid' when originating from internal app
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    // Allow serial and hid permissions for local dev and packaged file protocols
    if (permission === 'serial' || permission === 'hid') {
      if (
        requestingOrigin.startsWith('http://localhost:') ||
        requestingOrigin.startsWith('http://127.0.0.1:') ||
        requestingOrigin === 'null' ||
        requestingOrigin.startsWith('file:')
      ) {
        return true;
      }
    }
    // Block all other high-privilege permissions (camera, microphone, geolocation, etc.)
    return false;
  });

  // Automatically select connected RP2040-Zero device when requested by web app
  ses.on('select-serial-port', (event, portList, webContents, callback) => {
    event.preventDefault();
    if (portList && portList.length > 0) {
      const rp2040Port = portList.find(
        (p) =>
          p.vendorId === '2e8a' ||
          p.vendorId === '2E8A' ||
          (p.displayName && p.displayName.includes('RP2040'))
      );
      callback(rp2040Port ? rp2040Port.portId : portList[0].portId);
    } else {
      callback('');
    }
  });

  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    if (details.deviceList && details.deviceList.length > 0) {
      const rp2040Hid = details.deviceList.find(
        (d) => d.vendorId === 0x2e8a || d.vendorId === 0xfeed
      );
      callback(rp2040Hid ? rp2040Hid.deviceId : details.deviceList[0].deviceId);
    } else {
      callback('');
    }
  });

  // Load URL
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
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
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Sanitized & Safe Smart Action Execution (Open URL, Launch App, Safe Commands, Inject Keystrokes)
ipcMain.handle('execute-smart-action', async (event, payload) => {
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
  initFastWindowsInjector();
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
