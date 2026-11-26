/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice } from './helpers/connectedDevice';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  installConnectedDevice();
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
});

describe('Clear Single Layer', () => {
  it('opens the layer toolbar, clears only the active layer after confirmation, and supports Undo', async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    // Assign 'A' to r1c1 on Layer 1 first
    const r1c1 = container.querySelector<HTMLButtonElement>('button[data-drop-slot="r1c1"]');
    expect(r1c1).not.toBeNull();
    await act(async () => {
      r1c1!.click();
    });

    const keyAButton = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'A'
    );
    expect(keyAButton).toBeDefined();
    await act(async () => {
      keyAButton!.click();
    });

    expect(container.querySelector<HTMLButtonElement>('button[data-drop-slot="r1c1"]')?.title).toBe('A');

    // Click active Layer 1 button to open the layer action toolbar
    const layer1Btn = container.querySelector<HTMLButtonElement>('button[title="Layer 1"]');
    expect(layer1Btn).not.toBeNull();
    await act(async () => {
      layer1Btn!.click();
    });

    // Click Clear layer button
    const clearBtn = container.querySelector<HTMLButtonElement>('button[aria-label="Clear layer"]');
    expect(clearBtn).not.toBeNull();
    await act(async () => {
      clearBtn!.click();
    });

    // Confirm via "Click to clear"
    const confirmBtn = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Click to clear')
    );
    expect(confirmBtn).toBeDefined();
    await act(async () => {
      confirmBtn!.click();
    });

    // r1c1 on Layer 1 should now be blank
    expect(container.querySelector<HTMLButtonElement>('button[data-drop-slot="r1c1"]')?.title).toBe('blank');

    // Undo should restore 'A' on Layer 1
    const undoBtn = container.querySelector<HTMLButtonElement>('button[title="Undo"]');
    expect(undoBtn).not.toBeNull();
    expect(undoBtn?.disabled).toBe(false);
    await act(async () => {
      undoBtn!.click();
    });

    expect(container.querySelector<HTMLButtonElement>('button[data-drop-slot="r1c1"]')?.title).toBe('A');
  });
});
