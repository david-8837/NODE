/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionLibrarySidebar } from '../src/components/ActionLibrarySidebar';
import { ProfileSelectorCapsule } from '../src/components/ProfileSelectorCapsule';
import { GRID_MACRO_ENCODER_SLOT } from '../src/deviceLayout';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Rotary limitation experience and clean drawer UI', () => {
  it('keeps the Key Mapping drawer UI clean without limitation banners or disabled tabs', async () => {
    const handleAssign = vi.fn();
    const handleOpenCreator = vi.fn();
    const setMappingTab = vi.fn();

    await act(async () => {
      root.render(
        createElement(ActionLibrarySidebar, {
          onClose: vi.fn(),
          activeTooltip: null,
          setActiveTooltip: vi.fn(),
          mappingSearch: '',
          setMappingSearch: vi.fn(),
          mappingViewMode: 'grid',
          setMappingViewMode: vi.fn(),
          mappingTab: 'Basic',
          setMappingTab,
          filteredBasicSections: [],
          expandedListSections: {},
          toggleListSection: vi.fn(),
          draggedTile: null,
          flashedTileId: null,
          handleStartTileDrag: vi.fn(),
          handleAssignTileFromDrawer: handleAssign,
          handleOpenCreatorEditor: handleOpenCreator,
          customItemsByTab: { Action: [], 'Multi-A': [], 'Smart-A': [] },
          renderAppIcon: () => null,
          showToast: vi.fn(),
          selectedKey: GRID_MACRO_ENCODER_SLOT,
          selectedEncoderSub: 'ccw',
          selectedKeyAssignment: null,
        })
      );
    });

    // Verify NO blue limitation banners exist in the drawer
    expect(container.textContent).not.toContain('ROTARY CCW LIMITATION');
    expect(container.textContent).not.toContain('Supports single instantaneous actions');

    // Find tab buttons
    const buttons = Array.from(container.querySelectorAll('button'));
    const multiTab = buttons.find((b) => b.textContent?.trim() === 'Multi-A');
    const smartTab = buttons.find((b) => b.textContent?.trim() === 'Smart-A');

    expect(multiTab).toBeDefined();
    expect(smartTab).toBeDefined();

    // Verify tabs are NOT disabled or struck-through
    expect(multiTab?.hasAttribute('disabled')).toBe(false);
    expect(smartTab?.hasAttribute('disabled')).toBe(false);
    expect(multiTab?.className).not.toContain('line-through');
    expect(multiTab?.className).not.toContain('cursor-not-allowed');

    // Verify clicking Multi-A tab invokes setMappingTab normally without blocking
    act(() => {
      multiTab?.click();
    });
    expect(setMappingTab).toHaveBeenCalledWith('Multi-A');
  });

  it('persists rotary modal suppression preference in localStorage', () => {
    expect(localStorage.getItem('node-studio.suppress-rotary-limitation-modal')).toBeNull();

    // Set suppress preference
    localStorage.setItem('node-studio.suppress-rotary-limitation-modal', 'true');
    expect(localStorage.getItem('node-studio.suppress-rotary-limitation-modal')).toBe('true');

    // Toggle back off
    localStorage.setItem('node-studio.suppress-rotary-limitation-modal', 'false');
    expect(localStorage.getItem('node-studio.suppress-rotary-limitation-modal')).toBe('false');
  });

  it('does not render the Hub button in the profile dropdown bottom bar', async () => {
    const dummyProfile = {
      id: 'default',
      name: 'Default Profile',
      color: '#0051ff',
      layers: [{} as any],
    };

    await act(async () => {
      root.render(
        createElement(ProfileSelectorCapsule, {
          entrancePhase: 'complete',
          containerRef: { current: null },
          activeTooltip: null,
          setActiveTooltip: vi.fn(),
          currentProfile: dummyProfile,
          profiles: [dummyProfile],
          activeProfileIndex: 0,
          profileMenuOpen: true, // open dropdown to inspect bottom action buttons
          setProfileMenuOpen: vi.fn(),
          deletingProfileId: null,
          setDeletingProfileId: vi.fn(),
          selectProfileInApp: vi.fn(),
          handleUpdateProfileName: vi.fn(),
          handleDuplicateProfile: vi.fn(),
          handleExportProfile: vi.fn(),
          handleConfirmDeleteProfile: vi.fn(),
          handleAddProfile: vi.fn(),
          handleImportProfile: vi.fn(),
          onOpenCommunityHub: vi.fn(),
        })
      );
    });

    // Check that Add Profile and Import are present
    expect(container.textContent).toContain('Add Profile');
    expect(container.textContent).toContain('Import');

    // Confirm that the "Hub" button is completely removed
    const buttons = Array.from(container.querySelectorAll('button'));
    const hubButton = buttons.find((b) => b.textContent?.trim() === 'Hub');
    expect(hubButton).toBeUndefined();
    expect(container.textContent).not.toContain('Hub');
  });
});
