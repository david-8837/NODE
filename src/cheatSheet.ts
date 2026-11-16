import { GRID_MACRO_KEY_SLOTS } from './deviceLayout';

export type CheatSheetCommand = 'show' | 'hide' | 'toggle' | 'hold-start' | 'hold-end' | 'cancel-holds';
export type CheatSheetSnapshot = { layer: number; keys: string[]; available: boolean };

const TOOL_BINDINGS: Record<string, CheatSheetCommand> = {
  'show cheat-sheet': 'show',
  'show cheat-sheet hold': 'hold-start',
  'hide cheat-sheet': 'hide',
  'toggle cheat-sheet': 'toggle',
};
export function cheatSheetCommand(binding: string | undefined): CheatSheetCommand | undefined {
  return TOOL_BINDINGS[(binding ?? '').trim().toLowerCase()];
}

/** Capture held slots at press time so a later layer/profile edit cannot lose release. */
export function createCheatSheetTriggerHandler(send: (command: CheatSheetCommand, token?: string) => void) {
  const held = new Set<string>();
  return {
    handle(slot: string, pressed: boolean, binding?: string): boolean {
      if (!pressed && held.has(slot)) {
        held.delete(slot);
        send('hold-end', slot);
        return true;
      }
      const command = cheatSheetCommand(binding);
      if (!command) return false;
      if (pressed) {
        if (command === 'hold-start') {
          if (held.has(slot)) return true;
          held.add(slot);
        }
        send(command, slot);
      }
      return true;
    },
    cancel() { held.clear(); send('cancel-holds'); },
  };
}

export function cheatSheetSnapshot(profile: { layers: Array<Record<string, unknown>> } | undefined, layer: number): CheatSheetSnapshot {
  const assignments = profile?.layers[layer];
  return {
    layer: layer + 1,
    available: !!profile,
    keys: GRID_MACRO_KEY_SLOTS.map((slot) => {
      const raw = assignments?.[slot];
      if (!raw || typeof raw !== 'object') return '';
      const entry = raw as { label?: string; binding?: string; execution?: { kind?: string; value?: string; actionType?: string } };
      const binding = (entry.binding ?? '').trim();
      if (!binding || binding.toLowerCase() === 'blank') return '';
      const exec = entry.execution;
      if (exec?.kind === 'shortcut' && exec.value) return exec.value;
      if (exec?.kind === 'smart') {
        if (exec.actionType === 'Text') return (entry.label || 'Text').trim();
        if (exec.actionType === 'App' && exec.value) return exec.value;
      }
      if (exec?.kind === 'text') return (entry.label || 'Text').trim();
      if (exec?.kind === 'multi' || exec?.kind === 'sequence') return (entry.label || 'Multi-action').trim();
      // Preset bindings often use a descriptive label followed by a chord.
      const wrapped = binding.match(/\(([^()]+)\)$/);
      return (wrapped ? wrapped[1] : binding).replace(/\s+/g, ' ').trim();
    }),
  };
}
