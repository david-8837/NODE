import {
  VIA_PROTOCOL_VERSION,
  type BridgeResult,
  type ViaKeymapSnapshot,
} from './qmkViaBridge';

export const DEVICE_KEYMAP_BACKUP_FORMAT = 'node-studio-via-keymap-backup';
export const DEVICE_KEYMAP_BACKUP_VERSION = 1;
export const DEVICE_KEYMAP_BACKUP_HISTORY_KEY = 'cm2.device-keymap-backups.v1';
export const MAX_DEVICE_BACKUP_BYTES = 512 * 1024;
export const DEVICE_BACKUP_HISTORY_LIMIT = 10;

const HISTORY_FORMAT = 'node-studio-via-keymap-backup-history';
const KEY_SLOTS = ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3'];

export interface DeviceKeymapBackup {
  format: typeof DEVICE_KEYMAP_BACKUP_FORMAT;
  version: typeof DEVICE_KEYMAP_BACKUP_VERSION;
  createdAt: string;
  device: string;
  firmware: string | null;
  snapshot: ViaKeymapSnapshot;
}

interface BackupHistory {
  format: typeof HISTORY_FORMAT;
  version: 1;
  entries: DeviceKeymapBackup[];
}

export interface DeviceKeymapFileTools {
  savePreSyncSnapshot: (
    snapshot: ViaKeymapSnapshot,
    metadata?: { device?: string; firmware?: string | null; createdAt?: string },
  ) => BridgeResult;
  getLatestBackup: () => DeviceKeymapBackup | null;
  latestSummary: () => string;
  downloadLatestBackup: () => BridgeResult;
  restoreFromFile: (
    bridge?: RestoreBridge,
    metadata?: { device?: string; firmware?: string | null },
  ) => Promise<BridgeResult>;
}

type RestoreBridge = {
  request(request: {
    cmd: 'get_config' | 'restore_config';
    snapshot?: ViaKeymapSnapshot;
  }): Promise<BridgeResult>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fail(message: string): Error {
  return new Error(message);
}

function isKeycode(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 0xffff;
}

export function validateViaKeymapSnapshot(value: unknown): ViaKeymapSnapshot {
  if (!isRecord(value)) throw fail('Backup is missing its VIA keymap snapshot');
  const layerCount = value.layerCount;
  const capturedLayerCount = value.capturedLayerCount;
  if (value.protocolVersion !== VIA_PROTOCOL_VERSION) {
    throw fail('Backup uses an unsupported VIA protocol version');
  }
  if (!Number.isInteger(layerCount) || (layerCount as number) < 1 || (layerCount as number) > 32) {
    throw fail('Backup has an invalid device layer count');
  }
  const expectedLayers = Math.min(layerCount as number, 8);
  if (
    capturedLayerCount !== expectedLayers ||
    !Array.isArray(value.layers) ||
    value.layers.length !== expectedLayers
  ) {
    throw fail('Backup has an incomplete or invalid layer snapshot');
  }

  const layers = value.layers.map((rawLayer, index) => {
    if (!isRecord(rawLayer) || !isRecord(rawLayer.keys) || !isRecord(rawLayer.enc)) {
      throw fail(`Backup layer ${index + 1} is invalid`);
    }
    const keys: Record<string, number> = {};
    for (const slot of KEY_SLOTS) {
      if (!isKeycode(rawLayer.keys[slot])) {
        throw fail(`Backup layer ${index + 1} is missing a valid ${slot} keycode`);
      }
      keys[slot] = rawLayer.keys[slot] as number;
    }
    for (const direction of ['ccw', 'cw', 'press'] as const) {
      if (!isKeycode(rawLayer.enc[direction])) {
        throw fail(`Backup layer ${index + 1} has an invalid encoder ${direction.toUpperCase()} keycode`);
      }
    }
    return {
      keys,
      enc: {
        ccw: rawLayer.enc.ccw as number,
        cw: rawLayer.enc.cw as number,
        press: rawLayer.enc.press as number,
      },
    };
  });

  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: layerCount as number,
    capturedLayerCount: capturedLayerCount as number,
    layers,
  };
}

export function createDeviceKeymapBackup(
  snapshot: ViaKeymapSnapshot,
  metadata: { device?: string; firmware?: string | null; createdAt?: string } = {},
): DeviceKeymapBackup {
  const createdAt = metadata.createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(createdAt))) throw fail('Backup timestamp is invalid');
  return {
    format: DEVICE_KEYMAP_BACKUP_FORMAT,
    version: DEVICE_KEYMAP_BACKUP_VERSION,
    createdAt,
    device: metadata.device?.trim() || 'Grid Macro 1',
    firmware: metadata.firmware ?? null,
    snapshot: validateViaKeymapSnapshot(snapshot),
  };
}

