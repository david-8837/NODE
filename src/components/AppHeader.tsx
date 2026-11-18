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

      {/* Right Zone: Device Connection Status */}
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
        className={`h-full pl-[12px] pr-[14px] flex items-center gap-[14px] text-white shrink-0 justify-self-end transition-colors cursor-pointer disabled:cursor-wait ${
          deviceStatus.state === 'connected' ? 'bg-[#0051ff]' : 'bg-[#4a4a4a]'
        }`}
      >
        <ChevronDown className="w-[13px] h-[13px] stroke-[2] text-white/95 shrink-0" />
        <span className="text-[12px] font-normal tracking-[0.01em] whitespace-nowrap">
          {deviceStatus.state === 'connected'
            ? deviceStatus.device || 'Grid Macro 1'
            : deviceStatus.state === 'searching'
              ? 'Searching…'
              : deviceStatus.state === 'connecting'
                ? 'Connecting…'
                : 'Not connected'}
        </span>
        <div className="h-[15px] w-[1px] bg-white/35" />
        <svg
          width="11"
          height="14"
          viewBox="0 0 12 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`USB ${deviceStatus.state === 'connected' ? 'Connected' : 'Not connected'}`}
          className={deviceStatus.state === 'connected' ? 'opacity-100' : 'opacity-50'}
        >
          <path
            d="M6 1.5V12M6 1.5L4.3 3.5H7.7L6 1.5ZM6 9.5L2.8 7.3V4.8M6 8.2L9.2 6V4.2"
            stroke="white"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="2.8" cy="4.4" r="1.1" fill="white" />
          <rect x="8.1" y="2.8" width="2.1" height="2.1" fill="white" />
          <circle cx="6" cy="12.5" r="1.5" fill="white" />
        </svg>
      </button>
    </motion.header>
  );
};
