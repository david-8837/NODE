import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  dragOverTarget: {
    slotId: KeySlotId;
    subAction?: EncoderSubActionId;
    isDisallowed?: boolean;
  } | null;
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
            dragOverDisallowed={
              dragOverTarget?.slotId === GRID_MACRO_ENCODER_SLOT &&
              Boolean(dragOverTarget.isDisallowed)
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
                dragOver={
                  dragOverTarget?.slotId === GRID_MACRO_ENCODER_SLOT &&
                  !dragOverTarget.subAction
                }
                dragOverDisallowed={
                  dragOverTarget?.slotId === GRID_MACRO_ENCODER_SLOT &&
                  !dragOverTarget.subAction &&
                  Boolean(dragOverTarget.isDisallowed)
                }
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
                customLegend={layer[slotId].customLegend}
                subLegend={layer[slotId].subLegend}
                keycapColor={showSlotNumbers ? undefined : layer[slotId].keycapColor}
                slotNumber={showSlotNumbers ? index + 1 : undefined}
                selected={selectedKey === slotId}
                dragOver={dragOverTarget?.slotId === slotId}
                dragOverDisallowed={
                  dragOverTarget?.slotId === slotId &&
                  Boolean(dragOverTarget.isDisallowed)
                }
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
  customLegend?: string;
  subLegend?: string;
  keycapColor?: string;
  slotNumber?: number;
  selected: boolean;
  dragOver?: boolean;
  dragOverDisallowed?: boolean;
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
  customLegend,
  subLegend,
  keycapColor,
  slotNumber,
  selected,
  dragOver,
  dragOverDisallowed = false,
  isDraggingSource,
  isPressed = false,
  isLowercase,
  onClick,
  onPointerDown,
  onHoverSlot,
  previewHighlighted = false,
}: KeycapButtonProps) {
  const displayLabel = customLegend || label;
  const isEmpty =
    !iconId && !customLegend && (!label || label === '—' || binding === 'blank');
  const isMultiWordCustom = !iconId && !isEmpty && displayLabel.length > 4;
  const activeKeycapColor = keycapColor || color;
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
      style={activeKeycapColor && !isEmpty && !selected && !dragOver && !isDraggingSource && !isPressed
        ? { backgroundColor: activeKeycapColor, borderColor: activeKeycapColor }
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
          : dragOver && dragOverDisallowed
          ? 'bg-[#313131] text-white border-[#ef4444] shadow-[0_0_16px_rgba(239,68,68,0.95)] ring-2 ring-red-400/40 z-20'
          : dragOver
          ? 'bg-[#313131] text-[#f3f3f3] border-[#0051ff] shadow-[0_0_12px_rgba(0,81,255,0.65)] z-10'
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
        <div className="flex flex-col items-center justify-center pointer-events-none">
          <CustomPickerIcon id={iconId} size={subLegend ? 14 : 17} />
          {subLegend && (
            <span className="text-[7.5px] font-bold tracking-wider uppercase text-white/85 leading-none mt-[1px]">
              {subLegend}
            </span>
          )}
        </div>
      ) : isEmpty ? (
        <EmptyKeyPlusIcon size={16} stroke="#ffffff" />
      ) : (
        <div className="flex flex-col items-center justify-center w-full px-[2px] pointer-events-none">
          <span
            className={
              subLegend
                ? 'text-[10px] font-semibold leading-tight break-words line-clamp-1'
                : isMultiWordCustom
                ? 'leading-[1.08] break-words line-clamp-3'
                : 'leading-none tracking-[0.01em]'
            }
          >
            {displayLabel}
          </span>
          {subLegend && (
            <span className="text-[7px] font-bold tracking-wider uppercase text-white/75 leading-none mt-[2px]">
              {subLegend}
            </span>
          )}
        </div>
      )}
    </motion.button>
  );
}
