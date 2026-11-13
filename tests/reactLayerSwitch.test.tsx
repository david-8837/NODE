/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';
import { HardwareEventType, type DecodedHardwareEvent } from '../src/hardwareEventProtocol';
import { buildViaConfiguration } from '../src/qmkProfileSync';
import { actionToViaKeycode } from '../src/qmkViaBridge';

const layers = [2, 3, 1].map((target, i) => ({
  r2c1: { label: `Layer ${target}`, binding: `Layer ${target}`, actionId: `lyr-${target}`, actionType: 'Shortcut' },
  r1c1: { label: `Marker ${i + 1}`, binding: `Marker ${i + 1}`, actionType: 'Basic input' },
}));
let root: Root;
let container: HTMLDivElement;
let listener: (event: DecodedHardwareEvent) => void;
const active = () => [...container.querySelectorAll<HTMLButtonElement>('button[title^="Layer "]')]
  .findIndex((button) => button.className.includes('text-white'));
const wait = () => new Promise((resolve) => setTimeout(resolve, 35));

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({ v: 1, activeProfileIndex: 0, profiles: [{ id: 'test', name: 'Test', layers }] }));
  Object.defineProperty(window, 'macropad', { configurable: true, value: {
    onStatus: () => () => {}, getStatus: async () => ({ state: 'disconnected' }),
    onHardwareEvent: (fn: typeof listener) => { listener = fn; return () => {}; },
    getFile: async () => ({ ok: false }),
  } });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: { setSimulationEnabled: async (enabled: boolean) => ({ ok: true, enabled }) } });
  container = document.createElement('div'); container.id = 'root'; container.classList.add('is-ready'); document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(App)));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); delete (window as any).macropad; delete (window as any).electronAPI; });

describe('absolute layer switching', () => {
  it('compiles every destination to its absolute QMK TO keycode', () => {
    const config = buildViaConfiguration({ layers }, 'win').config;
    expect(config.layers.map((layer) => actionToViaKeycode(layer.keys?.r2c1))).toEqual([0x5201, 0x5202, 0x5200]);
  });

  it('follows QMK down-before-TO and up-after-TO without dispatching destination actions', async () => {
    expect(active()).toBe(0);
    for (const [from, to] of [[0,1], [1,2], [2,0], [0,1], [1,2]]) {
      const event = (type: HardwareEventType, layer: number): DecodedHardwareEvent => ({ version: 1, type, slotIndex: 3, slotId: 'r2c1', sequence: 0, activeLayer: layer, matrixStateMask: type === HardwareEventType.BUTTON_DOWN ? 8 : 0, isPressed: type === HardwareEventType.BUTTON_DOWN, isDialRotation: false });
      await act(async () => { listener(event(HardwareEventType.BUTTON_DOWN, from)); await wait(); });
      expect(active()).toBe(from);
      await act(async () => { listener(event(HardwareEventType.BUTTON_UP, to)); await wait(); });
      expect(active()).toBe(to);
      expect(container.textContent).not.toContain('Switched to Layer');
    }
  });

  it('passes firmware-debounced press and release to the app immediately', async () => {
    const event = (pressed: boolean): DecodedHardwareEvent => ({
      version: 1, type: pressed ? HardwareEventType.BUTTON_DOWN : HardwareEventType.BUTTON_UP,
      slotIndex: 0, slotId: 'r1c1', sequence: 1, activeLayer: 0,
      matrixStateMask: pressed ? 1 : 0, isPressed: pressed, isDialRotation: false,
    });
    const debouncer = (window as any).macropadDebounceEngine;
    await act(async () => { listener(event(true)); });
    expect(debouncer.getSlotDebouncedState('r1c1')).toBe(true);
    await act(async () => { listener(event(false)); });
    expect(debouncer.getSlotDebouncedState('r1c1')).toBe(false);
  });

  it('simulates repeated direct transitions with a single click each', async () => {
    const toggle = [...container.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.includes('Simulation off'))!;
    await act(async () => toggle.click());
    for (const destination of [1, 2, 0, 1, 2]) {
      const key = container.querySelector<HTMLButtonElement>('button[data-drop-slot="r2c1"]')!;
      await act(async () => { key.click(); await wait(); });
      expect(active()).toBe(destination);
    }
  });
});
