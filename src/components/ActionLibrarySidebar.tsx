import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import {
  InfoCircleIcon,
  EmptyKeyPlusIcon,
  ArrowKeyGlyph,
} from './UiIcons';
import { CustomPickerIcon } from './CustomPickerIcon';
import {
  groupCustomItemsByPreset,
  formatCustomTileText,
  type BasicTileItem,
  type CustomItemsByTab,
  type MappingTabId,
  type KeySlotId,
  type KeyAssignment,
} from '../presetLibrary';

export interface BasicSection {
  title: string;
  listPreview: string;
  items: BasicTileItem[];
}

export interface ActionLibrarySidebarProps {
  onClose: () => void;
  activeTooltip: string | null;
  setActiveTooltip: (tooltip: 'drawer-mapping' | null) => void;
  mappingSearch: string;
  setMappingSearch: (search: string) => void;
  mappingViewMode: 'list' | 'grid';
  setMappingViewMode: (mode: 'list' | 'grid') => void;
  mappingTab: MappingTabId;
  setMappingTab: (tab: MappingTabId) => void;
  filteredBasicSections: BasicSection[];
  expandedListSections: Record<string, boolean>;
  toggleListSection: (title: string) => void;
  draggedTile: { item: BasicTileItem; sourceTab: MappingTabId } | null;
  flashedTileId: string | null;
  handleStartTileDrag: (
    e: React.PointerEvent,
    item: BasicTileItem,
    tab: MappingTabId
  ) => void;
  handleAssignTileFromDrawer: (item: BasicTileItem) => void;
  handleOpenCreatorEditor: (tab: Exclude<MappingTabId, 'Basic'>, item?: BasicTileItem) => void;
  customItemsByTab: CustomItemsByTab;
  renderAppIcon: (id: string, size?: number) => React.ReactNode;
  showToast: (msg: string) => void;
  selectedKey?: KeySlotId | null;
  selectedKeyAssignment?: KeyAssignment | null;
  onUpdateKeycapPersonalization?: (
    slotId: KeySlotId,
    customLegend: string,
    subLegend: string,
    keycapColor: string
  ) => void;
}

