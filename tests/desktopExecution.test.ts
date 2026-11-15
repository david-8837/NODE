import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createDesktopActionExecutor,
  normalizePayload,
  parseCommandLine,
  resolveCommandInvocation,
  SAFE_SHELL_COMMANDS,
  parseKeyCombo,
  parseSequenceSteps,
  parseShortcutToVK,
  resolveApplicationShortcutPath,
  POWERSHELL_WORKER_SCRIPT,
  MAX_SEQUENCE_DURATION_MS,
} = require('../electron/desktopExecution.cjs');

describe('shared desktop action executor', () => {
  it('parses common key chords, navigation keys, media keys, and shifted symbols', () => {
    expect(parseShortcutToVK('Ctrl + Shift + Esc')).toEqual([0x11, 0x10, 0x1b]);
    expect(parseShortcutToVK('Win + X')).toEqual([0x5b, 0x58]);
    expect(parseShortcutToVK('Right Ctrl + Page Down')).toEqual([0xa3, 0x22]);
    expect(parseShortcutToVK('volume +')).toEqual([0xaf]);
    expect(parseShortcutToVK('vol-')).toEqual([0xae]);
    expect(parseShortcutToVK('play/pause')).toEqual([0xb3]);
    expect(parseShortcutToVK('Ctrl + ?')).toEqual([0x11, 0x10, 0xbf]);
    expect(parseShortcutToVK('Ctrl++')).toEqual([0x11, 0x10, 0xbb]);
    expect(parseShortcutToVK('')).toEqual([]);
    expect(parseShortcutToVK('nope unknown')).toEqual([]);
    expect(parseShortcutToVK('???unknown???')).toEqual([]);
  });

  it('validates sequence data and represents press, release, text, and wait operations', () => {
    const result = parseSequenceSteps([
      { kind: 'key', value: 'Ctrl + C', delayAfterMs: 40 },
      { kind: 'wait', durationMs: 125 },
      { kind: 'text', value: 'Copied ✓', interKeyDelayMs: 3 },
      { kind: 'key', value: 'Shift + End', mode: 'press' },
      { kind: 'key', value: 'Shift + End', mode: 'release' },
    ]);

    expect(result.ok).toBe(true);
    expect(result.operations[0]).toMatchObject({
      kind: 'keys',
      delayAfterMs: 40,
      events: [
        { vk: 17, mode: 'down' },
        { vk: 67, mode: 'down' },
        { vk: 67, mode: 'up' },
        { vk: 17, mode: 'up' },
      ],
    });
    expect(result.operations[1]).toEqual({ kind: 'wait', durationMs: 125, delayAfterMs: 0 });
    expect(result.operations[2]).toMatchObject({ kind: 'text', text: 'Copied ✓', interKeyDelayMs: 3 });
    expect(result.operations[3].events).toEqual([
      { vk: 16, extended: false, mode: 'down' },
      { vk: 35, extended: true, mode: 'down' },
    ]);
    expect(result.operations[4].events).toEqual([
      { vk: 35, extended: true, mode: 'up' },
      { vk: 16, extended: false, mode: 'up' },
    ]);

    expect(parseSequenceSteps([])).toMatchObject({ ok: false });
    expect(parseSequenceSteps([{ kind: 'key', value: 'not a key name' }])).toMatchObject({ ok: false });
    expect(parseSequenceSteps([{ kind: 'wait', durationMs: 60_001 }])).toMatchObject({ ok: false });
    expect(parseSequenceSteps([{ kind: 'key', value: 'A', mode: 'toggle' }])).toMatchObject({ ok: false });
    expect(parseSequenceSteps([
      { kind: 'text', value: 'a'.repeat(16 * 1024) },
      { kind: 'text', value: 'b'.repeat(16 * 1024 + 1) },
    ])).toMatchObject({ ok: false, error: expect.stringContaining('total text characters') });
    expect(parseSequenceSteps(Array.from({ length: 257 }, () => 'A'))).toMatchObject({ ok: false });
    expect(MAX_SEQUENCE_DURATION_MS).toBe(120_000);
  });

  it('normalizes Text and structured sequence payloads instead of treating them as placeholders', () => {
    expect(normalizePayload({ type: 'Text', value: 'Hello, world!' })).toMatchObject({
      ok: true,
      operations: [{ kind: 'text', text: 'Hello, world!' }],
    });
    expect(normalizePayload({
      execution: {
        kind: 'sequence',
        steps: [{ kind: 'key', value: 'Ctrl + A' }, { kind: 'text', value: 'done' }],
      },
    })).toMatchObject({ ok: true, operations: [{ kind: 'keys' }, { kind: 'text', text: 'done' }] });
    expect(normalizePayload({ type: 'Text', value: '' })).toMatchObject({ ok: false });
    expect(normalizePayload({ type: 'Shortcut', value: 'not a shortcut' })).toMatchObject({ ok: false });
  });

  it('normalizes bright up/down and legacy brightness bindings to desktop display operations', () => {
    for (const [value, direction] of [
      ['bright up', 'up'],
      ['brightness up', 'up'],
      ['brightness +', 'up'],
      ['bright down', 'down'],
      ['brightness down', 'down'],
      ['brightness -', 'down'],
    ]) {
      expect(normalizePayload({ type: 'Shortcut', value })).toEqual({
        ok: true,
        operations: [{ kind: 'brightness', direction, delayAfterMs: 0 }],
      });
    }
    // Brightness is a display action, not a Windows virtual-key event.
    expect(parseShortcutToVK('bright up')).toEqual([]);
  });

  it('routes desktop brightness actions through the guarded Windows worker', async () => {
    const inputAdapter = {
      sendOperations: vi.fn().mockResolvedValue({ success: true }),
      cancelAll: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const executor = createDesktopActionExecutor({ platform: 'win32', inputAdapter });
    await executor.setSimulationEnabled(true);

    expect(await executor.execute({ type: 'Shortcut', value: 'bright up' })).toMatchObject({ success: true });
    expect(await executor.execute({ type: 'Shortcut', value: 'brightness -' })).toMatchObject({ success: true });
    expect(inputAdapter.sendOperations).toHaveBeenNthCalledWith(1, [
      { kind: 'brightness', direction: 'up', delayAfterMs: 0 },
    ]);
    expect(inputAdapter.sendOperations).toHaveBeenNthCalledWith(2, [
      { kind: 'brightness', direction: 'down', delayAfterMs: 0 },
    ]);
    await executor.close();
  });

  it('steps Windows display brightness by ten percent in either direction and clamps to 0–100', () => {
    const brightnessFunction = POWERSHELL_WORKER_SCRIPT.match(/function Set-DisplayBrightness[\s\S]*?\n}/)?.[0] ?? '';

    expect(brightnessFunction).toContain('$step = 10');
    expect(brightnessFunction).toContain('$target = [Math]::Min(100, $current + $step)');
    expect(brightnessFunction).toContain('$target = [Math]::Max(0, $current - $step)');
    expect(brightnessFunction).toContain('if ($target -eq $current) { continue }');
    expect(brightnessFunction).not.toContain('$levels');
  });

  it('refuses all execution until Simulation is enabled, and cancels held input when disabled', async () => {
    let finishInput: ((value: { success: boolean }) => void) | undefined;
    const inputAdapter = {
      sendOperations: vi.fn(() => new Promise<{ success: boolean }>((resolve) => { finishInput = resolve; })),
      cancelAll: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const executor = createDesktopActionExecutor({ platform: 'win32', inputAdapter });

    expect(await executor.execute({ type: 'Shortcut', value: 'Ctrl + C' })).toMatchObject({
      success: false,
      error: expect.stringContaining('Simulation is disabled'),
    });
    expect(inputAdapter.sendOperations).not.toHaveBeenCalled();

    expect(await executor.setSimulationEnabled(true)).toMatchObject({ success: true, enabled: true });
    const pendingAction = executor.execute({ type: 'Shortcut', value: 'Ctrl + C' });
    expect(inputAdapter.sendOperations).toHaveBeenCalledOnce();

    expect(await executor.setSimulationEnabled(false)).toMatchObject({ success: true, enabled: false });
    expect(inputAdapter.cancelAll).toHaveBeenCalledOnce();
    finishInput?.({ success: true });
    expect(await pendingAction).toMatchObject({
      success: false,
      error: expect.stringContaining('Simulation is disabled'),
    });
    expect(await executor.execute({ type: 'Text', value: 'never typed' })).toMatchObject({ success: false });
    await executor.close();
  });

  it('routes Smart Actions through the same Simulation gate and blocks terminal commands by default', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined);
    const executor = createDesktopActionExecutor({
      platform: 'win32',
      inputAdapter: { sendOperations: vi.fn(), cancelAll: vi.fn().mockResolvedValue({ success: true }) },
      openExternal,
    });
    expect(await executor.execute({ type: 'Web', value: 'example.com' })).toMatchObject({ success: false });
    await executor.setSimulationEnabled(true);
    expect(await executor.execute({ type: 'Web', value: 'example.com' })).toMatchObject({ success: true });
    expect(openExternal).toHaveBeenCalledWith('https://example.com/');
    expect(await executor.execute({ type: 'Cmd', value: 'echo safe' })).toMatchObject({
      success: false,
      error: expect.stringContaining('disabled in Settings'),
    });
    expect(await executor.execute({ type: 'Web', value: 'javascript:alert(1)' })).toMatchObject({ success: false });
    await executor.close();
  });

  it('opens selected installed apps through validated Start Menu shortcuts', async () => {
    const shortcutPath = 'C:\\Users\\runner\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Code.lnk';
    const inputAdapter = {
      sendOperations: vi.fn(),
      cancelAll: vi.fn().mockResolvedValue({ success: true }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const openApplicationShortcut = vi.fn().mockResolvedValue({
      success: true,
      message: 'Started Code',
    });
    const executor = createDesktopActionExecutor({
      platform: 'win32',
      inputAdapter,
      openApplicationShortcut,
      fsModule: { statSync: vi.fn(() => ({ isFile: () => true })) },
    });

    expect(resolveApplicationShortcutPath(shortcutPath, {
      platform: 'win32',
      fsModule: { statSync: vi.fn(() => ({ isFile: () => true })) },
    })).toBe(shortcutPath);
    expect(() => resolveApplicationShortcutPath('C:\\Apps\\Code.exe', {
      platform: 'win32',
      fsModule: { statSync: vi.fn(() => ({ isFile: () => true })) },
    })).toThrow(/absolute \.lnk file/i);

    await executor.setSimulationEnabled(true);
    const result = await executor.execute({
      execution: {
        kind: 'smart',
        actionType: 'App',
        value: 'Visual Studio Code',
        applicationShortcutPath: shortcutPath,
      },
    });
    expect(result).toMatchObject({ success: true, message: 'Started Code' });
    expect(openApplicationShortcut).toHaveBeenCalledWith(shortcutPath);
    await executor.close();
  });

  it('requires a saved terminal preference and per-import consent before spawning a command', async () => {
    const execFile = vi.fn((_command, _args, _options, callback) => {
      callback(null, 'safe output', '');
      return { kill: vi.fn() };
    });
    const executor = createDesktopActionExecutor({
      platform: 'win32',
      inputAdapter: { sendOperations: vi.fn(), cancelAll: vi.fn().mockResolvedValue({ success: true }) },
      execFile,
    });
    await executor.setSimulationEnabled(true);

    const command = {
      execution: {
        kind: 'smart',
        actionType: 'Cmd',
        value: 'echo safe',
        requiresConsent: true,
      },
    };
    expect(await executor.execute(command, { allowTerminal: true })).toMatchObject({
      success: false,
      error: expect.stringContaining('needs your confirmation'),
    });
    expect(execFile).not.toHaveBeenCalled();

    expect(await executor.execute(command, { allowTerminal: true, commandConsent: true })).toMatchObject({
      success: true,
      message: 'safe output',
    });
    expect(execFile).toHaveBeenCalledWith('echo', ['safe'], expect.objectContaining({ shell: false }), expect.any(Function));
    await executor.close();
  });

  it('uses argument parsing without a shell and rejects command interpreters and metacharacters', () => {
    expect(parseCommandLine('"C:\\Program Files\\App\\app.exe" --name "hello world"', 'win32')).toEqual([
      'C:\\Program Files\\App\\app.exe', '--name', 'hello world',
    ]);
    expect(() => parseCommandLine('powershell.exe -NoProfile', 'win32')).toThrow(/blocked for safety/i);
    expect(() => parseCommandLine('echo safe & calc', 'win32')).toThrow(/restricted/i);
    expect(() => parseCommandLine('"unclosed', 'win32')).toThrow(/unmatched quote/i);
  });

  it('has a cancellable asynchronous stdin reader and releases keys on worker errors', () => {
    expect(POWERSHELL_WORKER_SCRIPT).toContain('NodeStudioInputReader');
    expect(POWERSHELL_WORKER_SCRIPT).not.toContain('.Peek()');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('SendInput');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('Release-AllKeys');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('OperationCanceledException');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('WmiMonitorBrightnessMethods');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('WmiSetBrightness');
    expect(POWERSHELL_WORKER_SCRIPT).toContain("$opKind -eq 'brightness'");
    expect(POWERSHELL_WORKER_SCRIPT).not.toContain('keybd_event');
  });
});

describe('Cmd Smart Action invocation (hardware-reported failures)', () => {
  const resolve = (value: string) => resolveCommandInvocation(value, 'win32');

  it('resolves "start <app>" to a direct launch instead of spawning a nonexistent start.exe', () => {
    // Reported on hardware as: Action failed: Spawn start ENOENT
    expect(resolve('start calc')).toEqual({ kind: 'launch', command: 'calc.exe', args: [] });
    expect(resolve('start notepad')).toEqual({ kind: 'launch', command: 'notepad.exe', args: [] });
    expect(resolve('START Calculator')).toEqual({ kind: 'launch', command: 'calc.exe', args: [] });
  });

  it('accepts the quoted empty window title used by "cmd /c start "" calc"', () => {
    // Reported on hardware as: Command "cmd.exe" is blocked for safety
    expect(resolve('cmd.exe /c start "" calc')).toEqual({ kind: 'launch', command: 'calc.exe', args: [] });
    expect(resolve('cmd /c start "" notepad')).toEqual({ kind: 'launch', command: 'notepad.exe', args: [] });
  });

  it('runs allowlisted informational commands through cmd with AutoRun disabled', () => {
    expect(resolve('cmd /c ipconfig')).toEqual({
      kind: 'exec', command: 'cmd.exe', args: ['/d', '/c', 'ipconfig'],
    });
    expect(resolve('cmd.exe /c ipconfig /all')).toEqual({
      kind: 'exec', command: 'cmd.exe', args: ['/d', '/c', 'ipconfig', '/all'],
    });
    // /d prevents AutoRun registry scripts from executing alongside the command.
    expect(resolve('cmd /c whoami').args[0]).toBe('/d');
  });

  it('keeps the allowlist free of destructive or system-modifying tools', () => {
    for (const forbidden of ['del', 'erase', 'reg', 'regedit', 'shutdown', 'format', 'diskpart', 'taskkill', 'powershell', 'cmd', 'wmic', 'bcdedit', 'rmdir']) {
      expect(SAFE_SHELL_COMMANDS.has(forbidden)).toBe(false);
    }
  });

  it('still blocks interpreters and destructive commands nested inside cmd /c', () => {
    for (const value of [
      'cmd /c powershell -NoProfile',
      'cmd /c cmd /c calc',
      'cmd /c del file.txt',
      'cmd /c reg add HKLM\\Test',
      'cmd /c shutdown /s',
      'cmd /c format c:',
      'cmd /c taskkill /im app.exe',
    ]) {
      expect(() => resolve(value)).toThrow(/blocked for safety/i);
    }
  });

  it('rejects shell metacharacters so commands cannot be chained', () => {
    for (const value of ['cmd /c echo hi & calc', 'cmd /c ipconfig | findstr x', 'cmd /c echo %PATH%', 'cmd /c dir > out.txt']) {
      expect(() => resolve(value)).toThrow(/restricted/i);
    }
  });

  it('refuses commands outside the allowlist and points at the App action', () => {
    expect(() => resolve('cmd /c notepad')).toThrow(/App Smart Action/i);
    expect(() => resolve('cmd /c mystery.exe')).toThrow(/not permitted through cmd/i);
  });

  it('gives actionable errors for builtins, persistent shells, and URLs', () => {
    expect(() => resolve('dir')).toThrow(/builtin/i);
    expect(() => resolve('cmd /k ipconfig')).toThrow(/cmd \/c/i);
    expect(() => resolve('cmd')).toThrow(/Only "cmd \/c/i);
    expect(() => resolve('cmd /c')).toThrow(/Usage/i);
    expect(() => resolve('start')).toThrow(/Usage: start/i);
    expect(() => resolve('start https://example.com')).toThrow(/Website Smart Action/i);
  });

  it('leaves ordinary executable commands working exactly as before', () => {
    expect(resolve('echo safe')).toEqual({ kind: 'exec', command: 'echo', args: ['safe'] });
    expect(() => resolve('powershell.exe -NoProfile')).toThrow(/blocked for safety/i);
    expect(parseCommandLine('"C:\\Program Files\\App\\app.exe" --name "hello world"', 'win32'))
      .toEqual(['C:\\Program Files\\App\\app.exe', '--name', 'hello world']);
  });
});
