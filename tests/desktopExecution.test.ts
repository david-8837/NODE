import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createDesktopActionExecutor,
  normalizePayload,
  parseCommandLine,
  parseKeyCombo,
  parseSequenceSteps,
  parseShortcutToVK,
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
    expect(POWERSHELL_WORKER_SCRIPT).not.toContain('keybd_event');
  });
});
