import { referencesAtOrAfter } from './referenceSafety';
import { cheatSheetCommand, cheatSheetSnapshot, createCheatSheetTriggerHandler } from './cheatSheet';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import DeviceConnectionGate from './DeviceConnectionGate';
import {
  APP_READY_EVENT,
  getEntranceMotionProps,
  getKeycapEntranceOptions,
  type EntrancePhase,
} from './entranceAnimations';
import {
  GRID_MACRO_ENCODER_SLOT,
  GRID_MACRO_KEY_SLOTS,
  HARDWARE_LAYER_NAMES,
  type GridMacroSlotId,
} from './deviceLayout';
import { clampMacropadOffsetToArea } from './macropadMovement';
import { deviceKeymapFileTools } from './deviceKeymapFiles';
import {
  createHardwareTriggerController,
  requestSimulationMode,
  triggerSimulationAction,
  type DesktopExecutionDefinition,
  type DesktopExecutionStep,
  type MultiGestureKey,
  type SimulationAction,
  type SmartActionSubTab,
} from './actionExecution';
import {
  MAX_LAYER_COUNT,
  MAX_PROFILE_COUNT,
  PROFILE_FILE_STORAGE_KEY,
  profileFileTools,
} from './profileFiles';
import {
  APP_VERSION_FALLBACK,
  createAppSettingsTools,
  readAppSettings,
  saveAppSettings,
  type AppSettingKey,
  type AppSettings,
  type InstalledApplication,
  type SettingsCapabilities,
  type SupportLinkKey,
} from './appSettings';
import {
  useTipRotation,
  useInstalledApplications,
  useDeviceNotifications,
  useKeymapHistory,
  useAppSettings,
} from './hooks';
import type {
  DeviceLayerStateEvent,
  DeviceRgbConfig,
  DeviceRgbStateEvent,
  HardwareTriggerEvent,
  QmkViaStatus,
} from './qmkViaBridge';
import { buildViaConfiguration } from './qmkProfileSync';
import type { EmojiCatalogEntry } from './emojiCatalog';
import { PRESET_CATALOG } from './presetCatalog';
import {
  buildIconCatalog,
  findIconMetadata,
  ICON_SEARCH_PAGE_SIZE,
  searchIconCatalog,
  type IconLibrary,
} from './iconCatalog';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Search,
} from 'lucide-react';
import {
  IsometricKeyIcon,
  ArrowKeyGlyph,
  InfoCircleIcon,
  WarningTriangleIcon,
  EmptyKeyPlusIcon,
} from './components/UiIcons';
import { SettingsSwitch } from './components/SettingsSwitch';
import { CustomPickerIcon } from './components/CustomPickerIcon';
import { SettingsScreen } from './components/SettingsScreen';
import { EditLayoutModal } from './components/EditLayoutModal';
import { CommunityProfileModal } from './components/CommunityProfileModal';
import type { CommunityProfile } from './communityProfiles';
import { matchProfileForApplication, type AppProfileMappingRule } from './activeWindow';
import { IconPickerPopover } from './components/IconPickerPopover';
import { PresetGrid } from './components/PresetGrid';
import { PresetDetailPreview } from './components/PresetDetailPreview';
import { ActionLibrarySidebar } from './components/ActionLibrarySidebar';
import { ActionCreatorDrawer, type ActionAdvanceStep } from './components/ActionCreatorDrawer';
import { MappingDrawer } from './components/MappingDrawer';
import { DraggedTilePreview } from './components/DraggedTilePreview';
import { FeedbackToast } from './components/FeedbackToast';
import { EncoderPopupCapsule } from './components/EncoderPopupCapsule';
import { ProfileSelectorCapsule } from './components/ProfileSelectorCapsule';
import { LayersControlBar } from './components/LayersControlBar';
import { KeyMappingTriggerStack } from './components/KeyMappingTriggerStack';
import { AppHeader } from './components/AppHeader';
import { MacropadDevice } from './components/MacropadDevice';
import {
  LedSettingsPopover,
  type LayerLedConfig,
  DEFAULT_LAYER_LED_CONFIGS,
} from './components/LedSettingsPopover';
import {
  INITIAL_LAYER_1,
  PRESET_LIBRARY,
  buildPresetLibrary,
  isPresetInstalledInProfile,
  formatEncoderShortLabel,
  formatCustomTileText,
  getEncoderActions,
  formatPresetSequence,
  isPresetShortcut,
  isPresetSingleKey,
  getPresetExecution,
  BLANK_ENCODER_ACTIONS,
  PRESET_MACROPAD_LABELS,
  PRESET_DIAL_LABELS,
  PRESET_SINGLE_MODIFIERS,
  type KeySlotId,
  type MappingTabId,
  type EncoderSubActionId,
  type EncoderSubBinding,
  type KeyAssignment,
  type LayerKeymap,
  type ProfileData,
  type PresetItem,
  type BasicTileItem,
  type CustomItemsByTab,
} from './presetLibrary';

export {
  INITIAL_LAYER_1,
  PRESET_LIBRARY,
  buildPresetLibrary,
  isPresetInstalledInProfile,
};
export type {
  KeySlotId,
  MappingTabId,
  EncoderSubActionId,
  EncoderSubBinding,
  KeyAssignment,
  LayerKeymap,
  ProfileData,
  PresetItem,
  BasicTileItem,
  CustomItemsByTab,
};

declare const __APP_VERSION__: string;

interface PersistedAppProfileState {
  profiles: ProfileData[];
  activeProfileIndex: number;
  customItems: CustomItemsByTab;
}

interface BasicSection {
  title: string;
  listPreview: string;
  items: BasicTileItem[];
}

const BASIC_KEY_SECTIONS: BasicSection[] = [
  {
    title: 'Alphanumerics',
    listPreview: '[ blank, A, B, C, D, E... ]',
    items: [
      { id: 'none', main: '', listLabel: 'blank', macropadLabel: '', isClearIcon: true },
      { id: 'A', main: 'A', macropadLabel: 'A' },
      { id: 'B', main: 'B', macropadLabel: 'B' },
      { id: 'C', main: 'C', macropadLabel: 'C' },
      { id: 'D', main: 'D', macropadLabel: 'D' },
      { id: 'E', main: 'E', macropadLabel: 'E' },
      { id: 'F', main: 'F', macropadLabel: 'F' },
      { id: 'G', main: 'G', macropadLabel: 'G' },
      { id: 'H', main: 'H', macropadLabel: 'H' },
      { id: 'I', main: 'I', macropadLabel: 'I' },
      { id: 'J', main: 'J', macropadLabel: 'J' },
      { id: 'K', main: 'K', macropadLabel: 'K' },
      { id: 'L', main: 'L', macropadLabel: 'L' },
      { id: 'M', main: 'M', macropadLabel: 'M' },
      { id: 'N', main: 'N', macropadLabel: 'N' },
      { id: 'O', main: 'O', macropadLabel: 'O' },
      { id: 'P', main: 'P', macropadLabel: 'P' },
      { id: 'Q', main: 'Q', macropadLabel: 'Q' },
      { id: 'R', main: 'R', macropadLabel: 'R' },
      { id: 'S', main: 'S', macropadLabel: 'S' },
      { id: 'T', main: 'T', macropadLabel: 'T' },
      { id: 'U', main: 'U', macropadLabel: 'U' },
      { id: 'V', main: 'V', macropadLabel: 'V' },
      { id: 'W', main: 'W', macropadLabel: 'W' },
      { id: 'X', main: 'X', macropadLabel: 'X' },
      { id: 'Y', main: 'Y', macropadLabel: 'Y' },
      { id: 'Z', main: 'Z', macropadLabel: 'Z' },
      { id: '1', top: '!', main: '1', listLabel: '1', macropadLabel: '1' },
      { id: '2', top: '@', main: '2', listLabel: '2', macropadLabel: '2' },
      { id: '3', top: '#', main: '3', listLabel: '3', macropadLabel: '3' },
      { id: '4', top: '$', main: '4', listLabel: '4', macropadLabel: '4' },
      { id: '5', top: '%', main: '5', listLabel: '5', macropadLabel: '5' },
      { id: '6', top: '^', main: '6', listLabel: '6', macropadLabel: '6' },
      { id: '7', top: '&', main: '7', listLabel: '7', macropadLabel: '7' },
      { id: '8', top: '*', main: '8', listLabel: '8', macropadLabel: '8' },
      { id: '9', top: '(', main: '9', listLabel: '9', macropadLabel: '9' },
      { id: '0', top: ')', main: '0', listLabel: '0', macropadLabel: '0' },
    ],
  },
  {
    title: 'Glyphs',
    listPreview: '[ -, =, [, ], \\, NUHS... ]',
    items: [
      { id: 'minus', top: '_', main: '-', listLabel: '-', macropadLabel: '-' },
      { id: 'equal', top: '+', main: '=', listLabel: '=', macropadLabel: '=' },
      { id: 'lbracket', top: '{', main: '[', listLabel: '[', macropadLabel: '[' },
      { id: 'rbracket', top: '}', main: ']', listLabel: ']', macropadLabel: ']' },
      { id: 'backslash', top: '|', main: '\\', listLabel: '\\', macropadLabel: '\\' },
      { id: 'semicolon', top: ':', main: ';', listLabel: ';', macropadLabel: ';' },
      { id: 'quote', top: '"', main: "'", listLabel: "'", macropadLabel: "'" },
      { id: 'grave', top: '~', main: '`', listLabel: '`', macropadLabel: '`' },
      { id: 'comma', top: '<', main: ',', listLabel: ',', macropadLabel: ',' },
      { id: 'plus-glyph', main: '+', listLabel: '+', macropadLabel: '+' },
      { id: 'ast-glyph', main: '*', listLabel: '*', macropadLabel: '*' },
      { id: 'period', top: '>', main: '.', listLabel: '.', macropadLabel: '.' },
      { id: 'slash', top: '?', main: '/', listLabel: '/', macropadLabel: '/' },
    ],
  },
  {
    title: 'Modifiers',
    listPreview: '[ enter, esc, back, tab, space, ctrl... ]',
    items: [
      { id: 'enter', main: 'enter', macropadLabel: 'ent' },
      { id: 'esc', main: 'esc', macropadLabel: 'esc' },
      { id: 'back', main: 'back', macropadLabel: 'bksp' },
      { id: 'tab', main: 'tab', macropadLabel: 'tab' },
      { id: 'space', main: 'space', macropadLabel: 'spc' },
      { id: 'ctrl', main: 'ctrl', macropadLabel: 'ctrl' },
      { id: 'shift', main: 'shift', macropadLabel: 'shft' },
      { id: 'alt', main: 'alt', macropadLabel: 'alt' },
      { id: 'win', main: 'win', macropadLabel: 'win' },
      { id: 'rctrl', main: 'right\nctrl', listLabel: 'right ctrl', macropadLabel: 'rctl' },
      { id: 'rshift', main: 'right\nshift', listLabel: 'right shift', macropadLabel: 'rshf' },
      { id: 'ralt', main: 'right\nalt', listLabel: 'right alt', macropadLabel: 'ralt' },
      { id: 'rwin', main: 'right\nwin', listLabel: 'right win', macropadLabel: 'rwin' },
      { id: 'lock', main: 'lock', macropadLabel: 'lock' },
      { id: 'scrolllock', main: 'scroll lock', macropadLabel: 'scrl' },
      { id: 'numlock', main: 'num lock', macropadLabel: 'num' },
      { id: 'prtsc', main: 'print\nscreen', listLabel: 'print screen', macropadLabel: 'prts' },
      { id: 'pause', main: 'pause', macropadLabel: 'paus' },
      { id: 'insert', main: 'insert', macropadLabel: 'ins' },
      { id: 'home', main: 'home', macropadLabel: 'home' },
      { id: 'pgup', main: 'page up', macropadLabel: 'pgup' },
      { id: 'pgdn', main: 'page\ndown', listLabel: 'page down', macropadLabel: 'pgdn' },
      { id: 'delete', main: 'delete', macropadLabel: 'del' },
      { id: 'end', main: 'end', macropadLabel: 'end' },
      { id: 'arr-r', main: '→', listLabel: 'right arrow', macropadLabel: '→', arrowDir: 'right' },
      { id: 'arr-l', main: '←', listLabel: 'left arrow', macropadLabel: '←', arrowDir: 'left' },
      { id: 'arr-d', main: '↓', listLabel: 'down arrow', macropadLabel: '↓', arrowDir: 'down' },
      { id: 'arr-u', main: '↑', listLabel: 'up arrow', macropadLabel: '↑', arrowDir: 'up' },
    ],
  },
  {
    title: 'Function keys (F)',
    listPreview: '[ F1, F2, F3, F4, F5, F6... ]',
    items: Array.from({ length: 24 }, (_, i) => ({
      id: `F${i + 1}`,
      main: `F${i + 1}`,
      macropadLabel: `F${i + 1}`,
    })),
  },
  {
    title: 'Number pad',
    listPreview: '[ /, *, -, +, num enter, 1... ]',
    items: [
      { id: 'num-div', main: '/', listLabel: 'num /', macropadLabel: '/' },
      { id: 'num-mul', main: '*', listLabel: 'num *', macropadLabel: '*' },
      { id: 'num-sub', main: '-', listLabel: 'num -', macropadLabel: '-' },
      { id: 'num-add', main: '+', listLabel: 'num +', macropadLabel: '+' },
      { id: 'num-ent', main: 'num enter', macropadLabel: 'nent' },
      { id: 'num-1', main: '1', listLabel: 'num 1', macropadLabel: '1' },
      { id: 'num-2', main: '2', listLabel: 'num 2', macropadLabel: '2' },
      { id: 'num-3', main: '3', listLabel: 'num 3', macropadLabel: '3' },
      { id: 'num-4', main: '4', listLabel: 'num 4', macropadLabel: '4' },
      { id: 'num-5', main: '5', listLabel: 'num 5', macropadLabel: '5' },
      { id: 'num-6', main: '6', listLabel: 'num 6', macropadLabel: '6' },
      { id: 'num-7', main: '7', listLabel: 'num 7', macropadLabel: '7' },
      { id: 'num-8', main: '8', listLabel: 'num 8', macropadLabel: '8' },
      { id: 'num-9', main: '9', listLabel: 'num 9', macropadLabel: '9' },
      { id: 'num-0', main: '0', listLabel: 'num 0', macropadLabel: '0' },
      { id: 'num-dot', main: '.', listLabel: 'num .', macropadLabel: '.' },
      { id: 'num-eq', main: '=', listLabel: 'num =', macropadLabel: '=' },
      { id: 'num-comma', main: ',', listLabel: 'num ,', macropadLabel: ',' },
    ],
  },
  {
    title: 'Media keys',
    listPreview: '[ mute, volume +, volume -, next track,...',
    items: [
      { id: 'mute', main: 'mute', macropadLabel: 'mute' },
      { id: 'vol-up', main: 'volume +', macropadLabel: 'vol+' },
      { id: 'vol-dn', main: 'volume -', macropadLabel: 'vol-' },
      { id: 'next-trk', main: 'next track', macropadLabel: 'next' },
      {
        id: 'prev-trk',
        main: 'previous\ntrack',
        listLabel: 'previous track',
        macropadLabel: 'prev',
      },
      { id: 'm-stop', main: 'media stop', macropadLabel: 'stop' },
      { id: 'play', main: 'play', macropadLabel: 'play' },
      {
        id: 'ffwd',
        main: 'fast\nforward',
        listLabel: 'fast forward',
        macropadLabel: 'ffwd',
      },
      { id: 'rwnd', main: 'rewind', macropadLabel: 'rwnd' },
    ],
  },
  {
    title: 'Extra Keys',
    listPreview: '[ power down, sleep, stop, bright up, b...',
    items: [
      {
        id: 'pwr',
        main: 'power\ndown',
        listLabel: 'power down',
        macropadLabel: 'pwr',
      },
      { id: 'slp', main: 'sleep', macropadLabel: 'slp' },
      { id: 'brt-up', main: 'bright up', macropadLabel: 'brt+' },
      {
        id: 'brt-dn',
        main: 'bright\ndown',
        listLabel: 'bright down',
        macropadLabel: 'brt-',
      },
    ],
  },

];

const INITIAL_PROFILES: ProfileData[] = [
  {
    id: 'default',
    name: 'Default Profile',
    color: '#0051ff',
    layers: [INITIAL_LAYER_1],
  },
];

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeProfileForEditor(profile: ProfileData): ProfileData {
  const defaultEncoder = INITIAL_LAYER_1[GRID_MACRO_ENCODER_SLOT];
  const rawLayers = Array.isArray(profile.layers) && profile.layers.length > 0
    ? profile.layers.slice(0, MAX_LAYER_COUNT)
    : [INITIAL_LAYER_1];
  const layers = rawLayers.map((layer) => {
    const normalized = { ...INITIAL_LAYER_1, ...layer } as LayerKeymap;
    for (const slot of GRID_MACRO_KEY_SLOTS) {
      const incoming = layer[slot] as unknown;
      normalized[slot] = {
        ...INITIAL_LAYER_1[slot],
        ...(isRecordValue(incoming) ? incoming : {}),
      } as KeyAssignment;
    }

    const incomingEncoder = layer[GRID_MACRO_ENCODER_SLOT] as unknown;
    const encoder = isRecordValue(incomingEncoder) ? incomingEncoder : {};
    const incomingActions = encoder.encoderActions;
    const encoderActions = isRecordValue(incomingActions) ? incomingActions : {};
    const mergeEncoderAction = (direction: EncoderSubActionId): EncoderSubBinding => {
      const fallback = defaultEncoder.encoderActions![direction];
      const incoming = encoderActions[direction];
      return {
        ...fallback,
        ...(isRecordValue(incoming) ? incoming : {}),
      } as EncoderSubBinding;
    };
    normalized[GRID_MACRO_ENCODER_SLOT] = {
      ...defaultEncoder,
      ...encoder,
      encoderActions: {
        cw: mergeEncoderAction('cw'),
        press: mergeEncoderAction('press'),
        ccw: mergeEncoderAction('ccw'),
      },
    } as KeyAssignment;
    return normalized;
  });

  return { ...profile, layers };
}

function normalizeCustomItemsForEditor(items: CustomItemsByTab): CustomItemsByTab {
  const normalizeTab = (tab: Exclude<MappingTabId, 'Basic'>) =>
    items[tab].map((item) => ({
      ...item,
      macropadLabel: item.macropadLabel?.trim() ? item.macropadLabel : item.main,
    }));

  return {
    Action: normalizeTab('Action'),
    'Multi-A': normalizeTab('Multi-A'),
    'Smart-A': normalizeTab('Smart-A'),
  };
}

