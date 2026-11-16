import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { cheatSheetSnapshot, createCheatSheetTriggerHandler } from '../src/cheatSheet';
import { buildViaConfiguration } from '../src/qmkProfileSync';
import { actionToViaKeycode } from '../src/qmkViaBridge';
import { triggerSimulationAction } from '../src/actionExecution';
const { createCheatSheetController } = createRequire(import.meta.url)('../electron/cheatSheet.cjs');

class FakeWebContents extends EventEmitter {
  sent: unknown[] = [];
  send(...args: unknown[]) { this.sent.push(args); }
  setWindowOpenHandler(_fn: unknown) {}
}
class FakeWindow extends EventEmitter {
  static instance: FakeWindow;
  webContents = new FakeWebContents();
  options: Record<string, unknown>;
  showing = false;
  destroyed = false;
  ignored = false;
  top: unknown[] = [];
  shape: Array<{x: number; y: number; width: number; height: number}> = [];
  loadOptions: unknown;
  constructor(options: Record<string, unknown>) { super(); this.options = options; FakeWindow.instance = this; }
  isDestroyed() { return this.destroyed; }
  setAlwaysOnTop(...args: unknown[]) { this.top = args; }
  setIgnoreMouseEvents(value: boolean) { this.ignored = value; }
  setShape(shape: Array<{x: number; y: number; width: number; height: number}>) { this.shape = shape; }
  showInactive() { this.showing = true; }
  hide() { this.showing = false; }
  loadFile(_path: string, options: unknown) { this.loadOptions = options; return Promise.resolve(); }
  destroy() { this.destroyed = true; this.emit('closed'); }
}
function harness(platform = 'linux', release = '0.0.0') {
  return createCheatSheetController({ BrowserWindow: FakeWindow, platform, release, screen: { getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) } });
}
const bindings = ['Show Cheat-Sheet', 'Show Cheat-Sheet Hold', 'Hide Cheat-Sheet', 'Toggle Cheat-Sheet'];

