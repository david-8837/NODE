import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { GRID_MACRO_KEY_SLOTS } from '../deviceLayout';

export interface EditLayoutModalProps {
  open: boolean;
  onClose: () => void;
}

export function EditLayoutModal({ open, onClose }: EditLayoutModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="edit-layout-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl w-[360px] p-5 shadow-xl border border-black/5"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#222]">
                Edit Hardware Layout
              </h2>
              <button
                onClick={onClose}
                className="w-6 h-6 rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] hover:bg-neutral-100 flex items-center justify-center text-[#777] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#666] mb-4">
              Grid Macro 1 has nine direct keys and one EC11 rotary encoder with a push switch.
            </p>

            <div className="grid grid-cols-[1fr_auto] gap-3 mb-5">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs font-semibold text-[#222] mb-2">
                  3 × 3 key matrix
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {GRID_MACRO_KEY_SLOTS.map((slotId) => (
                    <div
                      key={slotId}
                      className="h-7 rounded-md bg-[#242424] text-white flex items-center justify-center text-[9px] font-medium"
                    >
                      {slotId.toUpperCase()}
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-[#777] mt-2">GP0–GP8</div>
              </div>
              <div className="min-w-[112px] rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-[#2f2f2f] border border-[#444] flex items-center justify-center mb-2">
                  <div className="w-1 h-3 rounded-full bg-white/80 -translate-y-1" />
                </div>
                <div className="text-xs font-semibold text-[#222]">1 encoder</div>
                <div className="text-[10px] text-[#777] mt-1">Turn · press</div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[#0051ff] text-white text-xs font-medium hover:bg-[#0045d8] transition-colors cursor-pointer"
              >
                Save Layout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default EditLayoutModal;
