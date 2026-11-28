import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, ChevronDown, ChevronUp, X } from 'lucide-react';
import { InfoCircleIcon } from './UiIcons';
import { CustomPickerIcon } from './CustomPickerIcon';
import { IconPickerPopover, type IconPickerPopoverProps } from './IconPickerPopover';
import { SettingsSwitch } from './SettingsSwitch';
import type { InstalledApplication } from '../appSettings';
import type { MultiGestureKey } from '../actionExecution';
import type { MappingTabId } from '../presetLibrary';
import type { BasicSection } from './ActionLibrarySidebar';
import { openSupportLink } from '../appSettings';

export interface ActionAdvanceStep {
  id: string;
  keyLabel: string;
  mode: 'press-release' | 'press';
  delayAfterActive?: boolean;
  delayAfterMs?: string;
}

export interface ActionCreatorDrawerProps {
  creatorModalTab: Exclude<MappingTabId, 'Basic'>;
  onClose: () => void;
  activeTooltip: string | null;
  setActiveTooltip: (tooltip: 'drawer-mapping' | null) => void;
  handleToggleIconPicker: () => Promise<void> | void;
  selectedIconId?: string;
  selectedEmoji?: string;
  newCustomName: string;
  setNewCustomName: (name: string) => void;
  handleSaveCustomItem: () => void;
  handleDiscardCustomItem: () => void;
  editingCustomItemId: string | null;
  customItemDeleteConfirm: boolean;
  setCustomItemDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteCustomItem: () => void;
  iconPickerProps: IconPickerPopoverProps;

  // Multi-Action
  multiGestures: Record<MultiGestureKey, string>;
  setMultiGestures: React.Dispatch<React.SetStateAction<Record<MultiGestureKey, string>>>;
  activeGestureDropdown: MultiGestureKey | null;
  setActiveGestureDropdown: (gesture: MultiGestureKey | null) => void;
  gestureKeySearch: string;
  setGestureKeySearch: (search: string) => void;
  expandedGestureSection: string | null;
  setExpandedGestureSection: (section: string | null) => void;
  basicKeySections: BasicSection[];
  tappingTermMs: string;
  setTappingTermMs: (term: string) => void;

  // Smart-Action
  smartSubTab: 'Text' | 'Cmd' | 'Web' | 'App';
  setSmartSubTab: (tab: 'Text' | 'Cmd' | 'Web' | 'App') => void;
  smartTextValue: string;
  setSmartTextValue: (val: string) => void;
  smartCmdValue: string;
  setSmartCmdValue: (val: string) => void;
  smartWebValue: string;
  setSmartWebValue: (val: string) => void;
  smartAppValue: string;
  setSmartAppValue: (val: string) => void;
  smartAppDropdownOpen: boolean;
  setSmartAppDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSmartApplication: InstalledApplication | null;
  setSelectedSmartApplication: (app: InstalledApplication | null) => void;
  installedApplications: InstalledApplication[];
  installedApplicationsLoading: boolean;
  installedApplicationsError: string | null;
  loadInstalledApplications: () => Promise<void>;

  // Action
  actionAdvanceMode: boolean;
  setActionAdvanceMode: React.Dispatch<React.SetStateAction<boolean>>;
  actionRecordingStatus: 'idle' | 'recording' | 'confirmed';
  setActionRecordingStatus: React.Dispatch<React.SetStateAction<'idle' | 'recording' | 'confirmed'>>;
  actionTokens: { id: string; label: string; kind: 'text' | 'modifier' | 'special' }[];
  actionAdvanceSteps: ActionAdvanceStep[];
  setActionAdvanceSteps: React.Dispatch<React.SetStateAction<ActionAdvanceStep[]>>;
  activeAdvanceStepDropdown: string | null;
  setActiveAdvanceStepDropdown: (id: string | null) => void;
  editingDelayStepId: string | null;
  setEditingDelayStepId: React.Dispatch<React.SetStateAction<string | null>>;
  draggingAdvStep: { id: string; offsetY: number } | null;
  advStepDragRef: React.MutableRefObject<{ id: string; startY: number } | null>;
  setDraggingAdvStep: React.Dispatch<React.SetStateAction<{ id: string; offsetY: number } | null>>;
  hoveredModeStepId: string | null;
  setHoveredModeStepId: React.Dispatch<React.SetStateAction<string | null>>;
  hoveredDelayStepId: string | null;
  setHoveredDelayStepId: React.Dispatch<React.SetStateAction<string | null>>;
  showToast: (msg: string) => void;
}

