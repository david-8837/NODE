import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { GRID_MACRO_ENCODER_SLOT } from '../deviceLayout';
import type { EncoderSubActionId, EncoderSubBinding } from '../presetLibrary';

export interface EncoderPopupCapsuleProps {
  slotId: typeof GRID_MACRO_ENCODER_SLOT;
  side: 'left' | 'right';
  actions: Record<EncoderSubActionId, EncoderSubBinding>;
  selectedSub: EncoderSubActionId | null;
  dragOverSub: EncoderSubActionId | null;
  dragOverDisallowed?: boolean;
  onSelectSub: (sub: EncoderSubActionId) => void;
  onStartSubDrag: (e: React.PointerEvent, sub: EncoderSubActionId) => void;
}

export function EncoderPopupCapsule({
  slotId,
  side,
  actions,
  selectedSub,
  dragOverSub,
  dragOverDisallowed = false,
  onSelectSub,
  onStartSubDrag,
}: EncoderPopupCapsuleProps) {
  const [hoveredSub, setHoveredSub] = useState<EncoderSubActionId | null>(null);

  const items: { id: EncoderSubActionId; bottomText?: string }[] = [
    { id: 'cw', bottomText: 'CW' },
    { id: 'press' },
    { id: 'ccw', bottomText: 'CCW' },
  ];

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.84,
        x: side === 'left' ? 18 : -18,
        filter: 'blur(2px)',
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: 0,
        filter: 'blur(0px)',
      }}
      exit={{
        opacity: 0,
        scale: 0.86,
        x: side === 'left' ? 14 : -14,
        filter: 'blur(2px)',
      }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      style={{
        transformOrigin: side === 'left' ? 'right center' : 'left center',
      }}
      className={`absolute top-[11px] ${
        side === 'left' ? 'right-[calc(100%+7px)]' : 'left-[calc(100%+7px)]'
      } h-[58px] px-[6px] rounded-full bg-[#e2e2e2] shadow-[0_3px_12px_rgba(0,0,0,0.08)] border border-black/[0.03] flex items-center gap-[6px] z-30`}
    >
      {items.map((item) => {
        const subData = actions[item.id];
        const isSelected = selectedSub === item.id;
        const isDragOver = dragOverSub === item.id;
        const isDisallowedDrag = isDragOver && Boolean(dragOverDisallowed);
        const isHovered = hoveredSub === item.id || isDragOver;
        const accentStroke = isDisallowedDrag
          ? '#ffffff'
          : isSelected
          ? '#ffffff'
          : '#0051ff';

        return (
          <div key={item.id} className="relative flex items-center justify-center">
            {/* Floating assigned-key pill above hovered sub-button (turns red if disallowed) */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.94 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className={`absolute -top-[36px] left-1/2 -translate-x-1/2 h-[27px] px-[13px] rounded-full flex items-center justify-center text-[11px] font-medium whitespace-nowrap pointer-events-none z-40 transition-colors ${
                    isDisallowedDrag
                      ? 'bg-[#ef4444] text-white shadow-[0_2px_10px_rgba(239,68,68,0.5)]'
                      : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] text-[#555555]'
                  }`}
                >
                  {isDisallowedDrag ? 'Cannot assign here' : subData.binding}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.93 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              data-drop-slot={slotId}
              data-drop-encoder-sub={item.id}
              onPointerDown={(e) => onStartSubDrag(e, item.id)}
              onClick={() => onSelectSub(item.id)}
              onMouseEnter={() => setHoveredSub(item.id)}
              onMouseLeave={() => setHoveredSub(null)}
              className={`w-[46px] h-[46px] rounded-full relative flex flex-col items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
                isDisallowedDrag
                  ? 'bg-[#ef4444] border-[#ef4444] text-white shadow-[0_0_18px_rgba(239,68,68,0.95)] ring-2 ring-red-400/40 z-20'
                  : isSelected
                  ? 'bg-[#0051ff] border-[#0051ff] text-white shadow-[0_0_14px_rgba(0,81,255,0.85)]'
                  : isDragOver
                  ? 'bg-[#313131] text-white border-[#0051ff] shadow-[0_0_10px_rgba(0,81,255,0.5)]'
                  : 'bg-[#313131] text-white border-transparent hover:border-[#0051ff]'
              }`}
            >
              {/* SVG Directional Arrows (CW arc, Press down arrow, CCW arc) in Blue theme */}
              <svg
                width="46"
                height="46"
                viewBox="0 0 46 46"
                fill="none"
                className="absolute inset-0 pointer-events-none"
              >
                {item.id === 'cw' && (
                  <>
                    <path
                      d="M 6.2 22.5 A 16.8 16.8 0 0 1 20.5 6.8"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 17.2 4.8 L 21.1 6.7 L 18.4 10.3"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {item.id === 'press' && (
                  <>
                    <path
                      d="M 23 30.5 L 23 39.2"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 19.8 36.2 L 23 39.5 L 26.2 36.2"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}

                {item.id === 'ccw' && (
                  <>
                    <path
                      d="M 39.8 22.5 A 16.8 16.8 0 0 0 25.5 6.8"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 28.8 4.8 L 24.9 6.7 L 27.6 10.3"
                      stroke={accentStroke}
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                )}
              </svg>

              {/* Center Short Assigned Label (e.g. vo..., pl...) */}
              <span
                className={`text-[10.5px] font-medium leading-none tracking-[0.01em] z-10 ${
                  item.id === 'press' ? '-mt-[4px]' : 'mt-[4px]'
                }`}
              >
                {subData.label}
              </span>

              {/* Bottom CW / CCW Label */}
              {item.bottomText && (
                <span className="text-[8.5px] font-semibold leading-none tracking-[0.03em] mt-[3px] z-10">
                  {item.bottomText}
                </span>
              )}
            </motion.button>
          </div>
        );
      })}
    </motion.div>
  );
}
