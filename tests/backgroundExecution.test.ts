import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('background desktop execution configuration', () => {
  it('keeps the WebHID and gesture renderer unthrottled without weakening isolation', () => {
    const source = readFileSync('electron/main.cjs', 'utf8');
    const windowOptions = source.slice(source.indexOf('mainWindow = new BrowserWindow({'), source.indexOf('const ses = mainWindow.webContents.session'));
    expect(windowOptions).toContain('backgroundThrottling: false');
    expect(windowOptions).toContain('nodeIntegration: false');
    expect(windowOptions).toContain('contextIsolation: true');
    expect(windowOptions).toContain('sandbox: true');
    expect(source).toMatch(/mainWindow\.on\('close',[\s\S]*?mainWindow\.hide\(\)/);
  });
});
