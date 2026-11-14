import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  canGrantAppPermissionCheck,
  canGrantAppPermissionRequest,
  getAllowedExternalNavigationUrl,
  isAllowedHardwareOrigin,
  isTrustedAppFrame,
  isTrustedAppUrl,
} = require('../electron/securityPolicy.cjs') as {
  canGrantAppPermissionCheck: (request: Record<string, unknown>, entry: string, context: Record<string, unknown>) => boolean;
  canGrantAppPermissionRequest: (request: Record<string, unknown>, entry: string, context: Record<string, unknown>) => boolean;
  getAllowedExternalNavigationUrl: (url: string) => string | null;
  isAllowedHardwareOrigin: (origin: string, context: Record<string, unknown>) => boolean;
  isTrustedAppFrame: (frame: Record<string, unknown>, entry: string, context: Record<string, unknown>) => boolean;
  isTrustedAppUrl: (url: string, entry: string, context: Record<string, unknown>) => boolean;
};

const devEntry = 'http://localhost:5173/';
const devContext = { packaged: false, platform: 'linux', devServerUrl: devEntry };
const packagedEntry = 'file:///C:/Program%20Files/NODE%20Studio/dist/index.html';
const packagedWindows = { packaged: true, platform: 'win32' };

describe('Electron renderer and permission policy', () => {
  it('trusts only the exact development app origin and entry path', () => {
    expect(isTrustedAppUrl('http://localhost:5173/', devEntry, devContext)).toBe(true);
    expect(isTrustedAppUrl('http://localhost:5173/?hot=1', devEntry, devContext)).toBe(true);
    expect(isTrustedAppUrl('http://localhost:5173/other', devEntry, devContext)).toBe(false);
    expect(isTrustedAppUrl('http://localhost.evil.test:5173/', devEntry, devContext)).toBe(false);
    expect(isTrustedAppUrl('http://localhost:5174/', devEntry, devContext)).toBe(false);
    expect(isTrustedAppUrl('https://localhost:5173/', devEntry, devContext)).toBe(false);
  });

  it('matches the exact packaged entry path and handles Windows casing without trusting siblings', () => {
    expect(isTrustedAppUrl(
      'file:///c:/program%20files/node%20studio/dist/INDEX.html',
      packagedEntry,
      packagedWindows,
    )).toBe(true);
    expect(isTrustedAppUrl(
      'file:///C:/Program%20Files/NODE%20Studio/dist/other.html',
      packagedEntry,
      packagedWindows,
    )).toBe(false);
    expect(isTrustedAppUrl('https://github.com/', packagedEntry, packagedWindows)).toBe(false);
    expect(isTrustedAppUrl(
      'file:///Applications/NODE%20Studio/dist/index.html',
      'file:///Applications/NODE%20Studio/dist/index.html',
      { packaged: true, platform: 'darwin' },
    )).toBe(true);
  });

  it('limits device origins to the packaged file app or exact localhost dev origin', () => {
    expect(isAllowedHardwareOrigin('null', packagedWindows)).toBe(true);
    expect(isAllowedHardwareOrigin('file://', packagedWindows)).toBe(true);
    expect(isAllowedHardwareOrigin('file:///C:/app/index.html', packagedWindows)).toBe(true);
    expect(isAllowedHardwareOrigin('file://evil.example/', packagedWindows)).toBe(false);
    expect(isAllowedHardwareOrigin('https://github.com', packagedWindows)).toBe(false);
    expect(isAllowedHardwareOrigin('http://localhost:5173', devContext)).toBe(true);
    expect(isAllowedHardwareOrigin('http://localhost:5174', devContext)).toBe(false);
    expect(isAllowedHardwareOrigin('https://localhost:5173', devContext)).toBe(false);
  });

  it('requires the exact trusted main frame and limits permissions to app needs', () => {
    expect(isTrustedAppFrame({ url: packagedEntry, parent: null }, packagedEntry, packagedWindows)).toBe(true);
    expect(isTrustedAppFrame({ url: packagedEntry, parent: {} }, packagedEntry, packagedWindows)).toBe(false);
    expect(isTrustedAppFrame({ url: 'https://evil.test/', parent: null }, packagedEntry, packagedWindows)).toBe(false);

    const trustedRequest = {
      webContentsIsMainWindow: true,
      isMainFrame: true,
      requestingUrl: packagedEntry,
      permission: 'hid',
    };
    expect(canGrantAppPermissionRequest(trustedRequest, packagedEntry, packagedWindows)).toBe(true);
    expect(canGrantAppPermissionRequest({ ...trustedRequest, permission: 'notifications' }, packagedEntry, packagedWindows)).toBe(true);
    expect(canGrantAppPermissionRequest({ ...trustedRequest, permission: 'geolocation' }, packagedEntry, packagedWindows)).toBe(false);
    expect(canGrantAppPermissionRequest({ ...trustedRequest, isMainFrame: false }, packagedEntry, packagedWindows)).toBe(false);
    expect(canGrantAppPermissionRequest({ ...trustedRequest, webContentsIsMainWindow: false }, packagedEntry, packagedWindows)).toBe(false);
  });

  it('requires trusted URL, main frame, owner window, and origin for permission checks', () => {
    const trustedCheck = {
      webContentsIsMainWindow: true,
      isMainFrame: true,
      requestingUrl: packagedEntry,
      requestingOrigin: 'null',
      securityOrigin: 'file://',
      permission: 'serial',
    };
    expect(canGrantAppPermissionCheck(trustedCheck, packagedEntry, packagedWindows)).toBe(true);
    expect(canGrantAppPermissionCheck({ ...trustedCheck, securityOrigin: 'https://evil.test' }, packagedEntry, packagedWindows)).toBe(false);
    expect(canGrantAppPermissionCheck({ ...trustedCheck, requestingUrl: 'file:///C:/app/other.html' }, packagedEntry, packagedWindows)).toBe(false);
    expect(canGrantAppPermissionCheck({ ...trustedCheck, isMainFrame: false }, packagedEntry, packagedWindows)).toBe(false);
    expect(canGrantAppPermissionCheck({ ...trustedCheck, permission: 'camera' }, packagedEntry, packagedWindows)).toBe(false);
  });

  it('opens only credential-free HTTPS navigation externally', () => {
    expect(getAllowedExternalNavigationUrl('https://github.com/david-8837/newww'))
      .toBe('https://github.com/david-8837/newww');
    expect(getAllowedExternalNavigationUrl('https://user:pass@github.com/')).toBeNull();
    expect(getAllowedExternalNavigationUrl('http://github.com/')).toBeNull();
    expect(getAllowedExternalNavigationUrl('javascript:alert(1)')).toBeNull();
    expect(getAllowedExternalNavigationUrl('file:///etc/passwd')).toBeNull();
  });
});
