import React from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { EntrancePhase, getEntranceMotionProps } from '../entranceAnimations';
import { QmkViaStatus } from '../qmkViaBridge';

export type NavTab = 'Keymap' | 'Preset' | 'Settings';

export interface AppHeaderProps {
  entrancePhase?: EntrancePhase;
  activeNav: NavTab;
  setActiveNav?: (tab: NavTab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  deviceStatus: QmkViaStatus;
  onToggleDeviceConnection: () => Promise<void> | void;
  onLogoClick: () => void;
  onNavTabClick: (tab: NavTab) => void;
  onHideToTray?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  entrancePhase,
  activeNav,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  deviceStatus,
  onToggleDeviceConnection,
  onLogoClick,
  onNavTabClick,
  onHideToTray,
}) => {
  return (
    <motion.header
      {...getEntranceMotionProps(entrancePhase, {
        delay: 0.03,
        duration: 0.44,
        offsetY: -12,
        initialScale: 0.99,
      })}
      className="h-[38px] w-full bg-[#000000] grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center px-[18px] shrink-0 z-40"
    >
      {/* Left Zone: Brand Logo + Undo/Redo */}
      <div className="flex items-center gap-[22px] shrink-0 min-w-[140px]">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-[3px] text-white hover:opacity-90 transition-opacity focus:outline-none cursor-pointer px-[10px]"
          title="NODE studio"
        >
          <span className="font-bold text-[13px] tracking-[0.16em] text-white select-none leading-none">
            NODE
          </span>
        </button>

        {activeNav === 'Keymap' && (
          <div className="flex items-center gap-[9px]">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo"
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                canUndo
                  ? 'text-[#b0b0b0] hover:text-white'
                  : 'text-[#6c6c6c] hover:text-[#909090]'
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5.5 3.5L2.5 6.5L5.5 9.5" />
                <path d="M2.5 6.5H10C12.2091 6.5 14 8.29086 14 10.5C14 12.7091 12.2091 14.5 10 14.5H6" />
              </svg>
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo"
              className={`w-5 h-5 flex items-center justify-center rounded transition-colors cursor-pointer ${
                canRedo
                  ? 'text-[#b0b0b0] hover:text-white'
                  : 'text-[#6c6c6c] hover:text-[#909090]'
              }`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.5 3.5L13.5 6.5L10.5 9.5" />
                <path d="M13.5 6.5H6C3.79086 6.5 2 8.29086 2 10.5C2 12.7091 3.79086 14.5 6 14.5H10" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Center Zone: Keymap | Preset | Settings */}
      <nav className="justify-self-center flex items-center gap-[28px] text-[12.5px] tracking-[0.01em] whitespace-nowrap shrink-0">
        {(['Keymap', 'Preset', 'Settings'] as const).map((tab) => {
          const isActive = activeNav === tab;
          return (
            <button
              key={tab}
              onClick={() => onNavTabClick(tab)}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-white font-semibold'
                  : 'text-[#cecece] hover:text-white font-normal'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </nav>

      {/* Right Zone: Device Connection Status + Hide to Tray */}
      <div
        className="flex items-center gap-[10px] justify-self-end shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={onToggleDeviceConnection}
          aria-label={
            deviceStatus.state === 'connected'
              ? 'Disconnect Grid Macro 1'
              : 'Connect Grid Macro 1 via QMK/VIA'
          }
          title={
            deviceStatus.state === 'connected'
              ? `Firmware ${deviceStatus.fw ?? ''} on ${deviceStatus.path ?? 'USB'}`
              : deviceStatus.state === 'unavailable'
                ? 'WebHID unavailable; use Chrome or Edge over HTTPS or localhost'
                : deviceStatus.error ?? 'Connect Grid Macro 1 using VIA Raw HID'
          }
          className={`h-[28px] my-auto px-[12px] rounded-full flex items-center gap-[10px] text-white shrink-0 transition-all cursor-pointer disabled:cursor-wait border ${
            deviceStatus.state === 'connected'
              ? 'bg-[#18181b] hover:bg-[#242427] border-white/20 text-white shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
              : 'bg-[#141416] hover:bg-[#1e1e21] border-white/10 text-white/60'
          }`}
        >
          <ChevronDown className="w-[12px] h-[12px] stroke-[2] text-white/80 shrink-0" />
          <span className="text-[11.5px] font-medium tracking-[0.01em] whitespace-nowrap">
            {deviceStatus.state === 'connected'
              ? deviceStatus.device || 'Grid Macro 1'
              : deviceStatus.state === 'searching'
                ? 'Searching…'
                : deviceStatus.state === 'connecting'
                  ? 'Connecting…'
                  : 'Not connected'}
          </span>
          <div className="h-[12px] w-[1px] bg-white/20" />
          <svg
            width="11"
            height="14"
            viewBox="0 0 12 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={`USB ${deviceStatus.state === 'connected' ? 'Connected' : 'Not connected'}`}
            className={deviceStatus.state === 'connected' ? 'opacity-100 text-white' : 'opacity-40 text-white'}
          >
            <path
              d="M6 1.5V12M6 1.5L4.3 3.5H7.7L6 1.5ZM6 9.5L2.8 7.3V4.8M6 8.2L9.2 6V4.2"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="2.8" cy="4.4" r="1.1" fill="currentColor" />
            <rect x="8.1" y="2.8" width="2.1" height="2.1" fill="currentColor" />
            <circle cx="6" cy="12.5" r="1.5" fill="currentColor" />
          </svg>
        </button>

        {/* Hide to Tray Button */}
        <div className="relative group/tray">
          <button
            type="button"
            onClick={onHideToTray}
            aria-label="Hide to tray"
            title="Hide to tray"
            className="w-[28px] h-[28px] rounded-[7px] bg-[#1a1a1c] hover:bg-[#27272a] border border-white/10 hover:border-white/20 text-[#a1a1aa] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 10s3.5 4 10 4 10-4 10-4" />
              <path d="M4 11.5L2.5 14" />
              <path d="M8 13.5L7 16.5" />
              <path d="M12 14v3.5" />
              <path d="M16 13.5l1 3" />
              <path d="M20 11.5L21.5 14" />
            </svg>
          </button>
          <div className="absolute right-0 top-[33px] hidden group-hover/tray:flex flex-col items-center pointer-events-none z-50">
            <div className="w-0 h-0 border-x-[4px] border-x-transparent border-b-[4px] border-b-[#262626]" />
            <div className="bg-[#262626] text-white text-[10.5px] font-medium tracking-tight px-2 py-0.5 rounded-[5px] shadow-lg border border-white/10 whitespace-nowrap">
              Hide to tray
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
};
