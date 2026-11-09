import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { executeNativeAction } from './native-executor.ts';
import { isTrustedLocalNativeOrigin } from './src/nativeActionSecurity.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const previewAllowedHosts = process.env.__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS ?? '';
const isArenaPreview =
  process.env.ARENA_PREVIEW === 'true' ||
  previewAllowedHosts.split(',').some((host) => host.trim().endsWith('.e2b.app'));

function nativeExecutionPlugin(): Plugin {
  return {
    name: 'native-executor-plugin',
    configureServer(server) {
      server.middlewares.use('/api/execute-action', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Method Not Allowed' }));
        }

        // The native bridge is only for a same-origin local desktop session.
        // A hosted preview must never execute commands on its sandbox host.
        const originHeader = req.headers['origin'] || req.headers['referer'];
        if (
          !isTrustedLocalNativeOrigin(
            originHeader,
            req.headers.host,
            isArenaPreview
          )
        ) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Native actions are unavailable from this origin' }));
        }

        const chunks: Buffer[] = [];
        let bytesCount = 0;
        let payloadTooLarge = false;
        const MAX_BYTES = 32 * 1024;

        req.on('data', (chunk: Buffer | string) => {
          if (payloadTooLarge) return;
          const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytesCount += bufferChunk.length;
          if (bytesCount > MAX_BYTES) {
            payloadTooLarge = true;
            chunks.length = 0;
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.end(JSON.stringify({ success: false, error: 'Payload Too Large' }));
            return;
          }
          chunks.push(bufferChunk);
        });

        req.on('end', async () => {
          if (res.writableEnded || payloadTooLarge) return;
          try {
            const body = Buffer.concat(chunks).toString('utf8');
            const payload = JSON.parse(body || '{}');
            const result = await executeNativeAction(payload);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload' }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
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
