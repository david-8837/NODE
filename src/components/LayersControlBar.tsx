import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { InfoCircleIcon } from './UiIcons';
import { LedSettingsPopover } from './LedSettingsPopover';
import { getEntranceMotionProps, type EntrancePhase } from '../entranceAnimations';
import type { ProfileData } from '../presetLibrary';
import type { LayerLedConfig } from './LedSettingsPopover';

export interface LayersControlBarProps {
  entrancePhase: EntrancePhase;
  containerRef: React.RefObject<HTMLDivElement | null>;
  activeTooltip: string | null;
  setActiveTooltip: (tooltip: 'profiles' | 'layers' | 'mapping' | null) => void;
  currentProfile: ProfileData;
  activeLayerIndex: number;
  layerToolbarOpen: boolean;
  setLayerToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  layerDeleteConfirm: boolean;
  setLayerDeleteConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  layerLightingOpen: boolean;
  setLayerLightingOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentLayerName: string;
  currentLayerNameKey: string;
  setLayerNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hardwareLayerNames: readonly string[];
  ledEditingLayerIdx: number;
  setLedEditingLayerIdx: React.Dispatch<React.SetStateAction<number>>;
  layerLedConfigs: [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig];
  setLayerLedConfigs: React.Dispatch<React.SetStateAction<[LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig]>>;
  requestHardwareLayer: (idx: number) => Promise<boolean>;
  syncRgbConfigsToDevice: (configs: [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig], persist: boolean) => void;
  handleAddLayer: () => void;
  handleRemoveLayer: (idx: number) => void;
  showToast: (msg: string) => void;
  maxLayerCount: number;
}

