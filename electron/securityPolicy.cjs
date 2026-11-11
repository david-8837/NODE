'use strict';

const path = require('node:path');
const { fileURLToPath } = require('node:url');

const APP_PERMISSIONS = new Set(['hid', 'notifications', 'serial']);

function isTrustedAppUrl(rawUrl, expectedUrl, { packaged = false, platform = process.platform } = {}) {
  try {
    const requestedUrl = new URL(rawUrl);
    const appEntryUrl = new URL(expectedUrl);
    if (packaged) {
      if (requestedUrl.protocol !== 'file:' || appEntryUrl.protocol !== 'file:') return false;
      const requestedPath = path.resolve(fileURLToPath(requestedUrl));
      const expectedPath = path.resolve(fileURLToPath(appEntryUrl));
      return platform === 'win32'
        ? requestedPath.toLowerCase() === expectedPath.toLowerCase()
        : requestedPath === expectedPath;
    }
    return requestedUrl.origin === appEntryUrl.origin && requestedUrl.pathname === appEntryUrl.pathname;
  } catch {
    return false;
  }
}

function isAllowedHardwareOrigin(origin, { packaged = false, devServerUrl } = {}) {
  if (typeof origin !== 'string') return false;
  if (packaged) {
    if (origin === 'null') return true;
    try {
      const url = new URL(origin);
      return url.protocol === 'file:' && url.hostname === '' && !url.username && !url.password;
    } catch {
      return false;
    }
  }

  try {
    return typeof devServerUrl === 'string' && origin === new URL(devServerUrl).origin;
  } catch {
    return false;
  }
}

function isTrustedAppFrame(frame, expectedUrl, options) {
  return Boolean(
    frame &&
    frame.parent === null &&
    isTrustedAppUrl(frame.url, expectedUrl, options)
  );
}

function canGrantAppPermissionRequest({
  webContentsIsMainWindow,
  permission,
  requestingUrl,
  isMainFrame,
}, expectedUrl, options) {
  return Boolean(
    webContentsIsMainWindow === true &&
    isMainFrame === true &&
    APP_PERMISSIONS.has(permission) &&
    isTrustedAppUrl(requestingUrl, expectedUrl, options)
  );
}

function canGrantAppPermissionCheck({
  webContentsIsMainWindow,
  permission,
  requestingUrl,
  requestingOrigin,
  securityOrigin,
  isMainFrame,
}, expectedUrl, options) {
  const permissionOrigin = securityOrigin || requestingOrigin;
  return Boolean(
    webContentsIsMainWindow === true &&
    isMainFrame === true &&
    APP_PERMISSIONS.has(permission) &&
    isTrustedAppUrl(requestingUrl, expectedUrl, options) &&
    isAllowedHardwareOrigin(permissionOrigin, options)
  );
}

function getAllowedExternalNavigationUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

module.exports = {
  APP_PERMISSIONS,
  canGrantAppPermissionCheck,
  canGrantAppPermissionRequest,
  getAllowedExternalNavigationUrl,
  isAllowedHardwareOrigin,
  isTrustedAppFrame,
  isTrustedAppUrl,
};
