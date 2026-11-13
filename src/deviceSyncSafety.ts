import { actionToViaKeycode, type ViaConfiguration, type ViaKeymapSnapshot } from './qmkViaBridge';

/** Compare only mappings that the configuration would actually write. */
export function deviceMatchesConfiguration(config: ViaConfiguration, snapshot: ViaKeymapSnapshot): boolean {
  for (let i = 0; i < Math.min(config.layers.length, snapshot.capturedLayerCount); i++) {
    const wanted = config.layers[i];
    const actual = snapshot.layers[i];
    if (!wanted || !actual) return false;
    for (const [slot, action] of Object.entries(wanted.keys ?? {})) {
      const code = action.t === 'layer' && (action.n ?? -1) >= snapshot.layerCount ? null : actionToViaKeycode(action);
      if (code !== null && actual.keys[slot] !== code) return false;
    }
    for (const [direction, action] of Object.entries(wanted.enc ?? {})) {
      if (direction !== 'cw' && direction !== 'ccw' && direction !== 'press') continue;
      const code = action.t === 'layer' && (action.n ?? -1) >= snapshot.layerCount ? null : actionToViaKeycode(action);
      if (code !== null && actual.enc[direction] !== code) return false;
    }
  }
  return true;
}
