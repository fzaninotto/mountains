import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const CAPTURE_DIR = join(process.cwd(), 'captures');

/**
 * En développement seulement : le mode #capture de l'application lit la liste des vues dans captures/views.json
 * (GET /__capture/views) et y enregistre chaque image rendue (POST /__capture/image?name=…).
 */
function captureSink(): Plugin {
  return {
    name: 'capture-sink',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture/views', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(readFileSync(join(CAPTURE_DIR, 'views.json')));
      });
      server.middlewares.use('/__capture/image', (req, res) => {
        const name = new URL(req.url ?? '', 'http://localhost').searchParams.get('name') ?? '';
        if (req.method !== 'POST' || !/^[\w-]+$/.test(name)) {
          res.statusCode = 400;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          mkdirSync(CAPTURE_DIR, { recursive: true });
          writeFileSync(join(CAPTURE_DIR, `${name}.png`), Buffer.concat(chunks));
          res.end('ok');
        });
      });
    },
  };
}

export default defineConfig({
  // Chemins relatifs : la page est servie sous /mountains/ sur GitHub Pages
  base: './',
  plugins: [captureSink()],
});
