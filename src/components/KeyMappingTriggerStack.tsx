import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { InfoCircleIcon, IsometricKeyIcon } from './UiIcons';
import { getEntranceMotionProps, type EntrancePhase } from '../entranceAnimations';

export type MappingHoverType = 'Basic Key' | 'Action' | 'Multiaction' | 'Smart Action' | null;

export interface KeyMappingTriggerStackProps {
  entrancePhase: EntrancePhase;
  mappingDrawerOpen: boolean;
  activeTooltip: string | null;
  setActiveTooltip: (tooltip: 'profiles' | 'layers' | 'mapping' | null) => void;
  hoveredMappingType: MappingHoverType;
  setHoveredMappingType: React.Dispatch<React.SetStateAction<MappingHoverType>>;
  mappingStackExpanded: boolean;
  setMappingStackExpanded: (expanded: boolean) => void;
  handleOpenDrawerWithTab: (tab: 'Basic' | 'Action' | 'Multi-A' | 'Smart-A') => void;
}

export function KeyMappingTriggerStack({
  entrancePhase,
  mappingDrawerOpen,
  activeTooltip,
  setActiveTooltip,
  hoveredMappingType,
  setHoveredMappingType,
  mappingStackExpanded,
  setMappingStackExpanded,
  handleOpenDrawerWithTab,
}: KeyMappingTriggerStackProps) {
  if (mappingDrawerOpen) return null;

  return (
    <motion.div
      {...getEntranceMotionProps(entrancePhase, { delay: 0.26 })}
      className="flex flex-col items-end relative pointer-events-auto justify-self-end"
    >
      <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
        <button
          onClick={() =>
            setActiveTooltip(activeTooltip === 'mapping' ? null : 'mapping')
          }
          onMouseEnter={() => setActiveTooltip('mapping')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
          aria-label="Key Mapping Info"
        >
          <InfoCircleIcon />
        </button>
        <span>Key Mapping</span>
      </div>

      <AnimatePresence>
        {activeTooltip === 'mapping' && (
          <motion.div
            key="mapping-tooltip"
            initial={{ opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[25px] right-[68px] w-[235px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
          >
            <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
              What is Key Mapping?
            </div>
            <p className="text-[11px] leading-[1.36] text-[#686868] mb-[8px]">
              Assign actions to each physical key. Click a key to define what it does on the selected layer.
            </p>
            <div className="text-[11px] text-[#686868] mb-[3px]">
              Keys can trigger:
            </div>
            <ul className="list-disc pl-[16px] text-[11px] leading-[1.36] text-[#686868]">
              <li>Basic inputs</li>
              <li>Shortcuts</li>
              <li>Multi-step actions</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed-height anchor so top row height never changes */}
      <div className="mt-[10px] w-[49px] h-[49px]" />

      {/* Floating action stack overlay — hover boundary is strictly the 49px square buttons column (NOT the text capsule) */}
      <div
        onMouseLeave={() => {
          setHoveredMappingType(null);
          setMappingStackExpanded(false);
        }}
        className="absolute top-[28px] right-0 w-[49px] flex flex-col items-end z-30"
      >
        {!mappingStackExpanded ? (
          <motion.button
            key="plus-trigger"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => setMappingStackExpanded(true)}
            onClick={() => handleOpenDrawerWithTab('Basic')}
            title="Open Key Mapping"
            className="w-[49px] h-[49px] bg-white rounded-[11px] border-[1.5px] border-transparent hover:border-[#0051ff] shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_14px_rgba(0,81,255,0.18)] flex items-center justify-center text-[#333333] transition-all cursor-pointer"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <path d="M8 2V14M2 8H14" />
            </svg>
          </motion.button>
        ) : (
          <motion.div
            key="action-stack"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="w-[49px] flex flex-col items-end gap-[9px]"
          >
            {(
              [
                { label: 'Basic Key', tab: 'Basic', icon: 'B' },
                { label: 'Action', tab: 'Action', icon: 'A' },
                { label: 'Multiaction', tab: 'Multi-A', icon: 'MA' },
                { label: 'Smart Action', tab: 'Smart-A', icon: 'S' },
              ] as const
            ).map((entry, idx) => {
              const isHovered = hoveredMappingType === entry.label;
              return (
                <motion.div
                  key={entry.label}
                  initial={{ opacity: 0, y: -10, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.92 }}
                  transition={{
                    duration: 0.28,
                    delay: idx * 0.045,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="w-[49px] h-[49px] relative flex items-center justify-end"
                >
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, x: 8, scale: 0.96 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 6, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute right-[58px] h-[29px] px-[14px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center text-[11px] font-medium text-[#555555] whitespace-nowrap pointer-events-none"
                      >
                        {entry.label}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onMouseEnter={() => setHoveredMappingType(entry.label)}
                    onClick={() => handleOpenDrawerWithTab(entry.tab)}
                    className={`w-[49px] h-[49px] rounded-[11px] border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-[#0051ff] border-[#0051ff] text-black shadow-[0_4px_14px_rgba(0,81,255,0.35)]'
                        : 'bg-white border-transparent hover:border-[#0051ff] text-[#444444] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    <IsometricKeyIcon
                      type={entry.icon}
                      active={isHovered}
                    />
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
