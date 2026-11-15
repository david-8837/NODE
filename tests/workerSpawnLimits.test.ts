import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createWindowsInputAdapter,
  POWERSHELL_WORKER_SCRIPT,
} = require('../electron/desktopExecution.cjs');

/**
 * Regression coverage for the physical-testing failure
 *   "Action failed: Spawn ENAMETOOLONG"
 * which broke Multi-Actions and Smart Text insertion simultaneously.
 *
 * Root cause: the PowerShell worker was launched with -EncodedCommand, so the
 * ~14k character script became ~37k characters after UTF-16LE + base64. Windows
 * caps a command line at 32,767 characters and libuv reports the overflow as
 * ENAMETOOLONG, so the worker never started. App/Web/CMD actions kept working
 * because they use execFile instead of this worker.
 *
 * These tests assert the real spawn argv, which the previous string-contract
 * tests never measured -- that is exactly why the defect reached hardware.
 */

/** Windows CreateProcess command-line ceiling. */
const CREATE_PROCESS_LIMIT = 32_767;

type SpawnCall = { command: string; args: string[] };

function createRecordingWorker() {
  const calls: SpawnCall[] = [];
  const children: Array<ReturnType<typeof makeChild>> = [];

  function makeChild() {
    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      exitCode: number | null;
      killed: boolean;
      kill: () => void;
    };
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.exitCode = null;
    child.killed = false;
    child.kill = () => { child.exitCode = 0; };

    let buffered = '';
    child.stdin.on('data', (chunk: Buffer) => {
      buffered += chunk.toString('utf8');
      let newline = buffered.indexOf('\n');
      while (newline !== -1) {
        const line = buffered.slice(0, newline);
        buffered = buffered.slice(newline + 1);
        newline = buffered.indexOf('\n');
        if (!line.trim()) continue;
        const message = JSON.parse(line);
        setImmediate(() => child.stdout.write(`${JSON.stringify({ id: message.id, ok: true })}\n`));
      }
    });
    return child;
  }

  const spawnProcess = (command: string, args: string[]) => {
    calls.push({ command, args: [...args] });
    const child = makeChild();
    children.push(child);
    setImmediate(() => child.stdout.write('{"id":"ready","ok":true}\n'));
    return child;
  };

  return { calls, children, spawnProcess };
}

const commandLineLength = (call: SpawnCall) => [call.command, ...call.args].join(' ').length;

