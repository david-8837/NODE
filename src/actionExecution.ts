import { readAppSettings, type NativeActionResult, type SimulationToggleResult } from './appSettings';
import { cheatSheetCommand } from './cheatSheet';
import {
  MultiActionGestureEngine,
  type MultiActionGestureBindings,
  type MultiActionTimerHost,
} from './multiActionGestureEngine';

export type MultiGestureKey = 'onTap' | 'doubleTap' | 'onHold' | 'tapHold';
export type SmartActionSubTab = 'Text' | 'Cmd' | 'Web' | 'App';

export type DesktopExecutionStep =
  | { kind: 'key'; key: string; mode?: 'press-release' | 'press' | 'release'; delayAfterMs?: number }
  | { kind: 'text'; text: string; interKeyDelayMs?: number; delayAfterMs?: number }
  | { kind: 'wait'; durationMs: number };

export type DesktopExecutionDefinition =
  | { kind: 'shortcut'; value: string }
  | { kind: 'sequence'; steps: DesktopExecutionStep[] }
  | { kind: 'text'; value: string }
  | {
      kind: 'smart';
      actionType: SmartActionSubTab;
      value: string;
      requiresConsent?: boolean;
      applicationShortcutPath?: string;
    }
  | { kind: 'multi'; gestures: Partial<Record<MultiGestureKey, string>>; tappingTermMs?: number };

export type SimulationAction = {
  id?: string;
  binding?: string;
  label?: string;
  actionType?: string;
  execution?: DesktopExecutionDefinition;
  gesture?: MultiGestureKey;
};