export function ActionCreatorDrawer({
  creatorModalTab,
  onClose,
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
  iconPickerProps,
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
}: ActionCreatorDrawerProps) {
  const filteredInstalledApplications = React.useMemo(() => {
    const query = smartAppValue.trim().toLocaleLowerCase();
    return installedApplications.filter((application) =>
      application.name.toLocaleLowerCase().includes(query)
    );
  }, [installedApplications, smartAppValue]);

  return (
    <motion.div
      key={`creator-editor-${creatorModalTab}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.26, ease: 'easeInOut' }}
      className="flex-1 flex flex-col overflow-y-auto px-[15px] pt-[18px] pb-[16px] relative"
    >
      {/* Top Header: <- (left) | Title (i) (center) */}
      <div className="flex items-center justify-between shrink-0 mb-[16px] relative">
        <button
          onClick={onClose}
          aria-label="Back to Key Mapping"
          className="w-6 h-6 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M13 8H3M3 8L7 4M3 8L7 12" />
          </svg>
        </button>

        <div className="flex items-center gap-[5px] text-[#555555] text-[12.5px] font-medium">
          <span>
            {creatorModalTab === 'Multi-A'
              ? 'Multi Action editing'
              : 'Action editing'}
          </span>
          <button
            onMouseEnter={() => setActiveTooltip('drawer-mapping')}
            onMouseLeave={() => setActiveTooltip(null)}
            onClick={() =>
              setActiveTooltip(
                activeTooltip === 'drawer-mapping' ? null : 'drawer-mapping'
              )
            }
            className="text-[#666666] hover:text-[#222] cursor-pointer"
          >
            <InfoCircleIcon />
          </button>
        </div>

        <div className="w-6" />

        <AnimatePresence>
          {activeTooltip === 'drawer-mapping' && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
              className="absolute top-[28px] right-[4px] w-[226px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-50 pointer-events-none"
            >
              <div className="text-[13px] font-semibold text-[#5e5e5e] mb-[7px]">
                {creatorModalTab === 'Multi-A'
                  ? 'Multi Action editing'
                  : 'Action editing'}
              </div>
              <p className="text-[11px] leading-[1.36] text-[#686868]">
                {creatorModalTab === 'Multi-A'
                  ? 'Configure up to 4 gesture triggers (On Tap, Double Tap, On Hold, Tap + Hold) and assign an icon.'
                  : 'Create a custom Smart Action or macro, pick an icon or emoji, and save it to your library.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Identity Row: 62x62 Icon Button + Name Input + Save/Discard/Delete */}
      <div className="flex items-start gap-[10px] shrink-0 relative">
        <button
          onClick={() => void handleToggleIconPicker()}
          title="Select Icon or Emoji"
          className="w-[62px] h-[62px] rounded-[12px] bg-[#2f2f2f] hover:bg-[#252525] border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-white shrink-0 transition-all cursor-pointer"
        >
          {selectedIconId ? (
            <CustomPickerIcon id={selectedIconId} size={26} />
          ) : selectedEmoji ? (
            <span className="text-[26px] leading-none">
              {selectedEmoji}
            </span>
          ) : (
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="none"
              stroke="white"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <circle cx="13" cy="13" r="11" />
              <path d="M13 8.5V17.5M8.5 13H17.5" />
            </svg>
          )}
        </button>

        <div className="flex-1 flex flex-col gap-[8px] min-w-0">
          {/* Editable Name Input Pill */}
          <div className="h-[25px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center gap-[6px]">
            <svg
              width="10"
              height="10"
              viewBox="0 0 12 12"
              fill="none"
              stroke="#666666"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" />
            </svg>
            <input
              type="text"
              value={newCustomName}
              onChange={(e) => setNewCustomName(e.target.value)}
              placeholder={
                creatorModalTab === 'Multi-A'
                  ? 'My Multiaction'
                  : creatorModalTab === 'Smart-A'
                  ? 'My Smart action'
                  : 'My Action'
              }
              className="w-full bg-transparent text-[11px] text-[#444444] placeholder:text-[#888888] focus:outline-none"
            />
          </div>

          {/* Save (Green Hover) | Discard (Yellow/Orange Hover) | Delete (Red Hover) */}
          {(() => {
            const canSave =
              creatorModalTab === 'Action'
                ? actionAdvanceMode
                  ? actionAdvanceSteps.some((s) => !!s.keyLabel.trim())
                  : actionTokens.length > 0
                : creatorModalTab === 'Multi-A'
                ? Object.values(multiGestures).some((v) => !!v.trim())
                : smartSubTab === 'App'
                  ? !!selectedSmartApplication
                  : smartSubTab === 'Text'
                    ? !!smartTextValue.trim()
                    : smartSubTab === 'Cmd'
                      ? !!smartCmdValue.trim()
                      : !!smartWebValue.trim();
            const canDelete = !!editingCustomItemId;

          

  return (
              <AnimatePresence mode="popLayout" initial={false}>
                {customItemDeleteConfirm && canDelete ? (
                  <motion.div
                    key="creator-delete-confirm"
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 3 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -3 }}
                    transition={{
                      type: 'spring',
                      stiffness: 540,
                      damping: 30,
                      mass: 0.65,
                    }}
                    className="flex items-center gap-[6px]"
                  >
                    <motion.button
                      type="button"
                      layout
                      initial={{ opacity: 0, x: -10, scale: 0.88 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -8, scale: 0.88 }}
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => setCustomItemDeleteConfirm(false)}
                      className="h-[29px] px-[12px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-[10.5px] font-medium text-[#444444] shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer shrink-0"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="button"
                      layout
                      initial={{ opacity: 0, x: 14, scale: 0.86 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 12, scale: 0.86 }}
                      whileHover={{
                        scale: 1.03,
                        boxShadow: '0 5px 16px rgba(220, 0, 0, 0.34)',
                      }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDeleteCustomItem}
                      className="flex-1 h-[29px] rounded-full bg-gradient-to-r from-[#e01b24] via-[#ff2934] to-[#c40000] text-white text-[10.5px] font-semibold flex items-center justify-center gap-[5px] shadow-[0_2px_10px_rgba(220,0,0,0.26)] cursor-pointer"
                    >
                      <motion.svg
                        width="11"
                        height="11"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ rotate: -16, scale: 0.85 }}
                        animate={{ rotate: [0, -14, 10, -6, 0], scale: 1 }}
                        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="shrink-0"
                      >
                        <path d="M2.5 4.2H13.5" />
                        <path d="M5.8 4.2V2.8C5.8 2.35 6.15 2 6.6 2H9.4C9.85 2 10.2 2.35 10.2 2.8V4.2" />
                        <path d="M4.2 4.2L4.8 13C4.85 13.55 5.3 14 5.85 14H10.15C10.7 14 11.15 13.55 11.2 13L11.8 4.2" />
                      </motion.svg>
                      <span>Click to delete</span>
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="creator-normal-actions"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 520,
                      damping: 32,
                      mass: 0.65,
                    }}
                    className="grid grid-cols-3 gap-[6px]"
                  >
                    <motion.button
                      type="button"
                      whileHover={canSave ? { scale: 1.03 } : undefined}
                      whileTap={canSave ? { scale: 0.95 } : undefined}
                      disabled={!canSave}
                      onClick={handleSaveCustomItem}
                      className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                        canSave
                          ? 'bg-white text-[#444444] hover:bg-[#2ec27e] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                          : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                      }`}
                    >
                      Save
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={canSave ? { scale: 1.03 } : undefined}
                      whileTap={canSave ? { scale: 0.95 } : undefined}
                      disabled={!canSave}
                      onClick={handleDiscardCustomItem}
                      className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                        canSave
                          ? 'bg-white text-[#444444] hover:bg-[#f59e0b] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                          : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                      }`}
                    >
                      Discard
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={canDelete ? { scale: 1.04 } : undefined}
                      whileTap={canDelete ? { scale: 0.94 } : undefined}
                      disabled={!canDelete}
                      onClick={() => setCustomItemDeleteConfirm(true)}
                      className={`h-[29px] rounded-full text-[10.5px] font-medium transition-colors ${
                        canDelete
                          ? 'bg-white text-[#444444] hover:bg-[#e01b24] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] cursor-pointer'
                          : 'bg-[#dadada] text-[#b0b0b0] cursor-not-allowed'
                      }`}
                    >
                      Delete
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })()}
        </div>

        {/* SELECT ICON / EMOJI POPOVER DRAWER */}
        <IconPickerPopover {...iconPickerProps} />
      </div>

      {/* Notched Center Horizontal Divider Line */}
      <div className="my-[12px] w-full shrink-0">
        <svg
          width="100%"
          height="12"
          viewBox="0 0 302 12"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 1.5 H 136 C 142 1.5 144 10 151 10 C 158 10 160 1.5 166 1.5 H 302"
            stroke="#dcdcdc"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* ========================================================= */}
      {/* EDITOR BODY: MULTI-A vs SMART-A vs ACTION                 */}
      {/* ========================================================= */}
      {creatorModalTab === 'Multi-A' ? (
        <div className="flex-1 flex flex-col">
          {/* 4 Gesture Assignment Rows */}
          <div className="space-y-[7px] mb-[12px]">
            {(
              [
                { key: 'onTap', label: 'On Tap' },
                { key: 'doubleTap', label: 'Double Tap' },
                { key: 'onHold', label: 'On Hold' },
                { key: 'tapHold', label: 'Tap + Hold' },
              ] as { key: MultiGestureKey; label: string }[]
            ).map((gesture) => {
              const isDropdownOpen = activeGestureDropdown === gesture.key;
              const assignedVal = multiGestures[gesture.key];
            

  return (
                <div
                  key={gesture.key}
                  className="h-[44px] rounded-full border border-[#dedede] bg-transparent pl-[14px] pr-[8px] flex items-center justify-between relative"
                >
                  <span className="text-[11px] text-[#555555] font-normal">
                    {gesture.label}
                  </span>

                  <div className="flex items-center gap-[5px] relative">
                    <button
                      onClick={() => {
                        if (isDropdownOpen) {
                          setActiveGestureDropdown(null);
                        } else {
                          setActiveGestureDropdown(gesture.key);
                          setGestureKeySearch('');
                        }
                      }}
                      className={`w-[126px] h-[25px] rounded-full bg-white px-[11px] flex items-center justify-between text-[10px] text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border transition-colors cursor-pointer ${
                        isDropdownOpen
                          ? 'border-[#0051ff]'
                          : 'border-transparent hover:border-[#0051ff]'
                      }`}
                    >
                      <span className="truncate">
                        {assignedVal || 'Click to assign'}
                      </span>
                      {isDropdownOpen ? (
                        <ChevronUp className="w-[11px] h-[11px] text-[#444] shrink-0" />
                      ) : (
                        <ChevronDown className="w-[11px] h-[11px] text-[#444] shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        setMultiGestures((prev) => ({
                          ...prev,
                          [gesture.key]: '',
                        }))
                      }
                      title="Clear assignment"
                      className="w-[24px] h-[24px] rounded-full bg-white hover:bg-neutral-100 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#777777] hover:text-black shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all cursor-pointer"
                    >
                      <X className="w-[11px] h-[11px] stroke-[1.7]" />
                    </button>

                    {/* CLICK TO ASSIGN KEY DROPDOWN */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.96 }}
                          transition={{
                            duration: 0.16,
                            ease: [0.32, 0.72, 0, 1],
                          }}
                          className="absolute top-[30px] left-0 w-[154px] bg-white rounded-[16px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-black/[0.05] overflow-hidden z-50"
                        >
                          {/* Top Search Bar */}
                          <div className="h-[30px] bg-[#e6e6e6] px-[10px] flex items-center gap-[6px]">
                            <Search className="w-[10.5px] h-[10.5px] text-[#555555] stroke-[2] shrink-0" />
                            <input
                              type="text"
                              value={gestureKeySearch}
                              onChange={(e) =>
                                setGestureKeySearch(e.target.value)
                              }
                              placeholder="Search a key"
                              className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                            />
                          </div>

                          {/* Accordion Categories */}
                          <div className="max-h-[268px] overflow-y-auto list-accordion-scroll divide-y divide-[#eeeeee]">
                            {basicKeySections
                              .filter((sec) => sec.title !== 'Internal')
                              .map((sec) => {
                                const matchingItems = sec.items.filter((it) => {
                                  if (!gestureKeySearch.trim()) return true;
                                  const q = gestureKeySearch.toLowerCase();
                                  const lbl = (
                                    it.listLabel ||
                                    it.main.replace(/\n/g, ' ')
                                  ).toLowerCase();
                                  return lbl.includes(q);
                                });
                                if (matchingItems.length === 0) return null;
                                const isSecOpen =
                                  expandedGestureSection === sec.title ||
                                  !!gestureKeySearch.trim();
                              

  return (
                                  <div key={sec.title}>
                                    <button
                                      onClick={() =>
                                        setExpandedGestureSection(
                                          expandedGestureSection === sec.title
                                            ? null
                                            : sec.title
                                        )
                                      }
                                      className={`w-full h-[28px] px-[11px] flex items-center justify-between text-[10.5px] font-normal transition-colors cursor-pointer ${
                                        isSecOpen
                                          ? 'bg-[#0051ff] text-white'
                                          : 'bg-white text-[#555555] hover:bg-[#0051ff] hover:text-white'
                                      }`}
                                    >
                                      <span className="truncate">
                                        {sec.title}
                                      </span>
                                      {isSecOpen ? (
                                        <ChevronUp className="w-[11px] h-[11px] shrink-0" />
                                      ) : (
                                        <ChevronDown className="w-[11px] h-[11px] shrink-0" />
                                      )}
                                    </button>

                                    <AnimatePresence initial={false}>
                                      {isSecOpen && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2 }}
                                          className="bg-white py-[2px] overflow-hidden"
                                        >
                                          {matchingItems.map((it) => {
                                            const itemName =
                                              it.listLabel ||
                                              it.main.replace(/\n/g, ' ');
                                          

  return (
                                              <button
                                                key={it.id}
                                                onClick={() => {
                                                  setMultiGestures((prev) => ({
                                                    ...prev,
                                                    [gesture.key]:
                                                      it.isClearIcon ? '' : itemName,
                                                  }));
                                                  setActiveGestureDropdown(null);
                                                }}
                                                className="w-full h-[25px] px-[12px] text-left text-[10.5px] text-[#555555] hover:bg-[#0051ff] hover:text-white transition-colors flex items-center cursor-pointer"
                                              >
                                                {itemName}
                                              </button>
                                            );
                                          })}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tapping Term (ms) Input Pill */}
          <div className="h-[44px] rounded-full border border-[#dedede] bg-transparent pl-[14px] pr-[12px] flex items-center justify-between mb-[16px] shrink-0">
            <span className="text-[11px] text-[#555555] font-normal">
              Tapping term
            </span>
            <div className="h-[25px] rounded-full bg-white px-[11px] flex items-center gap-[4px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <input
                type="text"
                inputMode="numeric"
                value={tappingTermMs}
                onChange={(e) =>
                  setTappingTermMs(e.target.value.replace(/[^0-9]/g, ''))
                }
                className="w-[36px] bg-transparent text-right text-[10.5px] text-[#444444] font-medium focus:outline-none"
              />
              <span className="text-[10px] text-[#777777]">ms</span>
            </div>
          </div>

          {/* Dashed Hint Box */}
          <div className="flex-1 min-h-[140px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[24px] py-[18px] flex flex-col justify-center">
            <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
              Hint
            </h4>
            <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
              Assign a key or action to each gesture — tap, double-tap, hold, and tap + hold — then bind the multiaction to a button.
            </p>
            <button
              onClick={() => void openSupportLink('multiActions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Multi-Action guide'); })}
              className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
            >
              Discover more about Multiactions
            </button>
          </div>
        </div>
      ) : creatorModalTab === 'Smart-A' ? (
        /* SMART ACTION EDITOR (Text | Cmd | Web | App) */
        <div className="flex-1 flex flex-col">
          {/* 4 Sub-Tab Pills */}
          <div className="grid grid-cols-4 gap-[6px] mb-[10px] shrink-0">
            {(['Text', 'Cmd', 'Web', 'App'] as const).map((sub) => {
              const isSubActive = smartSubTab === sub;
            

  return (
                <button
                  key={sub}
                  onClick={() => {
                    setSmartSubTab(sub);
                    if (sub === 'App') {
                      setSmartAppDropdownOpen(true);
                      if (smartSubTab === 'App') void loadInstalledApplications();
                    } else {
                      setSmartAppDropdownOpen(false);
                    }
                  }}
                  className={`h-[26px] rounded-full text-[10.5px] font-medium border-[1.5px] transition-all cursor-pointer ${
                    isSubActive
                      ? 'bg-[#000000] text-white border-[#000000] hover:border-[#0051ff]'
                      : 'bg-white text-[#444444] border-transparent hover:border-[#0051ff] hover:text-[#0051ff]'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            {/* Sub-Tab 1: Text */}
            {smartSubTab === 'Text' && (
              <motion.div
                key="smart-text-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-[14px]">
                  <textarea
                    rows={4}
                    value={smartTextValue}
                    onChange={(e) => setSmartTextValue(e.target.value)}
                    placeholder="Enter text to insert..."
                    className="w-full bg-white rounded-[14px] p-[12px] text-[11px] text-[#333333] placeholder:text-[#999999] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#0051ff] resize-none"
                  />
                </div>

                <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                  <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                    Hint
                  </h4>
                  <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                    Type a text prompt or phrase. Pressing the assigned key instantly types it into your active document.
                  </p>
                  <button
                    onClick={() => void openSupportLink('smartActions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Smart Actions guide'); })}
                    className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                  >
                    Discover more about Smart Actions
                  </button>
                </div>
              </motion.div>
            )}

            {/* Sub-Tab 2: Cmd */}
            {smartSubTab === 'Cmd' && (
              <motion.div
                key="smart-cmd-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-[14px]">
                  <input
                    type="text"
                    value={smartCmdValue}
                    onChange={(e) => setSmartCmdValue(e.target.value)}
                    placeholder="e.g. git status"
                    className="w-full h-[36px] bg-white rounded-[12px] px-[12px] text-[11px] font-mono text-[#333333] placeholder:text-[#999999] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#0051ff]"
                  />
                </div>

                <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                  <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                    Hint
                  </h4>
                  <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                    Run terminal commands, scripts, or command-line utilities with one press.
                  </p>
                  <button
                    onClick={() => void openSupportLink('smartActions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Smart Actions guide'); })}
                    className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                  >
                    Discover more about Smart Actions
                  </button>
                </div>
              </motion.div>
            )}

            {/* Sub-Tab 3: Web */}
            {smartSubTab === 'Web' && (
              <motion.div
                key="smart-web-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <div className="mb-[14px]">
                  <input
                    type="url"
                    value={smartWebValue}
                    onChange={(e) => setSmartWebValue(e.target.value)}
                    placeholder="https://..."
                    className="w-full h-[36px] bg-white rounded-[12px] px-[12px] text-[11px] text-[#333333] placeholder:text-[#999999] border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none focus:border-[#0051ff]"
                  />
                </div>

                <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                  <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                    Hint
                  </h4>
                  <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                    Open any website or web dashboard in your default browser instantly.
                  </p>
                  <button
                    onClick={() => void openSupportLink('smartActions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Smart Actions guide'); })}
                    className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                  >
                    Discover more about Smart Actions
                  </button>
                </div>
              </motion.div>
            )}

            {/* Sub-Tab 4: App */}
            {smartSubTab === 'App' && (
              <motion.div
                key="smart-app-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col"
              >
                <div className="relative mb-[12px] shrink-0">
                  <div className="w-full h-[38px] rounded-[12px] bg-[#e2e2e2] px-[12px] flex items-center justify-between gap-[8px]">
                    <Search className="w-[11px] h-[11px] text-[#9c9c9c] stroke-[1.8] shrink-0" />
                    <input
                      type="text"
                      value={smartAppValue}
                      onFocus={() => setSmartAppDropdownOpen(true)}
                      onChange={(e) => {
                        setSmartAppValue(e.target.value);
                        setSelectedSmartApplication(null);
                        setSmartAppDropdownOpen(true);
                      }}
                      placeholder="Search your software..."
                      aria-label="Search installed applications"
                      aria-expanded={smartAppDropdownOpen}
                      aria-controls="installed-app-options"
                      className="w-full bg-transparent text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={smartAppDropdownOpen ? 'Hide installed apps' : 'Show installed apps'}
                      aria-expanded={smartAppDropdownOpen}
                      onClick={() => {
                        const shouldOpen = !smartAppDropdownOpen;
                        setSmartAppDropdownOpen(shouldOpen);
                        if (shouldOpen && !installedApplicationsLoading) {
                          void loadInstalledApplications();
                        }
                      }}
                      className="shrink-0 text-[#555555] hover:text-black cursor-pointer"
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 12 12"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform ${smartAppDropdownOpen ? 'rotate-90' : ''}`}
                      >
                        <path d="M4.5 2.5L8 6L4.5 9.5" />
                      </svg>
                    </button>
                  </div>

                  <AnimatePresence>
                    {smartAppDropdownOpen && (
                      <motion.div
                        id="installed-app-options"
                        role="listbox"
                        aria-label="Installed applications"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-[42px] left-0 right-0 bg-white rounded-[12px] shadow-[0_6px_18px_rgba(0,0,0,0.1)] border border-black/[0.05] max-h-[150px] overflow-y-auto z-40 py-1"
                      >
                        {installedApplicationsLoading ? (
                          <div role="status" className="px-3 py-2 text-[10.5px] text-[#777]">
                            Scanning installed apps…
                          </div>
                        ) : installedApplicationsError ? (
                          <div className="px-3 py-2 text-[10.5px] text-[#777]">
                            <p>{installedApplicationsError}</p>
                            <button
                              type="button"
                              onClick={() => void loadInstalledApplications()}
                              className="mt-1 text-[#0051ff] hover:underline cursor-pointer"
                            >
                              Try again
                            </button>
                          </div>
                        ) : filteredInstalledApplications.length > 0 ? (
                          filteredInstalledApplications.map((application) => (
                            <button
                              key={application.shortcutPath}
                              type="button"
                              role="option"
                              aria-selected={selectedSmartApplication?.shortcutPath === application.shortcutPath}
                              onClick={() => {
                                setSmartAppValue(application.name);
                                setSelectedSmartApplication(application);
                                setSmartAppDropdownOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[10.5px] text-[#444] hover:bg-[#0051ff] hover:text-white transition-colors cursor-pointer"
                            >
                              {application.name}
                            </button>
                          ))
                        ) : smartAppValue.trim() ? (
                          <div className="px-3 py-2 text-[10.5px] text-[#777]">
                            No installed apps match “{smartAppValue.trim()}”.
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-[10.5px] text-[#777]">
                            No apps found in the Start Menu or Desktop. Add an app shortcut, then try again.
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex-1 min-h-[240px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[26px] py-[20px] flex flex-col justify-center">
                  <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                    Hint
                  </h4>
                  <p className="text-[10.5px] leading-[1.36] text-[#666666] mb-[22px]">
                    Pick an installed app. Pressing the assigned key launches it.
                  </p>
                  <button
                    onClick={() => void openSupportLink('smartActions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Smart Actions guide'); })}
                    className="h-[30px] px-[14px] rounded-full bg-[#e2e2e2] hover:bg-[#d8d8d8] text-[10.5px] font-medium text-[#4a4a4a] self-start transition-colors cursor-pointer"
                  >
                    Smart Actions Guide
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* ACTION (MACRO) EDITOR — Keyboard Recorder & Advance Mode */
        <div className="flex-1 flex flex-col">
          {/* Advance mode row */}
          <div className="flex items-center gap-[10px] mb-[12px] shrink-0">
            <span className="text-[11.5px] font-medium text-[#555555]">
              Advance mode
            </span>
            <SettingsSwitch
              checked={actionAdvanceMode}
              onChange={() => {
                setActionAdvanceMode((v) => !v);
                setActiveAdvanceStepDropdown(null);
              }}
            />
          </div>

          {!actionAdvanceMode ? (
            <div className="flex-1 flex flex-col">
              {/* Interactive Key Recording Area */}
              {actionRecordingStatus === 'idle' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setActionRecordingStatus('recording');
                  }}
                  className="w-full min-h-[48px] rounded-[14px] bg-[#e2e2e2] hover:bg-[#dcdcdc] px-[14px] py-[12px] flex items-center justify-center text-[11px] text-[#555555] mb-[12px] transition-colors cursor-pointer shrink-0"
                >
                  Click here to start creating an action
                </button>
              ) : actionRecordingStatus === 'recording' ? (
                <div
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                  className={`w-full rounded-[14px] bg-[#e2e2e2] px-[12px] py-[10px] mb-[12px] shrink-0 transition-all ${
                    actionTokens.length > 0
                      ? 'min-h-[76px] flex flex-col justify-between gap-[8px]'
                      : 'min-h-[48px] flex items-center justify-end'
                  }`}
                >
                  {actionTokens.length > 0 && (
                    <div className="flex flex-wrap items-center gap-[6px]">
                      {actionTokens.map((tok, idx) => (
                        <React.Fragment key={tok.id}>
                          {idx > 0 && (
                            <span className="text-[11px] text-[#444444] font-medium select-none">
                              +
                            </span>
                          )}
                          <span
                            className={`h-[25px] min-w-[25px] px-[9px] rounded-full text-[10.5px] font-medium flex items-center justify-center border ${
                              tok.kind === 'modifier'
                                ? 'bg-[#dcfce7] border-[#45a11c] text-[#2d6a18]'
                                : 'bg-[#e9d5ff] border-[#9333ea] text-[#7e22ce]'
                            }`}
                          >
                            {tok.label}
                          </span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end w-full">
                    <button
                      type="button"
                      disabled={actionTokens.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (actionTokens.length === 0) return;
                        setActionRecordingStatus('confirmed');
                      }}
                      className={`h-[26px] px-[12px] rounded-full text-[10.5px] font-medium transition-colors ${
                        actionTokens.length > 0
                          ? 'bg-white text-[#333333] hover:bg-[#0051ff] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] cursor-pointer'
                          : 'bg-[#d5d5d5] text-[#a6a6a6] cursor-default'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                /* Confirmed state */
                <div
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setActionRecordingStatus('recording');
                  }}
                  title="Click to edit key sequence"
                  className="w-full min-h-[48px] rounded-[14px] bg-[#e2e2e2] hover:bg-[#dcdcdc] px-[12px] py-[10px] mb-[12px] flex flex-wrap items-center gap-[6px] shrink-0 transition-colors cursor-pointer"
                >
                  {actionTokens.map((tok, idx) => (
                    <React.Fragment key={tok.id}>
                      {idx > 0 && (
                        <span className="text-[11px] text-[#444444] font-medium select-none">
                          +
                        </span>
                      )}
                      <span
                        className={`h-[25px] min-w-[25px] px-[9px] rounded-full text-[10.5px] font-medium flex items-center justify-center border ${
                          tok.kind === 'modifier'
                            ? 'bg-[#dcfce7] border-[#45a11c] text-[#2d6a18]'
                            : 'bg-[#e9d5ff] border-[#9333ea] text-[#7e22ce]'
                        }`}
                      >
                        {tok.label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Dashed Hint Box */}
              <div className="flex-1 min-h-[230px] rounded-[20px] border border-dashed border-[#cfcfcf] px-[24px] py-[18px] flex flex-col justify-between">
                <div>
                  <h4 className="text-[14.5px] font-semibold text-[#555555] mb-[8px]">
                    Hint
                  </h4>
                  <p className="text-[10.5px] leading-[1.38] text-[#666666] mb-[8px]">
                    Press key combination or a phrase to make an action, such as:
                  </p>
                  <ul className="list-disc pl-[16px] text-[10.5px] leading-[1.42] text-[#666666] mb-[10px] space-y-[2px]">
                    <li>Shortcuts → Ctrl/Cmd + C for copy;</li>
                    <li>
                      Text prompt → “Hello” + Enter key to record text or a phrase.
                    </li>
                  </ul>
                  <p className="text-[10.5px] leading-[1.38] text-[#666666] mb-[10px]">
                    Some keys may not be captured during recording because another app is using them.
                  </p>
                  <p className="text-[10.5px] leading-[1.38] text-[#666666]">
                    Use advance mode to add delays, choose keys manually, or insert missed keys.
                  </p>
                </div>

                <button
                  onClick={() => void openSupportLink('actions').then((result) => { if (!result.ok) showToast(result.error || 'Could not open the Actions guide'); })}
                  className="mt-[14px] text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black text-center cursor-pointer"
                >
                  Discover more about Actions
                </button>
              </div>
            </div>
          ) : (
            /* Advance Mode ON */
            <div className="flex-1 flex flex-col">
              <div className="flex flex-col">
                {actionAdvanceSteps.map((step, idx) => {
                  const isDropdownOpen = activeAdvanceStepDropdown === step.id;
                  const isMultipleSteps = actionAdvanceSteps.length > 1;
                  const isLastStep = idx === actionAdvanceSteps.length - 1;
                  const isBeingDragged = draggingAdvStep?.id === step.id;
                  const isModeHovered = hoveredModeStepId === step.id;
                  const isDelayHovered = hoveredDelayStepId === step.id;

                

  return (
                    <React.Fragment key={step.id}>
                      <motion.div
                        layout={!isBeingDragged}
                        animate={{
                          y: isBeingDragged ? draggingAdvStep.offsetY : 0,
                          scale: isBeingDragged ? 1.015 : 1,
                        }}
                        transition={
                          isBeingDragged
                            ? { duration: 0 }
                            : {
                                type: 'spring',
                                stiffness: 420,
                                damping: 32,
                              }
                        }
                        className={`h-[44px] rounded-full border border-[#dfdfdf] bg-[#ebebeb]/70 px-[9px] flex items-center gap-[6px] relative ${
                          isBeingDragged
                            ? 'z-40 shadow-[0_10px_24px_rgba(0,0,0,0.12)] bg-[#efefef]'
                            : 'z-10'
                        }`}
                      >
                        {/* Left 6-dot drag handle circle */}
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            if (e.button !== 0) return;
                            e.stopPropagation();
                            setActiveAdvanceStepDropdown(null);
                            advStepDragRef.current = {
                              id: step.id,
                              startY: e.clientY,
                            };
                            setDraggingAdvStep({
                              id: step.id,
                              offsetY: 0,
                            });
                          }}
                          title="Hold and drag to move"
                          className="w-[25px] h-[25px] rounded-full bg-white hover:bg-neutral-50 flex items-center justify-center text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 cursor-grab active:cursor-grabbing"
                        >
                          <svg
                            width="7"
                            height="11"
                            viewBox="0 0 8 12"
                            fill="currentColor"
                          >
                            <circle cx="2" cy="2" r="1.1" />
                            <circle cx="6" cy="2" r="1.1" />
                            <circle cx="2" cy="6" r="1.1" />
                            <circle cx="6" cy="6" r="1.1" />
                            <circle cx="2" cy="10" r="1.1" />
                            <circle cx="6" cy="10" r="1.1" />
                          </svg>
                        </button>

                        {/* Center Assign Key dropdown pill */}
                        <div className="flex-1 relative min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isDropdownOpen) {
                                setActiveAdvanceStepDropdown(null);
                              } else {
                                setActiveAdvanceStepDropdown(step.id);
                                setGestureKeySearch('');
                              }
                            }}
                            className={`w-full h-[25px] rounded-full bg-white px-[11px] flex items-center justify-between text-[10.5px] text-[#555555] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border transition-colors cursor-pointer ${
                              isDropdownOpen
                                ? 'border-[#0051ff]'
                                : 'border-transparent hover:border-[#0051ff]'
                            }`}
                          >
                            <span className="truncate">
                              {step.keyLabel || 'Assign Key'}
                            </span>
                            {isDropdownOpen ? (
                              <ChevronUp className="w-[11px] h-[11px] text-[#444] shrink-0" />
                            ) : (
                              <ChevronDown className="w-[11px] h-[11px] text-[#444] shrink-0" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isDropdownOpen && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  y: -4,
                                  scale: 0.96,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: -4,
                                  scale: 0.96,
                                }}
                                transition={{
                                  duration: 0.2,
                                  ease: [0.32, 0.72, 0, 1],
                                }}
                                className="absolute top-[30px] left-0 right-0 bg-white rounded-[16px] shadow-[0_6px_20px_rgba(0,0,0,0.12)] border border-black/[0.05] overflow-hidden z-50"
                              >
                                <div className="h-[30px] bg-[#e6e6e6] px-[10px] flex items-center gap-[6px]">
                                  <Search className="w-[10.5px] h-[10.5px] text-[#555555] stroke-[2] shrink-0" />
                                  <input
                                    type="text"
                                    value={gestureKeySearch}
                                    onChange={(e) =>
                                      setGestureKeySearch(e.target.value)
                                    }
                                    placeholder="Search a key"
                                    className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
                                  />
                                </div>

                                <div className="max-h-[220px] overflow-y-auto list-accordion-scroll divide-y divide-[#eeeeee]">
                                  {basicKeySections
                                    .filter((sec) => sec.title !== 'Internal')
                                    .map((sec) => {
                                      const matchingItems = sec.items.filter((it) => {
                                        if (!gestureKeySearch.trim()) return true;
                                        const q = gestureKeySearch.toLowerCase();
                                        const lbl = (
                                          it.listLabel ||
                                          it.main.replace(/\n/g, ' ')
                                        ).toLowerCase();
                                        return lbl.includes(q);
                                      });
                                      if (matchingItems.length === 0) return null;
                                      const isSecOpen =
                                        expandedGestureSection === sec.title ||
                                        !!gestureKeySearch.trim();
                                    

  return (
                                        <div key={sec.title}>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setExpandedGestureSection(
                                                expandedGestureSection === sec.title
                                                  ? null
                                                  : sec.title
                                              )
                                            }
                                            className={`w-full h-[28px] px-[11px] flex items-center justify-between text-[10.5px] font-normal transition-colors cursor-pointer ${
                                              isSecOpen
                                                ? 'bg-[#0051ff] text-white'
                                                : 'bg-white text-[#555555] hover:bg-[#0051ff] hover:text-white'
                                            }`}
                                          >
                                            <span className="truncate">
                                              {sec.title}
                                            </span>
                                            {isSecOpen ? (
                                              <ChevronUp className="w-[11px] h-[11px] shrink-0" />
                                            ) : (
                                              <ChevronDown className="w-[11px] h-[11px] shrink-0" />
                                            )}
                                          </button>
                                          <AnimatePresence initial={false}>
                                            {isSecOpen && (
                                              <motion.div
                                                initial={{
                                                  height: 0,
                                                  opacity: 0,
                                                }}
                                                animate={{
                                                  height: 'auto',
                                                  opacity: 1,
                                                }}
                                                exit={{
                                                  height: 0,
                                                  opacity: 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                                className="bg-white py-[2px] overflow-hidden"
                                              >
                                                {matchingItems.map((it) => {
                                                  const itemName =
                                                    it.listLabel ||
                                                    it.main.replace(/\n/g, ' ');
                                                

  return (
                                                    <button
                                                      key={it.id}
                                                      type="button"
                                                      onClick={() => {
                                                        setActionAdvanceSteps((prev) =>
                                                          prev.map((s) =>
                                                            s.id === step.id
                                                              ? {
                                                                  ...s,
                                                                  keyLabel:
                                                                    it.isClearIcon
                                                                      ? ''
                                                                      : itemName,
                                                                }
                                                              : s
                                                          )
                                                        );
                                                        setActiveAdvanceStepDropdown(
                                                          null
                                                        );
                                                      }}
                                                      className="w-full h-[25px] px-[12px] text-left text-[10.5px] text-[#555555] hover:bg-[#0051ff] hover:text-white transition-colors flex items-center cursor-pointer"
                                                    >
                                                      {itemName}
                                                    </button>
                                                  );
                                                })}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Key Mode Toggle Button */}
                        <div className="relative shrink-0">
                          <AnimatePresence>
                            {isModeHovered && (
                              <motion.div
                                initial={{
                                  opacity: 0,
                                  y: 3,
                                  scale: 0.95,
                                }}
                                animate={{
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                }}
                                exit={{
                                  opacity: 0,
                                  y: 2,
                                  scale: 0.95,
                                }}
                                transition={{ duration: 0.16 }}
                                className="absolute -top-[27px] left-1/2 -translate-x-1/2 h-[21px] px-[10px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex items-center justify-center text-[10px] font-medium text-[#333333] whitespace-nowrap pointer-events-none z-50"
                              >
                                {step.mode === 'press-release'
                                  ? 'Press & release'
                                  : 'Press'}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <button
                            type="button"
                            onMouseEnter={() =>
                              setHoveredModeStepId(step.id)
                            }
                            onMouseLeave={() =>
                              setHoveredModeStepId((prev) =>
                                prev === step.id ? null : prev
                              )
                            }
                            onClick={() =>
                              setActionAdvanceSteps((prev) =>
                                prev.map((s) =>
                                  s.id === step.id
                                    ? {
                                        ...s,
                                        mode:
                                          s.mode === 'press-release'
                                            ? 'press'
                                            : 'press-release',
                                      }
                                    : s
                                )
                              )
                            }
                            className="w-[25px] h-[25px] rounded-full bg-white hover:bg-[#0051ff] text-[#444444] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                          >
                            {step.mode === 'press-release' ? (
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4.2 8.5V3M4.2 3L2.4 4.8M4.2 3L6 4.8" />
                                <path d="M7.8 3.5V9M7.8 9L6 7.2M7.8 9L9.6 7.2" />
                              </svg>
                            ) : (
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M6 2.2V6.8M6 6.8L4.1 4.9M6 6.8L7.9 4.9" />
                                <circle
                                  cx="6"
                                  cy="9.4"
                                  r="1.15"
                                  fill="currentColor"
                                  stroke="none"
                                />
                              </svg>
                            )}
                          </button>
                        </div>

                        {/* Conditional X Delete Button */}
                        {isMultipleSteps && (
                          <button
                            type="button"
                            onClick={() =>
                              setActionAdvanceSteps((prev) =>
                                prev.filter((s) => s.id !== step.id)
                              )
                            }
                            title="Remove key input"
                            className="w-[25px] h-[25px] rounded-full bg-white hover:bg-[#e01b24] text-[#555555] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] shrink-0 transition-colors cursor-pointer"
                          >
                            <X className="w-[11px] h-[11px] stroke-[1.7]" />
                          </button>
                        )}
                      </motion.div>

                      {/* Between two Assign Key capsules */}
                      {!isLastStep && (
                        <div
                          onMouseEnter={() =>
                            setHoveredDelayStepId(step.id)
                          }
                          onMouseLeave={() =>
                            setHoveredDelayStepId((prev) =>
                              prev === step.id ? null : prev
                            )
                          }
                          className="min-h-[28px] py-[4px] flex items-center justify-center"
                        >
                          {step.delayAfterActive &&
                          (isDelayHovered || editingDelayStepId === step.id) ? (
                            <motion.div
                              initial={{
                                opacity: 0,
                                scale: 0.92,
                              }}
                              animate={{ opacity: 1, scale: 1 }}
                              onClick={(e) => {
                                setEditingDelayStepId(step.id);
                                const inputEl = e.currentTarget.querySelector(
                                  'input'
                                ) as HTMLInputElement | null;
                                if (
                                  inputEl &&
                                  document.activeElement !== inputEl
                                ) {
                                  inputEl.focus();
                                }
                              }}
                              className="h-[26px] px-[11px] rounded-full bg-[#e2e2e2] hover:bg-[#dcdcdc] flex items-center gap-[5px] text-[10.5px] text-[#555555] cursor-text transition-colors"
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.25"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="shrink-0 mr-[3px]"
                              >
                                <circle cx="6" cy="6" r="4.6" />
                                <path d="M6 3.5V6L7.6 7" />
                              </svg>
                              <input
                                type="text"
                                inputMode="numeric"
                                autoFocus={editingDelayStepId === step.id}
                                value={step.delayAfterMs ?? '200'}
                                onFocus={(e) => {
                                  setEditingDelayStepId(step.id);
                                  const len = e.currentTarget.value.length;
                                  e.currentTarget.setSelectionRange(len, len);
                                }}
                                onChange={(e) => {
                                  const val = e.target.value.replace(
                                    /[^0-9]/g,
                                    ''
                                  );
                                  setActionAdvanceSteps((prev) =>
                                    prev.map((s) =>
                                      s.id === step.id
                                        ? {
                                            ...s,
                                            delayAfterMs: val,
                                          }
                                        : s
                                    )
                                  );
                                }}
                                onBlur={() => {
                                  setEditingDelayStepId((prev) =>
                                    prev === step.id ? null : prev
                                  );
                                  setActionAdvanceSteps((prev) =>
                                    prev.map((s) =>
                                      s.id === step.id &&
                                      !(s.delayAfterMs || '').trim()
                                        ? {
                                            ...s,
                                            delayAfterMs: '200',
                                          }
                                        : s
                                    )
                                  );
                                }}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  if (e.key === 'Enter') {
                                    setActionAdvanceSteps((prev) =>
                                      prev.map((s) =>
                                        s.id === step.id &&
                                        !(s.delayAfterMs || '').trim()
                                          ? {
                                              ...s,
                                              delayAfterMs: '200',
                                            }
                                          : s
                                      )
                                    );
                                    setEditingDelayStepId(null);
                                    e.currentTarget.blur();
                                  }
                                }}
                                style={{
                                  width: `${Math.max(
                                    2,
                                    (step.delayAfterMs ?? '200').length
                                  )}ch`,
                                }}
                                className="min-w-[20px] max-w-[54px] bg-transparent text-right text-[10.5px] font-medium text-[#444444] caret-[#333333] focus:outline-none tabular-nums"
                              />
                              <span className="text-[#555555] select-none">
                                ms
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDelayStepId((prev) =>
                                    prev === step.id ? null : prev
                                  );
                                  setActionAdvanceSteps((prev) =>
                                    prev.map((s) =>
                                      s.id === step.id
                                        ? {
                                            ...s,
                                            delayAfterActive: false,
                                            delayAfterMs: '200',
                                          }
                                        : s
                                    )
                                  );
                                }}
                                title="Remove delay"
                                className="text-[#555555] hover:text-black ml-[3px] cursor-pointer"
                              >
                                <X className="w-[10.5px] h-[10.5px] stroke-[1.7]" />
                              </button>
                            </motion.div>
                          ) : isDelayHovered ? (
                            <motion.button
                              type="button"
                              initial={{
                                opacity: 0,
                                scale: 0.9,
                              }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => {
                                setActionAdvanceSteps((prev) =>
                                  prev.map((s) =>
                                    s.id === step.id
                                      ? {
                                          ...s,
                                          delayAfterActive: true,
                                          delayAfterMs:
                                            s.delayAfterMs || '200',
                                        }
                                      : s
                                  )
                                );
                                setEditingDelayStepId(step.id);
                              }}
                              className="h-[25px] px-[11px] rounded-full bg-[#0051ff] text-white text-[10.5px] font-medium flex items-center gap-[5px] shadow-[0_2px_8px_rgba(0,81,255,0.28)] cursor-pointer"
                            >
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 12 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.35"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <circle cx="6" cy="6" r="4.6" />
                                <path d="M6 3.5V6L7.6 7" />
                              </svg>
                              <span>Delay</span>
                            </motion.button>
                          ) : (
                            <div
                              onClick={() => {
                                setHoveredDelayStepId(step.id);
                                if (step.delayAfterActive) {
                                  setEditingDelayStepId(step.id);
                                }
                              }}
                              title={
                                step.delayAfterActive
                                  ? `Delay: ${
                                      step.delayAfterMs || '200'
                                    } ms`
                                  : 'Add delay'
                              }
                              className="w-[48px] h-[8px] rounded-full bg-[#dcdcdc] transition-all cursor-pointer"
                            />
                          )}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* + Key-input Pill Button */}
              <button
                type="button"
                onClick={() =>
                  setActionAdvanceSteps((prev) => [
                    ...prev,
                    {
                      id: `adv-step-${Date.now()}-${Math.random()}`,
                      keyLabel: '',
                      mode: 'press-release',
                      delayAfterActive: false,
                      delayAfterMs: '200',
                    },
                  ])
                }
                className="mx-auto mt-[10px] h-[28px] px-[14px] rounded-full bg-[#e2e2e2] hover:bg-[#d8d8d8] text-[10.5px] font-medium text-[#444444] flex items-center gap-[5px] transition-colors cursor-pointer"
              >
                <span>+</span>
                <span>Key-input</span>
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default ActionCreatorDrawer;