describe('Cheat-Sheet hardware path', () => {
  it('compiles all four buttons and encoder directions to press/release host triggers', () => {
    for (const binding of bindings) {
      const entry = { binding, actionType: 'Basic input' };
      const result = buildViaConfiguration({ layers: [{ r1c1: entry, 'dial-tl': { encoderActions: { cw: entry, press: entry, ccw: entry } } }] }, 'win', { enableHostTriggers: true });
      expect(result.warnings).toEqual([]);
      expect(actionToViaKeycode(result.config.layers[0].keys!.r1c1)).toBe(0x7e00);
      for (const [index, direction] of ['cw', 'press', 'ccw'].entries()) {
        expect(actionToViaKeycode(result.config.layers[0].enc![direction])).toBe(0x7e09 + index);
      }
    }
  });
  it('preserves changed desktop metadata even when host-trigger keycodes do not change', () => {
    const show = { layers: [{ r1c1: { binding: 'Show Cheat-Sheet', actionType: 'Basic input' } }] };
    const hide = { layers: [{ r1c1: { binding: 'Hide Cheat-Sheet', actionType: 'Basic input' } }] };
    expect(buildViaConfiguration(show, 'win', { enableHostTriggers: true }).config)
      .toEqual(buildViaConfiguration(hide, 'win', { enableHostTriggers: true }).config);
    expect(cheatSheetSnapshot(show, 0).keys[0]).toBe('Show Cheat-Sheet');
    expect(cheatSheetSnapshot(hide, 0).keys[0]).toBe('Hide Cheat-Sheet');
    const source = readFileSync('src/App.tsx', 'utf8');
    expect(source).toMatch(/configKey === lastSyncedConfigKeyRef\.current\) \{[\s\S]*?syncedCheatProfilesRef\.current\[activeProfileIndex\] = currentProfile/);
  });
  it('pairs holds with their original physical slot through profile and layer changes', () => {
    const send = vi.fn();
    const handler = createCheatSheetTriggerHandler(send);
    expect(handler.handle('r1c1', true, 'Show Cheat-Sheet Hold')).toBe(true);
    handler.handle('r1c1', true, 'Show Cheat-Sheet Hold');
    expect(send).toHaveBeenCalledTimes(1);
    expect(handler.handle('r1c1', false, 'unrelated replacement')).toBe(true);
    expect(send.mock.calls).toEqual([['hold-start', 'r1c1'], ['hold-end', 'r1c1']]);
    handler.handle('r1c2', true, 'Show Cheat-Sheet Hold');
    handler.cancel();
    expect(send).toHaveBeenLastCalledWith('cancel-holds');
  });
  it('dispatches show, hide and toggle exactly once on keydown', () => {
    const send = vi.fn(); const handler = createCheatSheetTriggerHandler(send);
    for (const binding of [bindings[0], bindings[2], bindings[3]]) {
      expect(handler.handle('r1c1', true, binding)).toBe(true);
      expect(handler.handle('r1c1', false, binding)).toBe(true);
    }
    expect(send.mock.calls).toEqual([['show', 'r1c1'], ['hide', 'r1c1'], ['toggle', 'r1c1']]);
  });
  it('uses real row-major layer data, useful labels, and blanks for nonexistent layers', () => {
    const profile = { layers: [
      { r1c1: { binding: 'Ctrl + C' }, r1c3: { binding: 'blank' }, r2c2: { binding: 'volume +', label: 'vol+' } },
      { r1c1: { binding: 'launch', execution: { kind: 'smart', actionType: 'App', value: 'Notepad' } }, r3c3: { binding: 'Text: secret', label: 'Greeting', execution: { kind: 'smart', actionType: 'Text', value: 'secret' } } },
    ] };
    expect(cheatSheetSnapshot(profile, 0)).toMatchObject({ layer: 1, available: true, keys: ['Ctrl + C', '', '', '', 'volume +', '', '', '', ''] });
    expect(cheatSheetSnapshot(profile, 1)).toMatchObject({ layer: 2, available: true, keys: ['Notepad', '', '', '', '', '', '', '', 'Greeting'] });
    expect(cheatSheetSnapshot(profile, 3).keys).toEqual(Array(9).fill(''));
  });
  it('reads dial left, press and right bindings from each active layer', () => {
    const profile = { layers: [
      { 'dial-tl': { encoderActions: {
        ccw: { binding: 'volume -', label: 'vol-' },
        press: { binding: 'mute' },
        cw: { binding: 'volume +' },
      } } },
      { 'dial-tl': { encoderActions: {
        ccw: { binding: 'Ctrl + Z', execution: { kind: 'shortcut', value: 'Ctrl + Z' } },
        press: { binding: 'blank' },
        cw: { binding: 'next track' },
      } } },
    ] };
    expect(cheatSheetSnapshot(profile, 0).encoder).toEqual({ ccw: 'volume -', press: 'mute', cw: 'volume +' });
    expect(cheatSheetSnapshot(profile, 1).encoder).toEqual({ ccw: 'Ctrl + Z', press: '', cw: 'next track' });
    expect(cheatSheetSnapshot(profile, 2).encoder).toEqual({ ccw: '', press: '', cw: '' });
    expect(cheatSheetSnapshot(undefined, 0).encoder).toEqual({ ccw: '', press: '', cw: '' });
  });
  it('routes simulation to HUD rather than native key injection', () => {
    const commandCheatSheet = vi.fn().mockResolvedValue(true);
    const host = { electronAPI: { commandCheatSheet } } as unknown as Window & typeof globalThis;
    triggerSimulationAction({ binding: 'Toggle Cheat-Sheet' }, vi.fn(), vi.fn(), host);
    expect(commandCheatSheet).toHaveBeenCalledWith('toggle');
  });
});

