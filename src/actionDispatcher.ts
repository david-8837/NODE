import {
  type GridMacroSlotId,
  GRID_MACRO_ENCODER_SLOT,
} from './deviceLayout';
import type { GestureType } from './gestureEngine';
import {
  type DesktopExecutionDefinition,
  type SimulationActionHost,
} from './actionExecution';
import { readAppSettings, type NativeActionResult } from './appSettings';

export interface ActionDispatcherSlotEntry {
  id?: string;
  label?: string;
  binding?: string;
  actionType?: string;
  execution?: DesktopExecutionDefinition;
  encoderActions?: {
    cw?: ActionDispatcherSlotEntry;
    ccw?: ActionDispatcherSlotEntry;
    press?: ActionDispatcherSlotEntry;
  };
}

export type ActionDispatcherLayer = Record<string, ActionDispatcherSlotEntry>;

export interface DispatchOptions {
  source: 'hardware' | 'simulation';
  host?: SimulationActionHost;
  onLayerChange?: (index: number) => boolean | void;
  showToast?: (message: string) => void;
  allowTerminal?: boolean;
}

export interface ResolvedAction {
  type: string;
  value: string;
  payload: Record<string, unknown>;
  requiresConsent?: boolean;
}

export function resolveActionForGesture(
  slot: GridMacroSlotId,
  gesture: GestureType,
  layer: ActionDispatcherLayer
): ResolvedAction | null {
  const entry = layer[slot];
  if (!entry) return null;

  if (slot === GRID_MACRO_ENCODER_SLOT) {
    const pressEntry = entry.encoderActions?.press || entry;
    return resolveEntryAction(pressEntry, gesture);
  }

  return resolveEntryAction(entry, gesture);
}

export function resolveActionForDial(
  direction: 'cw' | 'ccw',
  layer: ActionDispatcherLayer
): ResolvedAction | null {
  const entry = layer[GRID_MACRO_ENCODER_SLOT];
  if (!entry) return null;

  const subEntry = entry.encoderActions?.[direction];
  if (!subEntry || subEntry.binding === 'blank' || subEntry.label === '—') {
    return null;
  }

  return resolveEntryAction(subEntry, 'onTap');
}

function resolveEntryAction(
  entry: ActionDispatcherSlotEntry,
  gesture: GestureType
): ResolvedAction | null {
  const execution = entry.execution;

  if (execution) {
    if (execution.kind === 'multi') {
      const targetShortcut = execution.gestures?.[gesture]?.trim();
      if (!targetShortcut) return null;
      return {
        type: 'Shortcut',
        value: targetShortcut,
        payload: { type: 'Shortcut', value: targetShortcut },
      };
    }

    if (execution.kind === 'smart') {
      // Smart Action executes on onTap (or single interaction)
      if (gesture !== 'onTap') return null;
      return {
        type: execution.actionType,
        value: execution.value,
        payload: {
          execution: {
            kind: 'smart',
            actionType: execution.actionType,
            value: execution.value,
            requiresConsent: execution.requiresConsent === true,
            ...(execution.applicationShortcutPath
              ? { applicationShortcutPath: execution.applicationShortcutPath }
              : {}),
          },
        },
        requiresConsent: execution.requiresConsent,
      };
    }

    if (execution.kind === 'text') {
      if (gesture !== 'onTap') return null;
      return {
        type: 'Text',
        value: execution.value,
        payload: { type: 'Text', value: execution.value },
      };
    }

    if (execution.kind === 'sequence') {
      if (gesture !== 'onTap') return null;
      return {
        type: 'Sequence',
        value: `Sequence (${execution.steps.length} steps)`,
        payload: { execution },
      };
    }

    if (execution.kind === 'shortcut') {
      if (gesture !== 'onTap') return null;
      return {
        type: 'Shortcut',
        value: execution.value,
        payload: { type: 'Shortcut', value: execution.value },
      };
    }
  }

  // Fallback to binding or label string if no execution object exists
  if (gesture !== 'onTap') return null;

  const binding = (entry.binding || '').trim();
  const label = (entry.label || '').trim();

  // Smart action pattern in binding string: (Web: ...), (App: ...), etc.
  const smartMatch = binding.match(/\((Web|App|Cmd|Text):\s*([^)]+)\)/i);
  if (smartMatch) {
    const actionType = smartMatch[1];
    const value = smartMatch[2].trim();
    return {
      type: actionType,
      value,
      payload: { type: actionType, value },
    };
  }

  // Multiaction pattern in binding string: (onTap: ..., doubleTap: ...)
  const gesturePattern = new RegExp(`${gesture}:\\s*([^,)]+)`, 'i');
  const multiMatch = binding.match(gesturePattern);
  if (multiMatch) {
    const value = multiMatch[1].trim();
    return {
      type: 'Shortcut',
      value,
      payload: { type: 'Shortcut', value },
    };
  }

  // Generic shortcut in parentheses
  const wrapped = binding.match(/\(([^)]+)\)/);
  const value = (wrapped ? wrapped[1].trim() : binding || label).trim();
  if (value && value !== 'blank' && value !== '—') {
    return {
      type: 'Shortcut',
      value,
      payload: { type: 'Shortcut', value },
    };
  }

  return null;
}

