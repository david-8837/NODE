import React from 'react';
import { Search } from 'lucide-react';
import type { PresetItem, ProfileData } from '../presetLibrary';

export interface PresetGridProps {
  presetSearch: string;
  setPresetSearch: (search: string) => void;
  presetOs: 'mac' | 'win';
  setPresetOs: (os: 'mac' | 'win') => void;
  filteredPresets: PresetItem[];
  currentProfile: ProfileData;
  onPreviewPreset: (preset: PresetItem) => void;
  onInstallPreset: (preset: PresetItem) => void;
  isPresetInstalledInProfile: (profile: ProfileData, presetId: string) => boolean;
  renderAppIcon: (presetId: string) => React.ReactNode;
}

export function PresetGrid({
  presetSearch,
  setPresetSearch,
  presetOs,
  setPresetOs,
  filteredPresets,
  currentProfile,
  onPreviewPreset,
  onInstallPreset,
  isPresetInstalledInProfile,
  renderAppIcon,
}: PresetGridProps) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[25px] font-medium text-[#666666] tracking-[-0.01em] leading-none">
            Presets library
          </h1>
          <p className="mt-[12px] text-[10.5px] leading-[1.42] text-[#686868]">
            Presets are ready-made key configurations.
            <br />
            Load a preset to instantly apply a predefined workflow to your device.
          </p>
        </div>

        <div className="flex flex-col items-end gap-[9px]">
          <div className="w-[196px] h-[27px] rounded-full bg-[#e2e2e2] px-[11px] flex items-center gap-[6px]">
            <Search className="w-[11px] h-[11px] text-[#666666] stroke-[2]" />
            <input
              type="text"
              value={presetSearch}
              onChange={(e) => setPresetSearch(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-[11px] text-[#333333] placeholder:text-[#686868] focus:outline-none"
            />
          </div>

          <div className="w-[130px] h-[27px] rounded-full bg-white flex overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <button
              onClick={() => setPresetOs('mac')}
              aria-label="macOS Presets"
              className={`flex-1 h-full flex items-center justify-center transition-colors cursor-pointer ${
                presetOs === 'mac'
                  ? 'bg-[#000000] text-white'
                  : 'bg-white text-[#555555] hover:bg-neutral-50'
              }`}
            >
              <svg
                width="11"
                height="13"
                viewBox="0 0 14 17"
                fill="currentColor"
              >
                <path d="M11.66 9.03C11.64 6.95 13.36 5.93 13.44 5.88C12.46 4.46 10.95 4.26 10.42 4.2C9.15 4.07 7.92 4.95 7.27 4.95C6.62 4.95 5.63 4.21 4.57 4.23C3.19 4.25 1.91 5.03 1.21 6.26C-0.24 8.77 0.84 12.47 2.24 14.49C2.93 15.49 3.74 16.6 4.82 16.56C5.86 16.52 6.26 15.89 7.51 15.89C8.76 15.89 9.13 16.56 10.21 16.54C11.33 16.52 12.03 15.53 12.71 14.53C13.51 13.37 13.83 12.24 13.85 12.18C13.82 12.17 11.68 11.35 11.66 9.03ZM9.58 2.86C10.15 2.17 10.54 1.21 10.43 0.25C9.6 0.28 8.58 0.8 7.99 1.49C7.47 2.09 7.01 3.07 7.14 4.01C8.06 4.08 8.99 3.55 9.58 2.86Z" />
              </svg>
            </button>
            <button
              onClick={() => setPresetOs('win')}
              aria-label="Windows Presets"
              className={`flex-1 h-full flex items-center justify-center transition-colors cursor-pointer ${
                presetOs === 'win'
                  ? 'bg-[#000000] text-white'
                  : 'bg-white text-[#555555] hover:bg-neutral-50'
              }`}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <rect x="0.5" y="0.5" width="4.8" height="4.8" />
                <rect x="6.7" y="0.5" width="4.8" height="4.8" />
                <rect x="0.5" y="6.7" width="4.8" height="4.8" />
                <rect x="6.7" y="6.7" width="4.8" height="4.8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        data-preset-grid
        className="mt-[36px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-[17px]"
      >
        {filteredPresets.map((preset) => {
          const isInstalled = isPresetInstalledInProfile(currentProfile, preset.id);
          return (
            <div
              key={preset.id}
              className="bg-[#e3e3e3] rounded-[18px] p-[15px] flex flex-col justify-between min-h-[164px]"
            >
              <div>
                <div className="flex items-center gap-[10px]">
                  {renderAppIcon(preset.id)}
                  <div>
                    <div className="text-[10px] text-[#6d6d6d] leading-none mb-[3px]">
                      Layer preset
                    </div>
                    <div className="text-[15px] font-semibold text-[#111111] leading-none">
                      {preset.title}
                    </div>
                  </div>
                </div>

                <p className="mt-[11px] text-[10.5px] leading-[1.35] text-[#666666] min-h-[28px]">
                  {preset.description}
                </p>

                <div className="mt-[6px] text-[10px] font-medium text-[#2b2b2b]">
                  Author: {preset.author}
                </div>
              </div>

              <div className="mt-[10px]">
                {preset.hasPreview ? (
                  <div className="grid grid-cols-2 gap-[8px]">
                    <button
                      onClick={() => onPreviewPreset(preset)}
                      className="h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => onInstallPreset(preset)}
                      disabled={isInstalled}
                      aria-label={
                        isInstalled
                          ? `${preset.title} preset already installed on this profile`
                          : `Install ${preset.title} preset`
                      }
                      className="h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:text-[#999999] disabled:hover:bg-white"
                    >
                      {isInstalled ? 'Installed' : 'Install'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onInstallPreset(preset)}
                    disabled={isInstalled}
                    aria-label={
                      isInstalled
                        ? `${preset.title} preset already installed on this profile`
                        : `Install ${preset.title} preset`
                    }
                    className="w-full h-[27px] rounded-full bg-white hover:bg-neutral-50 text-[10.5px] font-medium text-[#333333] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer disabled:cursor-not-allowed disabled:text-[#999999] disabled:hover:bg-white"
                  >
                    {isInstalled ? 'Installed' : 'Install'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default PresetGrid;
