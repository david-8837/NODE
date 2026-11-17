/**
 * TypeScript Type Definitions for NODE studio Electron Main, Preload & Desktop Execution
 */

export type {
  AppSettings,
  AppSettingKey,
  InstalledApplication,
  InstalledApplicationsResult,
  NativeSettingsResult,
  AppOperationResult,
  NativeActionResult,
  SimulationToggleResult,
  ElectronApi,
} from '../src/appSettings';

export type {
  CheatSheetCommand,
  CheatSheetEncoder,
  CheatSheetSnapshot,
} from '../src/cheatSheet';

export interface ActionPayload {
  kind: 'shortcut' | 'sequence' | 'text' | 'command' | 'web' | 'app';
  value?: string;
  steps?: Array<{
    kind: 'key';
    key: string;
    mode?: 'press-release' | 'press' | 'release';
    delayAfterMs?: number;
  }>;
  [key: string]: unknown;
}

export interface ExecuteActionResult {
  success: boolean;
  message?: string;
  error?: string;
  simulation?: boolean;
}
