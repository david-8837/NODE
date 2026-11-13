import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getEntranceMotionProps, getKeycapEntranceOptions, type EntrancePhase } from '../entranceAnimations';
import { GRID_MACRO_ENCODER_SLOT, GRID_MACRO_KEY_SLOTS } from '../deviceLayout';
import { getEncoderActions, type KeySlotId, type LayerKeymap, type EncoderSubActionId, type EncoderSubBinding } from '../keymapModel';
import { CustomPickerIcon, EmptyKeyPlusIcon } from './StudioIcons';

interface MacropadDeviceProps {
  layer: LayerKeymap;
  selectedKey: KeySlotId | null;
  selectedEncoderSub: EncoderSubActionId | null;
  dragOverTarget: { slotId: KeySlotId; subAction?: EncoderSubActionId } | null;
  draggedFromSlot?: KeySlotId | null;
  encoderAngle: number;
  onSelectKey: (slotId: KeySlotId) => void;
  onSelectEncoderSub: (
    slotId: typeof GRID_MACRO_ENCODER_SLOT,
    sub: EncoderSubActionId
  ) => void;
  onStartKeyDrag?: (
    e: React.PointerEvent,
    slotId: KeySlotId,
    sub?: EncoderSubActionId
  ) => void;
  onKeyPointerUp?: (
    e: React.PointerEvent,
    slotId: KeySlotId,
    sub?: EncoderSubActionId
  ) => void;
  onKeyPointerLeave?: (
    e: React.PointerEvent,
    slotId: KeySlotId
  ) => void;
  onHoverSlot?: (slotId: KeySlotId | null) => void;
  highlightedSlot?: KeySlotId | null;
  activePhysicalSlot?: string | null;
  entrancePhase?: EntrancePhase;
  showSlotNumbers?: boolean;
}

