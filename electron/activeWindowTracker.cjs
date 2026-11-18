// electron/activeWindowTracker.cjs - Native Active Window Tracker for Windows
'use strict';

const path = require('node:path');

let win32Apis = null;

function initWin32Apis(loadKoffi = () => require('koffi')) {
  if (win32Apis !== null) return win32Apis;
  if (process.platform !== 'win32') {
    win32Apis = { ok: false, error: 'Non-Windows platform' };
    return win32Apis;
  }

  try {
    const koffi = loadKoffi();
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');

    const GetForegroundWindow = user32.func('uintptr_t GetForegroundWindow()');
    const GetWindowTextW = user32.func('int GetWindowTextW(uintptr_t hwnd, _Out_ uint16_t *str, int maxCount)');
    const GetWindowThreadProcessId = user32.func('uint32_t GetWindowThreadProcessId(uintptr_t hwnd, _Out_ uint32_t *pid)');
    const OpenProcess = kernel32.func('uintptr_t OpenProcess(uint32_t dwDesiredAccess, int bInheritHandle, uint32_t dwProcessId)');
    const QueryFullProcessImageNameW = kernel32.func('int QueryFullProcessImageNameW(uintptr_t hProcess, uint32_t dwFlags, _Out_ uint16_t *lpExeName, _InOut_ uint32_t *lpdwSize)');
    const CloseHandle = kernel32.func('int CloseHandle(uintptr_t hObject)');

    win32Apis = {
      ok: true,
      GetForegroundWindow,
      GetWindowTextW,
      GetWindowThreadProcessId,
      OpenProcess,
      QueryFullProcessImageNameW,
      CloseHandle,
    };
    return win32Apis;
  } catch (err) {
    win32Apis = { ok: false, error: err instanceof Error ? err.message : String(err) };
    return win32Apis;
  }
}

function getActiveWindowDetails(apis = initWin32Apis()) {
  if (!apis || !apis.ok) return null;

  try {
    const hwnd = apis.GetForegroundWindow();
    if (!hwnd || hwnd === 0n || hwnd === 0) return null;

    // Read window title
    const titleBuf = Buffer.alloc(512);
    const titleLen = apis.GetWindowTextW(hwnd, titleBuf, 256);
    const title = titleLen > 0 ? titleBuf.toString('utf16le', 0, titleLen * 2) : '';

    // Read process ID
    const pidBuf = [0];
    apis.GetWindowThreadProcessId(hwnd, pidBuf);
    const pid = pidBuf[0];
    if (!pid) return { hwnd: String(hwnd), title, pid: 0, processName: '', processPath: '' };

    // Query full executable path: PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    const hProcess = apis.OpenProcess(0x1000, 0, pid);
    if (!hProcess || hProcess === 0n || hProcess === 0) {
      return { hwnd: String(hwnd), title, pid, processName: '', processPath: '' };
    }

    try {
      const pathBuf = Buffer.alloc(1024);
      const sizeBuf = [512];
      const success = apis.QueryFullProcessImageNameW(hProcess, 0, pathBuf, sizeBuf);
      const fullPath = success > 0 ? pathBuf.toString('utf16le', 0, sizeBuf[0] * 2) : '';
      const processName = fullPath ? path.basename(fullPath) : '';

      return {
        hwnd: String(hwnd),
        title,
        pid,
        processName,
        processPath: fullPath,
      };
    } finally {
      apis.CloseHandle(hProcess);
    }
  } catch {
    return null;
  }
}

