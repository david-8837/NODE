import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createWindowsInputAdapter,
  createDesktopActionExecutor,
  normalizePayload,
  POWERSHELL_WORKER_SCRIPT,
} = require('../electron/desktopExecution.cjs');

/**
 * A stand-in for the persistent PowerShell worker. It records the order in which
 * action requests arrive and only acknowledges one at a time, so the test can
 * observe whether the adapter overlaps requests.
 */
function createFakeWorker() {
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

  const received: Array<{ id: string; text: string }> = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let spawnCount = 0;

  const spawnProcess = () => {
    spawnCount += 1;
    // The real worker announces readiness on stdout before accepting work.
    setImmediate(() => child.stdout.write('{"id":"ready","ok":true}\n'));
    return child;
  };

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
      const text = (message.operations ?? [])
        .filter((op: { kind: string }) => op.kind === 'text')
        .map((op: { text: string }) => op.text)
        .join('');
      received.push({ id: String(message.id), text });
      // Acknowledge asynchronously, mimicking the time Windows takes to type.
      setTimeout(() => {
        inFlight -= 1;
        child.stdout.write(`${JSON.stringify({ id: message.id, ok: true })}\n`);
      }, 5);
    }
  });

  return {
    spawnProcess,
    received,
    get maxInFlight() { return maxInFlight; },
    get spawnCount() { return spawnCount; },
  };
}

describe('Smart Text Insertion under rapid repeated presses', () => {
  it('serializes overlapping presses so no two insertions are ever in flight together', async () => {
    const worker = createFakeWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });

    // Fire 20 presses without awaiting, exactly like rapid physical presses.
    const presses = Array.from({ length: 20 }, () =>
      adapter.sendOperations([{ kind: 'text', text: 'i love you', interKeyDelayMs: 0, delayAfterMs: 0 }])
    );
    const results = await Promise.all(presses);

    expect(results.every((r: { success: boolean }) => r.success)).toBe(true);
    expect(worker.maxInFlight).toBe(1);
    expect(worker.received).toHaveLength(20);
    // Every insertion arrives whole and in press order: nothing lost or merged.
    expect(worker.received.every((r) => r.text === 'i love you')).toBe(true);
    await adapter.close();
  });

  it('preserves press order when different texts are queued back to back', async () => {
    const worker = createFakeWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });

    const texts = ['first', 'second', 'third', 'fourth', 'fifth'];
    await Promise.all(texts.map((text) =>
      adapter.sendOperations([{ kind: 'text', text, interKeyDelayMs: 0, delayAfterMs: 0 }])
    ));

    expect(worker.received.map((r) => r.text)).toEqual(texts);
    expect(worker.maxInFlight).toBe(1);
    await adapter.close();
  });

  it('reuses one worker process instead of spawning a competing worker per press', async () => {
    const worker = createFakeWorker();
    const adapter = createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess });

    await Promise.all(Array.from({ length: 8 }, () =>
      adapter.sendOperations([{ kind: 'text', text: 'x', interKeyDelayMs: 0, delayAfterMs: 0 }])
    ));

    // Two workers would inject into the same focus concurrently and interleave.
    expect(worker.spawnCount).toBe(1);
    await adapter.close();
  });

  it('carries Unicode, punctuation, spaces and multiline text through unchanged', async () => {
    const worker = createFakeWorker();
    const executor = createDesktopActionExecutor({
      platform: 'win32',
      inputAdapter: createWindowsInputAdapter({ platform: 'win32', spawnProcess: worker.spawnProcess }),
    });
    await executor.setSimulationEnabled(true);

    const samples = [
      'i love you',
      '  leading and trailing  ',
      'punctuation: !@#$%^&*()_+-=[]{};\':",.<>/?`~',
      'Unicode: café naïve ✓ 日本語 🎉❤️',
      'line one\nline two\r\nline three\ttabbed',
    ];
    for (const text of samples) {
      expect(await executor.execute({ type: 'Text', value: text })).toMatchObject({ success: true });
    }

    expect(worker.received.map((r) => r.text)).toEqual(samples);
    expect(worker.maxInFlight).toBe(1);
    await executor.close();
  });

  it('does not silently truncate or alter text during normalization', () => {
    for (const text of ['i love you', '🎉 family emoji', 'a\r\nb', 'tab\there', ' trailing ']) {
      const normalized = normalizePayload({ type: 'Text', value: text });
      expect(normalized.ok).toBe(true);
      expect(normalized.operations[0].text).toBe(text);
    }
  });
});

describe('PowerShell worker text injection contract', () => {
  it('injects the whole string in one atomic SendInput instead of one call per character', () => {
    // SendInput only guarantees non-interleaving within a single call. The old
    // loop called it per character, letting a second press interleave mid-string.
    expect(POWERSHELL_WORKER_SCRIPT).toContain('public static void SendUnicodeText(string text)');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('[NodeStudioNativeInput]::SendUnicodeText($text)');
    expect(POWERSHELL_WORKER_SCRIPT).not.toContain('$text.ToCharArray()');
    // The batch is flushed as one array, not per character.
    expect(POWERSHELL_WORKER_SCRIPT).toContain('SendInput((uint)array.Length, array,');
  });

  it('maps newlines and tabs to real virtual keys rather than Unicode code points', () => {
    // U+000A / U+0009 injected as Unicode do not create a line break or tab in
    // many editors, which corrupted multiline text.
    expect(POWERSHELL_WORKER_SCRIPT).toContain("if (c == '\\n') { AppendVirtualKey(inputs, 0x0D); continue; }");
    expect(POWERSHELL_WORKER_SCRIPT).toContain("if (c == '\\t') { AppendVirtualKey(inputs, 0x09); continue; }");
    // CRLF must collapse to a single Enter, not two.
    expect(POWERSHELL_WORKER_SCRIPT).toContain("if (i + 1 < text.Length && text[i + 1] == '\\n') i++;");
  });

  it('keeps surrogate pairs adjacent in the same call so non-BMP characters survive', () => {
    expect(POWERSHELL_WORKER_SCRIPT).toContain('char.IsHighSurrogate(c)');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('char.IsLowSurrogate(text[i + 1])');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('StringInfo.GetTextElementEnumerator');
  });

  it('still honours explicit user pacing without splitting characters', () => {
    expect(POWERSHELL_WORKER_SCRIPT).toContain('SplitCodePoints($text)');
    expect(POWERSHELL_WORKER_SCRIPT).toContain('SendUnicodeText([string]$element)');
  });

  it('verifies the full batch was accepted rather than assuming partial success', () => {
    expect(POWERSHELL_WORKER_SCRIPT).toContain('if (sent != (uint)array.Length)');
  });
});
