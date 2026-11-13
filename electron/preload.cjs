// electron/preload.cjs - Safe IPC Bridge for Windows Desktop App
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.invoke('window-minimize'),
  maximize: () => ipcRenderer.invoke('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getInstalledApplications: () => ipcRenderer.invoke('list-installed-applications'),
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  setAppSetting: (key, value) => ipcRenderer.invoke('set-app-setting', key, value),
  openExternal: (url) => ipcRenderer.invoke('open-external-url', url),
  setSimulationEnabled: (enabled) => ipcRenderer.invoke('set-simulation-enabled', enabled),
  flashFirmware: () => ipcRenderer.invoke('flash-uf2'),
  executeSmartAction: (payload) => ipcRenderer.invoke('execute-smart-action', payload),
  onHardwareSync: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-hardware-sync', listener);
    return () => ipcRenderer.removeListener('trigger-hardware-sync', listener);
  },
  onResetMacropadKeys: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-reset-macropad-keys', listener);
    return () => ipcRenderer.removeListener('trigger-reset-macropad-keys', listener);
  },
  onToggleCheatSheet: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-toggle-cheat-sheet', listener);
    return () => ipcRenderer.removeListener('trigger-toggle-cheat-sheet', listener);
  },
  setCheatSheetActive: (active, data) => ipcRenderer.invoke('set-cheat-sheet-active', active, data),
  onCloseCheatSheet: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-close-cheat-sheet', listener);
    return () => ipcRenderer.removeListener('trigger-close-cheat-sheet', listener);
  },
  onOpenHardwareModal: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('open-hardware-modal', listener);
    return () => ipcRenderer.removeListener('open-hardware-modal', listener);
  },
  getAgentStatus: () => ipcRenderer.invoke('agent:get-status'),
  agentSetLayer: (layer) => ipcRenderer.invoke('agent:set-layer', layer),
  agentSetProfile: (profileId) => ipcRenderer.invoke('agent:set-profile', profileId),
  agentSyncProfiles: (profilesData, expectedGen) => ipcRenderer.invoke('agent:sync-profiles', profilesData, expectedGen),
  agentSyncStudioProfiles: (profiles, activeProfileIndex, approvedGeneration) => ipcRenderer.invoke('agent:sync-studio-profiles', profiles, activeProfileIndex, approvedGeneration),
  agentViaPassthrough: (report) => ipcRenderer.invoke('agent:via-passthrough', report),
  onAgentHardwareEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('agent:hardware-event', listener);
    return () => ipcRenderer.removeListener('agent:hardware-event', listener);
  },
  onAgentGestureEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('agent:gesture-event', listener);
    return () => ipcRenderer.removeListener('agent:gesture-event', listener);
  },
  onAgentDeviceChange: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('agent:device-change', listener);
    return () => ipcRenderer.removeListener('agent:device-change', listener);
  },
});
