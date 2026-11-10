/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import type { IconLibrary } from '../src/iconCatalog';

let container: HTMLDivElement;
let root: Root;

function loadIconLibrary(): IconLibrary {
  const source = readFileSync('public/icons-data.js', 'utf8');
  const json = source.slice(source.indexOf('=') + 1).trim().replace(/;$/, '');
  return JSON.parse(json) as IconLibrary;
}

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

async function waitForTransitions() {
  await act(async () => {
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  });
}

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
  Object.defineProperty(window, '__MACRO_ICONS__', {
    configurable: true,
    value: loadIconLibrary(),
  });
  container = document.createElement('div');
  container.id = 'root';
  container.classList.add('is-ready');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(createElement(App)));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete (window as Window & { __MACRO_ICONS__?: unknown }).__MACRO_ICONS__;
});

describe('React icon picker', () => {
  it('progressively browses the full library, searches it, and renders filled icons correctly', async () => {
    await click(container.querySelector<HTMLButtonElement>('button[title="Open Key Mapping"]')!);
    await click(
      [...container.querySelectorAll<HTMLButtonElement>('aside button')].find(
        (button) => button.textContent?.trim() === 'Action'
      )!
    );
    await waitForTransitions();
    await click(
      [...container.querySelectorAll<HTMLButtonElement>('aside button')].find(
        (button) => button.textContent?.trim() === 'New Action'
      )!
    );
    await waitForTransitions();
    await click(container.querySelector<HTMLButtonElement>('button[title="Select Icon or Emoji"]')!);

    expect(
      [...container.querySelectorAll<HTMLButtonElement>('button')].some((button) =>
        button.textContent?.includes('Browse all 8,502 icons')
      )
    ).toBe(true);

    await click(
      [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('Browse all 8,502 icons')
      )!
    );
    expect(container.querySelectorAll('button[aria-label^="Select icon "]')).toHaveLength(72);
    expect(container.textContent).toContain('Showing 1–72 of 8,502');

    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Next icon results"]')!);
    expect(container.querySelectorAll('button[aria-label^="Select icon "]')).toHaveLength(72);
    expect(container.textContent).toContain('Showing 73–144 of 8,502');
    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Previous icon results"]')!);
    expect(container.textContent).toContain('Showing 1–72 of 8,502');

    const searchInput = container.querySelector<HTMLInputElement>('input[placeholder="Search icon"]')!;
    const setInputValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    await act(async () => {
      setInputValue.call(searchInput, 'brand airbnb');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const matchingIcon = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Select icon brand airbnb"]'
    );
    expect(matchingIcon).not.toBeNull();
    expect(container.querySelectorAll('button[aria-label^="Select icon "]')).toHaveLength(1);
    await click(matchingIcon!);

    const selectedIcon = container.querySelector<SVGSVGElement>(
      'button[title="Select Icon or Emoji"] svg'
    );
    expect(selectedIcon?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(selectedIcon?.getAttribute('fill')).toBe('currentColor');
    expect(selectedIcon?.getAttribute('stroke')).toBe('none');
    expect(selectedIcon?.querySelector('path')?.getAttribute('d')).toContain('M12.001');
  });
});
