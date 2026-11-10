const PROFILE_FILE_FORMAT = 'node-studio-profile';
const PROFILE_FILE_VERSION = 1;
export const MAX_PROFILE_FILE_BYTES = 2 * 1024 * 1024;
export const PROFILE_FILE_STORAGE_KEY = 'cm2.state.v2';

const PROFILE_LAYER_LIMIT = 8;
const PROFILE_LIMIT = 100;
const CUSTOM_ITEM_LIMIT = 1000;
const CUSTOM_TABS = ['Action', 'Multi-A', 'Smart-A'] as const;
const RESERVED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

type CustomTab = (typeof CUSTOM_TABS)[number];
type JsonRecord = Record<string, unknown>;

export interface ProfileFileState {
  profiles: JsonRecord[];
  activeProfileIndex: number;
  customItems: Record<CustomTab, JsonRecord[]>;
}

export interface ParsedProfileFile {
  profiles: JsonRecord[];
  activeProfileIndex: number;
  customItems: Record<CustomTab, JsonRecord[]>;
}

export interface ProfileFileResult {
  ok: boolean;
  error?: string;
}

export interface ProfileFileTools {
  maxBytes: number;
  parse: (text: string) => ParsedProfileFile;
  createExport: (profile: unknown, customItems?: unknown) => string;
  merge: (current: Partial<ProfileFileState>, imported: ParsedProfileFile) => ProfileFileState;
  pickFile: () => Promise<ParsedProfileFile | null>;
  download: (profile: unknown, customItems?: unknown) => ProfileFileResult;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function makeError(message: string): Error {
  return new Error(message);
}

function copyJson(value: unknown, depth = 0, budget = { nodes: 0 }): unknown {
  budget.nodes += 1;
  if (budget.nodes > 20_000) throw makeError('Profile file contains too many values');
  if (depth > 24) throw makeError('Profile file is nested too deeply');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 64 * 1024) throw makeError('Profile text field is too long');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw makeError('Profile contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > 2000) throw makeError('Profile array is too large');
    return value.map((item) => copyJson(item, depth + 1, budget));
  }
  if (!isRecord(value)) throw makeError('Profile contains an unsupported value');
  const entries = Object.entries(value);
  if (entries.length > 2000) throw makeError('Profile object has too many fields');
  const clean: JsonRecord = {};
  for (const [key, child] of entries) {
    if (RESERVED_KEYS.has(key)) continue;
    if (key.length > 256) throw makeError('Profile field name is too long');
    clean[key] = copyJson(child, depth + 1, budget);
  }
  return clean;
}

function normalizeProfile(input: unknown): JsonRecord {
  if (!isRecord(input)) throw makeError('Profile must be a JSON object');
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw makeError('Profile must have a non-empty name');
  }
  if (input.name.length > 120) throw makeError('Profile name must be 120 characters or fewer');
  if (!Array.isArray(input.layers) || input.layers.length < 1 || input.layers.length > PROFILE_LAYER_LIMIT) {
    throw makeError(`Profile must contain between 1 and ${PROFILE_LAYER_LIMIT} layers`);
  }
  const id = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : `imported-${Date.now()}`;
  if (id.length > 256) throw makeError('Profile id is too long');
  const layers = input.layers.map((layer, index) => {
    if (!isRecord(layer)) throw makeError(`Profile layer ${index + 1} must be an object`);
    const safeLayer = copyJson(layer) as JsonRecord;
    for (const [slot, assignment] of Object.entries(safeLayer)) {
      if (RESERVED_KEYS.has(slot)) continue;
      if (!isRecord(assignment)) throw makeError(`Profile layer ${index + 1} has an invalid ${slot} assignment`);
      for (const field of ['label', 'binding', 'actionType', 'actionId', 'iconId', 'emoji']) {
        if (assignment[field] !== undefined && typeof assignment[field] !== 'string') {
          throw makeError(`Profile layer ${index + 1} has an invalid ${slot} ${field}`);
        }
      }
      if (assignment.encoderActions !== undefined) {
        if (!isRecord(assignment.encoderActions)) {
          throw makeError(`Profile layer ${index + 1} has invalid ${slot} encoder actions`);
        }
        for (const direction of ['cw', 'press', 'ccw'] as const) {
          const encoderAction = assignment.encoderActions[direction];
          if (encoderAction === undefined) continue;
          if (!isRecord(encoderAction)) {
            throw makeError(`Profile layer ${index + 1} has an invalid ${slot} encoder ${direction} action`);
          }
          for (const field of ['label', 'binding']) {
            if (encoderAction[field] !== undefined && typeof encoderAction[field] !== 'string') {
              throw makeError(`Profile layer ${index + 1} has an invalid ${slot} encoder ${direction} ${field}`);
            }
          }
        }
      }
    }
    return safeLayer;
  });
  const profile = copyJson(input) as JsonRecord;
  profile.id = id;
  profile.name = input.name.trim();
  profile.color = typeof input.color === 'string' && input.color.length <= 64 ? input.color : '#0051ff';
  profile.layers = layers;
  if (input.activeLayerIndex !== undefined) {
    if (!Number.isInteger(input.activeLayerIndex) || (input.activeLayerIndex as number) < 0 || (input.activeLayerIndex as number) >= layers.length) {
      throw makeError('Profile activeLayerIndex is outside its layer list');
    }
  }
  return profile;
}