describe('HUD document', () => {
  it('keeps the glass styling neutral, translucent and arranged in a 3×3 grid', () => {
    const css = readFileSync('electron/cheatSheet.css', 'utf8');
    expect(css).toMatch(/background:\s*transparent/);
    expect(css).toContain('grid-template-columns: repeat(3, 1fr)');
    expect(css).toContain('grid-template-rows: repeat(3, 1fr)');
    expect(css).toContain('border-radius: 20px');
    expect(css).toContain('border-radius: 11px');
    expect(css).toContain('linear-gradient');
    for (const [, r, g, b] of css.matchAll(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),/g)) {
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
  });
  it('selects the native acrylic styling without changing the grid or labels', () => {
    const html = readFileSync('electron/cheatSheet.html', 'utf8');
    const script = readFileSync('electron/cheatSheetRenderer.js', 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.test/?material=acrylic' });
    (dom.window as unknown as { cheatSheet: unknown }).cheatSheet = { onData() {} };
    dom.window.eval(script);
    expect(dom.window.document.documentElement.classList.contains('native-acrylic')).toBe(true);
    expect(dom.window.document.querySelectorAll('.key')).toHaveLength(9);
    dom.window.close();
  });
  it('renders nine cells in source order and treats labels as plain text', () => {
    const html = readFileSync('electron/cheatSheet.html', 'utf8');
    const script = readFileSync('electron/cheatSheetRenderer.js', 'utf8');
    const dom = new JSDOM(html, { runScripts: 'outside-only' });
    let update!: (data: { layer: number; keys: string[]; encoder?: { ccw: string; press: string; cw: string } }) => void;
    (dom.window as unknown as { cheatSheet: unknown }).cheatSheet = { onData: (fn: typeof update) => { update = fn; } };
    dom.window.eval(script);
    const labels = ['<img src=x onerror=alert(1)>', ...Array.from({ length: 8 }, (_, i) => `Key ${i + 2}`)];
    update({ layer: 3, keys: labels, encoder: { ccw: '<img>', press: 'Mute', cw: 'Volume Up' } });
    expect(dom.window.document.querySelector('#dial-ccw')?.textContent).toBe('<img>');
    expect(dom.window.document.querySelector('#dial-ccw')?.children.length).toBe(0);
    expect(dom.window.document.querySelector('#dial-press')?.textContent).toBe('Mute');
    expect(dom.window.document.querySelector('#dial-cw')?.textContent).toBe('Volume Up');
    const cells = [...dom.window.document.querySelectorAll('.key')];
    expect(cells.map((cell) => cell.textContent)).toEqual(labels);
    expect(cells[0].children.length).toBe(0);
    expect(dom.window.document.querySelector('#layer')?.textContent).toBe('LAYER 3');
    dom.window.close();
  });
});

describe('native HUD controller (mock Electron)', () => {
  it('uses acrylic on Windows 11 22H2+ with a rounded native shape', () => {
    const hud = harness('win32', '10.0.22621');
    hud.update({ layer: 1, keys: Array(9).fill('') });
    const win = FakeWindow.instance;
    expect(win.options).toMatchObject({ backgroundMaterial: 'acrylic', transparent: true, focusable: false });
    expect(win.loadOptions).toEqual({ query: { material: 'acrylic' } });
    expect(win.shape).toHaveLength(41);
    expect(win.shape[0].x).toBeGreaterThan(0);
    expect(win.shape.at(-1)).toEqual({ x: 0, y: 20, width: 270, height: 280 });
    expect(win.ignored).toBe(true);
    hud.destroy();
  });
  it('uses a translucent fallback on older Windows without requesting acrylic', () => {
    const hud = harness('win32', '10.0.19045');
    hud.update({ layer: 1, keys: Array(9).fill('') });
    const win = FakeWindow.instance;
    expect(win.options).not.toHaveProperty('backgroundMaterial');
    expect(win.loadOptions).toEqual({ query: { material: 'fallback' } });
    expect(win.shape).toEqual([]);
    hud.destroy();
  });
  it('creates a non-focusable click-through always-on-top window and updates it after load', () => {
    const hud = harness();
    expect(hud.update({ layer: 2, keys: ['<script>', ...Array(8).fill('')] })).toBe(true);
    const win = FakeWindow.instance;
    expect(win.options).toMatchObject({ frame: false, focusable: false, skipTaskbar: true, alwaysOnTop: true, show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } });
    expect(win.ignored).toBe(true); expect(win.top).toEqual([true, 'floating']);
    hud.command('show'); expect(win.showing).toBe(false);
    win.webContents.emit('did-finish-load');
    expect(win.showing).toBe(true);
    expect(win.webContents.sent.at(-1)).toEqual(['cheat-sheet-data', { layer: 2, available: true, keys: ['<script>', ...Array(8).fill('')], encoder: { ccw: '', press: '', cw: '' } }]);
    hud.update({ layer: 3, keys: Array(9).fill('Layer 3') });
    expect(win.webContents.sent.at(-1)).toEqual(['cheat-sheet-data', { layer: 3, available: true, keys: Array(9).fill('Layer 3'), encoder: { ccw: '', press: '', cw: '' } }]);
    hud.destroy(); expect(win.destroyed).toBe(true);
  });
  it('drives the HUD from simulated firmware presses, releases and layer/profile snapshots', () => {
    const hud = harness();
    const p1 = { layers: [{ r1c1: { binding: 'A' } }, { r1c1: { binding: 'Ctrl + C' } }] };
    const p2 = { layers: [{ r1c1: { binding: 'volume +' } }] };
    hud.update(cheatSheetSnapshot(p1, 0));
    const win = FakeWindow.instance; win.webContents.emit('did-finish-load');
    const trigger = createCheatSheetTriggerHandler((command, token) => hud.command(command, token));
    trigger.handle('r1c2', true, 'Show Cheat-Sheet');
    expect(win.showing).toBe(true);
    hud.update(cheatSheetSnapshot(p1, 1));
    expect((win.webContents.sent.at(-1) as [string, { layer: number; keys: string[] }])[1]).toMatchObject({ layer: 2, keys: ['Ctrl + C', ...Array(8).fill('')] });
    hud.update(cheatSheetSnapshot(p2, 0));
    expect((win.webContents.sent.at(-1) as [string, { layer: number; keys: string[] }])[1].keys[0]).toBe('volume +');
    trigger.handle('r1c2', true, 'Hide Cheat-Sheet'); expect(win.showing).toBe(false);
    trigger.handle('r2c2', true, 'Show Cheat-Sheet Hold'); expect(win.showing).toBe(true);
    trigger.handle('r2c2', false, 'changed assignment'); expect(win.showing).toBe(false);
    trigger.handle('r2c2', true, 'Toggle Cheat-Sheet'); expect(win.showing).toBe(true);
    trigger.handle('r2c2', true, 'Toggle Cheat-Sheet'); expect(win.showing).toBe(false);
    hud.destroy();
  });
  it('handles repeated show, toggle, hide, overlapping holds and cancellation', () => {
    const hud = harness(); hud.update({ layer: 1, keys: Array(9).fill('') });
    const win = FakeWindow.instance; win.webContents.emit('did-finish-load');
    hud.command('show'); hud.command('show'); expect(win.showing).toBe(true);
    hud.command('toggle'); expect(win.showing).toBe(false);
    hud.command('toggle'); expect(win.showing).toBe(true);
    hud.command('hide'); expect(win.showing).toBe(false);
    hud.command('hold-start', 'a'); hud.command('hold-start', 'b'); expect(win.showing).toBe(true);
    hud.command('hold-end', 'a'); expect(win.showing).toBe(true);
    hud.command('hold-end', 'b'); expect(win.showing).toBe(false);
    hud.command('hold-start', 'a'); hud.command('cancel-holds'); expect(win.showing).toBe(false);
    expect(hud.command('bogus')).toBe(false);
    expect(hud.update({ layer: 1, keys: ['oops'] })).toBe(false);
    expect(hud.update({ layer: 1, keys: Array(9).fill(''), encoder: { ccw: 7, press: '', cw: '' } })).toBe(false);
    hud.destroy();
  });
});