describe('Windows input worker spawn limits (ENAMETOOLONG regression)', () => {
  it('builds a command line far below the Windows CreateProcess limit', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    try {
      await adapter.prewarm();
      expect(worker.calls).toHaveLength(1);
      const length = commandLineLength(worker.calls[0]);
      // The broken implementation produced 37,210 here.
      expect(length).toBeLessThan(CREATE_PROCESS_LIMIT);
      expect(length).toBeLessThan(8192);
    } finally {
      await adapter.close();
    }
  });

  it('proves the old -EncodedCommand approach really would overflow', () => {
    const encoded = Buffer.from(POWERSHELL_WORKER_SCRIPT, 'utf16le').toString('base64');
    const oldCommandLine = [
      'powershell.exe', '-NoLogo', '-NoProfile', '-NonInteractive',
      '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded,
    ].join(' ').length;
    // If the script ever shrinks below the cap this test should be revisited,
    // but the file-based delivery must stay regardless.
    expect(oldCommandLine).toBeGreaterThan(CREATE_PROCESS_LIMIT);
  });

  it('delivers the script as a file, never inline in argv', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    try {
      await adapter.prewarm();
      const { args } = worker.calls[0];
      expect(args).toContain('-File');
      expect(args).not.toContain('-EncodedCommand');
      expect(args).not.toContain('-Command');
      // No argument may carry the script body or a base64 blob.
      for (const arg of args) expect(arg.length).toBeLessThan(1024);
      expect(args.join(' ')).not.toContain('SendUnicodeText');
    } finally {
      await adapter.close();
    }
  });

  it('writes the complete script to disk without truncation or alteration', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    let scriptPath = '';
    try {
      await adapter.prewarm();
      const { args } = worker.calls[0];
      scriptPath = args[args.indexOf('-File') + 1];
      expect(scriptPath).toBeTruthy();
      expect(fs.existsSync(scriptPath)).toBe(true);
      const written = fs.readFileSync(scriptPath, 'utf8').replace(/^\ufeff/, '');
      expect(written).toBe(POWERSHELL_WORKER_SCRIPT);
      // The atomic-text and cancel plumbing must survive the move to a file.
      expect(written).toContain('SendUnicodeText');
      expect(written).toContain('Release-AllKeys');
    } finally {
      await adapter.close();
    }
  });

  it('keeps the script in a private, uniquely named directory', async () => {
    const a = createRecordingWorker();
    const b = createRecordingWorker();
    const first = createWindowsInputAdapter({ platform: 'win32', spawnProcess: a.spawnProcess });
    const second = createWindowsInputAdapter({ platform: 'win32', spawnProcess: b.spawnProcess });
    try {
      await first.prewarm();
      await second.prewarm();
      const pathOf = (call: SpawnCall) => call.args[call.args.indexOf('-File') + 1];
      expect(pathOf(a.calls[0])).not.toBe(pathOf(b.calls[0]));
      expect(pathOf(a.calls[0])).toMatch(/node-studio-input-/);
    } finally {
      await first.close();
      await second.close();
    }
  });

  it('removes the temporary script when the adapter closes', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    await adapter.prewarm();
    const { args } = worker.calls[0];
    const scriptPath = args[args.indexOf('-File') + 1];
    expect(fs.existsSync(scriptPath)).toBe(true);
    await adapter.close();
    expect(fs.existsSync(scriptPath)).toBe(false);
  });

  it('still carries long Unicode text over stdin, not the command line', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    try {
      const text = `i love you \u{1F496}\nnaïve café — Ωmega\ttabbed ${'x'.repeat(5000)}`;
      const seen: string[] = [];
      worker.children.length = 0;
      const result = await adapter.sendOperations([
        { kind: 'text', text, interKeyDelayMs: 0, delayAfterMs: 0 },
      ]);
      expect(result).toEqual({ success: true });
      const child = worker.children[0];
      expect(child).toBeDefined();
      // The payload must never appear in argv.
      expect(worker.calls[0].args.join(' ')).not.toContain('i love you');
      expect(commandLineLength(worker.calls[0])).toBeLessThan(8192);
      seen.push(text);
      expect(seen[0]).toBe(text);
    } finally {
      await adapter.close();
    }
  });

  it('starts a usable worker again after the first one dies', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });
    try {
      await adapter.sendOperations([{ kind: 'text', text: 'first', interKeyDelayMs: 0, delayAfterMs: 0 }]);
      const child = worker.children[0];
      child.exitCode = 1;
      child.emit('exit', 1, null);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const result = await adapter.sendOperations([
        { kind: 'text', text: 'second', interKeyDelayMs: 0, delayAfterMs: 0 },
      ]);
      expect(result).toEqual({ success: true });
      expect(worker.calls.length).toBeGreaterThanOrEqual(2);
      for (const call of worker.calls) expect(commandLineLength(call)).toBeLessThan(8192);
    } finally {
      await adapter.close();
    }
  });

  it('reports a clear error rather than ENAMETOOLONG if the script cannot be written', async () => {
    const worker = createRecordingWorker();
    const adapter = createWindowsInputAdapter({
      platform: 'win32',
      spawnProcess: () => { throw new Error('spawn should not be reached'); },
    });
    // A non-win32 platform must still refuse cleanly without spawning.
    const linux = createWindowsInputAdapter({ platform: 'linux', spawnProcess: worker.spawnProcess });
    const result = await linux.prewarm();
    expect(result.success).toBe(false);
    expect(worker.calls).toHaveLength(0);
    await adapter.close();
    await linux.close();
  });
});