function emptyCustomItems(): Record<CustomTab, JsonRecord[]> {
  return { Action: [], 'Multi-A': [], 'Smart-A': [] };
}

function normalizeCustomItems(value: unknown): Record<CustomTab, JsonRecord[]> {
  const result = emptyCustomItems();
  if (value === undefined || value === null) return result;
  if (!isRecord(value)) throw makeError('Custom action data must be an object');
  for (const tab of CUSTOM_TABS) {
    const items = value[tab];
    if (items === undefined) continue;
    if (!Array.isArray(items) || items.length > CUSTOM_ITEM_LIMIT) {
      throw makeError(`Custom ${tab} items must be an array of at most ${CUSTOM_ITEM_LIMIT} entries`);
    }
    const seen = new Set<string>();
    result[tab] = items.map((item, index) => {
      if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim()) {
        throw makeError(`Custom ${tab} item ${index + 1} needs a non-empty id`);
      }
      if (item.id.length > 256) throw makeError(`Custom ${tab} item ${index + 1} has an id that is too long`);
      if (seen.has(item.id)) throw makeError(`Custom ${tab} items contain duplicate id "${item.id}"`);
      seen.add(item.id);
      const safeItem = copyJson(item) as JsonRecord;
      if (typeof safeItem.main !== 'string' || !safeItem.main.trim()) {
        throw makeError(`Custom ${tab} item ${index + 1} needs a non-empty name`);
      }
      for (const field of ['top', 'listLabel', 'macropadLabel', 'iconId', 'emoji', 'binding']) {
        if (safeItem[field] !== undefined && typeof safeItem[field] !== 'string') {
          throw makeError(`Custom ${tab} item ${index + 1} has an invalid ${field}`);
        }
      }
      return safeItem;
    });
  }
  return result;
}

function normalizeImportedProfiles(value: unknown): JsonRecord[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > PROFILE_LIMIT) {
    throw makeError(`Import must contain between 1 and ${PROFILE_LIMIT} profiles`);
  }
  return value.map(normalizeProfile);
}

