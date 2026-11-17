import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createWindowsInputAdapter,
  createDesktopActionExecutor,
} = require('../electron/desktopExecution.cjs');

/**
 * End-to-end proof that Multi-Actions and Smart Text execute again.
 *
 * The fake spawn here enforces the Windows CreateProcess command-line ceiling the
 * way libuv does, raising ENAMETOOLONG instead of silently accepting an over-long
 * argv. The previous fakes accepted any argv, which is precisely why the real
 * regression ("Action failed: Spawn ENAMETOOLONG") passed every automated test
 * and only surfaced on physical hardware.
 */

const CREATE_PROCESS_LIMIT = 32_767;

type Received = { id: string; operations: Array<Record<string, unknown>> };

function createLimitEnforcingWorker() {
  const received: Received[] = [];
  const spawnAttempts: Array<{ command: string; length: number }> = [];
 let inFlight = 0;
  let maxInFlight = 0;

  const spawnProcess = (command: string, args: string[]) => {
    const length = [command, ...args].join(' ').length;
    spawnAttempts.push({ command, length });
    if (length > CREATE_PROCESS_LIMIT) {
      // Mirrors libuv's uv_spawn failure on an over-long Windows command line.
      const error = new Error(`spawn ${command} ENAMETOOLONG`) as Error & { code?: string };
      error.code = 'ENAMETOOLONG';
      throw error;
    }

    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough; stdout: PassThrough; stderr: PassThrough;
      exitCode: number | null; killed: boolean; kill: () => void;
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
        if (message.kind !== 'action') {
          setImmediate(() => child.stdout.write(`${JSON.stringify({ id: message.id, ok: true })}\n`));
          continue;
        }
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        received.push({ id: String(message.id), operations: message.operations });
        setTimeout(() => {
          inFlight -= 1;
          child.stdout.write(`${JSON.stringify({ id: message.id, ok: true })}\n`);
        }, 1);
      }
    });

    setImmediate(() => child.stdout.write('{"id":"ready","ok":true}\n'));
    return child;
  };

  return { received, spawnAttempts, spawnProcess, get maxInFlight() { return maxInFlight; } };
}

async function bootExecutor() {
  const worker = createLimitEnforcingWorker();
  const execCalls: Array<{ command: string; args: string[] }> = [];
  const launches: string[] = [];
  const opened: string[] = [];
  const executor = createDesktopActionExecutor({
    platform: 'win32',
    inputAdapter: createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess }),
    // App launches (and `start <app>`) use a detached spawn, not the input worker.
    spawnProcess: (filePath: string) => {
      launches.push(filePath);
      const handle = new EventEmitter() as EventEmitter & { unref: () => void };
      handle.unref = () => {};
      setImmediate(() => handle.emit('spawn'));
      return handle;
    },
    execFile: (command: string, args: string[], _options: unknown, callback: (e: null, out: string, err: string) => void) => {
      execCalls.push({ command, args });
      callback(null, 'ok', '');
      return new EventEmitter();
    },
    openExternal: async (url: string) => { opened.push(url); },
  });
  await executor.setSimulationEnabled(true);
  return { executor, worker, execCalls, launches, opened };
}

