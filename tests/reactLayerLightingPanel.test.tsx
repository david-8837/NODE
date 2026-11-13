/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LayerLightingPanel from '../src/components/LayerLightingPanel';
import type { QmkViaBridge } from '../src/qmkViaBridge';

const layers = Array.from({ length: 4 }, () => ({ effect: 1, hue: 85, saturation: 255, brightness: 200 }));
let node: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let request: ReturnType<typeof vi.fn>;
let bridge: QmkViaBridge;
const button = (text: string) => [...node.querySelectorAll('button')].find(item => item.textContent?.includes(text))!;
async function render(connected = true) { await act(async () => root.render(createElement(LayerLightingPanel, { bridge, connected }))); }
async function click(text: string) { await act(async () => { button(text).click(); await Promise.resolve(); }); }
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); node = document.createElement('div'); document.body.append(node); root = createRoot(node);
  request = vi.fn(async () => ({ ok: true, layerLighting: { ready: true, layers } }));
  bridge = { request } as unknown as QmkViaBridge;
  vi.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); vi.restoreAllMocks(); });
describe('experimental layer lighting controls', () => {
  it('requires a read and passes the observed four-layer state into a save', async () => {
    await render(); expect(node.textContent).not.toContain('Save this layer');
    await click('Read device lighting'); expect(node.textContent).toContain('Device settings read and verified');
    request.mockImplementation(async arg => { arg.saveLightingRecovery(layers); return { ok: true, layerLighting: { ready: true, layers } }; });
    await click('Save this layer');
    const arg = request.mock.calls.at(-1)![0];
    expect(arg.layerLightingWrite.expected).toEqual(layers);
    expect(arg.layerLightingWrite.setting).toMatchObject({ effect: 1, hue: 85 });
    expect(node.textContent).toContain('Download lighting recovery copy');
    expect(localStorage.length).toBe(1);
  });
  it('requires consent to initialize and blocks controls after disconnection', async () => {
    request.mockResolvedValue({ ok: true, layerLighting: { ready: false, layers: [] } });
    await render(); await click('Read device lighting'); await click('Initialize four layers');
    expect(request).toHaveBeenCalledTimes(1);
    vi.mocked(window.confirm).mockReturnValue(true);
    request.mockImplementation(async arg => { arg.saveLightingRecovery(arg.layerLightingInitial); return { ok: false, error: 'disconnected', lightingWriteUncertain: true }; });
    await click('Initialize four layers'); expect(node.textContent).toContain('Device state may be unknown');
    await render(false); expect(button('Read device lighting').disabled).toBe(true);
    expect(node.textContent).not.toContain('Save this layer');
  });
});
