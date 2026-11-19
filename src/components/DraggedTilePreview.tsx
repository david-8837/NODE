import React from 'react';
import { motion, type MotionValue } from 'motion/react';
import { CustomPickerIcon } from './CustomPickerIcon';
import { EmptyKeyPlusIcon } from './UiIcons';
import {
  formatCustomTileText,
  type BasicTileItem,
  type MappingTabId,
} from '../presetLibrary';

export interface DraggedTilePreviewProps {
  draggedTile: {
    item: BasicTileItem;
    sourceTab: MappingTabId;
    x: number;
    y: number;
  };
  dragSpringBobY: MotionValue<number>;
  dragSpringRotate: MotionValue<number>;
  isDisallowedTarget?: boolean;
}

export function DraggedTilePreview({
  draggedTile,
  dragSpringBobY,
  dragSpringRotate,
  isDisallowedTarget = false,
}: DraggedTilePreviewProps) {
  return (
    <motion.div
      key="dragged-tile-preview"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1.04 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{
        left: draggedTile.x - 27,
        top: draggedTile.y - 27,
        y: dragSpringBobY,
        rotate: dragSpringRotate,
        transformOrigin: '22% 20%',
      }}
      className={`fixed w-[54px] h-[54px] rounded-[9px] bg-[#000000] text-white shadow-[0_14px_28px_rgba(0,0,0,0.34)] flex flex-col items-center justify-center px-1 text-center pointer-events-none z-[100] select-none transition-all duration-150 ${
        isDisallowedTarget
          ? 'ring-2 ring-[#ef4444] shadow-[0_0_20px_rgba(239,68,68,0.7)]'
          : ''
      }`}
    >
      {draggedTile.item.iconId ? (
        <CustomPickerIcon id={draggedTile.item.iconId} size={20} />
      ) : draggedTile.item.emoji ? (
        <span className="text-[20px] leading-none">
          {draggedTile.item.emoji}
        </span>
      ) : draggedTile.item.isClearIcon ? (
        <EmptyKeyPlusIcon size={16} stroke="#ffffff" />
      ) : draggedTile.item.arrowDir ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: `rotate(${
              draggedTile.item.arrowDir === 'right'
                ? 0
                : draggedTile.item.arrowDir === 'down'
                ? 90
                : draggedTile.item.arrowDir === 'left'
                ? 180
                : -90
            }deg)`,
          }}
        >
          <path d="M2.5 6H9.5M9.5 6L6.5 3M9.5 6L6.5 9" />
        </svg>
      ) : draggedTile.item.top ? (
        <div className="flex flex-col items-center leading-[1.15] text-[10.5px] font-medium">
          <span>{draggedTile.item.top}</span>
          <span>{draggedTile.item.main}</span>
        </div>
      ) : (
        <span className="text-[10.5px] font-medium leading-[1.15] text-center whitespace-pre-line">
          {draggedTile.sourceTab === 'Basic'
            ? draggedTile.item.main
            : formatCustomTileText(draggedTile.item.main)}
        </span>
      )}
    </motion.div>
  );
}

export default DraggedTilePreview;
