/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UpdateNotificationPopup } from '../src/components/UpdateNotificationPopup';
import type { UpdateCheckResult } from '../src/appSettings';

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

const sampleUpdate: UpdateCheckResult = {
  ok: true,
  currentVersion: '1.1.15',
  latestVersion: 'v1.2.0',
  hasUpdate: true,
  releaseName: 'NODE Studio v1.2.0',
  releaseNotes: 'Added OLED dark mode and live key visualizer.',
  downloadUrl: 'https://github.com/david-8837/NODE/releases/download/v1.2.0/NODE-Setup-1.2.0.exe',
  assetName: 'NODE-Setup-1.2.0.exe',
};

describe('UpdateNotificationPopup', () => {
  it('renders bottom-right update notification and triggers Download & Install or Later', async () => {
    const onDownloadAndInstall = vi.fn();
    const onDismiss = vi.fn();

    await act(async () => {
      root.render(
        createElement(UpdateNotificationPopup, {
          update: sampleUpdate,
          status: 'idle',
          progress: null,
          errorMessage: null,
          onDownloadAndInstall,
          onOpenReleasePage: vi.fn(),
          onDismiss,
        })
      );
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('New version released');
    expect(dialog?.textContent).toContain('v1.2.0');
    expect(dialog?.textContent).toContain('Added OLED dark mode');

    const buttons = [...container.querySelectorAll('button')];
    const installBtn = buttons.find((b) => b.textContent?.includes('Download & Install'));
    const laterBtn = buttons.find((b) => b.textContent?.includes('Later'));
    expect(installBtn).toBeDefined();
    expect(laterBtn).toBeDefined();

    await act(async () => {
      installBtn!.click();
    });
    expect(onDownloadAndInstall).toHaveBeenCalledTimes(1);

    await act(async () => {
      laterBtn!.click();
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows download progress bar and hides dismiss controls while downloading', async () => {
    await act(async () => {
      root.render(
        createElement(UpdateNotificationPopup, {
          update: sampleUpdate,
          status: 'downloading',
          progress: { percent: 50, receivedBytes: 10 * 1024 * 1024, totalBytes: 20 * 1024 * 1024 },
          errorMessage: null,
          onDownloadAndInstall: vi.fn(),
          onOpenReleasePage: vi.fn(),
          onDismiss: vi.fn(),
        })
      );
    });

    expect(container.textContent).toContain('Downloading installer');
    expect(container.textContent).toContain('50%');
    expect(container.textContent).not.toContain('Later');
  });
});
