'use strict';
const path = require('node:path');
const os = require('node:os');

// Windows exposes the native translucent acrylic backdrop on 11 22H2+ only.
function supportsAcrylic(platform, release) {
  const parts = String(release).split('.').map(Number);
  return platform === 'win32' && Number.isInteger(parts[2]) && parts[2] >= 22621;
}

// Clip the native backdrop as well as the web content to the glass outline.
function roundedWindowShape(width, height, radius) {
  const rows = [];
  for (let y = 0; y < radius; y++) {
    const dy = radius - y - 0.5;
    const inset = Math.ceil(radius - Math.sqrt(radius * radius - dy * dy));
    rows.push({ x: inset, y, width: width - 2 * inset, height: 1 });
    rows.push({ x: inset, y: height - 1 - y, width: width - 2 * inset, height: 1 });
  }
  rows.push({ x: 0, y: radius, width, height: height - 2 * radius });
  return rows;
}

/** Native, non-focusable and click-through HUD. All renderer-provided text is
 * rendered using textContent in the isolated overlay, never as HTML. */
function createCheatSheetController({ BrowserWindow, screen, platform = process.platform, release = os.release() }) {
  const acrylic = supportsAcrylic(platform, release);
  let window = null;
  let ready = false;
  let visible = false;
  const holds = new Set();
  let snapshot = { layer: 1, available: false, keys: Array(9).fill(''), encoder: { ccw: '', press: '', cw: '' } };

  function deliver() {
    if (window && !window.isDestroyed() && ready) window.webContents.send('cheat-sheet-data', snapshot);
  }
  function syncVisibility() {
    if (!window || window.isDestroyed() || !ready) return;
    if (visible || holds.size) window.showInactive();
    else window.hide();
  }
  function ensure() {
    if (window && !window.isDestroyed()) return;
    const area = screen.getPrimaryDisplay().workArea;
    window = new BrowserWindow({
      x: area.x + area.width - 344, y: area.y + 24, width: 320, height: 412,
      frame: false, transparent: true, resizable: false, movable: false,
      ...(acrylic ? { backgroundMaterial: 'acrylic' } : {}),
      show: false, focusable: false, skipTaskbar: true, alwaysOnTop: true,
      hasShadow: false, webPreferences: {
        preload: path.join(__dirname, 'cheatSheetPreload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
      },
    });
    if (acrylic && typeof window.setShape === 'function') {
      try { window.setShape(roundedWindowShape(320, 412, 36)); } catch {
        // Keep the HUD functional if the native shape is unavailable.
      }
    }
    window.setAlwaysOnTop(true, 'floating');
    window.setIgnoreMouseEvents(true);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.once('did-finish-load', () => { ready = true; deliver(); syncVisibility(); });
    window.on('closed', () => { window = null; ready = false; visible = false; holds.clear(); });
    void window.loadFile(path.join(__dirname, 'cheatSheet.html'), { query: { material: acrylic ? 'acrylic' : 'fallback' } });
  }
  return {
    update(data) {
      if (!data || !Number.isInteger(data.layer) || data.layer < 1 || data.layer > 64 ||
          !Array.isArray(data.keys) || data.keys.length !== 9 || data.keys.some((key) => typeof key !== 'string')) return false;
      const encoder = data.encoder ?? { ccw: '', press: '', cw: '' };
      if (!encoder || typeof encoder !== 'object' || ['ccw', 'press', 'cw'].some((key) => typeof encoder[key] !== 'string')) return false;
      const clean = (value) => value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 80);
      snapshot = {
        layer: data.layer,
        available: data.available !== false,
        keys: data.keys.map(clean),
        encoder: { ccw: clean(encoder.ccw), press: clean(encoder.press), cw: clean(encoder.cw) },
      };
      ensure();
      deliver();
      return true;
    },
    command(command, token) {
      switch (command) {
        case 'show': visible = true; break;
        case 'hide': visible = false; holds.clear(); break;
        case 'toggle': if (visible || holds.size) { visible = false; holds.clear(); } else visible = true; break;
        case 'hold-start': if (typeof token !== 'string' || token.length > 40 || !token) return false; visible = false; holds.add(token); break;
        case 'hold-end': if (typeof token !== 'string') return false; holds.delete(token); break;
        case 'cancel-holds': holds.clear(); break;
        default: return false;
      }
      ensure();
      syncVisibility();
      return true;
    },
    destroy() { if (window && !window.isDestroyed()) window.destroy(); window = null; ready = false; holds.clear(); visible = false; },
  };
}
module.exports = { createCheatSheetController };
