import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RotateCcw, X } from 'lucide-react';

interface Props {
  open: boolean;
  layerNumber: number;
  allLayers: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ResetKeysDialog({ open, layerNumber, allLayers, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelHandler = useRef(onCancel);
  cancelHandler.current = onCancel;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelHandler.current(); }
      if (event.key === 'Tab') {
        const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); if (previous?.isConnected) previous.focus(); };
  }, [open]);

  return <AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/35 px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }}>
      <motion.div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="reset-keys-title" aria-describedby="reset-keys-description" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduceMotion ? 0 : 5 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="w-full max-w-[440px] rounded-[18px] border border-black/[0.06] bg-white text-[#171717] shadow-[0_24px_70px_rgba(0,0,0,0.24)] overflow-hidden select-none">
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0ef] text-[#d52b29]"><RotateCcw className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#888]">NØDE Studio</p><h2 id="reset-keys-title" className="mt-0.5 text-[17px] font-semibold tracking-tight">Reset keys?</h2></div>
            </div>
            <button type="button" aria-label="Close" onClick={onCancel} className="rounded-full p-1.5 text-[#888] hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-[#0051ff]"><X className="h-4 w-4" /></button>
          </div>
          <p id="reset-keys-description" className="mt-4 text-[13px] leading-5 text-[#606060]">{allLayers ? 'Reset all keys across all layers in this profile to blank defaults?' : `Reset all keys on Layer ${layerNumber} to blank defaults?`}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-black/[0.06] bg-[#fafafa] px-6 py-3">
          <button ref={cancelRef} type="button" onClick={onCancel} className="rounded-full border border-[#dedede] bg-white px-5 py-2 text-[12px] font-semibold text-[#444] hover:bg-[#f2f2f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0051ff]">Cancel</button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-[#d92d2b] px-5 py-2 text-[12px] font-semibold text-white hover:bg-[#bb2221] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d92d2b]">Reset keys</button>
        </div>
      </motion.div>
    </motion.div>}
  </AnimatePresence>;
}
