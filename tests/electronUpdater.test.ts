import { describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { compareVersions, checkForAppUpdates } = require('../electron/updater.cjs') as {
  compareVersions: (current: string, latest: string) => number;
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
});
