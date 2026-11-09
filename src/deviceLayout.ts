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

export type GridMacroSlotId =
  | (typeof GRID_MACRO_KEY_SLOTS)[number]
  | typeof GRID_MACRO_ENCODER_SLOT;
