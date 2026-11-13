import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BackgroundAgent, selectViaRawHidDevice, validateProfilesData } = require('../electron/backgroundAgent.cjs');

describe('Background Agent safety boundaries', () => {
  let tempDir = '';
  let agent: any = null;

  afterEach(() => {
    if (agent) {
      agent.close();
      agent = null;
    }
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('selects only the exact QMK Raw HID collection', () => {
    const candidates = [
      { vendorId: 0xfeed, productId: 0x6001, usagePage: 0x01, usage: 0x06, path: 'keyboard' },
      { vendorId: 0xfeed, productId: 0x6001, usagePage: undefined, usage: undefined, path: 'unknown' },
      { vendorId: 0xfeed, productId: 0x6001, usagePage: 0xff60, usage: 0x62, path: 'other-raw' },
      { vendorId: 0xfeed, productId: 0x6001, usagePage: 0xff60, usage: 0x61, path: 'raw' },
    ];

    expect(selectViaRawHidDevice(candidates)).toBe(candidates[3]);
    expect(selectViaRawHidDevice(candidates.slice(0, 3))).toBeNull();
  });

  it('preserves an unreadable Agent profile instead of replacing it with a default', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'node-agent-profile-'));
    const profilePath = join(tempDir, 'profiles.json');
    const original = '{ this is a damaged profile file';
    writeFileSync(profilePath, original, 'utf8');

    agent = new BackgroundAgent({ profilesPath: profilePath, hidModule: null });

    expect(agent.profileStorageReady).toBe(false);
    expect(readFileSync(profilePath, 'utf8')).toBe(original);
    expect(agent.saveProfilesAtomic()).toBe(false);
    expect(readFileSync(profilePath, 'utf8')).toBe(original);
  });

  it('rejects empty, duplicate, and structurally invalid profiles', () => {
    expect(validateProfilesData({ profiles: [] }).ok).toBe(false);
    expect(validateProfilesData({ profiles: [
      { id: 'same', layers: [{}] },
      { id: 'same', layers: [{}] },
    ] }).ok).toBe(false);
    expect(validateProfilesData({ profiles: [{ id: 'p1', layers: [] }] }).ok).toBe(false);
    expect(validateProfilesData({ profiles: [{ id: 'p1', layers: [{}] }], activeProfileId: 'missing' }).ok).toBe(false);
    expect(validateProfilesData({ profiles: [{ id: 'p1', layers: [{ slots: {} }] }], activeProfileId: 'p1' }).ok).toBe(true);
  });
});
