import { describe, expect, it, vi } from 'vitest';
import { readLayerLighting, writeLayerLighting } from '../src/layerLightingProtocol';

function device(options: { ready?: boolean; mutate?: boolean; unsupported?: boolean } = {}) {
  const layers = [[1, 10, 255, 50], [2, 30, 200, 60], [6, 70, 255, 80], [0, 0, 0, 0]];
  let reads = 0;
  return vi.fn(async (command: Uint8Array) => {
    const response = new Uint8Array(32); response.set(command);
    if (options.unsupported) return response;
    if (command[2] === 1) response.set([1, 4, options.ready === false ? 0 : 1, 78, 79, 68, 69], 3);
    else {
      const layer = command[3]; response[4] = 0;
      response.set(layers[layer], 5); if (options.mutate && ++reads === 5) response[6]++;
    }
    return response;
  });
}
describe('layer lighting capability probe', () => {
  it('returns all four double-checked layers using GET only', async () => {
    const exchange = device(); const result = await readLayerLighting(exchange);
    expect(result).toEqual({ ok: true, layerLighting: { ready: true, layers: [
      { effect: 1, hue: 10, saturation: 255, brightness: 50 },
      { effect: 2, hue: 30, saturation: 200, brightness: 60 },
      { effect: 6, hue: 70, saturation: 255, brightness: 80 },
      { effect: 0, hue: 0, saturation: 0, brightness: 0 },
    ] } });
    expect(exchange).toHaveBeenCalledTimes(9);
    expect(exchange.mock.calls.every(([report]) => report[0] === 0x08)).toBe(true);
  });
  it('does not write or initialize blank storage', async () => {
    const exchange = device({ ready: false });
    expect(await readLayerLighting(exchange)).toEqual({ ok: true, layerLighting: { ready: false, layers: [] } });
    expect(exchange).toHaveBeenCalledTimes(1);
  });
  it('rejects old firmware and inconsistent reads without writing', async () => {
    const old = device({ unsupported: true }); expect((await readLayerLighting(old)).ok).toBe(false);
    const changing = device({ mutate: true }); expect((await readLayerLighting(changing)).error).toContain('changed');
    expect(changing.mock.calls.every(([report]) => report[0] === 0x08)).toBe(true);
  });
});


describe('guarded layer lighting writes', () => {
  const initial = [[1, 10, 255, 50], [2, 30, 200, 60], [6, 70, 255, 80], [0, 0, 0, 0]];
  const setting = { effect: 1, hue: 100, saturation: 120, brightness: 130 };
  function writable(options: { conflict?: boolean; disconnect?: boolean; corrupt?: boolean } = {}) {
    const layers = initial.map(layer => [...layer]);
    const exchange = vi.fn(async (command: Uint8Array) => {
      const response = new Uint8Array(32); response.set(command);
      if (command[2] === 1) response.set([1, 4, 1, 78, 79, 68, 69], 3);
      else if (command[0] === 0x07) {
        if (options.disconnect) throw new Error('device disconnected');
        if (options.conflict || layers.flat().some((n, i) => n !== command[9+i])) response[4] = 2;
        else { layers[command[3]] = Array.from(command.slice(5,9)); response[4] = 0; if (options.corrupt) layers[0][1]++; }
      } else { response[4] = 0; response.set(layers[command[3]], 5); }
      return response;
    });
    return { exchange, layers };
  }
  it('saves all previous settings, compares and verifies every layer', async () => {
    const { exchange, layers } = writable(); const save = vi.fn();
    const result = await writeLayerLighting(exchange, { layer: 2, setting }, save);
    expect(result.ok).toBe(true); expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0][2]).toEqual({ effect: 6, hue: 70, saturation: 255, brightness: 80 });
    expect(layers).toEqual([initial[0], initial[1], [1,100,120,130], initial[3]]);
    const writes = exchange.mock.calls.filter(([report]) => report[0] === 7);
    expect(writes).toHaveLength(1); expect(Array.from(writes[0][0].slice(9,25))).toEqual(initial.flat());
  });
  it('never writes if recovery storage fails, the setting is invalid, or firmware is unsupported', async () => {
    const { exchange } = writable();
    expect((await writeLayerLighting(exchange, { layer: 0, setting }, () => { throw new Error('disk full'); })).ok).toBe(false);
    expect(exchange.mock.calls.some(([report]) => report[0] === 7)).toBe(false);
    exchange.mockClear();
    expect((await writeLayerLighting(exchange, { layer: 4, setting }, vi.fn())).ok).toBe(false);
    expect(exchange).not.toHaveBeenCalled();
    const old = device({ unsupported: true }); expect((await writeLayerLighting(old, { layer: 0, setting }, vi.fn())).ok).toBe(false);
    expect(old.mock.calls.every(([report]) => report[0] !== 7)).toBe(true);
  });
  it('reports uncertain state on conflict, disconnect or read-back mismatch', async () => {
    for (const options of [{ conflict: true }, { disconnect: true }, { corrupt: true }]) {
      const { exchange } = writable(options);
      const result = await writeLayerLighting(exchange, { layer: 1, setting }, vi.fn());
      expect(result).toMatchObject({ ok: false, lightingWriteUncertain: true });
    }
  });
});
