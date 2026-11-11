/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../src/App';
import { PROFILE_FILE_STORAGE_KEY } from '../src/profileFiles';

let container: HTMLDivElement;
let root: Root;

async function click(button: HTMLButtonElement) {
  await act(async () => button.click());
}

async function openPresets() {
  const presetButton = [...container.querySelectorAll<HTMLButtonElement>('nav button')]
    .find((button) => button.textContent?.trim() === 'Preset');
  await act(async () => {
    presetButton!.click();
    await new Promise((resolve) => window.setTimeout(resolve, 350));
  });
}

beforeEach(async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  window.localStorage.clear();
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

describe('production React preset experience', () => {
  it('renders all shipped preset cards and installs platform-aware bindings and custom actions', async () => {
    await openPresets();
    expect(container.querySelectorAll('[data-preset-icon]')).toHaveLength(27);
    expect(container.querySelector('[data-preset-screen]')?.className).toContain('preset-screen-scroll');
    expect(container.querySelector('[data-preset-grid]')?.className).toContain('xl:grid-cols-4');
    expect(container.querySelector('[data-preset-grid]')?.className).toContain('2xl:grid-cols-5');

    await click(container.querySelector<HTMLButtonElement>('button[aria-label="macOS Presets"]')!);
    let chatgptIcon = container.querySelector<HTMLElement>('[data-preset-icon="chatgpt"]');
    let chatgptCard = chatgptIcon?.parentElement?.parentElement?.parentElement;
    const previewButton = [...(chatgptCard?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Preview');
    expect(previewButton).toBeDefined();
    Object.defineProperty(window, '__MACRO_ICONS__', {
      configurable: true,
      value: { d: { search: 'M2 2L22 22' } },
    });
    await click(previewButton!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    const previewPage = container.querySelector<HTMLElement>('[aria-label="ChatGPT preset preview"]');
    expect(previewPage).not.toBeNull();
    expect(previewPage?.textContent).toContain('Layer preset');
    expect(previewPage?.textContent).toContain('Author: Node');
    expect(previewPage?.textContent).toContain('New Chat');
    expect(previewPage?.textContent).toContain('Starts a fresh conversation.');
    expect(previewPage?.textContent).toContain('Scroll Down');
    expect(previewPage?.className).toContain('inset-0');
    expect(previewPage?.className).toContain('z-50');
    expect([...previewPage!.querySelectorAll('span')]
      .find((span) => span.textContent === '↻')?.className).toContain('text-[#0051ff]');
    const previewKeys = [...(previewPage?.querySelectorAll<HTMLButtonElement>('[data-drop-slot^="r"]') ?? [])];
    expect(previewKeys).toHaveLength(9);
    expect(previewKeys.every((key) => key.style.backgroundColor === '')).toBe(true);
    expect(previewKeys[0]?.className).toContain('hover:border-[#0051ff]');
    const previewNumbers = [...(previewPage?.querySelectorAll<HTMLElement>('[data-preview-slot-number]') ?? [])];
    expect(previewNumbers.map((number) => number.textContent)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(previewNumbers[0]?.className).toContain('text-[12px]');
    expect(previewNumbers[0]?.className).toContain('text-white');
    expect(previewNumbers[0]?.className).toContain('group-hover:drop-shadow-');
    expect(previewNumbers[0]?.className).not.toContain('absolute');

    await act(async () => {
      previewKeys[0]!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    const firstActionNumber = previewPage?.querySelector<HTMLElement>('[data-preview-action-number="1"]');
    expect(firstActionNumber?.className).toContain('ring-1');
    expect(firstActionNumber?.className).toContain('shadow-[0_0_9px_rgba(0,81,255,0.65)]');

    await act(async () => {
      previewKeys[0]!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    await act(async () => {
      firstActionNumber!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(previewKeys[0]?.className).toContain('shadow-[0_0_12px_rgba(0,81,255,0.65)]');
    expect(previewNumbers[0]?.className).toContain('drop-shadow-[0_0_6px_#0051ff]');

    const clockwiseDial = previewPage?.querySelector<HTMLElement>('[data-preview-dial-control="cw"]');
    const clockwiseDialCircle = previewPage?.querySelector<HTMLElement>('[data-preview-dial-circle="cw"]');
    const clockwiseActionNumber = previewPage?.querySelector<HTMLElement>('[data-preview-dial-action-number="10"]');
    await act(async () => {
      clockwiseDial!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(clockwiseDialCircle?.className).toContain('ring-2');
    expect(clockwiseActionNumber?.className).toContain('ring-1');

    await act(async () => {
      clockwiseDial!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      clockwiseActionNumber!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(clockwiseDialCircle?.className).toContain('ring-2');
    expect(clockwiseDialCircle?.className).toContain('shadow-[0_0_12px_rgba(0,81,255,0.65)]');

    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Back to presets"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    chatgptIcon = container.querySelector<HTMLElement>('[data-preset-icon="chatgpt"]');
    chatgptCard = chatgptIcon?.parentElement?.parentElement?.parentElement;
    const installButton = [...(chatgptCard?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Install');
    expect(installButton).toBeDefined();
    await click(installButton!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    const saved = JSON.parse(window.localStorage.getItem('cm2.state.v2') || 'null');
    expect(saved.profiles[0].layers[1].r1c1.binding).toBe('New Chat (Cmd + Shift + O)');
    expect(saved.customItems.Action).toHaveLength(8);
    expect(saved.customItems['Smart-A']).toContainEqual(
      expect.objectContaining({ id: 'preset-chatgpt-r3c1', main: 'Instructions' })
    );
    expect(container.textContent).toContain('Installed ChatGPT preset on Layer 2');

    const firstKey = container.querySelector<HTMLButtonElement>('[data-drop-slot="r1c1"]');
    expect(firstKey?.title).toBe('New Chat (Cmd + Shift + O)');
    expect(firstKey?.style.backgroundColor).toBe('rgb(16, 163, 127)');
    expect(firstKey?.querySelector('svg path')).not.toBeNull();

    const catalogIconKey = container.querySelector<HTMLButtonElement>('[data-drop-slot="r1c2"]');
    expect(catalogIconKey?.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(catalogIconKey?.querySelector('svg path')?.getAttribute('d')).toBe('M2 2L22 22');

    const dial = container.querySelector<HTMLButtonElement>('button[title="Dial: ChatGPT Dial"]');
    expect(dial?.querySelector('circle')?.getAttribute('fill')).toBe('url(#dialUpperLeft)');
    expect(dial?.querySelector('circle')?.getAttribute('stroke')).toBe('#262626');

    await click(container.querySelector<HTMLButtonElement>('button[title="Add Layer"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    const afterAdd = JSON.parse(window.localStorage.getItem('cm2.state.v2') || 'null');
    expect(afterAdd.profiles[0].layers).toHaveLength(3);
    expect(afterAdd.profiles[0].layers[1].r1c1.binding).toBe('New Chat (Cmd + Shift + O)');
    expect(afterAdd.profiles[0].layers[2].r1c1).toMatchObject({ label: '', binding: 'blank' });

    const blankKeySlots = ['r1c1', 'r1c2', 'r1c3', 'r2c1', 'r2c2', 'r2c3', 'r3c1', 'r3c2', 'r3c3'];
    const visibleBlankKeys = blankKeySlots.map((slot) =>
      container.querySelector<HTMLButtonElement>(`[data-drop-slot="${slot}"]`)
    );
    expect(visibleBlankKeys).toHaveLength(9);
    expect(visibleBlankKeys.every((key) => key?.title === 'blank')).toBe(true);
    expect(visibleBlankKeys.every((key) => key?.style.backgroundColor === '')).toBe(true);

    await click(container.querySelector<HTMLButtonElement>('button[title="Open Key Mapping"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    const mappingDrawer = container.querySelector<HTMLElement>('aside');
    const actionTab = [...(mappingDrawer?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Action');
    expect(actionTab).toBeDefined();
    await click(actionTab!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    const chatgptGroup = mappingDrawer?.querySelector<HTMLElement>('[data-preset-action-group="chatgpt"]');
    expect(chatgptGroup?.textContent).toContain('ChatGPT');
    const chatgptTile = chatgptGroup?.querySelector<HTMLButtonElement>('[data-preset-action-item]');
    expect(chatgptTile).not.toBeNull();
    const chatgptActionIcon = chatgptTile?.querySelector<HTMLElement>('[data-preset-action-icon="chatgpt"]');
    expect(chatgptActionIcon?.style.color).toBe('rgb(16, 163, 127)');
  });

  it('allows each preset only once in a profile while keeping other profiles independent', async () => {
    const getChatgptInstallButton = () => {
      const icon = container.querySelector<HTMLElement>('[data-preset-icon="chatgpt"]');
      const card = icon?.parentElement?.parentElement?.parentElement;
      return [...(card?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        .find((button) => ['Install', 'Installed'].includes(button.textContent?.trim() ?? ''));
    };

    await openPresets();
    const firstInstall = getChatgptInstallButton();
    expect(firstInstall?.textContent?.trim()).toBe('Install');
    await click(firstInstall!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    let saved = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(saved.profiles[0].layers).toHaveLength(2);
    expect(saved.profiles[0].layers[1].presetId).toBe('chatgpt');

    await act(async () => root.unmount());
    container.remove();
    container = document.createElement('div');
    container.id = 'root';
    container.classList.add('is-ready');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));

    await openPresets();
    const chatgptIcon = container.querySelector<HTMLElement>('[data-preset-icon="chatgpt"]');
    const chatgptCard = chatgptIcon?.parentElement?.parentElement?.parentElement;
    const previewButton = [...(chatgptCard?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Preview');
    expect(previewButton).toBeDefined();
    await click(previewButton!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    const previewInstall = container.querySelector<HTMLButtonElement>(
      'button[aria-label="ChatGPT preset already installed on this profile"]'
    );
    expect(previewInstall?.disabled).toBe(true);
    expect(previewInstall?.textContent?.trim()).toBe('Installed');
    await click(previewInstall!);

    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Back to presets"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });
    const duplicateInstall = getChatgptInstallButton();
    expect(duplicateInstall?.textContent?.trim()).toBe('Installed');
    expect(duplicateInstall?.disabled).toBe(true);
    await click(duplicateInstall!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    });
    saved = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(saved.profiles[0].layers).toHaveLength(2);

    const keymapTab = [...container.querySelectorAll<HTMLButtonElement>('nav button')]
      .find((button) => button.textContent?.trim() === 'Keymap');
    await click(keymapTab!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    await click(container.querySelector<HTMLButtonElement>('button[aria-label="Toggle profile list"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    });
    const addProfileButton = [...container.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.trim() === 'Add Profile');
    expect(addProfileButton).toBeDefined();
    await click(addProfileButton!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    await openPresets();
    const secondProfileInstall = getChatgptInstallButton();
    expect(secondProfileInstall?.textContent?.trim()).toBe('Install');
    expect(secondProfileInstall?.disabled).toBe(false);
    await click(secondProfileInstall!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    saved = JSON.parse(window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY) || 'null');
    expect(saved.profiles).toHaveLength(2);
    expect(saved.profiles.map((profile: { layers: unknown[] }) => profile.layers)).toEqual([
      expect.arrayContaining([expect.objectContaining({ presetId: 'chatgpt' })]),
      expect.arrayContaining([expect.objectContaining({ presetId: 'chatgpt' })]),
    ]);
    expect(saved.profiles.every((profile: { layers: unknown[] }) => profile.layers.length === 2)).toBe(true);
  });

  it('recognizes preset layers saved before installation markers were added', async () => {
    await act(async () => root.unmount());
    container.remove();
    window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({
      v: 1,
      activeProfileIndex: 0,
      profiles: [{
        id: 'legacy-profile',
        name: 'Legacy Profile',
        color: '#0051ff',
        layers: [
          {},
          {
            'dial-tl': { label: 'ChatGPT', binding: 'ChatGPT Dial' },
            r1c1: {
              label: 'New Chat',
              binding: 'New Chat (Ctrl + Shift + O)',
              actionType: 'Shortcut',
              actionId: 'preset-chatgpt-r1c1',
            },
          },
        ],
      }],
    }));
    container = document.createElement('div');
    container.id = 'root';
    container.classList.add('is-ready');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));

    await openPresets();
    const icon = container.querySelector<HTMLElement>('[data-preset-icon="chatgpt"]');
    const card = icon?.parentElement?.parentElement?.parentElement;
    const installButton = [...(card?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Installed');

    expect(installButton?.disabled).toBe(true);
  });

  it('keeps personal actions above installed preset groups after another preset is added', async () => {
    await act(async () => root.unmount());
    container.remove();
    window.localStorage.setItem(PROFILE_FILE_STORAGE_KEY, JSON.stringify({
      v: 1,
      activeProfileIndex: 0,
      profiles: [{ id: 'default', name: 'Default Profile', color: '#0051ff', layers: [{}] }],
      customItems: {
        Action: [
          {
            id: 'preset-chatgpt-r1c1',
            main: 'New Chat',
            listLabel: 'New Chat (Ctrl + Shift + O)',
            macropadLabel: 'New',
          },
          {
            id: 'custom-personal',
            main: 'My personal action',
            listLabel: 'Personal shortcut (Ctrl + Alt + K)',
            macropadLabel: 'Mine',
          },
        ],
        'Multi-A': [],
        'Smart-A': [],
      },
    }));

    container = document.createElement('div');
    container.id = 'root';
    container.classList.add('is-ready');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root.render(createElement(App)));

    await openPresets();
    const vscodeIcon = container.querySelector<HTMLElement>('[data-preset-icon="vscode"]');
    const vscodeCard = vscodeIcon?.parentElement?.parentElement?.parentElement;
    const vscodeInstall = [...(vscodeCard?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Install');
    expect(vscodeInstall).toBeDefined();
    await click(vscodeInstall!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });

    await click(container.querySelector<HTMLButtonElement>('button[title="Open Key Mapping"]')!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    });
    const actionTab = [...container.querySelectorAll<HTMLButtonElement>('aside button')]
      .find((button) => button.textContent?.trim() === 'Action');
    expect(actionTab).toBeDefined();
    await click(actionTab!);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    });

    const mappingDrawer = container.querySelector<HTMLElement>('aside');
    const groups = [...(mappingDrawer?.querySelectorAll<HTMLElement>('[data-action-group]') ?? [])];
    expect(groups.map((group) => group.dataset.actionGroup)).toEqual(['custom', 'chatgpt', 'vscode']);
    expect(groups[0]?.querySelector<HTMLButtonElement>('button')?.title).toContain('My personal action');
    expect(groups[1]?.textContent).toContain('ChatGPT');
    expect(groups[2]?.textContent).toContain('VS Code');

    const listViewButton = mappingDrawer?.querySelector<HTMLButtonElement>('button[aria-label="List view"]');
    const gridViewButton = mappingDrawer?.querySelector<HTMLButtonElement>('button[aria-label="Grid view"]');
    expect(listViewButton?.getAttribute('aria-pressed')).toBe('false');
    expect(gridViewButton?.getAttribute('aria-pressed')).toBe('true');
    await click(listViewButton!);
    const customGroup = mappingDrawer?.querySelector<HTMLElement>('[data-action-group="custom"]');
    expect(customGroup?.querySelector('[data-action-view="list"]')).not.toBeNull();
    expect(customGroup?.querySelector('[data-action-list-item]')).not.toBeNull();
    expect(listViewButton?.getAttribute('aria-pressed')).toBe('true');
    await click(gridViewButton!);
    expect(customGroup?.querySelector('[data-action-view="grid"]')).not.toBeNull();
    expect(gridViewButton?.getAttribute('aria-pressed')).toBe('true');
  });
});