export function LayersControlBar({
  entrancePhase,
  containerRef,
  activeTooltip,
  setActiveTooltip,
  currentProfile,
  activeLayerIndex,
  layerToolbarOpen,
  setLayerToolbarOpen,
  layerDeleteConfirm,
  setLayerDeleteConfirm,
  layerLightingOpen,
  setLayerLightingOpen,
  currentLayerName,
  currentLayerNameKey,
  setLayerNames,
  hardwareLayerNames,
  ledEditingLayerIdx,
  setLedEditingLayerIdx,
  layerLedConfigs,
  setLayerLedConfigs,
  requestHardwareLayer,
  syncRgbConfigsToDevice,
  handleAddLayer,
  handleRemoveLayer,
  showToast,
  maxLayerCount,
}: LayersControlBarProps) {
  return (
    <motion.div
      {...getEntranceMotionProps(entrancePhase, { delay: 0.19 })}
      ref={containerRef}
      className="flex flex-col items-center relative pointer-events-auto justify-self-center"
    >
      <div className="flex items-center gap-[5px] text-[#666666] text-[12.5px] font-normal">
        <span>Layers</span>
        <button
          onClick={() =>
            setActiveTooltip(activeTooltip === 'layers' ? null : 'layers')
          }
          onMouseEnter={() => setActiveTooltip('layers')}
          onMouseLeave={() => setActiveTooltip(null)}
          className="text-[#666666] hover:text-[#222] transition-colors cursor-pointer"
          aria-label="Layers Info"
        >
          <InfoCircleIcon />
        </button>
      </div>

      <AnimatePresence>
        {activeTooltip === 'layers' && (
          <motion.div
            key="layers-tooltip"
            initial={{ opacity: 0, y: -5, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[25px] left-1/2 -translate-x-1/2 w-[262px] bg-[#ececec] rounded-[16px] px-[18px] py-[15px] shadow-[0_3px_10px_rgba(0,0,0,0.06)] border border-black/[0.04] text-left z-40 pointer-events-none"
          >
            <div className="text-[13px] font-semibold text-[#666666] mb-[9px]">
              What is Layers?
            </div>
            <p className="text-[11px] leading-[1.36] text-[#686868]">
              Layers work like programmable overlays. Each layer can contain a different set of key assignments. Activate or toggle layers to expand what a single key can do.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="mt-[10px] flex items-center justify-center gap-[8px]"
      >
        <AnimatePresence initial={false}>
          {currentProfile.layers.map((_, idx) => {
            const isActive = idx === activeLayerIndex;
            return (
              <motion.button
                key={idx}
                layout
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => {
                  if (idx === activeLayerIndex) {
                    setLayerToolbarOpen((open) => {
                      if (open) {
                        setLayerLightingOpen(false);
                        setLayerDeleteConfirm(false);
                      }
                      return !open;
                    });
                  } else {
                    setLayerToolbarOpen(true);
                    setLayerDeleteConfirm(false);
                    // Ask the hardware to switch; the confirmed layer_state
                    // event moves the highlight and the preview. Changing
                    // them here would show a layer the device never reached.
                    void requestHardwareLayer(idx).then((confirmed) => {
                      if (!confirmed) {
                        showToast(`Layer ${idx + 1} was not confirmed by the Micro Pad`);
                      }
                    });
                  }
                }}
                title={`Layer ${idx + 1}`}
                aria-pressed={isActive}
                data-active-layer={isActive ? 'true' : 'false'}
                className={`w-[26px] h-[26px] rounded-full border-[1.5px] text-[11.5px] font-medium flex items-center justify-center transition-colors duration-200 tabular-nums cursor-pointer ${
                  isActive
                    ? 'bg-[#111111] border-[#111111] text-white shadow-[0_1px_4px_rgba(0,0,0,0.22)]'
                    : 'bg-white text-[#444444] border-transparent hover:border-black/30 hover:text-black shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                }`}
              >
                {idx + 1}
              </motion.button>
            );
          })}
        </AnimatePresence>

        {currentProfile.layers.length < maxLayerCount && (
          <motion.button
            layout
            whileTap={{ scale: 0.92 }}
            onClick={handleAddLayer}
            title="Add Layer"
            className="w-[26px] h-[26px] rounded-full border-[1.5px] border-transparent hover:border-black/30 flex items-center justify-center text-[#555555] hover:text-black hover:bg-black/5 transition-all cursor-pointer"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <path d="M6 1.5V10.5M1.5 6H10.5" />
            </svg>
          </motion.button>
        )}
      </motion.div>

      {/* LAYER ACTION TOOLBAR & LED COLOUR POPOVER */}
      <AnimatePresence>
        {layerToolbarOpen && (
          <motion.div
            key="layer-action-toolbar"
            layout
            initial={{ opacity: 0, y: -6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.94 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 30,
              mass: 0.75,
            }}
            className="mt-[9px] flex items-center gap-[6px] relative z-30"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {layerDeleteConfirm ? (
                <motion.div
                  key="layer-delete-confirm"
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
                    initial={{ opacity: 0, x: -12, scale: 0.88 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.88 }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    transition={{
                      type: 'spring',
                      stiffness: 560,
                      damping: 28,
                    }}
                    onClick={() => setLayerDeleteConfirm(false)}
                    className="h-[28px] px-[13px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-black/30 text-[11px] font-medium text-[#555555] shadow-[0_2px_6px_rgba(0,0,0,0.06)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    layout
                    initial={{ opacity: 0, x: 16, scale: 0.86 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 14, scale: 0.86 }}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: '0 6px 20px rgba(220, 0, 0, 0.38)',
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{
                      type: 'spring',
                      stiffness: 520,
                      damping: 26,
                    }}
                    onClick={() => handleRemoveLayer(activeLayerIndex)}
                    className="h-[28px] w-[184px] rounded-full bg-gradient-to-r from-[#e01b24] via-[#ff2934] to-[#c40000] text-white text-[11px] font-semibold flex items-center justify-center gap-[6px] shadow-[0_3px_12px_rgba(220,0,0,0.28)] cursor-pointer"
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
                  key="layer-normal-controls"
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
                  className="flex items-center gap-[6px]"
                >
                  {/* Layer Name Input Pill */}
                  <div className="w-[144px] h-[28px] px-[12px] rounded-full bg-[#e2e2e2] border-[1.5px] border-transparent focus-within:border-black/40 flex items-center transition-colors">
                    <input
                      type="text"
                      value={currentLayerName}
                      onChange={(e) =>
                        setLayerNames((prev) => ({
                          ...prev,
                          [currentLayerNameKey]: e.target.value,
                        }))
                      }
                      placeholder={hardwareLayerNames[activeLayerIndex] ?? 'Layer name...'}
                      className="w-full bg-transparent text-[11px] text-[#555555] placeholder:text-[#9c9c9c] focus:outline-none"
                    />
                  </div>

                  {/* LED Colour Settings Pill Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => {
                      setLedEditingLayerIdx(Math.min(3, Math.max(0, activeLayerIndex)));
                      setLayerLightingOpen((o) => !o);
                    }}
                    title="Layer LED settings"
                    aria-label="LED colour settings"
                    className={`w-[58px] h-[28px] rounded-full border-[1.5px] flex items-center justify-center transition-colors cursor-pointer ${
                      layerLightingOpen
                        ? 'bg-[#000000] text-white border-[#000000]'
                        : 'bg-white hover:bg-neutral-50 text-[#555555] border-transparent hover:border-black/30 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                    }`}
                  >
                    <svg
                      width="16"
                      height="14"
                      viewBox="0 0 18 15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <line x1="6.2" y1="11.5" x2="11.8" y2="11.5" />
                      <line x1="9" y1="5.0" x2="9" y2="7.2" />
                      <line x1="5.5" y1="6.5" x2="6.9" y2="7.9" />
                      <line x1="12.5" y1="6.5" x2="11.1" y2="7.9" />
                      <line x1="3.8" y1="9.6" x2="5.6" y2="9.6" />
                      <line x1="14.2" y1="9.6" x2="12.4" y2="9.6" />
                    </svg>
                  </motion.button>

                  {/* Delete Layer × Button */}
                  {currentProfile.layers.length > 1 && (
                    <motion.button
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.88 }}
                      transition={{
                        type: 'spring',
                        stiffness: 520,
                        damping: 24,
                      }}
                      onClick={() => {
                        setLayerLightingOpen(false);
                        setLayerDeleteConfirm(true);
                      }}
                      title="Delete layer"
                      className="w-[28px] h-[28px] rounded-full bg-white hover:bg-[#dc0000] text-[#555555] hover:text-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors cursor-pointer"
                    >
                      <X className="w-[13px] h-[13px] stroke-[1.8]" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* PER-LAYER LED COLOUR POPOVER CARD */}
            <LedSettingsPopover
              open={layerLightingOpen && !layerDeleteConfirm}
              layerLedConfigs={layerLedConfigs}
              setLayerLedConfigs={setLayerLedConfigs}
              ledEditingLayerIdx={ledEditingLayerIdx}
              setLedEditingLayerIdx={setLedEditingLayerIdx}
              currentProfileLayerCount={currentProfile.layers.length}
              requestHardwareLayer={requestHardwareLayer}
              syncRgbConfigsToDevice={syncRgbConfigsToDevice}
              showToast={showToast}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
