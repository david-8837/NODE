import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(join(process.cwd(), 'electron/main.cjs'), 'utf8');

/** Extract the webPreferences object literal from the BrowserWindow construction. */
function webPreferencesBlock(): string {
  const start = mainSource.indexOf('webPreferences: {');
  expect(start, 'main.cjs must configure webPreferences').toBeGreaterThan(-1);
  const end = mainSource.indexOf('},', start);
  expect(end).toBeGreaterThan(start);
  return mainSource.slice(start, end);
}

describe('Electron background execution of hardware-triggered gestures', () => {
  it('disables background throttling so hidden-window gesture timers keep real timing', () => {
    // Multi-action tap/hold decisions are timed in the renderer against the 200ms
    // tapping term. Chromium throttles timers in hidden/occluded windows to ~1s,
    // which would classify every tap as a hold while minimized or tray-hidden.
    expect(webPreferencesBlock()).toMatch(/backgroundThrottling:\s*false/);
  });

  it('keeps the renderer hardening intact alongside the throttling change', () => {
    const prefs = webPreferencesBlock();
    expect(prefs).toMatch(/nodeIntegration:\s*false/);
    expect(prefs).toMatch(/contextIsolation:\s*true/);
    expect(prefs).toMatch(/webSecurity:\s*true/);
    expect(prefs).toMatch(/sandbox:\s*true/);
  });

  it('times multi-action gestures in the renderer, which is why throttling matters', () => {
    const engine = readFileSync(join(process.cwd(), 'src/multiActionGestureEngine.ts'), 'utf8');
    // Confirms the premise of the fix: the tapping decision really is timer-based
    // in renderer code, so window visibility must not alter key behaviour.
    expect(engine).toContain('setTimeout');
    expect(engine).toContain('clearTimeout');
  });

  it('configures auto-start to launch hidden in the system tray', () => {
    // Verifies the auto-start hidden contract in main.cjs
    expect(mainSource).toContain('function isAutoStartHidden()');
    expect(mainSource).toContain("process.argv.includes('--hidden')");
    expect(mainSource).toContain("loginItemSettings?.wasOpenedAtLogin");
    expect(mainSource).toContain("!isAutoStartHidden()");
    expect(mainSource).toContain("args: ['--hidden']");
    expect(mainSource).toContain("$s.Arguments = '--hidden'");
    expect(mainSource).toContain('app.requestSingleInstanceLock()');
    expect(mainSource).toContain("app.on('second-instance'");
  });
});