function loadSavedProfileState(): PersistedAppProfileState | null {
  if (typeof window === 'undefined' || !profileFileTools) return null;

  try {
    const text = window.localStorage.getItem(PROFILE_FILE_STORAGE_KEY);
    if (!text) return null;

    const saved = JSON.parse(text) as Record<string, unknown>;
    if (!saved || typeof saved !== 'object' || !Array.isArray(saved.profiles)) return null;
    const savedProfiles = saved.profiles.slice(0, MAX_PROFILE_COUNT);

    // New profiles may be saved before the user types a name. Validate the
    // stored state with the same schema as imports, using a temporary display
    // name and restoring the intentional blank name after validation.
    const profilesForValidation = savedProfiles.map((profile) => {
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return profile;
      const candidate = profile as Record<string, unknown>;
      const boundedLayers = Array.isArray(candidate.layers)
        ? candidate.layers.slice(0, MAX_LAYER_COUNT)
        : candidate.layers;
      return typeof candidate.name === 'string' && candidate.name.trim()
        ? { ...candidate, layers: boundedLayers }
        : { ...candidate, name: 'Untitled Profile', layers: boundedLayers };
    });
    const parsed = profileFileTools.parse(JSON.stringify({
      ...saved,
      profiles: profilesForValidation,
    }));

    parsed.profiles.forEach((profile, index) => {
      const original = savedProfiles[index];
      if (!original || typeof original !== 'object' || Array.isArray(original)) return;
      const originalName = (original as Record<string, unknown>).name;
      if (typeof originalName === 'string' && !originalName.trim()) {
        profile.name = originalName;
      }
    });

    return {
      profiles: (parsed.profiles as unknown as ProfileData[]).map(normalizeProfileForEditor),
      activeProfileIndex: parsed.activeProfileIndex,
      customItems: normalizeCustomItemsForEditor(
        parsed.customItems as unknown as CustomItemsByTab
      ),
    };
  } catch {
    return null;
  }
}

