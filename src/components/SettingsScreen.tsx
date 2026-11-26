import React from 'react';
import { motion } from 'motion/react';
import type { QmkViaStatus } from '../qmkViaBridge';
import type {
  AppSettingKey,
  SettingsCapabilities,
  SupportLinkKey,
} from '../appSettings';
import { SettingsSwitch } from './SettingsSwitch';
import { InfoCircleIcon, WarningTriangleIcon } from './UiIcons';

export interface SettingsScreenProps {
  deviceStatus: QmkViaStatus;
  appVersion: string;
  launchAtStartup: boolean;
  startHiddenInTray?: boolean;
  settingsCapabilities: SettingsCapabilities;
  allowTerminalSmartActions: boolean;
  allowDeviceNotifications: boolean;
  firmwareCheckPending: boolean;
  appUpdateCheckPending?: boolean;
  cheatSheetGlobalHotkeyEnabled?: boolean;
  cheatSheetGlobalHotkey?: string;
  rotaryStepMultiplier?: number;
  rotaryAcceleration?: boolean;
  darkMode?: boolean;
  handleAppSettingChange: (key: AppSettingKey, value: boolean | string | number) => Promise<void> | void;
  handleToggleCheatSheet?: () => void;
  handleOpenSupportLink: (key: SupportLinkKey, label: string) => Promise<void> | void;
  handleCheckFirmwareUpdate: () => Promise<void> | void;
  handleCheckAppUpdate?: () => Promise<void> | void;
  handleResetLocalConfig: () => void;
  handleAdvanceFlash: () => Promise<void> | void;
}

