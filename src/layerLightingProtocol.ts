import type { BridgeResult } from './qmkViaBridge';

const CHANNEL = 0x5f, GET = 0x08, INFO = 1, LAYER = 2;
const VALID_EFFECTS = [0, 1, 2, 6];
type Exchange = (command: Uint8Array) => Promise<Uint8Array>;

/** Read-only capability and state probe. Never sends a SET or provisions storage. */
export async function readLayerLighting(exchange: Exchange): Promise<BridgeResult> {
  try {
    const info = await exchange(new Uint8Array([GET, CHANNEL, INFO]));
    if (info.length < 10 || info[0] !== GET || info[1] !== CHANNEL || info[2] !== INFO || info[3] !== 1 || info[4] !== 4 || info[5] > 1 || String.fromCharCode(...info.slice(6, 10)) !== 'NODE') {
      throw new Error('Connected firmware does not support the NØDE layer-lighting protocol');
    }
    if (!info[5]) return { ok: true, layerLighting: { ready: false, layers: [] } };
    const readAll = async () => {
      const layers = [];
      for (let index = 0; index < 4; index++) {
        const response = await exchange(new Uint8Array([GET, CHANNEL, LAYER, index]));
        if (response.length < 9 || response[0] !== GET || response[1] !== CHANNEL || response[2] !== LAYER || response[3] !== index || response[4] !== 0 || !VALID_EFFECTS.includes(response[5])) {
          throw new Error(`Could not verify lighting settings for layer ${index + 1}`);
        }
        layers.push({ effect: response[5], hue: response[6], saturation: response[7], brightness: response[8] });
      }
      return layers;
    };
    const first = await readAll(), second = await readAll();
    if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error('Layer lighting changed while being read; retry');
    return { ok: true, layerLighting: { ready: true, layers: first } };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
}

/** Update one initialized layer only after preserving and comparing all four. */
export async function writeLayerLighting(
  exchange: Exchange,
  request: { layer: number; setting: import('./qmkViaBridge').LayerLight } | undefined,
  saveRecovery: ((layers: import('./qmkViaBridge').LayerLight[]) => void) | undefined,
): Promise<BridgeResult> {
  const setting = request?.setting;
  if (!request || !Number.isInteger(request.layer) || request.layer < 0 || request.layer > 3 || !setting ||
      !VALID_EFFECTS.includes(setting.effect) || ![setting.hue, setting.saturation, setting.brightness].every(n => Number.isInteger(n) && n >= 0 && n <= 255) ||
      typeof saveRecovery !== 'function') return { ok: false, error: 'Invalid lighting setting or missing recovery storage' };
  let submitted = false;
  try {
    const previous = await readLayerLighting(exchange);
    if (!previous.ok || !previous.layerLighting?.ready || previous.layerLighting.layers.length !== 4) return { ok: false, error: previous.error || 'Lighting storage has not been explicitly initialized' };
    const layers = previous.layerLighting.layers.map(layer => ({ ...layer }));
    saveRecovery(layers.map(layer => ({ ...layer })));
    if (JSON.stringify(layers[request.layer]) === JSON.stringify(setting)) return previous;
    const prior = layers.flatMap(layer => [layer.effect, layer.hue, layer.saturation, layer.brightness]);
    submitted = true;
    const ack = await exchange(new Uint8Array([0x07, CHANNEL, LAYER, request.layer, 0, setting.effect, setting.hue, setting.saturation, setting.brightness, ...prior]));
    if (ack.length < 5 || ack[0] !== 0x07 || ack[1] !== CHANNEL || ack[2] !== LAYER || ack[3] !== request.layer || ack[4] !== 0) throw new Error('Device rejected or did not acknowledge the lighting update');
    const verified = await readLayerLighting(exchange);
    layers[request.layer] = { ...setting };
    if (!verified.ok || !verified.layerLighting?.ready || JSON.stringify(verified.layerLighting.layers) !== JSON.stringify(layers)) throw new Error('Lighting read-back did not match all four expected layers');
    return verified;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), ...(submitted ? { lightingWriteUncertain: true } : {}) };
  }
}
