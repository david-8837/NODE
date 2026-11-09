import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
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

async function openEmbeddedApp() {
  const virtualConsole = new VirtualConsole();
  const jsdomErrors: string[] = [];
  virtualConsole.on('jsdomError', (error) => jsdomErrors.push(error.message));
  const app = new JSDOM(html.replace(/<script type="module">[\s\S]*?<\/script>/, ''), {
    url: 'http://localhost:5173/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  openApps.push(app);
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
});