export function ActionLibrarySidebar({
  onClose,
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
  renderAppIcon,
  showToast,
  selectedKey,
  selectedKeyAssignment,
  onUpdateKeycapPersonalization,
}: ActionLibrarySidebarProps) {
  const renderCustomItemGroups = (
    tab: Exclude<MappingTabId, 'Basic'>,
    items: BasicTileItem[],
    customGroupTitle: string
  ) => (
    <div className="flex-1 overflow-y-auto pt-[2px] pb-[3px]">
      <div className="text-[11.5px] font-normal text-[#5c5c5c] mb-[10px]">
        {customGroupTitle}
      </div>
      <div className="space-y-[16px]">
        {groupCustomItemsByPreset(items, customGroupTitle).map((group) => (
          <section
            key={group.id}
            data-action-group={group.presetId ?? 'custom'}
            data-preset-action-group={group.presetId}
          >
            {group.presetId && (
              <div className="h-[20px] flex items-center gap-[7px] mb-[9px]">
                {renderAppIcon(group.presetId, 18)}
                <span
                  className="text-[11.5px] font-medium leading-none"
                  style={{ color: group.presetColor }}
                >
                  {group.title}
                </span>
                {group.presetColor && (
                  <span
                    aria-hidden="true"
                    className="flex-1 h-px rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${group.presetColor}66, transparent)`,
                    }}
                  />
                )}
              </div>
            )}
            <div
              data-action-view={mappingViewMode}
              className={
                mappingViewMode === 'grid'
                  ? 'grid grid-cols-5 gap-[6px] content-start'
                  : 'flex flex-col gap-[6px]'
              }
            >
              {group.items.map((item) => {
                const isBeingDragged = draggedTile?.item.id === item.id;
                const isFlashed = flashedTileId === item.id;
                const presetTileStyle =
                  group.presetColor && !isFlashed && !isBeingDragged
                    ? {
                        borderColor: `${group.presetColor}55`,
                        backgroundColor: `${group.presetColor}0D`,
                      }
                    : undefined;
                const presetIconStyle = group.presetColor
                  ? {
                      color: group.presetColor,
                      backgroundColor: `${group.presetColor}1A`,
                    }
                  : undefined;
                const listIconStyle = group.presetColor
                  ? presetIconStyle
                  : { color: '#666666', backgroundColor: '#f1f1f1' };
                const listDescription =
                  item.listLabel || item.top || item.macropadLabel;
                const layoutClasses =
                  mappingViewMode === 'grid'
                    ? 'h-[54px] rounded-[10px] flex-col justify-center px-1 text-center'
                    : 'w-full min-h-[48px] rounded-[10px] flex-row justify-start gap-[10px] px-[9px] text-left';

                return (
                  <button
                    key={item.id}
                    data-preset-action-item={group.presetId ? item.id : undefined}
                    data-action-list-item={mappingViewMode === 'list' ? item.id : undefined}
                    onPointerDown={(e) => handleStartTileDrag(e, item, tab)}
                    onClick={() => handleAssignTileFromDrawer(item)}
                    onDoubleClick={() => handleOpenCreatorEditor(tab, item)}
                    title={`${item.main} (Click or drag onto key, double-click to edit)`}
                    style={presetTileStyle}
                    className={`border-[1.5px] flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] select-none cursor-grab active:cursor-grabbing ${layoutClasses} ${
                      isFlashed
                        ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                        : isBeingDragged
                        ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                        : 'bg-white hover:bg-[#fafafa] text-[#444444] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                    }`}
                  >
                    {mappingViewMode === 'grid' ? (
                      item.iconId ? (
                        <span
                          data-preset-action-icon={group.presetId ?? undefined}
                          className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center"
                          style={presetIconStyle}
                        >
                          <CustomPickerIcon id={item.iconId} size={20} />
                        </span>
                      ) : item.emoji ? (
                        <span
                          className="text-[20px] leading-none"
                          style={
                            group.presetColor
                              ? { color: group.presetColor }
                              : undefined
                          }
                        >
                          {item.emoji}
                        </span>
                      ) : (
                        <span
                          className="text-[10px] leading-[1.2] whitespace-pre-line"
                          style={
                            group.presetColor
                              ? { color: group.presetColor }
                              : undefined
                          }
                        >
                          {formatCustomTileText(item.main)}
                        </span>
                      )
                    ) : (
                      <>
                        <span
                          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center shrink-0"
                          style={listIconStyle}
                        >
                          {item.iconId ? (
                            <span
                              data-preset-action-icon={group.presetId ?? undefined}
                              className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center"
                              style={presetIconStyle}
                            >
                              <CustomPickerIcon id={item.iconId} size={20} />
                            </span>
                          ) : item.emoji ? (
                            <span className="text-[20px] leading-none">
                              {item.emoji}
                            </span>
                          ) : (
                            <span className="text-[10px] leading-[1.2] whitespace-pre-line">
                              {formatCustomTileText(item.main)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block truncate text-[11px] font-medium"
                            style={
                              group.presetColor
                                ? { color: group.presetColor }
                                : undefined
                            }
                          >
                            {item.main}
                          </span>
                          {listDescription && listDescription !== item.main && (
                            <span className="block truncate text-[9.5px] leading-[1.3] text-[#888888]">
                              {listDescription}
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
  return (
    <motion.div
      key="key-mapping-drawer-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.26, ease: 'easeInOut' }}
      className="flex-1 flex flex-col overflow-hidden relative"
    >
      {/* Drawer Top Header: X (left) | Key Mapping (i) (center) */}
      <div className="px-[18px] pt-[18px] pb-[14px] flex items-center justify-between shrink-0 relative">
        <button
          onClick={onClose}
          aria-label="Close Key Mapping"
          className="w-[24px] h-[24px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
        >
          <X className="w-[14px] h-[14px] stroke-[1.7]" />
        </button>

        <div className="flex items-center gap-[5px] text-[#555555] text-[12.5px] font-medium">
          <span>Key Mapping</span>
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

        <div className="w-[24px]" />

        <AnimatePresence>
          {activeTooltip === 'drawer-mapping' && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
              className="absolute top-[42px] right-[12px] w-[226px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
            >
              <div className="text-[13px] font-semibold text-[#5e5e5e] mb-[9px]">
                Key Mapping
              </div>
              <p className="text-[11px] leading-[1.36] text-[#686868]">
                Assign keys, actions and multiactions to the selected button.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keycap Custom Text & Legend Personalization Capsule */}
      {selectedKey && selectedKey !== 'dial-tl' && onUpdateKeycapPersonalization && (
        <div className="mx-[15px] mb-[10px] p-[10px] rounded-[14px] bg-[#e6e6e6] border border-black/[0.04] text-[11px] shrink-0">
          <div className="flex items-center justify-between mb-[8px]">
            <span className="font-semibold text-[#444] flex items-center gap-[6px]">
              <span>Keycap Legend &amp; Color</span>
              <span className="text-[9.5px] font-mono uppercase bg-white/80 px-[5px] py-[1px] rounded text-[#555]">
                {selectedKey.toUpperCase()}
              </span>
            </span>
            {(selectedKeyAssignment?.customLegend ||
              selectedKeyAssignment?.subLegend ||
              selectedKeyAssignment?.keycapColor) && (
              <button
                type="button"
                onClick={() => onUpdateKeycapPersonalization(selectedKey, '', '', '')}
                className="text-[9.5px] text-[#0051ff] hover:underline cursor-pointer"
              >
                Reset style
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-[6px] mb-[8px]">
            <div>
              <label className="block text-[9.5px] text-[#666] mb-[2px]">Custom Legend</label>
              <input
                type="text"
                value={selectedKeyAssignment?.customLegend ?? ''}
                onChange={(e) =>
                  onUpdateKeycapPersonalization(
                    selectedKey,
                    e.target.value,
                    selectedKeyAssignment?.subLegend ?? '',
                    selectedKeyAssignment?.keycapColor ?? ''
                  )
                }
                placeholder={selectedKeyAssignment?.label || 'Custom text'}
                maxLength={12}
                className="w-full h-[24px] bg-white rounded-[6px] px-[7px] text-[10.5px] text-[#222] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#0051ff]"
              />
            </div>
            <div>
              <label className="block text-[9.5px] text-[#666] mb-[2px]">Sub-Legend (Subscript)</label>
              <input
                type="text"
                value={selectedKeyAssignment?.subLegend ?? ''}
                onChange={(e) =>
                  onUpdateKeycapPersonalization(
                    selectedKey,
                    selectedKeyAssignment?.customLegend ?? '',
                    e.target.value,
                    selectedKeyAssignment?.keycapColor ?? ''
                  )
                }
                placeholder="e.g. F5, MIC"
                maxLength={6}
                className="w-full h-[24px] bg-white rounded-[6px] px-[7px] text-[10.5px] text-[#222] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#0051ff]"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9.5px] text-[#666] mb-[4px]">Keycap Color</label>
            <div className="flex items-center gap-[6px]">
              {[
                { name: 'Default', hex: '' },
                { name: 'Blue', hex: '#0051ff' },
                { name: 'Red', hex: '#dc2626' },
                { name: 'Green', hex: '#16a34a' },
                { name: 'Amber', hex: '#d97706' },
                { name: 'Purple', hex: '#9333ea' },
                { name: 'Dark', hex: '#18181b' },
              ].map((swatch) => {
                const isSelected = (selectedKeyAssignment?.keycapColor || '') === swatch.hex;
                return (
                  <button
                    key={swatch.name}
                    type="button"
                    title={swatch.name}
                    onClick={() =>
                      onUpdateKeycapPersonalization(
                        selectedKey,
                        selectedKeyAssignment?.customLegend ?? '',
                        selectedKeyAssignment?.subLegend ?? '',
                        swatch.hex
                      )
                    }
                    className={`w-[18px] h-[18px] rounded-full border-2 transition-all cursor-pointer ${
                      isSelected ? 'border-[#0051ff] scale-110 shadow-sm' : 'border-white/80 hover:scale-105'
                    }`}
                    style={{ backgroundColor: swatch.hex || '#313131' }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar + List/Grid View Toggle */}
      <div className="px-[15px] flex items-center gap-[7px] shrink-0">
        <div className="flex-1 h-[27px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center gap-[6px]">
          <Search className="w-[11px] h-[11px] text-[#666666] stroke-[2] shrink-0" />
          <input
            type="text"
            value={mappingSearch}
            onChange={(e) => setMappingSearch(e.target.value)}
            placeholder="Search Key, Action, Multiaction"
            className="w-full bg-transparent text-[10.5px] text-[#333333] placeholder:text-[#9c9c9c] focus:outline-none"
          />
        </div>

        <div className="w-[62px] h-[27px] rounded-full bg-[#e2e2e2] flex overflow-hidden shrink-0">
          <button
            onClick={() => setMappingViewMode('list')}
            aria-label="List view"
            aria-pressed={mappingViewMode === 'list'}
            className={`flex-1 h-full rounded-l-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center transition-all cursor-pointer ${
              mappingViewMode === 'list'
                ? 'bg-[#000000] text-white'
                : 'text-[#444444] hover:bg-black/5'
            }`}
          >
            <svg
              width="12"
              height="10"
              viewBox="0 0 12 10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            >
              <circle cx="1.5" cy="1.8" r="0.7" fill="currentColor" stroke="none" />
              <line x1="4" y1="1.8" x2="10.8" y2="1.8" />
              <circle cx="1.5" cy="5" r="0.7" fill="currentColor" stroke="none" />
              <line x1="4" y1="5" x2="10.8" y2="5" />
              <circle cx="1.5" cy="8.2" r="0.7" fill="currentColor" stroke="none" />
              <line x1="4" y1="8.2" x2="10.8" y2="8.2" />
            </svg>
          </button>
          <button
            onClick={() => setMappingViewMode('grid')}
            aria-label="Grid view"
            aria-pressed={mappingViewMode === 'grid'}
            className={`flex-1 h-full rounded-r-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center transition-all cursor-pointer ${
              mappingViewMode === 'grid'
                ? 'bg-[#000000] text-white'
                : 'text-[#444444] hover:bg-black/5'
            }`}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
            >
              <rect x="1.2" y="1.2" width="3.8" height="3.8" rx="0.6" />
              <rect x="7" y="1.2" width="3.8" height="3.8" rx="0.6" />
              <rect x="1.2" y="7" width="3.8" height="3.8" rx="0.6" />
              <rect x="7" y="7" width="3.8" height="3.8" rx="0.6" />
            </svg>
          </button>
        </div>
      </div>

      {/* 4 Category Pill Tabs: Basic | Action | Multi-A | Smart-A */}
      <div className="px-[15px] pt-[10px] pb-[10px] grid grid-cols-4 gap-[6px] shrink-0">
        {(['Basic', 'Action', 'Multi-A', 'Smart-A'] as const).map((tab) => {
          const isActive = mappingTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setMappingTab(tab)}
              className={`h-[31px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] text-[11px] font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#000000] text-white'
                  : 'bg-white text-[#444444] hover:bg-neutral-50'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {/* =========================================================== */}
        {/* TAB 1: BASIC (Grid View OR Accordion List View)             */}
        {/* =========================================================== */}
        {mappingTab === 'Basic' && (
          <motion.div
            key={`basic-tab-${mappingViewMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto px-[15px] pb-[20px]"
          >
            {mappingViewMode === 'grid' ? (
              <div className="space-y-[18px]">
                {filteredBasicSections.map((section) => (
                  <div key={section.title}>
                    <div className="text-[11px] font-medium text-[#444444] mb-[8px]">
                      {section.title}
                    </div>

                    <div className="grid grid-cols-5 gap-[6px]">
                      {section.items.map((item) => {
                        const isBeingDragged = draggedTile?.item.id === item.id;
                        const isFlashed = flashedTileId === item.id;
                        return (
                          <button
                            key={item.id}
                            onPointerDown={(e) =>
                              handleStartTileDrag(e, item, 'Basic')
                            }
                            onClick={() => handleAssignTileFromDrawer(item)}
                            title="Click or drag onto a key to assign"
                            className={`h-[54px] rounded-[8px] border-[1.5px] flex flex-col items-center justify-center px-1 select-none cursor-grab active:cursor-grabbing ${
                              isFlashed
                                ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                : isBeingDragged
                                ? 'bg-[#e8e8e8] text-[#a8a8a8] border-transparent transition-colors duration-200'
                                : 'bg-white hover:bg-[#fafafa] text-[#222222] border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                            }`}
                          >
                            {item.isClearIcon ? (
                              <EmptyKeyPlusIcon
                                size={15}
                                stroke={isFlashed ? '#ffffff' : '#9c9c9c'}
                              />
                            ) : item.arrowDir ? (
                              <ArrowKeyGlyph dir={item.arrowDir} />
                            ) : item.top ? (
                              <div className="flex flex-col items-center leading-[1.15] text-[10px]">
                                <span>{item.top}</span>
                                <span>{item.main}</span>
                              </div>
                            ) : (
                              <span className="text-[10px] leading-[1.15] text-center whitespace-pre-line">
                                {item.main}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST VIEW ACCORDION */
              <div className="pt-[4px] divide-y divide-[#dcdcdc] border-b border-[#dcdcdc]">
                {filteredBasicSections.map((section) => {
                  const isExpanded = !!expandedListSections[section.title];
                  return (
                    <div key={section.title} className="py-[11px]">
                      <button
                        onClick={() => toggleListSection(section.title)}
                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-[5px] min-w-0 flex-1">
                          <span className="text-[11px] font-medium text-[#525252] shrink-0">
                            {section.title}
                          </span>
                          <span className="text-[11px] font-normal text-[#a6a6a6] truncate">
                            {section.listPreview}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-[12px] h-[12px] text-[#555555] shrink-0 stroke-[1.8]" />
                        ) : (
                          <ChevronDown className="w-[12px] h-[12px] text-[#555555] shrink-0 stroke-[1.8]" />
                        )}
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              duration: 0.2,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            className="overflow-hidden"
                          >
                            <div className="mt-[12px] max-h-[136px] overflow-y-auto list-accordion-scroll pr-2 space-y-[8px]">
                              {section.items.map((item) => {
                                const rowLabel =
                                  item.listLabel || item.main.replace(/\n/g, ' ');
                                const isFlashed = flashedTileId === item.id;
                                return (
                                  <button
                                    key={item.id}
                                    onPointerDown={(e) =>
                                      handleStartTileDrag(e, item, 'Basic')
                                    }
                                    onClick={() => handleAssignTileFromDrawer(item)}
                                    className={`block w-full px-2 py-0.5 rounded-md border text-left text-[11px] select-none cursor-grab active:cursor-grabbing ${
                                      isFlashed
                                        ? 'bg-[#000000] text-white border-[#000000] transition-colors duration-75'
                                        : 'bg-transparent text-[#666666] hover:text-black border-transparent hover:border-[#0051ff] transition-colors duration-500 ease-out'
                                    }`}
                                  >
                                    {rowLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* =========================================================== */}
        {/* TAB 2: ACTION                                               */}
        {/* =========================================================== */}
        {mappingTab === 'Action' && (
          <motion.div
            key="action-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
          >
            <button
              onClick={() => handleOpenCreatorEditor('Action')}
              className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
            >
              <Plus className="w-[11px] h-[11px] stroke-[2]" />
              <span>New Action</span>
            </button>

            {customItemsByTab.Action.length === 0 ? (
              <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[22px] text-center">
                <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                  Make your first Action!
                </h3>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                  An action is a recordable macro that captures a sequence of key presses.
                </p>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                  You can record multiple keys in the desired order, and then assign the action to a button.
                </p>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                  Once assigned, pressing the button will automatically perform the entire sequence of recorded keys, saving you time and effort.
                </p>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                  This feature is perfect for repetitive tasks, custom shortcuts, or complex commands.
                </p>
                <button
                  onClick={() => showToast('Actions documentation opened')}
                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                >
                  Discover more about Actions
                </button>
              </div>
            ) : (
              renderCustomItemGroups('Action', customItemsByTab.Action, 'My Actions')
            )}
          </motion.div>
        )}

        {/* =========================================================== */}
        {/* TAB 3: MULTI-A                                              */}
        {/* =========================================================== */}
        {mappingTab === 'Multi-A' && (
          <motion.div
            key="multi-a-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
          >
            <button
              onClick={() => handleOpenCreatorEditor('Multi-A')}
              className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
            >
              <Plus className="w-[11px] h-[11px] stroke-[2]" />
              <span>New Multiaction</span>
            </button>

            {customItemsByTab['Multi-A'].length === 0 ? (
              <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[20px] text-center">
                <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                  Make your first Multiaction!
                </h3>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                  Multiactions let you assign multiple functions to a single button based on how you interact with it.
                </p>

                <div className="w-full text-[10.5px] leading-[1.45] text-[#666666] mb-[11px] space-y-[2px]">
                  <div className="flex items-start">
                    <span className="w-3 text-left shrink-0">•</span>
                    <span className="flex-1 text-center">
                      Tap the button to play or pause your music.
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-3 text-left shrink-0">•</span>
                    <span className="flex-1 text-center">
                      Double tap it to skip to the next track.
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-3 text-left shrink-0">•</span>
                    <span className="flex-1 text-center">
                      Hold the button to stop.
                    </span>
                  </div>
                  <div className="flex items-start">
                    <span className="w-3 text-left shrink-0">•</span>
                    <span className="flex-1 text-center">
                      Tap and hold it to activate your voice assistant.
                    </span>
                  </div>
                </div>

                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                  This flexibility means one button can handle several tasks, streamlining your workflow and reducing the need for additional controls.
                </p>
                <button
                  onClick={() => showToast('Multiactions documentation opened')}
                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                >
                  Discover more about Multiactions
                </button>
              </div>
            ) : (
              renderCustomItemGroups('Multi-A', customItemsByTab['Multi-A'], 'My Multiactions')
            )}
          </motion.div>
        )}

        {/* =========================================================== */}
        {/* TAB 4: SMART-A                                              */}
        {/* =========================================================== */}
        {mappingTab === 'Smart-A' && (
          <motion.div
            key="smart-a-tab"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col px-[15px] pb-[15px] overflow-hidden"
          >
            <button
              onClick={() => handleOpenCreatorEditor('Smart-A')}
              className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center gap-[6px] text-[10.5px] font-medium text-[#4a4a4a] shadow-[0_1px_2px_rgba(0,0,0,0.03)] mb-[15px] shrink-0 transition-all cursor-pointer"
            >
              <Plus className="w-[11px] h-[11px] stroke-[2]" />
              <span>New Smart Action</span>
            </button>

            {customItemsByTab['Smart-A'].length === 0 ? (
              <div className="flex-1 rounded-[20px] border border-dashed border-[#cfcfcf] flex flex-col items-center justify-center px-[24px] text-center">
                <h3 className="text-[15.5px] font-semibold text-[#5e5e5e] mb-[14px]">
                  Make your first Smart Action!
                </h3>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[11px]">
                  A smart action lets you type text, run commands, open websites, or launch apps with a single key press.
                </p>
                <p className="text-[10.5px] leading-[1.35] text-[#666666] mb-[22px]">
                  Create one, then assign it to a button to trigger it instantly.
                </p>
                <button
                  onClick={() => showToast('Smart Actions documentation opened')}
                  className="text-[10.5px] text-[#5c5c5c] underline underline-offset-2 hover:text-black cursor-pointer"
                >
                  Discover more about Smart Actions
                </button>
              </div>
            ) : (
              renderCustomItemGroups('Smart-A', customItemsByTab['Smart-A'], 'My Smart Actions')
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default ActionLibrarySidebar;