const COMMON_APP_PATTERNS = [
  { match: /code\.exe/i, keywords: ['code', 'vscode', 'developer', 'dev'] },
  { match: /photoshop\.exe/i, keywords: ['photoshop', 'photo', 'retouch', 'adobe'] },
  { match: /premiere\.exe/i, keywords: ['premiere', 'video', 'editing', 'pr'] },
  { match: /afterfx\.exe/i, keywords: ['aftereffects', 'ae', 'motion', 'vfx'] },
  { match: /blender\.exe/i, keywords: ['blender', '3d', 'modeling'] },
  { match: /figma\.exe/i, keywords: ['figma', 'design', 'ui'] },
  { match: /obs64\.exe|obs32\.exe/i, keywords: ['obs', 'stream', 'twitch', 'broadcast'] },
  { match: /discord\.exe/i, keywords: ['discord', 'chat'] },
  { match: /spotify\.exe/i, keywords: ['spotify', 'music', 'media'] },
  { match: /chrome\.exe/i, keywords: ['chrome', 'browser', 'web'] },
  { match: /excel\.exe/i, keywords: ['excel', 'spreadsheet', 'office', 'data'] },
];

function matchProfileForApplication(windowInfo, profiles = [], customRules = []) {
  if (!windowInfo || !Array.isArray(profiles) || profiles.length === 0) return null;
  const proc = (windowInfo.processName || '').toLowerCase();
  const title = (windowInfo.title || '').toLowerCase();

  // Ignore our own application window
  if (proc.includes('node studio') || proc.includes('electron') || title.includes('node studio')) {
    return null;
  }

  // 1. Explicit user custom mapping rules (highest priority)
  if (Array.isArray(customRules)) {
    for (const rule of customRules) {
      if (!rule || !rule.enabled) continue;
      const ruleProc = (rule.processPattern || '').toLowerCase().trim();
      const ruleTitle = (rule.titlePattern || '').toLowerCase().trim();
      if (!ruleProc && !ruleTitle) continue;

      const procMatches = !ruleProc || proc.includes(ruleProc);
      const titleMatches = !ruleTitle || title.includes(ruleTitle);

      if (procMatches && titleMatches) {
        const targetName = (rule.targetProfileName || '').toLowerCase();
        const targetIdx = profiles.findIndex(
          (p) => (p?.name || '').toLowerCase() === targetName
        );
        if (targetIdx !== -1) {
          return {
            profileIndex: targetIdx,
            profile: profiles[targetIdx],
            matchType: 'custom_rule',
          };
        }
      }
    }
  }

  // 2. Direct name match in profile titles
  for (let i = 0; i < profiles.length; i++) {
    const profName = (profiles[i]?.name || '').toLowerCase();
    if (!profName) continue;
    const baseProc = proc.replace(/\.exe$/i, '');
    if (baseProc && profName.includes(baseProc)) return { profileIndex: i, profile: profiles[i], matchType: 'process' };
    if (profName.length > 2 && title.includes(profName)) return { profileIndex: i, profile: profiles[i], matchType: 'title' };
  }

  // 2. Pattern keyword matching
  for (const pattern of COMMON_APP_PATTERNS) {
    if (pattern.match.test(proc)) {
      for (let i = 0; i < profiles.length; i++) {
        const profName = (profiles[i]?.name || '').toLowerCase();
        for (const kw of pattern.keywords) {
          if (profName.includes(kw)) {
            return { profileIndex: i, profile: profiles[i], matchType: 'keyword' };
          }
        }
      }
    }
  }

  return null;
}

function createActiveWindowTracker({
  onActiveWindowChange,
  intervalMs = 1200,
  apis = initWin32Apis(),
} = {}) {
  let lastSignature = '';
  let timer = null;

  const tick = () => {
    const info = getActiveWindowDetails(apis);
    if (!info) return;
    const signature = `${info.processName}|${info.title}`;
    if (signature && signature !== lastSignature) {
      lastSignature = signature;
      if (typeof onActiveWindowChange === 'function') {
        onActiveWindowChange(info);
      }
    }
  };

  const start = () => {
    if (timer !== null) return;
    timer = setInterval(tick, intervalMs);
  };

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  return {
    start,
    stop,
    tick,
    getLastDetails: () => lastSignature,
  };
}

module.exports = {
  initWin32Apis,
  getActiveWindowDetails,
  matchProfileForApplication,
  createActiveWindowTracker,
  COMMON_APP_PATTERNS,
};
