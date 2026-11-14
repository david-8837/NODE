import type { GridMacroSlotId } from './deviceLayout';
import type { DesktopExecutionDefinition } from './actionExecution';

export type KeySlotId = GridMacroSlotId;

export type MappingTabId = 'Basic' | 'Action' | 'Multi-A' | 'Smart-A';
export type EncoderSubActionId = 'cw' | 'press' | 'ccw';

export interface EncoderSubBinding {
  label: string;
  binding: string;
  actionId?: string;
  actionType?: KeyAssignment['actionType'];
  execution?: DesktopExecutionDefinition;
}

export const BLANK_ENCODER_ACTIONS: Record<EncoderSubActionId, EncoderSubBinding> = {
  cw: { label: '', binding: 'blank' },
  press: { label: '', binding: 'blank' },
  ccw: { label: '', binding: 'blank' },
};

export interface KeyAssignment {
  label: string;
  actionType:
    | 'Basic input'
    | 'Shortcut'
    | 'Multi-step action'
    | 'Smart Action'
    | 'Layer Cycle';
  binding: string;
  iconId?: string;
  actionId?: string;
  color?: string;
  execution?: DesktopExecutionDefinition;
  encoderActions?: Record<EncoderSubActionId, EncoderSubBinding>;
}

export type LayerKeymap = Record<KeySlotId, KeyAssignment> & { presetId?: string };

export function formatEncoderShortLabel(text: string): string {
  const clean = text.trim();
  if (!clean) return '—';
  if (clean.length <= 3) return clean;
  return `${clean.slice(0, 2).toLowerCase()}...`;
}

export function getEncoderActions(
  assignment: KeyAssignment
): Record<EncoderSubActionId, EncoderSubBinding> {
  return assignment.encoderActions || BLANK_ENCODER_ACTIONS;
}

