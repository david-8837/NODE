/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMUNITY_PROFILES } from '../src/communityProfiles';
import { CommunityProfileModal } from '../src/components/CommunityProfileModal';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Community Profiles Dataset', () => {
  it('contains at least 5 distinct community workflows with valid 3x3 layers and rotary dial actions', () => {
    expect(COMMUNITY_PROFILES.length).toBeGreaterThanOrEqual(5);

    for (const cp of COMMUNITY_PROFILES) {
      expect(cp.id).toBeTruthy();
      expect(cp.name).toBeTruthy();
      expect(cp.author).toBeTruthy();
      expect(cp.category).toBeTruthy();
      expect(cp.profile.layers.length).toBeGreaterThanOrEqual(1);

      // Verify each layer contains the dial slot and keys
      for (const layer of cp.profile.layers) {
        expect(layer['dial-tl']).toBeDefined();
        expect(layer.r1c1).toBeDefined();
        expect(layer.r3c3).toBeDefined();
      }
    }
  });
});

describe('CommunityProfileModal component', () => {
  it('renders all community profiles when open', async () => {
    await act(async () => {
      root.render(
        createElement(CommunityProfileModal, {
          open: true,
          onClose: vi.fn(),
          onInstallProfile: vi.fn(),
          onExportCurrentProfile: vi.fn(),
          currentProfileName: 'Default Profile',
        })
      );
    });

    expect(container.textContent).toContain('Community Profile Hub');
    expect(container.textContent).toContain('Full-Stack Developer Suite');
    expect(container.textContent).toContain('Twitch & OBS Broadcast Command');
  });

  it('filters profiles when searching', async () => {
    await act(async () => {
      root.render(
        createElement(CommunityProfileModal, {
          open: true,
          onClose: vi.fn(),
          onInstallProfile: vi.fn(),
          onExportCurrentProfile: vi.fn(),
          currentProfileName: 'Default Profile',
        })
      );
    });

    const searchInput = container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(searchInput).not.toBeNull();

    await act(async () => {
      searchInput!.value = 'Blender';
      searchInput!.dispatchEvent(new Event('input', { bubbles: true }));
      // React state change via change event
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(searchInput, 'Blender');
      searchInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  it('triggers onInstallProfile when install button is clicked', async () => {
    const onInstallProfile = vi.fn();
    await act(async () => {
      root.render(
        createElement(CommunityProfileModal, {
          open: true,
          onClose: vi.fn(),
          onInstallProfile,
          onExportCurrentProfile: vi.fn(),
          currentProfileName: 'Default Profile',
        })
      );
    });

    const installButtons = container.querySelectorAll<HTMLButtonElement>('button');
    const installBtn = Array.from(installButtons).find((b) => b.textContent?.includes('Install Profile'));
    expect(installBtn).toBeDefined();

    await act(async () => {
      installBtn?.click();
    });

    expect(onInstallProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'community-fullstack-dev' })
    );
  });

  it('triggers onExportCurrentProfile when Share Current is clicked', async () => {
    const onExportCurrentProfile = vi.fn();
    await act(async () => {
      root.render(
        createElement(CommunityProfileModal, {
          open: true,
          onClose: vi.fn(),
          onInstallProfile: vi.fn(),
          onExportCurrentProfile,
          currentProfileName: 'Default Profile',
        })
      );
    });

    const shareBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Share Current')
    );
    expect(shareBtn).toBeDefined();

    await act(async () => {
      shareBtn?.click();
    });

    expect(onExportCurrentProfile).toHaveBeenCalled();
  });
});
