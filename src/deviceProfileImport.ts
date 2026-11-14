import { GRID_MACRO_ENCODER_SLOT, GRID_MACRO_KEY_SLOTS } from './deviceLayout';
import { actionToViaKeycode, type ViaKeymapSnapshot } from './qmkViaBridge';
import { buildViaConfiguration, viaKeycodeToProfileBinding, type PresetOperatingSystem } from './qmkProfileSync';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function importAssignment(existing: unknown, binding: { label: string; binding: string; actionType: string }) {
  const next = isRecord(existing) ? { ...existing } : {};
  delete next.execution;
  delete next.actionId;
  return { ...next, ...binding };
}

export interface DeviceProfileImportResult<T extends object> {
  profile: T;
  importedMappings: number;
  warnings: string[];
}

/** Import supported device-native mappings while keeping desktop-only KC_NO actions intact. */
export function importDeviceKeymapIntoProfile<T extends object>(
  profile: T,
  snapshot: ViaKeymapSnapshot,
  os: PresetOperatingSystem,
): DeviceProfileImportResult<T> {
  const profileWithLayers = profile as T & { layers?: unknown[] };
  const rawLayers = Array.isArray(profileWithLayers.layers) ? profileWithLayers.layers : [];
  const { config } = buildViaConfiguration(profile, os);
  const layers = rawLayers.map(layer => isRecord(layer) ? { ...layer } : {});
  const warnings: string[] = [];
  let importedMappings = 0;
  const layerLimit = Math.min(snapshot.capturedLayerCount, snapshot.layers.length, rawLayers.length, 8);

  if (snapshot.capturedLayerCount > rawLayers.length) {
    warnings.push(`The profile has ${rawLayers.length} layers; only those layers were imported from the device`);
  }

  const importOne = (
    layerIndex: number,
    slot: string,
    actualCode: number,
    expectedAction: { t?: string } | undefined,
    existing: unknown,
    assign: (value: Record<string, unknown>) => void,
  ) => {
    const expectedCode = expectedAction ? actionToViaKeycode(expectedAction) : null;
    if (expectedCode === actualCode) return;
    // KC_NO also hosts app-only actions. Preserve those, and any unrepresentable
    // desktop binding, unless the device contains a non-empty native mapping.
    if (actualCode === 0 && (expectedAction?.t === 'none' || expectedCode === null)) return;

    const imported = viaKeycodeToProfileBinding(actualCode);
    if (!imported) {
      warnings.push(`Layer ${layerIndex + 1} ${slot}: unsupported device keycode 0x${actualCode.toString(16)} was left unchanged`);
      return;
    }

    assign(importAssignment(existing, imported));
    importedMappings += 1;
  };

  for (let layerIndex = 0; layerIndex < layerLimit; layerIndex += 1) {
    const target = layers[layerIndex];
    const deviceLayer = snapshot.layers[layerIndex];
    const configLayer = config.layers[layerIndex];
    for (const slot of GRID_MACRO_KEY_SLOTS) {
      importOne(
        layerIndex,
        slot.toUpperCase(),
        deviceLayer.keys[slot],
        configLayer?.keys?.[slot],
        target[slot],
        value => { target[slot] = value; },
      );
    }

    const dial = isRecord(target[GRID_MACRO_ENCODER_SLOT])
      ? { ...target[GRID_MACRO_ENCODER_SLOT] }
      : {};
    const encoderActions = isRecord(dial.encoderActions) ? { ...dial.encoderActions } : {};
    let dialChanged = false;
    for (const direction of ['cw', 'press', 'ccw'] as const) {
      const existing = encoderActions[direction];
      importOne(
        layerIndex,
        `dial ${direction.toUpperCase()}`,
        deviceLayer.enc[direction],
        configLayer?.enc?.[direction],
        existing,
        value => { encoderActions[direction] = value; dialChanged = true; },
      );
    }
    if (dialChanged) target[GRID_MACRO_ENCODER_SLOT] = { ...dial, encoderActions };
  }

  return {
    profile: { ...profile, layers } as T,
    importedMappings,
    warnings,
  };
}
