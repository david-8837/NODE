/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionLibrarySidebar } from '../src/components/ActionLibrarySidebar';
import { ProfileSelectorCapsule } from '../src/components/ProfileSelectorCapsule';
import { EncoderPopupCapsule } from '../src/components/EncoderPopupCapsule';
import { FlatDialControl } from '../src/components/FlatDialControl';
import { KeycapButton } from '../src/components/MacropadDevice';
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

  it('glows RED when dragging a disallowed item over rotary sub-buttons, and BLUE for valid targets', async () => {
    const dummyActions = {
      cw: { binding: 'Volume Up', label: 'vol' },
      press: { binding: 'Play/Pause', label: 'play' },
      ccw: { binding: 'Volume Down', label: 'vol' },
    };

    // 1. Render EncoderPopupCapsule with dragOver on CW and dragOverDisallowed = true
    await act(async () => {
      root.render(
        createElement(EncoderPopupCapsule, {
          slotId: GRID_MACRO_ENCODER_SLOT,
          side: 'right',
          actions: dummyActions,
          selectedSub: null,
          dragOverSub: 'cw',
          dragOverDisallowed: true,
          onSelectSub: vi.fn(),
          onStartSubDrag: vi.fn(),
        })
      );
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const cwButton = buttons[0];
    expect(cwButton).toBeDefined();

    // Verify RED glow styling on CW button
    expect(cwButton.className).toContain('bg-[#ef4444]');
    expect(cwButton.className).toContain('border-[#ef4444]');
    expect(cwButton.className).toContain('shadow-[0_0_18px_rgba(239,68,68,0.95)]');

    // Verify floating pill tooltip indicates limitation
    expect(container.textContent).toContain('Cannot assign here');

    // 2. Re-render with dragOver on Press (valid target, dragOverDisallowed = false)
    await act(async () => {
      root.render(
        createElement(EncoderPopupCapsule, {
          slotId: GRID_MACRO_ENCODER_SLOT,
          side: 'right',
          actions: dummyActions,
          selectedSub: null,
          dragOverSub: 'press',
          dragOverDisallowed: false,
          onSelectSub: vi.fn(),
          onStartSubDrag: vi.fn(),
        })
      );
    });

    const pressButton = container.querySelectorAll('button')[1];
    expect(pressButton).toBeDefined();

    // Verify BLUE glow styling on Press button
    expect(pressButton.className).toContain('border-[#0051ff]');
    expect(pressButton.className).toContain('shadow-[0_0_10px_rgba(0,81,255,0.5)]');
    expect(pressButton.className).not.toContain('bg-[#ef4444]');
  });

  it('glows RED on FlatDialControl and KeycapButton when dragOverDisallowed is active', async () => {
    // 1. Test FlatDialControl with disallowed drag
    await act(async () => {
      root.render(
        createElement(FlatDialControl, {
          selected: false,
          angle: 0,
          title: 'Dial',
          onClick: vi.fn(),
          dragOver: true,
          dragOverDisallowed: true,
        })
      );
    });

    const dialButton = container.querySelector('button');
    expect(dialButton?.className).toContain('border-[#ef4444]');
    expect(dialButton?.className).toContain('shadow-[0_0_20px_rgba(239,68,68,0.95)]');

    // 2. Test KeycapButton with disallowed drag
    await act(async () => {
      root.render(
        createElement(KeycapButton, {
          slotId: 'r1c1',
          label: 'A',
          binding: 'Key A',
          selected: false,
          dragOver: true,
          dragOverDisallowed: true,
          isDraggingSource: false,
          onClick: vi.fn(),
        })
      );
    });

    const keyButton = container.querySelector('button');
    expect(keyButton?.className).toContain('border-[#ef4444]');
    expect(keyButton?.className).toContain('shadow-[0_0_16px_rgba(239,68,68,0.95)]');
  });
});