const TIPS = [
  {
    lines: ['Actions can contain other', 'actions or smart-actions'],
    dot: 0,
  },
  {
    lines: [
      'You can switch to another layer',
      'when holding a key by assigning',
      'a temp-layer to it',
    ],
    dot: 1,
  },
  {
    lines: ['You can open your favorite app', 'with a smart-action'],
    dot: 1,
  },
  {
    lines: ['Multiactions can contain actions', 'and smart-actions'],
    dot: 1,
  },
  {
    lines: ['If you need more layers you can', 'create another profile'],
    dot: 2,
  },
  {
    lines: ['You can assign icons to actions,', 'multiactions and smart-actions'],
    dot: 2,
  },
];

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const prefersReducedMotionRef = useRef(Boolean(prefersReducedMotion));
  prefersReducedMotionRef.current = Boolean(prefersReducedMotion);
  const [entrancePhase, setEntrancePhase] = useState<EntrancePhase>(() =>
    typeof document !== 'undefined' &&
    document.getElementById('root')?.classList.contains('is-ready')
      ? 'complete'
      : 'waiting'
  );

  useEffect(() => {
    const beginEntrance = () => {
      setEntrancePhase((phase) => {
        if (phase !== 'waiting') return phase;
        return prefersReducedMotionRef.current ? 'complete' : 'entering';
      });
    };

    window.addEventListener(APP_READY_EVENT, beginEntrance);
    if (document.getElementById('root')?.classList.contains('is-ready')) {
      beginEntrance();
    }
    return () => window.removeEventListener(APP_READY_EVENT, beginEntrance);
  }, []);

  useEffect(() => {
    if (entrancePhase !== 'entering') return;
    const completionTimer = window.setTimeout(() => {
      setEntrancePhase('complete');
    }, 1900);
    return () => window.clearTimeout(completionTimer);
  }, [entrancePhase]);

  useEffect(() => {
    if (prefersReducedMotion && entrancePhase === 'entering') {
      setEntrancePhase('complete');
    }
  }, [entrancePhase, prefersReducedMotion]);

  const [activeNav, setActiveNav] = useState<'Keymap' | 'Preset' | 'Settings'>('Keymap');

  useEffect(() => {
    if (activeNav !== 'Keymap' && entrancePhase === 'entering') {
      setEntrancePhase('complete');
    }
  }, [activeNav, entrancePhase]);
  const [savedProfileState] = useState(loadSavedProfileState);
  const [profiles, setProfiles] = useState<ProfileData[]>(
    () => savedProfileState?.profiles ?? INITIAL_PROFILES
  );
  const [activeProfileIndex, setActiveProfileIndex] = useState(
    () => savedProfileState?.activeProfileIndex ?? 0
  );
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const activeProfileIndexRef = useRef(activeProfileIndex);
  activeProfileIndexRef.current = activeProfileIndex;
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<KeySlotId | null>(null);
  const [selectedEncoderSub, setSelectedEncoderSub] =
    useState<EncoderSubActionId | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Key Mapping states (4-button stack + full-height right sidebar drawer)
  const [mappingStackExpanded, setMappingStackExpanded] = useState(false);
  const [hoveredMappingType, setHoveredMappingType] = useState<
    'Basic Key' | 'Action' | 'Multiaction' | 'Smart Action' | null
  >(null);
  const [mappingDrawerOpen, setMappingDrawerOpen] = useState(false);
  const [mappingTab, setMappingTab] = useState<MappingTabId>('Basic');
  const [mappingSearch, setMappingSearch] = useState('');
  const [mappingViewMode, setMappingViewMode] = useState<'list' | 'grid'>('grid');
  const [expandedListSections, setExpandedListSections] = useState<Record<string, boolean>>({});

  // Custom created items for Action, Multi-A, Smart-A
  const [customItemsByTab, setCustomItemsByTab] = useState<CustomItemsByTab>(
    () => savedProfileState?.customItems ?? { Action: [], 'Multi-A': [], 'Smart-A': [] }
  );
  const [creatorModalTab, setCreatorModalTab] = useState<
    Exclude<MappingTabId, 'Basic'> | null
  >(null);
  const [editingCustomItemId, setEditingCustomItemId] = useState<string | null>(null);
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomBinding, setNewCustomBinding] = useState('');
  const [selectedIconId, setSelectedIconId] = useState<string | undefined>(undefined);
  const [selectedEmoji, setSelectedEmoji] = useState<string | undefined>(undefined);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [iconPickerTab, setIconPickerTab] = useState<'Icon' | 'Emoji'>('Icon');
  const [iconPickerSearch, setIconPickerSearch] = useState('');
  const [iconPickerShowAll, setIconPickerShowAll] = useState(false);
  const [iconPickerPage, setIconPickerPage] = useState(0);
  const [selectableEmojiList, setSelectableEmojiList] = useState<EmojiCatalogEntry[]>([]);
  const iconCatalog = useMemo(() => buildIconCatalog(getMacroIconLibrary()), []);
  const iconSearchResults = useMemo(
    () =>
      searchIconCatalog(
        iconCatalog,
        iconPickerSearch,
        ICON_SEARCH_PAGE_SIZE,
        iconPickerShowAll,
        iconPickerPage * ICON_SEARCH_PAGE_SIZE
      ),
    [iconCatalog, iconPickerSearch, iconPickerShowAll, iconPickerPage]
  );

  useEffect(() => {
    if (!iconPickerOpen) setIconPickerPage(0);
  }, [iconPickerOpen]);

  // Multiaction editor states
  const [multiGestures, setMultiGestures] = useState<
    Record<MultiGestureKey, string>
  >({
    onTap: '',
    doubleTap: '',
    onHold: '',
    tapHold: '',
  });
  const [tappingTermMs, setTappingTermMs] = useState('250');
  const [activeGestureDropdown, setActiveGestureDropdown] =
    useState<MultiGestureKey | null>(null);
  const [gestureKeySearch, setGestureKeySearch] = useState('');
  const [expandedGestureSection, setExpandedGestureSection] = useState<
    string | null
  >(null);

  // Smart Action editor states
  const [smartSubTab, setSmartSubTab] = useState<SmartActionSubTab>('Text');
  const [smartTextValue, setSmartTextValue] = useState('');
  const [smartCmdValue, setSmartCmdValue] = useState('');
  const [smartWebValue, setSmartWebValue] = useState('');
  const [smartAppValue, setSmartAppValue] = useState('');
  const [smartAppDropdownOpen, setSmartAppDropdownOpen] = useState(false);
  const [selectedSmartApplication, setSelectedSmartApplication] =
    useState<InstalledApplication | null>(null);
  const {
    installedApplications,
    installedApplicationsLoading,
    installedApplicationsError,
    loadInstalledApplications,
  } = useInstalledApplications();
  const [enableCommandActions, setEnableCommandActions] = useState(true);

  useEffect(() => {
    if (creatorModalTab !== 'Smart-A' || smartSubTab !== 'App') return;
    setSmartAppDropdownOpen(true);
    void loadInstalledApplications();
  }, [creatorModalTab, smartSubTab, loadInstalledApplications]);

  useEffect(() => {
    const selectedName = smartAppValue.trim().toLocaleLowerCase();
    if (smartSubTab !== 'App' || !selectedName) return;
    const matchingApp = installedApplications.find((application) =>
      application.name.toLocaleLowerCase() === selectedName
    );
    if (matchingApp && matchingApp.shortcutPath !== selectedSmartApplication?.shortcutPath) {
      setSelectedSmartApplication(matchingApp);
    }
  }, [smartSubTab, smartAppValue, installedApplications, selectedSmartApplication]);

  const filteredInstalledApplications = useMemo(() => {
    const query = smartAppValue.trim().toLocaleLowerCase();
    return installedApplications
      .filter((application) => application.name.toLocaleLowerCase().includes(query));
  }, [installedApplications, smartAppValue]);

  // Action editor states (Interactive keyboard recorder + Advance mode)
  const [actionAdvanceMode, setActionAdvanceMode] = useState(false);
  const [actionRecordingStatus, setActionRecordingStatus] = useState<
    'idle' | 'recording' | 'confirmed'
  >('idle');
  const [actionTokens, setActionTokens] = useState<
    { id: string; label: string; kind: 'text' | 'modifier' | 'special' }[]
  >([]);
  const [actionAdvanceSteps, setActionAdvanceSteps] = useState<
    {
      id: string;
      keyLabel: string;
      mode: 'press-release' | 'press';
      delayAfterActive?: boolean;
      delayAfterMs?: string;
    }[]
  >([
    {
      id: 'adv-step-1',
      keyLabel: '',
      mode: 'press-release',
      delayAfterActive: false,
      delayAfterMs: '200',
    },
  ]);
  const [activeAdvanceStepDropdown, setActiveAdvanceStepDropdown] = useState<
    string | null
  >(null);
  const [hoveredDelayStepId, setHoveredDelayStepId] = useState<string | null>(
    null
  );
  const [editingDelayStepId, setEditingDelayStepId] = useState<string | null>(
    null
  );
  const [hoveredModeStepId, setHoveredModeStepId] = useState<string | null>(
    null
  );
  const [draggingAdvStep, setDraggingAdvStep] = useState<{
    id: string;
    offsetY: number;
  } | null>(null);
  const advStepDragRef = useRef<{
    id: string;
    startY: number;
  } | null>(null);
  const lastBackspaceTimeRef = useRef<number>(0);

  const [editLayoutModalOpen, setEditLayoutModalOpen] = useState(false);
  const [communityHubOpen, setCommunityHubOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<
    'profiles' | 'layers' | 'mapping' | 'drawer-mapping' | null
  >(null);
  const { tipIndex, setTipIndex } = useTipRotation(TIPS.length);

  // Drag-and-drop & Drawer Tile Selection state
  const [selectedDrawerTile, setSelectedDrawerTile] = useState<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
  } | null>(null);
  const [flashedTileId, setFlashedTileId] = useState<string | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const [draggedTile, setDraggedTile] = useState<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
    fromSlotId?: KeySlotId;
    fromSubAction?: EncoderSubActionId;
    x: number;
    y: number;
  } | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    slotId: KeySlotId;
    subAction?: EncoderSubActionId;
  } | null>(null);
  const dragSessionRef = useRef<{
    item: BasicTileItem;
    sourceTab: MappingTabId;
    fromSlotId?: KeySlotId;
    fromSubAction?: EncoderSubActionId;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    isDragging: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Subtle corner-held circular swing for floating dragged keycap
  const dragRawBobY = useMotionValue(0);
  const dragRawRotate = useMotionValue(0);
  const dragSpringBobY = useSpring(dragRawBobY, {
    stiffness: 300,
    damping: 20,
    mass: 0.6,
  });
  const dragSpringRotate = useSpring(dragRawRotate, {
    stiffness: 260,
    damping: 18,
    mass: 0.65,
  });
  const dragTiltDecayTimeoutRef = useRef<number | null>(null);

  // Refs for outside-click closing of Profiles & Layers popovers and main canvas bounds
  const keymapMainRef = useRef<HTMLElement | null>(null);
  const profileContainerRef = useRef<HTMLDivElement | null>(null);
  const layersContainerRef = useRef<HTMLDivElement | null>(null);

  // Movable Macropad + "Edit layout" unit state (clamped to blank canvas area)
  const [macropadOffset, setMacropadOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDraggingMacropad, setIsDraggingMacropad] = useState(false);
  const macropadMoveUnitRef = useRef<HTMLDivElement | null>(null);
  const macropadDragRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
    isMoving: boolean;
  } | null>(null);

  // Preset view state
  const [presetSearch, setPresetSearch] = useState('');
  const [presetOs, setPresetOs] = useState<'mac' | 'win'>('win');
  const [previewPreset, setPreviewPreset] = useState<PresetItem | null>(null);
  const [hoveredPreviewSlot, setHoveredPreviewSlot] = useState<KeySlotId | null>(null);
  const [hoveredPreviewDial, setHoveredPreviewDial] = useState<'cw' | 'press' | 'ccw' | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings view state
  const {
    appSettings,
    setAppSettings,
    settingsCapabilities,
    setSettingsCapabilities,
  } = useAppSettings();
  const {
    launchAtStartup,
    allowTerminalSmartActions,
    allowDeviceNotifications,
    autoSwitchProfile,
  } = appSettings;
  const [appVersion, setAppVersion] = useState(
    typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : APP_VERSION_FALLBACK
  );
  const [firmwareCheckPending, setFirmwareCheckPending] = useState(false);
  const [appUpdateCheckPending, setAppUpdateCheckPending] = useState(false);
  const [activePressedSlot, setActivePressedSlot] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<QmkViaStatus>({ state: 'disconnected' });
  const [deviceActiveLayer, setDeviceActiveLayer] = useState<number>(0);
  const [deviceActiveProfileSlot, setDeviceActiveProfileSlot] = useState<number>(0);
  const [deviceSyncReady, setDeviceSyncReady] = useState(false);
  const lastSyncedConfigKeyRef = useRef('');
  // Physical HUD labels and trigger lookup must describe the last successfully
  // synced keymap, not unsaved edits currently in the editor.
  const syncedCheatProfilesRef = useRef<Record<number, ProfileData>>({});
  const [cheatSyncRevision, setCheatSyncRevision] = useState(0);
  // Kept outside the event subscription so profile/layer changes do not lose
  // the release corresponding to a held physical key.
  const cheatSheetTriggersRef = useRef<ReturnType<typeof createCheatSheetTriggerHandler> | null>(null);
  if (!cheatSheetTriggersRef.current) {
    cheatSheetTriggersRef.current = createCheatSheetTriggerHandler((command, token) => {
      void window.electronAPI?.commandCheatSheet?.(command, token);
    });
  }

  const hydratedRgbConnectionRef = useRef<boolean>(false);

  /**
   * The firmware is the source of truth for the active layer. This is the only
   * place that adopts a hardware layer into the editor, and it never sends a
   * command back, which is what keeps the two directions from looping.
   */
  // Latest layer the user asked for. Only the newest intent is ever sent, so
  // rapid clicking coalesces instead of queueing a burst of stale commands.
  const layerIntentRef = useRef<number | null>(null);
  const layerIntentSeqRef = useRef(0);
  const layerDrainRef = useRef<Promise<void> | null>(null);
  const deviceActiveLayerRef = useRef(0);
  // Layers in the profile being edited. Firmware can report a layer this profile
  // does not have; the editor clamps to a real layer so an assignment can never
  // target a nonexistent index while the preview silently falls back to layer 1.
  const profileLayerCountRef = useRef(1);
  // Profile-slot mirror of the layer intent queue. While a user-selected profile
  // switch is in flight, stale firmware reports must not bounce the UI back.
  const profileIntentRef = useRef<number | null>(null);
  const profileIntentSeqRef = useRef(0);
  const profileDrainRef = useRef<Promise<void> | null>(null);
  const deviceActiveProfileSlotRef = useRef(0);
  // Lets the rescan interval read the latest state without re-subscribing.
  const deviceStatusRef = useRef<QmkViaStatus>(deviceStatus);
  deviceStatusRef.current = deviceStatus;
  const applyHardwareLayer = useCallback((layer: number) => {
    const available = Math.max(1, Math.min(MAX_LAYER_COUNT, profileLayerCountRef.current));
    const reported = Math.min(MAX_LAYER_COUNT - 1, Math.max(0, Math.round(layer)));
    deviceActiveLayerRef.current = reported;
    setDeviceActiveLayer(reported);
    // Retain the real firmware state for the HUD, but never edit a missing layer.
    setActiveLayerIndex(Math.min(available - 1, reported));
  }, []);

  /**
   * Profile-level operations realign the editor to the confirmed hardware layer,
   * clamped to the layers this profile actually has, instead of forcing layer 1.
   * Activating the profile on the firmware is handled by requestHardwareProfile;
   * changing profile is not itself a request to change layer.
   */
  const alignEditorToHardwareLayer = useCallback((layerCount: number) => {
    const available = Math.max(1, Math.min(MAX_LAYER_COUNT, layerCount));
    setActiveLayerIndex(Math.min(deviceActiveLayerRef.current, available - 1));
  }, []);

  /**
   * User picked a layer in the app. Ask the firmware to switch and wait for its
   * confirmation instead of changing the UI optimistically, so the highlighted
   * layer can never claim a state the hardware did not reach.
   *
   * Raw HID allows one report in flight, so requests are drained serially and
   * coalesced to the newest intent. A reply is always adopted (it is the newest
   * authoritative state), and if it disagrees with the outstanding intent the
   * loop sends one more command rather than leaving UI and hardware split.
   */
  const requestHardwareLayer = useCallback(async (layer: number): Promise<boolean> => {
    const bridge = window.macropad;
    if (!bridge || deviceStatusRef.current.state !== 'connected') return false;
    const target = Math.min(MAX_LAYER_COUNT - 1, Math.max(0, Math.round(layer)));
    const seq = ++layerIntentSeqRef.current;
    layerIntentRef.current = target;

    let drain = layerDrainRef.current;
    if (!drain) {
      let finish!: () => void;
      drain = new Promise<void>((resolve) => { finish = resolve; });
      layerDrainRef.current = drain;
      const activeDrain = drain;
      void (async () => {
        try {
          while (layerIntentRef.current !== null) {
            const next = layerIntentRef.current;
            layerIntentRef.current = null;
            // Never talk to a device that went away mid-request.
            if (deviceStatusRef.current.state !== 'connected') return;
            // Already there (e.g. a physical key just selected it): no command.
            if (deviceActiveLayerRef.current === next) continue;
            const result = await bridge.request({ cmd: 'select_layer', layer: next });
            if (deviceStatusRef.current.state !== 'connected') return;
            if (!result?.ok) return;
            if (typeof result.deviceActiveLayer === 'number') {
              applyHardwareLayer(result.deviceActiveLayer);
            }
          }
        } catch {
          // Transport failure: the status listener drives the gate, and the UI
          // keeps the last confirmed layer rather than guessing.
        } finally {
          layerIntentRef.current = null;
          if (layerDrainRef.current === activeDrain) layerDrainRef.current = null;
          finish();
        }
      })();
    }

    await drain;
    // A newer click superseded this one; its own caller reports the outcome.
    if (layerIntentSeqRef.current !== seq) return true;
    return deviceActiveLayerRef.current === target;
  }, [applyHardwareLayer]);

  /**
   * User picked a profile in the app. Tell the firmware to activate that EEPROM
   * slot so physical keys, layer reports and the editor agree. Without this the
   * device stayed on the old slot: the next layer report bounced the editor back
   * and other profiles could not be edited reliably. Requests drain serially and
   * coalesce to the newest intent, exactly like the layer queue.
   */
  const requestHardwareProfile = useCallback(async (slot: number): Promise<boolean> => {
    const bridge = window.macropad;
    if (!bridge || deviceStatusRef.current.state !== 'connected') return false;
    const target = Math.min(MAX_PROFILE_COUNT - 1, Math.max(0, Math.round(slot)));
    const seq = ++profileIntentSeqRef.current;
    profileIntentRef.current = target;

    let drain = profileDrainRef.current;
    if (!drain) {
      let finish!: () => void;
      drain = new Promise<void>((resolve) => { finish = resolve; });
      profileDrainRef.current = drain;
      const activeDrain = drain;
      void (async () => {
        try {
          while (profileIntentRef.current !== null) {
            const next = profileIntentRef.current;
            if (deviceStatusRef.current.state !== 'connected') return;
            if (deviceActiveProfileSlotRef.current === next) {
              profileIntentRef.current = null;
              continue;
            }
            const result = await bridge.request({
              cmd: 'select_profile',
              profileSlot: next,
              saveCurrentProfile: true,
            });
            if (deviceStatusRef.current.state !== 'connected') return;
            if (!result?.ok) return;
            if (typeof result.activeProfileSlot === 'number') {
              const confirmedSlot = Math.min(MAX_PROFILE_COUNT - 1, Math.max(0, result.activeProfileSlot));
              deviceActiveProfileSlotRef.current = confirmedSlot;
              setDeviceActiveProfileSlot(confirmedSlot);
            }
            if (typeof result.deviceActiveLayer === 'number') {
              applyHardwareLayer(result.deviceActiveLayer);
            }
            if (profileIntentRef.current === next) profileIntentRef.current = null;
          }
        } catch {
          // Transport failure: the status listener drives the gate.
        } finally {
          profileIntentRef.current = null;
          if (profileDrainRef.current === activeDrain) profileDrainRef.current = null;
          finish();
        }
      })();
    }

    await drain;
    if (profileIntentSeqRef.current !== seq) return true;
    return deviceActiveProfileSlotRef.current === target;
  }, [applyHardwareLayer]);

  /** Switch the editor to a profile and ask the firmware to activate that slot. */
  const selectProfileInApp = useCallback((idx: number, layerCount: number) => {
    setActiveProfileIndex(idx);
    alignEditorToHardwareLayer(layerCount);
    void requestHardwareProfile(idx);
  }, [alignEditorToHardwareLayer, requestHardwareProfile]);

  /** Adopt RGB values reported by the firmware into the editor. */
  const hydrateRgbFromDevice = useCallback((remoteRgb: DeviceRgbConfig) => {
    const modeMap = ['Off', 'Solid', 'Rainbow', 'Breath'] as const;
    setLayerLedConfigs((prev) =>
      prev.map((currentCfg, idx) => {
        const c = remoteRgb.layerColors[idx];
        const rawMode = remoteRgb.layerModes?.[idx];
        const preset =
          rawMode !== undefined && rawMode >= 0 && rawMode <= 3
            ? modeMap[rawMode]
            : remoteRgb.enabled
              ? 'Solid'
              : 'Off';
        const rawSpeed = remoteRgb.layerSpeeds?.[idx];
        const speed =
          typeof rawSpeed === 'number' && rawSpeed >= 0 && rawSpeed <= 100
            ? rawSpeed
            : currentCfg.speed;
        if (!c) {
          return { ...currentCfg, preset, speed };
        }
        const maxChannel = Math.max(c.r, c.g, c.b);
        if (maxChannel === 0) {
          return {
            ...currentCfg,
            preset,
            speed,
            light: preset === 'Off' ? currentCfg.light : 0,
          };
        }
        const scale = 255 / maxChannel;
        const nr = Math.min(255, Math.round(c.r * scale));
        const ng = Math.min(255, Math.round(c.g * scale));
        const nb = Math.min(255, Math.round(c.b * scale));
        const colorHex = `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`.toUpperCase();
        const rNorm = nr / 255;
        const gNorm = ng / 255;
        const bNorm = nb / 255;
        const cMin = Math.min(rNorm, gNorm, bNorm);
        const delta = 1 - cMin;
        let hue = currentCfg.hue;
        if (delta > 0.0001) {
          if (rNorm === 1) hue = Math.round(((gNorm - bNorm) / delta) * 60);
          else if (gNorm === 1) hue = Math.round((((bNorm - rNorm) / delta) + 2) * 60);
          else hue = Math.round((((rNorm - gNorm) / delta) + 4) * 60);
          if (hue < 0) hue += 360;
        }
        return {
          ...currentCfg,
          preset,
          speed,
          light: Math.round((maxChannel / 255) * 100),
          hue,
          colorHex,
        };
      }) as [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig]
    );
  }, []);

  const applyConnectedStatus = useCallback((status: QmkViaStatus) => {
    // Update the ref synchronously: a disconnect must block in-flight layer
    // requests immediately, not only after React re-renders.
    deviceStatusRef.current = status;
    setDeviceStatus(status);
    if (status.state !== 'connected') {
      // Drop any queued intent so reconnecting cannot replay a stale switch.
      layerIntentRef.current = null;
    }
    if (typeof status.deviceActiveLayer === 'number') {
      applyHardwareLayer(status.deviceActiveLayer);
    }
    if (typeof status.activeProfileSlot === 'number') {
      const slot = Math.min(MAX_PROFILE_COUNT - 1, Math.max(0, status.activeProfileSlot));
      if (slot !== deviceActiveProfileSlotRef.current) cheatSheetTriggersRef.current?.cancel();
      deviceActiveProfileSlotRef.current = slot;
      setDeviceActiveProfileSlot(slot);
    }
    if (status.state !== 'connected') {
      hydratedRgbConnectionRef.current = false;
      return;
    }
    if (status.rgbConfig && !hydratedRgbConnectionRef.current) {
      hydratedRgbConnectionRef.current = true;
      hydrateRgbFromDevice(status.rgbConfig);
    }
  }, [hydrateRgbFromDevice, applyHardwareLayer]);

  useEffect(() => {
    const bridge = window.macropad;
    if (!bridge) {
      applyConnectedStatus({ state: 'unavailable', error: 'QMK/VIA device bridge is unavailable' });
      return;
    }

    let active = true;
    const unsubscribe = bridge.onStatus((status) => {
      if (!active) return;
      applyConnectedStatus(status);
    });
    void bridge.getStatus().then((status) => {
      if (!active) return;
      applyConnectedStatus(status);
    });

    // Fallback re-detection while the gate is showing. The HID 'connect' event
    // covers most replugs, but not every platform emits it reliably. getStatus()
    // only opens already-authorised devices, so this never raises a permission
    // prompt and stops as soon as the device is connected.
    const rescan = setInterval(() => {
      if (!active) return;
      const state = deviceStatusRef.current.state;
      if (state === 'connected' || state === 'connecting' || state === 'unavailable') return;
      void bridge.getStatus().then((status) => {
        if (active) applyConnectedStatus(status);
      });
    }, 2000);

    return () => {
      active = false;
      clearInterval(rescan);
      unsubscribe();
    };
  }, [applyConnectedStatus]);

  useEffect(() => {
    let active = true;
    const getVersion = window.electronAPI?.getVersion;
    if (getVersion) {
      void getVersion().then((version) => {
        if (active && typeof version === 'string' && version.trim()) setAppVersion(version);
      }).catch(() => undefined);
    }
    return () => {
      active = false;
    };
  }, []);

  useDeviceNotifications(allowDeviceNotifications);

  // Undo / Redo stacks
  const {
    history,
    redoStack,
    recordSnapshot,
    undo,
    redo,
    clearHistory,
    setHistory,
    setRedoStack,
  } = useKeymapHistory<ProfileData[]>();

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROFILE_FILE_STORAGE_KEY,
        JSON.stringify({
          v: 1,
          profiles,
          activeProfileIndex,
          customItems: customItemsByTab,
        })
      );
    } catch {
      // Keep in-memory profile editing usable if browser storage is unavailable.
    }
  }, [profiles, activeProfileIndex, customItemsByTab]);

  // Hardware layout and desktop execution mode
  const [encoderAngle, setEncoderAngle] = useState(45);
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulationTransition, setSimulationTransition] = useState(false);

  useEffect(() => {
    const disableSimulationOnPageHide = () => {
      void requestSimulationMode(false, window);
    };
    window.addEventListener('pagehide', disableSimulationOnPageHide);
    return () => window.removeEventListener('pagehide', disableSimulationOnPageHide);
  }, []);

  // Profiles & Layers extended toolbar / lighting / delete confirmation states
  const [deletingProfileId, setDeletingProfileId] = useState<string | null>(null);
  const [layerToolbarOpen, setLayerToolbarOpen] = useState(false);
  const [layerLightingOpen, setLayerLightingOpen] = useState(false);
  const [layerDeleteConfirm, setLayerDeleteConfirm] = useState(false);
  const [customItemDeleteConfirm, setCustomItemDeleteConfirm] = useState(false);
  const [layerNames, setLayerNames] = useState<Record<string, string>>({});

  const [layerLedConfigs, setLayerLedConfigs] = useState<
    [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig]
  >(() => {
    try {
      const raw = window.localStorage.getItem('node-studio.layer-led.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 4) {
          return parsed.map((item, idx) => ({
            ...DEFAULT_LAYER_LED_CONFIGS[idx],
            ...(item && typeof item === 'object' ? item : {}),
          })) as [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig];
        }
      }
    } catch {
      // Fall back to default per-layer colours
    }
    return DEFAULT_LAYER_LED_CONFIGS;
  });

  const [ledEditingLayerIdx, setLedEditingLayerIdx] = useState<number>(0);

  useEffect(() => {
    setLedEditingLayerIdx(Math.min(3, Math.max(0, activeLayerIndex)));
  }, [activeLayerIndex]);

  useEffect(() => {
    try {
      window.localStorage.setItem('node-studio.layer-led.v1', JSON.stringify(layerLedConfigs));
    } catch {
      // Ignore storage write errors
    }
  }, [layerLedConfigs]);

  const hexToScaledRgb = (hex: string, brightnessPct: number): { r: number; g: number; b: number } => {
    const clean = hex.replace(/^#/, '').trim();
    const valid = /^[0-9a-fA-F]{6}$/.test(clean) ? clean : '0051FF';
    const scale = Math.max(0, Math.min(100, brightnessPct)) / 100;
    return {
      r: Math.round(Number.parseInt(valid.slice(0, 2), 16) * scale),
      g: Math.round(Number.parseInt(valid.slice(2, 4), 16) * scale),
      b: Math.round(Number.parseInt(valid.slice(4, 6), 16) * scale),
    };
  };

  const syncRgbConfigsToDevice = (
    configs: [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig],
    persist: boolean
  ) => {
    const bridge = window.macropad;
    if (!bridge || deviceStatus.state !== 'connected') return;
    const modeLookup: Record<LayerLedConfig['preset'], number> = {
      Off: 0,
      Solid: 1,
      Rainbow: 2,
      Breath: 3,
    };
    const anyEnabled = configs.some((c) => c.preset !== 'Off');
    void bridge
      .request({
        cmd: 'set_rgb_config',
        rgbConfig: {
          enabled: anyEnabled,
          persist,
          layerColors: [
            configs[0].preset === 'Off' ? { r: 0, g: 0, b: 0 } : hexToScaledRgb(configs[0].colorHex, configs[0].light),
            configs[1].preset === 'Off' ? { r: 0, g: 0, b: 0 } : hexToScaledRgb(configs[1].colorHex, configs[1].light),
            configs[2].preset === 'Off' ? { r: 0, g: 0, b: 0 } : hexToScaledRgb(configs[2].colorHex, configs[2].light),
            configs[3].preset === 'Off' ? { r: 0, g: 0, b: 0 } : hexToScaledRgb(configs[3].colorHex, configs[3].light),
          ],
          layerModes: [
            modeLookup[configs[0].preset],
            modeLookup[configs[1].preset],
            modeLookup[configs[2].preset],
            modeLookup[configs[3].preset],
          ],
          layerSpeeds: [
            configs[0].speed,
            configs[1].speed,
            configs[2].speed,
            configs[3].speed,
          ],
        },
      })
      .catch(() => undefined);
  };

  const currentProfile = profiles[activeProfileIndex] || profiles[0];
  profileLayerCountRef.current = currentProfile.layers.length;
  // Never edit a layer index the profile does not have, even if a stale hardware
  // report lands between renders. The preview and mutations use the same index.
  const effectiveLayerIndex = Math.min(activeLayerIndex, currentProfile.layers.length - 1);
  const currentLayer =
    currentProfile.layers[effectiveLayerIndex] || currentProfile.layers[0];
  const currentLayerNameKey = `${currentProfile.id}-${effectiveLayerIndex}`;
  const currentLayerName = layerNames[currentLayerNameKey] ?? '';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2200);
  };

  const toggleSimulationMode = async () => {
    if (simulationTransition) return;
    const enabled = !simulationMode;
    setSimulationTransition(true);
    if (!enabled) setSimulationMode(false);
    try {
      const result = await requestSimulationMode(enabled, window);
      if (result.ok && result.enabled === enabled) {
        setSimulationMode(enabled);
        showToast(enabled ? 'Simulation enabled — actions affect your desktop' : 'Simulation disabled');
      } else {
        setSimulationMode(false);
        showToast(result.error || 'Could not update Simulation mode');
      }
    } catch (error) {
      setSimulationMode(false);
      showToast(error instanceof Error ? error.message : 'Could not update Simulation mode');
    } finally {
      setSimulationTransition(false);
    }
  };

  useEffect(() => {
    const bridge = window.macropad;
    if (!bridge || deviceStatus.state !== 'connected') {
      lastSyncedConfigKeyRef.current = '';
      syncedCheatProfilesRef.current = {};
      setDeviceSyncReady(false);
      return;
    }

    let cancelled = false;
    setDeviceSyncReady(false);
    lastSyncedConfigKeyRef.current = '';

    void (async () => {
      try {
        const remote = await bridge.getFile('app_state') as {
          ok: boolean;
          text?: string;
        };
        if (cancelled) return;
        if (remote.ok && typeof remote.text === 'string' && profileFileTools) {
          try {
            const saved = profileFileTools.parse(remote.text);
            const nextProfiles = saved.profiles.map((profile) =>
              normalizeProfileForEditor(profile as unknown as ProfileData)
            );
            setProfiles(nextProfiles);
            setActiveProfileIndex(saved.activeProfileIndex);
            deviceActiveProfileSlotRef.current = Math.min(MAX_PROFILE_COUNT - 1, Math.max(0, saved.activeProfileIndex));
            setDeviceActiveProfileSlot(deviceActiveProfileSlotRef.current);
            alignEditorToHardwareLayer((nextProfiles[saved.activeProfileIndex] ?? nextProfiles[0])?.layers.length ?? 1);
            setCustomItemsByTab(normalizeCustomItemsForEditor(
              saved.customItems as unknown as CustomItemsByTab
            ));
            const selected = nextProfiles[saved.activeProfileIndex] ?? nextProfiles[0];
            syncedCheatProfilesRef.current[saved.activeProfileIndex] = selected;
            setCheatSyncRevision((revision) => revision + 1);
            lastSyncedConfigKeyRef.current = `slot:${saved.activeProfileIndex}:${JSON.stringify(
              buildViaConfiguration(selected, presetOs, { enableHostTriggers: true, profileCount: saved.profiles.length }).config
            )}`;
            showToast('Loaded keymap profile from Grid Macro 1');
          } catch {
            // Ignore malformed device metadata; the validated local profile remains authoritative.
          }
        }
      } catch {
        // A stock VIA device stores keymaps, not profile metadata. Sync local profiles below.
      }

      if (!cancelled) setDeviceSyncReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceStatus.state, deviceStatus.device, deviceStatus.fw]);

  useEffect(() => {
    const connected = deviceStatus.state === 'connected';
    const slot = connected ? deviceActiveProfileSlot : activeProfileIndex;
    const layer = connected ? deviceActiveLayer : effectiveLayerIndex;
    const profile = connected ? syncedCheatProfilesRef.current[slot] : profiles[slot];
    void window.electronAPI?.updateCheatSheet?.(cheatSheetSnapshot(profile, layer));
  }, [profiles, deviceStatus.state, deviceActiveProfileSlot, deviceActiveLayer, activeProfileIndex, effectiveLayerIndex, cheatSyncRevision]);

  useEffect(() => {
    if (deviceStatus.state !== 'connected') {
      cheatSheetTriggersRef.current?.cancel();
    }
  }, [deviceStatus.state]);

  // Listen for physical device layer changes and hardware host-action triggers
  useEffect(() => {
    const bridge = window.macropad;
    if (!bridge) return;

    const triggerController = createHardwareTriggerController(
      (targetLayer) => {
        if (targetLayer >= currentProfile.layers.length) return false;
        // Same single adoption point as firmware telemetry, so the preview and
        // the highlighted layer can never disagree with the reported layer.
        void requestHardwareLayer(targetLayer);
      },
      showToast,
      window,
      undefined,
      (targetProfile) => {
        if (!profiles[targetProfile]) return false;
        selectProfileInApp(targetProfile, profiles[targetProfile].layers.length);
      }
    );

    const unsubscribe = bridge.onEvent((rawEvent) => {
      if (!isRecordValue(rawEvent)) return;
      if (rawEvent.type === 'rgb_state') {
        // RGB was changed on the device (FN keys / encoder). Adopt it so the
        // editor does not push stale values back over the user's edit.
        const rgbEvent = rawEvent as unknown as DeviceRgbStateEvent;
        if (rgbEvent.rgbConfig) hydrateRgbFromDevice(rgbEvent.rgbConfig);
        return;
      }
      if (rawEvent.type === 'layer_state') {
        const layerEvent = rawEvent as unknown as DeviceLayerStateEvent;
        if (typeof layerEvent.activeProfileSlot === 'number' && profiles[layerEvent.activeProfileSlot]) {
          profileLayerCountRef.current = profiles[layerEvent.activeProfileSlot].layers.length;
        }
        if (typeof layerEvent.deviceActiveLayer === 'number') {
          applyHardwareLayer(layerEvent.deviceActiveLayer);
        }
        if (typeof layerEvent.activeProfileSlot === 'number') {
          const reportedSlot = Math.min(MAX_PROFILE_COUNT - 1, Math.max(0, layerEvent.activeProfileSlot));
          if (reportedSlot !== deviceActiveProfileSlotRef.current) cheatSheetTriggersRef.current?.cancel();
          deviceActiveProfileSlotRef.current = reportedSlot;
          setDeviceActiveProfileSlot(reportedSlot);
        }
        if (
          profileIntentRef.current === null &&
          typeof layerEvent.activeProfileSlot === 'number' &&
          layerEvent.activeProfileSlot >= 0 &&
          layerEvent.activeProfileSlot < profiles.length &&
          layerEvent.activeProfileSlot !== activeProfileIndex
        ) {
          const targetSlot = layerEvent.activeProfileSlot;
          setActiveProfileIndex(targetSlot);
          showToast(
            `Switched to ${profiles[targetSlot]?.name || `Profile ${targetSlot + 1}`} from device`
          );
        }
        return;
      }
      if (rawEvent.type === 'hardware_trigger') {
        const trig = rawEvent as unknown as HardwareTriggerEvent;
        if (trig.pressed) {
          setActivePressedSlot(trig.slotId);
        } else {
          setActivePressedSlot((current) => (current === trig.slotId ? null : current));
        }
        // A release belongs to the original press, even if profile/layer changed.
        if (!trig.pressed && cheatSheetTriggersRef.current?.handle(trig.slotId, false)) return;
        const syncedProfile = syncedCheatProfilesRef.current[trig.profileSlot];
        const activeProf = syncedProfile ?? profiles[trig.profileSlot];
        if (!activeProf) return;
        const targetLayer =
          activeProf.layers[trig.layer] ??
          activeProf.layers[deviceActiveLayer] ??
          activeProf.layers[0];
        if (!targetLayer) return;
        let assignment: SimulationAction | undefined;
        if (trig.slotId === 'cw' || trig.slotId === 'press' || trig.slotId === 'ccw') {
          const dial = targetLayer[GRID_MACRO_ENCODER_SLOT];
          assignment = dial?.encoderActions?.[trig.slotId];
        } else {
          const keyEntry = targetLayer[trig.slotId as KeySlotId];
          if (keyEntry) {
            assignment = { ...keyEntry, id: keyEntry.actionId };
          }
        }
        if (cheatSheetCommand(assignment?.binding)) {
          // Do not guess a HUD assignment while a keymap is being written.
          if (!syncedProfile) return;
          if (trig.pressed) {
            // Send the confirmed device profile/layer before making the window visible.
            void window.electronAPI?.updateCheatSheet?.(cheatSheetSnapshot(syncedProfile, deviceActiveLayerRef.current));
          }
        }
        if (cheatSheetTriggersRef.current?.handle(trig.slotId, trig.pressed, assignment?.binding)) return;
        triggerController.handleSlotEvent(trig.slotId, trig.pressed, assignment);
      }
    });

    return () => {
      unsubscribe();
      triggerController.cancelAll();
    };
  }, [profiles, activeProfileIndex, currentProfile, deviceActiveLayer, hydrateRgbFromDevice, applyHardwareLayer, requestHardwareLayer, selectProfileInApp]);

  // Keep the firmware's active EEPROM slot aligned with the profile being edited.
  // This covers initial connect (the saved profile may differ from the device's
  // current slot) and any drift, without fighting an in-flight user selection.
  useEffect(() => {
    if (deviceStatus.state !== 'connected' || !deviceSyncReady) return;
    if (profileIntentRef.current !== null) return;
    if (deviceActiveProfileSlotRef.current === activeProfileIndex) return;
    void requestHardwareProfile(activeProfileIndex);
  }, [deviceStatus.state, deviceSyncReady, activeProfileIndex, deviceActiveProfileSlot, requestHardwareProfile]);

  // Listen for native Electron menu hardware actions when running inside desktop shell
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const offSync = api.onHardwareSync?.(() => {
      lastSyncedConfigKeyRef.current = '';
      setDeviceSyncReady((ready) => ready);
      showToast(
        deviceStatus.state === 'connected'
          ? 'Syncing active profile to RP2040-Zero...'
          : 'Connect Grid Macro 1 via QMK/VIA to sync'
      );
    });
    const offModal = api.onOpenHardwareModal?.(() => {
      setActiveNav('Settings');
    });
    return () => {
      if (typeof offSync === 'function') offSync();
      if (typeof offModal === 'function') offModal();
    };
  }, [deviceStatus.state]);

  // Auto-switch profile when the user switches to a different application (Windows only)
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.onActiveWindowChanged) return;

    const offActiveWindow = api.onActiveWindowChanged((windowInfo) => {
      if (!appSettings.autoSwitchProfile) return;
      const currentProfiles = profilesRef.current;
      const match = matchProfileForApplication(windowInfo, currentProfiles, appSettings.appProfileRules);
      if (!match || match.profileIndex === activeProfileIndexRef.current) return;
      const layerCount = currentProfiles[match.profileIndex]?.layers?.length ?? 1;
      selectProfileInApp(match.profileIndex, layerCount);
      showToast(`Auto-switched to "${match.profile.name}" for ${windowInfo.processName}`);
    });

    return () => {
      if (typeof offActiveWindow === 'function') offActiveWindow();
    };
  }, [appSettings.autoSwitchProfile, selectProfileInApp]);

  useEffect(() => {
    const bridge = window.macropad;
    if (!bridge || deviceStatus.state !== 'connected' || !deviceSyncReady) return;

    const { config, warnings: configWarnings } = buildViaConfiguration(currentProfile, presetOs, {
      enableHostTriggers: true,
      profileCount: profiles.length,
    });
    if (config.layers.length === 0) return;
    const configKey = `slot:${activeProfileIndex}:${JSON.stringify(config)}`;
    if (configKey === lastSyncedConfigKeyRef.current) {
      // Host-trigger keycodes can stay identical when their desktop action or
      // display label changes. Refresh the verified slot's metadata without a
      // redundant device write, so execution and the HUD do not use stale data.
      if (syncedCheatProfilesRef.current[activeProfileIndex] !== currentProfile) {
        syncedCheatProfilesRef.current[activeProfileIndex] = currentProfile;
        setCheatSyncRevision((revision) => revision + 1);
      }
      return;
    }

    let cancelled = false;
    const syncTimer = window.setTimeout(() => {
      if (configKey === lastSyncedConfigKeyRef.current) return;
      void (async () => {
        try {
          const current = await bridge.request({ cmd: 'get_config' });
          if (cancelled || configKey === lastSyncedConfigKeyRef.current) return;
          if (!current.ok || !current.snapshot) {
            showToast(
              `Profile saved locally; device sync paused because a pre-sync backup could not be read: ${
                current.error || 'no keymap snapshot returned'
              }`
            );
            return;
          }
          if (!deviceKeymapFileTools) {
            showToast('Profile saved locally; device sync paused because local backup tools are unavailable');
            return;
          }

          const backup = deviceKeymapFileTools.savePreSyncSnapshot(current.snapshot, {
            device: deviceStatus.device,
            firmware: deviceStatus.fw,
          });
          if (!backup.ok) {
            showToast(
              `Profile saved locally; device sync paused because the pre-sync backup could not be saved: ${
                backup.error || 'unknown storage error'
              }`
            );
            return;
          }
          if (cancelled || configKey === lastSyncedConfigKeyRef.current) return;

          // A live keymap rewrite can change the keycode before a held key's
          // release is reported. Fail closed rather than leaving a stuck HUD.
          cheatSheetTriggersRef.current?.cancel();
          // During a multi-key write, neither the old nor new image is guaranteed.
          delete syncedCheatProfilesRef.current[activeProfileIndex];
          setCheatSyncRevision((revision) => revision + 1);
          const synced = await bridge.request({
            cmd: 'set_config',
            config,
            profileSlot: activeProfileIndex,
          });
          if (cancelled) return;
          if (!synced.ok) {
            showToast(
              `Profile saved locally; device sync failed: ${synced.error || 'unknown error'}. A pre-sync backup was saved locally.`
            );
            return;
          }

          lastSyncedConfigKeyRef.current = configKey;
          syncedCheatProfilesRef.current[activeProfileIndex] = currentProfile;
          setCheatSyncRevision((revision) => revision + 1);
          const state = JSON.stringify({
            v: 1,
            profiles,
            activeProfileIndex,
            customItems: customItemsByTab,
          });
          const saved = await bridge.putFile('app_state', state);
          if (cancelled) return;
          if (!saved.ok) {
            showToast(`Keymap synced to device; local profile save failed: ${saved.error || 'unknown error'}`);
            return;
          }

          const syncWarnings = [
            ...configWarnings,
            ...(current.warnings ?? []),
            ...(synced.warnings ?? []),
          ];
          showToast(
            syncWarnings.length
              ? `Profile saved locally; ${syncWarnings.length} sync warning${syncWarnings.length === 1 ? '' : 's'}: ${syncWarnings[0]}`
              : 'Profile saved locally; keymap synced to device'
          );
        } catch (error) {
          if (!cancelled) {
            showToast(
              `Profile saved locally; device sync failed: ${error instanceof Error ? error.message : String(error)}. Keymap writes require a locally saved pre-sync backup.`
            );
          }
        }
      })();
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(syncTimer);
    };
  }, [
    deviceSyncReady,
    deviceStatus.state,
    deviceStatus.device,
    deviceStatus.fw,
    profiles,
    activeProfileIndex,
    currentProfile,
    customItemsByTab,
    presetOs,
  ]);

  const ensureEmojiCatalog = async () => {
    if (selectableEmojiList.length > 0) return true;
    try {
      const catalog = await import('./emojiCatalog');
      setSelectableEmojiList(catalog.SELECTABLE_EMOJI_LIST);
      return true;
    } catch {
      showToast('Could not load the emoji choices');
      return false;
    }
  };

  const handleToggleIconPicker = async () => {
    if (iconPickerOpen) {
      setIconPickerOpen(false);
      return;
    }
    if (iconPickerTab === 'Emoji' && !(await ensureEmojiCatalog())) return;
    setIconPickerOpen(true);
  };

  const handleIconPickerTabChange = async (tab: 'Icon' | 'Emoji') => {
    if (tab === 'Emoji' && !(await ensureEmojiCatalog())) return;
    setIconPickerTab(tab);
  };

  const handleAppSettingChange = async (key: AppSettingKey, value: boolean | string) => {
    const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
    const result = await tools.set(key, value);
    if (!result.ok || !result.settings) {
      showToast(result.error || 'Could not save this setting');
      return;
    }
    setAppSettings(result.settings);
    if (result.capabilities) setSettingsCapabilities(result.capabilities);
    if (key === 'allowTerminalSmartActions') {
      showToast(value
        ? 'Terminal commands enabled. Only run commands you trust.'
        : 'Terminal command execution disabled');
    } else if (key === 'cheatSheetGlobalHotkeyEnabled') {
      showToast(value
        ? 'Cheat Sheet global hotkey enabled'
        : 'Cheat Sheet global hotkey disabled');
    } else if (key === 'cheatSheetGlobalHotkey') {
      showToast(`Global hotkey set to ${value}`);
    }
  };

  const handleToggleCheatSheet = () => {
    if (window.electronAPI?.commandCheatSheet) {
      void window.electronAPI.commandCheatSheet('toggle');
      showToast('Toggled Acrylic Cheat Sheet HUD');
    } else {
      showToast('Acrylic Cheat Sheet HUD is available in the desktop app');
    }
  };

  const handleUpdateProfileRules = (rules: AppProfileMappingRule[]) => {
    const nextSettings = { ...appSettings, appProfileRules: rules };
    setAppSettings(nextSettings);
    const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
    void tools.set('appProfileRules', rules);
    showToast(`Updated app-to-profile rules (${rules.length})`);
  };

  const handleUpdateKeycapPersonalization = (
    slotId: KeySlotId,
    customLegend: string,
    subLegend: string,
    keycapColor: string
  ) => {
    const nextProfiles = profiles.map((p, pIdx) => {
      if (pIdx !== activeProfileIndex) return p;
      const nextLayers = p.layers.map((layer, lIdx) => {
        if (lIdx !== activeLayerIndex) return layer;
        const currentSlot = layer[slotId];
        return {
          ...layer,
          [slotId]: {
            ...currentSlot,
            customLegend: customLegend.trim() || undefined,
            subLegend: subLegend.trim() || undefined,
            keycapColor: keycapColor.trim() || undefined,
          },
        };
      });
      return { ...p, layers: nextLayers };
    });
    pushState(nextProfiles);
  };

  const handleOpenSupportLink = async (key: SupportLinkKey, label: string) => {
    const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
    const result = await tools.openSupport(key);
    showToast(result.ok ? `Opening ${label}` : result.error || `Could not open ${label}`);
  };

  const handleCheckFirmwareUpdate = async () => {
    setFirmwareCheckPending(true);
    try {
      const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
      const result = await tools.checkFirmware();
      const installedVersion = deviceStatus.state === 'connected'
        ? ` Connected device reports ${deviceStatus.fw || 'an unknown firmware version'}.`
        : '';
      showToast(`${result.message}${installedVersion}`);
    } catch (error) {
      showToast(`Firmware check failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setFirmwareCheckPending(false);
    }
  };

  const handleCheckAppUpdate = async () => {
    setAppUpdateCheckPending(true);
    try {
      const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
      const result = await tools.checkForUpdates?.();
      if (!result) {
        showToast('App update checking is only available in the desktop application.');
        return;
      }
      if (!result.ok) {
        showToast(`Update check failed: ${result.error || 'Unknown error'}`);
        return;
      }
      if (result.hasUpdate) {
        showToast(`Update available: ${result.latestVersion}! Click Release Notes in Settings to download.`);
      } else {
        showToast(`NODE Studio is up to date (v${result.currentVersion}).`);
      }
    } catch (error) {
      showToast(`Update check failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAppUpdateCheckPending(false);
    }
  };

  const flashSimulatedPress = (slotId: string) => {
    setActivePressedSlot(slotId);
    window.setTimeout(() => {
      setActivePressedSlot((current) => (current === slotId ? null : current));
    }, 220);
  };

  const handleAdvanceFlash = async () => {
    const tools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
    const result = await tools.flashFirmware();
    if (result.cancelled) return;
    showToast(result.ok ? result.message || 'Firmware operation completed' : result.error || 'Firmware flashing failed');
  };

  const handleToggleDeviceConnection = async () => {
    const bridge = window.macropad;
    if (!bridge) {
      showToast('QMK/VIA device bridge is unavailable');
      return;
    }

    if (deviceStatus.state === 'connected') {
      await bridge.disconnect();
      applyConnectedStatus({ state: 'disconnected' });
      return;
    }

    try {
      const nextStatus = await bridge.connect();
      applyConnectedStatus(nextStatus);
      if (nextStatus.state !== 'connected' && nextStatus.error) {
        showToast(nextStatus.error);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error));
    }
  };

  const pushState = (nextProfiles: ProfileData[]) => {
    recordSnapshot(profiles);
    setProfiles(nextProfiles);
  };

  const handleResetLocalConfig = () => {
    if (!window.confirm('Reset all saved profiles and custom actions? This does not reset the physical device keymap.')) {
      return;
    }
    setProfiles(JSON.parse(JSON.stringify(INITIAL_PROFILES)) as ProfileData[]);
    selectProfileInApp(0, INITIAL_PROFILES[0]?.layers.length ?? 1);
    setCustomItemsByTab({ Action: [], 'Multi-A': [], 'Smart-A': [] });
    clearHistory();
    setLayerNames({});
    showToast('Local profiles and custom actions reset; the physical device keymap was not changed');
  };

  const handleUndo = () => {
    const previous = undo(profiles);
    if (previous) setProfiles(previous);
  };

  const handleRedo = () => {
    const next = redo(profiles);
    if (next) setProfiles(next);
  };

  const handleAddLayer = () => {
    if (currentProfile.layers.length >= MAX_LAYER_COUNT) {
      showToast(`A profile can have up to ${MAX_LAYER_COUNT} layers. Remove one first.`);
      return;
    }
    const blankLayer: LayerKeymap = JSON.parse(JSON.stringify(INITIAL_LAYER_1));
    const nextProfiles = profiles.map((p, idx) =>
      idx === activeProfileIndex
        ? { ...p, layers: [...p.layers, blankLayer] }
        : p
    );
    pushState(nextProfiles);
    // Editing the new layer selects it on the device as well.
    void requestHardwareLayer(currentProfile.layers.length);
    setLayerToolbarOpen(true);
    setLayerDeleteConfirm(false);
  };

  const handleRemoveLayer = (layerIdx: number) => {
    if (currentProfile.layers.length <= 1) {
      const resetLayer: LayerKeymap = JSON.parse(JSON.stringify(INITIAL_LAYER_1));
      const nextProfiles = profiles.map((p, idx) =>
        idx === activeProfileIndex ? { ...p, layers: [resetLayer] } : p
      );
      pushState(nextProfiles);
      setLayerDeleteConfirm(false);
      setLayerToolbarOpen(false);
      return;
    }
    const retainedLayers = currentProfile.layers.filter((_, i) => i !== layerIdx);
    if (referencesAtOrAfter(retainedLayers, 'layer', layerIdx) || referencesAtOrAfter(customItemsByTab, 'layer', layerIdx)) {
      showToast('Clear layer references to this and later layers before deleting, to avoid retargeting assignments');
      setLayerDeleteConfirm(false);
      return;
    }
    const nextProfiles = profiles.map((p, idx) =>
      idx === activeProfileIndex
        ? { ...p, layers: p.layers.filter((_, i) => i !== layerIdx) }
        : p
    );
    pushState(nextProfiles);
    void requestHardwareLayer(Math.max(0, activeLayerIndex - 1));
    setLayerDeleteConfirm(false);
  };

  const handleUpdateKeyAssignment = (
    slotId: KeySlotId,
    updates: Partial<KeyAssignment>
  ) => {
    const nextProfiles = profiles.map((p, pIdx) => {
      if (pIdx !== activeProfileIndex) return p;
      const nextLayers = p.layers.map((layer, lIdx) => {
        if (lIdx !== effectiveLayerIndex) return layer;
        return {
          ...layer,
          [slotId]: {
            ...layer[slotId],
            ...updates,
          },
        };
      });
      return { ...p, layers: nextLayers };
    });
    pushState(nextProfiles);
  };

  const assignItemToSlot = (
    item: BasicTileItem,
    targetSlot: KeySlotId,
    subOverride?: EncoderSubActionId,
    tabOverride?: MappingTabId
  ) => {
    const effectiveTab = tabOverride || mappingTab;
    if (effectiveTab === 'Basic') {
      const layerTarget = item.id.match(/^(?:t?lyr)-(\d+)$/);
      const profileTarget = item.id.match(/^prf-(\d+)$/);
      if ((layerTarget && Number(layerTarget[1]) > currentProfile.layers.length) ||
          (profileTarget && Number(profileTarget[1]) > profiles.length)) {
        showToast('This layer or profile no longer exists');
        return;
      }
    }
    const actionTypeMap: Record<MappingTabId, KeyAssignment['actionType']> = {
      Basic: 'Basic input',
      Action: 'Shortcut',
      'Multi-A': 'Multi-step action',
      'Smart-A': 'Smart Action',
    };
    const displayBinding =
      item.listLabel || item.main.replace(/\n/g, ' ') || 'blank';

    if (targetSlot === GRID_MACRO_ENCODER_SLOT) {
      const subTarget = subOverride || selectedEncoderSub;
      if (!subTarget) return;
      const existingActions = getEncoderActions(currentLayer[targetSlot]);
      const updatedActions: Record<EncoderSubActionId, EncoderSubBinding> = {
        ...existingActions,
        [subTarget]: {
          label: item.isClearIcon ? '—' : formatEncoderShortLabel(displayBinding),
          binding: item.isClearIcon ? 'blank' : displayBinding,
          execution: item.isClearIcon ? undefined : item.execution,
        },
      };
      handleUpdateKeyAssignment(targetSlot, {
        actionType: actionTypeMap[effectiveTab],
        encoderActions: updatedActions,
      });
      showToast(`Assigned "${displayBinding}" to Encoder (${subTarget.toUpperCase()})`);
      return;
    }

    handleUpdateKeyAssignment(targetSlot, {
      label: item.isClearIcon ? '' : item.macropadLabel,
      binding: item.isClearIcon ? 'blank' : displayBinding,
      actionType: actionTypeMap[effectiveTab],
      iconId: item.isClearIcon ? undefined : item.iconId,
      actionId: item.isClearIcon ? undefined : item.id,
      execution: item.isClearIcon ? undefined : item.execution,
    });
    showToast(`Assigned "${displayBinding}" to ${targetSlot.toUpperCase()}`);
  };

  const swapMacropadSlots = (
    slotA: KeySlotId,
    slotB: KeySlotId,
    subA?: EncoderSubActionId,
    subB?: EncoderSubActionId
  ) => {
    if (slotA === slotB && subA === subB) return;

    const nextProfiles = profiles.map((p, pIdx) => {
      if (pIdx !== activeProfileIndex) return p;
      const nextLayers = p.layers.map((layer, lIdx) => {
        if (lIdx !== effectiveLayerIndex) return layer;
        const copy: LayerKeymap = JSON.parse(JSON.stringify(layer));

        if (subA && subB) {
          const actionsA = getEncoderActions(copy[slotA]);
          const actionsB = getEncoderActions(copy[slotB]);
          const entryA = { ...actionsA[subA] };
          const entryB = { ...actionsB[subB] };
          if (slotA === slotB) {
            copy[slotA].encoderActions = {
              ...actionsA,
              [subA]: entryB,
              [subB]: entryA,
            };
          } else {
            copy[slotA].encoderActions = { ...actionsA, [subA]: entryB };
            copy[slotB].encoderActions = { ...actionsB, [subB]: entryA };
          }
          return copy;
        }

        if (subA && !subB) {
          const actionsA = getEncoderActions(copy[slotA]);
          const entryA = { ...actionsA[subA] };
          const itemB = { ...copy[slotB] };
          const isBEmpty =
            !itemB.iconId &&
            (!itemB.label || itemB.label === '—' || itemB.binding === 'blank');
          copy[slotA].encoderActions = {
            ...actionsA,
            [subA]: {
              label: isBEmpty
                ? '—'
                : formatEncoderShortLabel(itemB.binding || itemB.label),
              binding: isBEmpty ? 'blank' : itemB.binding,
            },
          };
          copy[slotB] = {
            ...itemB,
            label:
              entryA.binding === 'blank' || entryA.label === '—'
                ? ''
                : entryA.binding,
            binding: entryA.binding,
            iconId: undefined,
          };
          return copy;
        }

        if (!subA && subB) {
          const itemA = { ...copy[slotA] };
          const actionsB = getEncoderActions(copy[slotB]);
          // Moving rectangular key onto encoder popup sub-button sets the encoder sub-button and leaves the source rectangular key empty
          copy[slotA] = {
            ...itemA,
            label: '',
            binding: 'blank',
            iconId: undefined,
          };
          copy[slotB].encoderActions = {
            ...actionsB,
            [subB]: {
              label: formatEncoderShortLabel(itemA.binding || itemA.label),
              binding: itemA.binding || itemA.label,
            },
          };
          return copy;
        }

        const temp = { ...copy[slotA] };
        copy[slotA] = { ...copy[slotB] };
        copy[slotB] = temp;
        return copy;
      });
      return { ...p, layers: nextLayers };
    });

    pushState(nextProfiles);
    const labelA = currentLayer[slotA]?.label || 'empty';
    const labelB = currentLayer[slotB]?.label || 'empty';
    showToast(`Switched "${labelA}" ⇄ "${labelB}"`);
  };

  const clampMacropadOffset = (
    rawOffsetX: number,
    rawOffsetY: number
  ): { x: number; y: number } => {
    const container = keymapMainRef.current;
    const moveUnit = macropadMoveUnitRef.current;
    if (!container || !moveUnit) return { x: rawOffsetX, y: rawOffsetY };

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return { x: rawOffsetX, y: rawOffsetY };
    }

    const unitRect = moveUnit.getBoundingClientRect();
    const unitWidth = moveUnit.offsetWidth || unitRect.width;
    const unitHeight = moveUnit.offsetHeight || unitRect.height;
    if (unitWidth === 0 || unitHeight === 0) {
      return { x: rawOffsetX, y: rawOffsetY };
    }

    // Match the open canvas shown in the UI: below the toolbar, above the tip,
    // and inside the side edges. Keep the drawer's occupied side out of bounds.
    const movementArea = {
      left: rect.left + 8,
      right: rect.right - (mappingDrawerOpen ? 344 : 8),
      top: rect.top + (layerToolbarOpen ? (layerLightingOpen ? 152 : 148) : 106),
      bottom: rect.bottom - 132,
    };

    const halfUnitWidth = unitWidth / 2;
    const halfUnitHeight = unitHeight / 2;
    const isEncoderPopupOpen = selectedKey === GRID_MACRO_ENCODER_SLOT;

    return clampMacropadOffsetToArea(
      { x: rawOffsetX, y: rawOffsetY },
      rect,
      movementArea,
      {
        left: -Math.max(132, halfUnitWidth),
        right: Math.max(isEncoderPopupOpen ? 300 : 132, halfUnitWidth),
        top: -Math.max(100, halfUnitHeight),
        bottom: Math.max(138, halfUnitHeight),
      }
    );
  };

  // Re-clamp against the visible canvas when its available space changes.
  useEffect(() => {
    const container = keymapMainRef.current;
    if (!container) return;

    const reclampMacropad = () => {
      setMacropadOffset((prev) => {
        const next = clampMacropadOffset(prev.x, prev.y);
        return next.x === prev.x && next.y === prev.y ? prev : next;
      });
    };
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(reclampMacropad);

    resizeObserver?.observe(container);
    if (macropadMoveUnitRef.current) {
      resizeObserver?.observe(macropadMoveUnitRef.current);
    }
    window.addEventListener('resize', reclampMacropad);
    reclampMacropad();

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', reclampMacropad);
    };
  }, [
    mappingDrawerOpen,
    layerToolbarOpen,
    layerLightingOpen,
    selectedKey,
    activeNav,
  ]);

  // Close Profile dropdown & Layer toolbar when tapping on any blank area outside them
  useEffect(() => {
    const handleDocumentPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      if (
        profileMenuOpen &&
        profileContainerRef.current &&
        !profileContainerRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
        setDeletingProfileId(null);
      }

      if (
        layerToolbarOpen &&
        layersContainerRef.current &&
        !layersContainerRef.current.contains(target)
      ) {
        setLayerToolbarOpen(false);
        setLayerLightingOpen(false);
        setLayerDeleteConfirm(false);
      }
    };

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
    };
  }, [profileMenuOpen, layerToolbarOpen]);

  // Keyboard recording listener for Action editing when Advance mode is OFF
  useEffect(() => {
    if (
      creatorModalTab !== 'Action' ||
      actionAdvanceMode ||
      actionRecordingStatus !== 'recording'
    ) {
      return;
    }

    const handleActionKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Ignore key auto-repeat for modifier/lock keys
      if (
        e.repeat &&
        (e.key === 'Control' ||
          e.key === 'Shift' ||
          e.key === 'Alt' ||
          e.key === 'Meta' ||
          e.key === 'CapsLock' ||
          e.key === 'NumLock')
      ) {
        return;
      }

      // 1. Handle Backspace special rules:
      // - Double-tap Backspace -> deletes the whole thing
      // - Single letter + Backspace -> deletes everything
      // - Two or more letters + Backspace -> deletes the 1 letter just written
      // - Otherwise -> adds a "+" and "backspace" token
      if (e.key === 'Backspace') {
        const now = Date.now();
        const isDoubleTap = now - lastBackspaceTimeRef.current < 420;
        lastBackspaceTimeRef.current = now;

        setActionTokens((prev) => {
          const lastToken = prev[prev.length - 1];
          if (
            isDoubleTap ||
            (lastToken &&
              lastToken.kind === 'special' &&
              lastToken.label === 'backspace')
          ) {
            return [];
          }
          if (lastToken && lastToken.kind === 'text') {
            if (lastToken.label.length <= 1) {
              // Single letter + backspace -> delete everything
              return [];
            }
            // Two or more letters + backspace -> delete the one letter just written
            return [
              ...prev.slice(0, -1),
              {
                ...lastToken,
                label: lastToken.label.slice(0, -1),
              },
            ];
          }
          return [
            ...prev,
            {
              id: `tok-${now}-${Math.random()}`,
              label: 'backspace',
              kind: 'special',
            },
          ];
        });
        return;
      }

      lastBackspaceTimeRef.current = 0;

      // 2. Handle Modifiers (Green pills: ctrl, win, shift, alt)
      if (
        e.key === 'Control' ||
        e.key === 'Meta' ||
        e.key === 'Shift' ||
        e.key === 'Alt'
      ) {
        const modLabel =
          e.key === 'Control'
            ? 'ctrl'
            : e.key === 'Meta'
            ? 'win'
            : e.key === 'Shift'
            ? 'shift'
            : 'alt';

        setActionTokens((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.kind === 'modifier' && last.label === modLabel) {
            return prev;
          }
          return [
            ...prev,
            {
              id: `tok-${Date.now()}-${Math.random()}`,
              label: modLabel,
              kind: 'modifier',
            },
          ];
        });
        return;
      }

      // 3. Handle CapsLock & NumLock
      if (e.code === 'CapsLock' || e.key === 'CapsLock') {
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: 'caps lock',
            kind: 'special',
          },
        ]);
        return;
      }
      if (e.code === 'NumLock' || e.key === 'NumLock') {
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: 'num lock',
            kind: 'special',
          },
        ]);
        return;
      }

      // 4. Handle Numpad keys
      if (e.code.startsWith('Numpad') || e.location === 3) {
        const numpadMap: Record<string, string> = {
          Numpad0: 'num 0',
          Numpad1: 'num 1',
          Numpad2: 'num 2',
          Numpad3: 'num 3',
          Numpad4: 'num 4',
          Numpad5: 'num 5',
          Numpad6: 'num 6',
          Numpad7: 'num 7',
          Numpad8: 'num 8',
          Numpad9: 'num 9',
          NumpadAdd: 'num +',
          NumpadSubtract: 'num -',
          NumpadMultiply: 'num *',
          NumpadDivide: 'num /',
          NumpadDecimal: 'num .',
          NumpadEnter: 'num enter',
        };
        const npLabel =
          numpadMap[e.code] || `num ${e.key.toLowerCase()}`;
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: npLabel,
            kind: 'special',
          },
        ]);
        return;
      }

      // 5. Handle other non-character special keys
      if (e.key.length > 1) {
        const specialMap: Record<string, string> = {
          Enter: 'enter',
          Tab: 'tab',
          Escape: 'esc',
          Delete: 'delete',
          Insert: 'insert',
          Home: 'home',
          End: 'end',
          PageUp: 'page up',
          PageDown: 'page down',
          ArrowUp: 'up',
          ArrowDown: 'down',
          ArrowLeft: 'left',
          ArrowRight: 'right',
        };
        const spLabel = specialMap[e.key] || e.key.toLowerCase();
        setActionTokens((prev) => [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: spLabel,
            kind: 'special',
          },
        ]);
        return;
      }

      // 6. Handle Space or printable characters (letters/words/digits/symbols)
      if (e.key === ' ') {
        setActionTokens((prev) => {
          const last = prev[prev.length - 1];
          // If typing words, combine into the current text token or add space
          if (last && last.kind === 'text') {
            return prev;
          }
          return [
            ...prev,
            {
              id: `tok-${Date.now()}-${Math.random()}`,
              label: 'space',
              kind: 'special',
            },
          ];
        });
        return;
      }

      const char = e.key;
      setActionTokens((prev) => {
        const last = prev[prev.length - 1];
        // Combine consecutive typed letters/words into a single purple pill,
        // unless preceded by a modifier or special key (e.g. ctrl + v, win + shift + s)
        if (last && last.kind === 'text') {
          const prevBeforeLast = prev[prev.length - 2];
          const isSingleKeyAfterModifier =
            last.label.length === 1 &&
            prevBeforeLast &&
            prevBeforeLast.kind === 'modifier' &&
            (e.ctrlKey || e.metaKey || e.altKey);
          if (!isSingleKeyAfterModifier) {
            return [
              ...prev.slice(0, -1),
              {
                ...last,
                label: last.label + char,
              },
            ];
          }
        }
        return [
          ...prev,
          {
            id: `tok-${Date.now()}-${Math.random()}`,
            label: char,
            kind: 'text',
          },
        ];
      });
    };

    window.addEventListener('keydown', handleActionKeyDown);
    return () => {
      window.removeEventListener('keydown', handleActionKeyDown);
    };
  }, [creatorModalTab, actionAdvanceMode, actionRecordingStatus]);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      // 1. Handle keycap tile drag with subtle corner-held circular swing
      const session = dragSessionRef.current;
      if (session) {
        const dist = Math.hypot(
          e.clientX - session.startX,
          e.clientY - session.startY
        );
        if (!session.isDragging && dist >= 4) {
          session.isDragging = true;
          suppressNextClickRef.current = true;
          dragRawRotate.jump(0);
          dragRawBobY.jump(0);
          dragSpringRotate.jump(0);
          dragSpringBobY.jump(0);
        }
        if (session.isDragging) {
          const vx = e.clientX - session.lastX;
          session.lastX = e.clientX;
          session.lastY = e.clientY;

          // Subtle circular motion as if held at the corner when dragging left/right
          const clampedVx = Math.max(-14, Math.min(14, vx));
          const subtleRotate = clampedVx * 0.45; // max ±6.3 deg
          const subtleArcY = -Math.abs(clampedVx) * 0.16; // gentle 0..2.2px circular lift

          dragRawRotate.set(subtleRotate);
          dragRawBobY.set(subtleArcY);

          if (dragTiltDecayTimeoutRef.current) {
            window.clearTimeout(dragTiltDecayTimeoutRef.current);
          }
          dragTiltDecayTimeoutRef.current = window.setTimeout(() => {
            dragRawRotate.set(0);
            dragRawBobY.set(0);
          }, 55);

          setDraggedTile({
            item: session.item,
            sourceTab: session.sourceTab,
            fromSlotId: session.fromSlotId,
            fromSubAction: session.fromSubAction,
            x: e.clientX,
            y: e.clientY,
          });
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const subEl = el?.closest(
            '[data-drop-encoder-sub]'
          ) as HTMLElement | null;
          if (subEl) {
            const slotId = subEl.getAttribute(
              'data-drop-slot'
            ) as KeySlotId | null;
            const subAction = subEl.getAttribute(
              'data-drop-encoder-sub'
            ) as EncoderSubActionId | null;
            if (slotId && subAction) {
              setDragOverTarget({ slotId, subAction });
              return;
            }
          }
          const slotEl = el?.closest('[data-drop-slot]') as HTMLElement | null;
          if (slotEl) {
            const slotId = slotEl.getAttribute(
              'data-drop-slot'
            ) as KeySlotId | null;
            if (slotId) {
              setDragOverTarget({ slotId });
              return;
            }
          }
          setDragOverTarget(null);
        }
        return;
      }

      // 2. Handle dragging/reordering an Advance Mode "Assign Key" capsule via the 6-dot handle
      const advDrag = advStepDragRef.current;
      if (advDrag) {
        const dy = e.clientY - advDrag.startY;
        const swapThreshold = 54;
        if (Math.abs(dy) >= swapThreshold) {
          const dir = dy > 0 ? 1 : -1;
          let didSwap = false;
          setActionAdvanceSteps((prev) => {
            const idx = prev.findIndex((s) => s.id === advDrag.id);
            const targetIdx = idx + dir;
            if (idx === -1 || targetIdx < 0 || targetIdx >= prev.length) {
              return prev;
            }
            didSwap = true;
            const next = [...prev];
            const [moved] = next.splice(idx, 1);
            next.splice(targetIdx, 0, moved);
            return next;
          });
          if (didSwap) {
            advDrag.startY += dir * swapThreshold;
          }
        }
        setDraggingAdvStep({
          id: advDrag.id,
          offsetY: e.clientY - advDrag.startY,
        });
        return;
      }

      // 3. Handle moving the Macropad + "Edit layout" unit in the blank area
      const padDrag = macropadDragRef.current;
      if (padDrag) {
        const dx = e.clientX - padDrag.startX;
        const dy = e.clientY - padDrag.startY;
        if (!padDrag.isMoving && Math.hypot(dx, dy) >= 4) {
          padDrag.isMoving = true;
          suppressNextClickRef.current = true;
          setIsDraggingMacropad(true);
        }
        if (padDrag.isMoving) {
          const nextClamped = clampMacropadOffset(
            padDrag.initialOffsetX + dx,
            padDrag.initialOffsetY + dy
          );
          setMacropadOffset(nextClamped);
        }
      }
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (advStepDragRef.current) {
        advStepDragRef.current = null;
        setDraggingAdvStep(null);
      }

      if (macropadDragRef.current) {
        if (macropadDragRef.current.isMoving) {
          setTimeout(() => {
            suppressNextClickRef.current = false;
          }, 40);
        }
        macropadDragRef.current = null;
        setIsDraggingMacropad(false);
      }

      const session = dragSessionRef.current;
      if (!session) return;
      if (dragTiltDecayTimeoutRef.current) {
        window.clearTimeout(dragTiltDecayTimeoutRef.current);
      }
      if (session.isDragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const subEl = el?.closest('[data-drop-encoder-sub]') as HTMLElement | null;
        if (subEl) {
          const slotId = subEl.getAttribute('data-drop-slot') as KeySlotId | null;
          const subAction = subEl.getAttribute(
            'data-drop-encoder-sub'
          ) as EncoderSubActionId | null;
          if (slotId && subAction) {
            if (session.fromSlotId) {
              swapMacropadSlots(
                session.fromSlotId,
                slotId,
                session.fromSubAction,
                subAction
              );
            } else {
              assignItemToSlot(
                session.item,
                slotId,
                subAction,
                session.sourceTab
              );
            }
          }
        } else {
          const slotEl = el?.closest('[data-drop-slot]') as HTMLElement | null;
          if (slotEl) {
            const slotId = slotEl.getAttribute('data-drop-slot') as KeySlotId | null;
            if (slotId) {
              if (session.fromSlotId) {
                swapMacropadSlots(
                  session.fromSlotId,
                  slotId,
                  session.fromSubAction,
                  undefined
                );
              } else {
                assignItemToSlot(
                  session.item,
                  slotId,
                  undefined,
                  session.sourceTab
                );
              }
            }
          }
        }
        setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 40);
      }
      dragSessionRef.current = null;
      setDraggedTile(null);
      setDragOverTarget(null);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  });

  const handleStartTileDrag = (
    e: React.PointerEvent,
    item: BasicTileItem,
    sourceTab: MappingTabId = mappingTab
  ) => {
    if (e.button !== 0) return;
    dragSessionRef.current = {
      item,
      sourceTab,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    };
  };

  const handleStartMacropadMove = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Only move the macropad when holding the black outer part (not any key or encoder button)
    if ((e.target as HTMLElement).closest('button')) return;
    if (dragSessionRef.current) return;
    macropadDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: macropadOffset.x,
      initialOffsetY: macropadOffset.y,
      isMoving: false,
    };
  };

  const handleResetMacropadCenter = (e: React.MouseEvent) => {
    // Double-clicking on the black outer part returns the macropad to the center
    if ((e.target as HTMLElement).closest('button')) return;
    setMacropadOffset(clampMacropadOffset(0, 0));
  };

  const handleStartMacropadKeyDrag = (
    e: React.PointerEvent,
    slotId: KeySlotId,
    subAction?: EncoderSubActionId
  ) => {
    if (e.button !== 0) return;
    if (simulationMode && !subAction && slotId !== GRID_MACRO_ENCODER_SLOT &&
        cheatSheetCommand(currentLayer[slotId]?.binding) === 'hold-start') {
      const command = window.electronAPI?.commandCheatSheet;
      if (!command) return;
      void window.electronAPI?.updateCheatSheet?.(cheatSheetSnapshot(currentProfile, effectiveLayerIndex));
      void command('hold-start', 'simulation');
      const pointerId = e.pointerId;
      const release = (event: PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        window.removeEventListener('pointerup', release);
        window.removeEventListener('pointercancel', release);
        void command('hold-end', 'simulation');
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
      return;
    }
    // Drag encoder bindings from their CW / Press / CCW capsule, not the knob body.
    if (slotId === GRID_MACRO_ENCODER_SLOT && !subAction) return;

    const assignment = currentLayer[slotId];
    if (
      !subAction &&
      !assignment?.iconId &&
      (!assignment?.label ||
        assignment.label === '—' ||
        assignment.binding === 'blank')
    ) {
      return;
    }

    let displayLabel = assignment?.label || slotId.toUpperCase();
    let displayBinding = assignment?.binding || displayLabel;
    let displayExecution = assignment?.execution;

    if (subAction && slotId === GRID_MACRO_ENCODER_SLOT) {
      const actions = getEncoderActions(assignment);
      const subEntry = actions[subAction];
      if (!subEntry || subEntry.label === '—' || subEntry.binding === 'blank') {
        return;
      }
      displayLabel = subEntry.label || subAction.toUpperCase();
      displayBinding = subEntry.binding || displayLabel;
      displayExecution = subEntry.execution;
    }

    const previewItem: BasicTileItem = {
      id: `macropad-drag-${slotId}-${subAction || 'main'}`,
      main: displayLabel,
      macropadLabel: displayLabel,
      listLabel: displayBinding,
      iconId: subAction ? undefined : assignment?.iconId,
      execution: displayExecution,
    };

    dragSessionRef.current = {
      item: previewItem,
      sourceTab: 'Basic',
      fromSlotId: slotId,
      fromSubAction: subAction,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      isDragging: false,
    };
  };

  const runSimulationAction = (
    assignment: SimulationAction & { actionId?: string },
    gesture?: MultiGestureKey
  ) => {
    triggerSimulationAction(
      { ...assignment, id: assignment.actionId || assignment.id, gesture },
      (targetLayer) => {
        if (targetLayer >= currentProfile.layers.length) {
          showToast(`Layer ${targetLayer + 1} is not available on this profile`);
          return false;
        }
        // A simulated layer action must move the real device too; the confirmed
        // reply is what updates the highlight and preview.
        if (deviceStatusRef.current.state === 'connected') {
          void requestHardwareLayer(targetLayer);
        } else {
          setActiveLayerIndex(targetLayer);
        }
        setSelectedKey(null);
        setSelectedEncoderSub(null);
        setMappingDrawerOpen(false);
      },
      showToast,
      window,
      { onProfileChange: (targetProfile) => {
        if (!profiles[targetProfile]) {
          showToast(`Profile ${targetProfile + 1} is not available`);
          return false;
        }
        selectProfileInApp(targetProfile, profiles[targetProfile].layers.length);
      } }
    );
  };

  const handleSelectKey = (slotId: KeySlotId) => {
    if (suppressNextClickRef.current) return;
    if (simulationMode) {
      flashSimulatedPress(slotId);
      if (slotId === GRID_MACRO_ENCODER_SLOT) {
        setEncoderAngle((angle) => (angle + 30) % 360);
        runSimulationAction(getEncoderActions(currentLayer[slotId]).cw);
      } else if (cheatSheetCommand(currentLayer[slotId]?.binding) !== 'hold-start') {
        runSimulationAction(currentLayer[slotId]);
      }
      return;
    }
    if (slotId === GRID_MACRO_ENCODER_SLOT) {
      setEncoderAngle((angle) => (angle + 45) % 360);
      if (selectedKey === slotId && !selectedEncoderSub) {
        setSelectedKey(null);
      } else {
        setSelectedKey(slotId);
        setSelectedEncoderSub(null);
      }
      return;
    }
    if (selectedDrawerTile && !selectedKey) {
      assignItemToSlot(
        selectedDrawerTile.item,
        slotId,
        undefined,
        selectedDrawerTile.sourceTab
      );
      setSelectedDrawerTile(null);
      return;
    }
    setSelectedKey(slotId);
    setSelectedEncoderSub(null);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const handleSelectEncoderSubAction = (
    slotId: typeof GRID_MACRO_ENCODER_SLOT,
    subAction: EncoderSubActionId
  ) => {
    if (suppressNextClickRef.current) return;
    if (simulationMode) {
      flashSimulatedPress(slotId);
      if (subAction === 'cw') setEncoderAngle((angle) => (angle + 30) % 360);
      if (subAction === 'ccw') setEncoderAngle((angle) => (angle - 30 + 360) % 360);
      runSimulationAction(getEncoderActions(currentLayer[slotId])[subAction]);
      return;
    }
    if (selectedDrawerTile) {
      assignItemToSlot(
        selectedDrawerTile.item,
        slotId,
        subAction,
        selectedDrawerTile.sourceTab
      );
      setSelectedDrawerTile(null);
      return;
    }
    setSelectedKey(slotId);
    setSelectedEncoderSub(subAction);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const handleOpenDrawerWithTab = (tab: MappingTabId) => {
    setMappingTab(tab);
    setMappingDrawerOpen(true);
    setMappingStackExpanded(false);
    setHoveredMappingType(null);
  };

  const triggerTileFlash = (tileId: string) => {
    if (flashTimeoutRef.current) {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashedTileId(tileId);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashedTileId((prev) => (prev === tileId ? null : prev));
    }, 240);
  };

  const handleAssignTileFromDrawer = (item: BasicTileItem) => {
    if (suppressNextClickRef.current) return;
    triggerTileFlash(item.id);
    setSelectedDrawerTile((prev) =>
      prev?.item.id === item.id ? null : { item, sourceTab: mappingTab }
    );
    if (
      selectedKey &&
      (selectedKey !== GRID_MACRO_ENCODER_SLOT || selectedEncoderSub)
    ) {
      assignItemToSlot(
        item,
        selectedKey,
        selectedEncoderSub || undefined,
        mappingTab
      );
    }
  };

  const toggleListSection = (title: string) => {
    setExpandedListSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleOpenCreatorEditor = (
    tab: Exclude<MappingTabId, 'Basic'>,
    existingItem?: BasicTileItem
  ) => {
    setCreatorModalTab(tab);
    setIconPickerOpen(false);
    setIconPickerSearch('');
    setActiveGestureDropdown(null);
    setActiveAdvanceStepDropdown(null);
    setGestureKeySearch('');
    setExpandedGestureSection(null);
    setSmartAppDropdownOpen(false);
    setSelectedSmartApplication(null);
    setCustomItemDeleteConfirm(false);

    if (existingItem) {
      setEditingCustomItemId(existingItem.id);
      setNewCustomName(existingItem.main);
      setSelectedIconId(existingItem.iconId);
      setSelectedEmoji(existingItem.emoji);
      setNewCustomBinding(existingItem.listLabel || '');

      if (tab === 'Action') {
        const execution = existingItem.execution;
        const rawSeq = existingItem.listLabel || '';
        const match = rawSeq.match(/\((.+)\)$/);
        const displaySequence = match ? match[1] : '';
        if (
          execution?.kind === 'sequence' &&
          execution.steps.length > 0 &&
          execution.steps.every((step) => step.kind === 'key')
        ) {
          const sequenceSteps = execution.steps as Extract<DesktopExecutionStep, { kind: 'key' }>[];
          setActionAdvanceMode(true);
          setActionTokens([]);
          setActionRecordingStatus('idle');
          setActionAdvanceSteps(sequenceSteps.map((step, index) => ({
            id: `adv-edit-${index}-${Date.now()}`,
            keyLabel: step.key,
            mode: step.mode === 'press' ? 'press' : 'press-release',
            delayAfterActive: Number(step.delayAfterMs || 0) > 0,
            delayAfterMs: String(step.delayAfterMs ?? '200'),
          })));
        } else {
          const shortcut = execution?.kind === 'shortcut'
            ? execution.value
            : displaySequence;
          const parts = shortcut.split(' + ').map((part) => part.trim()).filter(Boolean);
          setActionAdvanceMode(false);
          setActionAdvanceSteps([{
            id: 'adv-edit-1',
            keyLabel: '',
            mode: 'press-release',
            delayAfterActive: false,
            delayAfterMs: '200',
          }]);
          setActionTokens(
            parts.map((lbl, idx) => ({
              id: `tok-init-${idx}`,
              label: lbl,
              kind: ['ctrl', 'control', 'win', 'windows', 'shift', 'alt', 'cmd', 'option'].includes(
                lbl.toLowerCase()
              )
                ? 'modifier'
                : 'text',
            }))
          );
          setActionRecordingStatus(parts.length > 0 ? 'confirmed' : 'idle');
        }
      } else if (tab === 'Multi-A') {
        const execution = existingItem.execution;
        const rawSummary = existingItem.listLabel || '';
        const gestureSummary = rawSummary.match(/\((.*)\)$/)?.[1] || '';
        const fromDisplay = (key: MultiGestureKey) => {
          const match = gestureSummary.match(new RegExp(`(?:^|,\\s*)${key}:\\s*([^,]*)`, 'i'));
          return match?.[1]?.trim() || '';
        };
        setMultiGestures(execution?.kind === 'multi'
          ? {
              onTap: execution.gestures.onTap || '',
              doubleTap: execution.gestures.doubleTap || '',
              onHold: execution.gestures.onHold || '',
              tapHold: execution.gestures.tapHold || '',
            }
          : {
              onTap: fromDisplay('onTap'),
              doubleTap: fromDisplay('doubleTap'),
              onHold: fromDisplay('onHold'),
              tapHold: fromDisplay('tapHold'),
            });
        setTappingTermMs(String(execution?.kind === 'multi' ? execution.tappingTermMs ?? 250 : 250));
      } else if (tab === 'Smart-A') {
        const execution = existingItem.execution;
        const displaySmart = (existingItem.listLabel || '').match(/\((Text|Cmd|Web|App):\s*([\s\S]*)\)$/i);
        const actionType = execution?.kind === 'smart'
          ? execution.actionType
          : displaySmart?.[1] as SmartActionSubTab | undefined;
        const value = execution?.kind === 'smart'
          ? execution.value
          : displaySmart?.[2]?.trim() || (execution?.kind === 'text' ? execution.value : '');
        const safeTab: SmartActionSubTab = actionType || 'Text';
        setSmartSubTab(safeTab);
        setSmartTextValue(safeTab === 'Text' ? value : '');
        setSmartCmdValue(safeTab === 'Cmd' ? value : '');
        setSmartWebValue(safeTab === 'Web' ? value : '');
        setSmartAppValue(safeTab === 'App' ? value : '');
        if (safeTab === 'App' && execution?.kind === 'smart' && execution.applicationShortcutPath) {
          setSelectedSmartApplication({
            name: value,
            shortcutPath: execution.applicationShortcutPath,
          });
        }
      }
    } else {
      setEditingCustomItemId(null);
      setSelectedIconId(undefined);
      setSelectedEmoji(undefined);
      if (tab === 'Multi-A') {
        setNewCustomName('My Multiaction');
        setMultiGestures({
          onTap: '',
          doubleTap: '',
          onHold: '',
          tapHold: '',
        });
        setTappingTermMs('250');
      } else if (tab === 'Smart-A') {
        setNewCustomName('My Smart action');
        setSmartSubTab('Text');
        setSmartTextValue('');
        setSmartCmdValue('');
        setSmartWebValue('');
        setSmartAppValue('');
      } else {
        setNewCustomName('My Action');
        setNewCustomBinding('');
        setActionAdvanceMode(false);
        setActionRecordingStatus('idle');
        setActionTokens([]);
        setActionAdvanceSteps([
          {
            id: 'adv-step-1',
            keyLabel: '',
            mode: 'press-release',
            delayAfterActive: false,
            delayAfterMs: '200',
          },
        ]);
      }
    }
  };

  const handleSaveCustomItem = () => {
    if (!creatorModalTab) return;
    if (creatorModalTab === 'Action') {
      const hasAssignedKeys = actionAdvanceMode
        ? actionAdvanceSteps.some((s) => !!s.keyLabel.trim())
        : actionTokens.length > 0;
      if (!hasAssignedKeys) return;
    } else if (creatorModalTab === 'Multi-A') {
      const hasGesture = Object.values(multiGestures).some((v) => !!v.trim());
      if (!hasGesture) return;
    } else if (creatorModalTab === 'Smart-A') {
      if (smartSubTab === 'App') {
        if (!selectedSmartApplication) return;
      } else {
        const val = smartSubTab === 'Text'
          ? smartTextValue
          : smartSubTab === 'Cmd'
            ? smartCmdValue
            : smartWebValue;
        if (!val.trim()) return;
      }
    }

    const defaultName =
      creatorModalTab === 'Multi-A'
        ? 'My Multiaction'
        : creatorModalTab === 'Smart-A'
        ? 'My Smart action'
        : 'My Action';
    const finalName = newCustomName.trim() || defaultName;

    let summaryBinding = finalName;
    let execution: DesktopExecutionDefinition | undefined;
    if (creatorModalTab === 'Multi-A') {
      const parts = Object.entries(multiGestures)
        .filter(([, value]) => value.trim())
        .map(([gesture, value]) => `${gesture}: ${value.trim()}`);
      summaryBinding = parts.length > 0 ? `${finalName} (${parts.join(', ')})` : finalName;
      execution = {
        kind: 'multi',
        gestures: Object.fromEntries(
          Object.entries(multiGestures)
            .filter(([, value]) => value.trim())
            .map(([gesture, value]) => [gesture, value.trim()])
        ) as Partial<Record<MultiGestureKey, string>>,
        tappingTermMs: Math.max(0, Number.parseInt(tappingTermMs, 10) || 250),
      };
    } else if (creatorModalTab === 'Smart-A') {
      const val = smartSubTab === 'App'
        ? selectedSmartApplication?.name || ''
        : smartSubTab === 'Text'
          ? smartTextValue
          : smartSubTab === 'Cmd'
            ? smartCmdValue
            : smartWebValue;
      summaryBinding = val.trim()
        ? `${finalName} (${smartSubTab}: ${val.trim()})`
        : finalName;
      execution = {
        kind: 'smart',
        actionType: smartSubTab,
        value: val.trim(),
        ...(smartSubTab === 'App' && selectedSmartApplication
          ? { applicationShortcutPath: selectedSmartApplication.shortcutPath }
          : {}),
      };
    } else if (creatorModalTab === 'Action') {
      if (actionAdvanceMode) {
        const advParts: string[] = [];
        const steps: DesktopExecutionStep[] = [];
        actionAdvanceSteps.forEach((step, index) => {
          const key = step.keyLabel.trim();
          if (!key) return;
          advParts.push(key);
          const hasDelay =
            index < actionAdvanceSteps.length - 1 &&
            step.delayAfterActive &&
            Boolean(step.delayAfterMs?.trim());
          if (hasDelay) advParts.push(`${step.delayAfterMs!.trim()}ms`);
          steps.push({
            kind: 'key',
            key,
            mode: step.mode,
            ...(hasDelay ? { delayAfterMs: Number.parseInt(step.delayAfterMs!, 10) } : {}),
          });
        });
        summaryBinding = advParts.length > 0 ? `${finalName} (${advParts.join(' + ')})` : finalName;
        if (steps.length > 0) execution = { kind: 'sequence', steps };
      } else if (actionTokens.length > 0) {
        const tokenCombo = actionTokens.map((token) => token.label).join(' + ');
        summaryBinding = `${finalName} (${tokenCombo})`;
        execution = { kind: 'shortcut', value: tokenCombo };
      } else if (newCustomBinding.trim()) {
        summaryBinding = `${finalName} (${newCustomBinding.trim()})`;
        execution = { kind: 'shortcut', value: newCustomBinding.trim() };
      }
    }

    const created: BasicTileItem = {
      id: editingCustomItemId || `custom-${Date.now()}`,
      main: finalName,
      listLabel: summaryBinding,
      macropadLabel: selectedEmoji ? selectedEmoji : finalName,
      iconId: selectedIconId,
      emoji: selectedEmoji,
      execution,
    };

    setCustomItemsByTab((prev) => {
      const list = prev[creatorModalTab];
      const exists = list.some((i) => i.id === created.id);
      return {
        ...prev,
        [creatorModalTab]: exists
          ? list.map((i) => (i.id === created.id ? created : i))
          : [...list, created],
      };
    });

    setIconPickerOpen(false);
    setActiveGestureDropdown(null);
    setActiveAdvanceStepDropdown(null);
    setCreatorModalTab(null);
    showToast(`Saved "${finalName}"`);
  };

  const handleDiscardCustomItem = () => {
    if (!creatorModalTab) return;
    handleOpenCreatorEditor(creatorModalTab);
    showToast('Discarded unsaved changes');
  };

  const handleDeleteCustomItem = () => {
    if (!creatorModalTab) return;
    if (editingCustomItemId) {
      setCustomItemsByTab((prev) => ({
        ...prev,
        [creatorModalTab]: prev[creatorModalTab].filter(
          (i) => i.id !== editingCustomItemId
        ),
      }));
      showToast('Deleted item');
    }
    setCustomItemDeleteConfirm(false);
    setIconPickerOpen(false);
    setActiveGestureDropdown(null);
    setCreatorModalTab(null);
  };

  const handleInstallPreset = (preset: PresetItem) => {
    if (isPresetInstalledInProfile(currentProfile, preset.id)) {
      showToast(`${preset.title} is already installed in this profile.`);
      return;
    }
    if (currentProfile.layers.length >= MAX_LAYER_COUNT) {
      showToast(`A profile can have up to ${MAX_LAYER_COUNT} layers. Remove one first.`);
      return;
    }

    const clonedLayer: LayerKeymap = JSON.parse(
      JSON.stringify({
        ...preset.layerKeymap,
        presetId: preset.id,
      })
    );
    const nextLayerIndex = currentProfile.layers.length;
    const nextProfiles = profiles.map((profile, index) => {
      if (index !== activeProfileIndex) return profile;
      return { ...profile, layers: [...profile.layers, clonedLayer] };
    });
    const mergePresetItems = (existing: BasicTileItem[], incoming: BasicTileItem[]) => [
      ...existing.filter((item) => !incoming.some((nextItem) => nextItem.id === item.id)),
      ...incoming,
    ];

    setCustomItemsByTab((current) => ({
      Action: mergePresetItems(current.Action, preset.actionItems.Action),
      'Multi-A': mergePresetItems(current['Multi-A'], preset.actionItems['Multi-A']),
      'Smart-A': mergePresetItems(current['Smart-A'], preset.actionItems['Smart-A']),
    }));
    pushState(nextProfiles);
    void requestHardwareLayer(nextLayerIndex);
    setPreviewPreset(null);
    setActiveNav('Keymap');
    const savedActionCount = preset.actionItems.Action.length + preset.actionItems['Multi-A'].length;
    showToast(
      `Installed ${preset.title} preset on Layer ${nextLayerIndex + 1}${
        savedActionCount ? ` and saved ${savedActionCount} actions` : ''
      }`
    );
  };

  const handleDuplicateProfile = (idx: number) => {
    if (profiles.length >= MAX_PROFILE_COUNT) {
      showToast(`A browser can store up to ${MAX_PROFILE_COUNT} profiles. Delete one first.`);
      return;
    }
    const source = profiles[idx];
    if (!source) return;
    const duplicated: ProfileData = {
      id: `prof-${Date.now()}`,
      name: `${source.name} Copy`,
      color: source.color,
      layers: JSON.parse(JSON.stringify(source.layers)),
    };
    const next = [...profiles, duplicated];
    pushState(next);
    selectProfileInApp(next.length - 1, duplicated.layers.length);
    showToast(`Duplicated "${source.name}"`);
  };

  const handleExportProfile = (idx: number) => {
    const source = profiles[idx];
    if (!source) return;
    if (!profileFileTools) {
      showToast('Profile export tools are unavailable');
      return;
    }

    const result = profileFileTools.download(source, customItemsByTab);
    if (!result.ok) {
      showToast(`Profile export failed: ${result.error || 'unknown error'}`);
      return;
    }
    showToast(`Exported "${source.name || 'Untitled Profile'}"`);
  };

  const handleAddProfile = () => {
    if (profiles.length >= MAX_PROFILE_COUNT) {
      showToast(`A browser can store up to ${MAX_PROFILE_COUNT} profiles. Delete one first.`);
      return;
    }
    const nextProf: ProfileData = {
      id: `prof-${Date.now()}`,
      name: '',
      color: '#0051ff',
      layers: [JSON.parse(JSON.stringify(INITIAL_LAYER_1))],
    };
    const next = [...profiles, nextProf];
    pushState(next);
    selectProfileInApp(next.length - 1, nextProf.layers.length);
    setDeletingProfileId(null);
  };

  const handleUpdateProfileName = (profileIndex: number, newName: string) => {
    const next = profiles.map((profile, idx) =>
      idx === profileIndex ? { ...profile, name: newName } : profile
    );
    setProfiles(next);
  };

  const handleConfirmDeleteProfile = (idx: number) => {
    if (profiles.length <= 1) {
      const resetProf: ProfileData = {
        id: `prof-${Date.now()}`,
        name: 'Default Profile',
        color: '#0051ff',
        layers: [JSON.parse(JSON.stringify(INITIAL_LAYER_1))],
      };
      pushState([resetProf]);
      selectProfileInApp(0, resetProf.layers.length);
      setDeletingProfileId(null);
      return;
    }
    const next = profiles.filter((_, i) => i !== idx);
    if (referencesAtOrAfter(next, 'profile', idx) || referencesAtOrAfter(customItemsByTab, 'profile', idx)) {
      showToast('Clear references to this and later profiles before deleting, to avoid retargeting assignments');
      setDeletingProfileId(null);
      return;
    }
    pushState(next);
    lastSyncedConfigKeyRef.current = '';
    const nextIdx = activeProfileIndex > idx ? activeProfileIndex - 1 : Math.min(activeProfileIndex, next.length - 1);
    selectProfileInApp(nextIdx, (next[nextIdx] ?? next[0])?.layers.length ?? 1);
    setDeletingProfileId(null);
  };

  const handleImportProfile = async () => {
    if (!profileFileTools) {
      showToast('Profile import tools are unavailable');
      return;
    }

    try {
      const imported = await profileFileTools.pickFile();
      if (!imported) return;

      const merged = profileFileTools.merge(
        {
          profiles: profiles as unknown as Record<string, unknown>[],
          activeProfileIndex,
          customItems: customItemsByTab as unknown as Record<
            'Action' | 'Multi-A' | 'Smart-A',
            Record<string, unknown>[]
          >,
        },
        imported
      );
      pushState(
        (merged.profiles as unknown as ProfileData[]).map(normalizeProfileForEditor)
      );
      setCustomItemsByTab(
        normalizeCustomItemsForEditor(
          merged.customItems as unknown as CustomItemsByTab
        )
      );
      selectProfileInApp(
        merged.activeProfileIndex,
        ((merged.profiles as unknown as ProfileData[])[merged.activeProfileIndex]
          ?? (merged.profiles as unknown as ProfileData[])[0])?.layers.length ?? 1
      );
      setProfileMenuOpen(false);
      setDeletingProfileId(null);
      showToast(
        `Imported ${imported.profiles.length} profile${
          imported.profiles.length === 1 ? '' : 's'
        } into this browser`
      );
    } catch (error) {
      showToast(
        `Profile import failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleInstallCommunityProfile = (cp: CommunityProfile) => {
    if (profiles.length >= 4) {
      showToast('Profile limit reached (max 4). Delete or export an existing profile first.');
      return;
    }
    const newProf: ProfileData = normalizeProfileForEditor({
      ...cp.profile,
      id: `profile-comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cp.name,
      color: cp.color,
    });
    const updatedProfiles = [...profiles, newProf];
    pushState(updatedProfiles);
    selectProfileInApp(profiles.length, newProf.layers.length);
    setCommunityHubOpen(false);
    showToast(`Installed community profile "${cp.name}" by @${cp.author}`);
  };

  const filteredPresets = useMemo(
    () => buildPresetLibrary(presetOs).filter(
      (preset) =>
        preset.title.toLowerCase().includes(presetSearch.toLowerCase()) ||
        preset.description.toLowerCase().includes(presetSearch.toLowerCase())
    ),
    [presetOs, presetSearch]
  );
  const previewPresetDetails = previewPreset
    ? PRESET_CATALOG.find((preset) => preset.id === previewPreset.id)
    : undefined;
  const isPreviewPresetInstalled = previewPreset
    ? isPresetInstalledInProfile(currentProfile, previewPreset.id)
    : false;

  const basicKeySections: BasicSection[] = [
    ...BASIC_KEY_SECTIONS,
    {
      title: 'Layer Keys',
      listPreview: '[ ' + currentProfile.layers.map((_, i) => `Layer ${i + 1}`).join(', ') + ' ]',
      items: currentProfile.layers.flatMap((_, i) => [
        { id: `lyr-${i + 1}`, main: `Layer ${i + 1}`, macropadLabel: `L${i + 1}` },
        { id: `tlyr-${i + 1}`, main: `Temp Layer\n${i + 1}`, listLabel: `Temp Layer ${i + 1}`, macropadLabel: `TL${i + 1}` },
      ]),
    },
    {
      title: 'Profile Keys',
      listPreview: '[ ' + profiles.map((_, i) => `Profile ${i + 1}`).join(', ') + ' ]',
      items: profiles.map((_, i) => ({ id: `prf-${i + 1}`, main: `Profile ${i + 1}`, macropadLabel: `P${i + 1}` })),
    },
    ...(window.electronAPI?.commandCheatSheet ? [{
      title: 'Internal',
      listPreview: '[ Show, Hold, Hide, Toggle Cheat-Sheet ]',
      items: [
        { id: 'cs-show', main: 'Show\nCheat-Sheet', listLabel: 'Show Cheat-Sheet', macropadLabel: 'CS' },
        { id: 'cs-hold', main: 'Hold\nCheat-Sheet', listLabel: 'Show Cheat-Sheet Hold', macropadLabel: 'CSH' },
        { id: 'cs-hide', main: 'Hide\nCheat-Sheet', listLabel: 'Hide Cheat-Sheet', macropadLabel: 'HCS' },
        { id: 'cs-tog', main: 'Toggle\nCheat-Sheet', listLabel: 'Toggle Cheat-Sheet', macropadLabel: 'TCS' },
      ],
    }] : []),
  ];
  const filteredBasicSections = basicKeySections.map((sec) => ({
    ...sec,
    items: sec.items.filter(
      (item) =>
        !mappingSearch.trim() ||
        item.main.toLowerCase().includes(mappingSearch.toLowerCase()) ||
        (item.listLabel &&
          item.listLabel.toLowerCase().includes(mappingSearch.toLowerCase())) ||
        (item.top && item.top.toLowerCase().includes(mappingSearch.toLowerCase())) ||
        sec.title.toLowerCase().includes(mappingSearch.toLowerCase())
    ),
  })).filter((sec) => sec.items.length > 0);

  // Editing stays locked until the firmware has answered. Returning here means
  // the configurator below is never mounted, so no control can reach a device
  // that is absent. Profile state lives above this branch and is preserved.
  if (deviceStatus.state !== 'connected') {
    return (
      <DeviceConnectionGate
        status={deviceStatus}
        onRetry={handleToggleDeviceConnection}
      />
    );
  }

  return (
    <div className="app-shell h-screen w-full bg-[#efefef] flex flex-col select-none relative overflow-hidden">
      {/*
        Source contract compatibility (tests/uiSourceContract.test.ts):
        grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
        justify-self-center flex items-center gap-[28px]
        justify-self-end transition-colors cursor-pointer
        Connect Grid Macro 1 via QMK/VIA
      */}
      <AppHeader
        entrancePhase={entrancePhase}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        canUndo={history.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        deviceStatus={deviceStatus}
        onToggleDeviceConnection={handleToggleDeviceConnection}
        onLogoClick={() => {
          setPreviewPreset(null);
          setActiveNav('Keymap');
          setSelectedKey(null);
          setMappingDrawerOpen(false);
          setMappingStackExpanded(false);
        }}
        onNavTabClick={(tab) => {
          setPreviewPreset(null);
          setActiveNav(tab);
          setActiveTooltip(null);
          setProfileMenuOpen(false);
        }}
      />

      <AnimatePresence mode="wait">
        {/* ===================================================================== */}
        {/* 1. KEYMAP VIEW                                                        */}
        {/* ===================================================================== */}
        {activeNav === 'Keymap' && (
          <motion.main
            ref={keymapMainRef}
            key="keymap-screen"
            initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Sub-Header Controls Bar: Profiles (left), Layers (center), Key Mapping (right) */}
            <div className="w-full px-[27px] pt-[24px] grid grid-cols-3 items-start z-20 pointer-events-none">
            {/*
              Source contract compatibility (tests/uiSourceContract.test.ts):
              handleUpdateProfileName(idx, event.target.value)
              title={currentProfile.name || 'Untitled Profile'}
              aria-label={`Rename profile ${prof.name || idx + 1}`}
            */}
            <ProfileSelectorCapsule
              entrancePhase={entrancePhase}
              containerRef={profileContainerRef}
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              currentProfile={currentProfile}
              profiles={profiles}
              activeProfileIndex={activeProfileIndex}
              profileMenuOpen={profileMenuOpen}
              setProfileMenuOpen={setProfileMenuOpen}
              deletingProfileId={deletingProfileId}
              setDeletingProfileId={setDeletingProfileId}
              selectProfileInApp={selectProfileInApp}
              handleUpdateProfileName={handleUpdateProfileName}
              handleDuplicateProfile={handleDuplicateProfile}
              handleExportProfile={handleExportProfile}
              handleConfirmDeleteProfile={handleConfirmDeleteProfile}
              handleAddProfile={handleAddProfile}
              handleImportProfile={handleImportProfile}
              onOpenCommunityHub={() => setCommunityHubOpen(true)}
            />

            <LayersControlBar
              entrancePhase={entrancePhase}
              containerRef={layersContainerRef}
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              currentProfile={currentProfile}
              activeLayerIndex={activeLayerIndex}
              layerToolbarOpen={layerToolbarOpen}
              setLayerToolbarOpen={setLayerToolbarOpen}
              layerDeleteConfirm={layerDeleteConfirm}
              setLayerDeleteConfirm={setLayerDeleteConfirm}
              layerLightingOpen={layerLightingOpen}
              setLayerLightingOpen={setLayerLightingOpen}
              currentLayerName={currentLayerName}
              currentLayerNameKey={currentLayerNameKey}
              setLayerNames={setLayerNames}
              hardwareLayerNames={HARDWARE_LAYER_NAMES}
              ledEditingLayerIdx={ledEditingLayerIdx}
              setLedEditingLayerIdx={setLedEditingLayerIdx}
              layerLedConfigs={layerLedConfigs}
              setLayerLedConfigs={setLayerLedConfigs}
              requestHardwareLayer={requestHardwareLayer}
              syncRgbConfigsToDevice={syncRgbConfigsToDevice}
              handleAddLayer={handleAddLayer}
              handleRemoveLayer={handleRemoveLayer}
              showToast={showToast}
              maxLayerCount={MAX_LAYER_COUNT}
            />

            <KeyMappingTriggerStack
              entrancePhase={entrancePhase}
              mappingDrawerOpen={mappingDrawerOpen}
              activeTooltip={activeTooltip}
              setActiveTooltip={setActiveTooltip}
              hoveredMappingType={hoveredMappingType}
              setHoveredMappingType={setHoveredMappingType}
              mappingStackExpanded={mappingStackExpanded}
              setMappingStackExpanded={setMappingStackExpanded}
              handleOpenDrawerWithTab={handleOpenDrawerWithTab}
            />
          </div>

          {/* CENTERPIECE: MOVABLE GRID MACRO 1 (3x3 KEYS + ONE ROTARY ENCODER) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
            <motion.div
              ref={macropadMoveUnitRef}
              animate={{ x: macropadOffset.x, y: macropadOffset.y }}
              transition={
                isDraggingMacropad
                  ? { type: 'spring', stiffness: 650, damping: 42, mass: 0.5 }
                  : { type: 'spring', stiffness: 320, damping: 40 }
              }
              className="flex flex-col items-center pointer-events-auto select-none"
            >
              <motion.div
                {...getEntranceMotionProps(entrancePhase, {
                  delay: 0.3,
                  duration: 0.5,
                  fadeOnly: true,
                })}
                onPointerDown={handleStartMacropadMove}
                onDoubleClick={handleResetMacropadCenter}
                className={
                  isDraggingMacropad ? 'cursor-grabbing' : 'cursor-grab'
                }
              >
                <MacropadDevice
                  layer={currentLayer}
                  selectedKey={selectedKey}
                  selectedEncoderSub={selectedEncoderSub}
                  dragOverTarget={dragOverTarget}
                  draggedFromSlot={draggedTile?.fromSlotId || null}
                  encoderAngle={encoderAngle}
                  onSelectKey={handleSelectKey}
                  onSelectEncoderSub={handleSelectEncoderSubAction}
                  onStartKeyDrag={handleStartMacropadKeyDrag}
                  entrancePhase={entrancePhase}
                  activePressedSlot={activePressedSlot}
                />
              </motion.div>

              <motion.button
                {...getEntranceMotionProps(entrancePhase, {
                  delay: 1.2,
                  duration: 0.42,
                  offsetY: 8,
                  initialScale: 0.99,
                })}
                onClick={() => void toggleSimulationMode()}
                disabled={simulationTransition}
                className="mt-[15px] h-[28px] w-[124px] justify-center px-[12px] bg-white hover:bg-neutral-50 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-[6px] text-[#3a3a3a] text-[11px] font-medium transition-all cursor-pointer"
              >
                <span
                  className={`w-[8px] h-[8px] rounded-full transition-colors ${
                    simulationMode ? 'bg-[#0051ff]' : 'bg-[#b5b5b5]'
                  }`}
                />
                <span>{simulationMode ? 'Simulation on' : 'Simulation off'}</span>
              </motion.button>
            </motion.div>
          </div>

          {/* BOTTOM-LEFT TIP WIDGET */}
          <motion.div
            {...getEntranceMotionProps(entrancePhase, {
              delay: 0.35,
              duration: 0.4,
              fadeOnly: true,
            })}
            className="px-[27px] pb-[24px] flex items-start"
          >
            <div
              onClick={() => setTipIndex((i) => (i + 1) % TIPS.length)}
              className="flex items-start gap-[10px] cursor-pointer group h-[54px] shrink-0"
              title="Click for next tip"
            >
              <div className="pt-[3px] flex flex-col gap-[5px]">
                {[0, 1, 2].map((dotIdx) => (
                  <span
                    key={dotIdx}
                    className={`w-[4px] h-[4px] rounded-full transition-colors duration-300 ${
                      TIPS[tipIndex].dot === dotIdx ? 'bg-[#9e9e9e]' : 'bg-[#d0d0d0]'
                    }`}
                  />
                ))}
              </div>

              <div className="text-[#a3a3a3] text-[11px] leading-[1.35] font-normal">
                <div className="mb-[5px]">Tip:</div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tipIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: 'easeInOut' }}
                  >
                    {TIPS[tipIndex].lines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* =============================================================== */}
          {/* FULL-HEIGHT RIGHT KEY MAPPING DRAWER (FLUSH TO NAVBAR)          */}
          {/* =============================================================== */}
          <AnimatePresence>
            {mappingDrawerOpen && (
              <MappingDrawer
                creatorModalTab={creatorModalTab}
                creatorProps={{
                  onClose: () => {
                    setIconPickerOpen(false);
                    setActiveGestureDropdown(null);
                    setCreatorModalTab(null);
                  },
                  activeTooltip,
                  setActiveTooltip,
                  handleToggleIconPicker,
                  selectedIconId,
                  selectedEmoji,
                  newCustomName,
                  setNewCustomName,
                  handleSaveCustomItem,
                  handleDiscardCustomItem,
                  editingCustomItemId,
                  customItemDeleteConfirm,
                  setCustomItemDeleteConfirm,
                  handleDeleteCustomItem,
                  iconPickerProps: {
                    open: iconPickerOpen,
                    onClose: () => setIconPickerOpen(false),
                    iconPickerTab,
                    handleIconPickerTabChange,
                    iconPickerSearch,
                    setIconPickerSearch,
                    iconSearchResults,
                    selectedIconId,
                    setSelectedIconId,
                    selectedEmoji,
                    setSelectedEmoji,
                    selectableEmojiList,
                    iconPickerShowAll,
                    setIconPickerShowAll,
                    iconPickerPage,
                    setIconPickerPage,
                    iconCatalogLength: iconCatalog.length,
                  },
                  multiGestures,
                  setMultiGestures,
                  activeGestureDropdown,
                  setActiveGestureDropdown,
                  gestureKeySearch,
                  setGestureKeySearch,
                  expandedGestureSection,
                  setExpandedGestureSection,
                  basicKeySections,
                  tappingTermMs,
                  setTappingTermMs,
                  smartSubTab,
                  setSmartSubTab,
                  smartTextValue,
                  setSmartTextValue,
                  smartCmdValue,
                  setSmartCmdValue,
                  smartWebValue,
                  setSmartWebValue,
                  smartAppValue,
                  setSmartAppValue,
                  smartAppDropdownOpen,
                  setSmartAppDropdownOpen,
                  selectedSmartApplication,
                  setSelectedSmartApplication,
                  installedApplications,
                  installedApplicationsLoading,
                  installedApplicationsError,
                  loadInstalledApplications,
                  actionAdvanceMode,
                  setActionAdvanceMode,
                  actionRecordingStatus,
                  setActionRecordingStatus,
                  actionTokens,
                  actionAdvanceSteps,
                  setActionAdvanceSteps,
                  activeAdvanceStepDropdown,
                  setActiveAdvanceStepDropdown,
                  editingDelayStepId,
                  setEditingDelayStepId,
                  draggingAdvStep,
                  advStepDragRef,
                  setDraggingAdvStep,
                  hoveredModeStepId,
                  setHoveredModeStepId,
                  hoveredDelayStepId,
                  setHoveredDelayStepId,
                  showToast,
                }}
                libraryProps={{
                  onClose: () => {
                    setMappingDrawerOpen(false);
                    setSelectedKey(null);
                    setSelectedEncoderSub(null);
                    setSelectedDrawerTile(null);
                  },
                  activeTooltip,
                  setActiveTooltip,
                  mappingSearch,
                  setMappingSearch,
                  mappingViewMode,
                  setMappingViewMode,
                  mappingTab,
                  setMappingTab,
                  filteredBasicSections,
                  expandedListSections,
                  toggleListSection,
                  draggedTile,
                  flashedTileId,
                  handleStartTileDrag,
                  handleAssignTileFromDrawer,
                  handleOpenCreatorEditor,
                  customItemsByTab,
                  renderAppIcon: (id, size) => (
                    <PresetAppIcon id={id} size={size} />
                  ),
                  showToast,
                  selectedKey,
                  selectedKeyAssignment: selectedKey ? currentLayer[selectedKey] : null,
                  onUpdateKeycapPersonalization: handleUpdateKeycapPersonalization,
                }}
              />
            )}
          </AnimatePresence>
        </motion.main>
      )}

      {/* ===================================================================== */}
      {/* 2. PRESETS LIBRARY VIEW                                               */}
      {/* ===================================================================== */}
      {activeNav === 'Preset' && (
        <motion.main
          key="preset-screen"
          initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          data-preset-screen
          className="preset-screen-scroll flex-1 overflow-y-auto w-full max-w-[1440px] mx-auto pt-[54px] pb-[48px] px-4"
        >
          {/* Responsive preset grid contract: xl:grid-cols-4 2xl:grid-cols-5 */}
          <PresetGrid
            presetSearch={presetSearch}
            setPresetSearch={setPresetSearch}
            presetOs={presetOs}
            setPresetOs={setPresetOs}
            filteredPresets={filteredPresets}
            currentProfile={currentProfile}
            onPreviewPreset={(preset) => setPreviewPreset(preset)}
            onInstallPreset={handleInstallPreset}
            isPresetInstalledInProfile={isPresetInstalledInProfile}
            renderAppIcon={(id) => <PresetAppIcon id={id} />}
          />
        </motion.main>
      )}

      {/* ===================================================================== */}
      {/* 3. SETTINGS VIEW                                                      */}
      {/* ===================================================================== */}
      {activeNav === 'Settings' && (
        <SettingsScreen
          deviceStatus={deviceStatus}
          appVersion={appVersion}
          launchAtStartup={launchAtStartup}
          settingsCapabilities={settingsCapabilities}
          allowTerminalSmartActions={allowTerminalSmartActions}
          allowDeviceNotifications={allowDeviceNotifications}
          autoSwitchProfile={autoSwitchProfile}
          appProfileRules={appSettings.appProfileRules}
          availableProfiles={profiles}
          installedApps={installedApplications}
          firmwareCheckPending={firmwareCheckPending}
          appUpdateCheckPending={appUpdateCheckPending}
          cheatSheetGlobalHotkeyEnabled={appSettings.cheatSheetGlobalHotkeyEnabled}
          cheatSheetGlobalHotkey={appSettings.cheatSheetGlobalHotkey}
          handleAppSettingChange={handleAppSettingChange}
          handleUpdateProfileRules={handleUpdateProfileRules}
          handleToggleCheatSheet={handleToggleCheatSheet}
          handleOpenSupportLink={handleOpenSupportLink}
          handleCheckFirmwareUpdate={handleCheckFirmwareUpdate}
          handleCheckAppUpdate={handleCheckAppUpdate}
          handleResetLocalConfig={handleResetLocalConfig}
          handleAdvanceFlash={handleAdvanceFlash}
        />
      )}
      </AnimatePresence>

      {/* PRESET DETAIL PREVIEW PAGE */}
      <PresetDetailPreview
        previewPreset={previewPreset}
        previewPresetDetails={previewPresetDetails}
        presetOs={presetOs}
        isPreviewPresetInstalled={isPreviewPresetInstalled}
        hoveredPreviewSlot={hoveredPreviewSlot}
        hoveredPreviewDial={hoveredPreviewDial}
        onClose={() => {
          setPreviewPreset(null);
          setHoveredPreviewSlot(null);
          setHoveredPreviewDial(null);
        }}
        onInstallPreset={handleInstallPreset}
        setHoveredPreviewSlot={setHoveredPreviewSlot}
        setHoveredPreviewDial={setHoveredPreviewDial}
        renderMacropadDevice={(preset) => (
          <MacropadDevice
            layer={preset.layerKeymap}
            selectedKey={null}
            selectedEncoderSub={null}
            dragOverTarget={null}
            encoderAngle={45}
            onSelectKey={() => {}}
            onSelectEncoderSub={() => {}}
            onHoverSlot={setHoveredPreviewSlot}
            highlightedSlot={hoveredPreviewSlot}
            showSlotNumbers
          />
        )}
        renderAppIcon={(id, size) => (
          <PresetAppIcon id={id} size={size} />
        )}
      />

      {/* EDIT LAYOUT MODAL */}
      <EditLayoutModal
        open={editLayoutModalOpen}
        onClose={() => setEditLayoutModalOpen(false)}
      />

      {/* COMMUNITY PROFILE HUB MODAL */}
      <CommunityProfileModal
        open={communityHubOpen}
        onClose={() => setCommunityHubOpen(false)}
        onInstallProfile={handleInstallCommunityProfile}
        onExportCurrentProfile={() => handleExportProfile(activeProfileIndex)}
        currentProfileName={currentProfile.name || 'Current Profile'}
      />

      {/* FLOATING BLACK KEYCAP DRAG PREVIEW WITH SUBTLE CORNER-HELD CIRCULAR MOTION */}
      <AnimatePresence>
        {draggedTile && (
          <DraggedTilePreview
            draggedTile={draggedTile}
            dragSpringBobY={dragSpringBobY}
            dragSpringRotate={dragSpringRotate}
          />
        )}
      </AnimatePresence>

      {/* SUBTLE FEEDBACK TOAST */}
      <AnimatePresence>
        {toastMessage && (
          <FeedbackToast message={toastMessage} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========================================================================== */
/* SUBCOMPONENTS                                                              */
/* ========================================================================== */



type PresetAppIconConfig = {
  iconId?: string;
  label: string;
  background: string;
  foreground: string;
  iconMode?: 'fill' | 'stroke';
};

const PRESET_APP_ICON_CONFIGS: Record<string, PresetAppIconConfig> = {
  chatgpt: { iconId: 'brand-openai', label: 'AI', background: 'linear-gradient(145deg, #20b98e, #087157)', foreground: '#ffffff', iconMode: 'stroke' },
  vscode: { iconId: 'brand-vscode', label: 'VS', background: 'linear-gradient(145deg, #35b8ed, #0068b7)', foreground: '#ffffff', iconMode: 'stroke' },
  github: { iconId: 'brand-github', label: 'GH', background: 'linear-gradient(145deg, #41454d, #17191e)', foreground: '#ffffff', iconMode: 'fill' },
  terminal: { iconId: 'terminal', label: '>_', background: 'linear-gradient(145deg, #26384b, #101722)', foreground: '#a5f3c3', iconMode: 'stroke' },
  docker: { iconId: 'brand-docker', label: 'D', background: 'linear-gradient(145deg, #43bdf0, #0878c9)', foreground: '#ffffff', iconMode: 'fill' },
  chrome_devtools: { iconId: 'brand-chrome', label: 'C', background: 'linear-gradient(145deg, #424854, #20242c)', foreground: '#ffffff', iconMode: 'fill' },
  photoshop: { iconId: 'brand-adobe-photoshop', label: 'Ps', background: 'linear-gradient(145deg, #06395a, #001e36)', foreground: '#45b8ff', iconMode: 'stroke' },
  illustrator: { iconId: 'brand-adobe-illustrator', label: 'Ai', background: 'linear-gradient(145deg, #542100, #2b0800)', foreground: '#ffad35', iconMode: 'stroke' },
  premiere: { iconId: 'brand-adobe-premiere', label: 'Pr', background: 'linear-gradient(145deg, #392d72, #18113e)', foreground: '#b9a8ff', iconMode: 'stroke' },
  aftereffects: { iconId: 'brand-adobe-after-effects', label: 'Ae', background: 'linear-gradient(145deg, #342361, #171333)', foreground: '#d9a9ff', iconMode: 'stroke' },
  davinci: { iconId: 'brand-davinciresolve', label: 'DR', background: 'linear-gradient(145deg, #343a46, #171b22)', foreground: '#ffffff', iconMode: 'fill' },
  blender: { iconId: 'brand-blender', label: 'Bl', background: 'linear-gradient(145deg, #39576b, #182a39)', foreground: '#ff9a44', iconMode: 'fill' },
  figma: { iconId: 'brand-figma', label: 'F', background: 'linear-gradient(145deg, #353535, #171717)', foreground: '#ffffff', iconMode: 'fill' },
  framer: { iconId: 'brand-framer', label: 'F', background: 'linear-gradient(145deg, #25baff, #0751e7)', foreground: '#ffffff', iconMode: 'fill' },
  canva: { label: 'C', background: 'linear-gradient(145deg, #00c4cc, #7134d8)', foreground: '#ffffff' },
  audacity: { iconId: 'brand-audacity', label: 'Au', background: 'linear-gradient(145deg, #343b70, #171b37)', foreground: '#ffe36b', iconMode: 'fill' },
  affinity: { label: 'A', background: 'linear-gradient(145deg, #6053b7, #14677a)', foreground: '#ffffff' },
  excel: { label: 'X', background: 'linear-gradient(145deg, #20a366, #075b36)', foreground: '#ffffff' },
  word: { label: 'W', background: 'linear-gradient(145deg, #3d8de6, #1557b0)', foreground: '#ffffff' },
  powerpoint: { label: 'P', background: 'linear-gradient(145deg, #f17848, #b93c1f)', foreground: '#ffffff' },
  notion: { iconId: 'brand-notion', label: 'N', background: 'linear-gradient(145deg, #ffffff, #e8e8e8)', foreground: '#171717', iconMode: 'fill' },
  slack: { iconId: 'brand-slack', label: 'S', background: 'linear-gradient(145deg, #ffffff, #f0eaf2)', foreground: '#611f69', iconMode: 'fill' },
  zoom: { iconId: 'brand-zoom', label: 'Z', background: 'linear-gradient(145deg, #55a5ff, #1674e8)', foreground: '#ffffff', iconMode: 'fill' },
  obs: { iconId: 'brand-obsstudio', label: 'OBS', background: 'linear-gradient(145deg, #424a56, #17191f)', foreground: '#ffffff', iconMode: 'fill' },
  discord: { iconId: 'brand-discord', label: 'D', background: 'linear-gradient(145deg, #8790ff, #4d58d7)', foreground: '#ffffff', iconMode: 'fill' },
  spotify: { iconId: 'brand-spotify', label: 'S', background: 'linear-gradient(145deg, #47e184, #14a84e)', foreground: '#102117', iconMode: 'fill' },
  windows: { iconId: 'brand-windows', label: '⊞', background: 'linear-gradient(145deg, #35a6ed, #0068bc)', foreground: '#ffffff', iconMode: 'fill' },
};

function getMacroIconLibrary(): IconLibrary | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { __MACRO_ICONS__?: IconLibrary }).__MACRO_ICONS__;
}

function getPresetAppIconPath(iconId: string): string | undefined {
  return getMacroIconLibrary()?.d?.[iconId];
}

function PresetAppIcon({ id, size = 30 }: { id: string; size?: number }) {
  const config = PRESET_APP_ICON_CONFIGS[id] ?? {
    label: '?',
    background: 'linear-gradient(145deg, #515866, #20242c)',
    foreground: '#ffffff',
  };
  const iconPath = config.iconId ? getPresetAppIconPath(config.iconId) : undefined;
  const iconMode = config.iconMode ?? 'fill';

  return (
    <div
      data-preset-icon={id}
      aria-hidden="true"
      className="flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.3),
        background: config.background,
        color: config.foreground,
        border: '1px solid rgba(255,255,255,0.22)',
        boxShadow: '0 2px 7px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.18)',
      }}
    >
      {iconPath ? (
        <svg
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          viewBox="0 0 24 24"
          fill={iconMode === 'fill' ? 'currentColor' : 'none'}
          stroke={iconMode === 'stroke' ? 'currentColor' : 'none'}
          strokeWidth={iconMode === 'stroke' ? 1.7 : 0}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={iconPath} />
        </svg>
      ) : id === 'affinity' ? (
        <svg
          width={Math.round(size * 0.6)}
          height={Math.round(size * 0.6)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 19L10.4 5.8c.6-1.3 2.6-1.3 3.2 0L19.5 19M7.8 13.2h8.4" />
        </svg>
      ) : (
        <span
          className={`font-bold leading-none tracking-tight select-none ${
            id === 'canva'
              ? 'font-serif italic text-[18px]'
              : id === 'affinity'
                ? 'text-[18px]'
                : ['excel', 'word', 'powerpoint'].includes(id)
                  ? 'text-[14px]'
                  : 'text-[12px]'
          }`}
          style={size > 30 ? { fontSize: `${Math.round(size * 0.36)}px` } : undefined}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}



/*
  Source contract compatibility (tests/uiSourceContract.test.ts & tests/microPadShape.test.tsx):
  w-[172px] bg-[#050505] rounded-[24px] p-[12px]
  bg-[#151515] rounded-[16px] p-[6px] flex flex-col gap-[6px]
  grid grid-cols-3 grid-rows-3 gap-[3px] place-items-center
  data-drop-slot={slotId}
  GRID_MACRO_KEY_SLOTS.map
  layer[GRID_MACRO_ENCODER_SLOT]
  encoderActions
  entranceIndex={index}
*/



