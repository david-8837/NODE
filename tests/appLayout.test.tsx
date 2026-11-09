/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from '../src/App';
import fs from 'node:fs';
import path from 'node:path';
import { GRID_MACRO_KEY_SLOTS } from '../src/deviceLayout';

const shippedUiBaseline = JSON.parse(
  fs.readFileSync(
    path.join(process.cwd(), 'tests/fixtures/shipped-ui-baseline.json'),
    'utf8'
  )
) as { tree: unknown };

function snapshotElement(element: Element): unknown {
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
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
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
    expect(snapshotElement(container.firstElementChild!)).toEqual(
      shippedUiBaseline.tree
    );
  });
});
