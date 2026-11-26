/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice } from './helpers/connectedDevice';
import type { HardwareTriggerEvent } from '../src/qmkViaBridge';

let container: HTMLDivElement;
let root: Root;
let deviceHandle: ReturnType<typeof installConnectedDevice>;

beforeEach(() => {
  deviceHandle = installConnectedDevice();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  removeConnectedDevice();
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('Live Hardware Key Press Visualizer', () => {
  it('mirrors physical key presses on the virtual macropad with active press glow', async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    const targetKeycap = container.querySelector<HTMLButtonElement>('button[data-drop-slot="r1c1"]');
    expect(targetKeycap).not.toBeNull();
    expect(targetKeycap?.className).not.toContain('scale-[0.93]');

    // Emit physical press for key 1 (r1c1)
    await act(async () => {
      deviceHandle.emitEvent({
        type: 'hardware_trigger',
        seq: 1,
        profileSlot: 0,
        layer: 0,
        slotIndex: 0,
        slotId: 'r1c1',
        pressed: true,
      } satisfies HardwareTriggerEvent);
    });

    expect(targetKeycap?.className).toContain('scale-[0.93]');
    expect(targetKeycap?.className).toContain('shadow-[0_0_20px_rgba(0,81,255,0.95)]');

    // Emit physical release for key 1
    await act(async () => {
      deviceHandle.emitEvent({
        type: 'hardware_trigger',
        seq: 2,
        profileSlot: 0,
        layer: 0,
        slotIndex: 0,
        slotId: 'r1c1',
        pressed: false,
      } satisfies HardwareTriggerEvent);
    });

    // Wait for minimum feedback pulse to clear
    await act(async () => {
      await new Promise((r) => setTimeout(r, 220));
    });

    expect(targetKeycap?.className).not.toContain('scale-[0.93]');
  });

  it('animates the virtual rotary dial and flashes it when physical rotary encoder spins CW or CCW', async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    const dialButton = container.querySelector<HTMLButtonElement>('button[title^="Dial:"]');
    expect(dialButton).not.toBeNull();
    const dialSvg = dialButton?.querySelector('svg');
    const initialTransform = dialSvg?.getAttribute('style') || '';

    // Emit physical encoder CW rotation
    await act(async () => {
      deviceHandle.emitEvent({
        type: 'hardware_trigger',
        seq: 3,
        profileSlot: 0,
        layer: 0,
        slotIndex: 9,
        slotId: 'cw',
        pressed: true,
      } satisfies HardwareTriggerEvent);
    });

    // The dial button should scale and glow
    expect(dialButton?.className).toContain('scale-[0.93]');
    // The dial angle should have updated
    const rotatedTransform = dialSvg?.getAttribute('style') || '';
    expect(rotatedTransform).not.toEqual(initialTransform);

    // Auto-clears press state after rotation detent timeout
    await act(async () => {
      await new Promise((r) => setTimeout(r, 240));
    });

    expect(dialButton?.className).not.toContain('scale-[0.93]');
  });
});