export async function dispatchResolvedAction(
  action: ResolvedAction,
  options: DispatchOptions
): Promise<NativeActionResult> {
  const host = options.host ?? (typeof window !== 'undefined' ? (window as unknown as SimulationActionHost) : undefined);
  if (!host) {
    return { success: false, error: 'No action host is available' };
  }

  const payload: Record<string, unknown> = {
    ...action.payload,
    executionSource: options.source,
  };

  const settings = host.nodeStudioAppSettings?.read() ?? readAppSettings(host);
  if (action.type.toLowerCase() === 'cmd' && settings.allowTerminalSmartActions !== true) {
    options.showToast?.('Terminal commands are disabled in Settings');
    return { success: false, error: 'Terminal commands are disabled in Settings' };
  }

  if (action.requiresConsent) {
    let confirmed = false;
    try {
      confirmed =
        typeof host.confirm === 'function' &&
        host.confirm(
          'This profile contains a terminal command. Run it only if you trust its contents.'
        );
    } catch {}
    if (!confirmed) {
      options.showToast?.('Imported terminal command was not run');
      return { success: false, error: 'Terminal command not confirmed' };
    }
    payload.commandConsent = true;
  }

  if (action.type.toLowerCase() === 'cmd') {
    payload.allowTerminal = settings.allowTerminalSmartActions === true;
  }

  options.showToast?.(
    action.type === 'Sequence'
      ? `Executed sequence: ${action.value}`
      : `Executed ${action.type}: ${action.value}`
  );

  const electronApi = host.electronAPI;
  try {
    if (electronApi?.executeSmartAction) {
      const result = await electronApi.executeSmartAction(payload);
      if (result && typeof result.success === 'boolean') {
        if (!result.success) {
          options.showToast?.(`Action failed: ${result.error || 'unknown error'}`);
        }
        return result;
      }
      return { success: true };
    }

    if (typeof host.fetch === 'function') {
      const response = await host.fetch('/api/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let jsonResult: unknown;
      try {
        jsonResult = await response.json();
      } catch {
        jsonResult = null;
      }
      if (
        jsonResult !== null &&
        typeof jsonResult === 'object' &&
        typeof (jsonResult as { success?: unknown }).success === 'boolean'
      ) {
        return jsonResult as NativeActionResult;
      }
      return response.ok
        ? { success: true }
        : { success: false, error: 'Action endpoint rejected request' };
    }

    return { success: false, error: 'No execution transport available' };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Desktop action failed';
    options.showToast?.(`Action failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
