import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import {
  closeNativeActionExecutor,
  executeNativeAction,
  setNativeSimulationEnabled,
} from './native-executor.ts';
import { isTrustedLocalNativeOrigin } from './src/nativeActionSecurity.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageVersion = (JSON.parse(
  readFileSync(path.join(__dirname, 'package.json'), 'utf8')
) as { version: string }).version;
const previewAllowedHosts = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? '';
const isArenaPreview =
  process.env.ARENA_PREVIEW === 'true' ||
  previewAllowedHosts.split(',').some((host) => host.trim().endsWith('.e2b.app'));

type JsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; status: number; error: string };

function sendJson(res: ServerResponse, status: number, value: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(value));
}

function readJsonBody(req: IncomingMessage, maxBytes = 32 * 1024): Promise<JsonBodyResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let byteCount = 0;
    let finished = false;
    const finish = (result: JsonBodyResult) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };

    req.on('data', (chunk: Buffer | string) => {
      if (finished) return;
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      byteCount += bufferChunk.length;
      if (byteCount > maxBytes) {
        finish({ ok: false, status: 413, error: 'Payload Too Large' });
        return;
      }
      chunks.push(bufferChunk);
    });

    req.on('error', () => finish({ ok: false, status: 400, error: 'Could not read request body' }));
    req.on('end', () => {
      if (finished) return;
      try {
        finish({ ok: true, value: JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') });
      } catch {
        finish({ ok: false, status: 400, error: 'Malformed JSON payload' });
      }
    });
  });
}

function isTrustedNativeRequest(req: IncomingMessage, isHostedPreview: boolean): boolean {
  const originHeader = req.headers['origin'] || req.headers['referer'];
  return isTrustedLocalNativeOrigin(originHeader, req.headers.host, isHostedPreview);
}

function nativeExecutionPlugin(): Plugin {
  return {
    name: 'native-executor-plugin',
    configureServer(server) {
      server.httpServer?.once('close', () => {
        void closeNativeActionExecutor();
      });

      server.middlewares.use('/api/simulation', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, enabled: false, error: 'Method Not Allowed' });
          return;
        }
        if (!isTrustedNativeRequest(req, isArenaPreview)) {
          sendJson(res, 403, { success: false, enabled: false, error: 'Native actions are unavailable from this origin' });
          return;
        }

        const body = await readJsonBody(req, 4 * 1024);
        if (!body.ok) {
          sendJson(res, body.status, { success: false, enabled: false, error: body.error });
          return;
        }
        if (
          body.value === null ||
          typeof body.value !== 'object' ||
          Array.isArray(body.value) ||
          typeof (body.value as Record<string, unknown>).enabled !== 'boolean'
        ) {
          sendJson(res, 400, { success: false, enabled: false, error: 'Simulation state must be a boolean' });
          return;
        }

        const result = await setNativeSimulationEnabled(
          (body.value as { enabled: boolean }).enabled
        );
        sendJson(res, result.success ? 200 : 409, result);
      });

      server.middlewares.use('/api/execute-action', async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { success: false, error: 'Method Not Allowed' });
          return;
        }
        // The native bridge is only for a same-origin local desktop session.
        // Hosted previews are explicitly denied even if clients forge loopback headers.
        if (!isTrustedNativeRequest(req, isArenaPreview)) {
          sendJson(res, 403, { success: false, error: 'Native actions are unavailable from this origin' });
          return;
        }

        const body = await readJsonBody(req, 512 * 1024);
        if (!body.ok) {
          sendJson(res, body.status, { success: false, error: body.error });
          return;
        }
        if (body.value === null || typeof body.value !== 'object' || Array.isArray(body.value)) {
          sendJson(res, 400, { success: false, error: 'Invalid action payload' });
          return;
        }

        const payload = body.value as Record<string, unknown>;
        const result = await executeNativeAction(payload, {
          allowTerminal: payload.allowTerminal === true,
          commandConsent: payload.commandConsent === true,
        });
        sendJson(res, result.success ? 200 : 400, result);
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // Keep production asset URLs relative so dist/index.html can be loaded by
    // Electron's file:// protocol as well as by a static web host.
    base: './',
    define: {
      __APP_VERSION__: JSON.stringify(packageVersion),
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'vendor', test: /node_modules/, priority: 10 },
            ],
          },
        },
      },
    },
    plugins: [react(), tailwindcss(), nativeExecutionPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: isArenaPreview ? '0.0.0.0' : '127.0.0.1',
      allowedHosts: isArenaPreview ? ['.e2b.app'] : undefined,
      port: 5173,
      strictPort: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
