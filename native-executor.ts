import { spawn, execFile } from 'child_process';
import path from 'path';

// Virtual-Key codes for Windows
const VK_MAP: Record<string, number> = {
  win: 0x5B,
  lwin: 0x5B,
  rwin: 0x5C,
  gui: 0x5B,
  cmd: 0x5B,
  super: 0x5B,
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
  enter: 0x0D,
  return: 0x0D,
  esc: 0x1B,
  escape: 0x1B,
  tab: 0x09,
  space: 0x20,
  spc: 0x20,
  backspace: 0x08,
  bksp: 0x08,
  back: 0x08,
  delete: 0x2E,
  del: 0x2E,
  insert: 0x2D,
  ins: 0x2D,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pgup: 0x21,
  'page up': 0x21,
  pagedown: 0x22,
  pgdn: 0x22,
  'page down': 0x22,
  up: 0x26,
  down: 0x28,
  left: 0x25,
  right: 0x27,
  tilde: 0xC0,
  '`': 0xC0,
  '~': 0xC0,
  backslash: 0xDC,
  '\\': 0xDC,
  slash: 0xBF,
  '/': 0xBF,
  prtscr: 0x2C,
  printscreen: 0x2C,
  snapshot: 0x2C,
  volup: 0xAF,
  'volume+': 0xAF,
  'vol+': 0xAF,
  'volume up': 0xAF,
  kc_volu: 0xAF,
  voldown: 0xAE,
  'volume-': 0xAE,
  'vol-': 0xAE,
  'volume down': 0xAE,
  kc_vold: 0xAE,
  mute: 0xAD,
  'audio mute': 0xAD,
  'media mute': 0xAD,
  kc_mute: 0xAD,
  play: 0xB3,
  pause: 0xB3,
  'play / pause': 0xB3,
  'play/pause': 0xB3,
  'media play': 0xB3,
  next: 0xB0,
  'next track': 0xB0,
  prev: 0xB1,
  'prev track': 0xB1,
  'previous track': 0xB1,
  stop: 0xB2,
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
  f11: 0x7A,
  f12: 0x7B
};

let psWorker: any = null;

function initPowerShellWorker() {
  if (process.platform !== 'win32') return;
  try {
    psWorker = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], {
      stdio: ['pipe', 'ignore', 'ignore']
    });

    const initScript = `
$w = Add-Type -MemberDefinition '[DllImport("user32.dll")]public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);' -Name FastWin32Keybd -PassThru
function Press-Keys([byte[]]$codes) {
  foreach ($c in $codes) { [FastWin32Keybd]::keybd_event($c, 0, 0, 0) }
  [System.Threading.Thread]::Sleep(15)
  for ($i = $codes.Length - 1; $i -ge 0; $i--) { [FastWin32Keybd]::keybd_event($codes[$i], 0, 2, 0) }
}
`;
    psWorker.stdin.write(initScript + '\n');
    psWorker.on('error', () => { psWorker = null; });
    psWorker.on('exit', () => { psWorker = null; });
  } catch {
    psWorker = null;
  }
}

export function parseShortcutToVK(rawStr: string): number[] {
  if (!rawStr || typeof rawStr !== 'string') return [];
  const clean = rawStr.toLowerCase().replace(/[\(\)]/g, ' ').replace(/mod\+/g, 'ctrl+').trim();

  // Media special phrases
  if (clean.includes('volume +') || clean.includes('vol+') || clean.includes('volume up') || clean.includes('kc_volu')) return [0xAF];
  if (clean.includes('volume -') || clean.includes('vol-') || clean.includes('volume down') || clean.includes('kc_vold')) return [0xAE];
  if (clean.includes('mute') || clean.includes('kc_mute')) return [0xAD];
  if (clean.includes('play') || clean.includes('pause')) return [0xB3];
  if (clean.includes('next')) return [0xB0];
  if (clean.includes('prev')) return [0xB1];

  const parts = clean.split(/[+\s]+/).map(s => s.trim()).filter(Boolean);
  const codes: number[] = [];

  for (const part of parts) {
    if (VK_MAP[part]) {
      codes.push(VK_MAP[part]);
    } else if (/^[a-z0-9]$/.test(part)) {
      codes.push(part.toUpperCase().charCodeAt(0));
    }
  }
  return codes;
}

