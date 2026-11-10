/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import {
  createProfileExport,
  PROFILE_FILE_STORAGE_KEY,
  profileFileTools,
} from '../src/profileFiles';
import type { QmkViaBridge } from '../src/qmkViaBridge';

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

async function clickButton(button: HTMLButtonElement) {
  await act(async () => button.click());
}

async function openProfiles() {
  await clickButton(container.querySelector<HTMLButtonElement>(
    'button[aria-label="Toggle profile list"]'
  )!);
}

async function openSettings() {
  const settingsButton = [...container.querySelectorAll<HTMLButtonElement>('nav button')]
    .find((button) => button.textContent?.trim() === 'Settings');
  await act(async () => {
    settingsButton!.click();
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  });
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'confirm', { configurable: true, value: vi.fn(() => true) });
  Object.defineProperty(window, 'macropad', { configurable: true, value: undefined });
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: undefined });
  Object.defineProperty(window, 'Notification', { configurable: true, value: undefined });
});

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  delete (window as Window & { macropad?: QmkViaBridge }).macropad;
  delete (window as Window & { electronAPI?: unknown }).electronAPI;
  delete (window as Window & { Notification?: unknown }).Notification;
});

describe('React source app file operations', () => {
  it('imports a validated profile through the real file picker and keeps profile and custom-action state', async () => {
    await renderApp();
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    await openProfiles();
    await clickButton([...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Import')!);

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput?.accept).toBe('application/json,.json');
    const importedProfile = {
      id: 'work-profile',
      name: 'Imported Work',
      color: '#123456',
      layers: [{ r1c1: { label: 'A', binding: 'A', actionType: 'Basic input' } }],
    };
    const text = createProfileExport(importedProfile, {
      Action: [{ id: 'work-action', main: 'Open editor', binding: '(App: Editor)' }],
      'Multi-A': [],
      'Smart-A': [],
    });
    const file = new File([text], 'work-profile.json', { type: 'application/json' });
    Object.defineProperty(fileInput!, 'files', { configurable: true, value: [file] });

    await act(async () => {
      fileInput!.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    });

    expect(container.querySelector('span[title="Imported Work"]')?.textContent).toBe('Imported Work');
    expect(container.textContent).toContain('Imported 1 profile into this browser');
    const stored = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(stored.profiles).toHaveLength(2);
    expect(stored.profiles[1].name).toBe('Imported Work');
    expect(stored.activeProfileIndex).toBe(1);
    expect(stored.customItems.Action).toContainEqual(expect.objectContaining({ id: 'work-action' }));
    expect(document.querySelector('input[type="file"]')).toBeNull();

    await act(async () => root.unmount());
    container.remove();
    await renderApp();
    expect(container.querySelector('span[title="Imported Work"]')?.textContent).toBe('Imported Work');
  });

  it('exports the selected profile through the versioned browser download helper', async () => {
    await renderApp();
    const createObjectURL = vi.fn(() => 'blob:node-studio-profile');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    const clickedLinks: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedLinks.push(this);
    });
    await openProfiles();
    await clickButton(container.querySelector<HTMLButtonElement>('button[title="Export profile"]')!);

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(clickedLinks).toHaveLength(1);
    expect(clickedLinks[0].download).toBe('default-profile.json');
    expect(clickedLinks[0].href).toBe('blob:node-studio-profile');
    expect(container.textContent).toContain('Exported "Default Profile"');
  });

  it('keeps device information while hiding manual keymap-backup controls', async () => {
    await renderApp();
    await openSettings();

    expect(container.textContent).toContain('Device status:');
    expect(container.textContent).toContain('Firmware version:');
    expect(container.textContent).toContain('Input app version:');
    expect(container.textContent).not.toContain('Pre-sync device keymap backup');
    expect([...container.querySelectorAll<HTMLButtonElement>('button')].some((button) =>
      ['Save backup', 'Download backup', 'Restore from file'].includes(button.textContent?.trim() || '')
    )).toBe(false);
  });

  it('persists Settings switches and restores them when the source app remounts', async () => {
    await renderApp();
    await openSettings();
    let switches = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
    expect(switches).toHaveLength(4);
    expect(switches[1].disabled).toBe(true);

    await clickButton(switches[0]);
    expect(container.textContent).toContain('does not send analytics');
    await clickButton(switches[2]);
    const saved = JSON.parse(window.localStorage.getItem('node-studio.settings.v1') || 'null');
    expect(saved).toMatchObject({
      allowAnalytics: true,
      allowTerminalSmartActions: true,
      launchAtStartup: false,
      allowDeviceNotifications: false,
    });

    await act(async () => root.unmount());
    container.remove();
    await renderApp();
    await openSettings();
    switches = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
    expect(switches[0].getAttribute('aria-checked')).toBe('true');
    expect(switches[2].getAttribute('aria-checked')).toBe('true');
    expect(switches[1].disabled).toBe(true);
  });

  it('uses desktop preferences for startup, reads the packaged version, and routes support and firmware actions', async () => {
    let nativeSettings = {
      allowAnalytics: false,
      launchAtStartup: true,
      allowTerminalSmartActions: false,
      allowDeviceNotifications: false,
    };
    const capabilities = { launchAtStartup: true, firmwareFlash: true, externalLinks: true };
    const setAppSetting = vi.fn(async (key: keyof typeof nativeSettings, value: boolean) => {
      nativeSettings = { ...nativeSettings, [key]: value };
      return { ok: true, settings: nativeSettings, capabilities };
    });
    const openExternal = vi.fn().mockResolvedValue({ ok: true });
    const flashFirmware = vi.fn().mockResolvedValue({ ok: true, message: 'Firmware copied to RPI-RP2' });
    const getVersion = vi.fn().mockResolvedValue('4.5.6');
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getAppSettings: vi.fn().mockResolvedValue({ ok: true, settings: nativeSettings, capabilities }),
        setAppSetting,
        openExternal,
        flashFirmware,
        getVersion,
      },
    });
    Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });

    await renderApp();
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 30)));
    await openSettings();
    let switches = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')];
    expect(switches[1].disabled).toBe(false);
    expect(switches[1].getAttribute('aria-checked')).toBe('true');
    expect(container.textContent).toContain('4.5.6');

    await clickButton(switches[1]);
    expect(setAppSetting).toHaveBeenCalledWith('launchAtStartup', false);
    expect(switches[1].getAttribute('aria-checked')).toBe('false');

    await clickButton([...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Help & Documentation')!);
    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/david-8837/NODE/blob/main/qmk_firmware/grid_macro_1/README.md'
    );

    await clickButton([...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Check firmware update')!);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/david-8837/NODE/releases/latest',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(container.textContent).toContain('There is no published firmware release yet');

    await clickButton([...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Advance flash')!);
    expect(flashFirmware).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('Firmware copied to RPI-RP2');

    await clickButton([...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Reset local config')!);
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(container.textContent).toContain('physical device keymap was not changed');
  });

  it('requests notification permission and reports device connection events only after consent', async () => {
    const events = new Set<(event: unknown) => void>();
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn(() => () => undefined),
      onEvent: vi.fn((listener: (event: unknown) => void) => {
        events.add(listener);
        return () => events.delete(listener);
      }),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    const shown: Array<{ title: string; options?: NotificationOptions }> = [];
    class MockNotification {
      static permission: NotificationPermission = 'default';
      static requestPermission = vi.fn(async () => {
        MockNotification.permission = 'granted';
        return 'granted' as NotificationPermission;
      });
      constructor(title: string, options?: NotificationOptions) {
        shown.push({ title, options });
      }
    }
    Object.defineProperty(window, 'Notification', { configurable: true, value: MockNotification });
    Object.defineProperty(window, 'macropad', { configurable: true, value: bridge });

    await renderApp();
    await openSettings();
    const notificationsSwitch = [...container.querySelectorAll<HTMLButtonElement>('button[role="switch"]')][3];
    await clickButton(notificationsSwitch);
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 20)));
    expect(MockNotification.requestPermission).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem('node-studio.settings.v1')).toContain('"allowDeviceNotifications":true');

    for (const listener of events) listener({ type: 'connect', device: 'Test Grid' });
    expect(shown).toContainEqual({
      title: 'Device connected',
      options: { body: 'Test Grid is ready' },
    });
  });
});
