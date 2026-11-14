import { validateViaKeymapSnapshot } from './deviceKeymapFiles';
import type { ViaKeymapSnapshot } from './qmkViaBridge';

export const DEVICE_SYNC_CHECKPOINTS_KEY = 'cm2.device-sync-checkpoints.v1';
export const DEVICE_SYNC_CHECKPOINTS_FORMAT = 'node-studio-device-sync-checkpoints';
export const DEVICE_SYNC_CHECKPOINTS_VERSION = 1;
const MAX_CHECKPOINTS = 16;
const MAX_CHECKPOINT_FILE_BYTES = 128 * 1024;

export interface DeviceSyncCheckpoint {
  deviceId: string;
  profileId: string;
  localRevision: number;
  updatedAt: string;
  snapshot: ViaKeymapSnapshot;
  snapshotChecksum: string;
  desktopChecksum: string;
}

interface CheckpointFile {
  format: typeof DEVICE_SYNC_CHECKPOINTS_FORMAT;
  version: typeof DEVICE_SYNC_CHECKPOINTS_VERSION;
  entries: DeviceSyncCheckpoint[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function checksumSyncState(text: string): string {
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
}

function canonicalSnapshot(snapshot: ViaKeymapSnapshot): string {
  return JSON.stringify(validateViaKeymapSnapshot(snapshot));
}

function validateCheckpoint(value: unknown): DeviceSyncCheckpoint {
  if (!isRecord(value) || typeof value.deviceId !== 'string' || !value.deviceId.trim() ||
      value.deviceId.length > 128 || typeof value.profileId !== 'string' || !value.profileId.trim() ||
      value.profileId.length > 128 || !Number.isSafeInteger(value.localRevision) || (value.localRevision as number) < 1 ||
      typeof value.updatedAt !== 'string' || Number.isNaN(Date.parse(value.updatedAt)) ||
      typeof value.snapshotChecksum !== 'string' || !/^[0-9a-f]{8}$/.test(value.snapshotChecksum) ||
      typeof value.desktopChecksum !== 'string' || !/^[0-9a-f]{8}$/.test(value.desktopChecksum)) {
    throw new Error('Saved device sync checkpoint is invalid');
  }
  const snapshot = validateViaKeymapSnapshot(value.snapshot);
  if (checksumSyncState(canonicalSnapshot(snapshot)) !== value.snapshotChecksum) {
    throw new Error('Saved device sync checkpoint checksum does not match its keymap');
  }
  return {
    deviceId: value.deviceId,
    profileId: value.profileId,
    localRevision: value.localRevision as number,
    updatedAt: value.updatedAt,
    snapshot,
    snapshotChecksum: value.snapshotChecksum,
    desktopChecksum: value.desktopChecksum,
  };
}

function readFile(storage: StorageLike): CheckpointFile {
  const text = storage.getItem(DEVICE_SYNC_CHECKPOINTS_KEY);
  if (!text) return { format: DEVICE_SYNC_CHECKPOINTS_FORMAT, version: DEVICE_SYNC_CHECKPOINTS_VERSION, entries: [] };
  if (new TextEncoder().encode(text).byteLength > MAX_CHECKPOINT_FILE_BYTES) {
    throw new Error('Saved device sync checkpoints exceed the supported size');
  }
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new Error('Saved device sync checkpoints are corrupt; no checkpoint was written'); }
  if (!isRecord(parsed) || parsed.format !== DEVICE_SYNC_CHECKPOINTS_FORMAT ||
      parsed.version !== DEVICE_SYNC_CHECKPOINTS_VERSION || !Array.isArray(parsed.entries) ||
      parsed.entries.length > MAX_CHECKPOINTS) {
    throw new Error('Saved device sync checkpoints are invalid; no checkpoint was written');
  }
  return {
    format: DEVICE_SYNC_CHECKPOINTS_FORMAT,
    version: DEVICE_SYNC_CHECKPOINTS_VERSION,
    entries: parsed.entries.map(validateCheckpoint),
  };
}

export function loadDeviceSyncCheckpoint(storage: StorageLike, deviceId: string): DeviceSyncCheckpoint | null {
  if (!deviceId?.trim()) return null;
  try { return readFile(storage).entries.find(entry => entry.deviceId === deviceId) ?? null; }
  catch { return null; }
}

export function saveDeviceSyncCheckpoint(
  storage: StorageLike,
  deviceId: string,
  profileId: string,
  snapshot: ViaKeymapSnapshot,
  desktopState: string,
): { ok: boolean; checkpoint?: DeviceSyncCheckpoint; error?: string } {
  try {
    if (!deviceId?.trim() || deviceId.length > 128 || !profileId?.trim() || profileId.length > 128) {
      throw new Error('A stable device ID and profile ID are required for a sync checkpoint');
    }
    if (typeof desktopState !== 'string' || desktopState.length > 2 * 1024 * 1024) {
      throw new Error('Desktop sync state exceeds the supported checkpoint limit');
    }
    const file = readFile(storage);
    const previous = file.entries.find(entry => entry.deviceId === deviceId);
    const cleanSnapshot = validateViaKeymapSnapshot(snapshot);
    const checkpoint: DeviceSyncCheckpoint = {
      deviceId,
      profileId,
      localRevision: (previous?.localRevision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      snapshot: cleanSnapshot,
      snapshotChecksum: checksumSyncState(canonicalSnapshot(cleanSnapshot)),
      desktopChecksum: checksumSyncState(desktopState),
    };
    const entries = [checkpoint, ...file.entries.filter(entry => entry.deviceId !== deviceId)]
      .slice(0, MAX_CHECKPOINTS);
    storage.setItem(DEVICE_SYNC_CHECKPOINTS_KEY, JSON.stringify({
      format: DEVICE_SYNC_CHECKPOINTS_FORMAT,
      version: DEVICE_SYNC_CHECKPOINTS_VERSION,
      entries,
    }));
    return { ok: true, checkpoint };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