export function SettingsScreen({
  deviceStatus,
  appVersion,
  launchAtStartup,
  startHiddenInTray = false,
  settingsCapabilities,
  allowTerminalSmartActions,
  allowDeviceNotifications,
  firmwareCheckPending,
  appUpdateCheckPending = false,
  cheatSheetGlobalHotkeyEnabled = true,
  cheatSheetGlobalHotkey = 'Ctrl+Alt+M',
  rotaryStepMultiplier = 1,
  rotaryAcceleration = true,
  darkMode = false,
  handleAppSettingChange,
  handleToggleCheatSheet,
  handleOpenSupportLink,
  handleCheckFirmwareUpdate,
  handleCheckAppUpdate,
  handleResetLocalConfig,
  handleAdvanceFlash,
}: SettingsScreenProps) {
  return (
    <motion.main
      key="settings-screen"
      initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="flex-1 flex flex-col justify-between items-center w-full px-4 overflow-y-auto bg-[#efefef] dark:bg-[#121214] transition-colors duration-200"
    >
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-[662px] grid grid-cols-1 md:grid-cols-2 gap-[14px] items-start my-8">
          <div className="flex flex-col gap-[12px]">
            <div className="bg-[#e3e3e3] dark:bg-[#18181b] dark:border dark:border-white/10 rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] dark:text-[#f4f4f5] mb-[8px]">
                Information
              </h2>
              <div className="divide-y divide-[#dadada] dark:divide-neutral-800 text-[10.5px]">
                <div className="py-[7px] flex items-center justify-between">
                  <span className="text-[#585858] dark:text-[#a1a1aa]">Device status:</span>
                  <span className="text-[#444444] dark:text-[#e4e4e7] font-medium">
                    {deviceStatus.state === 'connected'
                      ? deviceStatus.device || 'Grid Macro 1'
                      : deviceStatus.state === 'connecting'
                        ? 'Connecting…'
                        : deviceStatus.state === 'searching'
                          ? 'Searching…'
                          : 'Not connected'}
                  </span>
                </div>
                <div className="py-[7px] flex items-center justify-between">
                  <span className="text-[#585858]">Firmware version:</span>
                  <span className="text-[#444444] font-medium tabular-nums">
                    {deviceStatus.state === 'connected' ? deviceStatus.fw || 'Unknown' : '—'}
                  </span>
                </div>
                <div className="pt-[7px] pb-[2px] flex items-center justify-between">
                  <span className="text-[#585858]">Input app version:</span>
                  <div className="flex items-center gap-[8px]">
                    <span className="text-[#444444] font-medium tabular-nums">
                      {appVersion}
                    </span>
                    {handleCheckAppUpdate && (
                      <button
                        type="button"
                        onClick={() => void handleCheckAppUpdate()}
                        disabled={appUpdateCheckPending}
                        title="Check GitHub for application updates"
                        className="px-[8px] py-[2px] rounded-full bg-white hover:bg-[#0051ff] text-[9.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {appUpdateCheckPending ? 'Checking…' : 'Check update'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Startup & Tray */}
            <div className="bg-[#e3e3e3] dark:bg-[#18181b] dark:border dark:border-white/10 rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] dark:text-[#f4f4f5] mb-[8px]">
                Startup &amp; Tray
              </h2>
              <div className="divide-y divide-[#dadada] dark:divide-neutral-800 text-[10.5px]">
                <div className="py-[9px] flex items-center justify-between gap-4">
                  <div className="flex flex-col gap-[1px] flex-1 min-w-0 pr-2">
                    <span className="text-[#333333] dark:text-[#f4f4f5] font-medium text-[11px]">Start at login</span>
                    <span className="text-[#666666] dark:text-[#a1a1aa] text-[10px] leading-tight">
                      Automatically start NØDE Studio when you log in
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={launchAtStartup}
                    disabled={!settingsCapabilities.launchAtStartup}
                    title={settingsCapabilities.launchAtStartup
                      ? 'Automatically start NØDE Studio when you log in'
                      : 'Available only in the installed desktop app'}
                    onChange={() => {
                      const nextLaunch = !launchAtStartup;
                      void handleAppSettingChange('launchAtStartup', nextLaunch);
                      if (!nextLaunch && startHiddenInTray) {
                        void handleAppSettingChange('startHiddenInTray', false);
                      }
                    }}
                  />
                </div>

                <div
                  className={`py-[9px] flex items-center justify-between gap-4 transition-opacity duration-200 ${
                    !launchAtStartup ? 'opacity-40' : 'opacity-100'
                  }`}
                >
                  <div className="flex flex-col gap-[1px] flex-1 min-w-0 pr-2">
                    <span
                      className={`font-medium text-[11px] ${
                        !launchAtStartup ? 'text-[#888888] dark:text-[#71717a]' : 'text-[#333333] dark:text-[#f4f4f5]'
                      }`}
                    >
                      Start hidden in the tray
                    </span>
                    <span className="text-[#666666] dark:text-[#a1a1aa] text-[10px] leading-tight">
                      Every time NØDE Studio starts, it runs in the background with its window hidden. Click the tray icon or open NØDE Studio again to show it.
                    </span>
                  </div>
                  <SettingsSwitch
                    checked={Boolean(launchAtStartup && startHiddenInTray)}
                    disabled={!launchAtStartup || !settingsCapabilities.launchAtStartup}
                    title={
                      !launchAtStartup
                        ? 'Enable "Start at login" first to configure hidden startup'
                        : 'Launch with main window hidden in the background system tray'
                    }
                    onChange={() => {
                      if (!launchAtStartup) return;
                      void handleAppSettingChange('startHiddenInTray', !startHiddenInTray);
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#e3e3e3] dark:bg-[#18181b] dark:border dark:border-white/10 rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] dark:text-[#f4f4f5] mb-[8px]">
                App settings
              </h2>
              <div className="divide-y divide-[#dadada] dark:divide-neutral-800 text-[10.5px]">
                <div className="py-[8px] flex items-center justify-between">
                  <span className="text-[#585858] flex items-center gap-[5px]">
                    <span>Allow terminal commands via Smart Actions</span>
                    <span className="text-[#666666]">
                      <InfoCircleIcon size={11} />
                    </span>
                  </span>
                  <SettingsSwitch
                    checked={allowTerminalSmartActions}
                    title="Terminal commands run on this computer. Enable only for trusted Smart Actions."
                    onChange={() => void handleAppSettingChange('allowTerminalSmartActions', !allowTerminalSmartActions)}
                  />
                </div>
                <div className="pt-[8px] pb-[2px] flex items-center justify-between">
                  <span className="text-[#585858]">
                    Notify on device connect/disconnect
                  </span>
                  <SettingsSwitch
                    checked={allowDeviceNotifications}
                    title="Shows a system notification when the device connects or disconnects."
                    onChange={() => void handleAppSettingChange('allowDeviceNotifications', !allowDeviceNotifications)}
                  />
                </div>
                <div className="pt-[8px] pb-[2px] flex items-center justify-between">
                  <span className="text-[#585858] flex items-center gap-[5px]">
                    <span>Dynamic rotary acceleration</span>
                    <span className="text-[#666666]">
                      <InfoCircleIcon size={11} />
                    </span>
                  </span>
                  <SettingsSwitch
                    checked={rotaryAcceleration}
                    title="Rotate slowly for single-step precision (1% volume / single frame); spin rapidly for dynamic accelerated jumps (5–10%)."
                    onChange={() => void handleAppSettingChange('rotaryAcceleration', !rotaryAcceleration)}
                  />
                </div>
                <div className="pt-[8px] pb-[2px] flex items-center justify-between">
                  <span className="text-[#585858] dark:text-[#a1a1aa] flex items-center gap-[5px]">
                    <span>Full OLED stealth dark mode</span>
                    <span className="text-[#666666] dark:text-[#71717a]">
                      <InfoCircleIcon size={11} />
                    </span>
                  </span>
                  <SettingsSwitch
                    checked={darkMode}
                    title="Switches canvas and studio interface to deep matte black (#121214 / #18181b) matching the macropad."
                    onChange={() => void handleAppSettingChange('darkMode', !darkMode)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[12px]">
            <div className="bg-[#e3e3e3] dark:bg-[#18181b] dark:border dark:border-white/10 rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] dark:text-[#f4f4f5] mb-[12px]">
                Support
              </h2>
              <div className="space-y-[7px]">
                {([
                  { key: 'help', label: 'Help & Documentation' },
                  { key: 'contact', label: 'Contact support' },
                  { key: 'feedback', label: 'Give feedback' },
                  { key: 'releaseNotes', label: 'Release notes' },
                ] as const).map(({ key, label }) => (
                  <button
                    type="button"
                    key={label}
                    onClick={() => void handleOpenSupportLink(key, label)}
                    className="w-full h-[27px] rounded-full bg-white dark:bg-[#27272a] hover:bg-[#0051ff] dark:hover:bg-[#0051ff] text-[10.5px] font-medium text-[#444444] dark:text-neutral-200 hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#f2e4c6] dark:bg-[#2d2212] dark:border dark:border-amber-800/40 rounded-[16px] px-[16px] py-[14px]">
              <div className="flex items-center gap-[7px] text-[#e09100] dark:text-amber-400 text-[13.5px] font-medium mb-[12px]">
                <WarningTriangleIcon color="#e09100" />
                <span>Device update</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckFirmwareUpdate()}
                disabled={firmwareCheckPending}
                title="Checks the published firmware release feed; it does not flash the device"
                className="w-full h-[27px] rounded-full bg-white dark:bg-[#3d2e18] hover:bg-[#f59e0b] dark:hover:bg-[#f59e0b] disabled:opacity-50 text-[10.5px] font-medium text-[#444444] dark:text-neutral-200 hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer disabled:cursor-wait"
              >
                {firmwareCheckPending ? 'Checking firmware…' : 'Check firmware update'}
              </button>
            </div>

            <div className="bg-[#efc8c8] dark:bg-[#2e1316] dark:border dark:border-red-900/50 rounded-[16px] px-[16px] py-[14px]">
              <div className="flex items-center gap-[7px] text-[#e01b24] dark:text-red-400 text-[13.5px] font-medium mb-[12px]">
                <WarningTriangleIcon color="#e01b24" />
                <span>Danger zone</span>
              </div>
              <div className="space-y-[7px]">
                <button
                  type="button"
                  onClick={handleResetLocalConfig}
                  className="w-full h-[27px] rounded-full bg-white dark:bg-[#3f191d] hover:bg-[#e01b24] dark:hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] dark:text-neutral-200 hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                >
                  Reset local config
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdvanceFlash()}
                  title="Copies a validated RP2040 UF2 to an already-mounted RPI-RP2 BOOTSEL drive in the desktop app"
                  className="w-full h-[27px] rounded-full bg-white dark:bg-[#3f191d] hover:bg-[#e01b24] dark:hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] dark:text-neutral-200 hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                >
                  Advance flash
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="pb-[18px] text-[9.5px] text-[#555555] text-center">
        © 2026 NODE studio
      </footer>
    </motion.main>
  );
}

export default SettingsScreen;
