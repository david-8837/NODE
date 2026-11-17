import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Electron & Web Security Hardening', () => {
  const htmlContent = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
  const mainSource = fs.readFileSync(path.join(process.cwd(), 'electron/main.cjs'), 'utf-8');

  it('enforces a strict Content-Security-Policy in index.html', () => {
    expect(htmlContent).toContain('http-equiv="Content-Security-Policy"');
    expect(htmlContent).toContain("default-src 'self' file:");
    expect(htmlContent).toContain("object-src 'none'");
    expect(htmlContent).toContain("base-uri 'self'");
    expect(htmlContent).toContain("connect-src 'self' file: http://localhost:* ws://localhost:*");
  });

  it('configures session CSP response headers in Electron main process', () => {
    expect(mainSource).toContain('ses.webRequest.onHeadersReceived');
    expect(mainSource).toContain("'Content-Security-Policy'");
    expect(mainSource).toContain("default-src 'self' file:");
    expect(mainSource).toContain("object-src 'none'");
  });

  it('enforces strict IPC input validation on cheat-sheet commands and renderer trust', () => {
    expect(mainSource).toContain("ipcMain.handle('cheat-sheet-command'");
    expect(mainSource).toContain("typeof command === 'string'");
    expect(mainSource).toContain("isTrustedRenderer(event)");
    expect(mainSource).toContain("typeof snapshot === 'object'");
  });

  it('validates external URLs and limits them exclusively to trusted GitHub domains', () => {
    expect(mainSource).toContain("function isAllowedExternalUrl(rawUrl)");
    expect(mainSource).toContain("host === 'github.com'");
    expect(mainSource).toContain("host === 'david-8837.github.io'");
  });
});
