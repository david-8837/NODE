export const GRID_MACRO_KEY_SLOTS = [
  'r1c1',
  'r1c2',
  'r1c3',
  'r2c1',
  'r2c2',
  'r2c3',
  'r3c1',
  'r3c2',
  'r3c3',
] as const;

export const GRID_MACRO_ENCODER_SLOT = 'dial-tl' as const;

export const MAX_HARDWARE_PROFILES = 4 as const;
export const MAX_HARDWARE_LAYERS = 4 as const;
export const HARDWARE_LAYER_NAMES = ['BASE', 'MEDIA', 'NUMPAD', 'FN'] as const;

export type GridMacroSlotId =
  | (typeof GRID_MACRO_KEY_SLOTS)[number]
  | typeof GRID_MACRO_ENCODER_SLOT;

export type HardwareLayerName = (typeof HARDWARE_LAYER_NAMES)[number];
