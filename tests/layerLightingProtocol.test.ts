import { describe, expect, it, vi } from 'vitest';
import { readLayerLighting, writeLayerLighting, initializeLayerLighting } from '../src/layerLightingProtocol';

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
  const expected = initial.map(([effect, hue, saturation, brightness]) => ({ effect, hue, saturation, brightness }));
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
    const result = await writeLayerLighting(exchange, { layer: 2, setting, expected }, save);
    expect(result.ok).toBe(true); expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0][2]).toEqual({ effect: 6, hue: 70, saturation: 255, brightness: 80 });
    expect(layers).toEqual([initial[0], initial[1], [1,100,120,130], initial[3]]);
    const writes = exchange.mock.calls.filter(([report]) => report[0] === 7);
    expect(writes).toHaveLength(1); expect(Array.from(writes[0][0].slice(9,25))).toEqual(initial.flat());
  });
  it('never writes if recovery storage fails, the setting is invalid, or firmware is unsupported', async () => {
    const { exchange } = writable();
    expect((await writeLayerLighting(exchange, { layer: 0, setting, expected }, () => { throw new Error('disk full'); })).ok).toBe(false);
    expect(exchange.mock.calls.some(([report]) => report[0] === 7)).toBe(false);
    exchange.mockClear();
    expect((await writeLayerLighting(exchange, { layer: 4, setting, expected }, vi.fn())).ok).toBe(false);
    expect(exchange).not.toHaveBeenCalled();
    const old = device({ unsupported: true }); expect((await writeLayerLighting(old, { layer: 0, setting, expected }, vi.fn())).ok).toBe(false);
    expect(old.mock.calls.every(([report]) => report[0] !== 7)).toBe(true);
  });
  it('refuses to overwrite lighting changed since the user read it', async () => {
    const { exchange } = writable(); const save = vi.fn();
    const stale = expected.map(value => ({ ...value })); stale[0].brightness++;
    const result = await writeLayerLighting(exchange, { layer: 1, setting, expected: stale }, save);
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining('changed since') });
    expect(save).not.toHaveBeenCalled();
    expect(exchange.mock.calls.every(([report]) => report[0] !== 7)).toBe(true);
  });
  it('reports uncertain state on conflict, disconnect or read-back mismatch', async () => {
    for (const options of [{ conflict: true }, { disconnect: true }, { corrupt: true }]) {
      const { exchange } = writable(options);
      const result = await writeLayerLighting(exchange, { layer: 1, setting, expected }, vi.fn());
      expect(result).toMatchObject({ ok: false, lightingWriteUncertain: true });
    }
  });
});


describe('explicit lighting initialization', () => {
  const initial = Array.from({ length: 4 }, (_, hue) => ({ effect: 1, hue, saturation: 255, brightness: 80 }));
  function blankDevice(options: { refuse?: boolean; disconnect?: boolean } = {}) {
    let layers: typeof initial | undefined;
    return vi.fn(async (command: Uint8Array) => {
      const response = new Uint8Array(32); response.set(command);
      if (command[2] === 1) response.set([1, 4, layers ? 1 : 0, 78, 79, 68, 69], 3);
      else if (command[2] === 3 && command[0] === 7) {
        if (options.disconnect) throw new Error('disconnected');
        response[3] = options.refuse ? 2 : 0;
        if (!options.refuse) layers = Array.from({ length: 4 }, (_, i) => ({ effect: command[4+i*4], hue: command[5+i*4], saturation: command[6+i*4], brightness: command[7+i*4] }));
      } else if (layers) { const value = layers[command[3]]; response.set([0,value.effect,value.hue,value.saturation,value.brightness], 4); }
      return response;
    });
  }
  it('persists the proposed values before an explicit one-time initialization and verifies all layers', async () => {
    const exchange = blankDevice(); const save = vi.fn();
    expect((await initializeLayerLighting(exchange, initial, save)).ok).toBe(true);
    expect(save).toHaveBeenCalledWith(initial);
    expect(exchange.mock.calls.filter(([command]) => command[0] === 7)).toHaveLength(1);
    exchange.mockClear(); expect((await initializeLayerLighting(exchange, initial, save)).ok).toBe(false);
    expect(exchange.mock.calls.every(([command]) => command[0] !== 7)).toBe(true);
  });
  it('fails closed on invalid data, missing recovery storage and uncertain device responses', async () => {
    const exchange = blankDevice();
    expect((await initializeLayerLighting(exchange, initial.slice(1), vi.fn())).ok).toBe(false);
    expect(exchange).not.toHaveBeenCalled();
    expect((await initializeLayerLighting(exchange, initial, () => { throw new Error('disk full'); })).ok).toBe(false);
    expect(exchange.mock.calls.every(([command]) => command[0] !== 7)).toBe(true);
    for (const options of [{ refuse: true }, { disconnect: true }]) {
      expect(await initializeLayerLighting(blankDevice(options), initial, vi.fn())).toMatchObject({ ok: false, lightingWriteUncertain: true });
    }
  });
});
