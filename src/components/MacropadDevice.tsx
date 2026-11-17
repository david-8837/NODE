import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EncoderPopupCapsule } from './EncoderPopupCapsule';
import { FlatDialControl } from './FlatDialControl';
import { CustomPickerIcon } from './CustomPickerIcon';
import { EmptyKeyPlusIcon } from './UiIcons';
import {
  GRID_MACRO_ENCODER_SLOT,
  GRID_MACRO_KEY_SLOTS,
} from '../deviceLayout';
import {
  getEncoderActions,
  type KeySlotId,
  type EncoderSubActionId,
  type LayerKeymap,
} from '../presetLibrary';
import {
  type EntrancePhase,
  getEntranceMotionProps,
  getKeycapEntranceOptions,
} from '../entranceAnimations';

export interface MacropadDeviceProps {
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
  onHoverSlot?: (slotId: KeySlotId | null) => void;
  highlightedSlot?: KeySlotId | null;
  activePressedSlot?: string | null;
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
  onHoverSlot,
  highlightedSlot = null,
  activePressedSlot = null,
  entrancePhase,
  showSlotNumbers = false,
}: MacropadDeviceProps) {
  const isEncoderOpen = selectedKey === GRID_MACRO_ENCODER_SLOT;
  const isDialPressed =
    activePressedSlot === GRID_MACRO_ENCODER_SLOT ||
    activePressedSlot === 'press' ||
    activePressedSlot === 'cw' ||
    activePressedSlot === 'ccw';

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
                angle={encoderAngle}
                title={`Dial: ${layer[GRID_MACRO_ENCODER_SLOT].binding}`}
                onClick={() => onSelectKey(GRID_MACRO_ENCODER_SLOT)}
                isPressed={isDialPressed}
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
                isPressed={activePressedSlot === slotId}
                onClick={() => onSelectKey(slotId)}
                onPointerDown={(e) => onStartKeyDrag(e, slotId)}
                onHoverSlot={onHoverSlot}
                previewHighlighted={highlightedSlot === slotId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface KeycapButtonProps {
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
  isPressed?: boolean;
  isLowercase?: boolean;
  onClick: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onHoverSlot?: (slotId: KeySlotId | null) => void;
  previewHighlighted?: boolean;
}

export function KeycapButton({
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
  isPressed = false,
  isLowercase,
  onClick,
  onPointerDown,
  onHoverSlot,
  previewHighlighted = false,
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
      onClick={onClick}
      onMouseEnter={() => onHoverSlot?.(slotId)}
      onMouseLeave={() => onHoverSlot?.(null)}
      title={binding}
      style={color && !isEmpty && !selected && !dragOver && !isDraggingSource && !isPressed
        ? { backgroundColor: color, borderColor: color }
        : undefined}
      className={`${slotNumber !== undefined ? 'group ' : ''}w-[42px] h-[42px] rounded-[5px] border-[1.5px] flex items-center justify-center transition-all duration-150 cursor-grab active:cursor-grabbing focus:outline-none select-none ${
        isMultiWordCustom
          ? 'text-[8.5px] font-medium leading-[1.08] px-[2px] text-center'
          : isLowercase
          ? 'text-[11px] font-normal'
          : 'text-[11.5px] font-medium'
      } ${
        isPressed
          ? 'scale-[0.93] bg-[#0051ff] border-[#0051ff] text-white shadow-[0_0_20px_rgba(0,81,255,0.95)] z-20'
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
