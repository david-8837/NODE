import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const siteHtml = readFileSync(join(process.cwd(), 'website/index.html'), 'utf8');
const downloadsScript = readFileSync(join(process.cwd(), 'website/downloads.js'), 'utf8');
const productScreenshot = readFileSync(join(process.cwd(), 'website/assets/grid-macro-studio-current.png'));
const brandIcon = readFileSync(join(process.cwd(), 'website/assets/node-studio-icon.png'));
const pagesWorkflow = readFileSync(
  join(process.cwd(), '.github/workflows/download-site.yml'),
  'utf8'
);
const windowsWorkflow = readFileSync(
  join(process.cwd(), '.github/workflows/windows-installer.yml'),
  'utf8'
);

describe('Public download website', () => {
  it('has a responsive landing page with clear installer and portable-package entry points', () => {
    expect(siteHtml).toContain('NODE studio');
    expect(siteHtml).not.toMatch(/Grid Macro 1 Studio/i);
    expect(siteHtml).toContain('[:: QNTM-IRS / 04 ::]');
    expect(siteHtml).toContain('id="download-installer"');
    expect(siteHtml).toContain('id="download-zip"');
    expect(siteHtml).toContain('id="features"');
    expect(siteHtml).toContain('id="how-it-works"');
    expect(siteHtml).toContain('./styles.css');
    expect(siteHtml).toContain('./downloads.js');
    expect(siteHtml).not.toContain('splashCursorMount');
    expect(siteHtml).not.toContain('splash-cursor-root');
    expect(siteHtml).toContain('./assets/grid-macro-studio-current.png');
    expect(siteHtml).toContain('./assets/node-studio-icon.png');
    expect(brandIcon.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(siteHtml).not.toContain('ACTUAL APP VIEW');
    expect(siteHtml).toContain('width="1350"');
    expect(siteHtml).toContain('height="942"');
    expect(productScreenshot.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(productScreenshot.readUInt32BE(16)).toBe(1350);
    expect(productScreenshot.readUInt32BE(20)).toBe(942);
  });

  it('resolves current download assets from GitHub Releases and has a no-release fallback', () => {
    expect(downloadsScript).toContain('https://api.github.com/repos/${owner}/${repository}/releases/latest');
    expect(downloadsScript).toContain("endsWith('.exe')");
    expect(downloadsScript).toContain("endsWith('.zip')");
    expect(downloadsScript).toContain('response.status === 404');
    expect(downloadsScript).toContain('releasesUrl');
  });

  it('deploys the site on Pages and publishes Windows assets for version tags', () => {
    expect(pagesWorkflow).toContain('actions/deploy-pages@v4');
    expect(pagesWorkflow).toContain('path: website');
    expect(pagesWorkflow).not.toContain('build:website');
    expect(windowsWorkflow).toContain("- 'v*'");
    expect(windowsWorkflow).toContain('gh release create');
    expect(windowsWorkflow).toContain('gh release upload');
    expect(windowsWorkflow).toContain('GH_TOKEN: ${{ github.token }}');
  });

  it('points both download buttons at matching assets in the latest GitHub release', async () => {
    const release = {
      tag_name: 'v1.0.0',
      name: 'NODE studio v1.0.0',
      published_at: '2026-11-09T00:00:00Z',
      assets: [
        {
          name: 'NODE.studio-1.0.0-x64.exe',
          browser_download_url: 'https://github.com/david-8837/NODE/releases/download/v1.0.0/studio.exe',
          size: 10 * 1024 * 1024,
        },
        {
          name: 'NODE.studio-1.0.0-x64.zip',
          browser_download_url: 'https://github.com/david-8837/NODE/releases/download/v1.0.0/studio.zip',
          size: 8 * 1024 * 1024,
        },
      ],
    };
    const page = new JSDOM(siteHtml, { url: 'https://example.test/NODE/', runScripts: 'dangerously' });
    Object.defineProperty(page.window, 'fetch', {
      value: async () => ({ ok: true, status: 200, json: async () => release }),
    });
    page.window.eval(downloadsScript);
    await new Promise<void>((resolve) => page.window.setTimeout(resolve, 0));

    expect(page.window.document.querySelector<HTMLAnchorElement>('#download-installer')?.href)
      .toBe(release.assets[0].browser_download_url);
    expect(page.window.document.querySelector<HTMLAnchorElement>('#download-zip')?.href)
      .toBe(release.assets[1].browser_download_url);
    expect(page.window.document.querySelector('#release-version')?.textContent).toBe('V1.0.0');
    expect(page.window.document.querySelector('#release-status')?.getAttribute('data-state')).toBe('ready');
    page.window.close();
  });

  it('shows a clear pending state and safe release-page fallback before the first release', async () => {
    const page = new JSDOM(siteHtml, { url: 'https://example.test/NODE/', runScripts: 'dangerously' });
    Object.defineProperty(page.window, 'fetch', {
      value: async () => ({ ok: false, status: 404, json: async () => ({}) }),
    });
    page.window.eval(downloadsScript);
    await new Promise<void>((resolve) => page.window.setTimeout(resolve, 0));

    expect(page.window.document.querySelector<HTMLAnchorElement>('#download-installer')?.href)
      .toBe('https://github.com/david-8837/NODE/releases');
    expect(page.window.document.querySelector('#release-version')?.textContent).toBe('FIRST RELEASE SOON');
    expect(page.window.document.querySelector('#release-status')?.getAttribute('data-state')).toBe('pending');
    page.window.close();
  });

  it('provides a comprehensive visual tutorial page with software screenshots and architecture guide', () => {
    const tutorialHtml = readFileSync(join(process.cwd(), 'website/tutorial.html'), 'utf8');
    expect(tutorialHtml).toContain('NODE studio');
    expect(tutorialHtml).toContain('How the Hardware &amp; Software Work Together');
    expect(tutorialHtml).toContain('RP2040-Zero');
    expect(tutorialHtml).toContain('0xFEED:0x6001');
    expect(tutorialHtml).toContain('Raw HID');
    expect(tutorialHtml).toContain('tutorial-main-studio.png');
    expect(tutorialHtml).toContain('tutorial-keycap-personalization.png');
    expect(tutorialHtml).toContain('tutorial-preset-library.png');
    expect(tutorialHtml).toContain('tutorial-settings-rules.png');
    expect(tutorialHtml).not.toContain('tutorial-community-hub.png');

    // All core studio features thoroughly documented
    expect(tutorialHtml).toContain('1. Live Key Visualizer');
    expect(tutorialHtml).toContain('2. Keycap Legend Personalization');
    expect(tutorialHtml).toContain('3. Presets Library with Dynamic OS Switcher');
    expect(tutorialHtml).toContain('4. Settings, Startup &amp; Background System Tray');
    expect(tutorialHtml).toContain('5. Action Creator Drawer');
    expect(tutorialHtml).toContain('6. Acrylic Cheat Sheet HUD Overlay');
    expect(tutorialHtml).toContain('7. Hardware RGB Matrix Lighting Sync');
    expect(tutorialHtml).toContain('8. Desktop Auto-Updater');
    expect(tutorialHtml).toContain('9. Pre-Write EEPROM Backups &amp; Hardware Simulation');

    // Baseline vs Modern comparison table
    expect(tutorialHtml).toContain('Original Baseline');
    expect(tutorialHtml).toContain('Modern NODE Studio (All New Features)');

    // 7-step configuration walkthrough
    expect(tutorialHtml).toContain('7-Step Macropad Configuration Walkthrough');
    expect(tutorialHtml).toContain('Step 1: Connect via USB-C');
    expect(tutorialHtml).toContain('Step 7: Commit to Flash');

    // No emotes/emojis on website rule (strictly vector SVG or plain text)
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
    expect(tutorialHtml).not.toMatch(emojiRegex);
    expect(siteHtml).not.toMatch(emojiRegex);

    // Site header contains tutorial link
    expect(siteHtml).toContain('href="./tutorial.html"');
  });
});
