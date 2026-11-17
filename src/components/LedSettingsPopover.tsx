import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { HARDWARE_LAYER_NAMES } from '../deviceLayout';

export type LayerLedConfig = {
  preset: 'Off' | 'Solid' | 'Rainbow' | 'Breath';
  light: number;
  speed: number;
  hue: number;
  colorHex: string;
};

export const DEFAULT_LAYER_LED_CONFIGS: [
  LayerLedConfig,
  LayerLedConfig,
  LayerLedConfig,
  LayerLedConfig,
] = [
  { preset: 'Solid', light: 100, speed: 50, hue: 221, colorHex: '#0051FF' },
  { preset: 'Solid', light: 100, speed: 50, hue: 160, colorHex: '#10B981' },
  { preset: 'Solid', light: 100, speed: 50, hue: 38, colorHex: '#F59E0B' },
  { preset: 'Solid', light: 100, speed: 50, hue: 347, colorHex: '#E11D48' },
];

export function hueToHex(h: number): string {
  const s = 1;
  const l = 0.5;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export interface LedSettingsPopoverProps {
  open: boolean;
  layerLedConfigs: [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig];
  setLayerLedConfigs: React.Dispatch<
    React.SetStateAction<[LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig]>
  >;
  ledEditingLayerIdx: number;
  setLedEditingLayerIdx: (idx: number) => void;
  currentProfileLayerCount: number;
  requestHardwareLayer: (lIdx: number) => Promise<boolean>;
  syncRgbConfigsToDevice: (
    configs: [LayerLedConfig, LayerLedConfig, LayerLedConfig, LayerLedConfig],
    writeToDevice: boolean
  ) => void;
  showToast: (msg: string) => void;
}

export function LedSettingsPopover({
  open,
  layerLedConfigs,
  setLayerLedConfigs,
  ledEditingLayerIdx,
  setLedEditingLayerIdx,
  currentProfileLayerCount,
  requestHardwareLayer,
  syncRgbConfigsToDevice,
  showToast,
}: LedSettingsPopoverProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="layer-lighting-popover"
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{
            duration: 0.2,
            ease: [0.32, 0.72, 0, 1],
          }}
          style={{ transformOrigin: 'top center' }}
          className="absolute top-[37px] left-1/2 -translate-x-1/2 w-[236px] bg-[#e2e2e2] rounded-[18px] p-[9px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-black/[0.04] z-50"
        >
          {/* 4-Layer Per-Layer LED Selector Card */}
          <div className="bg-[#eeeeee] rounded-[14px] p-[10px] mb-[8px]">
            <div className="text-[11px] font-medium text-[#444444] mb-[7px] text-left">
              Per-Layer LED
            </div>
            <div className="grid grid-cols-4 gap-[5px]">
              {HARDWARE_LAYER_NAMES.map((layerLabel, lIdx) => {
                const lCfg = layerLedConfigs[lIdx] || DEFAULT_LAYER_LED_CONFIGS[lIdx];
                const isSelectedLayer = lIdx === ledEditingLayerIdx;
                const dotColor = lCfg.preset === 'Off' ? '#9ca3af' : lCfg.colorHex;
                return (
                  <button
                    key={layerLabel}
                    type="button"
                    onClick={() => {
                      setLedEditingLayerIdx(lIdx);
                      if (lIdx < currentProfileLayerCount) {
                        void requestHardwareLayer(lIdx).then((confirmed) => {
                          if (!confirmed) {
                            showToast(`Layer ${lIdx + 1} was not confirmed by the Micro Pad`);
                          }
                        });
                      }
                    }}
                    className={`h-[26px] rounded-full px-[6px] flex items-center justify-center gap-[4px] text-[10px] font-medium border-[1.5px] transition-all cursor-pointer ${
                      isSelectedLayer
                        ? 'bg-[#000000] text-white border-[#000000] shadow-xs'
                        : 'bg-white text-[#555555] border-transparent hover:border-[#0051ff]'
                    }`}
                  >
                    <span
                      className="w-[8px] h-[8px] rounded-full shrink-0 border border-black/15"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow:
                          lCfg.preset === 'Off'
                            ? 'none'
                            : `0 0 5px ${dotColor}`,
                      }}
                    />
                    <span>L{lIdx + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Presets Card (for the selected layer) */}
          <div className="bg-[#eeeeee] rounded-[14px] p-[10px] mb-[8px]">
            <div className="text-[11px] font-normal text-[#555555] mb-[7px] text-left">
              Mode
            </div>
            <div className="grid grid-cols-2 gap-[5px]">
              {(
                [
                  'Off',
                  'Solid',
                  'Rainbow',
                  'Breath',
                ] as const
              ).map((presetName) => {
                const currentLedCfg =
                  layerLedConfigs[ledEditingLayerIdx] ||
                  DEFAULT_LAYER_LED_CONFIGS[ledEditingLayerIdx];
                const isActivePreset =
                  currentLedCfg.preset === presetName;
                return (
                  <button
                    key={presetName}
                    onClick={() => {
                      setLayerLedConfigs((prev) => {
                        const next = [...prev] as [
                          LayerLedConfig,
                          LayerLedConfig,
                          LayerLedConfig,
                          LayerLedConfig,
                        ];
                        next[ledEditingLayerIdx] = {
                          ...next[ledEditingLayerIdx],
                          preset: presetName,
                        };
                        syncRgbConfigsToDevice(next, true);
                        return next;
                      });
                    }}
                    className={`h-[24px] rounded-full border-[1.5px] border-transparent hover:border-[#0051ff] text-[10px] font-medium transition-all cursor-pointer ${
                      isActivePreset
                        ? 'bg-[#000000] text-white'
                        : 'bg-white text-[#555555]'
                    }`}
                  >
                    {presetName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Card (for the selected layer) */}
          <div className="bg-[#eeeeee] rounded-[14px] p-[10px] mb-[8px]">
            <div className="flex items-center justify-between mb-[8px]">
              <span className="text-[11px] font-normal text-[#555555]">
                Layer {ledEditingLayerIdx + 1} Colour
              </span>
              <span
                className="w-[10px] h-[10px] rounded-full border border-black/15"
                style={{
                  backgroundColor:
                    layerLedConfigs[ledEditingLayerIdx]?.colorHex || '#0051FF',
                }}
              />
            </div>

            {(() => {
              const cfg =
                layerLedConfigs[ledEditingLayerIdx] ||
                DEFAULT_LAYER_LED_CONFIGS[ledEditingLayerIdx];
              const isOff = cfg.preset === 'Off';
              const isAnimated =
                cfg.preset !== 'Off' && cfg.preset !== 'Solid';

              return (
                <div className="space-y-[8px]">
                  {/* Light Slider */}
                  <div
                    className={`flex items-center gap-[8px] ${
                      isOff
                        ? 'opacity-35 pointer-events-none'
                        : ''
                    }`}
                  >
                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                      Light
                    </span>
                    <div className="relative flex-1 h-[14px] flex items-center">
                      <div className="w-full h-[1.5px] bg-[#b5b5b5] rounded-full" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cfg.light}
                        onChange={(e) => {
                          const nextLight = Number(e.target.value);
                          setLayerLedConfigs((prev) => {
                            const next = [...prev] as [
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                            ];
                            next[ledEditingLayerIdx] = {
                              ...next[ledEditingLayerIdx],
                              light: nextLight,
                            };
                            syncRgbConfigsToDevice(next, false);
                            return next;
                          });
                        }}
                        onPointerUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        onKeyUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        style={{
                          left: `calc(${cfg.light}% - 5.5px)`,
                        }}
                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Speed Slider */}
                  <div
                    className={`flex items-center gap-[8px] ${
                      !isAnimated
                        ? 'opacity-30 pointer-events-none'
                        : ''
                    }`}
                  >
                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                      Speed
                    </span>
                    <div className="relative flex-1 h-[14px] flex items-center">
                      <div className="w-full h-[1.5px] bg-[#b5b5b5] rounded-full" />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={cfg.speed}
                        onChange={(e) => {
                          const nextSpeed = Number(e.target.value);
                          setLayerLedConfigs((prev) => {
                            const next = [...prev] as [
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                            ];
                            next[ledEditingLayerIdx] = {
                              ...next[ledEditingLayerIdx],
                              speed: nextSpeed,
                            };
                            syncRgbConfigsToDevice(next, false);
                            return next;
                          });
                        }}
                        onPointerUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        onKeyUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        style={{
                          left: `calc(${cfg.speed}% - 5.5px)`,
                        }}
                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Color Rainbow Slider */}
                  <div
                    className={`flex items-center gap-[8px] ${
                      isOff
                        ? 'opacity-35 pointer-events-none'
                        : ''
                    }`}
                  >
                    <span className="w-[38px] text-left text-[10px] text-[#555555] shrink-0">
                      Color
                    </span>
                    <div className="relative flex-1 h-[14px] flex items-center">
                      <div
                        className="w-full h-[3px] rounded-full"
                        style={{
                          background:
                            'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={cfg.hue}
                        onChange={(e) => {
                          const nextHue = Number(e.target.value);
                          const nextHex = hueToHex(nextHue);
                          setLayerLedConfigs((prev) => {
                            const next = [...prev] as [
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                              LayerLedConfig,
                            ];
                            next[ledEditingLayerIdx] = {
                              ...next[ledEditingLayerIdx],
                              hue: nextHue,
                              colorHex: nextHex,
                            };
                            syncRgbConfigsToDevice(next, false);
                            return next;
                          });
                        }}
                        onPointerUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        onKeyUp={() => syncRgbConfigsToDevice(layerLedConfigs, true)}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                      />
                      <div
                        style={{
                          left: `calc(${
                            (cfg.hue / 360) * 100
                          }% - 5.5px)`,
                        }}
                        className="absolute w-[11px] h-[11px] rounded-full bg-white border border-[#444444] pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Hex Input Pill + Swatch Circle */}
                  <div
                    className={`ml-[46px] h-[24px] rounded-full bg-[#e2e2e2] px-[10px] flex items-center justify-between ${
                      isOff
                        ? 'opacity-35 pointer-events-none'
                        : ''
                    }`}
                  >
                    <input
                      type="text"
                      value={cfg.colorHex}
                      onChange={(e) => {
                        const nextHex = e.target.value;
                        setLayerLedConfigs((prev) => {
                          const next = [...prev] as [
                            LayerLedConfig,
                            LayerLedConfig,
                            LayerLedConfig,
                            LayerLedConfig,
                          ];
                          const isValidHex = /^#?[0-9a-fA-F]{6}$/.test(
                            nextHex.trim()
                          );
                          const formattedHex = isValidHex
                            ? nextHex.startsWith('#')
                              ? nextHex.toUpperCase()
                              : `#${nextHex.toUpperCase()}`
                            : nextHex;
                          next[ledEditingLayerIdx] = {
                            ...next[ledEditingLayerIdx],
                            colorHex: formattedHex,
                          };
                          if (isValidHex) {
                            syncRgbConfigsToDevice(next, true);
                          }
                          return next;
                        });
                      }}
                      className="w-[85px] bg-transparent text-[10px] text-[#555555] uppercase focus:outline-none"
                    />
                    <span
                      className="w-[11px] h-[11px] rounded-full shrink-0 border border-black/10"
                      style={{
                        backgroundColor: cfg.colorHex,
                      }}
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Apply to all layers button */}
          <button
            onClick={() => {
              const sourceCfg =
                layerLedConfigs[ledEditingLayerIdx] ||
                DEFAULT_LAYER_LED_CONFIGS[ledEditingLayerIdx];
              const nextConfigs: [
                LayerLedConfig,
                LayerLedConfig,
                LayerLedConfig,
                LayerLedConfig,
              ] = [
                { ...sourceCfg },
                { ...sourceCfg },
                { ...sourceCfg },
                { ...sourceCfg },
              ];
              setLayerLedConfigs(nextConfigs);
              syncRgbConfigsToDevice(nextConfigs, true);
              showToast(
                `Applied Layer ${ledEditingLayerIdx + 1} LED settings to all 4 layers`
              );
            }}
            className="w-full h-[25px] rounded-full bg-white hover:bg-neutral-50 border-[1.5px] border-transparent hover:border-[#0051ff] text-[10px] font-normal text-[#555555] flex items-center justify-center transition-all cursor-pointer"
          >
            Apply to all layers
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