export function stringifyDeviceKeymapBackup(backup: DeviceKeymapBackup): string {
  const text = JSON.stringify(backup, null, 2);
  if (new TextEncoder().encode(text).byteLength > MAX_DEVICE_BACKUP_BYTES) {
    throw fail(`Device keymap backups must be no larger than ${MAX_DEVICE_BACKUP_BYTES / 1024} KB`);
  }
  return text;
}

export function parseDeviceKeymapBackup(text: string): DeviceKeymapBackup {
  if (typeof text !== 'string' || new TextEncoder().encode(text).byteLength > MAX_DEVICE_BACKUP_BYTES) {
    throw fail(`Device keymap backups must be no larger than ${MAX_DEVICE_BACKUP_BYTES / 1024} KB`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw fail('Backup file is not valid JSON');
  }
  if (
    !isRecord(parsed) ||
    parsed.format !== DEVICE_KEYMAP_BACKUP_FORMAT ||
    parsed.version !== DEVICE_KEYMAP_BACKUP_VERSION
  ) {
    throw fail('This is not a supported Node Studio VIA keymap backup');
  }
  if (typeof parsed.createdAt !== 'string' || Number.isNaN(Date.parse(parsed.createdAt))) {
    throw fail('Backup timestamp is invalid');
  }
  if (typeof parsed.device !== 'string' || !parsed.device.trim()) {
    throw fail('Backup device name is invalid');
  }
  if (parsed.firmware !== null && parsed.firmware !== undefined && typeof parsed.firmware !== 'string') {
    throw fail('Backup firmware metadata is invalid');
  }
  return createDeviceKeymapBackup(validateViaKeymapSnapshot(parsed.snapshot), {
    createdAt: parsed.createdAt,
    device: parsed.device,
    firmware: typeof parsed.firmware === 'string' ? parsed.firmware : null,
  });
}

function readHistory(host: Window): BackupHistory {
  const text = host.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY);
  if (!text) return { format: HISTORY_FORMAT, version: 1, entries: [] };
  if (new TextEncoder().encode(text).byteLength > DEVICE_BACKUP_HISTORY_LIMIT * MAX_DEVICE_BACKUP_BYTES) {
    throw fail('Saved device backup history is larger than the supported limit');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw fail('Saved device backup history is corrupt; no new backup was written');
  }
  if (
    !isRecord(parsed) ||
    parsed.format !== HISTORY_FORMAT ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.entries) ||
    parsed.entries.length > DEVICE_BACKUP_HISTORY_LIMIT
  ) {
    throw fail('Saved device backup history is invalid; no new backup was written');
  }
  return {
    format: HISTORY_FORMAT,
    version: 1,
    entries: parsed.entries.map((entry) => parseDeviceKeymapBackup(JSON.stringify(entry))),
  };
}

function sameSnapshot(left: ViaKeymapSnapshot, right: ViaKeymapSnapshot): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readFileText(host: Window & typeof globalThis, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new host.FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? fail('Could not read backup file'));
    reader.onabort = () => reject(fail('Backup file reading was cancelled'));
    reader.readAsText(file);
  });
}

