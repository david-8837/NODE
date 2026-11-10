/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';

let container: HTMLDivElement;
let root: Root;

async function renderApp() {
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(App)));
}

function findButton(label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === label);
}

async function click(button: HTMLButtonElement | undefined, waitMs = 0) {
  if (!button) throw new Error('Expected button was not rendered');
  await act(async () => {
    button.click();
    await new Promise((resolve) => window.setTimeout(resolve, waitMs));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'confirm', { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(window, 'macropad', { configurable: true, value: undefined });
  Object.defineProperty(window, 'Notification', { configurable: true, value: undefined });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { macropad?: unknown }).macropad;
  delete (window as Window & { Notification?: unknown }).Notification;
});

describe('installed application Smart Action picker', () => {
  it('loads installed shortcuts when App is opened, lets the user select one, and saves its launch target', async () => {
    const shortcutPath = 'C:\\Users\\tester\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Code.lnk';
    const getInstalledApplications = vi.fn().mockResolvedValue({
      ok: true,
      apps: [
        { name: 'Visual Studio Code', shortcutPath },
        { name: 'Spotify', shortcutPath: 'C:\\Users\\tester\\Desktop\\Spotify.lnk' },
      ],
    });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: { platform: 'win32', getInstalledApplications },
    });

    await renderApp();
    await click(container.querySelector<HTMLButtonElement>('button[title="Open Key Mapping"]') || undefined, 350);
    await click(findButton('Smart-A'), 350);
    await click(findButton('New Smart Action'), 350);
    await click(findButton('App'), 350);

    expect(getInstalledApplications).toHaveBeenCalled();
    const option = container.querySelector<HTMLButtonElement>('[role="option"]');
    expect(option?.textContent?.trim()).toBe('Visual Studio Code');
    await click(option || undefined);

    expect((container.querySelector('input[aria-label="Search installed applications"]') as HTMLInputElement).value)
      .toBe('Visual Studio Code');
    const saveButton = findButton('Save');
    expect(saveButton?.disabled).toBe(false);
    await click(saveButton);

    const saved = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(saved.customItems['Smart-A']).toContainEqual(expect.objectContaining({
      main: 'My Smart action',
      execution: expect.objectContaining({
        kind: 'smart',
        actionType: 'App',
        value: 'Visual Studio Code',
        applicationShortcutPath: shortcutPath,
      }),
    }));
  });
});
