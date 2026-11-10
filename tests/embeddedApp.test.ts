import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole, type DOMWindow } from 'jsdom';
import { GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';
import { createDeviceKeymapFileTools, DEVICE_KEYMAP_BACKUP_HISTORY_KEY } from '../src/deviceKeymapFiles';
import { createProfileExport, createProfileFileTools } from '../src/profileFiles';
import { createAppSettingsTools } from '../src/appSettings';
import { VIA_PROTOCOL_VERSION } from '../src/qmkViaBridge';

const html = '<!doctype html><html><head></head><body><div id="root"></div></body></html>';
const bundle = readFileSync(
  join(process.cwd(), 'tests/fixtures/legacyEmbeddedApp.js'),
  'utf8'
);
const legacyUiBaseline = JSON.parse(
  readFileSync(
    join(process.cwd(), 'tests/fixtures/shipped-ui-baseline.json'),
    'utf8'
  )
) as { tree: unknown };
const macroIconDataSource = readFileSync(join(process.cwd(), 'public/icons-data.js'), 'utf8');
const macroIconData = JSON.parse(
  macroIconDataSource.slice(macroIconDataSource.indexOf('=') + 1, macroIconDataSource.lastIndexOf(';'))
) as { d: Record<string, string> };
const presetBrandIconIds = [
  'brand-openai', 'brand-vscode', 'brand-github', 'terminal', 'brand-docker', 'brand-chrome',
  'brand-adobe-photoshop', 'brand-adobe-illustrator', 'brand-adobe-premiere',
  'brand-adobe-after-effects', 'brand-davinciresolve', 'brand-blender', 'brand-figma',
  'brand-framer', 'brand-audacity', 'brand-notion', 'brand-slack', 'brand-zoom',
  'brand-obsstudio', 'brand-discord', 'brand-spotify', 'brand-windows',
];
const presetBrandIconPaths = Object.fromEntries(
  presetBrandIconIds.map((iconId) => [iconId, macroIconData.d[iconId]])
);

if (!bundle) {
  throw new Error('Expected the legacy inline application test fixture');
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

async function openEmbeddedApp(
  bridge?: Record<string, unknown>,
  options: {
    markReady?: boolean;
    beforeEvaluate?: (window: DOMWindow) => void;
  } = {}
) {
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
  const appSettings = createAppSettingsTools(app.window as unknown as Window & typeof globalThis);
  Object.defineProperty(app.window, 'nodeStudioProfileFiles', { value: profileFiles, configurable: true });
  Object.defineProperty(app.window, 'nodeStudioDeviceKeymapFiles', { value: deviceKeymapFiles, configurable: true });
  Object.defineProperty(app.window, 'nodeStudioAppSettings', { value: appSettings, configurable: true });
  if (bridge) Object.defineProperty(app.window, 'macropad', { value: bridge, configurable: true });
  const root = app.window.document.querySelector('#root');
  if (!root) throw new Error('App root element was not created');
  if (options.markReady ?? true) root.classList.add('is-ready');
  options.beforeEvaluate?.(app.window);
  app.window.eval(bundle!);
  await new Promise((resolve) => app.window.setTimeout(resolve, 30));
  return { app, root, jsdomErrors, profileFiles, deviceKeymapFiles };
}

type RecordedEntranceAnimation = {
  element: HTMLElement;
  keyframes: Keyframe[];
  options: KeyframeAnimationOptions;
};

function installAnimationRecorder(
  window: DOMWindow,
  records: RecordedEntranceAnimation[]
) {
  const browserWindow = window as unknown as Window & typeof globalThis;
  Object.defineProperty(browserWindow.HTMLElement.prototype, 'animate', {
    configurable: true,
    value: function (
      this: HTMLElement,
      keyframes: Keyframe[],
      options: KeyframeAnimationOptions
    ) {
      records.push({ element: this, keyframes, options });
      return {
        cancel: vi.fn(),
        onfinish: null as Animation['onfinish'],
      } as unknown as Animation;
    },
  });
}

describe('Legacy inline app regression runtime', () => {
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
      legacyUiBaseline.tree
    );
    expect(jsdomErrors).toEqual([]);
  });

  it('runs the legacy entrance sequence only after readiness and does not replay on navigation', async () => {
    const animations: RecordedEntranceAnimation[] = [];
    const { app, root } = await openEmbeddedApp(undefined, {
      markReady: false,
      beforeEvaluate: (window) => installAnimationRecorder(window, animations),
    });

    expect(animations).toHaveLength(0);
    app.window.dispatchEvent(new app.window.Event('node:app-ready'));
    expect(animations).toHaveLength(18);

    const headerAnimation = animations.find(({ element }) => element.tagName === 'HEADER');
    expect(headerAnimation?.options.delay).toBe(30);
    expect(headerAnimation?.options.duration).toBe(440);
    expect(headerAnimation?.options.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    const lastKeyAnimation = animations.find(
      ({ element }) => element.dataset.dropSlot === 'r3c3'
    );
    expect(lastKeyAnimation?.options.delay).toBeCloseTo(870);

    const macropadAnimation = animations.find(
      ({ element }) =>
        element.tagName === 'DIV' && element.classList.contains('cursor-grab')
    );
    expect(macropadAnimation?.options.delay).toBe(300);
    expect(macropadAnimation?.options.duration).toBe(500);
    expect(macropadAnimation?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);

    const tipAnimation = animations.find(({ element }) =>
      element.classList.contains('pb-[24px]')
    );
    expect(tipAnimation?.options.delay).toBe(350);
    expect(tipAnimation?.options.duration).toBe(400);
    expect(tipAnimation?.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);

    const presetButton = [...root.querySelectorAll<HTMLButtonElement>('nav button')].find((button) =>
      button.textContent?.includes('Preset')
    );
    presetButton?.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 30));
    app.window.dispatchEvent(new app.window.Event('node:app-ready'));
    expect(animations).toHaveLength(18);
  });

  it('skips the legacy entrance sequence when reduced motion is preferred', async () => {
    const animations: RecordedEntranceAnimation[] = [];
    const { app } = await openEmbeddedApp(undefined, {
      markReady: false,
      beforeEvaluate: (window) => {
        installAnimationRecorder(window, animations);
        Object.defineProperty(window, 'matchMedia', {
          configurable: true,
          value: () => ({ matches: true }),
        });
      },
    });

    app.window.dispatchEvent(new app.window.Event('node:app-ready'));
    expect(animations).toHaveLength(0);
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

    root.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]')!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));
    const profileName = root.querySelector<HTMLInputElement>('input[aria-label^="Rename profile"]');
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

  it('renames profiles directly in their capsule and updates the active profile label', async () => {
    const { app, root } = await openEmbeddedApp();
    root.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]')!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));

    const addProfile = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Add Profile'
    );
    expect(addProfile).toBeDefined();
    addProfile!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));

    const defaultProfileName = root.querySelector<HTMLInputElement>(
      'input[aria-label="Rename profile Default Profile"]'
    );
    expect(defaultProfileName).not.toBeNull();
    defaultProfileName!.focus();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));
    expect(root.querySelector('span[title="Default Profile"]')?.textContent).toBe('Default Profile');

    const profileName = root.querySelector<HTMLInputElement>(
      'input[aria-label="Rename profile 2"]'
    );
    expect(profileName).not.toBeNull();
    profileName!.focus();
    const setInputValue = Object.getOwnPropertyDescriptor(
      app.window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    setInputValue.call(profileName, 'Work');
    profileName!.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));

    expect(root.querySelector<HTMLInputElement>('input[aria-label="Rename profile Work"]')?.value).toBe('Work');
    expect(root.querySelector('span[title="Work"]')?.textContent).toBe('Work');
    expect(JSON.parse(app.window.localStorage.getItem('cm2.state.v2') || 'null')?.profiles[1].name).toBe('Work');
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
    const { app, root, deviceKeymapFiles } = await openEmbeddedApp(bridge);
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
    expect(root.textContent).toContain('Save backup');
    expect(root.textContent).toContain('Restore from file');

    const saveButton = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Save backup');
    expect(saveButton?.disabled).toBe(false);
    saveButton!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 50));
    expect(bridge.request).toHaveBeenCalledWith({ cmd: 'get_config' });
    expect(app.window.localStorage.getItem(DEVICE_KEYMAP_BACKUP_HISTORY_KEY)).not.toBeNull();

    const download = vi.spyOn(deviceKeymapFiles, 'downloadLatestBackup').mockReturnValue({ ok: true });
    const downloadButton = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Download backup');
    expect(downloadButton?.disabled).toBe(false);
    downloadButton!.click();
    expect(download).toHaveBeenCalledOnce();

    const restore = vi.spyOn(deviceKeymapFiles, 'restoreFromFile').mockResolvedValue({
      ok: true,
      changedMappings: 2,
      preRestoreBackupSaved: true,
    });
    const restoreButton = [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Restore from file');
    expect(restoreButton?.disabled).toBe(false);
    restoreButton!.click();
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 50));
    expect(restore).toHaveBeenCalledWith(bridge, {
      device: 'Grid Macro 1 Test',
      firmware: 'VIA 01020304',
    });
  });

  it('renders refreshed icons across the preset library and keeps navigation functional', async () => {
    const { app, root } = await openEmbeddedApp(undefined, {
      beforeEvaluate: (window) => {
        Object.defineProperty(window, '__MACRO_ICONS__', {
          configurable: true,
          value: { d: presetBrandIconPaths },
        });
      },
    });
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

    const presetIcons = [...root.querySelectorAll<HTMLElement>('[data-preset-icon]')];
    expect(presetIcons).toHaveLength(27);
    expect(new Set(presetIcons.map((icon) => icon.dataset.presetIcon)).size).toBe(27);
    expect(presetIcons.every((icon) => icon.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(presetIcons.filter((icon) => icon.querySelector('svg'))).toHaveLength(23);
    expect(presetIcons.every((icon) => icon.style.borderRadius === '9px')).toBe(true);
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

  it('runs the legacy Settings links, release check, local reset, and desktop flash request honestly', async () => {
    const openExternal = vi.fn(() => ({ opener: null }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const flashFirmware = vi.fn().mockResolvedValue({ ok: true, message: 'Copied firmware to RPI-RP2' });
    const confirm = vi.fn(() => true);
    const { app, root } = await openEmbeddedApp(undefined, {
      beforeEvaluate: (window) => {
        Object.defineProperty(window, 'open', { configurable: true, value: openExternal });
        Object.defineProperty(window, 'fetch', { configurable: true, value: fetchMock });
        Object.defineProperty(window, 'confirm', { configurable: true, value: confirm });
        Object.defineProperty(window, 'electronAPI', {
          configurable: true,
          value: { flashFirmware },
        });
      },
    });
    const settingsTab = [...root.querySelectorAll<HTMLButtonElement>('nav button')]
      .find((button) => button.textContent?.trim() === 'Settings');
    settingsTab!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 350));

    root.querySelector<HTMLButtonElement>('button[role="switch"]')!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 20));
    expect(JSON.parse(app.window.localStorage.getItem('node-studio.settings.v1') || '{}'))
      .toMatchObject({ allowAnalytics: true });
    expect(root.textContent).toContain('does not send analytics');

    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Help & Documentation')?.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 20));
    expect(openExternal).toHaveBeenCalledWith(
      'https://github.com/david-8837/NODE/blob/main/qmk_firmware/grid_macro_1/README.md',
      '_blank'
    );

    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Check firmware update')!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 30));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/david-8837/NODE/releases/latest',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(root.textContent).toContain('There is no published firmware release yet');

    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Advance flash')!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 20));
    expect(flashFirmware).toHaveBeenCalledOnce();
    expect(root.textContent).toContain('Copied firmware to RPI-RP2');

    [...root.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Reset local config')!.click();
    await new Promise((resolve) => app.window.setTimeout(resolve, 20));
    expect(confirm).toHaveBeenCalledOnce();
    expect(root.textContent).toContain('Local profiles and actions reset');
  });

  it('blocks terminal Smart Actions until the saved Settings preference is enabled', async () => {
    const executeSmartAction = vi.fn().mockResolvedValue(undefined);
    const { app } = await openEmbeddedApp(undefined, {
      beforeEvaluate: (window) => {
        Object.defineProperty(window, 'electronAPI', {
          configurable: true,
          value: { executeSmartAction },
        });
      },
    });

    app.window.eval('triggerActionExecution({ binding: "(Cmd: echo safe)" }, null, null);');
    expect(executeSmartAction).not.toHaveBeenCalled();

    await app.window.nodeStudioAppSettings!.set('allowTerminalSmartActions', true);
    app.window.eval('triggerActionExecution({ binding: "(Cmd: echo safe)" }, null, null);');
    expect(executeSmartAction).toHaveBeenCalledWith({
      type: 'Cmd',
      value: 'echo safe',
      allowTerminal: true,
    });
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
