/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';
import type { QmkViaStatus } from '../src/qmkViaBridge';

let root: Root;
let container: HTMLDivElement;
let statusListener: (status: QmkViaStatus) => void;
let status: QmkViaStatus;
let connect: ReturnType<typeof vi.fn>;
const profile = { id: 'saved', name: 'Saved', layers: [{ r2c1: { label: 'A', binding: 'A', actionType: 'Basic input' } }] };

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({ v: 1, profiles: [profile], activeProfileIndex: 0 }));
  status = { state: 'disconnected' };
  connect = vi.fn(async () => { status = { state: 'connected', device: 'test' }; statusListener(status); return status; });
  Object.defineProperty(window, 'macropad', { configurable: true, value: {
    getStatus: async () => status,
    onStatus: (cb: typeof statusListener) => { statusListener = cb; return () => {}; },
    onHardwareEvent: () => () => {}, onEvent: () => () => {},
    connect, disconnect: async () => {},
    request: async () => ({ ok: false, error: 'simulated device read failure' }),
  } });
  container = document.createElement('div'); container.id = 'root'; document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(App)));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); delete (window as any).macropad; });

describe('connection-required workspace', () => {
  it('blocks the workspace until connected, restores it after reconnect and retains local assignments on restart', async () => {
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('Connect your macropad');
    expect(container.querySelector('[role="dialog"] img')?.getAttribute('src')).toBe('./icon.png');
    expect(container.querySelector('.app-shell')?.hasAttribute('inert')).toBe(true);
    const button = [...container.querySelectorAll('button')].find(b => b.textContent === 'Connect macropad')!;
    await act(async () => button.click());
    expect(connect).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('.app-shell')?.hasAttribute('inert')).toBe(false);
    expect(container.querySelector('button[data-drop-slot="r2c1"]')?.getAttribute('title')).toBe('A');
    await act(async () => { status = { state: 'disconnected' }; statusListener(status); });
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector('.app-shell')?.hasAttribute('inert')).toBe(true);
    expect(JSON.parse(localStorage.getItem(PROFILE_FILE_STORAGE_KEY)!).profiles[0].layers[0].r2c1.binding).toBe('A');
    await act(async () => { status = { state: 'connected', device: 'test' }; statusListener(status); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('button[data-drop-slot="r2c1"]')?.getAttribute('title')).toBe('A');
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));
    expect(container.querySelector('button[data-drop-slot="r2c1"]')?.getAttribute('title')).toBe('A');
  });
});