export type SimulationActionHost = Window & typeof globalThis;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function dispatchHttpAction(
  host: SimulationActionHost,
  payload: Record<string, unknown>
): Promise<NativeActionResult> {
  if (typeof host.fetch !== 'function') {
    return { success: false, error: 'The local desktop action endpoint is unavailable' };
  }
  try {
    const response = await host.fetch('/api/execute-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let result: unknown;
    try { result = await response.json(); } catch { result = null; }
    if (isRecord(result) && typeof result.success === 'boolean') {
      return {
        success: result.success,
        message: typeof result.message === 'string' ? result.message : undefined,
        error: typeof result.error === 'string' ? result.error : undefined,
      };
    }
    return response.ok
      ? { success: true }
      : { success: false, error: 'The local desktop action endpoint rejected the action' };
  } catch {
    return { success: false, error: 'The local desktop action endpoint could not be reached' };
  }
}

async function dispatchAction(
  host: SimulationActionHost,
  payload: Record<string, unknown>
): Promise<NativeActionResult> {
  const execute = host.electronAPI?.executeSmartAction;
  try {
    if (execute) {
      const result = await execute(payload);
      if (result && typeof result.success === 'boolean') return result;
      if (result && typeof (result as unknown as { ok?: unknown }).ok === 'boolean') {
        return {
          success: (result as unknown as { ok: boolean }).ok,
          message: result.message,
          error: result.error,
        };
      }
      return { success: true };
    }
    return await dispatchHttpAction(host, payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'The desktop action failed',
    };
  }
}

export async function requestSimulationMode(
  enabled: boolean,
  host: SimulationActionHost
): Promise<SimulationToggleResult> {
  const setNative = host.electronAPI?.setSimulationEnabled;
  try {
    if (setNative) return await setNative(enabled);
    if (typeof host.fetch !== 'function') {
      return { ok: false, enabled: false, error: 'The local desktop action endpoint is unavailable' };
    }
    const response = await host.fetch('/api/simulation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    let result: unknown;
    try { result = await response.json(); } catch { result = null; }
    if (isRecord(result) && typeof result.success === 'boolean') {
      return {
        ok: result.success,
        enabled: result.enabled === true,
        error: typeof result.error === 'string' ? result.error : undefined,
      };
    }
    return response.ok
      ? { ok: true, enabled }
      : { ok: false, enabled: false, error: 'Simulation is unavailable from this origin' };
  } catch (error) {
    return {
      ok: false,
      enabled: false,
      error: error instanceof Error ? error.message : 'Could not update Simulation mode',
    };
  }
}

/**
 * A gesture/slot value may reference a Smart Action, either wrapped "(Text: hi)"
 * or bare "Text: hi". The wrapped form is unwrapped by removing exactly one
 * leading '(' and its matching final ')', so text that itself contains
 * parentheses (e.g. "12:30 (noon)") survives intact.
 */
function smartPayloadFromBinding(rawValue: string): {
  payload: Record<string, unknown>;
  type: string;
  value: string;
} | null {
  let value = rawValue.trim();
  if (value.startsWith('(') && value.endsWith(')')) {
    value = value.slice(1, -1).trim();
  }
  const match = value.match(/^(Web|App|Cmd|Text)\s*:\s*([\s\S]+)$/i);
  if (!match) return null;
  const inner = match[2].trim();
  if (!inner) return null;
  // Canonicalise capitalisation so downstream consent/allow-list checks match.
  const type = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
  return { payload: { type, value: inner }, type, value: inner };
}

/**
 * The binding a gesture actually resolves to. For a structured Multi-Action the
 * summary string lists *every* gesture, so it must never be used to decide what
 * a single resolved gesture does.
 */
function resolvedBindingFor(action: SimulationAction): string | null {
  const execution = action.execution;
  if (execution?.kind !== 'multi') return null;
  const gesture = action.gesture || 'onTap';
  return execution.gestures[gesture]?.trim() || '';
}

function executePayloadFor(action: SimulationAction): {
  payload: Record<string, unknown>;
  type: string;
  value: string;
  requiresConsent?: boolean;
} | null {
  const execution = action.execution;
  if (!execution) return null;
  if (execution.kind === 'shortcut') {
    return { payload: { type: 'Shortcut', value: execution.value }, type: 'Shortcut', value: execution.value };
  }
  if (execution.kind === 'sequence') {
    return {
      payload: { type: 'Sequence', steps: execution.steps },
      type: 'Sequence',
      value: `${execution.steps.length} steps`,
    };
  }
  if (execution.kind === 'text') {
    return { payload: { type: 'Text', value: execution.value }, type: 'Text', value: execution.value };
  }
  if (execution.kind === 'smart') {
    return {
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
      type: execution.actionType,
      value: execution.value,
      requiresConsent: execution.requiresConsent,
    };
  }
  const gesture = action.gesture || 'onTap';
  const value = execution.gestures[gesture]?.trim() || '';
  if (!value) return null;
  // A gesture may hold a Smart Action, not just a chord. Dispatching "(Text: …)"
  // as a Shortcut made the executor reject it as an unsupported key.
  const smart = smartPayloadFromBinding(value);
  if (smart) return smart;
  return { payload: { type: 'Shortcut', value }, type: 'Shortcut', value };
}

/** Parse multi-action gestures from structured execution or legacy summary string. */
export function extractMultiActionConfig(action: SimulationAction | null | undefined): {
  gestures: MultiActionGestureBindings;
  tappingTermMs?: number;
} | null {
  if (!action) return null;
  if (action.execution?.kind === 'multi') {
    return {
      gestures: { ...action.execution.gestures },
      tappingTermMs: action.execution.tappingTermMs,
    };
  }
  const binding = action.binding || '';
  if (!/(onTap|doubleTap|onHold|tapHold):/i.test(binding)) return null;
  const gestures: MultiActionGestureBindings = {};
  for (const key of ['onTap', 'doubleTap', 'onHold', 'tapHold'] as const) {
    const match = binding.match(new RegExp(`${key}:\\s*([^,)]+)`, 'i'));
    if (match?.[1]?.trim()) {
      gestures[key] = match[1].trim();
    }
  }
  return Object.keys(gestures).length > 0 ? { gestures } : null;
}

/** Execute one configured key from explicit Simulation mode or a verified hardware trigger. */
export function triggerSimulationAction(
  action: SimulationAction | null | undefined,
  onLayerChange: (index: number) => boolean | void,
  showToast: (message: string) => void,
  host: SimulationActionHost,
  options?: { hardwareTrigger?: boolean; onProfileChange?: (index: number) => boolean | void }
): void {
  if (!action) return;
  const binding = action.binding || '';
  const label = action.label || '';
  const id = action.id || '';

  // A resolved Multi-Action gesture must be judged on its OWN binding. Matching
  // the whole summary let an `onHold: Layer 2` entry hijack `onTap: Ctrl + C`.
  const resolvedGestureBinding = resolvedBindingFor(action);
  const layerSourceBinding = resolvedGestureBinding === null ? binding : resolvedGestureBinding;
  const cheatCommand = cheatSheetCommand(layerSourceBinding);
  if (cheatCommand) {
    if (!host.electronAPI?.commandCheatSheet) showToast('Cheat-Sheet requires NODE studio desktop');
    else if (cheatCommand === 'hold-start') showToast('Hold a key to show the Cheat-Sheet');
    else void host.electronAPI.commandCheatSheet(cheatCommand);
    return;
  }
  const isResolvedGesture = resolvedGestureBinding !== null;
  const layerMatch =
    (isResolvedGesture ? null : id.match(/^(?:t?lyr)-(\d+)$/)) ||
    layerSourceBinding.trim().match(/^(?:temp\s+)?layer\s*(\d+)$/i) ||
    (isResolvedGesture ? null : label.match(/^L(\d+)$/i)) ||
    (isResolvedGesture ? null : label.match(/^TL(\d+)$/i));
  if (layerMatch) {
    const targetLayer = Number.parseInt(layerMatch[1], 10) - 1;
    if (targetLayer >= 0) {
      if (onLayerChange(targetLayer) !== false) {
        showToast(`Switched to Layer ${targetLayer + 1}`);
      }
      return;
    }
  }

  const profileMatch = layerSourceBinding.trim().match(/^profile\s+(\d+)$/i);
  if (profileMatch) {
    const target = Number(profileMatch[1]) - 1;
    if (target >= 0 && options?.onProfileChange) {
      if (options.onProfileChange(target) !== false) showToast(`Switched to Profile ${target + 1}`);
    } else {
      showToast('Profile switching is unavailable');
    }
    return;
  }

  let actionToRun = executePayloadFor(action);
  if (!actionToRun) {
    const smartMatch = binding.match(/\((Web|App|Cmd|Text):\s*([^)]+)\)/i);
    if (smartMatch) {
      actionToRun = {
        payload: { type: smartMatch[1], value: smartMatch[2].trim() },
        type: smartMatch[1],
        value: smartMatch[2].trim(),
      };
    }
  }
  if (!actionToRun && !action.execution) {
    const gestureKey = action.gesture || 'onTap';
    const multiMatch = binding.match(new RegExp(`${gestureKey}:\\s*([^,)]+)`, 'i')) ?? binding.match(/onTap:\s*([^,)]+)/i);
    if (multiMatch) {
      const value = multiMatch[1].trim();
      actionToRun = { payload: { type: 'Shortcut', value }, type: 'Shortcut', value };
    }
  }
  if (!actionToRun && !action.execution) {
    const wrappedShortcut = binding.match(/\(([^)]+)\)/);
    const value = (wrappedShortcut ? wrappedShortcut[1].trim() : binding || label).trim();
    if (value && value !== 'blank' && value !== '—') {
      actionToRun = { payload: { type: 'Shortcut', value }, type: 'Shortcut', value };
    }
  }
  if (!actionToRun) return;

  const settings = host.nodeStudioAppSettings?.read() ?? readAppSettings(host);
  if (actionToRun.type.toLowerCase() === 'cmd' && settings.allowTerminalSmartActions !== true) {
    showToast('Terminal commands are disabled in Settings');
    return;
  }
  if (actionToRun.requiresConsent) {
    let confirmed = false;
    try {
      confirmed = typeof host.confirm === 'function' && host.confirm(
        'This imported profile contains a terminal command. Run it only if you trust its contents.'
      );
    } catch {}
    if (!confirmed) {
      showToast('Imported terminal command was not run');
      return;
    }
    actionToRun.payload.commandConsent = true;
  }
  if (actionToRun.type.toLowerCase() === 'cmd') {
    actionToRun.payload.allowTerminal = settings.allowTerminalSmartActions === true;
  }
  if (options?.hardwareTrigger) {
    actionToRun.payload.hardwareTrigger = true;
  }

  showToast(
    actionToRun.type === 'Sequence'
      ? `Executed sequence: ${actionToRun.value}`
      : `Executed ${actionToRun.type}: ${actionToRun.value}`
  );
  void dispatchAction(host, actionToRun.payload).then((result) => {
    if (!result.success) showToast(`Action failed: ${result.error || 'unknown error'}`);
  });
}

