import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM, VirtualConsole, type DOMWindow } from 'jsdom';
import { GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';

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
  if (bridge) Object.defineProperty(app.window, 'macropad', { value: bridge, configurable: true });
  app.window.eval(bundle!);
  await new Promise((resolve) => app.window.setTimeout(resolve, 30));
  const root = app.window.document.querySelector('#root');
  if (!root) throw new Error('App root element was not created');
  return { app, root, jsdomErrors };
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

  it('skips metadata-only syncs and re-syncs the local profile after reconnect', async () => {
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
      request: vi.fn().mockResolvedValue({ ok: true, warnings: [] }),
      putFile: vi.fn().mockResolvedValue({ ok: true, localOnly: true }),
    };
    const { app, root } = await openEmbeddedApp(bridge);
    const waitForSync = () => new Promise<void>((resolve) => app.window.setTimeout(resolve, 750));
    const emitStatus = (state: string) => {
      for (const listener of statusListeners) listener({ state });
    };

    emitStatus('connected');
    await waitForSync();
    expect(bridge.request).toHaveBeenCalledTimes(1);

    const profileName = root.querySelector<HTMLInputElement>('input[placeholder="Profile name..."]');
    expect(profileName).not.toBeNull();
    profileName!.value = 'Metadata only change';
    profileName!.dispatchEvent(new app.window.Event('input', { bubbles: true }));
    profileName!.dispatchEvent(new app.window.Event('change', { bubbles: true }));
    await waitForSync();
    expect(bridge.request).toHaveBeenCalledTimes(1);
    expect(bridge.putFile).toHaveBeenCalledTimes(1);

    emitStatus('disconnected');
    await new Promise<void>((resolve) => app.window.setTimeout(resolve, 30));
    emitStatus('connected');
    await waitForSync();
    expect(bridge.request).toHaveBeenCalledTimes(2);
    expect(bridge.putFile).toHaveBeenCalledTimes(2);
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
