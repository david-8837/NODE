import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  validateUrl,
  resolveApplicationPath,
  resolveCommandInvocation,
  parseCommandLine,
  parseSequenceSteps,
  normalizePayload,
} = require('../electron/desktopExecution.cjs');

/**
 * Phase 7/8 validation evidence, including regression V4: non-web schemes and
 * local paths were silently rewritten into bogus https:// URLs instead of being
 * rejected with an actionable error.
 */

describe('V4 regression: website URL validation', () => {
  it.each([
    ['https://example.com', 'https://example.com/'],
    ['http://a.example/x?y=1#z', 'http://a.example/x?y=1#z'],
    ['example.com', 'https://example.com/'],
    ['sub.domain.co.uk/path', 'https://sub.domain.co.uk/path'],
    ['localhost:3000', 'https://localhost:3000/'],
    ['example.com:8080/x', 'https://example.com:8080/x'],
    ['https://example.com/a%20b', 'https://example.com/a%20b'],
  ])('accepts and normalises %s', (input, expected) => {
    expect(validateUrl(input)).toBe(expected);
  });

  it.each([
    'file:///C:/Windows/win.ini',
    'ftp://host/x',
    'chrome://settings',
    'javascript:alert(1)',
    'data:text/html,<script>x</script>',
    'mailto:a@b.c',
    'about:blank',
  ])('rejects the non-web scheme in %s instead of rewriting it', (input) => {
    expect(() => validateUrl(input)).toThrow(/Only HTTP and HTTPS|Invalid website URL/);
    // The old behaviour produced a bogus https URL; make sure it cannot recur.
    let produced: string | null = null;
    try { produced = validateUrl(input); } catch { /* expected */ }
    expect(produced).toBeNull();
  });

  it.each(['C:\\Users\\me', 'D:/tools/app.exe', '\\\\server\\share\\file.txt'])(
    'rejects the local path %s and points at the App action',
    (input) => {
      expect(() => validateUrl(input)).toThrow(/local file path.*App action/s);
    }
  );

  it.each(['', '   ', 'https://', 'not a url', 'https://user:pass@host'])(
    'rejects the malformed or credential-bearing URL %j',
    (input) => {
      expect(() => validateUrl(input)).toThrow();
    }
  );

  it('rejects an over-long URL rather than truncating it', () => {
    expect(() => validateUrl(`https://example.com/${'a'.repeat(5000)}`)).toThrow(/too long/);
  });
});

describe('Smart App launching validation', () => {
  const resolveApp = (value: string) => resolveApplicationPath(value, { platform: 'win32', env: {} });

  it('resolves known application aliases to real executables', () => {
    expect(resolveApp('notepad')).toMatch(/notepad\.exe$/i);
    expect(resolveApp('calc')).toMatch(/calc\.exe$/i);
    expect(resolveApp('calculator')).toMatch(/calc\.exe$/i);
  });

  it('rejects empty, oversized and control-character targets', () => {
    expect(() => resolveApp('')).toThrow(/empty/);
    expect(() => resolveApp('a'.repeat(5000))).toThrow(/too long/);
    expect(() => resolveApp('note\u0000pad')).toThrow(/control characters/);
  });

  it('reports an unknown application instead of resolving it silently', () => {
    expect(() => resolveApp('definitely-not-an-installed-app-xyz')).toThrow();
  });
});

describe('CMD execution validation (Phase 8 regression)', () => {
  const resolve = (value: string) => resolveCommandInvocation(value, 'win32');

  it('resolves "start <app>" to a direct launch, not a nonexistent start.exe', () => {
    // Originally reported on hardware as: Spawn start ENOENT
    expect(resolve('start calc')).toEqual({ kind: 'launch', command: 'calc.exe', args: [] });
    expect(resolve('start notepad')).toEqual({ kind: 'launch', command: 'notepad.exe', args: [] });
  });

  it('accepts the quoted empty title in cmd /c start "" calc', () => {
    // Originally reported on hardware as: Command "cmd.exe" is blocked for safety
    expect(resolve('cmd.exe /c start "" calc')).toEqual({ kind: 'launch', command: 'calc.exe', args: [] });
  });

  it('runs allowlisted informational commands with AutoRun disabled', () => {
    expect(resolve('cmd /c ipconfig')).toEqual({
      kind: 'exec', command: 'cmd.exe', args: ['/d', '/c', 'ipconfig'],
    });
  });

  it.each([
    'cmd.exe',
    'powershell -c ls',
    'cmd /c del file.txt',
    'cmd /c format C:',
    'cmd /c powershell -c ls',
    'ipconfig & del x',
    'ipconfig | more',
    'echo %PATH%',
    'echo hi > out.txt',
  ])('blocks the unsafe command %j with an error', (command) => {
    expect(() => resolve(command)).toThrow();
  });

  it('parses quoted arguments and spaces in paths without a shell', () => {
    const parts = parseCommandLine('"C:\\Program Files\\App\\tool.exe" --flag "two words"', 'win32');
    expect(parts[0]).toBe('C:\\Program Files\\App\\tool.exe');
    expect(parts).toContain('two words');
    expect(parts).toContain('--flag');
  });

  it('rejects unbalanced quotes instead of guessing', () => {
    expect(() => parseCommandLine('tool "unterminated', 'win32')).toThrow();
  });
});

describe('sequence and payload validation', () => {
  it('preserves step order and delays through parsing', () => {
    const result = parseSequenceSteps([
      { kind: 'key', value: 'Ctrl + S', delayAfterMs: 10 },
      { kind: 'wait', durationMs: 25 },
      { kind: 'text', value: 'hello' },
    ]);
    expect(result.ok).toBe(true);
    expect(result.operations).toHaveLength(3);
    expect(result.operations[0]).toMatchObject({ kind: 'keys', delayAfterMs: 10 });
    expect(result.operations[1]).toMatchObject({ kind: 'wait', durationMs: 25 });
    expect(result.operations[2]).toMatchObject({ kind: 'text', text: 'hello' });
  });

  it('rejects an unknown step kind rather than silently skipping it', () => {
    expect(parseSequenceSteps([{ kind: 'teleport' }])).toMatchObject({ ok: false });
  });

  it('rejects an empty sequence', () => {
    expect(parseSequenceSteps([])).toMatchObject({ ok: false });
  });

  it('normalises structured smart execution into the executor payload', () => {
    const result = normalizePayload({
      execution: { kind: 'smart', actionType: 'Text', value: 'hello' },
    });
    expect(result.ok).toBe(true);
    // Smart Text normalises into a single atomic text operation.
    expect(result.operations).toEqual([
      { kind: 'text', text: 'hello', interKeyDelayMs: 0, delayAfterMs: 0 },
    ]);
  });

  it('rejects a non-object payload', () => {
    expect(normalizePayload(null).ok).toBe(false);
    expect(normalizePayload('nope').ok).toBe(false);
  });
});
