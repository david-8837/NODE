export const APP_SETTINGS_STORAGE_KEY = 'node-studio.settings.v1';
export const APP_VERSION_FALLBACK = '1.0.0';
export const LATEST_FIRMWARE_RELEASE_API =
  'https://api.github.com/repos/david-8837/NODE/releases/latest';
export const FIRMWARE_BUILD_WORKFLOW_URL =
  'https://github.com/david-8837/NODE/actions/workflows/qmk-build.yml';

export interface AppSettings {
  allowAnalytics: boolean;
  launchAtStartup: boolean;
  allowTerminalSmartActions: boolean;
  allowDeviceNotifications: boolean;
}

export type AppSettingKey = keyof AppSettings;
export type SupportLinkKey =
  | 'help'
  | 'contact'
  | 'feedback'
  | 'releaseNotes'
  | 'firmwareBuilds';

export const DEFAULT_APP_SETTINGS: Readonly<AppSettings> = Object.freeze({
  allowAnalytics: false,
  launchAtStartup: false,
  allowTerminalSmartActions: false,
  allowDeviceNotifications: false,
});

export const SUPPORT_LINKS: Record<SupportLinkKey, string> = {
  help: 'https://github.com/david-8837/NODE/blob/main/qmk_firmware/grid_macro_1/README.md',
  contact: 'https://github.com/david-8837/NODE/issues/new?title=Support%20request',
  feedback: 'https://github.com/david-8837/NODE/issues/new?title=Product%20feedback',
  releaseNotes: 'https://github.com/david-8837/NODE/releases',
  firmwareBuilds: FIRMWARE_BUILD_WORKFLOW_URL,
};

export interface SettingsCapabilities {
  launchAtStartup: boolean;
  firmwareFlash: boolean;
  externalLinks: boolean;
}

export interface NativeSettingsResult {
  ok: boolean;
  settings?: AppSettings;
  capabilities?: SettingsCapabilities;
  error?: string;
}

export interface InstalledApplication {
  name: string;
  shortcutPath: string;
}

export interface InstalledApplicationsResult {
  ok: boolean;
  apps: InstalledApplication[];
  error?: string;
}

export interface AppOperationResult {
  ok: boolean;
  cancelled?: boolean;
  message?: string;
  error?: string;
}

export interface NativeActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SimulationToggleResult {
  ok: boolean;
  enabled: boolean;
  error?: string;
}

export interface FirmwareCheckResult {
  state: 'available' | 'none' | 'error';
  message: string;
  version?: string;
  releaseUrl?: string;
  firmwareUrl?: string;
}

export interface ElectronApi {
  isElectron?: boolean;
  platform?: string;
  getVersion?: () => Promise<string | null>;
  getInstalledApplications?: () => Promise<InstalledApplicationsResult>;
  getAppSettings?: () => Promise<NativeSettingsResult>;
  setAppSetting?: (key: AppSettingKey, value: boolean) => Promise<NativeSettingsResult>;
  openExternal?: (url: string) => Promise<AppOperationResult>;
  flashFirmware?: () => Promise<AppOperationResult>;
  setSimulationEnabled?: (enabled: boolean) => Promise<SimulationToggleResult>;
  executeSmartAction?: (payload: Record<string, unknown>) => Promise<NativeActionResult>;
  minimize?: () => Promise<void>;
  maximize?: () => Promise<void>;
  close?: () => Promise<void>;
  isMaximized?: () => Promise<boolean>;
  onHardwareSync?: (callback: () => void) => (() => void) | void;
  onResetMacropadKeys?: (callback: () => void) => (() => void) | void;
  onToggleCheatSheet?: (callback: () => void) => (() => void) | void;
  onOpenHardwareModal?: (callback: () => void) => (() => void) | void;
}

export interface AppSettingsTools {
  read: () => AppSettings;
  save: (settings: Partial<AppSettings>) => AppSettings | null;
  getDesktop: () => Promise<NativeSettingsResult | null>;
  set: (key: AppSettingKey, value: boolean) => Promise<NativeSettingsResult>;
  openSupport: (link: SupportLinkKey | string) => Promise<AppOperationResult>;
  checkFirmware: () => Promise<FirmwareCheckResult>;
  flashFirmware: () => Promise<AppOperationResult>;
}

