/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice } from './helpers/connectedDevice';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';

let container: HTMLDivElement;
let root: Root;

/**
 * Phase 10 regression: the layer-sync work replaced `setActiveLayerIndex(0)` on
 * profile operations with a realignment to the confirmed hardware layer. These
 * checks confirm profile management still preserves data and never displays a
 * layer the hardware is not on.
 */

function seedTwoProfiles() {
  window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({
    v: 1,
    profiles: [
      {
        id: 'p1', name: 'Alpha', color: '#0051ff',
        layers: [
          { r1c1: { label: 'A1', binding: 'A', actionType: 'Basic input' } },
          { r1c1: { label: 'A2', binding: 'B', actionType: 'Basic input' } },
        ],
      },
      {
        id: 'p2', name: 'Beta', color: '#10b981',
        layers: [{ r1c1: { label: 'B1', binding: 'C', actionType: 'Basic input' } }],
      },
    ],
    activeProfileIndex: 0,
    customItems: {
      Action: [{ id: 'kept', main: 'Kept action', binding: '(App: Editor)' }],
      'Multi-A': [], 'Smart-A': [],
    },
  }));
}

async function renderApp() {
  await act(async () => root.render(createElement(App)));
  await act(async () => new Promise((resolve) => window.setTimeout(resolve, 40)));
}

function activeLayerNumber(): number | null {
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('button[title^="Layer "]')]
    .filter((b) => /^Layer [1-4]$/.test(b.title));
  const idx = buttons.findIndex((b) => b.getAttribute('aria-pressed') === 'true');
  return idx === -1 ? null : idx + 1;
}

function firstKeyLabel(): string {
  return container.querySelector<HTMLElement>('[data-drop-slot="r1c1"]')?.textContent?.trim() ?? '';
}

async function openProfileList() {
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]');
  expect(toggle).not.toBeNull();
  await act(async () => {
    toggle!.click();
    await new Promise((resolve) => window.setTimeout(resolve, 30));
  });
}

/** Profile rows expose a labelled rename input; focusing it selects the profile. */
async function selectProfile(name: string) {
  const input = container.querySelector<HTMLInputElement>(`input[aria-label="Rename profile ${name}"]`);
  expect(input, `profile row for ${name}`).not.toBeNull();
  await act(async () => {
    input!.focus();
    input!.dispatchEvent(new Event('focus', { bubbles: true }));
    await new Promise((resolve) => window.setTimeout(resolve, 60));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  seedTwoProfiles();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: undefined });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  removeConnectedDevice();
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  await act(async () => root.unmount());
  container.remove();
});

describe('profile management × hardware layer regression', () => {
  it('shows the hardware layer and that layer\'s assignments after a physical switch', async () => {
    const device = installConnectedDevice();
    await renderApp();
    expect(activeLayerNumber()).toBe(1);
    expect(firstKeyLabel()).toContain('A1');

    await act(async () => {
      device.emitHardwareLayer(1);
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    expect(activeLayerNumber()).toBe(2);
    expect(firstKeyLabel()).toContain('A2');
  });

  it('clamps to the available layers when switching to a shorter profile', async () => {
    const device = installConnectedDevice();
    await renderApp();
    // Hardware is on layer 2, which only profile Alpha has.
    await act(async () => {
      device.emitHardwareLayer(1);
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    expect(activeLayerNumber()).toBe(2);

    await openProfileList();
    await selectProfile('Beta');

    // Beta has one layer: the editor must not claim layer 2.
    expect(activeLayerNumber()).toBe(1);
    expect(firstKeyLabel()).toContain('B1');
  });

  it('preserves both profiles and custom actions when switching profiles', async () => {
    installConnectedDevice();
    await renderApp();
    await openProfileList();
    await selectProfile('Beta');

    const stored = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(stored.profiles).toHaveLength(2);
    expect(stored.profiles.map((p: { name: string }) => p.name)).toEqual(['Alpha', 'Beta']);
    expect(stored.profiles[0].layers).toHaveLength(2);
    expect(stored.profiles[0].layers[0].r1c1.label).toBe('A1');
    expect(stored.profiles[1].layers[0].r1c1.label).toBe('B1');
    expect(stored.customItems.Action).toContainEqual(expect.objectContaining({ id: 'kept' }));
  });

  it('restores the firmware layer on reconnect rather than resetting to layer 1', async () => {
    const device = installConnectedDevice();
    await renderApp();
    await act(async () => {
      device.emitHardwareLayer(1);
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    expect(activeLayerNumber()).toBe(2);

    await act(async () => {
      device.emitDisconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 30));
    });
    expect(container.querySelector('[data-testid="device-connection-gate"]')).not.toBeNull();

    // Firmware is still on layer 2 when it comes back.
    await act(async () => {
      const listeners = device.bridge.onStatus.mock.calls.map(([l]) => l);
      for (const listener of listeners) {
        listener({ state: 'connected', device: 'Grid Macro 1 (test)', deviceActiveLayer: 1 });
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    });
    expect(container.querySelector('[data-testid="device-connection-gate"]')).toBeNull();
    expect(activeLayerNumber()).toBe(2);
    expect(firstKeyLabel()).toContain('A2');
  });
});
