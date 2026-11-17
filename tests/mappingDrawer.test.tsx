/** @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MappingDrawer } from '../src/components/MappingDrawer';

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

const defaultLibraryProps: Parameters<typeof MappingDrawer>[0]['libraryProps'] = {
  onClose: vi.fn(),
  activeTooltip: null,
  setActiveTooltip: vi.fn(),
  mappingSearch: '',
  setMappingSearch: vi.fn(),
  mappingViewMode: 'grid',
  setMappingViewMode: vi.fn(),
  mappingTab: 'Basic',
  setMappingTab: vi.fn(),
  filteredBasicSections: [],
  expandedListSections: {},
  toggleListSection: vi.fn(),
  draggedTile: null,
  flashedTileId: null,
  handleStartTileDrag: vi.fn(),
  handleAssignTileFromDrawer: vi.fn(),
  handleOpenCreatorEditor: vi.fn(),
  customItemsByTab: { Action: [], 'Multi-A': [], 'Smart-A': [] },
  renderAppIcon: () => null,
  showToast: vi.fn(),
};

const defaultCreatorProps: Parameters<typeof MappingDrawer>[0]['creatorProps'] = {
  onClose: vi.fn(),
  activeTooltip: null,
  setActiveTooltip: vi.fn(),
  handleToggleIconPicker: vi.fn(),
  selectedIconId: undefined,
  selectedEmoji: undefined,
  newCustomName: '',
  setNewCustomName: vi.fn(),
  handleSaveCustomItem: vi.fn(),
  handleDiscardCustomItem: vi.fn(),
  editingCustomItemId: null,
  customItemDeleteConfirm: false,
  setCustomItemDeleteConfirm: vi.fn(),
  handleDeleteCustomItem: vi.fn(),
  iconPickerProps: {
    open: false,
    onClose: vi.fn(),
    iconPickerTab: 'Icon',
    handleIconPickerTabChange: vi.fn(),
    iconPickerSearch: '',
    setIconPickerSearch: vi.fn(),
    iconSearchResults: { icons: [], total: 0, query: '' },
    selectedIconId: undefined,
    setSelectedIconId: vi.fn(),
    selectedEmoji: undefined,
    setSelectedEmoji: vi.fn(),
    selectableEmojiList: [],
    iconPickerShowAll: false,
    setIconPickerShowAll: vi.fn(),
    iconPickerPage: 1,
    setIconPickerPage: vi.fn(),
    iconCatalogLength: 100,
  },
  multiGestures: { onTap: '', doubleTap: '', onHold: '', tapHold: '' },
  setMultiGestures: vi.fn(),
  activeGestureDropdown: null,
  setActiveGestureDropdown: vi.fn(),
  gestureKeySearch: '',
  setGestureKeySearch: vi.fn(),
  expandedGestureSection: null,
  setExpandedGestureSection: vi.fn(),
  basicKeySections: [],
  tappingTermMs: '250',
  setTappingTermMs: vi.fn(),
  smartSubTab: 'Text',
  setSmartSubTab: vi.fn(),
  smartTextValue: '',
  setSmartTextValue: vi.fn(),
  smartCmdValue: '',
  setSmartCmdValue: vi.fn(),
  smartWebValue: '',
  setSmartWebValue: vi.fn(),
  smartAppValue: '',
  setSmartAppValue: vi.fn(),
  smartAppDropdownOpen: false,
  setSmartAppDropdownOpen: vi.fn(),
  selectedSmartApplication: null,
  setSelectedSmartApplication: vi.fn(),
  installedApplications: [],
  installedApplicationsLoading: false,
  installedApplicationsError: null,
  loadInstalledApplications: vi.fn(),
  actionAdvanceMode: false,
  setActionAdvanceMode: vi.fn(),
  actionRecordingStatus: 'idle',
  setActionRecordingStatus: vi.fn(),
  actionTokens: [],
  actionAdvanceSteps: [],
  setActionAdvanceSteps: vi.fn(),
  activeAdvanceStepDropdown: null,
  setActiveAdvanceStepDropdown: vi.fn(),
  editingDelayStepId: null,
  setEditingDelayStepId: vi.fn(),
  draggingAdvStep: null,
  advStepDragRef: { current: null },
  setDraggingAdvStep: vi.fn(),
  hoveredModeStepId: null,
  setHoveredModeStepId: vi.fn(),
  hoveredDelayStepId: null,
  setHoveredDelayStepId: vi.fn(),
  showToast: vi.fn(),
};

describe('MappingDrawer component', () => {
  it('renders the library sidebar when creatorModalTab is null', async () => {
    await act(async () => {
      root.render(
        createElement(MappingDrawer, {
          creatorModalTab: null,
          creatorProps: defaultCreatorProps,
          libraryProps: defaultLibraryProps,
        })
      );
    });

    const drawer = container.querySelector('aside');
    expect(drawer).not.toBeNull();
    expect(drawer?.className).toContain('w-[332px]');
  });

  it('renders the action creator drawer when creatorModalTab is set', async () => {
    await act(async () => {
      root.render(
        createElement(MappingDrawer, {
          creatorModalTab: 'Action',
          creatorProps: defaultCreatorProps,
          libraryProps: defaultLibraryProps,
        })
      );
    });

    const drawer = container.querySelector('aside');
    expect(drawer).not.toBeNull();
  });
});
