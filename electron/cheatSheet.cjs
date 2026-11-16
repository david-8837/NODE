'use strict';
const path = require('node:path');

/** Native, non-focusable and click-through HUD. All renderer-provided text is
 * rendered using textContent in the isolated overlay, never as HTML. */
function createCheatSheetController({ BrowserWindow, screen }) {
  let window = null;
  let ready = false;
  let visible = false;
  const holds = new Set();
  let snapshot = { layer: 1, available: false, keys: Array(9).fill('') };

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
      x: area.x + area.width - 294, y: area.y + 24, width: 270, height: 250,
      frame: false, transparent: true, resizable: false, movable: false,
      show: false, focusable: false, skipTaskbar: true, alwaysOnTop: true,
      hasShadow: false, webPreferences: {
        preload: path.join(__dirname, 'cheatSheetPreload.cjs'),
        contextIsolation: true, nodeIntegration: false, sandbox: true,
      },
    });
    window.setAlwaysOnTop(true, 'floating');
    window.setIgnoreMouseEvents(true);
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event) => event.preventDefault());
    window.webContents.once('did-finish-load', () => { ready = true; deliver(); syncVisibility(); });
    window.on('closed', () => { window = null; ready = false; visible = false; holds.clear(); });
    void window.loadFile(path.join(__dirname, 'cheatSheet.html'));
  }
  return {
    update(data) {
      if (!data || !Number.isInteger(data.layer) || data.layer < 1 || data.layer > 64 ||
          !Array.isArray(data.keys) || data.keys.length !== 9 || data.keys.some((key) => typeof key !== 'string')) return false;
      snapshot = { layer: data.layer, available: data.available !== false, keys: data.keys.map((key) => key.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 80)) };
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
