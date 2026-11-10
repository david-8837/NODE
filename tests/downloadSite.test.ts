import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const siteHtml = readFileSync(join(process.cwd(), 'website/index.html'), 'utf8');
const downloadsScript = readFileSync(join(process.cwd(), 'website/downloads.js'), 'utf8');
const splashMountSource = readFileSync(join(process.cwd(), 'website/splashCursorMount.jsx'), 'utf8');
const splashCursorSource = readFileSync(join(process.cwd(), 'src/SplashCursor.jsx'), 'utf8');
const splashCursorStyles = readFileSync(join(process.cwd(), 'src/SplashCursor.css'), 'utf8');
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
    expect(siteHtml).toContain('NØDE Grid Macro 1 Studio');
    expect(siteHtml).toContain('[:: QNTM-IRS / 04 ::]');
    expect(siteHtml).toContain('id="download-installer"');
    expect(siteHtml).toContain('id="download-zip"');
    expect(siteHtml).toContain('id="features"');
    expect(siteHtml).toContain('id="how-it-works"');
    expect(siteHtml).toContain('./styles.css');
    expect(siteHtml).toContain('./downloads.js');
    expect(siteHtml).toContain('./splashCursorMount.jsx');
    expect(siteHtml).toContain('id="splash-cursor-root"');
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

  it('mounts the React Bits fluid cursor on the standalone download website', () => {
    expect(splashMountSource).toContain("import('../src/SplashCursor.jsx')");
    expect(splashMountSource).toContain('quality="medium"');
    expect(splashMountSource).toContain('clickSplash');
    expect(splashCursorSource).toContain("getContext('webgl2'");
    expect(splashCursorStyles).toContain('pointer-events: none');
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
    expect(pagesWorkflow).toContain('npm run build:website');
    expect(pagesWorkflow).toContain('path: dist-website');
    expect(windowsWorkflow).toContain("- 'v*'");
    expect(windowsWorkflow).toContain('gh release create');
    expect(windowsWorkflow).toContain('gh release upload');
    expect(windowsWorkflow).toContain('GH_TOKEN: ${{ github.token }}');
  });

  it('points both download buttons at matching assets in the latest GitHub release', async () => {
    const release = {
      tag_name: 'v1.0.0',
      name: 'NØDE Grid Macro 1 Studio v1.0.0',
      published_at: '2026-11-09T00:00:00Z',
      assets: [
        {
          name: 'NØDE Grid Macro 1 Studio-1.0.0-x64.exe',
          browser_download_url: 'https://github.com/david-8837/NODE/releases/download/v1.0.0/studio.exe',
          size: 10 * 1024 * 1024,
        },
        {
          name: 'NØDE Grid Macro 1 Studio-1.0.0-x64.zip',
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
});
