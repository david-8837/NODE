import { useState, useEffect } from 'react';
import {
  readAppSettings,
  saveAppSettings,
  createAppSettingsTools,
  type AppSettings,
  type SettingsCapabilities,
} from '../appSettings';

export interface UseAppSettingsResult {
  appSettings: AppSettings;
  setAppSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  settingsCapabilities: SettingsCapabilities;
  setSettingsCapabilities: React.Dispatch<React.SetStateAction<SettingsCapabilities>>;
}

export function useAppSettings(): UseAppSettingsResult {
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    const saved = readAppSettings();
    return window.electronAPI?.setAppSetting
      ? saved
      : { ...saved, launchAtStartup: false };
  });

  const [settingsCapabilities, setSettingsCapabilities] = useState<SettingsCapabilities>({
    launchAtStartup: false,
    firmwareFlash: false,
    externalLinks: true,
  });

  useEffect(() => {
    let active = true;
    const settingsTools = window.nodeStudioAppSettings ?? createAppSettingsTools(window);
    void settingsTools.getDesktop().then((result) => {
      if (!active || !result?.ok) return;
      if (result.settings) setAppSettings(result.settings);
      if (result.capabilities) setSettingsCapabilities(result.capabilities);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    saveAppSettings(appSettings);
  }, [appSettings]);

  return {
    appSettings,
    setAppSettings,
    settingsCapabilities,
    setSettingsCapabilities,
  };
}
