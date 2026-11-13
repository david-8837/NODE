/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

let root: Root;
let container: HTMLDivElement;
let request: ReturnType<typeof vi.fn>;
const validFile = JSON.stringify({ format: 'node-studio-via-macros', version: 1, device: 'Grid Macro 1', firmware: '1', createdAt: '2026-01-01T00:00:00Z', count: 2, bytes: [0, 1, 0] });
const snapshot = { protocolVersion: 13, layerCount: 1, capturedLayerCount: 1, layers: [{ keys: Object.fromEntries(['r1c1','r1c2','r1c3','r2c1','r2c2','r2c3','r3c1','r3c2','r3c3'].map(key => [key, 0])), enc: { ccw: 0, cw: 0, press: 0 } }] };
async function render() {
  container = document.createElement('div'); container.id = 'root'; document.body.append(container); root = createRoot(container);
  await act(async () => root.render(createElement(App)));
  await act(async () => { [...container.querySelectorAll<HTMLButtonElement>('nav button')].find(b => b.textContent?.trim() === 'Settings')!.click(); await new Promise(resolve => setTimeout(resolve, 350)); });
}
async function selectFile(text: string) {
  const input = container.querySelector<HTMLInputElement>('input[aria-label="Restore VIA macro backup"]')!;
  const file = new File([text], 'backup.json', { type: 'application/json' });
  Object.defineProperty(file, 'text', { value: async () => text });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
}
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  request = vi.fn(async () => ({ ok: false, error: 'test device unavailable' }));
  Object.defineProperty(window, 'confirm', { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(window, 'macropad', { configurable: true, value: {
    getStatus: async () => ({ state: 'connected', device: 'Grid Macro 1', fw: '1' }),
    onStatus: () => () => {}, onHardwareEvent: () => () => {}, onEvent: () => () => {}, request,
  } });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); delete (window as any).macropad; });

describe('macro restore interface', () => {
  it('rejects malformed backups and cancelled confirmation before requesting writes', async () => {
    await render(); await selectFile('{bad');
    expect(container.textContent).toContain('Macro backup is not valid JSON');
    expect(request.mock.calls.filter(([arg]) => arg.cmd === 'restore_via_macros')).toHaveLength(0);
    vi.mocked(window.confirm).mockReturnValue(false); await selectFile(validFile);
    expect(container.textContent).toContain('Restore cancelled. No changes were made.');
    expect(request.mock.calls.filter(([arg]) => arg.cmd === 'restore_via_macros')).toHaveLength(0);
  });
  it('reports verified rollback and exposes the locally saved recovery copy after restart', async () => {
    request.mockImplementation(async arg => {
      if (arg.cmd !== 'restore_via_macros') return { ok: false, error: 'test device unavailable' };
      arg.saveRecovery({ keymap: snapshot, macros: { count: 2, bytes: [0, 2, 0] } });
      arg.onProgress('Writing macros', 2, 3);
      return { ok: false, rollback: 'verified', error: 'simulated failure' };
    });
    await render(); await selectFile(validFile);
    expect(container.textContent).toContain('Previous macro bytes were restored and verified.');
    expect(container.textContent).toContain('Download previous recovery copy');
    await act(async () => root.unmount()); container.remove();
    await render(); expect(container.textContent).toContain('Download previous recovery copy');
  });
  it('requests additional consent before recovering interrupted data', async () => {
    request.mockImplementation(async arg => {
      if (arg.cmd !== 'restore_via_macros') return { ok: false, error: 'test device unavailable' };
      if (!arg.allowInterruptedRecovery) return { ok: false, interruptedMacroBuffer: true, error: 'incomplete' };
      arg.saveRecovery({ keymap: snapshot, macros: { count: 2, bytes: [0, 2, 255] } });
      return { ok: true };
    });
    await render(); await selectFile(validFile);
    expect(window.confirm).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('previous incomplete buffer was saved for diagnosis only');
    expect(container.textContent).toContain('Download incomplete buffer diagnostic');
    expect(container.textContent).not.toContain('Download previous recovery copy');
  });
  it('warns and pauses sync when rollback fails or the bridge throws unexpectedly', async () => {
    request.mockImplementation(async arg => {
      if (arg.cmd !== 'restore_via_macros') return { ok: false, error: 'test device unavailable' };
      return { ok: false, rollback: 'failed', error: 'disconnected', recoveryError: 'device unavailable' };
    });
    await render(); await selectFile(validFile);
    expect(container.textContent).toContain('Recovery could not be verified');
    expect(container.textContent).toContain('device state may be incomplete');
    request.mockImplementation(async arg => { if (arg.cmd === 'restore_via_macros') throw new Error('bridge lost'); return { ok: false }; });
    await selectFile(validFile);
    expect(container.textContent).toContain('Device state is unknown');
    expect(container.textContent).not.toContain('bridge lost. No changes were made.');
  });

});
