import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const mainSource = readFileSync(join(process.cwd(), 'electron/main.cjs'), 'utf8');

/**
 * The packaged Windows smoke tests run on a build runner with no Micro Pad
 * attached, so the connection gate is the correct screen there. These contract
 * checks keep the smoke assertions aligned with the gate instead of letting them
 * silently demand an editable configurator that cannot appear without hardware.
 */
function block(startMarker: string, endMarker: string): string {
  const start = mainSource.indexOf(startMarker);
  expect(start, `main.cjs must contain ${startMarker}`).toBeGreaterThan(-1);
  const end = mainSource.indexOf(endMarker, start);
  expect(end, `main.cjs must contain ${endMarker} after ${startMarker}`).toBeGreaterThan(start);
  return mainSource.slice(start, end);
}

describe('packaged visual smoke test', () => {
  const visual = block('async function captureVisualSmokeScreenshot()', 'async function runPersistenceSmokeTest()');

  it('inspects the connection gate as well as the configurator', () => {
    expect(visual).toContain('data-testid="device-connection-gate"');
    expect(visual).toContain('gateVisible');
    expect(visual).toContain('gateHasIllustration');
    expect(visual).toContain('gateHasRetry');
  });

  it('accepts the gate only when it is complete and no editing surface leaked', () => {
    expect(visual).toContain('Connect your Micro Pad to continue.');
    // A gate with keys or navigation behind it must fail, not pass.
    expect(visual).toMatch(/renderedUi\.keyCount !== 0/);
    expect(visual).toMatch(/renderedUi\.hasNavigation/);
    expect(visual).toContain('leaked editing controls');
  });

  it('still verifies the full editor when a device is attached to the runner', () => {
    expect(visual).toMatch(/renderedUi\.keyCount !== 9/);
    expect(visual).toMatch(/!renderedUi\.hasEncoder/);
    expect(visual).toMatch(/renderedUi\.centerPadPosition !== 'relative'/);
  });

  it('always requires the renderer to have mounted', () => {
    expect(visual).toMatch(/if \(!renderedUi\.appMounted\)/);
  });
});

describe('packaged installed-app persistence smoke test', () => {
  const persistence = block('async function runPersistenceSmokeTest()', 'function startPersistenceSmokeTest');

  it('asserts stored data survived rather than requiring an editable screen', () => {
    // The profile pill is not mounted while the gate is up, so persistence must
    // be proven from storage plus native settings.
    expect(persistence).toContain("window.localStorage.getItem('cm2.state.v2')");
    expect(persistence).toMatch(/state\?\.profiles\?\.\[0\]\?\.name === expectedName/);
    expect(persistence).toContain('allowTerminalSmartActions === true');
    expect(persistence).toContain('structuredExecutionRestored');
  });

  it('records whether the gate was showing so the artifact explains the run', () => {
    expect(persistence).toContain('connectionGateVisible');
    expect(persistence).toContain('profileVisibleInEditor');
  });

  it('still fails if the configurator renders without the saved profile', () => {
    expect(persistence).toContain('if (!gateVisible && !profileVisible)');
    expect(persistence).toContain('without the saved profile visible');
  });
});
