import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GRID_MACRO_KEY_SLOTS, type GridMacroSlotId } from '../deviceLayout';
import type { PresetCatalogAction, PresetCatalogEntry } from '../presetCatalog';
import { formatPresetSequence, type PresetItem } from '../presetLibrary';

export interface PresetDetailPreviewProps {
  previewPreset: PresetItem | null;
  previewPresetDetails?: PresetCatalogEntry;
  presetOs: 'mac' | 'win';
  isPreviewPresetInstalled: boolean;
  hoveredPreviewSlot: GridMacroSlotId | null;
  hoveredPreviewDial: 'cw' | 'press' | 'ccw' | null;
  onClose: () => void;
  onInstallPreset: (preset: PresetItem) => void;
  setHoveredPreviewSlot: (slot: GridMacroSlotId | null) => void;
  setHoveredPreviewDial: (dir: 'cw' | 'press' | 'ccw' | null) => void;
  renderMacropadDevice: (preset: PresetItem) => React.ReactNode;
  renderAppIcon: (presetId: string, size?: number) => React.ReactNode;
}

export function PresetDetailPreview({
  previewPreset,
  previewPresetDetails,
  presetOs,
  isPreviewPresetInstalled,
  hoveredPreviewSlot,
  hoveredPreviewDial,
  onClose,
  onInstallPreset,
  setHoveredPreviewSlot,
  setHoveredPreviewDial,
  renderMacropadDevice,
  renderAppIcon,
}: PresetDetailPreviewProps) {
  return (
    <AnimatePresence>
      {previewPreset && previewPresetDetails && (
        <motion.main
          key={`preset-preview-${previewPreset.id}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 z-50 overflow-y-auto bg-[#efefef]"
          aria-label={`${previewPreset.title} preset preview`}
        >
          <div className="w-full max-w-[1300px] mx-auto px-5 sm:px-7 lg:px-[30px] pt-[12px] pb-[52px]">
            <div className="w-full max-w-[1125px]">
              <button
                type="button"
                aria-label="Back to presets"
                onClick={onClose}
                className="flex items-center gap-[12px] text-[16px] text-[#222] cursor-pointer hover:text-[#0051ff] transition-colors"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M13 8H3M3 8L7 4M3 8L7 12" />
                </svg>
                Back
              </button>

              <header className="mt-[29px] flex flex-col md:flex-row md:items-start md:justify-between gap-6 md:gap-10">
                <div className="w-full md:w-[268px] shrink-0">
                  <div className="flex items-center gap-[16px]">
                    {renderAppIcon(previewPreset.id, 52)}
                    <div>
                      <div className="text-[13px] text-[#8a8a8a] leading-none mb-[6px]">
                        Layer preset
                      </div>
                      <h1 className="text-[21px] font-medium text-[#111] leading-none">
                        {previewPreset.title}
                      </h1>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={
                      isPreviewPresetInstalled
                        ? `${previewPreset.title} preset already installed on this profile`
                        : `Install ${previewPreset.title} preset`
                    }
                    onClick={() => onInstallPreset(previewPreset)}
                    disabled={isPreviewPresetInstalled}
                    className="mt-[20px] w-full h-[39px] rounded-full bg-black hover:bg-[#0051ff] text-white text-[13px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-[#777777] disabled:hover:bg-[#777777]"
                  >
                    {isPreviewPresetInstalled ? 'Installed' : 'Install'}
                  </button>
                </div>
                <div className="md:max-w-[540px] md:pt-[8px] md:text-right">
                  <p className="text-[15px] leading-[1.5] text-[#888]">
                    {previewPresetDetails.description}
                  </p>
                  <p className="mt-[8px] text-[15px] text-[#222]">
                    <span className="font-semibold">Author:</span>{' '}
                    {previewPresetDetails.author}
                  </p>
                </div>
              </header>

              <section className="mt-[58px] grid grid-cols-1 lg:grid-cols-[214px_minmax(0,1fr)] gap-x-[48px] gap-y-[30px]">
                <div className="flex flex-col items-center lg:items-start">
                  {renderMacropadDevice(previewPreset)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-[36px] gap-y-[20px] content-start">
                  {previewPresetDetails.keys.map((action: PresetCatalogAction, index: number) => {
                    const keySlot = GRID_MACRO_KEY_SLOTS[index];
                    const isHovered = keySlot !== undefined && hoveredPreviewSlot === keySlot;
                    const shortcut = action.multi
                      ? `Tap ${formatPresetSequence(action.multi.onTap, presetOs).toLowerCase()}${
                          action.multi.doubleTap
                            ? ` · Double tap ${formatPresetSequence(action.multi.doubleTap, presetOs).toLowerCase()}`
                            : ''
                        }`
                      : formatPresetSequence(action.keys, presetOs).toLowerCase();
                    return (
                      <div
                        key={`${previewPreset.id}-key-${index}`}
                        onMouseEnter={() => setHoveredPreviewSlot(keySlot ?? null)}
                        onMouseLeave={() => setHoveredPreviewSlot(null)}
                        className="flex items-start gap-[11px] min-w-0"
                      >
                        <span
                          data-preview-action-number={index + 1}
                          className={`mt-[1px] w-[21px] h-[21px] shrink-0 rounded-full bg-white text-[9px] font-medium flex items-center justify-center transition-all duration-150 ${
                            isHovered
                              ? 'text-[#0051ff] ring-1 ring-[#0051ff] shadow-[0_0_9px_rgba(0,81,255,0.65)]'
                              : 'text-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-[9px] gap-y-[2px]">
                            <span className="text-[14px] font-medium leading-[1.2] text-[#222]">
                              {action.name}
                            </span>
                            <span className="text-[12px] font-medium leading-[1.2] text-[#222]">
                              {shortcut}
                            </span>
                          </div>
                          <p className="mt-[4px] text-[11.5px] leading-[1.35] text-[#999]">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="mt-[34px] h-px bg-black/[0.09]" />

              <section className="pt-[24px] grid grid-cols-1 lg:grid-cols-[214px_minmax(0,1fr)] gap-x-[48px] gap-y-[24px]">
                <div className="flex flex-col items-center">
                  <div className="text-[13px] text-[#666] mb-[9px]">Dial</div>
                  <div className="h-[68px] px-[17px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-[10px]">
                    {([
                      { direction: 'cw', text: 'CW', glyph: '↻' },
                      { direction: 'press', text: 'PRESS', glyph: '↓' },
                      { direction: 'ccw', text: 'CCW', glyph: '↺' },
                    ] as const).map((item, index) => {
                      const actionNumber = previewPresetDetails.keys.length + index + 1;
                      const isHovered = hoveredPreviewDial === item.direction;
                      return (
                        <div
                          key={item.direction}
                          data-preview-dial-control={item.direction}
                          onMouseEnter={() => setHoveredPreviewDial(item.direction)}
                          onMouseLeave={() => setHoveredPreviewDial(null)}
                          className="relative"
                        >
                          <span
                            data-preview-dial-control-number={actionNumber}
                            className={`absolute -top-[5px] -right-[3px] z-10 w-[15px] h-[15px] rounded-full bg-white text-[8px] font-medium flex items-center justify-center transition-all duration-150 ${
                              isHovered
                                ? 'text-[#0051ff] ring-1 ring-[#0051ff] shadow-[0_0_9px_rgba(0,81,255,0.65)]'
                                : 'text-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                            }`}
                          >
                            {actionNumber}
                          </span>
                          <div
                            data-preview-dial-circle={item.direction}
                            className={`w-[48px] h-[48px] rounded-full bg-[#171717] text-white flex flex-col items-center justify-center transition-all duration-150 ${
                              isHovered
                                ? 'ring-2 ring-[#0051ff] shadow-[0_0_12px_rgba(0,81,255,0.65)]'
                                : ''
                            }`}
                          >
                            <span className="text-[15px] leading-none text-[#0051ff]">{item.glyph}</span>
                            <span className="mt-[2px] text-[8px] font-semibold tracking-[0.04em] text-white/80">
                              {item.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-[36px] gap-y-[20px] content-start">
                  {([
                    { direction: 'cw', action: previewPresetDetails.dial.cw },
                    { direction: 'press', action: previewPresetDetails.dial.press },
                    { direction: 'ccw', action: previewPresetDetails.dial.ccw },
                  ] as const).map(({ direction, action }) => {
                    const actionNumber = previewPresetDetails.keys.length + (direction === 'cw' ? 1 : direction === 'press' ? 2 : 3);
                    const isHovered = hoveredPreviewDial === direction;
                    return (
                      <div
                        key={`${previewPreset.id}-dial-${direction}`}
                        onMouseEnter={() => setHoveredPreviewDial(direction)}
                        onMouseLeave={() => setHoveredPreviewDial(null)}
                        className="flex items-start gap-[11px] min-w-0"
                      >
                        <span
                          data-preview-dial-action-number={actionNumber}
                          className={`mt-[1px] w-[21px] h-[21px] shrink-0 rounded-full bg-white text-[9px] font-medium flex items-center justify-center transition-all duration-150 ${
                            isHovered
                              ? 'text-[#0051ff] ring-1 ring-[#0051ff] shadow-[0_0_9px_rgba(0,81,255,0.65)]'
                              : 'text-[#444] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
                          }`}
                        >
                          {actionNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-[9px] gap-y-[2px]">
                            <span className="text-[14px] font-medium leading-[1.2] text-[#222]">
                              {action.name}
                            </span>
                            <span className="text-[12px] font-medium leading-[1.2] text-[#222]">
                              {formatPresetSequence(action.keys, presetOs).toLowerCase()}
                            </span>
                          </div>
                          <p className="mt-[4px] text-[11.5px] leading-[1.35] text-[#999]">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </motion.main>
      )}
    </AnimatePresence>
  );
}

export default PresetDetailPreview;
