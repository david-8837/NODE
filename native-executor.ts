import { createRequire } from 'node:module';
import path from 'node:path';

export interface DesktopActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export interface DesktopExecutorOptions {
  allowTerminal?: boolean;
  commandConsent?: boolean;
}

export interface NativeActionExecutor {
  execute: (payload: Record<string, unknown>, options?: DesktopExecutorOptions) => Promise<DesktopActionResult>;
  setSimulationEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean; error?: string }>;
  close: () => Promise<void>;
}

const requireFromRepository = createRequire(path.resolve(process.cwd(), 'package.json'));
const desktopExecution = requireFromRepository(
  path.resolve(process.cwd(), 'electron/desktopExecution.cjs')
) as {
  createDesktopActionExecutor: (options?: Record<string, unknown>) => NativeActionExecutor;
  createWindowsInputAdapter: (options?: Record<string, unknown>) => unknown;
  parseShortcutToVK: (shortcut: string) => number[];
  parseKeyCombo: (shortcut: string) => { ok: boolean; keys?: unknown[]; error?: string };
  normalizePayload: (payload: unknown) => Record<string, unknown>;
  resolveApplicationPath: (value: string, options?: Record<string, unknown>) => string;
  validateUrl: (value: string) => string;
};

const defaultExecutor = desktopExecution.createDesktopActionExecutor();

/** Delegate to the same guarded native executor used by the Electron main process. */
export function executeNativeAction(
  payload: Record<string, unknown>,
  options: DesktopExecutorOptions = {}
): Promise<DesktopActionResult> {
  return defaultExecutor.execute(payload, options);
}

/** Simulation starts disabled and must be explicitly enabled by the trusted local UI. */
export function setNativeSimulationEnabled(enabled: boolean) {
  return defaultExecutor.setSimulationEnabled(enabled);
}

export function closeNativeActionExecutor(): Promise<void> {
  return defaultExecutor.close();
}

export function createDesktopActionExecutor(
  options: Record<string, unknown> = {}
): NativeActionExecutor {
  return desktopExecution.createDesktopActionExecutor(options);
}

export function createWindowsInputAdapter(options: Record<string, unknown> = {}) {
  return desktopExecution.createWindowsInputAdapter(options);
}

export function parseShortcutToVK(shortcut: string): number[] {
  return desktopExecution.parseShortcutToVK(shortcut);
}

export function parseKeyCombo(shortcut: string) {
  return desktopExecution.parseKeyCombo(shortcut);
}

export function normalizeNativePayload(payload: unknown) {
  return desktopExecution.normalizePayload(payload);
}

export function resolveNativeApplicationPath(value: string, options: Record<string, unknown> = {}) {
  return desktopExecution.resolveApplicationPath(value, options);
}

export function validateNativeUrl(value: string): string {
  return desktopExecution.validateUrl(value);
}
