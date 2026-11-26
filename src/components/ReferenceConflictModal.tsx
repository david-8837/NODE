import React from 'react';
import { WarningTriangleIcon } from './UiIcons';
import type { ReferenceConflict } from '../referenceSafety';

export interface ReferenceConflictModalProps {
  open: boolean;
  kind: 'profile' | 'layer';
  targetIndex: number;
  targetName: string;
  conflicts: ReferenceConflict[];
  onCancel: () => void;
  onCleanAndDelete: () => void;
}

export function ReferenceConflictModal({
  open,
  kind,
  targetName,
  conflicts,
  onCancel,
  onCleanAndDelete,
}: ReferenceConflictModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reference-conflict-modal-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[450px] rounded-2xl bg-white dark:bg-[#18181b] p-6 shadow-2xl border border-neutral-200/90 dark:border-white/10 flex flex-col gap-4 text-left animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/40 flex items-center justify-center shrink-0">
            <WarningTriangleIcon color="#d97706" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                id="reference-conflict-modal-title"
                className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight"
              >
                {kind === 'profile' ? 'Profile' : 'Layer'} in Use
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/40">
                Warning
              </span>
            </div>
            <p className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">
              "{targetName}" is referenced by active key shortcuts
            </p>
          </div>
        </div>

        {/* Explanation card */}
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-[#222226] border border-neutral-200/80 dark:border-white/10 text-[12px] text-neutral-700 dark:text-neutral-300 leading-relaxed flex flex-col gap-2.5">
          <div>
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 block mb-1">
              Active References Found
            </span>
            <p className="text-neutral-600 dark:text-neutral-400 text-[11.5px] mb-2.5">
              The following keys switch to or reference this {kind}. Deleting it directly would leave broken shortcuts on your hardware.
            </p>
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#18181b] border border-neutral-200/70 dark:border-white/10 shadow-xs text-[11.5px]"
                >
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate mr-2">
                    {c.location}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-neutral-100 dark:bg-[#27272a] text-neutral-700 dark:text-neutral-200 border border-neutral-200/60 dark:border-white/10 shrink-0">
                    {c.label || c.binding}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Advisory */}
        <p className="text-[11.5px] text-neutral-500 dark:text-neutral-400 leading-normal px-0.5">
          Choose <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">Clean Keys &amp; Delete</strong> to safely reset these keys to blank, shift remaining shortcuts, and delete <strong className="text-neutral-800 dark:text-neutral-200 font-semibold">{targetName}</strong>.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-100 dark:border-white/10">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[12px] font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCleanAndDelete}
            className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-gradient-to-r from-[#e01b24] via-[#ff2934] to-[#c40000] text-white hover:opacity-95 shadow-[0_3px_12px_rgba(220,0,0,0.25)] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>Clean Keys &amp; Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReferenceConflictModal;
