import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { fallbackIconForAssignment, overlayIconFor, overlayIconForAssignment } from '../src/cheatSheetIcons';

describe('standalone cheat sheet', () => {
  it('converts existing app icons into drawing primitives and leaves missing icons empty', () => {
    const icon = overlayIconFor('globe');
    expect(icon?.viewBox).toBe('0 0 16 16');
    expect(icon?.shapes.some(shape => shape.tag === 'circle')).toBe(true);
    expect(overlayIconFor(undefined)).toBeNull();
    expect(overlayIconFor('num-4')).toBeNull();
    expect(overlayIconFor('not-a-real-icon')).toBeNull();
  });
  it('uses visual fallbacks for missing icons without changing assignments', () => {
    expect(fallbackIconForAssignment({ binding: 'Copy', label: 'Copy' })).toBe('copy-plus');
    expect(fallbackIconForAssignment({ binding: 'A', label: 'A' })).toBe('grid-four');
    expect(fallbackIconForAssignment(undefined)).toBe('empty');
    expect(overlayIconForAssignment(undefined).shapes[0].attrs.r).toBe('1.5');
  });
  it('shows home-screen labels safely alongside icons and placeholders', () => {
    const dom = new JSDOM(readFileSync('electron/cheatSheet.html', 'utf8'), { runScripts: 'outside-only' });
    let update: (data: unknown) => void = () => {};
    (dom.window as any).cheatSheet = { onUpdate: (callback: typeof update) => { update = callback; } };
    dom.window.eval(readFileSync('electron/cheatSheet.js', 'utf8'));
    update({ activeLayer: 0, pressed: 0, layers: [{ keys: [{ icon: overlayIconFor('globe'), label: '<img src=x>' }, ...Array.from({ length: 8 }, () => ({ icon: overlayIconForAssignment(undefined), label: '' }))] }] });
    expect(dom.window.document.querySelectorAll('#keys .key')).toHaveLength(9);
    expect(dom.window.document.querySelectorAll('#keys svg')).toHaveLength(9);
    expect(dom.window.document.querySelector('.key.pressed svg circle')).not.toBeNull();
    expect(dom.window.document.querySelector('.label')?.textContent).toBe('<img src=x>');
    expect(dom.window.document.querySelector('#keys img')).toBeNull();
    expect(dom.window.document.querySelector('#keys .key:nth-child(2) circle')?.getAttribute('r')).toBe('1.5');
    dom.window.close();
  });
  it('uses a separate click-through sandboxed transparent window without focusing the configurator', () => {
    const main = readFileSync('electron/main.cjs', 'utf8');
    const overlay = main.slice(main.indexOf('function ensureCheatSheetWindow()'), main.indexOf("ipcMain.handle('window-is-maximized'"));
    expect(overlay).toContain('transparent: true');
    expect(overlay).toContain('sandbox: true');
    expect(overlay).toContain('window.showInactive()');
    expect(overlay).toContain('setIgnoreMouseEvents(true');
    expect(overlay).not.toContain('mainWindow.focus()');
    expect(overlay).toContain('event.sender !== cheatSheetWindow.webContents');
    expect(readFileSync('electron/cheatSheet.css', 'utf8')).not.toContain('background:rgba');
  });
});
