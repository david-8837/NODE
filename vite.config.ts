import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, Plugin } from 'vite';
import { executeNativeAction } from './native-executor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

        // Security check: Validate Origin and Referer against Cross-Site Request Forgery (CSRF)
        const origin = (req.headers['origin'] || req.headers['referer'] || '') as string;
        if (origin) {
          const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(origin);
          if (!isLocalOrigin) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'Forbidden: Cross-Origin Request Blocked' }));
          }
        }

        let body = '';
        let bytesCount = 0;
        const MAX_BYTES = 32 * 1024; // 32 KB payload limit (DoS mitigation)

        req.on('data', (chunk: Buffer) => {
          bytesCount += chunk.length;
          if (bytesCount > MAX_BYTES) {
            req.destroy();
            res.statusCode = 413;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ success: false, error: 'Payload Too Large' }));
          }
          body += chunk;
        });

        req.on('end', async () => {
          if (res.writableEnded) return;
          try {
            const payload = JSON.parse(body || '{}');
            const result = await executeNativeAction(payload);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Malformed JSON payload: ' + err.message }));
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
      host: '127.0.0.1', // Security: bind to local loopback to avoid exposing API to LAN
      port: 5173,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
