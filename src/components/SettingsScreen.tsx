import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { QmkViaStatus } from '../qmkViaBridge';
import type {
  AppSettingKey,
  InstalledApplication,
  SettingsCapabilities,
  SupportLinkKey,
} from '../appSettings';
import type { AppProfileMappingRule } from '../activeWindow';
import { SettingsSwitch } from './SettingsSwitch';
import { InfoCircleIcon, WarningTriangleIcon } from './UiIcons';

export interface SettingsScreenProps {
  deviceStatus: QmkViaStatus;
  appVersion: string;
  launchAtStartup: boolean;
  settingsCapabilities: SettingsCapabilities;
  allowTerminalSmartActions: boolean;
  allowDeviceNotifications: boolean;
  autoSwitchProfile?: boolean;
  appProfileRules?: AppProfileMappingRule[];
  availableProfiles?: Array<{ name: string }>;
  installedApps?: InstalledApplication[];
  firmwareCheckPending: boolean;
  appUpdateCheckPending?: boolean;
  cheatSheetGlobalHotkeyEnabled?: boolean;
  cheatSheetGlobalHotkey?: string;
  rotaryStepMultiplier?: number;
  handleAppSettingChange: (key: AppSettingKey, value: boolean | string | number) => Promise<void> | void;
  handleUpdateProfileRules?: (rules: AppProfileMappingRule[]) => void;
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
  settingsCapabilities,
  allowTerminalSmartActions,
  allowDeviceNotifications,
  autoSwitchProfile = false,
  appProfileRules = [],
  availableProfiles = [],
  installedApps = [],
  firmwareCheckPending,
  appUpdateCheckPending = false,
  cheatSheetGlobalHotkeyEnabled = true,
  cheatSheetGlobalHotkey = 'Ctrl+Alt+M',
  rotaryStepMultiplier = 1,
  handleAppSettingChange,
  handleUpdateProfileRules,
  handleToggleCheatSheet,
  handleOpenSupportLink,
  handleCheckFirmwareUpdate,
  handleCheckAppUpdate,
  handleResetLocalConfig,
  handleAdvanceFlash,
}: SettingsScreenProps) {
  const [showAddRule, setShowAddRule] = useState(false);
  const [newProc, setNewProc] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newProfile, setNewProfile] = useState(() => availableProfiles[0]?.name || '');
  return (
    <motion.main
      key="settings-screen"
      initial={{ opacity: 0, scale: 0.985, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 1.01, filter: 'blur(4px)' }}
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      className="flex-1 flex flex-col justify-between items-center w-full px-4 overflow-y-auto"
    >
      <div className="flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-[662px] grid grid-cols-1 md:grid-cols-2 gap-[14px] items-start my-8">
          <div className="flex flex-col gap-[12px]">
            <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[8px]">
                Information
              </h2>
              <div className="divide-y divide-[#dadada] text-[10.5px]">
                <div className="py-[7px] flex items-center justify-between">
                  <span className="text-[#585858]">Device status:</span>
                  <span className="text-[#444444] font-medium">
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

            <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[8px]">
                App settings
              </h2>
              <div className="divide-y divide-[#dadada] text-[10.5px]">
                <div className="py-[8px] flex items-center justify-between">
                  <span className="text-[#585858]">Launch app at startup</span>
                  <SettingsSwitch
                    checked={launchAtStartup}
                    disabled={!settingsCapabilities.launchAtStartup}
                    title={settingsCapabilities.launchAtStartup
                      ? 'Start the installed app when you sign in'
                      : 'Available only in the installed desktop app'}
                    onChange={() => void handleAppSettingChange('launchAtStartup', !launchAtStartup)}
                  />
                </div>
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
                    <span>Auto-switch profile for active app</span>
                    <span className="text-[#666666]">
                      <InfoCircleIcon size={11} />
                    </span>
                  </span>
                  <SettingsSwitch
                    checked={autoSwitchProfile}
                    title="Automatically activate matching profiles when switching between applications (e.g. VS Code, Photoshop, Blender)."
                    onChange={() => void handleAppSettingChange('autoSwitchProfile', !autoSwitchProfile)}
                  />
                </div>
              </div>
            </div>

            {autoSwitchProfile && (
              <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
                <div className="flex items-center justify-between mb-[10px]">
                  <h2 className="text-[13.5px] font-medium text-[#4a4a4a] flex items-center gap-[6px]">
                    <span>App-to-Profile Rules</span>
                    <span className="text-[10px] bg-black/10 px-[6px] py-[1px] rounded-full text-[#555] font-mono">
                      {appProfileRules.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddRule(!showAddRule)}
                    className="px-[8px] py-[2px] rounded-full bg-white hover:bg-[#0051ff] text-[9.5px] font-medium text-[#444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                  >
                    {showAddRule ? 'Cancel' : '+ Add rule'}
                  </button>
                </div>

                {showAddRule && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const targetProf = newProfile || availableProfiles[0]?.name;
                      if (!newProc.trim() || !targetProf) return;
                      const next = [
                        ...appProfileRules,
                        {
                          id: `rule-${Date.now()}`,
                          processPattern: newProc.trim(),
                          titlePattern: newTitle.trim() || undefined,
                          targetProfileName: targetProf,
                          enabled: true,
                        },
                      ];
                      handleUpdateProfileRules?.(next);
                      setNewProc('');
                      setNewTitle('');
                      setShowAddRule(false);
                    }}
                    className="mb-[12px] p-[10px] rounded-[12px] bg-white/70 border border-black/[0.04] space-y-[8px] text-[10.5px]"
                  >
                    <div>
                      <label className="block text-[#666] mb-[2px] font-medium">Application Executable</label>
                      <div className="flex gap-[6px]">
                        <input
                          type="text"
                          value={newProc}
                          onChange={(e) => setNewProc(e.target.value)}
                          placeholder="e.g. blender.exe or code.exe"
                          required
                          className="flex-1 h-[25px] bg-white rounded-[6px] px-[8px] text-[#222] border border-black/10 focus:outline-none focus:border-[#0051ff]"
                        />
                        {installedApps && installedApps.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setNewProc(e.target.value);
                              }
                            }}
                            className="h-[25px] bg-white rounded-[6px] px-[6px] text-[#444] border border-black/10 text-[9.5px] max-w-[120px] truncate"
                          >
                            <option value="">Pick app…</option>
                            {installedApps.map((app) => (
                              <option key={app.name} value={`${app.name.toLowerCase().replace(/\s+/g, '')}.exe`}>
                                {app.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[#666] mb-[2px] font-medium">Window Title Filter (Optional)</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. YouTube or project-name"
                        className="w-full h-[25px] bg-white rounded-[6px] px-[8px] text-[#222] border border-black/10 focus:outline-none focus:border-[#0051ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-[#666] mb-[2px] font-medium">Target Profile</label>
                      <select
                        value={newProfile || availableProfiles[0]?.name || ''}
                        onChange={(e) => setNewProfile(e.target.value)}
                        required
                        className="w-full h-[25px] bg-white rounded-[6px] px-[8px] text-[#222] border border-black/10 focus:outline-none focus:border-[#0051ff]"
                      >
                        {availableProfiles.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end pt-[2px]">
                      <button
                        type="submit"
                        className="px-[12px] py-[4px] rounded-full bg-[#0051ff] text-white text-[10px] font-medium hover:bg-[#0043d4] transition-colors cursor-pointer"
                      >
                        Save Rule
                      </button>
                    </div>
                  </form>
                )}

                {appProfileRules.length === 0 ? (
                  <p className="text-[10px] text-[#777] italic py-[4px]">
                    No custom rules configured. Default matching is active for Code, Photoshop, Blender, OBS, and Chrome.
                  </p>
                ) : (
                  <div className="space-y-[6px]">
                    {appProfileRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-[8px] rounded-[10px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)] text-[10.5px]"
                      >
                        <div className="flex flex-col gap-[1px] min-w-0 flex-1 pr-[8px]">
                          <div className="flex items-center gap-[6px]">
                            <span className="font-mono font-medium text-[#222] truncate">
                              {rule.processPattern}
                            </span>
                            {rule.titlePattern && (
                              <span className="text-[9px] bg-black/5 px-[4px] py-[0.5px] rounded text-[#666] truncate max-w-[100px]">
                                &ldquo;{rule.titlePattern}&rdquo;
                              </span>
                            )}
                          </div>
                          <div className="text-[9.5px] text-[#0051ff] font-medium flex items-center gap-[4px]">
                            <span>→</span>
                            <span className="truncate">{rule.targetProfileName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-[8px] shrink-0">
                          <SettingsSwitch
                            checked={rule.enabled}
                            title={rule.enabled ? 'Rule enabled' : 'Rule disabled'}
                            onChange={() => {
                              const updated = appProfileRules.map((r) =>
                                r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                              );
                              handleUpdateProfileRules?.(updated);
                            }}
                          />
                          <button
                            type="button"
                            title="Delete rule"
                            onClick={() => {
                              const updated = appProfileRules.filter((r) => r.id !== rule.id);
                              handleUpdateProfileRules?.(updated);
                            }}
                            className="text-[#999] hover:text-[#dc2626] transition-colors p-[2px] cursor-pointer"
                          >
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2.5 3.5h9M5 3.5V2a1 1 0 011-1h2a1 1 0 011 1v1.5M11 3.5v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-[12px]">
            <div className="bg-[#e3e3e3] rounded-[16px] px-[16px] py-[14px]">
              <h2 className="text-[13.5px] font-medium text-[#4a4a4a] mb-[12px]">
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
                    className="w-full h-[27px] rounded-full bg-white hover:bg-[#0051ff] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#f2e4c6] rounded-[16px] px-[16px] py-[14px]">
              <div className="flex items-center gap-[7px] text-[#e09100] text-[13.5px] font-medium mb-[12px]">
                <WarningTriangleIcon color="#e09100" />
                <span>Device update</span>
              </div>
              <button
                type="button"
                onClick={() => void handleCheckFirmwareUpdate()}
                disabled={firmwareCheckPending}
                title="Checks the published firmware release feed; it does not flash the device"
                className="w-full h-[27px] rounded-full bg-white hover:bg-[#f59e0b] disabled:opacity-50 text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer disabled:cursor-wait"
              >
                {firmwareCheckPending ? 'Checking firmware…' : 'Check firmware update'}
              </button>
            </div>

            <div className="bg-[#efc8c8] rounded-[16px] px-[16px] py-[14px]">
              <div className="flex items-center gap-[7px] text-[#e01b24] text-[13.5px] font-medium mb-[12px]">
                <WarningTriangleIcon color="#e01b24" />
                <span>Danger zone</span>
              </div>
              <div className="space-y-[7px]">
                <button
                  type="button"
                  onClick={handleResetLocalConfig}
                  className="w-full h-[27px] rounded-full bg-white hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
                >
                  Reset local config
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdvanceFlash()}
                  title="Copies a validated RP2040 UF2 to an already-mounted RPI-RP2 BOOTSEL drive in the desktop app"
                  className="w-full h-[27px] rounded-full bg-white hover:bg-[#e01b24] text-[10.5px] font-medium text-[#444444] hover:text-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors cursor-pointer"
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
