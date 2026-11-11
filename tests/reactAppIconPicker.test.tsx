/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { IconLibrary } from '../src/iconCatalog';
import { iconBootstrapData, presetBrandIconData } from './presetBrandIconData';

let container: HTMLDivElement;
let root: Root;
let fullIconLibraryLoads: number;

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
  fullIconLibraryLoads = 0;
  const startupLibrary: IconLibrary = {
    d: { ...iconBootstrapData.d, ...presetBrandIconData.d },
    l: [...iconBootstrapData.l, ...presetBrandIconData.l],
  };
  Object.defineProperty(window, '__MACRO_ICON_BOOTSTRAP__', {
    configurable: true,
    value: iconBootstrapData,
  });
  Object.defineProperty(window, '__PRESET_BRAND_ICON_DATA__', {
    configurable: true,
    value: presetBrandIconData,
  });
  Object.defineProperty(window, '__MACRO_ICONS__', {
    configurable: true,
    writable: true,
    value: startupLibrary,
  });
  delete window.__MACRO_ICON_LIBRARY_READY__;

  const appendScript = document.head.append.bind(document.head);
  vi.spyOn(document.head, 'append').mockImplementation((...nodes: (string | Node)[]) => {
    appendScript(...nodes);
    for (const node of nodes) {
      if (node instanceof HTMLScriptElement && node.src.endsWith('/icons-data.js')) {
        fullIconLibraryLoads += 1;
        window.__MACRO_ICONS__ = loadIconLibrary();
        node.dispatchEvent(new Event('load'));
      }
    }
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
  delete window.__MACRO_ICON_LIBRARY_READY__;
  delete window.__MACRO_ICON_BOOTSTRAP__;
  delete window.__PRESET_BRAND_ICON_DATA__;
  delete (window as Window & { __MACRO_ICONS__?: unknown }).__MACRO_ICONS__;
  vi.restoreAllMocks();
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
    expect(Object.keys(window.__MACRO_ICONS__?.d ?? {})).toHaveLength(145);
    expect(fullIconLibraryLoads).toBe(0);

    await click(container.querySelector<HTMLButtonElement>('button[title="Select Icon or Emoji"]')!);
    expect(fullIconLibraryLoads).toBe(1);
    expect(Object.keys(window.__MACRO_ICONS__?.d ?? {})).toHaveLength(8_480);

    expect(
      [...container.querySelectorAll<HTMLButtonElement>('button')].some((button) =>
        button.textContent?.includes('Browse all 8,507 icons')
      )
    ).toBe(true);
    const popover = [...container.querySelectorAll<HTMLDivElement>('div')].find((element) =>
      element.className.includes('w-[216px]')
    );
    expect(popover?.className).toContain(
      'absolute top-[68px] left-0 w-[216px] bg-[#efefef] rounded-[18px]'
    );
    expect(popover?.className).toContain('shadow-[0_8px_28px_rgba(0,0,0,0.16)]');

    await click(
      [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('Browse all 8,507 icons')
      )!
    );
    expect(container.querySelectorAll('button[aria-label^="Select icon "]')).toHaveLength(72);
    expect(container.textContent).toContain('Showing 1–72 of 8,507');

    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Next icon results"]')!);
    expect(container.querySelectorAll('button[aria-label^="Select icon "]')).toHaveLength(72);
    expect(container.textContent).toContain('Showing 73–144 of 8,507');
    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Previous icon results"]')!);
    expect(container.textContent).toContain('Showing 1–72 of 8,507');

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

  it('keeps emoji search and selection available in the lazy-loaded popover', async () => {
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
    await click(
      [...container.querySelectorAll<HTMLButtonElement>('button')].find(
        (button) => button.textContent?.trim() === 'Emoji'
      )!
    );
    await waitForTransitions();

    const searchInput = container.querySelector<HTMLInputElement>('input[placeholder="Search emoji"]')!;
    const setInputValue = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )!.set!;
    await act(async () => {
      setInputValue.call(searchInput, 'sushi');
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const matchingEmoji = container.querySelector<HTMLButtonElement>('button[title="sushi"]');
    expect(matchingEmoji).not.toBeNull();
    const selectedEmoji = matchingEmoji!.textContent?.trim();
    await click(matchingEmoji!);
    expect(
      container.querySelector<HTMLButtonElement>('button[title="Select Icon or Emoji"]')?.textContent
    ).toContain(selectedEmoji);
  });
});
