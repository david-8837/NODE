import { readAppSettings } from './appSettings';

type SimulationAction = {
  id?: string;
  binding?: string;
  label?: string;
};

export type SimulationActionHost = Window & typeof globalThis;

function dispatchHttpAction(host: SimulationActionHost, payload: Record<string, unknown>): void {
  try {
    if (typeof host.fetch === 'function') {
      void host.fetch('/api/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => undefined);
    }
  } catch {
    // A failed local development endpoint must not crash the UI.
  }
}

function dispatchAction(host: SimulationActionHost, payload: Record<string, unknown>): void {
  const execute = host.electronAPI?.executeSmartAction;
  try {
    if (execute) {
      void Promise.resolve(execute(payload)).catch(() => undefined);
      return;
    }
    dispatchHttpAction(host, payload);
  } catch {
    // A failed native bridge or local development endpoint must not crash the UI.
  }
}

/** Execute one configured key only from the explicit Simulation mode. */
export function triggerSimulationAction(
  action: SimulationAction | null | undefined,
  onLayerChange: (index: number) => boolean | void,
  showToast: (message: string) => void,
  host: SimulationActionHost
): void {
  if (!action) return;
  const binding = action.binding || '';
  const label = action.label || '';
  const id = action.id || '';

  const layerMatch =
    id.match(/lyr-(\d+)/) ||
    binding.match(/Layer\s*(\d+)/i) ||
    label.match(/^L(\d+)$/i) ||
    label.match(/^TL(\d+)$/i);
  if (layerMatch) {
    const targetLayer = Number.parseInt(layerMatch[1], 10) - 1;
    if (targetLayer >= 0) {
      if (onLayerChange(targetLayer) !== false) {
        showToast(`Switched to Layer ${targetLayer + 1}`);
      }
      return;
    }
  }

  const smartMatch = binding.match(/\((Web|App|Cmd|Text):\s*([^)]+)\)/i);
  if (smartMatch) {
    const type = smartMatch[1];
    const value = smartMatch[2].trim();
    const settings = host.nodeStudioAppSettings?.read() ?? readAppSettings(host);
    if (type.toLowerCase() === 'cmd' && settings.allowTerminalSmartActions !== true) {
      showToast('Terminal commands are disabled in Settings');
      return;
    }

    showToast(`Executed ${type}: ${value}`);
    const payload: Record<string, unknown> = { type, value };
    if (type.toLowerCase() === 'cmd') {
      payload.allowTerminal = settings.allowTerminalSmartActions === true;
    }
    dispatchAction(host, payload);
    return;
  }

  const multiMatch = binding.match(/onTap:\s*([^,)]+)/i);
  if (multiMatch) {
    const shortcut = multiMatch[1].trim();
    showToast(`Executed: ${shortcut}`);
    dispatchHttpAction(host, { type: 'Shortcut', value: shortcut });
    return;
  }

  const wrappedShortcut = binding.match(/\(([^)]+)\)/);
  const shortcut = wrappedShortcut ? wrappedShortcut[1].trim() : binding || label;
  if (!shortcut || shortcut === 'blank' || shortcut === '—') return;

  showToast(`Executed: ${shortcut}`);
  dispatchAction(host, { type: 'Shortcut', value: shortcut });
}