type StorageHost = Pick<Window, 'localStorage'>;
type SettingsHost = Window & typeof globalThis;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeAppSettings(value: unknown): AppSettings {
  const raw = isRecord(value) ? value : {};
  return {
    allowAnalytics: typeof raw.allowAnalytics === 'boolean'
      ? raw.allowAnalytics
      : DEFAULT_APP_SETTINGS.allowAnalytics,
    launchAtStartup: typeof raw.launchAtStartup === 'boolean'
      ? raw.launchAtStartup
      : DEFAULT_APP_SETTINGS.launchAtStartup,
    allowTerminalSmartActions: typeof raw.allowTerminalSmartActions === 'boolean'
      ? raw.allowTerminalSmartActions
      : DEFAULT_APP_SETTINGS.allowTerminalSmartActions,
    allowDeviceNotifications: typeof raw.allowDeviceNotifications === 'boolean'
      ? raw.allowDeviceNotifications
      : DEFAULT_APP_SETTINGS.allowDeviceNotifications,
  };
}

export function readAppSettings(host?: StorageHost): AppSettings {
  if (!host) {
    if (typeof window === 'undefined') return { ...DEFAULT_APP_SETTINGS };
    host = window;
  }
  try {
    const serialized = host.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    return serialized ? normalizeAppSettings(JSON.parse(serialized)) : { ...DEFAULT_APP_SETTINGS };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(
  settings: Partial<AppSettings>,
  host?: StorageHost,
): AppSettings | null {
  if (!host) {
    if (typeof window === 'undefined') return null;
    host = window;
  }
  const normalized = normalizeAppSettings(settings);
  try {
    host.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

function supportLinkKey(link: string): SupportLinkKey | null {
  if (Object.hasOwn(SUPPORT_LINKS, link)) return link as SupportLinkKey;
  const labels: Record<string, SupportLinkKey> = {
    'Help & Documentation': 'help',
    'Contact support': 'contact',
    'Give feedback': 'feedback',
    'Release notes': 'releaseNotes',
  };
  return labels[link] ?? null;
}

export async function openSupportLink(
  link: SupportLinkKey | string,
  host?: SettingsHost,
): Promise<AppOperationResult> {
  const browser = host ?? (typeof window === 'undefined' ? undefined : window);
  if (!browser) return { ok: false, error: 'A browser window is unavailable' };

  const key = supportLinkKey(link);
  const url = key ? SUPPORT_LINKS[key] : null;
  if (!url) return { ok: false, error: 'This support link is not configured' };

  try {
    const native = browser.electronAPI?.openExternal;
    if (native) {
      const result = await native(url);
      return result?.ok ? { ok: true } : {
        ok: false,
        error: result?.error || 'The desktop app could not open that link',
      };
    }
    const opened = browser.open(url, '_blank');
    if (!opened) {
      return { ok: false, error: 'The browser blocked the new tab; allow pop-ups and try again' };
    }
    try {
      opened.opener = null;
    } catch {
      // The browser may make opener read-only; the destination is a fixed trusted URL.
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkLatestFirmwareRelease(
  fetcher: typeof fetch = fetch,
): Promise<FirmwareCheckResult> {
  let response: Response;
  try {
    response = await fetcher(LATEST_FIRMWARE_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
  } catch (error) {
    return {
      state: 'error',
      message: `Could not reach GitHub to check firmware releases: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  if (response.status === 404) {
    return {
      state: 'none',
      message: 'There is no published firmware release yet. Firmware builds are currently available from the GitHub Actions workflow.',
    };
  }
  if (!response.ok) {
    return {
      state: 'error',
      message: `GitHub firmware check failed (HTTP ${response.status}). Try again later.`,
    };
  }

  let release: unknown;
  try {
    release = await response.json();
  } catch {
    return { state: 'error', message: 'GitHub returned an unreadable firmware release response.' };
  }
  if (!isRecord(release)) {
    return { state: 'error', message: 'GitHub returned an invalid firmware release response.' };
  }

  const version = typeof release.tag_name === 'string'
    ? release.tag_name
    : typeof release.name === 'string'
      ? release.name
      : 'Latest release';
  const releaseUrl = typeof release.html_url === 'string' ? release.html_url : undefined;
  const assets = Array.isArray(release.assets) ? release.assets : [];
  const firmwareAsset = assets.find((asset) =>
    isRecord(asset) && typeof asset.name === 'string' &&
    asset.name.toLowerCase() === 'grid_macro_1_via.uf2'
  );

  if (!isRecord(firmwareAsset)) {
    return {
      state: 'none',
      version,
      releaseUrl,
      message: `Release ${version} does not include a Grid Macro 1 VIA UF2 firmware image.`,
    };
  }

  return {
    state: 'available',
    version,
    releaseUrl,
    firmwareUrl: typeof firmwareAsset.browser_download_url === 'string'
      ? firmwareAsset.browser_download_url
      : releaseUrl,
    message: `Firmware ${version} is published. This app cannot compare release tags with the device's VIA build ID automatically; flash the matching RP2040 UF2 manually.`,
  };
}

export function createAppSettingsTools(host?: SettingsHost): AppSettingsTools {
  const requireHost = (): SettingsHost => {
    if (host) return host;
    if (typeof window === 'undefined') throw new Error('Settings tools need a browser window');
    return window;
  };

  return {
    read: () => readAppSettings(requireHost()),
    save: (settings) => saveAppSettings(settings, requireHost()),
    getDesktop: async () => {
      const browser = requireHost();
      const getSettings = browser.electronAPI?.getAppSettings;
      if (!getSettings) return null;
      try {
        const result = await getSettings();
        if (result?.ok && result.settings) {
          const settings = saveAppSettings(result.settings, browser);
          return { ...result, settings: settings ?? normalizeAppSettings(result.settings) };
        }
        return result;
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    set: async (key, value) => {
      const browser = requireHost();
      if (key === 'allowDeviceNotifications' && value) {
        const notifications = browser.Notification;
        if (!notifications) {
          return { ok: false, error: 'This browser does not support device notifications' };
        }
        let permission = notifications.permission;
        if (permission === 'default') {
          try {
            permission = await notifications.requestPermission();
          } catch {
            permission = 'denied';
          }
        }
        if (permission !== 'granted') {
          return {
            ok: false,
            error: permission === 'denied'
              ? 'Notifications are blocked by the browser or operating system'
              : 'Notification permission was not granted',
          };
        }
      }

      const nativeUpdate = browser.electronAPI?.setAppSetting;
      if (nativeUpdate) {
        try {
          const result = await nativeUpdate(key, value);
          if (!result?.ok || !result.settings) return result;
          const settings = saveAppSettings(result.settings, browser);
          return { ...result, settings: settings ?? normalizeAppSettings(result.settings) };
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      if (key === 'launchAtStartup') {
        return {
          ok: false,
          error: 'Launch at startup is only available in the installed desktop app',
        };
      }
      const settings = saveAppSettings({ ...readAppSettings(browser), [key]: value }, browser);
      if (!settings) {
        return { ok: false, error: 'Could not save this preference in browser storage' };
      }
      return { ok: true, settings };
    },
    openSupport: (link) => openSupportLink(link, requireHost()),
    checkFirmware: async () => {
      const browser = requireHost();
      if (typeof browser.fetch !== 'function') {
        return { state: 'error', message: 'This environment cannot check GitHub firmware releases.' };
      }
      return checkLatestFirmwareRelease(browser.fetch.bind(browser));
    },
    flashFirmware: async () => {
      const browser = requireHost();
      const flash = browser.electronAPI?.flashFirmware;
      if (!flash) {
        return {
          ok: false,
          error: 'Firmware flashing requires the installed desktop app and an RP2040 in BOOTSEL mode',
        };
      }
      try {
        return await flash();
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronApi;
    nodeStudioAppSettings?: AppSettingsTools;
  }
}

if (typeof window !== 'undefined' && !window.nodeStudioAppSettings) {
  window.nodeStudioAppSettings = createAppSettingsTools(window);
}