describe('Multi-Action and Smart Text execution (ENAMETOOLONG end-to-end)', () => {
  it('executes a Smart Text action instead of failing with ENAMETOOLONG', async () => {
    const { executor, worker } = await bootExecutor();
    try {
      const result = await executor.execute({ type: 'Text', value: 'i love you' });
      expect(result).toMatchObject({ success: true });
      expect(worker.received).toHaveLength(1);
      expect(worker.received[0].operations).toEqual([
        { kind: 'text', text: 'i love you', interKeyDelayMs: 0, delayAfterMs: 0 },
      ]);
      expect(worker.spawnAttempts.every((a) => a.length <= CREATE_PROCESS_LIMIT)).toBe(true);
    } finally {
      await executor.close();
    }
  });

  it('executes a whole Multi-Action sequence in order, dropping no step', async () => {
    const { executor, worker } = await bootExecutor();
    try {
      const result = await executor.execute({
        type: 'Sequence',
        steps: [
          { kind: 'key', value: 'Ctrl+C' },
          { kind: 'wait', durationMs: 5 },
          { kind: 'text', value: 'pasted' },
          { kind: 'key', value: 'Enter' },
        ],
      });
      expect(result).toMatchObject({ success: true });
      expect(worker.received).toHaveLength(1);
      const kinds = worker.received[0].operations.map((op) => op.kind);
      expect(kinds).toEqual(['keys', 'wait', 'text', 'keys']);
      const text = worker.received[0].operations.find((op) => op.kind === 'text');
      expect(text?.text).toBe('pasted');
    } finally {
      await executor.close();
    }
  });

  it('handles long, Unicode and multiline text without touching the command line', async () => {
    const { executor, worker } = await bootExecutor();
    try {
      const samples = [
        '  leading and trailing  ',
        "punctuation: !@#$%^&*()_+-=[]{};\\':\",.<>/?`~",
        'Unicode: café naïve ✓ 日本語 🎉❤️',
        'line one\nline two\r\nline three\ttabbed',
        'x'.repeat(8000),
      ];
      for (const value of samples) {
        expect(await executor.execute({ type: 'Text', value })).toMatchObject({ success: true });
      }
      const texts = worker.received.map((r) => r.operations.map((op) => op.text ?? '').join(''));
      expect(texts).toEqual(samples);
      // Even an 8000-character payload never grows the argv.
      expect(worker.spawnAttempts.every((a) => a.length <= CREATE_PROCESS_LIMIT)).toBe(true);
    } finally {
      await executor.close();
    }
  });

  it('serializes rapid repeated presses without overlap or duplication', async () => {
    const { executor, worker } = await bootExecutor();
    try {
      const presses = Array.from({ length: 12 }, (_, i) => `press-${i}`);
      const results = await Promise.all(
        presses.map((value) => executor.execute({ type: 'Text', value })),
      );
      expect(results.every((r: { success: boolean }) => r.success)).toBe(true);
      expect(worker.maxInFlight).toBe(1);
      expect(worker.received.map((r) => r.operations.map((op) => op.text).join(''))).toEqual(presses);
    } finally {
      await executor.close();
    }
  });

  it('leaves the passing CMD handler on execFile, untouched by the worker fix', async () => {
    const { executor, execCalls, launches, worker } = await bootExecutor();
    try {
      // Terminal actions stay opt-in; the user's Settings consent is required.
      const denied = await executor.execute({ type: 'Cmd', value: 'start calc' });
      expect(denied.success).toBe(false);
      expect(execCalls).toHaveLength(0);

      const result = await executor.execute(
        { type: 'Cmd', value: 'start calc' },
        { allowTerminal: true, commandConsent: true },
      );
      expect(result).toMatchObject({ success: true });
      // `start calc` resolves to a detached calc.exe launch, exactly as before.
      expect(launches.some((file) => /calc\.exe$/i.test(file))).toBe(true);

      // An exec-style command still goes through execFile.
      const echoed = await executor.execute(
        { type: 'Cmd', value: 'echo safe' },
        { allowTerminal: true, commandConsent: true },
      );
      expect(echoed).toMatchObject({ success: true });
      expect(execCalls.length).toBeGreaterThan(0);
      // Neither CMD path may spin up the keystroke worker.
      expect(worker.received).toHaveLength(0);
    } finally {
      await executor.close();
    }
  });

  it('still blocks an unsafe command rather than executing it', async () => {
    const { executor, execCalls } = await bootExecutor();
    try {
      const result = await executor.execute({ type: 'Cmd', value: 'powershell -c whoami' });
      expect(result.success).toBe(false);
      expect(execCalls).toHaveLength(0);
    } finally {
      await executor.close();
    }
  });

  it('opens a website through the external handler, not the worker', async () => {
    const { executor, opened, worker } = await bootExecutor();
    try {
      const result = await executor.execute({ type: 'Web', value: 'example.com' });
      expect(result).toMatchObject({ success: true });
      expect(opened).toEqual(['https://example.com/']);
      expect(worker.received).toHaveLength(0);
    } finally {
      await executor.close();
    }
  });
});
