import type { ViaKeymapSnapshot } from './qmkViaBridge';
import { validateViaKeymapSnapshot } from './deviceKeymapFiles';

export interface ViaMacroFile {
  format: 'node-studio-via-macros';
  version: 1;
  device: string;
  firmware: string | null;
  createdAt: string;
  count: number;
  bytes: number[];
  keymap?: ViaKeymapSnapshot;
}

/** Strictly validate the entire raw buffer and metadata before any device write. */
export function parseViaMacroFile(text: string): ViaMacroFile {
  if (new TextEncoder().encode(text).length > 100_000) throw new Error('Macro backup is too large');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Macro backup is not valid JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid macro backup');
  const file = value as Record<string, unknown>;
  if (file.format !== 'node-studio-via-macros' || file.version !== 1 ||
      typeof file.device !== 'string' || !file.device.trim() || file.device.length > 256 ||
      !(file.firmware === null || (typeof file.firmware === 'string' && file.firmware.length <= 256)) ||
      typeof file.createdAt !== 'string' || Number.isNaN(Date.parse(file.createdAt)) ||
      !Number.isInteger(file.count) || (file.count as number) < 0 || (file.count as number) > 255 ||
      !Array.isArray(file.bytes) || file.bytes.length < 1 || file.bytes.length > 4096 || file.bytes[file.bytes.length - 1] !== 0 ||
      file.bytes.filter(byte => byte === 0).length < (file.count as number) ||
      !file.bytes.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) throw new Error('Invalid or incomplete VIA macro backup');
  return { format: 'node-studio-via-macros', version: 1, device: file.device, firmware: file.firmware as string | null,
    createdAt: file.createdAt, count: file.count as number, bytes: [...file.bytes],
    ...(file.keymap !== undefined ? { keymap: validateViaKeymapSnapshot(file.keymap) } : {}) };
}

/** Save a new independent recovery record, never replacing older ones. */
export function saveViaRecovery(storage: Storage, data: ViaMacroFile, diagnostic = false): string {
  const text = JSON.stringify(data);
  const base = `cm2.via-macro-${diagnostic ? 'diagnostic' : 'recovery'}.${Date.now()}`;
  let key = base;
  for (let suffix = 0; storage.getItem(key) !== null; suffix++) {
    if (suffix >= 1000) throw new Error('Could not allocate a recovery backup key');
    key = `${base}.${suffix + 1}`;
  }
  storage.setItem(key, text);
  if (storage.getItem(key) !== text) throw new Error('Recovery copy could not be verified in local storage');
  return key;
}

/** Locate the newest saved recovery record after a restart without changing it. */
export function latestViaRecoveryKey(storage: Storage, diagnostic = false): string {
  const prefix = diagnostic ? 'cm2.via-macro-diagnostic.' : 'cm2.via-macro-recovery.';
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key?.startsWith(prefix) && /^\d+(?:\.\d+)?$/.test(key.slice(prefix.length))) keys.push(key);
  }
  return keys.sort((a, b) => {
    const parts = (key: string) => key.slice(prefix.length).split('.').map(Number);
    const aa = parts(a), bb = parts(b);
    return (bb[0] - aa[0]) || ((bb[1] || 0) - (aa[1] || 0));
  })[0] || '';
}
