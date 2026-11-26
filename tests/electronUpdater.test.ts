import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  compareVersions,
  checkForAppUpdates,
  downloadUpdateInstaller,
  isTrustedUpdateUrl,
  sanitizeInstallerFilename,
} = require('../electron/updater.cjs') as {
  compareVersions: (current: string, latest: string) => number;
  isTrustedUpdateUrl: (rawUrl: string) => boolean;
  sanitizeInstallerFilename: (fileName: string) => string;
  downloadUpdateInstaller: (options: {
    url: string;
    fileName?: string;
    destDir?: string;
    onProgress?: (p: { percent: number; receivedBytes: number; totalBytes: number }) => void;
    httpsModule?: unknown;
  }) => Promise<{ ok: boolean; filePath?: string; error?: string }>;
  checkForAppUpdates: (options?: {
    currentVersion?: string;
    fetchFn?: (url: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>;
  }) => Promise<{
    ok: boolean;
    currentVersion: string;
    latestVersion?: string;
    hasUpdate?: boolean;
    releaseName?: string;
    releaseNotes?: string;
    downloadUrl?: string;
    assetName?: string | null;
    error?: string;
  }>;
};

describe('electron/updater.cjs', () => {
  describe('compareVersions', () => {
    it('returns 1 when latest is newer than current', () => {
      expect(compareVersions('1.1.11', '1.1.12')).toBe(1);
      expect(compareVersions('1.1.11', 'v1.2.0')).toBe(1);
      expect(compareVersions('1.1.11', '2.0.0')).toBe(1);
    });

    it('returns 0 when versions are equal', () => {
      expect(compareVersions('1.1.11', '1.1.11')).toBe(0);
      expect(compareVersions('v1.1.11', '1.1.11')).toBe(0);
      expect(compareVersions('1.1.11', 'v1.1.11')).toBe(0);
    });

    it('returns -1 when latest is older than current', () => {
      expect(compareVersions('1.1.12', '1.1.11')).toBe(-1);
      expect(compareVersions('2.0.0', '1.9.9')).toBe(-1);
    });

    it('handles empty or partial version strings gracefully', () => {
      expect(compareVersions('', '1.0.0')).toBe(1);
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
    });
  });

  describe('checkForAppUpdates', () => {
    it('detects available update when a newer GitHub release with .exe asset exists', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        data: {
          tag_name: 'v1.2.0',
          name: 'NODE Studio v1.2.0',
          body: 'Added auto-updater and visualizer features.',
          published_at: '2026-11-17T12:00:00Z',
          html_url: 'https://github.com/david-8837/NODE/releases/tag/v1.2.0',
          assets: [
            {
              name: 'NODE-Setup-1.2.0.exe',
              browser_download_url: 'https://github.com/david-8837/NODE/releases/download/v1.2.0/NODE-Setup-1.2.0.exe',
            },
          ],
        },
      });

      const result = await checkForAppUpdates({
        currentVersion: '1.1.11',
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(true);
      expect(result.hasUpdate).toBe(true);
      expect(result.currentVersion).toBe('1.1.11');
      expect(result.latestVersion).toBe('v1.2.0');
      expect(result.releaseName).toBe('NODE Studio v1.2.0');
      expect(result.releaseNotes).toBe('Added auto-updater and visualizer features.');
      expect(result.downloadUrl).toBe(
        'https://github.com/david-8837/NODE/releases/download/v1.2.0/NODE-Setup-1.2.0.exe'
      );
      expect(result.assetName).toBe('NODE-Setup-1.2.0.exe');
    });

    it('reports hasUpdate: false when already on latest version', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        data: {
          tag_name: 'v1.1.11',
          name: 'NODE Studio v1.1.11',
          body: 'Current stable release.',
          assets: [],
          html_url: 'https://github.com/david-8837/NODE/releases/tag/v1.1.11',
        },
      });

      const result = await checkForAppUpdates({
        currentVersion: '1.1.11',
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(true);
      expect(result.hasUpdate).toBe(false);
      expect(result.downloadUrl).toBe('https://github.com/david-8837/NODE/releases/tag/v1.1.11');
      expect(result.assetName).toBeNull();
    });

    it('returns error result when fetch fails', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        error: 'GitHub API returned HTTP 404',
      });

      const result = await checkForAppUpdates({
        currentVersion: '1.1.11',
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(false);
      expect(result.error).toContain('404');
    });
  });

  describe('isTrustedUpdateUrl & sanitizeInstallerFilename', () => {
    it('accepts only https GitHub and githubusercontent URLs', () => {
      expect(isTrustedUpdateUrl('https://github.com/david-8837/NODE/releases/download/v1.2.0/NODE.exe')).toBe(true);
      expect(isTrustedUpdateUrl('https://objects.githubusercontent.com/github-production-release-asset-2e65be/NODE.exe')).toBe(true);
      expect(isTrustedUpdateUrl('http://github.com/david-8837/NODE/releases/download/v1.2.0/NODE.exe')).toBe(false);
      expect(isTrustedUpdateUrl('https://evil.example.com/NODE.exe')).toBe(false);
      expect(isTrustedUpdateUrl('not-a-url')).toBe(false);
    });

    it('sanitizes installer filenames and enforces .exe suffix', () => {
      expect(sanitizeInstallerFilename('NODE.studio-1.2.0-x64.exe')).toBe('NODE.studio-1.2.0-x64.exe');
      expect(sanitizeInstallerFilename('../../evil.exe')).toBe('evil.exe');
      expect(sanitizeInstallerFilename('bad-name.txt')).toBe('NODE-studio-update.exe');
    });
  });

  describe('downloadUpdateInstaller', () => {
    it('rejects untrusted URLs before making any network request', async () => {
      const result = await downloadUpdateInstaller({
        url: 'https://untrusted.example.com/installer.exe',
      });
      expect(result).toEqual({ ok: false, error: 'Untrusted update download URL' });
    });

    it('follows a GitHub CDN redirect, streams the installer, and reports progress', async () => {
      const { EventEmitter } = await import('node:events');
      const { Readable } = await import('node:stream');
      const fs = await import('node:fs');
      const os = await import('node:os');
      const path = await import('node:path');

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-updater-test-'));
      const progressEvents: Array<{ percent: number; receivedBytes: number; totalBytes: number }> = [];

      const mockHttps = {
        get: vi.fn((url: string, _opts: unknown, cb: (res: unknown) => void) => {
          const req = new EventEmitter();
          queueMicrotask(() => {
            if (url.startsWith('https://github.com/')) {
              const redirectRes = new Readable({ read() {} });
              (redirectRes as unknown as { statusCode: number; headers: Record<string, string> }).statusCode = 302;
              (redirectRes as unknown as { headers: Record<string, string> }).headers = {
                location: 'https://objects.githubusercontent.com/asset/NODE-Setup.exe',
              };
              redirectRes.push(null);
              cb(redirectRes);
            } else {
              const payload = Buffer.from('MZ-installer-bytes');
              const res = new Readable({
                read() {
                  this.push(payload);
                  this.push(null);
                },
              });
              (res as unknown as { statusCode: number; headers: Record<string, string> }).statusCode = 200;
              (res as unknown as { headers: Record<string, string> }).headers = {
                'content-length': String(payload.length),
              };
              cb(res);
            }
          });
          return req;
        }),
      };

      try {
        const result = await downloadUpdateInstaller({
          url: 'https://github.com/david-8837/NODE/releases/download/v1.2.0/NODE-Setup.exe',
          fileName: 'NODE-Setup.exe',
          destDir: tempDir,
          httpsModule: mockHttps,
          onProgress: (p) => progressEvents.push(p),
        });

        expect(result.ok).toBe(true);
        expect(result.filePath).toBe(path.join(tempDir, 'NODE-Setup.exe'));
        expect(fs.readFileSync(result.filePath!, 'utf8')).toBe('MZ-installer-bytes');
        expect(progressEvents.some((p) => p.percent === 100)).toBe(true);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