function normalizeActiveIndex(index: unknown, profileCount: number): number {
  if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= profileCount) return 0;
  return index as number;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export function parseProfileFile(text: string): ParsedProfileFile {
  if (typeof text !== 'string' || byteLength(text) > MAX_PROFILE_FILE_BYTES) {
    throw makeError(`Profile files must be no larger than ${MAX_PROFILE_FILE_BYTES / 1024 / 1024} MB`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('Profile file is not valid JSON');
  }
  if (!isRecord(parsed)) throw makeError('Profile file must contain a JSON object');

  // Current versioned single-profile export format.
  if (parsed.format === PROFILE_FILE_FORMAT) {
    if (parsed.version !== PROFILE_FILE_VERSION) throw makeError('Profile file version is not supported');
    const profile = normalizeProfile(parsed.profile);
    return {
      profiles: [profile],
      activeProfileIndex: 0,
      customItems: normalizeCustomItems(parsed.customItems),
    };
  }

  // A complete browser-state backup from the v1 local-storage format.
  if (parsed.v === 1 && Array.isArray(parsed.profiles)) {
    const profiles = normalizeImportedProfiles(parsed.profiles);
    return {
      profiles,
      activeProfileIndex: normalizeActiveIndex(parsed.activeProfileIndex, profiles.length),
      customItems: normalizeCustomItems(parsed.customItems),
    };
  }

  // Legacy export: a raw profile object written directly as JSON.
  if (Array.isArray(parsed.layers)) {
    return {
      profiles: [normalizeProfile(parsed)],
      activeProfileIndex: 0,
      customItems: emptyCustomItems(),
    };
  }

  throw makeError('This is not a supported Node Studio profile file');
}

function normalizeExportProfile(profile: unknown): JsonRecord {
  if (!isRecord(profile)) return normalizeProfile(profile);
  const name = typeof profile.name === 'string' && !profile.name.trim()
    ? 'Untitled Profile'
    : profile.name;
  return normalizeProfile({ ...profile, name });
}

export function createProfileExport(profile: unknown, customItems?: unknown): string {
  const normalized = normalizeExportProfile(profile);
  const payload = {
    format: PROFILE_FILE_FORMAT,
    version: PROFILE_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    profile: normalized,
    customItems: normalizeCustomItems(customItems),
  };
  const text = JSON.stringify(payload, null, 2);
  if (byteLength(text) > MAX_PROFILE_FILE_BYTES) {
    throw makeError(`Profile export exceeds the ${MAX_PROFILE_FILE_BYTES / 1024 / 1024} MB file limit`);
  }
  return text;
}

function uniqueId(base: string, used: Set<string>): string {
  const safeBase = base.trim() || 'imported';
  let candidate = `imported-${safeBase}`;
  let suffix = 2;
  while (used.has(candidate)) candidate = `imported-${safeBase}-${suffix++}`;
  used.add(candidate);
  return candidate;
}

function tabForActionType(actionType: unknown): CustomTab | null {
  if (typeof actionType !== 'string') return null;
  if (/multi/i.test(actionType)) return 'Multi-A';
  if (/smart/i.test(actionType)) return 'Smart-A';
  if (/custom|action/i.test(actionType)) return 'Action';
  return null;
}

function remapActionReferences(value: unknown, remaps: Record<CustomTab, Map<string, string>>): unknown {
  if (Array.isArray(value)) return value.map((item) => remapActionReferences(item, remaps));
  if (!isRecord(value)) return value;
  const action = value.actionId;
  const tab = tabForActionType(value.actionType);
  let newActionId = action;
  if (typeof action === 'string') {
    if (tab) newActionId = remaps[tab].get(action) ?? action;
    else {
      for (const customTab of CUSTOM_TABS) {
        const mapped = remaps[customTab].get(action);
        if (mapped !== undefined) {
          newActionId = mapped;
          break;
        }
      }
    }
  }
  const result: JsonRecord = {};
  for (const [key, child] of Object.entries(value)) {
    if (RESERVED_KEYS.has(key)) continue;
    result[key] = key === 'actionId' ? newActionId : remapActionReferences(child, remaps);
  }
  return result;
}

export function mergeImportedProfiles(
  current: Partial<ProfileFileState>,
  imported: ParsedProfileFile,
): ProfileFileState {
  const currentProfiles = Array.isArray(current.profiles)
    ? current.profiles.map((profile) => {
        // The editor allows a newly added profile to remain unnamed until the
        // user edits its capsule. Keep that valid in-app state mergeable while
        // still requiring imported profile files to have a name.
        if (isRecord(profile) && typeof profile.name === 'string' && !profile.name.trim()) {
          const normalized = normalizeProfile({ ...profile, name: 'Untitled Profile' });
          normalized.name = profile.name;
          return normalized;
        }
        return normalizeProfile(profile);
      })
    : [];
  const existingIndex = normalizeActiveIndex(current.activeProfileIndex, Math.max(currentProfiles.length, 1));
  const baseCustom = normalizeCustomItems(current.customItems);
  const importedCustom = normalizeCustomItems(imported.customItems);
  const usedProfileIds = new Set(currentProfiles.map((profile) => String(profile.id)));
  const mergedProfiles = [...currentProfiles];
  const remaps: Record<CustomTab, Map<string, string>> = {
    Action: new Map(),
    'Multi-A': new Map(),
    'Smart-A': new Map(),
  };

  // Keep existing IDs stable; when an imported custom action collides, give its
  // imported copy a new ID and rewrite the profile's actionId reference.
  const globallyUsedActionIds = new Set(CUSTOM_TABS.flatMap((tab) => baseCustom[tab].map((item) => String(item.id))));
  for (const tab of CUSTOM_TABS) {
    const existingById = new Map(baseCustom[tab].map((item) => [String(item.id), item]));
    for (const item of importedCustom[tab]) {
      const id = String(item.id);
      const existing = existingById.get(id);
      if (existing && JSON.stringify(existing) === JSON.stringify(item)) {
        remaps[tab].set(id, id);
        continue;
      }
      if (globallyUsedActionIds.has(id)) {
        const nextId = uniqueId(id, globallyUsedActionIds);
        remaps[tab].set(id, nextId);
        baseCustom[tab].push({ ...item, id: nextId });
        existingById.set(nextId, item);
      } else {
        globallyUsedActionIds.add(id);
        remaps[tab].set(id, id);
        baseCustom[tab].push(item);
        existingById.set(id, item);
      }
    }
  }

  const importedProfileStartIndex = mergedProfiles.length;
  const importedProfiles = normalizeImportedProfiles(imported.profiles).map((profile) => {
    const next = remapActionReferences(profile, remaps) as JsonRecord;
    const id = String(next.id);
    if (usedProfileIds.has(id)) next.id = uniqueId(id, usedProfileIds);
    else usedProfileIds.add(id);
    mergedProfiles.push(next);
    return next;
  });
  const nextActiveIndex = importedProfileStartIndex + normalizeActiveIndex(
    imported.activeProfileIndex,
    importedProfiles.length,
  );

  if (mergedProfiles.length > PROFILE_LIMIT) {
    throw makeError(`This browser already has too many profiles to import another`);
  }
  return {
    profiles: mergedProfiles,
    activeProfileIndex: nextActiveIndex,
    customItems: baseCustom,
  };
}

function readFileText(host: Window & typeof globalThis, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new host.FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? makeError('Could not read profile file'));
    reader.onabort = () => reject(makeError('Profile file reading was cancelled'));
    reader.readAsText(file);
  });
}

