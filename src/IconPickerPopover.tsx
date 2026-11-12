import type { ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { ICON_SEARCH_PAGE_SIZE, type IconSearchResults } from './iconCatalog';
import type { EmojiCatalogEntry } from './emojiCatalog';

interface IconPickerPopoverProps {
  open: boolean;
  selectedIconId?: string;
  selectedEmoji?: string;
  iconPickerTab: 'Icon' | 'Emoji';
  iconPickerSearch: string;
  iconPickerShowAll: boolean;
  iconPickerPage: number;
  iconCatalogLength: number;
  iconSearchResults: IconSearchResults;
  selectableEmojiList: EmojiCatalogEntry[];
  IconRenderer: ComponentType<{ id: string; size?: number }>;
  onClose: () => void;
  onTabChange: (tab: 'Icon' | 'Emoji') => void | Promise<void>;
  onSearchChange: (search: string) => void;
  onSelectIcon: (iconId: string) => void;
  onSelectEmoji: (emoji: string) => void;
  onBrowseAll: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function IconPickerPopover({
  open,
  selectedIconId,
  selectedEmoji,
  iconPickerTab,
  iconPickerSearch,
  iconPickerShowAll,
  iconPickerPage,
  iconCatalogLength,
  iconSearchResults,
  selectableEmojiList,
  IconRenderer,
  onClose,
  onTabChange,
  onSearchChange,
  onSelectIcon,
  onSelectEmoji,
  onBrowseAll,
  onPreviousPage,
  onNextPage,
}: IconPickerPopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
          className="absolute top-[68px] left-0 w-[216px] bg-[#efefef] rounded-[18px] p-[11px] shadow-[0_8px_28px_rgba(0,0,0,0.16)] border border-black/[0.06] z-50"
        >
          <div className="flex items-center justify-between mb-[10px]">
            <button
              onClick={onClose}
              className="w-[22px] h-[22px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] flex items-center justify-center text-[#555555] hover:text-black transition-all cursor-pointer"
            >
              <X className="w-[13px] h-[13px] stroke-[1.8]" />
            </button>
            <span className="text-[11px] font-medium text-[#555555]">Select Icon</span>
            <div className="w-5" />
          </div>

          {/* Icon | Emoji Segmented Toggle */}
          <div className="h-[26px] rounded-full bg-white flex overflow-hidden mb-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            {(['Icon', 'Emoji'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => void onTabChange(tab)}
                className={`flex-1 h-full text-[10.5px] font-medium transition-colors cursor-pointer ${
                  iconPickerTab === tab
                    ? 'bg-[#000000] text-white rounded-full'
                    : 'text-[#555555] hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Icon / Emoji */}
          <div className="h-[25px] rounded-full bg-white px-[9px] flex items-center gap-[5px] mb-[8px] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <Search className="w-[10px] h-[10px] text-[#666666] stroke-[2] shrink-0" />
            <input
              type="text"
              value={iconPickerSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={iconPickerTab === 'Icon' ? 'Search icon' : 'Search emoji'}
              className="w-full bg-transparent text-[10px] text-[#333333] placeholder:text-[#a0a0a0] focus:outline-none"
            />
          </div>

          {/* Grid of Real Icons or Real Emojis */}
          <div className="bg-white rounded-[14px] p-[8px] h-[196px] overflow-y-auto list-accordion-scroll grid grid-cols-6 gap-[6px] content-start">
            {iconPickerTab === 'Icon' ? (
              iconSearchResults.icons.length > 0 ? (
                iconSearchResults.icons.map((icon) => {
                  const isChosen = selectedIconId === icon.id;
                  return (
                    <button
                      key={icon.id}
                      onClick={() => onSelectIcon(icon.id)}
                      title={icon.id}
                      aria-label={`Select icon ${icon.id.replaceAll('-', ' ')}`}
                      aria-pressed={isChosen}
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        isChosen
                          ? 'bg-[#0051ff] text-white'
                          : 'bg-[#dcdcdc] text-[#444444] hover:bg-[#0051ff] hover:text-white'
                      }`}
                    >
                      <IconRenderer id={icon.id} size={13} />
                    </button>
                  );
                })
              ) : (
                <p className="col-span-6 py-4 text-center text-[10px] text-[#777777]">
                  No icons found
                </p>
              )
            ) : (
              selectableEmojiList
                .filter(
                  (emoji) =>
                    !iconPickerSearch.trim() ||
                    emoji.keywords.toLowerCase().includes(iconPickerSearch.toLowerCase()) ||
                    emoji.emoji.includes(iconPickerSearch)
                )
                .map((emoji, index) => {
                  const isChosen = selectedEmoji === emoji.emoji;
                  return (
                    <button
                      key={`${emoji.emoji}-${index}`}
                      onClick={() => onSelectEmoji(emoji.emoji)}
                      title={emoji.keywords.split(' ')[0]}
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[14px] transition-colors cursor-pointer ${
                        isChosen
                          ? 'bg-[#0051ff] text-white'
                          : 'bg-[#efefef] hover:bg-[#0051ff]'
                      }`}
                    >
                      {emoji.emoji}
                    </button>
                  );
                })
            )}
          </div>
          {iconPickerTab === 'Icon' && (
            <div className="mt-[7px] flex min-h-[17px] items-center justify-between px-[3px]">
              {!iconPickerSearch.trim() && !iconPickerShowAll ? (
                <button
                  onClick={onBrowseAll}
                  className="text-[9px] font-medium text-[#0051ff] hover:underline cursor-pointer"
                >
                  Browse all {iconCatalogLength.toLocaleString()} icons
                </button>
              ) : (
                <>
                  <span className="text-[8px] text-[#777777]" aria-live="polite">
                    Showing{' '}
                    {iconSearchResults.total === 0
                      ? '0'
                      : `${(iconPickerPage * ICON_SEARCH_PAGE_SIZE + 1).toLocaleString()}–${Math.min(
                          (iconPickerPage + 1) * ICON_SEARCH_PAGE_SIZE,
                          iconSearchResults.total
                        ).toLocaleString()}`}{' '}
                    of {iconSearchResults.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-[4px]">
                    {iconPickerPage > 0 && (
                      <button
                        aria-label="Previous icon results"
                        title="Previous icons"
                        onClick={onPreviousPage}
                        className="w-[18px] h-[18px] rounded-full text-[12px] text-[#555555] hover:bg-[#e8e8e8] cursor-pointer"
                      >
                        ‹
                      </button>
                    )}
                    {(iconPickerPage + 1) * ICON_SEARCH_PAGE_SIZE < iconSearchResults.total && (
                      <button
                        aria-label="Next icon results"
                        title="Next icons"
                        onClick={onNextPage}
                        className="w-[18px] h-[18px] rounded-full text-[12px] text-[#555555] hover:bg-[#e8e8e8] cursor-pointer"
                      >
                        ›
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
