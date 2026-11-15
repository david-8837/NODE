/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import { installConnectedDevice, removeConnectedDevice } from './helpers/connectedDevice';
import fs from 'node:fs';
import path from 'node:path';
import { GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';

const baselinePath = path.join(process.cwd(), 'tests/fixtures/react-app-layout-baseline.json');
const reactAppBaseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as { tree: unknown };

/**
 * framer-motion writes per-frame opacity/scale/blur values while entering. Those
 * numbers depend on when the snapshot happens to run, so they are not layout
 * hooks. Only these three animatable properties are ignored; every other inline
 * style is still asserted.
 */
function isTransientAnimationStyle(value: string): boolean {
  const declarations = value.split(';').map((part) => part.trim()).filter(Boolean);
  if (declarations.length === 0) return true;
  return declarations.every((declaration) => /^(opacity|transform|filter)\s*:/.test(declaration));
}

function snapshotElement(element: Element): unknown {
  const attributes = Object.fromEntries(
    [...element.attributes]
      .filter(
        (attribute) => !(attribute.name === 'style' && isTransientAnimationStyle(attribute.value))
      )
      .map(({ name, value }) => [
        name,
        // Exclude the loading-curtain hook from the stable layout snapshot.
        name === 'class' ? value.replace(/^app-shell\s+/, '') : value,
      ])
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const text = [...element.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim().replace(/\s+/g, ' ') || '')
    .filter(Boolean)
    .join(' ');

  return {
    tag: element.tagName.toLowerCase(),
    attributes,
    text,
    children: [...element.children].map(snapshotElement),
  };
}

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

describe('Grid Macro 1 rendered hardware', () => {
  it('renders nine matrix keys and exactly one rotary encoder without changing the surrounding UI', async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    const renderedKeySlots = Array.from(
      container.querySelectorAll<HTMLElement>('[data-drop-slot^="r"]')
    ).map((element) => element.dataset.dropSlot);
    expect(renderedKeySlots).toEqual(GRID_MACRO_KEY_SLOTS);
    expect(container.querySelectorAll('button[title^="Dial:"]')).toHaveLength(1);
    expect(container.querySelector('nav')?.textContent).toContain('Keymap');
    expect(container.querySelector('nav')?.textContent).toContain('Preset');
    expect(container.querySelector('nav')?.textContent).toContain('Settings');
  });

  it('matches the previously shipped keymap screen structure and styling hooks', async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    expect(container.firstElementChild).not.toBeNull();
    const tree = snapshotElement(container.firstElementChild!);
    // Opt-in refresh, mirroring `jest -u`. Review the JSON diff before committing:
    // this fixture is the regression guard for the shipped keymap screen.
    if (process.env.UPDATE_LAYOUT_BASELINE) {
      const source = 'Shipped React app Keymap screen with a verified Micro Pad connection '
        + '(the configurator is gated behind device detection); transient framer-motion '
        + 'opacity/transform/filter frames are excluded.';
      fs.writeFileSync(baselinePath, `${JSON.stringify({ source, tree }, null, 2)}\n`);
    }
    expect(tree).toEqual(reactAppBaseline.tree);
  });
});
