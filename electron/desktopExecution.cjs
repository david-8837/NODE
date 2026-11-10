'use strict';

const { spawn: nodeSpawn, execFile: nodeExecFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const MAX_ACTION_TEXT = 32 * 1024;
const MAX_SEQUENCE_STEPS = 256;
const MAX_DELAY_MS = 60_000;
const MAX_SEQUENCE_DURATION_MS = 120_000;
const MAX_COMMAND_TIMEOUT_MS = 30_000;

const KEY_ALIASES = Object.freeze({
  win: 0x5b,
  windows: 0x5b,
  'windows key': 0x5b,
  lwin: 0x5b,
  'left win': 0x5b,
  rwin: 0x5c,
  'right win': 0x5c,
  gui: 0x5b,
  cmd: 0x5b,
  command: 0x5b,
  meta: 0x5b,
  super: 0x5b,
  ctrl: 0x11,
  control: 0x11,
  lctrl: 0xa2,
  'left ctrl': 0xa2,
  rctrl: 0xa3,
  'right ctrl': 0xa3,
  alt: 0x12,
  lalt: 0xa4,
  'left alt': 0xa4,
  ralt: 0xa5,
  'right alt': 0xa5,
  option: 0x12,
  shift: 0x10,
  lshift: 0xa0,
  'left shift': 0xa0,
  rshift: 0xa1,
  'right shift': 0xa1,
  enter: 0x0d,
  return: 0x0d,
  esc: 0x1b,
  escape: 0x1b,
  tab: 0x09,
  space: 0x20,
  'space bar': 0x20,
  spc: 0x20,
  backspace: 0x08,
  bksp: 0x08,
  back: 0x08,
  delete: 0x2e,
  del: 0x2e,
  insert: 0x2d,
  ins: 0x2d,
  home: 0x24,
  end: 0x23,
  pageup: 0x21,
  pgup: 0x21,
  'page up': 0x21,
  pagedown: 0x22,
  pgdn: 0x22,
  'page down': 0x22,
  up: 0x26,
  arrowup: 0x26,
  'arrow up': 0x26,
  down: 0x28,
  arrowdown: 0x28,
  'arrow down': 0x28,
  left: 0x25,
  arrowleft: 0x25,
  'arrow left': 0x25,
  right: 0x27,
  arrowright: 0x27,
  'arrow right': 0x27,
  tilde: 0xc0,
  backtick: 0xc0,
  '`': 0xc0,
  backslash: 0xdc,
  '\\': 0xdc,
  slash: 0xbf,
  '/': 0xbf,
  minus: 0xbd,
  '-': 0xbd,
  underscore: 0xbd,
  equal: 0xbb,
  equals: 0xbb,
  '=': 0xbb,
  plus: 0xbb,
  '[': 0xdb,
  'left bracket': 0xdb,
  ']': 0xdd,
  'right bracket': 0xdd,
  ';': 0xba,
  semicolon: 0xba,
  quote: 0xde,
  apostrophe: 0xde,
  "'": 0xde,
  ',': 0xbc,
  comma: 0xbc,
  '.': 0xbe,
  period: 0xbe,
  capslock: 0x14,
  'caps lock': 0x14,
  numlock: 0x90,
  'num lock': 0x90,
  scrolllock: 0x91,
  'scroll lock': 0x91,
  pause: 0x13,
  break: 0x13,
  printscreen: 0x2c,
  prtscr: 0x2c,
  'print screen': 0x2c,
  volumeup: 0xaf,
  volup: 0xaf,
  'volume up': 0xaf,
  'volume +': 0xaf,
  'vol +': 0xaf,
  'volume+': 0xaf,
  'vol+': 0xaf,
  kc_volu: 0xaf,
  volumedown: 0xae,
  voldown: 0xae,
  'volume down': 0xae,
  'volume -': 0xae,
  'vol -': 0xae,
  'volume-': 0xae,
  'vol-': 0xae,
  kc_vold: 0xae,
  mute: 0xad,
  'audio mute': 0xad,
  'media mute': 0xad,
  kc_mute: 0xad,
  play: 0xb3,
  pausemedia: 0xb3,
  'play/pause': 0xb3,
  'play / pause': 0xb3,
  'media play': 0xb3,
  next: 0xb0,
  'next track': 0xb0,
  prev: 0xb1,
  'prev track': 0xb1,
  'previous track': 0xb1,
  stop: 0xb2,
  'media stop': 0xb2,
  power: 0x5e,
  sleep: 0x5f,
  wake: 0x63,
  'browser back': 0xa6,
  'browser forward': 0xa7,
  'browser refresh': 0xa8,
  'browser stop': 0xa9,
  'browser search': 0xaa,
  'browser favorites': 0xab,
  'browser home': 0xac,
  'launch mail': 0xb4,
  'launch media': 0xb5,
  'launch app 1': 0xb6,
  'launch app 2': 0xb7,
  'num 0': 0x60,
  'num 1': 0x61,
  'num 2': 0x62,
  'num 3': 0x63,
  'num 4': 0x64,
  'num 5': 0x65,
  'num 6': 0x66,
  'num 7': 0x67,
  'num 8': 0x68,
  'num 9': 0x69,
  'num +': 0x6b,
  'num -': 0x6d,
  'num *': 0x6a,
  'num /': 0x6f,
  'num .': 0x6e,
  'num enter': 0x0d,
});

const SHIFTED_SYMBOLS = Object.freeze({
  '!': '1',
  '@': '2',
  '#': '3',
  '$': '4',
  '%': '5',
  '^': '6',
  '&': '7',
  '*': '8',
  '(': '9',
  ')': '0',
  '_': '-',
  '+': '=',
  '{': '[',
  '}': ']',
  '|': '\\',
  ':': ';',
  '"': "'",
  '~': '`',
  '<': ',',
  '>': '.',
  '?': '/',
});

const PUNCTUATION_KEYS = Object.freeze({
  '`': 0xc0,
  '-': 0xbd,
  '=': 0xbb,
  '[': 0xdb,
  ']': 0xdd,
  '\\': 0xdc,
  ';': 0xba,
  "'": 0xde,
  ',': 0xbc,
  '.': 0xbe,
  '/': 0xbf,
});

const EXTENDED_KEYS = new Set([
  0x13, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x2c, 0x2d, 0x2e,
  0x5b, 0x5c, 0x5e, 0x5f, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8,
  0xa9, 0xaa, 0xab, 0xac, 0xad, 0xae, 0xaf, 0xb0, 0xb1, 0xb2, 0xb3,
  0xb4, 0xb5, 0xb6, 0xb7,
]);
const MODIFIER_KEYS = new Set([
  0x10, 0x11, 0x12, 0x5b, 0x5c, 0xa0, 0xa1, 0xa2, 0xa3, 0xa4, 0xa5,
]);
const BLOCKED_COMMANDS = new Set([
  'cmd', 'cmd.exe', 'command.com', 'powershell', 'powershell.exe', 'pwsh', 'pwsh.exe',
  'wscript', 'wscript.exe', 'cscript', 'cscript.exe', 'rundll32', 'rundll32.exe',
  'reg', 'reg.exe', 'regedit', 'regedit.exe', 'diskpart', 'diskpart.exe', 'format', 'format.com',
  'shutdown', 'shutdown.exe', 'restart-computer', 'stop-computer', 'remove-item', 'del', 'erase',
  'rmdir', 'rd', 'bcdedit', 'bcdedit.exe', 'taskkill', 'taskkill.exe', 'wmic', 'wmic.exe',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function canonicalKeyName(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

const DISPLAY_BRIGHTNESS_ACTIONS = Object.freeze({
  'bright up': 'up',
  'brightness up': 'up',
  'brightness +': 'up',
  'bright down': 'down',
  'brightness down': 'down',
  'brightness -': 'down',
});

function displayBrightnessDirection(value) {
  return DISPLAY_BRIGHTNESS_ACTIONS[canonicalKeyName(value)] || null;
}

function parseKeyCombo(rawValue) {
  if (typeof rawValue !== 'string') return { ok: false, error: 'Key binding must be text' };
  const raw = rawValue.trim();
  if (!raw) return { ok: false, error: 'Empty key binding' };
  if (raw.length > 256) return { ok: false, error: 'Key binding is too long' };

  const addToken = (token, output) => {
    const name = canonicalKeyName(token);
    if (!name) return { ok: true };
    if (name === 'mod') {
      output.push({ vk: 0x11, name: 'ctrl', extended: false });
      return { ok: true };
    }
    if (Object.prototype.hasOwnProperty.call(KEY_ALIASES, name)) {
      const vk = KEY_ALIASES[name];
      output.push({ vk, name, extended: EXTENDED_KEYS.has(vk) });
      return { ok: true };
    }
    if (/^f(?:[1-9]|1[0-2])$/.test(name)) {
      const vk = 0x70 + Number(name.slice(1)) - 1;
      output.push({ vk, name, extended: false });
      return { ok: true };
    }
    if (/^f(?:1[3-9]|2[0-4])$/.test(name)) {
      const vk = 0x7c + Number(name.slice(1)) - 13;
      output.push({ vk, name, extended: false });
      return { ok: true };
    }
    if (/^[a-z]$/.test(name)) {
      output.push({ vk: name.toUpperCase().charCodeAt(0), name, extended: false });
      return { ok: true };
    }
    if (/^[0-9]$/.test(name)) {
      output.push({ vk: name.charCodeAt(0), name, extended: false });
      return { ok: true };
    }
    if (Object.prototype.hasOwnProperty.call(PUNCTUATION_KEYS, name)) {
      const vk = PUNCTUATION_KEYS[name];
      output.push({ vk, name, extended: false });
      return { ok: true };
    }
    return { ok: false, error: `Unsupported key: ${token}` };
  };

  const appendPrintable = (value, output) => {
    if (SHIFTED_SYMBOLS[value] !== undefined) {
      output.push({ vk: 0x10, name: 'shift', extended: false });
      return addToken(SHIFTED_SYMBOLS[value], output);
    }
    return addToken(value, output);
  };

  const isKnownToken = (value) => {
    const name = canonicalKeyName(value);
    return Boolean(
      name &&
      (name === 'mod' ||
        Object.prototype.hasOwnProperty.call(KEY_ALIASES, name) ||
        Object.prototype.hasOwnProperty.call(PUNCTUATION_KEYS, name) ||
        /^[a-z0-9]$/.test(name) ||
        /^f(?:[1-9]|1[0-2])$/.test(name) ||
        /^f(?:1[3-9]|2[0-4])$/.test(name) ||
        /^[~`!@#$%^&*()_+{}|:\"<>?]$/.test(name))
    );
  };

  const appendGroup = (group, output) => {
    const name = canonicalKeyName(group);
    if (isKnownToken(name)) return appendPrintable(name, output);
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length > 1 && parts.every(isKnownToken)) {
      for (const part of parts) {
        const result = appendPrintable(part, output);
        if (!result.ok) return result;
      }
      return { ok: true };
    }
    return { ok: false, error: `Unsupported key: ${group.trim()}` };
  };

  const parsed = [];
  let expression = raw;
  if (expression.length > 2 && expression.startsWith('(') && expression.endsWith(')')) {
    expression = expression.slice(1, -1).trim();
  }
  const directName = canonicalKeyName(expression);
  if (Object.prototype.hasOwnProperty.call(KEY_ALIASES, directName)) {
    const result = addToken(directName, parsed);
    if (!result.ok) return result;
  } else {
    // A trailing plus is a real key when it follows a chord, e.g. Ctrl + +.
    const plusChord = expression.match(/^(.*\S)\s*\+\s*\+\s*$/);
    const hasChordSeparator = expression.includes('+') && !plusChord;
    if ((!hasChordSeparator || expression.length === 1) && !plusChord && isKnownToken(directName)) {
      const result = appendPrintable(directName, parsed);
      if (!result.ok) return result;
    } else {
      const groups = (plusChord ? plusChord[1] : expression).split('+');
      for (const group of groups) {
        if (!group.trim()) return { ok: false, error: `Unsupported key: ${group}` };
        const result = appendGroup(group, parsed);
        if (!result.ok) return result;
      }
      if (plusChord) {
        const result = appendPrintable('+', parsed);
        if (!result.ok) return result;
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const key of parsed) {
    if (seen.has(key.vk)) continue;
    seen.add(key.vk);
    unique.push(key);
  }
  if (unique.length === 0) return { ok: false, error: `Could not parse keys from: ${raw}` };
  if (unique.length > 8) return { ok: false, error: 'A key combination cannot contain more than eight keys' };

  const modifiers = unique.filter((key) => MODIFIER_KEYS.has(key.vk));
  const ordinary = unique.filter((key) => !MODIFIER_KEYS.has(key.vk));
  return { ok: true, keys: [...modifiers, ...ordinary] };
}

function parseShortcutToVK(rawValue) {
  const parsed = parseKeyCombo(rawValue);
  return parsed.ok ? parsed.keys.map((key) => key.vk) : [];
}

function boundedDelay(value, fieldName = 'Delay') {
  if (value === undefined || value === null || value === '') return 0;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > MAX_DELAY_MS) {
    throw new Error(`${fieldName} must be between 0 and ${MAX_DELAY_MS} milliseconds`);
  }
  return Math.round(number);
}

function normalizeKeyMode(mode) {
  const value = String(mode || 'press-release').toLowerCase();
  if (value === 'down' || value === 'key-down') return 'press';
  if (value === 'up' || value === 'key-up') return 'release';
  if (value === 'tap') return 'press-release';
  return value;
}

function createKeyOperation(keys, mode = 'press-release', delayAfterMs = 0) {
  const normalizedMode = normalizeKeyMode(mode);
  if (!['press-release', 'press', 'release'].includes(normalizedMode)) {
    throw new Error(`Unsupported key event mode: ${mode}`);
  }
  const ordered = normalizedMode === 'release' ? [...keys].reverse() : keys;
  const events = [];
  if (normalizedMode === 'press-release') {
    for (const key of ordered) events.push({ vk: key.vk, extended: key.extended, mode: 'down' });
    for (const key of [...ordered].reverse()) events.push({ vk: key.vk, extended: key.extended, mode: 'up' });
  } else {
    for (const key of ordered) {
      events.push({
        vk: key.vk,
        extended: key.extended,
        mode: normalizedMode === 'press' ? 'down' : 'up',
      });
    }
  }
  return { kind: 'keys', events, delayAfterMs };
}

function estimateOperationDuration(operations) {
  return operations.reduce((sum, operation) => {
    if (operation.kind === 'wait') return sum + operation.durationMs;
    const textLength = operation.kind === 'text' ? [...operation.text].length : 0;
    return sum + boundedDelay(operation.delayAfterMs) + textLength * boundedDelay(operation.interKeyDelayMs);
  }, 0);
}

function parseSequenceSteps(steps) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { ok: false, error: 'A sequence must contain at least one step' };
  }
  if (steps.length > MAX_SEQUENCE_STEPS) {
    return { ok: false, error: `A sequence cannot contain more than ${MAX_SEQUENCE_STEPS} steps` };
  }

  try {
    const operations = [];
    let totalTextLength = 0;
    for (const [index, step] of steps.entries()) {
      if (typeof step === 'string') {
        const parsed = parseKeyCombo(step);
        if (!parsed.ok) throw new Error(`Sequence step ${index + 1}: ${parsed.error}`);
        operations.push(createKeyOperation(parsed.keys));
        continue;
      }
      if (!isRecord(step)) throw new Error(`Sequence step ${index + 1} is invalid`);
      const kind = String(step.kind || step.type || 'key').toLowerCase();
      const delayAfterMs = boundedDelay(step.delayAfterMs, `Step ${index + 1} delay`);
      if (kind === 'wait' || kind === 'delay') {
        const durationMs = boundedDelay(step.durationMs ?? step.value, `Step ${index + 1} wait`);
        operations.push({ kind: 'wait', durationMs, delayAfterMs: 0 });
        continue;
      }
      if (kind === 'text') {
        if (typeof step.value !== 'string' && typeof step.text !== 'string') {
          throw new Error(`Sequence step ${index + 1} text must be a string`);
        }
        const text = String(step.value ?? step.text ?? '');
        if (text.length > MAX_ACTION_TEXT) throw new Error(`Sequence text exceeds ${MAX_ACTION_TEXT} characters`);
        totalTextLength += text.length;
        if (totalTextLength > MAX_ACTION_TEXT) {
          throw new Error(`A sequence cannot contain more than ${MAX_ACTION_TEXT} total text characters`);
        }
        if (!text) continue;
        operations.push({
          kind: 'text',
          text,
          interKeyDelayMs: boundedDelay(step.interKeyDelayMs, `Step ${index + 1} text delay`),
          delayAfterMs,
        });
        continue;
      }
      if (kind !== 'key' && kind !== 'shortcut') {
        throw new Error(`Sequence step ${index + 1} has unsupported type: ${kind}`);
      }
      const value = String(step.key ?? step.keyLabel ?? step.value ?? step.binding ?? '').trim();
      const parsed = parseKeyCombo(value);
      if (!parsed.ok) throw new Error(`Sequence step ${index + 1}: ${parsed.error}`);
      operations.push(createKeyOperation(parsed.keys, step.mode || 'press-release', delayAfterMs));
    }

    if (operations.length === 0) return { ok: false, error: 'A sequence must contain at least one executable step' };
    if (estimateOperationDuration(operations) > MAX_SEQUENCE_DURATION_MS) {
      return { ok: false, error: `A sequence cannot exceed ${MAX_SEQUENCE_DURATION_MS} milliseconds` };
    }
    return { ok: true, operations };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const POWERSHELL_WORKER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Concurrent;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public static class NodeStudioNativeInput {
    [StructLayout(LayoutKind.Sequential)]
    private struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public UIntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct HARDWAREINPUT {
        public uint uMsg;
        public ushort wParamL;
        public ushort wParamH;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct INPUTUNION {
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct INPUT {
        public uint type;
        public INPUTUNION U;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public static void SendKey(int virtualKey, bool keyUp, bool extended) {
        if (virtualKey < 1 || virtualKey > 255) throw new ArgumentOutOfRangeException("virtualKey");
        uint flags = keyUp ? 0x0002u : 0u;
        if (extended) flags |= 0x0001u;
        INPUT input = new INPUT();
        input.type = 1;
        input.U.ki = new KEYBDINPUT {
            wVk = (ushort)virtualKey,
            wScan = 0,
            dwFlags = flags,
            time = 0,
            dwExtraInfo = UIntPtr.Zero
        };
        INPUT[] inputs = new INPUT[] { input };
        uint sent = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        if (sent != 1) {
            int error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "Windows SendInput rejected a keyboard event. The target may be elevated or the input desktop may be unavailable.");
        }
    }

    public static void SendUnicodeChar(ushort codeUnit) {
        INPUT down = new INPUT();
        down.type = 1;
        down.U.ki = new KEYBDINPUT { wVk = 0, wScan = codeUnit, dwFlags = 0x0004u, time = 0, dwExtraInfo = UIntPtr.Zero };
        INPUT up = new INPUT();
        up.type = 1;
        up.U.ki = new KEYBDINPUT { wVk = 0, wScan = codeUnit, dwFlags = 0x0006u, time = 0, dwExtraInfo = UIntPtr.Zero };
        INPUT[] inputs = new INPUT[] { down, up };
        uint sent = SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT)));
        if (sent != 2) {
            int error = Marshal.GetLastWin32Error();
            throw new Win32Exception(error, "Windows SendInput rejected Unicode text. The target may be elevated or the input desktop may be unavailable.");
        }
    }
}

public sealed class NodeStudioInputReader {
    private readonly ConcurrentQueue<string> lines = new ConcurrentQueue<string>();
    private readonly AutoResetEvent available = new AutoResetEvent(false);
    private volatile bool ended;

    public NodeStudioInputReader() {
        Thread readerThread = new Thread(() => {
            try {
                using (StreamReader reader = new StreamReader(Console.OpenStandardInput(), Encoding.UTF8, false)) {
                    string line;
                    while ((line = reader.ReadLine()) != null) {
                        lines.Enqueue(line);
                        available.Set();
                    }
                }
            } catch {}
            ended = true;
            available.Set();
        });
        readerThread.IsBackground = true;
        readerThread.Start();
    }

    public string TryRead() {
        string line;
        return lines.TryDequeue(out line) ? line : null;
    }

    public string Read() {
        while (true) {
            string line;
            if (lines.TryDequeue(out line)) return line;
            if (ended) return null;
            available.WaitOne();
        }
    }
}
'@ | Out-Null

$script:inputReader = New-Object NodeStudioInputReader
$script:pressed = @{}
$script:busy = $false
$script:cancelRequested = $false
$script:deferredLines = New-Object 'System.Collections.Generic.Queue[string]'

function Release-AllKeys {
    foreach ($entry in @($script:pressed.GetEnumerator())) {
        try { [NodeStudioNativeInput]::SendKey([int]$entry.Key, $true, [bool]$entry.Value) } catch {}
    }
    $script:pressed.Clear()
}

function Read-ControlLines {
    while ($true) {
        $line = $script:inputReader.TryRead()
        if ($null -eq $line) { break }
        if ([string]::IsNullOrWhiteSpace($line)) { continue }
        try {
            $message = ConvertFrom-Json -InputObject $line -ErrorAction Stop
            if ([string]$message.kind -eq 'cancel') {
                $script:cancelRequested = $true
            } else {
                $script:deferredLines.Enqueue($line)
            }
        } catch {}
    }
    if ($script:cancelRequested) {
        throw [System.OperationCanceledException]::new('Desktop input was cancelled because Simulation was disabled')
    }
}

function Wait-Cancelable([int]$durationMs) {
    $remaining = [Math]::Max(0, $durationMs)
    while ($remaining -gt 0) {
        Read-ControlLines
        $slice = [Math]::Min(15, $remaining)
        [System.Threading.Thread]::Sleep($slice)
        $remaining -= $slice
    }
    Read-ControlLines
}

function Set-DisplayBrightness([string]$direction) {
    if ($direction -ne 'up' -and $direction -ne 'down') {
        throw 'Unsupported display brightness direction'
    }

    $monitors = @(Get-CimInstance -Namespace 'root/WMI' -ClassName 'WmiMonitorBrightness' -ErrorAction Stop)
    $methods = @(Get-CimInstance -Namespace 'root/WMI' -ClassName 'WmiMonitorBrightnessMethods' -ErrorAction Stop)
    $controllableDisplays = 0

    foreach ($method in $methods) {
        $monitor = $monitors | Where-Object { [string]$_.InstanceName -eq [string]$method.InstanceName } | Select-Object -First 1
        if ($null -eq $monitor) { continue }

        $levels = @($monitor.Levels | ForEach-Object { [int]$_ } | Sort-Object -Unique)
        if ($levels.Count -eq 0) { continue }
        $controllableDisplays += 1
        $current = [int]$monitor.CurrentBrightness
        if ($direction -eq 'up') {
            $target = $levels | Where-Object { $_ -gt $current } | Sort-Object | Select-Object -First 1
        } else {
            $target = $levels | Where-Object { $_ -lt $current } | Sort-Object -Descending | Select-Object -First 1
        }
        if ($null -eq $target) { continue }

        $result = Invoke-CimMethod -InputObject $method -MethodName 'WmiSetBrightness' -Arguments @{
            Timeout = [uint32]1
            Brightness = [byte]$target
        } -ErrorAction Stop
        if ([int]$result.ReturnValue -ne 0) {
            throw "Windows rejected the display brightness change (WMI code $($result.ReturnValue))"
        }
    }

    if ($controllableDisplays -eq 0) {
        throw 'No WMI brightness-controllable display is available on this PC'
    }
}

[Console]::Out.WriteLine('{"id":"ready","ok":true}')
while ($true) {
    if ($script:deferredLines.Count -gt 0) {
        $line = $script:deferredLines.Dequeue()
    } else {
        $line = $script:inputReader.Read()
    }
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }

    $request = $null
    try { $request = ConvertFrom-Json -InputObject $line -ErrorAction Stop } catch { continue }
    $kind = [string]$request.kind
    if ($kind -eq 'cancel') {
        if (-not $script:busy) { Release-AllKeys }
        continue
    }
    if ($kind -eq 'releaseAll') {
        Release-AllKeys
        [Console]::Out.WriteLine((ConvertTo-Json -InputObject @{ id = [string]$request.id; ok = $true } -Compress))
        continue
    }

    $script:busy = $true
    $script:cancelRequested = $false
    try {
        foreach ($op in @($request.operations)) {
            Read-ControlLines
            $opKind = [string]$op.kind
            if ($opKind -eq 'keys') {
                foreach ($key in @($op.events)) {
                    Read-ControlLines
                    $vk = [int]$key.vk
                    $extended = [bool]$key.extended
                    $mode = [string]$key.mode
                    $keyId = [string]$vk
                    if ($mode -eq 'down') {
                        if (-not $script:pressed.ContainsKey($keyId)) {
                            [NodeStudioNativeInput]::SendKey($vk, $false, $extended)
                        }
                        $script:pressed[$keyId] = $extended
                    } elseif ($mode -eq 'up') {
                        [NodeStudioNativeInput]::SendKey($vk, $true, $extended)
                        $script:pressed.Remove($keyId)
                    } else {
                        throw "Unsupported native key event mode: $mode"
                    }
                }
            } elseif ($opKind -eq 'text') {
                $text = [string]$op.text
                $interval = [int]$op.interKeyDelayMs
                foreach ($character in $text.ToCharArray()) {
                    Read-ControlLines
                    [NodeStudioNativeInput]::SendUnicodeChar([uint16][char]$character)
                    if ($interval -gt 0) { Wait-Cancelable $interval }
                }
            } elseif ($opKind -eq 'wait') {
                Wait-Cancelable ([int]$op.durationMs)
            } elseif ($opKind -eq 'brightness') {
                Set-DisplayBrightness ([string]$op.direction)
            } else {
                throw "Unsupported native input operation: $opKind"
            }
            $delay = [int]$op.delayAfterMs
            if ($delay -gt 0) { Wait-Cancelable $delay }
        }
        [Console]::Out.WriteLine((ConvertTo-Json -InputObject @{ id = [string]$request.id; ok = $true } -Compress))
    } catch {
        Release-AllKeys
        [Console]::Out.WriteLine((ConvertTo-Json -InputObject @{ id = [string]$request.id; ok = $false; error = [string]$_.Exception.Message } -Compress))
    } finally {
        $script:busy = $false
        $script:cancelRequested = $false
    }
}

Release-AllKeys
`;

function createWindowsInputAdapter({
  platform = process.platform,
  spawnProcess = nodeSpawn,
  requestTimeoutMs = 30_000,
} = {}) {
  let child = null;
  let lineReader = null;
  let workerReady = null;
  let nextRequestId = 1;
  let inputQueue = Promise.resolve();
  let generation = 0;
  let closed = false;
  let recentStderr = '';
  const pending = new Map();
  const heldKeys = new Map();

  const rejectPending = (error) => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(error);
    }
    pending.clear();
  };

  const disposeWorker = (error) => {
    const oldChild = child;
    child = null;
    workerReady = null;
    if (lineReader) {
      lineReader.close();
      lineReader = null;
    }
    rejectPending(error || new Error('The Windows input worker stopped'));
    if (oldChild && oldChild.exitCode === null && !oldChild.killed) {
      try { oldChild.kill(); } catch {}
    }
  };

  const processWorkerLine = (line) => {
    let message;
    try { message = JSON.parse(line); } catch { return; }
    if (message?.id === 'ready') return;
    const id = String(message?.id ?? '');
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    if (message.ok === true) request.resolve({ success: true });
    else request.reject(new Error(String(message.error || 'Windows input failed')));
  };

  const ensureWorker = () => {
    if (closed) return Promise.reject(new Error('The Windows input worker is closed'));
    if (platform !== 'win32') {
      return Promise.reject(new Error('Windows desktop input is only available on Windows'));
    }
    if (workerReady) return workerReady;

    let resolveReady;
    let rejectReady;
    const readyPromise = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    workerReady = readyPromise;

    let settled = false;
    let startupTimer;
    try {
      const encodedScript = Buffer.from(POWERSHELL_WORKER_SCRIPT, 'utf16le').toString('base64');
      child = spawnProcess(
        'powershell.exe',
        ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedScript],
        { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
      );
    } catch (error) {
      workerReady = null;
      rejectReady(error);
      return readyPromise;
    }

    const currentChild = child;
    lineReader = readline.createInterface({ input: currentChild.stdout });
    lineReader.on('line', (line) => {
      let message;
      try { message = JSON.parse(line); } catch { return; }
      if (message?.id === 'ready') {
        if (!settled) {
          settled = true;
          clearTimeout(startupTimer);
          resolveReady();
        }
        return;
      }
      processWorkerLine(line);
    });

    currentChild.stderr.on('data', (chunk) => {
      recentStderr = `${recentStderr}${chunk.toString('utf8')}`.slice(-4000);
    });
    currentChild.once('error', (error) => {
      clearTimeout(startupTimer);
      if (!settled) {
        settled = true;
        rejectReady(error);
      }
      if (child === currentChild) disposeWorker(error);
    });
    currentChild.once('exit', (code, signal) => {
      clearTimeout(startupTimer);
      const codeText = signal || (code ?? 'unknown');
      const error = new Error(
        `The Windows input worker exited (${codeText})${recentStderr.trim() ? `: ${recentStderr.trim()}` : ''}`
      );
      if (!settled) {
        settled = true;
        rejectReady(error);
      }
      if (child === currentChild) disposeWorker(error);
    });

    startupTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = new Error('The Windows input worker did not start in time');
      rejectReady(error);
      if (child === currentChild) disposeWorker(error);
    }, requestTimeoutMs);
    return readyPromise;
  };

  const writeWorkerMessage = (message, timeoutMs = requestTimeoutMs) => {
    const currentChild = child;
    if (!currentChild || !currentChild.stdin || currentChild.stdin.destroyed) {
      return Promise.reject(new Error('The Windows input worker is not available'));
    }
    const id = String(message.id ?? nextRequestId++);
    const serialized = JSON.stringify({ ...message, id });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        const error = new Error('Timed out waiting for Windows to execute the input sequence');
        reject(error);
        if (child === currentChild) disposeWorker(error);
      }, Math.min(Math.max(timeoutMs, 1000), 120_000));
      pending.set(id, { resolve, reject, timer });
      currentChild.stdin.write(`${serialized}\n`, (error) => {
        if (!error) return;
        const request = pending.get(id);
        if (!request) return;
        pending.delete(id);
        clearTimeout(request.timer);
        request.reject(error);
      });
    });
  };

  const updateHeldKeyEstimate = (operations) => {
    for (const operation of operations) {
      if (operation.kind !== 'keys') continue;
      for (const event of operation.events) {
        const key = `${event.vk}`;
        if (event.mode === 'down') heldKeys.set(key, Boolean(event.extended));
        if (event.mode === 'up') heldKeys.delete(key);
      }
    }
  };

  const sendOperations = (operations) => {
    if (!Array.isArray(operations) || operations.length === 0) {
      return Promise.reject(new Error('There are no native input operations to send'));
    }
    const expectedGeneration = generation;
    const run = inputQueue.then(async () => {
      if (closed || expectedGeneration !== generation) {
        throw new Error('Desktop input was cancelled because Simulation was disabled');
      }
      await ensureWorker();
      if (closed || expectedGeneration !== generation) {
        throw new Error('Desktop input was cancelled because Simulation was disabled');
      }
      const estimate = estimateOperationDuration(operations);
      if (estimate > MAX_SEQUENCE_DURATION_MS) {
        throw new Error(`A sequence cannot exceed ${MAX_SEQUENCE_DURATION_MS} milliseconds`);
      }
      const result = await writeWorkerMessage({ kind: 'action', operations }, Math.max(requestTimeoutMs, estimate + 10_000));
      updateHeldKeyEstimate(operations);
      return result;
    });
    inputQueue = run.catch(() => undefined);
    return run;
  };

  const cancelAll = () => {
    generation += 1;
    if (!child || !child.stdin || child.stdin.destroyed) {
      heldKeys.clear();
      return Promise.resolve({ success: true });
    }
    try {
      child.stdin.write(`${JSON.stringify({ kind: 'cancel' })}\n`);
    } catch {}

    const queued = inputQueue.then(async () => {
      if (closed) return { success: true };
      if (!child) {
        heldKeys.clear();
        return { success: true };
      }
      await ensureWorker();
      const response = await writeWorkerMessage({ kind: 'releaseAll' });
      heldKeys.clear();
      return response;
    });
    inputQueue = queued.catch(() => undefined);
    return queued;
  };

  const close = async () => {
    if (closed) return;
    try { await cancelAll(); } catch {}
    closed = true;
    generation += 1;
    const currentChild = child;
    child = null;
    workerReady = null;
    rejectPending(new Error('Windows input worker closed'));
    if (lineReader) {
      lineReader.close();
      lineReader = null;
    }
    if (currentChild) {
      try { currentChild.stdin?.end(); } catch {}
      try { currentChild.kill(); } catch {}
    }
    await inputQueue.catch(() => undefined);
  };

  return { sendOperations, cancelAll, close };
}

function parseCommandLine(value, platform = process.platform) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Empty command');
  if (value.length > 4096) throw new Error('Command line is too long');
  if (/[\u0000-\u001f\u007f;&|<>`$%]/.test(value)) {
    throw new Error('Command contains restricted control or shell characters');
  }

  const parts = [];
  let current = '';
  let quote = null;
  let tokenStarted = false;
  const text = value.trim();
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '\\' && quote === '"' && (next === '"' || next === '\\')) {
      current += next;
      index += 1;
      tokenStarted = true;
      continue;
    }
    if ((character === '"' || character === "'") && (!quote || quote === character)) {
      quote = quote ? null : character;
      tokenStarted = true;
      continue;
    }
    if (/\s/.test(character) && !quote) {
      if (tokenStarted) {
        parts.push(current);
        current = '';
        tokenStarted = false;
      }
      continue;
    }
    current += character;
    tokenStarted = true;
  }
  if (quote) throw new Error('Command contains an unmatched quote');
  if (tokenStarted) parts.push(current);
  if (parts.length === 0) throw new Error('Empty command');

  const pathApi = platform === 'win32' ? path.win32 : path;
  const executable = parts[0].toLowerCase();
  if (BLOCKED_COMMANDS.has(executable) || BLOCKED_COMMANDS.has(pathApi.basename(executable).toLowerCase())) {
    throw new Error(`Command "${parts[0]}" is blocked for safety`);
  }
  return parts;
}

function safePathExists(filePath, fsModule = fs) {
  try {
    return fsModule.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveApplicationPath(value, {
  platform = process.platform,
  env = process.env,
  fsModule = fs,
} = {}) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Application target is empty');
  if (raw.length > 2048) throw new Error('Application path is too long');
  if (/[\u0000-\u001f\u007f]/.test(raw)) throw new Error('Application path contains control characters');

  const pathApi = platform === 'win32' ? path.win32 : path;
  const programFiles = env.PROGRAMFILES || 'C:\\Program Files';
  const programFilesX86 = env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
  const localAppData = env.LOCALAPPDATA || '';
  const candidates = {
    calculator: ['calc.exe'],
    calc: ['calc.exe'],
    notepad: ['notepad.exe'],
    explorer: ['explorer.exe'],
    'file explorer': ['explorer.exe'],
    'task manager': ['taskmgr.exe'],
    taskmgr: ['taskmgr.exe'],
    chrome: [
      pathApi.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      pathApi.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      pathApi.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    'google chrome': [
      pathApi.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      pathApi.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      pathApi.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    edge: [
      pathApi.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      pathApi.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ],
    firefox: [
      pathApi.join(programFiles, 'Mozilla Firefox', 'firefox.exe'),
      pathApi.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe'),
    ],
    'visual studio code': [
      pathApi.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      pathApi.join(programFiles, 'Microsoft VS Code', 'Code.exe'),
    ],
    'vs code': [
      pathApi.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      pathApi.join(programFiles, 'Microsoft VS Code', 'Code.exe'),
    ],
    code: [
      pathApi.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      pathApi.join(programFiles, 'Microsoft VS Code', 'Code.exe'),
    ],
    spotify: [
      pathApi.join(env.APPDATA || '', 'Spotify', 'Spotify.exe'),
      pathApi.join(localAppData, 'Microsoft', 'WindowsApps', 'Spotify.exe'),
    ],
  };

  if (pathApi.isAbsolute(raw)) {
    if (pathApi.extname(raw).toLowerCase() !== '.exe') {
      throw new Error('Application path must point to an .exe file');
    }
    if (!safePathExists(raw, fsModule)) throw new Error(`Application was not found: ${raw}`);
    return raw;
  }

  const alias = raw.toLowerCase().replace(/\.exe$/i, '').trim();
  const systemAliases = {
    calc: 'calc.exe', calculator: 'calc.exe', notepad: 'notepad.exe',
    explorer: 'explorer.exe', 'file explorer': 'explorer.exe',
    taskmgr: 'taskmgr.exe', 'task manager': 'taskmgr.exe',
  };
  if (platform === 'win32' && systemAliases[alias]) return systemAliases[alias];
  const paths = candidates[alias];
  if (!paths) {
    throw new Error(`Application "${raw}" is not a supported alias. Enter the full path to its .exe file.`);
  }
  const found = paths.find((candidate) => candidate && safePathExists(candidate, fsModule));
  if (!found) throw new Error(`Could not find an installed application for "${raw}"`);
  return found;
}

function resolveApplicationShortcutPath(value, {
  platform = process.platform,
  fsModule = fs,
} = {}) {
  if (platform !== 'win32') {
    throw new Error('Installed application shortcuts are only supported on Windows');
  }

  const raw = String(value || '').trim();
  const pathApi = path.win32;
  if (!raw) throw new Error('Application shortcut path is empty');
  if (raw.length > 2048) throw new Error('Application shortcut path is too long');
  if (/[\u0000-\u001f\u007f]/.test(raw)) {
    throw new Error('Application shortcut path contains control characters');
  }
  if (!pathApi.isAbsolute(raw) || pathApi.extname(raw).toLowerCase() !== '.lnk') {
    throw new Error('Application shortcut path must point to an absolute .lnk file');
  }
  if (!safePathExists(raw, fsModule)) throw new Error(`Application shortcut was not found: ${raw}`);
  return pathApi.normalize(raw);
}

function validateUrl(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 4096) {
    throw new Error('URL is empty or too long');
  }
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
  } catch {
    throw new Error('Invalid website URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Only HTTP and HTTPS URLs without credentials are allowed');
  }
  if (!url.hostname || /[\u0000-\u0020\u007f]/.test(url.hostname)) {
    throw new Error('Website URL has an invalid host');
  }
  return url.href;
}

function normalizePayload(payload) {
  if (!isRecord(payload)) return { ok: false, error: 'Invalid payload: expected an object' };
  try {
    if (isRecord(payload.execution)) {
      const definition = payload.execution;
      if (definition.kind === 'shortcut') {
        payload = { ...payload, type: 'Shortcut', value: definition.value };
      } else if (definition.kind === 'sequence') {
        payload = { ...payload, type: 'Sequence', steps: definition.steps };
      } else if (definition.kind === 'smart') {
        payload = {
          ...payload,
          type: definition.actionType || definition.type,
          value: definition.value,
          requiresConsent: definition.requiresConsent === true,
          applicationShortcutPath: definition.applicationShortcutPath,
          arguments: definition.arguments,
          workingDirectory: definition.workingDirectory,
        };
      }
    }

    const type = String(payload.type || payload.actionType || 'Shortcut').trim();
    const value = typeof payload.value === 'string'
      ? payload.value
      : typeof payload.binding === 'string'
        ? payload.binding
        : typeof payload.keys === 'string'
          ? payload.keys
          : '';

    if (['Shortcut', 'Key', 'Basic input'].includes(type)) {
      const brightnessDirection = displayBrightnessDirection(value);
      if (brightnessDirection) {
        return {
          ok: true,
          operations: [{ kind: 'brightness', direction: brightnessDirection, delayAfterMs: 0 }],
        };
      }
      const parsed = parseKeyCombo(value);
      if (!parsed.ok) return parsed;
      return { ok: true, operations: [createKeyOperation(parsed.keys)] };
    }

    if (type === 'Sequence' || type === 'BasicAction') return parseSequenceSteps(payload.steps);

    if (type === 'Text') {
      if (!value.length) return { ok: false, error: 'Text action is empty' };
      if (value.length > MAX_ACTION_TEXT) return { ok: false, error: `Text action exceeds ${MAX_ACTION_TEXT} characters` };
      const operations = [{
        kind: 'text',
        text: value,
        interKeyDelayMs: boundedDelay(payload.interKeyDelayMs, 'Text delay'),
        delayAfterMs: boundedDelay(payload.delayAfterMs, 'Text delay'),
      }];
      if (payload.appendEnter === true) {
        const enter = parseKeyCombo('Enter');
        operations.push(createKeyOperation(enter.keys));
      }
      if (estimateOperationDuration(operations) > MAX_SEQUENCE_DURATION_MS) {
        return { ok: false, error: `A text action cannot exceed ${MAX_SEQUENCE_DURATION_MS} milliseconds` };
      }
      return { ok: true, operations };
    }

    if (type === 'Web') {
      try { return { ok: true, smartAction: { type, value: validateUrl(value) } }; }
      catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    }

    if (type === 'App') {
      let applicationShortcutPath;
      if (payload.applicationShortcutPath !== undefined) {
        if (
          typeof payload.applicationShortcutPath !== 'string' ||
          !payload.applicationShortcutPath.trim() ||
          payload.applicationShortcutPath.length > 2048
        ) {
          return { ok: false, error: 'Application shortcut path is invalid' };
        }
        applicationShortcutPath = payload.applicationShortcutPath.trim();
      }
      return {
        ok: true,
        smartAction: {
          type,
          value,
          ...(applicationShortcutPath ? { applicationShortcutPath } : {}),
        },
      };
    }

    if (type === 'Cmd') {
      if (!value.trim()) return { ok: false, error: 'Empty command' };
      return {
        ok: true,
        smartAction: { type, value, requiresConsent: payload.requiresConsent === true },
      };
    }

    return { ok: false, error: `Unsupported desktop action type: ${type}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function createDesktopActionExecutor({
  platform = process.platform,
  inputAdapter = null,
  spawnProcess = nodeSpawn,
  execFile = nodeExecFile,
  openExternal = null,
  openApplicationShortcut = null,
  fsModule = fs,
  env = process.env,
} = {}) {
  const input = inputAdapter || createWindowsInputAdapter({ platform, spawnProcess });
  let simulationEnabled = false;
  let generation = 0;
  let closed = false;
  const activeCommands = new Set();

  const requireCurrentSimulation = (startedGeneration) => {
    if (closed) throw new Error('The desktop action executor is closed');
    if (!simulationEnabled || startedGeneration !== generation) {
      throw new Error('Simulation is disabled; no desktop action was executed');
    }
  };

  const runExecutable = (command, args, options = {}) => new Promise((resolve) => {
    let child;
    let settled = false;
    const timeoutMs = Math.min(Math.max(Number(options.timeoutMs) || 10_000, 1000), MAX_COMMAND_TIMEOUT_MS);
    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (child) activeCommands.delete(child);
      resolve(result);
    };
    try {
      child = execFile(command, args, {
        shell: false,
        windowsHide: true,
        timeout: timeoutMs,
        cwd: options.cwd,
        maxBuffer: 256 * 1024,
      }, (error, stdout, stderr) => {
        if (error) {
          finish({ success: false, error: String(error.message || error) });
          return;
        }
        finish({
          success: true,
          message: String(stdout || '').trim() || String(stderr || '').trim() || 'Command completed',
        });
      });
      if (child && typeof child.kill === 'function') activeCommands.add(child);
    } catch (error) {
      finish({ success: false, error: String(error.message || error) });
    }
  });

  const launchExecutable = (filePath, args = [], cwd) => new Promise((resolve) => {
    let processHandle;
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      try { processHandle?.unref?.(); } catch {}
      finish({ success: true, message: `Started ${path.basename(filePath)}` });
    }, 1500);
    try {
      processHandle = spawnProcess(filePath, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        cwd: cwd || path.dirname(filePath),
        shell: false,
      });
    } catch (error) {
      finish({ success: false, error: String(error.message || error) });
      return;
    }
    processHandle.once('error', (error) => {
      finish({ success: false, error: String(error.message || error) });
    });
    processHandle.once('spawn', () => {
      try { processHandle.unref?.(); } catch {}
      finish({ success: true, message: `Started ${path.basename(filePath)}` });
    });
  });

  const openUrl = async (url, startedGeneration) => {
    const safeUrl = validateUrl(url);
    requireCurrentSimulation(startedGeneration);
    try {
      if (typeof openExternal === 'function') {
        await openExternal(safeUrl);
      } else if (platform === 'win32') {
        const result = await runExecutable('rundll32.exe', ['url.dll,FileProtocolHandler', safeUrl]);
        if (!result.success) return result;
      } else if (platform === 'darwin') {
        const result = await runExecutable('open', [safeUrl]);
        if (!result.success) return result;
      } else {
        const result = await runExecutable('xdg-open', [safeUrl]);
        if (!result.success) return result;
      }
      requireCurrentSimulation(startedGeneration);
      return { success: true, message: `Opened ${safeUrl}` };
    } catch (error) {
      return { success: false, error: String(error.message || error) };
    }
  };

  const execute = async (payload, options = {}) => {
    if (!simulationEnabled || closed) {
      return { success: false, error: 'Simulation is disabled; no desktop action was executed' };
    }
    const startedGeneration = generation;
    const normalized = normalizePayload(payload);
    if (!normalized.ok) return { success: false, error: normalized.error };

    if (normalized.smartAction?.type === 'Web') {
      return openUrl(normalized.smartAction.value, startedGeneration);
    }

    if (normalized.smartAction?.type === 'App') {
      try {
        requireCurrentSimulation(startedGeneration);
        if (normalized.smartAction.applicationShortcutPath) {
          const shortcutPath = resolveApplicationShortcutPath(
            normalized.smartAction.applicationShortcutPath,
            { platform, fsModule },
          );
          if (typeof openApplicationShortcut !== 'function') {
            return { success: false, error: 'Installed application shortcuts cannot be opened in this desktop environment' };
          }
          const result = await openApplicationShortcut(shortcutPath);
          requireCurrentSimulation(startedGeneration);
          return result && typeof result.success === 'boolean'
            ? result
            : { success: false, error: 'The installed application shortcut could not be opened' };
        }
        const executable = resolveApplicationPath(normalized.smartAction.value, { platform, env, fsModule });
        const args = Array.isArray(payload.arguments)
          ? payload.arguments.filter((argument) => typeof argument === 'string' && argument.length <= 2048)
          : [];
        if (args.length > 32) return { success: false, error: 'An application action cannot contain more than 32 arguments' };
        const workingDirectory = typeof payload.workingDirectory === 'string' && payload.workingDirectory.trim()
          ? payload.workingDirectory.trim()
          : undefined;
        if (workingDirectory && !fsModule.existsSync(workingDirectory)) {
          return { success: false, error: `Working directory does not exist: ${workingDirectory}` };
        }
        return await launchExecutable(executable, args, workingDirectory);
      } catch (error) {
        return { success: false, error: String(error.message || error) };
      }
    }

    if (normalized.smartAction?.type === 'Cmd') {
      if (options.allowTerminal !== true) {
        return {
          success: false,
          error: 'Terminal commands are disabled in Settings. Enable them only for commands you trust.',
        };
      }
      if (normalized.smartAction.requiresConsent && options.commandConsent !== true) {
        return { success: false, error: 'This imported command needs your confirmation before it can run.' };
      }
      try {
        requireCurrentSimulation(startedGeneration);
        const [command, ...args] = parseCommandLine(normalized.smartAction.value, platform);
        const cwd = typeof payload.workingDirectory === 'string' && payload.workingDirectory.trim()
          ? payload.workingDirectory.trim()
          : undefined;
        if (cwd && !fsModule.existsSync(cwd)) return { success: false, error: `Working directory does not exist: ${cwd}` };
        const result = await runExecutable(command, args, {
          cwd,
          timeoutMs: boundedDelay(payload.timeoutMs, 'Command timeout') || 10_000,
        });
        requireCurrentSimulation(startedGeneration);
        return result;
      } catch (error) {
        return { success: false, error: String(error.message || error) };
      }
    }

    try {
      if (platform !== 'win32') {
        return { success: false, error: 'Windows desktop input is only available on Windows' };
      }
      requireCurrentSimulation(startedGeneration);
      const result = await input.sendOperations(normalized.operations);
      requireCurrentSimulation(startedGeneration);
      return { success: true, message: 'Desktop input sent' };
    } catch (error) {
      return { success: false, error: String(error.message || error) };
    }
  };

  const setSimulationEnabled = async (enabled) => {
    const requested = enabled === true;
    if (requested) {
      if (closed) return { success: false, enabled: false, error: 'The desktop action executor is closed' };
      if (platform !== 'win32') {
        return { success: false, enabled: false, error: 'Desktop Simulation is available only in the Windows desktop app' };
      }
      simulationEnabled = true;
      generation += 1;
      return { success: true, enabled: true };
    }

    simulationEnabled = false;
    generation += 1;
    for (const child of activeCommands) {
      try { child.kill(); } catch {}
    }
    activeCommands.clear();
    try {
      const released = await input.cancelAll?.();
      return released?.success === false
        ? { success: false, enabled: false, error: 'Simulation is off, but Windows did not confirm that held keys were released' }
        : { success: true, enabled: false };
    } catch (error) {
      return {
        success: false,
        enabled: false,
        error: `Simulation is off, but held-key release failed: ${String(error.message || error)}`,
      };
    }
  };

  const close = async () => {
    simulationEnabled = false;
    generation += 1;
    closed = true;
    for (const child of activeCommands) {
      try { child.kill(); } catch {}
    }
    activeCommands.clear();
    try { await input.close?.(); } catch {}
  };

  return { execute, setSimulationEnabled, close };
}

const defaultExecutor = createDesktopActionExecutor();

function executeNativeAction(payload, options = {}) {
  return defaultExecutor.execute(payload, options);
}

function setNativeSimulationEnabled(enabled) {
  return defaultExecutor.setSimulationEnabled(enabled);
}

function closeNativeActionExecutor() {
  return defaultExecutor.close();
}

module.exports = {
  createDesktopActionExecutor,
  createWindowsInputAdapter,
  executeNativeAction,
  setNativeSimulationEnabled,
  closeNativeActionExecutor,
  parseCommandLine,
  parseKeyCombo,
  parseShortcutToVK,
  parseSequenceSteps,
  normalizePayload,
  resolveApplicationPath,
  resolveApplicationShortcutPath,
  validateUrl,
  POWERSHELL_WORKER_SCRIPT,
  MAX_SEQUENCE_DURATION_MS,
};