export function injectKeystrokes(vkCodes: number[]) {
  if (!vkCodes || !Array.isArray(vkCodes) || vkCodes.length === 0) return;
  // Strictly filter only valid numeric byte values [0..255]
  const validCodes = vkCodes.filter(c => typeof c === 'number' && Number.isInteger(c) && c >= 0 && c <= 255);
  if (validCodes.length === 0) return;

  if (!psWorker || !psWorker.stdin || psWorker.stdin.destroyed) {
    initPowerShellWorker();
  }
  if (psWorker && psWorker.stdin) {
    psWorker.stdin.write(`Press-Keys @(${validCodes.join(',')})\n`);
  }
}

// Known safe Windows desktop app binaries
const SAFE_WIN_APPS: Record<string, string> = {
  calc: 'calc.exe',
  calculator: 'calc.exe',
  notepad: 'notepad.exe',
  explorer: 'explorer.exe',
  cmd: 'cmd.exe',
  powershell: 'powershell.exe',
  taskmgr: 'taskmgr.exe',
  spotify: 'spotify.exe',
  code: 'code.cmd'
};

export function executeNativeAction(
  payload: any,
  options: { allowTerminal?: boolean } = {}
): Promise<{ success: boolean; message?: string; error?: string }> {
  return new Promise((resolve) => {
    try {
      if (!payload || typeof payload !== 'object') {
        return resolve({ success: false, error: 'Invalid payload: must be an object' });
      }

      const type = String(payload.type || payload.actionType || 'Shortcut');
      const value = String(payload.value || payload.binding || payload.keys || '').trim();

      if (!value) {
        return resolve({ success: false, error: 'Empty action value' });
      }

      if (type === 'Web') {
        let urlStr = value;
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
          urlStr = 'https://' + urlStr;
        }

        try {
          const parsed = new URL(urlStr);
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return resolve({ success: false, error: 'Blocked: only http and https URLs allowed' });
          }

          // Safe execution via execFile with separated arguments (zero shell interpolation)
          execFile('rundll32.exe', ['url.dll,FileProtocolHandler', parsed.href], { windowsHide: true }, (err) => {
            if (err) resolve({ success: false, error: err.message });
            else resolve({ success: true, message: `Opened URL: ${parsed.href}` });
          });
        } catch {
          return resolve({ success: false, error: 'Invalid URL format' });
        }
        return;
      }

      if (type === 'App') {
        // Enforce safe app allowlist or valid alphanumeric executable name
        const cleanKey = value.toLowerCase().replace(/\.exe$/, '');
        const bin = SAFE_WIN_APPS[cleanKey];

        if (!bin) {
          return resolve({
            success: false,
            error: `App "${value}" is not in the authorized application list`
          });
        }

        execFile('cmd.exe', ['/c', 'start', '', bin], { windowsHide: true }, (err) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, message: `Launched App: ${bin}` });
        });
        return;
      }

      if (type === 'Cmd') {
        if (options.allowTerminal !== true) {
          return resolve({
            success: false,
            error: 'Terminal commands are disabled in Settings. Enable them only for commands you trust.'
          });
        }
        // Strictly prevent shell injection metacharacters
        const containsForbiddenChars = /[;&|`$><"'\n\r]/.test(value);
        if (containsForbiddenChars) {
          return resolve({
            success: false,
            error: 'Security Warning: Command contains forbidden shell metacharacters'
          });
        }

        const parts = value.split(/\s+/).filter(Boolean);
        if (parts.length === 0) {
          return resolve({ success: false, error: 'Empty command' });
        }

        const bin = parts[0];
        const args = parts.slice(1);

        // Execute directly via execFile without cmd.exe shell wrapper
        execFile(bin, args, { windowsHide: true, timeout: 5000 }, (err, stdout) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, message: stdout.trim() || 'Command executed' });
        });
        return;
      }

      // Default: Shortcut / Keycode
      const vkCodes = parseShortcutToVK(value);
      if (vkCodes.length > 0) {
        injectKeystrokes(vkCodes);
        resolve({ success: true, message: `Injected: ${value} [${vkCodes.join(',')}]` });
      } else {
        resolve({ success: false, error: `Could not parse keys from: ${value}` });
      }
    } catch (e: any) {
      resolve({ success: false, error: e.message });
    }
  });
}
