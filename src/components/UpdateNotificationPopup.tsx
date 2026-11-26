import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, ExternalLink, Sparkles, X } from 'lucide-react';
import type { UpdateCheckResult, UpdateDownloadProgress } from '../appSettings';

export type UpdateDownloadStatus = 'idle' | 'downloading' | 'installing' | 'error';

export interface UpdateNotificationPopupProps {
  update: UpdateCheckResult | null;
  status: UpdateDownloadStatus;
  progress: UpdateDownloadProgress | null;
  errorMessage: string | null;
  onDownloadAndInstall: () => void;
  onOpenReleasePage: () => void;
  onDismiss: () => void;
}

function formatMegabytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0.0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UpdateNotificationPopup({
  update,
  status,
  progress,
  errorMessage,
  onDownloadAndInstall,
  onOpenReleasePage,
  onDismiss,
}: UpdateNotificationPopupProps) {
  const hasExeInstaller = Boolean(
    update?.downloadUrl && update.downloadUrl.toLowerCase().endsWith('.exe')
  );
  const percent = Math.max(0, Math.min(100, progress?.percent ?? 0));
  const isBusy = status === 'downloading' || status === 'installing';

  return (
    <AnimatePresence>
      {update && update.hasUpdate && (
        <motion.aside
          key={`update-popup-${update.latestVersion || 'latest'}`}
          role="dialog"
          aria-label="Application update available"
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-[20px] right-[20px] z-50 w-[330px] rounded-[18px] bg-white/95 dark:bg-[#18181b]/95 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.65)] p-[15px] text-left select-none"
        >
          <div className="flex items-start justify-between gap-[10px]">
            <div className="flex items-center gap-[8px] min-w-0">
              <div className="w-[26px] h-[26px] rounded-full bg-[#0051ff]/10 dark:bg-[#0051ff]/20 text-[#0051ff] dark:text-[#60a5fa] flex items-center justify-center shrink-0">
                <Sparkles className="w-[13px] h-[13px]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[12.5px] font-semibold text-[#111111] dark:text-[#f4f4f5] truncate">
                    New version released
                  </span>
                  {update.latestVersion && (
                    <span className="px-[7px] py-[1px] rounded-full bg-[#0051ff]/10 dark:bg-[#0051ff]/25 text-[#0051ff] dark:text-[#93c5fd] text-[10px] font-semibold shrink-0">
                      {update.latestVersion}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] truncate">
                  Current: v{update.currentVersion}
                </div>
              </div>
            </div>

            {!isBusy && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss update notification"
                title="Dismiss"
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[#71717a] hover:text-[#111111] dark:text-[#a1a1aa] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-[13px] h-[13px]" />
              </button>
            )}
          </div>

          {update.releaseNotes && status === 'idle' && (
            <p className="mt-[9px] text-[10.5px] leading-[1.4] text-[#52525b] dark:text-[#a1a1aa] line-clamp-3 whitespace-pre-line">
              {update.releaseNotes.trim()}
            </p>
          )}

          {status === 'downloading' && (
            <div className="mt-[11px]">
              <div className="flex items-center justify-between text-[10px] font-medium text-[#52525b] dark:text-[#d4d4d8] mb-[5px]">
                <span>Downloading installer…</span>
                <span className="tabular-nums">
                  {progress && progress.totalBytes > 0
                    ? `${percent}% · ${formatMegabytes(progress.receivedBytes)} / ${formatMegabytes(progress.totalBytes)}`
                    : `${formatMegabytes(progress?.receivedBytes ?? 0)}`}
                </span>
              </div>
              <div className="w-full h-[6px] rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0051ff] transition-all duration-150"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {status === 'installing' && (
            <div className="mt-[10px] text-[10.5px] font-medium text-[#10b981] dark:text-[#34d399]">
              Installer downloaded. Launching setup and closing NODE Studio…
            </div>
          )}

          {status === 'error' && (
            <div className="mt-[9px] text-[10.5px] leading-[1.35] text-[#e01b24] dark:text-[#f87171]">
              {errorMessage || 'Could not download update.'}
            </div>
          )}

          <div className="mt-[12px] flex items-center gap-[8px]">
            {hasExeInstaller ? (
              <button
                type="button"
                onClick={onDownloadAndInstall}
                disabled={isBusy}
                className="flex-1 h-[30px] px-[12px] rounded-full bg-[#0051ff] hover:bg-[#0044d6] disabled:opacity-60 text-white text-[11px] font-medium flex items-center justify-center gap-[6px] shadow-[0_2px_8px_rgba(0,81,255,0.28)] transition-colors cursor-pointer disabled:cursor-wait"
              >
                <Download className="w-[12px] h-[12px]" />
                <span>
                  {status === 'downloading'
                    ? 'Downloading…'
                    : status === 'installing'
                      ? 'Launching…'
                      : status === 'error'
                        ? 'Retry Install'
                        : 'Download & Install'}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenReleasePage}
                className="flex-1 h-[30px] px-[12px] rounded-full bg-[#0051ff] hover:bg-[#0044d6] text-white text-[11px] font-medium flex items-center justify-center gap-[6px] shadow-[0_2px_8px_rgba(0,81,255,0.28)] transition-colors cursor-pointer"
              >
                <ExternalLink className="w-[12px] h-[12px]" />
                <span>Open Release</span>
              </button>
            )}

            {!isBusy && (
              <button
                type="button"
                onClick={status === 'error' ? onOpenReleasePage : onDismiss}
                className="h-[30px] px-[13px] rounded-full bg-[#f4f4f5] hover:bg-[#e4e4e7] dark:bg-[#27272a] dark:hover:bg-[#3f3f46] text-[#3f3f46] dark:text-[#e4e4e7] text-[11px] font-medium transition-colors cursor-pointer"
              >
                {status === 'error' ? 'GitHub' : 'Later'}
              </button>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export default UpdateNotificationPopup;
