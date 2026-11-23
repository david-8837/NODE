import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { InfoCircleIcon } from './UiIcons';
import { getEntranceMotionProps, type EntrancePhase } from '../entranceAnimations';
import type { ProfileData } from '../presetLibrary';

export interface ProfileSelectorCapsuleProps {
  entrancePhase: EntrancePhase;
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeTooltip: string | null;
  setActiveTooltip: (tooltip: 'profiles' | 'layers' | 'mapping' | null) => void;
  currentProfile: ProfileData;
  profiles: ProfileData[];
  activeProfileIndex: number;
  profileMenuOpen: boolean;
  setProfileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  deletingProfileId: string | null;
  setDeletingProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  selectProfileInApp: (idx: number, layerCount: number) => void;
  handleUpdateProfileName: (idx: number, name: string) => void;
  handleDuplicateProfile: (idx: number) => void;
  handleExportProfile: (idx: number) => void;
  handleConfirmDeleteProfile: (idx: number) => void;
  handleAddProfile: () => void;
  handleImportProfile: () => void;
}

export function ProfileSelectorCapsule({
  entrancePhase,
  containerRef,
  activeTooltip,
  setActiveTooltip,
  currentProfile,
  profiles,
  activeProfileIndex,
  profileMenuOpen,
  setProfileMenuOpen,
  deletingProfileId,
  setDeletingProfileId,
  selectProfileInApp,
  handleUpdateProfileName,
  handleDuplicateProfile,
  handleExportProfile,
  handleConfirmDeleteProfile,
  handleAddProfile,
  handleImportProfile,
}: ProfileSelectorCapsuleProps) {
  return (
    <motion.div
      {...getEntranceMotionProps(entrancePhase, { delay: 0.12 })}
      ref={containerRef}
      className="flex flex-col items-start relative pointer-events-auto w-fit"
    >
      <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
        <span>Profiles</span>
        <button
          onClick={() =>
            setActiveTooltip(activeTooltip === 'profiles' ? null : 'profiles')
          }
          onMouseEnter={() => setActiveTooltip('profiles')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
          aria-label="Profiles Info"
        >
          <InfoCircleIcon />
        </button>
      </div>

      <AnimatePresence>
        {activeTooltip === 'profiles' && (
          <motion.div
            key="profiles-tooltip"
            initial={{ opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[25px] -left-[20px] w-[262px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
          >
            <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
              What are Profiles?
            </div>
            <p className="text-[11px] leading-[1.36] text-[#686868]">
              Profiles let you create different key configurations for different workflows. Each profile stores its own layers, key mappings, and actions. Switch profile to instantly change how your device behaves.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-[10px] flex items-center gap-[9px] relative">
        <div
          onClick={() => {
            if (!profileMenuOpen) setProfileMenuOpen(true);
          }}
          className="h-[30px] w-[142px] px-[10px] rounded-full bg-[#e2e2e2] hover:bg-[#dadada] border-[1.5px] border-transparent hover:border-black/30 focus-within:border-black/40 flex items-center gap-[6px] transition-all cursor-pointer"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M5 0.5L9.2 5L5 9.5L0.8 5L5 0.5Z"
              fill={currentProfile.color}
            />
          </svg>
          <span
            title={currentProfile.name || 'Untitled Profile'}
            className="w-full text-[#6a6a6a] text-[11.5px] font-medium truncate"
          >
            {currentProfile.name || 'Untitled Profile'}
          </span>
        </div>

        <button
          onClick={() => {
            setProfileMenuOpen((o) => !o);
            setDeletingProfileId(null);
          }}
          aria-label="Toggle profile list"
          className={`w-[26px] h-[26px] rounded-full border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
            profileMenuOpen
              ? 'bg-[#000000] text-white border-[#000000]'
              : 'bg-white hover:bg-neutral-50 text-[#4a4a4a] border-transparent hover:border-black/30 shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
          }`}
        >
          {profileMenuOpen ? (
            <ChevronUp className="w-[13px] h-[13px] stroke-[2]" />
          ) : (
            <ChevronDown className="w-[13px] h-[13px] stroke-[1.8]" />
          )}
        </button>

        <AnimatePresence>
          {profileMenuOpen && (
            <motion.div
              key="profile-dropdown-tray"
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              style={{ transformOrigin: 'top left' }}
              className="absolute top-[37px] left-0 w-[262px] bg-[#e4e4e4] rounded-[18px] p-[9px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] border border-black/[0.03] z-40 space-y-[7px]"
            >
              {profiles.map((prof, idx) => {
                const isSelected = idx === activeProfileIndex;
                const isConfirmingDelete =
                  deletingProfileId === prof.id;

                return (
                  <motion.div
                    key={prof.id}
                    layout
                    transition={{
                      type: 'spring',
                      stiffness: 520,
                      damping: 32,
                      mass: 0.7,
                    }}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {isConfirmingDelete ? (
                        <motion.div
                          key="confirm-delete"
                          layout
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -4 }}
                          transition={{
                            type: 'spring',
                            stiffness: 540,
                            damping: 30,
                            mass: 0.65,
                          }}
                          className="flex items-center gap-[6px]"
                        >
                          <motion.button
                            layout
                            initial={{ opacity: 0, x: -10, scale: 0.88 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -8, scale: 0.88 }}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.94 }}
                            transition={{
                              type: 'spring',
                              stiffness: 560,
                              damping: 28,
                            }}
                            onClick={() => setDeletingProfileId(null)}
                            className="h-[28px] px-[12px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 text-[11px] font-medium text-[#444444] shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-colors cursor-pointer"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            layout
                            initial={{ opacity: 0, x: 14, scale: 0.86 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 12, scale: 0.86 }}
                            whileHover={{
                              scale: 1.025,
                              boxShadow: '0 6px 18px rgba(220, 0, 0, 0.36)',
                            }}
                            whileTap={{ scale: 0.95 }}
                            transition={{
                              type: 'spring',
                              stiffness: 520,
                              damping: 26,
                            }}
                            onClick={() => handleConfirmDeleteProfile(idx)}
                            className="flex-1 h-[28px] rounded-full bg-gradient-to-r from-[#e01b24] via-[#ff2934] to-[#c40000] text-white text-[11px] font-semibold flex items-center justify-center gap-[6px] shadow-[0_3px_12px_rgba(220,0,0,0.28)] cursor-pointer overflow-hidden relative group"
                          >
                            <motion.svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              initial={{ rotate: -16, scale: 0.85 }}
                              animate={{ rotate: [0, -14, 10, -6, 0], scale: 1 }}
                              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
                              className="shrink-0"
                            >
                              <path d="M2.5 4.2H13.5" />
                              <path d="M5.8 4.2V2.8C5.8 2.35 6.15 2 6.6 2H9.4C9.85 2 10.2 2.35 10.2 2.8V4.2" />
                              <path d="M4.2 4.2L4.8 13C4.85 13.55 5.3 14 5.85 14H10.15C10.7 14 11.15 13.55 11.2 13L11.8 4.2" />
                              <line x1="6.8" y1="7" x2="6.8" y2="11.2" />
                              <line x1="9.2" y1="7" x2="9.2" y2="11.2" />
                            </motion.svg>
                            <span>Click to delete</span>
                          </motion.button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="normal-row"
                          layout
                          initial={{ opacity: 0, scale: 0.94, y: -3 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, y: 3 }}
                          transition={{
                            type: 'spring',
                            stiffness: 520,
                            damping: 32,
                            mass: 0.65,
                          }}
                          className="flex items-center gap-[5px]"
                        >
                          {/* 6-Dot Drag Handle Circle */}
                          <button
                            type="button"
                            title="Reorder profile"
                            className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-grab active:cursor-grabbing"
                          >
                            <svg
                              width="10"
                              height="12"
                              viewBox="0 0 10 12"
                              fill="currentColor"
                            >
                              <circle cx="3" cy="2.5" r="1" />
                              <circle cx="7" cy="2.5" r="1" />
                              <circle cx="3" cy="6" r="1" />
                              <circle cx="7" cy="6" r="1" />
                              <circle cx="3" cy="9.5" r="1" />
                              <circle cx="7" cy="9.5" r="1" />
                            </svg>
                          </button>

                          {/* Profile Pill */}
                          <div
                            onClick={() => {
                              selectProfileInApp(idx, prof.layers.length);
                              setDeletingProfileId(null);
                            }}
                            className={`flex-1 h-[27px] min-w-0 px-[10px] rounded-full border-[1.5px] border-transparent hover:border-black/30 flex items-center gap-[6px] text-[11px] font-medium transition-all cursor-text ${
                              isSelected
                                ? 'bg-[#18181b] text-white'
                                : 'bg-white text-[#444444] hover:bg-neutral-50'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                width="9"
                                height="9"
                                viewBox="0 0 10 10"
                                fill="none"
                                className="shrink-0"
                              >
                                <path
                                  d="M5 0.5L9.2 5L5 9.5L0.8 5L5 0.5Z"
                                  fill="#ffffff"
                                />
                              </svg>
                            )}
                            <input
                              type="text"
                              value={prof.name}
                              onChange={(event) =>
                                handleUpdateProfileName(idx, event.target.value)
                              }
                              onFocus={() => {
                                selectProfileInApp(idx, prof.layers.length);
                                setDeletingProfileId(null);
                              }}
                              aria-label={`Rename profile ${prof.name || idx + 1}`}
                              placeholder={isSelected ? 'Profile name...' : 'Untitled Profile'}
                              className={`min-w-0 flex-1 bg-transparent truncate focus:outline-none ${
                                isSelected
                                  ? 'text-white placeholder:text-white/70'
                                  : 'text-[#444444] placeholder:text-[#9c9c9c]'
                              }`}
                            />
                          </div>

                          {/* Duplicate Profile */}
                          <motion.button
                            whileHover={{ scale: 1.07 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleDuplicateProfile(idx)}
                            title="Duplicate profile"
                            className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect
                                x="5.5"
                                y="3.5"
                                width="7.5"
                                height="9.5"
                                rx="1.5"
                              />
                              <path d="M3 6.5V12.5C3 13.3 3.7 14 4.5 14H10" />
                            </svg>
                          </motion.button>

                          {/* Export Profile */}
                          <motion.button
                            whileHover={{ scale: 1.07 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleExportProfile(idx)}
                            title="Export profile"
                            className="w-[27px] h-[27px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center text-[#444444] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                          >
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M8 2.5V10.5M8 10.5L5.2 7.7M8 10.5L10.8 7.7" />
                              <path d="M3 11.5V12.5C3 13.1 3.4 13.5 4 13.5H12C12.6 13.5 13 13.1 13 12.5V11.5" />
                            </svg>
                          </motion.button>

                          {/* Delete Profile */}
                          {profiles.length > 1 && (
                            <motion.button
                              whileHover={{ scale: 1.1, rotate: 90 }}
                              whileTap={{ scale: 0.88 }}
                              transition={{
                                type: 'spring',
                                stiffness: 520,
                                damping: 24,
                              }}
                              onClick={() => setDeletingProfileId(prof.id)}
                              title="Delete profile"
                              className="w-[27px] h-[27px] rounded-full bg-white hover:bg-[#dc0000] text-[#444444] hover:text-white flex items-center justify-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                            >
                              <X className="w-[12px] h-[12px] stroke-[1.8]" />
                            </motion.button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              <div className="flex items-center gap-[6px]">
                <button
                  onClick={handleAddProfile}
                  className="flex-1 h-[28px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center gap-[5px] text-[11px] font-medium text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                >
                  <Plus className="w-[11px] h-[11px] stroke-[2]" />
                  <span>Add Profile</span>
                </button>

                <button
                  onClick={handleImportProfile}
                  className="h-[28px] px-[12px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center gap-[5px] text-[11px] font-medium text-[#444444] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
                >
                  <svg
                    width="10"
                    height="11"
                    viewBox="0 0 12 13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 2H10" />
                    <path d="M6 11V4.5M6 4.5L3.5 7M6 4.5L8.5 7" />
                  </svg>
                  <span>Import</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
