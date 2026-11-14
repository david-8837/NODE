import { describe, expect, it } from 'vitest';
import {
  DEVICE_SYNC_CHECKPOINTS_KEY,
  loadDeviceSyncCheckpoint,
  saveDeviceSyncCheckpoint,
} from '../src/deviceSyncCheckpoint';
import { VIA_PROTOCOL_VERSION, type ViaKeymapSnapshot } from '../src/qmkViaBridge';

function snapshot(seed = 4): ViaKeymapSnapshot {
  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: 1,
    capturedLayerCount: 1,
    layers: [{
      keys: {
        r1c1: seed, r1c2: 5, r1c3: 6,
        r2c1: 7, r2c2: 8, r2c3: 9,
        r3c1: 10, r3c2: 11, r3c3: 12,
      },
      enc: { ccw: 170, cw: 169, press: 40 },
    }],
  };
}

function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    entries,
    storage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    },
  };
}

describe('per-device local synchronization checkpoints', () => {
  it('stores a validated common-base snapshot with checksums and a monotonic local revision', () => {
    const { storage } = memoryStorage();
    const first = saveDeviceSyncCheckpoint(storage, 'rp2040:unit-a', 'profile-a', snapshot(), 'desktop-state-1');
    const second = saveDeviceSyncCheckpoint(storage, 'rp2040:unit-a', 'profile-a', snapshot(5), 'desktop-state-2');

    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: true, checkpoint: { localRevision: 2, deviceId: 'rp2040:unit-a' } });
    expect(loadDeviceSyncCheckpoint(storage, 'rp2040:unit-a')).toEqual(second.checkpoint);
  });

  it('keeps independent checkpoints for separate physical units', () => {
    const { storage } = memoryStorage();
    saveDeviceSyncCheckpoint(storage, 'rp2040:unit-a', 'profile-a', snapshot(), 'desktop-a');
    saveDeviceSyncCheckpoint(storage, 'rp2040:unit-b', 'profile-b', snapshot(), 'desktop-b');

    expect(loadDeviceSyncCheckpoint(storage, 'rp2040:unit-a')?.profileId).toBe('profile-a');
    expect(loadDeviceSyncCheckpoint(storage, 'rp2040:unit-b')?.profileId).toBe('profile-b');
  });

  it('rejects corrupt stored checksums without overwriting the original data', () => {
    const { storage, entries } = memoryStorage();
    saveDeviceSyncCheckpoint(storage, 'rp2040:unit-a', 'profile-a', snapshot(), 'desktop-a');
    const corrupted = JSON.parse(entries.get(DEVICE_SYNC_CHECKPOINTS_KEY)!);
    corrupted.entries[0].snapshot.layers[0].keys.r1c1 = 999;
    entries.set(DEVICE_SYNC_CHECKPOINTS_KEY, JSON.stringify(corrupted));

    const corruptText = JSON.stringify(corrupted);
    expect(loadDeviceSyncCheckpoint(storage, 'rp2040:unit-a')).toBeNull();
    expect(saveDeviceSyncCheckpoint(storage, 'rp2040:unit-a', 'profile-a', snapshot(), 'desktop-a').ok).toBe(false);
    expect(entries.get(DEVICE_SYNC_CHECKPOINTS_KEY)).toBe(corruptText);
  });
});