export function createDeviceKeymapFileTools(host?: Window & typeof globalThis): DeviceKeymapFileTools {
  const requireHost = (): Window & typeof globalThis => {
    if (!host) throw fail('Device backup tools need a browser window');
    return host;
  };

  const getLatestBackup = (): DeviceKeymapBackup | null => {
    try {
      return readHistory(requireHost()).entries[0] ?? null;
    } catch {
      return null;
    }
  };

  const latestSummary = (): string => {
    try {
      const history = readHistory(requireHost());
      const latest = history.entries[0];
      if (!latest) return 'No pre-sync backup saved in this browser';
      const date = new Date(latest.createdAt).toLocaleString();
      const layerSummary = latest.snapshot.layerCount > latest.snapshot.capturedLayerCount
        ? `${latest.snapshot.capturedLayerCount} of ${latest.snapshot.layerCount} layers`
        : `${latest.snapshot.capturedLayerCount} layers`;
      return `Saved locally ${date} · ${latest.device} · ${layerSummary} · ${history.entries.length} backup${history.entries.length === 1 ? '' : 's'}`;
    } catch (error) {
      return error instanceof Error ? error.message : 'Saved backup history is unreadable';
    }
  };

  const savePreSyncSnapshot: DeviceKeymapFileTools['savePreSyncSnapshot'] = (snapshot, metadata = {}) => {
    try {
      const browser = requireHost();
      const next = createDeviceKeymapBackup(snapshot, metadata);
      const history = readHistory(browser);
      if (history.entries[0] && sameSnapshot(history.entries[0].snapshot, next.snapshot)) {
        return { ok: true, localOnly: true };
      }
      const entries = [next, ...history.entries.filter((entry) => !sameSnapshot(entry.snapshot, next.snapshot))]
        .slice(0, DEVICE_BACKUP_HISTORY_LIMIT);
      browser.localStorage.setItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY, JSON.stringify({
        format: HISTORY_FORMAT,
        version: 1,
        entries,
      }));
      return { ok: true, localOnly: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  return {
    savePreSyncSnapshot,
    getLatestBackup,
    latestSummary,
    downloadLatestBackup: () => {
      try {
        const browser = requireHost();
        const latest = getLatestBackup();
        if (!latest) return { ok: false, error: 'No valid pre-sync device backup is saved in this browser' };
        const text = stringifyDeviceKeymapBackup(latest);
        const url = browser.URL.createObjectURL(new browser.Blob([text], { type: 'application/json' }));
        const link = browser.document.createElement('a');
        const timestamp = latest.createdAt.replace(/[:.]/g, '-');
        link.href = url;
        link.download = `grid-macro-1-via-keymap-${timestamp}.json`;
        browser.document.body.appendChild(link);
        link.click();
        link.remove();
        browser.setTimeout(() => browser.URL.revokeObjectURL(url), 0);
        return { ok: true, localOnly: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    restoreFromFile: (bridge, metadata = {}) => {
      if (!bridge) return Promise.resolve({ ok: false, error: 'QMK/VIA device bridge is unavailable' });
      try {
        const browser = requireHost();
        return new Promise((resolve) => {
          const input = browser.document.createElement('input');
          let settled = false;
          let preRestoreBackupSaved = false;
          const finish = (result: BridgeResult) => {
            if (settled) return;
            settled = true;
            input.remove();
            resolve(result);
          };
          input.type = 'file';
          input.accept = 'application/json,.json';
          input.style.display = 'none';
          input.setAttribute('aria-label', 'Choose a VIA keymap backup JSON file');
          input.addEventListener('cancel', () => finish({ ok: false, error: 'Restore cancelled' }), { once: true });
          input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) {
              finish({ ok: false, error: 'Restore cancelled' });
              return;
            }
            try {
              if (file.size > MAX_DEVICE_BACKUP_BYTES) {
                throw fail(`Device keymap backups must be no larger than ${MAX_DEVICE_BACKUP_BYTES / 1024} KB`);
              }
              const backup = parseDeviceKeymapBackup(await readFileText(browser, file));
              const accepted = browser.confirm(
                `Restore the ${backup.device} VIA keymap backup captured ${backup.createdAt}? This replaces supported key and encoder mappings on the connected device. Profiles and custom actions remain local to this browser.`,
              );
              if (!accepted) {
                finish({ ok: false, error: 'Restore cancelled' });
                return;
              }

              const current = await bridge.request({ cmd: 'get_config' });
              if (!current.ok || !current.snapshot) {
                throw fail(`Could not read the current device keymap for a pre-restore backup: ${current.error || 'no keymap snapshot returned'}`);
              }
              const saved = savePreSyncSnapshot(current.snapshot, metadata);
              if (!saved.ok) {
                throw fail(`Could not save the pre-restore device keymap locally: ${saved.error || 'storage failed'}`);
              }
              preRestoreBackupSaved = true;
              const restored = await bridge.request({ cmd: 'restore_config', snapshot: backup.snapshot });
              finish({ ...restored, preRestoreBackupSaved: true });
            } catch (error) {
              finish({
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                preRestoreBackupSaved,
              });
            }
          }, { once: true });
          browser.document.body.appendChild(input);
          input.click();
        });
      } catch (error) {
        return Promise.resolve({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    },
  };
}

export const deviceKeymapFileTools = typeof window === 'undefined'
  ? undefined
  : createDeviceKeymapFileTools(window);

declare global {
  interface Window {
    nodeStudioDeviceKeymapFiles?: DeviceKeymapFileTools;
  }
}

if (typeof window !== 'undefined' && deviceKeymapFileTools) {
  window.nodeStudioDeviceKeymapFiles = deviceKeymapFileTools;
}