export function MacropadDevice({
  layer,
  selectedKey,
  selectedEncoderSub,
  dragOverTarget,
  draggedFromSlot = null,
  encoderAngle,
  onSelectKey,
  onSelectEncoderSub,
  onStartKeyDrag = () => {},
  onKeyPointerUp,
  onKeyPointerLeave,
  onHoverSlot,
  highlightedSlot = null,
  activePhysicalSlot = null,
  entrancePhase,
  showSlotNumbers = false,
}: MacropadDeviceProps) {
  const isEncoderOpen = selectedKey === GRID_MACRO_ENCODER_SLOT;

  return (
    <div className="relative flex items-center justify-center">
      <AnimatePresence>
        {isEncoderOpen && (
          <EncoderPopupCapsule
            key="grid-macro-encoder-popup"
            slotId={GRID_MACRO_ENCODER_SLOT}
            side="right"
            actions={getEncoderActions(layer[GRID_MACRO_ENCODER_SLOT])}
            selectedSub={selectedEncoderSub}
            dragOverSub={
              dragOverTarget?.slotId === GRID_MACRO_ENCODER_SLOT
                ? dragOverTarget.subAction || null
                : null
            }
            onSelectSub={(sub) =>
              onSelectEncoderSub(GRID_MACRO_ENCODER_SLOT, sub)
            }
            onStartSubDrag={(e, sub) =>
              onStartKeyDrag(e, GRID_MACRO_ENCODER_SLOT, sub)
            }
          />
        )}
      </AnimatePresence>

      <div className="w-[172px] bg-[#050505] rounded-[24px] p-[12px] flex flex-col items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <div className="w-full bg-[#151515] rounded-[16px] p-[6px] flex flex-col gap-[6px]">
          <div className="grid grid-cols-3 gap-[3px] items-center h-[42px] w-full">
            <motion.div
              {...getEntranceMotionProps(entrancePhase, {
                delay: 0.96,
                duration: 0.4,
                offsetY: 5,
                initialScale: 0.98,
              })}
              className="w-[42px] h-[42px] flex items-center justify-center select-none"
            >
              <span className="w-[5px] h-[5px] rounded-full bg-[#e8e8e8] shadow-[0_0_6px_rgba(255,255,255,0.85)]" />
            </motion.div>
            <div className="w-[42px] h-[42px]" />
            <motion.div
              {...getEntranceMotionProps(entrancePhase, {
                delay: 0.96,
                duration: 0.4,
                offsetY: 5,
                initialScale: 0.98,
              })}
              className="w-[42px] h-[42px] flex items-center justify-center"
            >
              <FlatDialControl
                selected={isEncoderOpen}
                isPressed={activePhysicalSlot === GRID_MACRO_ENCODER_SLOT}
                angle={encoderAngle}
                title={`Dial: ${layer[GRID_MACRO_ENCODER_SLOT].binding}`}
                onClick={() => onSelectKey(GRID_MACRO_ENCODER_SLOT)}
              />
            </motion.div>
          </div>

          <div className="grid grid-cols-3 grid-rows-3 gap-[3px] place-items-center">
            {GRID_MACRO_KEY_SLOTS.map((slotId, index) => (
              <KeycapButton
                key={slotId}
                entrancePhase={entrancePhase}
                entranceIndex={index}
                slotId={slotId}
                label={layer[slotId].label}
                binding={layer[slotId].binding}
                iconId={layer[slotId].iconId}
                color={showSlotNumbers ? undefined : layer[slotId].color}
                slotNumber={showSlotNumbers ? index + 1 : undefined}
                selected={selectedKey === slotId}
                dragOver={dragOverTarget?.slotId === slotId}
                isDraggingSource={draggedFromSlot === slotId}
                onClick={() => onSelectKey(slotId)}
                onPointerDown={(e) => onStartKeyDrag(e, slotId)}
                onPointerUp={(e) => onKeyPointerUp?.(e, slotId)}
                onPointerLeave={(e) => onKeyPointerLeave?.(e, slotId)}
                onHoverSlot={onHoverSlot}
                previewHighlighted={highlightedSlot === slotId || activePhysicalSlot === slotId}
                isPhysicalPressed={activePhysicalSlot === slotId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlatDialControl({
  selected,
  isPressed = false,
  angle,
  title,
  onClick,
}: {
  selected: boolean;
  isPressed?: boolean;
  angle: number;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[39px] h-[39px] rounded-full relative flex items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
        isPressed
          ? 'scale-[0.92] border-[#0051ff] shadow-[0_0_18px_rgba(0,81,255,0.9)] z-20 brightness-110'
          : selected
          ? 'border-[#0051ff] shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : 'border-transparent hover:border-[#0051ff] hover:z-10'
      }`}
    >
      <svg
        width="39"
        height="39"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 pointer-events-none"
        style={{ transform: `rotate(${angle - 45}deg)` }}
      >
        <defs>
          <linearGradient id="dialUpperLeft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1b1b1b" />
            <stop offset="48%" stopColor="#353535" />
            <stop offset="50%" stopColor="#4c4c4c" />
            <stop offset="52%" stopColor="#262626" />
            <stop offset="100%" stopColor="#333333" />
          </linearGradient>
          <linearGradient id="dialSelectedBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0051ff" />
            <stop offset="49%" stopColor="#0051ff" />
            <stop offset="51%" stopColor="#003ec7" />
            <stop offset="100%" stopColor="#004be8" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={selected ? 'url(#dialSelectedBlue)' : 'url(#dialUpperLeft)'}
          stroke={selected ? '#0051ff' : '#262626'}
          strokeWidth="0.8"
        />
        <line
          x1="6.5"
          y1="33.5"
          x2="33.5"
          y2="6.5"
          stroke={selected ? 'rgba(255,255,255,0.45)' : '#4a4a4a'}
          strokeWidth="1.1"
          strokeOpacity="0.7"
        />
      </svg>
    </button>
  );
}

function EncoderPopupCapsule({
  slotId,
  side,
  actions,
  selectedSub,
  dragOverSub,
  onSelectSub,
  onStartSubDrag,
}: {
  slotId: typeof GRID_MACRO_ENCODER_SLOT;
  side: 'left' | 'right';
  actions: Record<EncoderSubActionId, EncoderSubBinding>;
  selectedSub: EncoderSubActionId | null;
  dragOverSub: EncoderSubActionId | null;
  onSelectSub: (sub: EncoderSubActionId) => void;
  onStartSubDrag: (e: React.PointerEvent, sub: EncoderSubActionId) => void;
}) {
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
        const isHovered = hoveredSub === item.id || isDragOver;
        const accentStroke = isSelected ? '#ffffff' : '#0051ff';

        return (
          <div key={item.id} className="relative flex items-center justify-center">
            {/* Floating white assigned-key pill above hovered sub-button */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.94 }}
                  transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute -top-[36px] left-1/2 -translate-x-1/2 h-[27px] px-[13px] rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.07)] flex items-center justify-center text-[11px] font-medium text-[#555555] whitespace-nowrap pointer-events-none z-40"
                >
                  {subData.binding}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              data-drop-slot={slotId}
              data-drop-encoder-sub={item.id}
              onPointerDown={(e) => onStartSubDrag(e, item.id)}
              onClick={() => onSelectSub(item.id)}
              onMouseEnter={() => setHoveredSub(item.id)}
              onMouseLeave={() => setHoveredSub(null)}
              className={`w-[46px] h-[46px] rounded-full relative flex flex-col items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
                isSelected
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
            </button>
          </div>
        );
      })}
    </motion.div>
  );
}

interface KeycapButtonProps {
  entrancePhase?: EntrancePhase;
  entranceIndex?: number;
  slotId: KeySlotId;
  label: string;
  binding: string;
  iconId?: string;
  color?: string;
  slotNumber?: number;
  selected: boolean;
  dragOver?: boolean;
  isDraggingSource?: boolean;
  isLowercase?: boolean;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerLeave?: (e: React.PointerEvent) => void;
  onHoverSlot?: (slotId: KeySlotId | null) => void;
  previewHighlighted?: boolean;
  isPhysicalPressed?: boolean;
}

function KeycapButton({
  entrancePhase,
  entranceIndex,
  slotId,
  label,
  binding,
  iconId,
  color,
  slotNumber,
  selected,
  dragOver,
  isDraggingSource,
  isLowercase,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onHoverSlot,
  previewHighlighted = false,
  isPhysicalPressed = false,
}: KeycapButtonProps) {
  const isEmpty =
    !iconId && (!label || label === '—' || binding === 'blank');
  const isMultiWordCustom = !iconId && !isEmpty && label.length > 4;
  const entranceProps =
    entranceIndex === undefined
      ? {}
      : getEntranceMotionProps(
          entrancePhase,
          getKeycapEntranceOptions(entranceIndex)
        );

  return (
    <motion.button
      {...entranceProps}
      data-drop-slot={slotId}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
      onMouseEnter={() => onHoverSlot?.(slotId)}
      onMouseLeave={() => onHoverSlot?.(null)}
      title={binding}
      style={color && !isEmpty && !selected && !dragOver && !isDraggingSource
        ? { backgroundColor: color, borderColor: color }
        : undefined}
      className={`${slotNumber !== undefined ? 'group ' : ''}w-[42px] h-[42px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-150 cursor-grab active:cursor-grabbing focus:outline-none select-none ${
        isMultiWordCustom
          ? 'text-[8.5px] font-medium leading-[1.08] px-[2px] text-center'
          : isLowercase
          ? 'text-[11px] font-normal'
          : 'text-[11.5px] font-medium'
      } ${
        isPhysicalPressed
          ? 'scale-[0.93] bg-[#222222] text-[#00e5ff] border-[#0051ff] shadow-[0_0_18px_rgba(0,81,255,0.9)] z-20 brightness-110'
          : previewHighlighted
          ? 'bg-[#313131] text-[#f3f3f3] border-[#0051ff] shadow-[0_0_12px_rgba(0,81,255,0.65)] z-10'
          : isDraggingSource
          ? 'bg-[#1e1e1e] text-[#6d6d6d] border-transparent'
          : selected
          ? 'bg-[#0051ff] border-[#0051ff] text-white shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : dragOver
          ? 'bg-[#313131] text-[#f3f3f3] border-[#0051ff] z-10'
          : 'bg-[#313131] text-[#f3f3f3] border-t-[#3e3e3e] border-l-[#3e3e3e] border-b-[#252525] border-r-[#252525] hover:border-[#0051ff] hover:z-10 active:scale-[0.97]'
      }`}
    >
      {slotNumber !== undefined ? (
        <span
          data-preview-slot-number={slotNumber}
          className={`text-[12px] font-medium leading-none text-white pointer-events-none transition-[filter] duration-150 ${
            previewHighlighted
              ? 'drop-shadow-[0_0_6px_#0051ff]'
              : 'group-hover:drop-shadow-[0_0_6px_#0051ff]'
          }`}
        >
          {slotNumber}
        </span>
      ) : iconId ? (
        <CustomPickerIcon id={iconId} size={17} />
      ) : isEmpty ? (
        <EmptyKeyPlusIcon size={16} stroke="#ffffff" />
      ) : (
        <span
          className={
            isMultiWordCustom
              ? 'leading-[1.08] break-words line-clamp-3'
              : 'leading-none tracking-[0.01em]'
          }
        >
          {label}
        </span>
      )}
    </motion.button>
  );
}

interface KnobControlProps {
  selected: boolean;
  angle: number;
  title: string;
  onClick: () => void;
}

function KnobControl({
  selected,
  angle,
  title,
  onClick,
}: KnobControlProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-[39px] h-[39px] rounded-full relative flex items-center justify-center border-[1.5px] transition-all duration-150 cursor-pointer focus:outline-none select-none ${
        selected
          ? 'bg-[#0051ff] border-[#0051ff] shadow-[0_0_16px_rgba(0,81,255,0.85)] z-10'
          : 'border-transparent hover:border-[#0051ff] hover:z-10'
      }`}
    >
      <svg
        width="39"
        height="39"
        viewBox="0 0 40 40"
        className="transition-transform duration-150 pointer-events-none"
        style={{ transform: `rotate(${angle}deg)` }}
      >
        <circle
          cx="20"
          cy="20"
          r="19"
          fill={selected ? '#0051ff' : '#2f2f2f'}
          stroke={selected ? '#0051ff' : '#3b3b3b'}
          strokeWidth="0.9"
        />
        <line
          x1="7.2"
          y1="7.2"
          x2="15.2"
          y2="15.2"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="32.8"
          y1="7.2"
          x2="24.8"
          y2="15.2"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="7.2"
          y1="32.8"
          x2="15.2"
          y2="24.8"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <line
          x1="32.8"
          y1="32.8"
          x2="24.8"
          y2="24.8"
          stroke={selected ? '#ffffff' : '#151515'}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

/* ========================================================================== */
/* REAL VECTOR ICON RENDERER FOR SELECT ICON DRAWER & SAVED CUSTOM TILES      */
/* ========================================================================== */

