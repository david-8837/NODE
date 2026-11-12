'use strict';

async function runIconPickerBrowserSmoke() {
  const timeoutMs = 30_000;
  const waitFor = async (probe, description, timeout = timeoutMs) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const value = probe();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for ${description}`);
  };
  const click = (element, description) => {
    if (!element) throw new Error(`Could not find ${description}`);
    element.click();
  };
  const findButtonWithText = (selector, text) =>
    Array.from(document.querySelectorAll(selector)).find((button) => button.textContent?.trim() === text);
  const resourceNames = () => performance.getEntriesByType('resource').map((entry) => entry.name);
  const setInput = (selector, value) => {
    const input = document.querySelector(selector);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!input || !setter) throw new Error(`Could not find writable input ${selector}`);
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return input;
  };

  await waitFor(() => document.querySelector('#root')?.firstElementChild, 'the React app to mount');
  await waitFor(() => document.querySelector('button[title="Open Key Mapping"]'), 'the key-mapping control');
  await new Promise((resolve) => setTimeout(resolve, 500));

  const initialResources = resourceNames();
  const resourceTimingSupported = initialResources.length > 0;
  const initiallyLoadedLazyAssets = initialResources.filter((name) =>
    /(?:icons-data\.js|emojiCatalog-[^/]+\.js|IconPickerPopover-[^/]+\.js)/i.test(name)
  );
  if (initiallyLoadedLazyAssets.length > 0) {
    throw new Error(`Lazy icon assets loaded at startup: ${initiallyLoadedLazyAssets.join(', ')}`);
  }

  const moduleWasLoaded = (name) => performance.getEntriesByName(name, 'mark').length > 0;
  if (moduleWasLoaded('node:icon-picker-module-loaded') || moduleWasLoaded('node:emoji-catalog-module-loaded')) {
    throw new Error('Lazy icon-picker or emoji module was evaluated at startup');
  }

  const startupPathCount = Object.keys(window.__MACRO_ICONS__?.d || {}).length;
  if (
    startupPathCount < 100 ||
    startupPathCount >= 1000 ||
    window.__MACRO_ICON_LIBRARY_READY__ === true ||
    document.querySelector('input[placeholder="Search icon"], input[placeholder="Search emoji"]')
  ) {
    throw new Error(`Unexpected eager icon/emoji state at startup: ${startupPathCount} paths`);
  }

  click(document.querySelector('button[title="Open Key Mapping"]'), 'the key-mapping control');
  const actionSection = await waitFor(
    () => findButtonWithText('aside button', 'Action'),
    'the Action mapping section'
  );
  click(actionSection, 'the Action mapping section');
  const newActionButton = await waitFor(
    () => findButtonWithText('aside button', 'New Action'),
    'the New Action button'
  );
  click(newActionButton, 'the New Action button');

  const iconControl = await waitFor(
    () => document.querySelector('button[title="Select Icon or Emoji"]'),
    'the icon picker control'
  );
  const iconPickerOpenedAt = performance.now();
  click(iconControl, 'the icon picker control');
  await waitFor(() => document.querySelector('input[placeholder="Search icon"]'), 'the icon picker');
  await waitFor(
    () => moduleWasLoaded('node:icon-picker-module-loaded'),
    'the lazy icon-picker component chunk'
  );
  await waitFor(
    () => window.__MACRO_ICON_LIBRARY_READY__ === true && Object.keys(window.__MACRO_ICONS__?.d || {}).length >= 8475,
    'the deferred full icon path library'
  );
  const iconLibraryLoadedAt = performance.now();

  const browseAllButton = await waitFor(
    () => findButtonWithText('button', 'Browse all 8,507 icons'),
    'the full-catalog browse action'
  );
  click(browseAllButton, 'the full-catalog browse action');
  await waitFor(
    () => document.querySelectorAll('button[aria-label^="Select icon "]').length === 72,
    'the first 72 full-catalog results'
  );

  setInput('input[placeholder="Search icon"]', 'brand airbnb');
  const airbnbResult = await waitFor(
    () => document.querySelector('button[aria-label="Select icon brand airbnb"]'),
    'multiword icon search results'
  );
  click(airbnbResult, 'the Airbnb icon search result');
  const selectedIcon = await waitFor(
    () => document.querySelector('button[title="Select Icon or Emoji"] svg path'),
    'the selected vector icon'
  );
  if (!selectedIcon.getAttribute('d')) throw new Error('Selected vector icon has an empty path');
  await waitFor(() => !document.querySelector('input[placeholder="Search icon"]'), 'the icon popover to close');

  const selectedControl = document.querySelector('button[title="Select Icon or Emoji"]');
  click(selectedControl, 'the icon picker control for emoji browsing');
  await waitFor(() => document.querySelector('input[placeholder="Search icon"]'), 'the icon picker to reopen');
  click(
    await waitFor(() => findButtonWithText('button', 'Emoji'), 'the Emoji tab'),
    'the Emoji tab'
  );
  await waitFor(() => document.querySelector('input[placeholder="Search emoji"]'), 'the emoji tab');
  await waitFor(
    () => moduleWasLoaded('node:emoji-catalog-module-loaded'),
    'the lazy emoji catalog chunk'
  );
  setInput('input[placeholder="Search emoji"]', 'sushi');
  const sushiResult = await waitFor(() => document.querySelector('button[title="sushi"]'), 'emoji search results');
  const expectedEmoji = sushiResult.textContent?.trim() || '';
  if (!expectedEmoji) throw new Error('The sushi result did not contain an emoji');
  click(sushiResult, 'the sushi emoji result');
  await waitFor(
    () => document.querySelector('button[title="Select Icon or Emoji"]')?.textContent?.trim() === expectedEmoji,
    'the selected emoji'
  );
  await waitFor(
    () => !document.querySelector('input[placeholder="Search emoji"]'),
    'the emoji picker to finish closing'
  );

  const finalResources = resourceNames();
  return {
    startupPathCount,
    resourceTimingSupported,
    initialLazyAssetCount: initiallyLoadedLazyAssets.length,
    initialJavaScriptResourceCount: initialResources.filter((name) => /\.js(?:[?#]|$)/i.test(name)).length,
    fullIconCatalogAvailable: Object.keys(window.__MACRO_ICONS__?.d || {}).length >= 8475,
    browseCount: 8507,
    iconPickerLoadMs: Math.round(iconLibraryLoadedAt - iconPickerOpenedAt),
    deferredIconLibraryLoadedAfterClick: window.__MACRO_ICON_LIBRARY_READY__ === true,
    iconPickerChunkObserved: moduleWasLoaded('node:icon-picker-module-loaded'),
    emojiChunkObserved: moduleWasLoaded('node:emoji-catalog-module-loaded'),
    iconSearchSelected: true,
    emojiSearchSelected: true,
  };
}

async function runIconPickerMemorySoak() {
  const warmupIterations = 4;
  const iterations = 30;
  const measurementInterval = 5;
  const timeoutMs = 10_000;
  const waitFor = async (probe, description) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = probe();
      if (value) return value;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    throw new Error(`Memory soak timed out waiting for ${description}`);
  };
  const findButtonWithText = (selector, text) =>
    Array.from(document.querySelectorAll(selector)).find((button) => button.textContent?.trim() === text);
  const click = (element, description) => {
    if (!element) throw new Error(`Memory soak could not find ${description}`);
    element.click();
  };
  const setInput = (selector, value) => {
    const input = document.querySelector(selector);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!input || !setter) throw new Error(`Memory soak could not find writable input ${selector}`);
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const navButton = (label) =>
    Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent?.trim() === label);
  const clickNavigationTab = async (label) => {
    const button = navButton(label);
    click(button, `${label} navigation tab`);
    await waitFor(
      () => navButton(label)?.className.includes('font-semibold'),
      `the ${label} screen`
    );
    await new Promise((resolve) => setTimeout(resolve, 320));
  };
  const waitForIconResults = () =>
    waitFor(
      () => document.querySelectorAll('button[aria-label^="Select icon "]').length === 72,
      'the 72 rendered icon results'
    );

  if (typeof globalThis.gc !== 'function') {
    throw new Error('Renderer garbage collection is unavailable; launch the memory smoke with --expose-gc');
  }
  if (typeof performance.memory?.usedJSHeapSize !== 'number') {
    throw new Error('Chromium performance.memory is unavailable; enable precise memory info for the memory smoke');
  }

  const collectGarbage = async () => {
    for (let pass = 0; pass < 3; pass += 1) {
      globalThis.gc();
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  };
  const readUsedHeapBytes = () => {
    const bytes = performance.memory.usedJSHeapSize;
    if (!Number.isFinite(bytes) || bytes <= 0) {
      throw new Error(`Chromium returned an invalid usedJSHeapSize: ${bytes}`);
    }
    return bytes;
  };

  const runNavigationCycle = async () => {
    await clickNavigationTab('Settings');
    await clickNavigationTab('Preset');
    await clickNavigationTab('Keymap');
  };
  const runPickerCycle = async () => {
    let pickerInput = document.querySelector('input[placeholder="Search icon"], input[placeholder="Search emoji"]');
    if (!pickerInput) {
      click(document.querySelector('button[title="Select Icon or Emoji"]'), 'the icon picker control');
      pickerInput = await waitFor(
        () => document.querySelector('input[placeholder="Search icon"], input[placeholder="Search emoji"]'),
        'the icon picker to open'
      );
    }

    if (pickerInput.matches('input[placeholder="Search emoji"]')) {
      click(findButtonWithText('button', 'Icon'), 'the Icon tab');
      await waitFor(() => document.querySelector('input[placeholder="Search icon"]'), 'the Icon tab');
    }

    setInput('input[placeholder="Search icon"]', 'brand airbnb');
    await waitFor(
      () => document.querySelector('button[aria-label="Select icon brand airbnb"]'),
      'the Airbnb icon search result'
    );
    setInput('input[placeholder="Search icon"]', '');
    await waitForIconResults();

    click(findButtonWithText('button', 'Emoji'), 'the Emoji tab');
    await waitFor(() => document.querySelector('input[placeholder="Search emoji"]'), 'the Emoji tab');
    setInput('input[placeholder="Search emoji"]', 'sushi');
    await waitFor(() => document.querySelector('button[title="sushi"]'), 'the sushi emoji result');

    click(document.querySelector('button[title="Select Icon or Emoji"]'), 'the icon picker control to close');
    await waitFor(
      () => !document.querySelector('input[placeholder="Search icon"], input[placeholder="Search emoji"]'),
      'the icon picker to close'
    );
    await new Promise((resolve) => setTimeout(resolve, 220));
  };
  const runCycle = async () => {
    await runNavigationCycle();
    await runPickerCycle();
  };

  for (let index = 0; index < warmupIterations; index += 1) await runCycle();
  await collectGarbage();
  const baselineHeapBytes = readUsedHeapBytes();
  const checkpoints = [];

  for (let index = 0; index < iterations; index += 1) {
    await runCycle();
    if ((index + 1) % measurementInterval === 0 || index + 1 === iterations) {
      await collectGarbage();
      const usedHeapBytes = readUsedHeapBytes();
      checkpoints.push({
        completedIterations: index + 1,
        usedHeapBytes,
        retainedGrowthBytes: usedHeapBytes - baselineHeapBytes,
      });
    }
  }

  return {
    measurement: 'renderer performance.memory after forced V8 GC',
    gcAvailable: true,
    preciseMemoryInfoEnabled: true,
    warmupIterations,
    iterations,
    navigationCycles: warmupIterations + iterations,
    pickerCycles: warmupIterations + iterations,
    measurementInterval,
    baselineHeapBytes,
    checkpoints,
  };
}

function getIconPickerBrowserSmokeScript() {
  return `(${runIconPickerBrowserSmoke.toString()})()`;
}

function getIconPickerMemorySoakScript() {
  return `(${runIconPickerMemorySoak.toString()})()`;
}

module.exports = {
  getIconPickerBrowserSmokeScript,
  getIconPickerMemorySoakScript,
};