export interface HardwareTriggerController {
  handleSlotEvent: (
    slotId: string,
    pressed: boolean,
    action: SimulationAction | null | undefined
  ) => void;
  cancelAll: () => void;
}

export function createHardwareTriggerController(
  onLayerChange: (index: number) => boolean | void,
  showToast: (message: string) => void,
  host: SimulationActionHost,
  timerHost?: MultiActionTimerHost,
  onProfileChange?: (index: number) => boolean | void
): HardwareTriggerController {
  const pendingActions = new Map<string, SimulationAction>();
  const gestureEngine = new MultiActionGestureEngine((resolved) => {
    const sourceAction = pendingActions.get(resolved.slotId);
    triggerSimulationAction(
      {
        ...(sourceAction ?? {}),
        gesture: resolved.gesture,
        execution: {
          kind: 'multi',
          gestures: { [resolved.gesture]: resolved.binding },
        },
      },
      onLayerChange,
      showToast,
      host,
      { hardwareTrigger: true, onProfileChange }
    );
  }, timerHost);

  return {
    handleSlotEvent(slotId, pressed, action) {
      if (!action) {
        if (!pressed) gestureEngine.handleKeyUp(slotId);
        return;
      }
      const multiConfig = extractMultiActionConfig(action);
      if (multiConfig) {
        pendingActions.set(slotId, action);
        if (pressed) {
          gestureEngine.handleKeyDown(slotId, multiConfig);
        } else {
          gestureEngine.handleKeyUp(slotId);
        }
        return;
      }
      if (pressed) {
        triggerSimulationAction(action, onLayerChange, showToast, host, { hardwareTrigger: true, onProfileChange });
      }
    },
    cancelAll() {
      gestureEngine.cancelAll();
      pendingActions.clear();
    },
  };
}
