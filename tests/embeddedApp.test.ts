import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole, type DOMWindow } from 'jsdom';
import { GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';
import { createDeviceKeymapFileTools, DEVICE_KEYMAP_BACKUP_HISTORY_KEY } from '../src/deviceKeymapFiles';
import { createProfileExport, createProfileFileTools } from '../src/profileFiles';
import { VIA_PROTOCOL_VERSION } from '../src/qmkViaBridge';

const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
const bundle = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];
const shippedUiBaseline = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/shipped-ui-baseline.json'),
    'utf8'
  )
) as { tree: unknown };

if (!bundle) {
  throw new Error('Expected the shipped inline application bundle in index.html');
}

const openApps: JSDOM[] = [];

afterEach(() => {
  for (const app of openApps.splice(0)) app.window.close();
});

function snapshotElement(element: Element, window: DOMWindow): unknown {
  const attributes = Object.fromEntries(
    [...element.attributes]
      .filter(
        (attribute) =>
          !(attribute.name === 'style' && attribute.value.trim() === 'transform: none;')
      )
      .map(({ name, value }) => [name, value])
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const text = [...element.childNodes]
    .filter((node) => node.nodeType === window.Node.TEXT_NODE)
    .map((node) => node.textContent?.trim().replace(/\s+/g, ' ') || '')
    .filter(Boolean)
    .join(' ');

  return {
    tag: element.tagName.toLowerCase(),
    attributes,
    text,
    children: [...element.children].map((child) =>
      snapshotElement(child, window)
    ),
  };
}

function makeDeviceSnapshot() {
  const keys = Object.fromEntries(GRID_MACRO_KEY_SLOTS.map((slot, index) => [slot, index + 4]));
  return {
    protocolVersion: VIA_PROTOCOL_VERSION,
    layerCount: 4,
    capturedLayerCount: 4,
    layers: Array.from({ length: 4 }, () => ({
      keys,
      enc: { ccw: 0x00aa, cw: 0x00a9, press: 0x0028 },
    })),
  };
}

async function openEmbeddedApp(bridge?: Record<string, unknown>) {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors: string[] = [];
  virtualConsole.on('jsdomError', (error) => jsdomErrors.push(error.message));
  const app = new JSDOM(html.replace(/<script type="module"[^>]*>[\s\S]*?<\/script>/g, ''), {
    url: 'http://localhost:5173/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  openApps.push(app);
  const profileFiles = createProfileFileTools(app.window as unknown as Window & typeof globalThis);
  const deviceKeymapFiles = createDeviceKeymapFileTools(app.window as unknown as Window & typeof globalThis);
  Object.defineProperty(app.window, 'nodeStudioProfileFiles', { value: profileFiles, configurable: true });
  Object.defineProperty(app.window, 'nodeStudioDeviceKeymapFiles', { value: deviceKeymapFiles, configurable: true });
  if (bridge) Object.defineProperty(app.window, 'macropad', { value: bridge, configurable: true });
  app.window.eval(bundle!);
  await new Promise((resolve) => app.window.setTimeout(resolve, 30));
  const root = app.window.document.querySelector('#root');
  if (!root) throw new Error('App root element was not created');
  return { app, root, jsdomErrors, profileFiles, deviceKeymapFiles };
}

describe('Shipped application runtime', () => {
  it('renders the established keymap UI with nine keys and one encoder', async () => {
    const { app, root, jsdomErrors } = await openEmbeddedApp();
    const renderedSlots = Array.from(
      root.querySelectorAll<HTMLElement>('[data-drop-slot^="r"]')
    ).map((element) => element.dataset.dropSlot);

    expect(renderedSlots).toEqual(GRID_MACRO_KEY_SLOTS);
    expect(root.querySelectorAll('button[title^="Dial:"]')).toHaveLength(1);
    expect(root.querySelector('nav')?.textContent).toContain('Keymap');
    expect(root.querySelector('nav')?.textContent).toContain('Preset');
    expect(root.querySelector('nav')?.textContent).toContain('Settings');
    expect(snapshotElement(root.firstElementChild!, app.window)).toEqual(
      shippedUiBaseline.tree
    );
    expect(jsdomErrors).toEqual([]);
  });

  it('exposes a keyboard-accessible QMK/VIA connect control and requests permission on click', async () => {
    const connect = vi.fn().mockResolvedValue({ state: 'connecting' });
    const statusListeners = new Set<(status: { state: string }) => void>();
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string }) => void) => {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect,
      disconnect: vi.fn().mockResolvedValue(undefined),
      getFile: vi.fn(),
      request: vi.fn(),
      putFile: vi.fn(),
    };
    const { app, root } = await openEmbeddedApp(bridge);
    const connectButton = root.querySelector<HTMLButtonElement>(
      'button[aria-label="Connect Grid Macro 1 via QMK/VIA"]'
    );

    expect(connectButton).not.toBeNull();
    expect(connectButton?.type).toBe('button');
    expect(connectButton?.disabled).toBe(false);
    connectButton!.click();
    expect(connect).toHaveBeenCalledOnce();
  });

  it('backs up the device before keymap writes, skips metadata-only syncs, and resyncs after reconnect', async () => {
    const statusListeners = new Set<(status: { state: string }) => void>();
    let appWindow: DOMWindow | undefined;
    let backupPresentAtWrite = false;
    const request = vi.fn(async (payload: { cmd?: string }) => {
      if (payload.cmd === 'get_config') return { ok: true, snapshot: makeDeviceSnapshot(), warnings: [] };
      if (payload.cmd === 'set_config') {
        backupPresentAtWrite ||= Boolean(appWindow?.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY));
        return { ok: true, warnings: [] };
      }
      return { ok: false, error: 'Unsupported request' };
    });
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string }) => void) => {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect: vi.fn().mockResolvedValue({ state: 'connected' }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getFile: vi.fn().mockResolvedValue({ ok: false, error: 'Profiles stay local' }),
      request,
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    const { app, root, deviceKeymapFiles } = await openEmbeddedApp(bridge);
    appWindow = app.window;
    const waitForSync = () => new Promise<void>((resolve) => app.window.setTimeout(resolve, 750));
    const emitStatus = (state: string) => {
      for (const listener of statusListeners) listener({ state });
    };
    await vi.waitFor(() => expect(statusListeners.size).toBeGreaterThan(0));
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 50));

    emitStatus('connected');
    await waitForSync();
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual(['get_config', 'set_config']);
    expect(backupPresentAtWrite).toBe(true);
    expect(deviceKeymapFiles.getLatestBackup()?.snapshot.layerCount).toBe(4);

    const profileName = root.querySelector<HTMLInputElement>('input[placeholder="Profile name..."]');
    expect(profileName).not.toBeNull();
    profileName!.value = 'Metadata only change';
    profileName!.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    profileName!.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await waitForSync();
    expect(request).toHaveBeenCalledTimes(2);
    expect(bridge.putFile).toHaveBeenCalledTimes(1);

    emitStatus('disconnected');
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));
    emitStatus('connected');
    await waitForSync();
    expect(request.mock.calls.map(([payload]) => payload.cmd)).toEqual([
      'get_config', 'set_config', 'get_config', 'set_config',
    ]);
    expect(bridge.putFile).toHaveBeenCalledTimes(2);
  });

  it('fails closed and keeps the profile local when a pre-sync device read fails', async () => {
    const statusListeners = new Set<(status: { state: string }) => void>();
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string }) => void) => {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect: vi.fn().mockResolvedValue({ state: 'connected' }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getFile: vi.fn().mockResolvedValue({ ok: false, error: 'Profiles stay local' }),
      request: vi.fn().mockResolvedValue({ ok: false, error: 'VIA read timed out' }),
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    const { app, root } = await openEmbeddedApp(bridge);
    await vi.waitFor(() => expect(statusListeners.size).toBeGreaterThan(0));
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 50));
    for (const listener of statusListeners) listener({ state: 'connected' });
    await vi.waitFor(() => expect(bridge.request).toHaveBeenCalledWith({ cmd: 'get_config' }));
    await vi.waitFor(() => expect(root.textContent).toContain('device sync paused because a pre-sync backup could not be read'));

    expect(bridge.request).toHaveBeenCalledWith({ cmd: 'get_config' });
    expect(bridge.request).not.toHaveBeenCalledWith(expect.objectContaining({ cmd: 'set_config' }));
    expect(app.window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).toBeNull();
    expect(JSON.parse(app.window.localStorage.getItem('cm2.state.v2') || 'null')?.profiles).toBeDefined();
    expect(root.textContent).toContain('device sync paused because a pre-sync backup could not be read');
  });

  it('imports a selected profile JSON into browser-local state and preserves custom actions', async () => {
    const { app, root } = await openEmbeddedApp();
    root.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]')!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));

    const importButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Import'
    );
    expect(importButton).toBeDefined();
    vi.spyOn(app.window.HTMLInputElement.prototype, 'click').mockImplementation(() => undefined);
    importButton!.click();

    const fileInput = app.window.document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput?.accept).toBe('application/json,.json');
    const importedProfile = {
      id: 'backup-profile',
      name: 'Imported from backup',
      color: '#123456',
      layers: [{
        r1c1: { label: 'A', binding: 'A', actionType: 'Basic input' },
        'dial-tl': {
          label: 'Dial',
          binding: 'Volume',
          actionType: 'Basic input',
          encoderActions: {
            cw: { label: 'Vol+', binding: 'volume +' },
            ccw: { label: 'Vol-', binding: 'volume -' },
            press: { label: 'Mute', binding: 'mute' },
          },
        },
      }],
    };
    const fileText = createProfileExport(importedProfile, {
      Action: [{ id: 'imported-action', main: 'Open editor', binding: '(App: Editor)' }],
      'Multi-A': [],
      'Smart-A': [],
    });
    const file = new (app.window as any).File([fileText], 'profile.json', { type: 'application/json' });
    Object.defineProperty(fileInput!, 'files', { configurable: true, value: [file] });
    fileInput!.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 80));

    const stored = JSON.parse(app.window.localStorage.getItem('cm2.state.v2') || 'null');
    expect(stored.profiles).toHaveLength(2);
    expect(stored.profiles[1].name).toBe('Imported from backup');
    expect(stored.activeProfileIndex).toBe(1);
    expect(stored.customItems.Action).toContainEqual(expect.objectContaining({ id: 'imported-action' }));
    expect(root.textContent).toContain('Imported 1 profile into this browser');
    expect(app.window.document.querySelector('input[type="file"]')).toBeNull();
  });

  it('routes profile export through the versioned profile file helper', async () => {
    const { app, root, profileFiles } = await openEmbeddedApp();
    const download = vi.spyOn(profileFiles, 'download').mockReturnValue({ ok: true });
    root.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]')!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));
    root.querySelector<HTMLButtonElement>('button[title="Export profile"]')!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));

    expect(download).toHaveBeenCalledOnce();
    const exportedProfile = download.mock.calls[0][0] as Record<string, unknown>;
    const exportedActions = download.mock.calls[0][1] as Record<string, unknown>;
    expect(exportedProfile).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
    });
    expect(Array.isArray(exportedProfile.layers)).toBe(true);
    expect(Array.isArray(exportedActions.Action)).toBe(true);
    expect(root.textContent).toContain('Exported');
  });

  it('reflects actual connection and firmware values in Settings', async () => {
    const statusListeners = new Set<(status: { state: string; device?: string; fw?: string }) => void>();
    const bridge = {
      getStatus: vi.fn().mockResolvedValue({ state: 'disconnected' }),
      onStatus: vi.fn((listener: (status: { state: string; device?: string; fw?: string }) => void) => {
        statusListeners.add(listener);
        return () => statusListeners.delete(listener);
      }),
      onEvent: vi.fn(() => () => undefined),
      connect: vi.fn().mockResolvedValue({ state: 'connected' }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getFile: vi.fn().mockResolvedValue({ ok: false, error: 'Profiles stay local' }),
      request: vi.fn(async (payload: { cmd?: string }) => payload.cmd === 'get_config'
        ? { ok: true, snapshot: makeDeviceSnapshot(), warnings: [] }
        : { ok: true, warnings: [] }),
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    const { app, root } = await openEmbeddedApp(bridge);
    const settings = Array.from(root.querySelectorAll<HTMLButtonElement>('nav button')).find(
      (button) => button.textContent?.trim() === 'Settings'
    );
    settings!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 330));
    expect(root.textContent).toContain('Device status:Not connected');
    expect(root.textContent).toContain('Firmware version:—');
    expect(root.textContent).not.toContain('Device connected:Grid Macro 1');

    for (const listener of statusListeners) {
      listener({ state: 'connected', device: 'Grid Macro 1 Test', fw: 'VIA 01020304' });
    }
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 40));
    expect(root.textContent).toContain('Device status:Grid Macro 1 Test');
    expect(root.textContent).toContain('Firmware version:VIA 01020304');
    expect(root.textContent).toContain('Pre-sync device keymap backup');
    expect(root.textContent).toContain('Restore from file');
  });

  it('keeps the preset library and screen navigation functional', async () => {
    const { app, root } = await openEmbeddedApp();
    const presetTab = Array.from(
      root.querySelectorAll<HTMLButtonElement>('nav button')
    ).find(
      (button) => button.textContent?.trim() === 'Preset'
    );
    expect(presetTab).toBeDefined();
    presetTab!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 350));

    const content = root.textContent || '';
    expect(content).toContain('Presets library');
    expect(content).toContain('VS Code');
    expect(content).toContain('GitHub & Git Dev');
    expect(content).toContain('Terminal & CLI');
    expect(content).toContain('Docker DevOps');
    expect(content).toContain('Preview');
    expect(content).toContain('Install');
  });

  it('toggles simulation and opens the single encoder action capsule', async () => {
    const { app, root } = await openEmbeddedApp();
    const simulationToggle = Array.from(root.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Simulation off'
    );
    expect(simulationToggle).toBeDefined();
    simulationToggle!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 20));
    expect(root.textContent).toContain('Simulation on');

    const encoder = root.querySelector<HTMLButtonElement>('button[title^="Dial:"]');
    expect(encoder).not.toBeNull();
    encoder!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 300));
    expect(root.querySelectorAll('[data-drop-encoder-sub]')).toHaveLength(3);
  });

  it('executes smart and shortcut actions through only the Electron bridge when available', async () => {
    const { app } = await openEmbeddedApp();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const executeSmartAction = vi.fn().mockResolvedValue(undefined);
    (app.window as any).fetch = fetchMock;
    (app.window as any).electronAPI = { executeSmartAction };

    app.window.eval(
      'triggerActionExecution({ binding: "(App: Calculator)" }, null, null);' +
        'triggerActionExecution({ binding: "Ctrl+Shift+S" }, null, null);'
    );

    expect(executeSmartAction).toHaveBeenCalledTimes(2);
    expect(executeSmartAction).toHaveBeenNthCalledWith(1, {
      type: 'App',
      value: 'Calculator',
    });
    expect(executeSmartAction).toHaveBeenNthCalledWith(2, {
      type: 'Shortcut',
      value: 'Ctrl+Shift+S',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the local HTTP endpoint exactly once when the Electron bridge is absent', async () => {
    const { app } = await openEmbeddedApp();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    (app.window as any).fetch = fetchMock;

    app.window.eval(
      'triggerActionExecution({ binding: "(Web: https://example.test)" }, null, null);'
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/execute-action');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      type: 'Web',
      value: 'https://example.test',
    });
  });
});
