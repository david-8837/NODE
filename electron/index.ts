/**
 * TypeScript Entry Point and Type-Safe Facade for NODE studio Electron
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import type {
  AppSettings,
  AppSettingKey,
  InstalledApplication,
  InstalledApplicationsResult,
  NativeSettingsResult,
  AppOperationResult,
  NativeActionResult,
  SimulationToggleResult,
  ElectronApi,
  CheatSheetCommand,
  CheatSheetEncoder,
  CheatSheetSnapshot,
  ActionPayload,
  ExecuteActionResult,
} from './types';

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
  CheatSheetCommand,
  CheatSheetEncoder,
  CheatSheetSnapshot,
  ActionPayload,
  ExecuteActionResult,
};

export interface Uf2ValidationResult {
  ok: boolean;
  blockCount?: number;
  byteLength?: number;
  error?: string;
}

export interface DesktopExecutorOptions {
  allowTerminal?: boolean;
  commandConsent?: boolean;
  openExternal?: (url: string) => Promise<boolean>;
  openApplicationShortcut?: (shortcutPath: string) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export interface DesktopActionExecutor {
  execute: (payload: Record<string, unknown>, options?: DesktopExecutorOptions) => Promise<NativeActionResult>;
  setSimulationEnabled: (enabled: boolean) => Promise<SimulationToggleResult>;
  close: () => Promise<void>;
}

export interface InstalledApplicationsOptions {
  env?: NodeJS.ProcessEnv;
  fsModule?: typeof import('node:fs');
  pathApi?: typeof path.win32;
  roots?: string[];
}

export interface UserDataMigrationOptions {
  currentUserDataDir: string;
  appDataDir: string;
  platform?: string;
  fsImpl?: typeof import('node:fs');
}

export interface UserDataMigrationResult {
  migrated: boolean;
  sourceDir?: string;
  filesCopied?: number;
  error?: string;
}

export interface CheatSheetController {
  ensure: () => void;
  update: (snapshot: CheatSheetSnapshot) => void;
  command: (command: CheatSheetCommand, token?: string) => void;
  destroy: () => void;
}

const requireFromRepo = createRequire(path.resolve(process.cwd(), 'package.json'));

/**
 * Type-safe access to the RP2040 UF2 firmware image validator.
 */
export function getUf2Validator(): {
  MAX_UF2_BYTES: number;
  validateRp2040Uf2: (data: Buffer | Uint8Array) => Uf2ValidationResult;
} {
  return requireFromRepo(path.resolve(process.cwd(), 'electron/uf2Validator.cjs')) as {
    MAX_UF2_BYTES: number;
    validateRp2040Uf2: (data: Buffer | Uint8Array) => Uf2ValidationResult;
  };
}

/**
 * Type-safe factory for the desktop action executor.
 */
export function getDesktopActionExecutor(options?: DesktopExecutorOptions): DesktopActionExecutor {
  const mod = requireFromRepo(path.resolve(process.cwd(), 'electron/desktopExecution.cjs')) as {
    createDesktopActionExecutor: (options?: DesktopExecutorOptions) => DesktopActionExecutor;
  };
  return mod.createDesktopActionExecutor(options);
}

/**
 * Type-safe Windows installed application scanner.
 */
export function scanInstalledApplications(options: InstalledApplicationsOptions = {}): InstalledApplication[] {
  const mod = requireFromRepo(path.resolve(process.cwd(), 'electron/installedApplications.cjs')) as {
    listInstalledApplications: (options: InstalledApplicationsOptions) => InstalledApplication[];
  };
  return mod.listInstalledApplications(options);
}

/**
 * Type-safe user data migration handler.
 */
export function runUserDataMigration(options: UserDataMigrationOptions): UserDataMigrationResult {
  const mod = requireFromRepo(path.resolve(process.cwd(), 'electron/userDataMigration.cjs')) as {
    migrateLegacyUserData: (options: UserDataMigrationOptions) => UserDataMigrationResult;
  };
  return mod.migrateLegacyUserData(options);
}