export function createProfileFileTools(host?: Window & typeof globalThis): ProfileFileTools {
  const requireHost = (): Window & typeof globalThis => {
    if (!host) throw makeError('Profile file tools need a browser window');
    return host;
  };

  return {
    maxBytes: MAX_PROFILE_FILE_BYTES,
    parse: parseProfileFile,
    createExport: createProfileExport,
    merge: mergeImportedProfiles,
    pickFile: () => {
      const browser = requireHost();
      return new Promise((resolve, reject) => {
        const input = browser.document.createElement('input');
        let settled = false;
        const finish = (value: ParsedProfileFile | null, error?: unknown) => {
          if (settled) return;
          settled = true;
          input.remove();
          if (error) reject(error);
          else resolve(value);
        };
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.style.display = 'none';
        input.setAttribute('aria-label', 'Choose a Node Studio profile JSON file');
        input.addEventListener('cancel', () => finish(null), { once: true });
        input.addEventListener('change', async () => {
          const file = input.files?.[0];
          if (!file) {
            finish(null);
            return;
          }
          try {
            if (file.size > MAX_PROFILE_FILE_BYTES) {
              throw makeError(`Profile files must be no larger than ${MAX_PROFILE_FILE_BYTES / 1024 / 1024} MB`);
            }
            finish(parseProfileFile(await readFileText(browser, file)));
          } catch (error) {
            finish(null, error);
          }
        }, { once: true });
        browser.document.body.appendChild(input);
        input.click();
      });
    },
    download: (profile, customItems) => {
      try {
        const browser = requireHost();
        const text = createProfileExport(profile, customItems);
        const blob = new browser.Blob([text], { type: 'application/json' });
        const url = browser.URL.createObjectURL(blob);
        const link = browser.document.createElement('a');
        const normalized = normalizeExportProfile(profile);
        const safeName = String(normalized.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile';
        link.href = url;
        link.download = `${safeName}.json`;
        browser.document.body.appendChild(link);
        link.click();
        link.remove();
        browser.setTimeout(() => browser.URL.revokeObjectURL(url), 0);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
  };
}

export const profileFileTools = typeof window === 'undefined' ? undefined : createProfileFileTools(window);

declare global {
  interface Window {
    nodeStudioProfileFiles?: ProfileFileTools;
  }
}

if (typeof window !== 'undefined' && profileFileTools) {
  window.nodeStudioProfileFiles = profileFileTools;
}
