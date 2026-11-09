/**
 * profileValidator.ts - Strict Profile Schema Validation & Sanitizer
 * Guarantees profile configuration integrity during import, export, and layer switching.
 */

export interface KeyAction {
  label: string;
  binding?: string;
  actionType?: string;
  icon?: string;
  color?: string;
  encoderActions?: {
    cw: { label: string; binding: string };
    ccw: { label: string; binding: string };
    press: { label: string; binding: string };
  };
}

export interface LayerConfig {
  [slot: string]: KeyAction;
}

export interface ProfileData {
  id: string;
  name: string;
  activeLayerIndex?: number;
  layers: LayerConfig[];
  color?: string;
  icon?: string;
  version?: string;
}

const REQUIRED_SLOTS = ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3'];

export function validateProfile(input: any): { valid: boolean; profile?: ProfileData; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Profile must be a valid JSON object' };
  }

  if (!input.name || typeof input.name !== 'string' || input.name.trim().length === 0) {
    return { valid: false, error: 'Profile must have a non-empty name' };
  }

  if (!Array.isArray(input.layers) || input.layers.length === 0) {
    return { valid: false, error: 'Profile must contain at least one layer in "layers" array' };
  }

  const sanitizedLayers: LayerConfig[] = [];

  for (let lIdx = 0; lIdx < input.layers.length; lIdx++) {
    const rawLayer = input.layers[lIdx];
    if (!rawLayer || typeof rawLayer !== 'object') {
      return { valid: false, error: `Layer ${lIdx} is invalid or not an object` };
    }

    const cleanLayer: LayerConfig = {};

    // Validate and sanitize standard 9 keys
    for (const slot of REQUIRED_SLOTS) {
      const slotData = rawLayer[slot] || { label: '', binding: '' };
      cleanLayer[slot] = {
        label: String(slotData.label || ''),
        binding: String(slotData.binding || ''),
        actionType: String(slotData.actionType || 'Shortcut'),
        icon: slotData.icon ? String(slotData.icon) : undefined,
        color: slotData.color ? String(slotData.color) : undefined,
      };
    }

    // Validate and sanitize dial
    const dialData = rawLayer['dial-tl'] || {};
    cleanLayer['dial-tl'] = {
      label: String(dialData.label || 'Dial'),
      binding: String(dialData.binding || ''),
      encoderActions: {
        cw: {
          label: String(dialData.encoderActions?.cw?.label || 'Vol+'),
          binding: String(dialData.encoderActions?.cw?.binding || 'volume +'),
        },
        ccw: {
          label: String(dialData.encoderActions?.ccw?.label || 'Vol-'),
          binding: String(dialData.encoderActions?.ccw?.binding || 'volume -'),
        },
        press: {
          label: String(dialData.encoderActions?.press?.label || 'Mute'),
          binding: String(dialData.encoderActions?.press?.binding || 'mute'),
        },
      },
    };

    sanitizedLayers.push(cleanLayer);
  }

  const sanitizedProfile: ProfileData = {
    id: String(input.id || `profile-${Date.now()}`),
    name: input.name.trim(),
    activeLayerIndex: Math.max(0, Math.min(Number(input.activeLayerIndex || 0), sanitizedLayers.length - 1)),
    layers: sanitizedLayers,
    color: input.color ? String(input.color) : '#0051ff',
    icon: input.icon ? String(input.icon) : 'Layers',
    version: String(input.version || '1.0.2'),
  };

  return { valid: true, profile: sanitizedProfile };
}

