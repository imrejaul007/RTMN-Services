/**
 * Frontend dev server — pure Node, no build step.
 * Serves apps/frontend/public on http://localhost:3000 and proxies
 * /api/* to the backend on http://localhost:4001.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const BACKEND = `http://localhost:${process.env.BACKEND_PORT || 4001}`;
const PORT = Number(process.env.FRONTEND_PORT || 3000);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      const opts = {
        method: req.method,
        headers: { 'content-type': req.headers['content-type'] || 'application/json' }
      };
      const target = BACKEND + url.pathname + url.search;
      const upstream = await import('node:http');
      const proxyReq = upstream.request(target, opts, proxyRes => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      });
      proxyReq.on('error', e => { res.writeHead(502); res.end(JSON.stringify({ error: e.message })); });
      req.pipe(proxyReq);
      return;
    }

    let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    let ext = path.extname(filePath);
    if (!ext) { filePath = path.join(filePath, 'index.html'); ext = '.html'; }
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    } else {
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end(String(err));
    }
  }
});

server.listen(PORT, () => console.log(`[{{PROJECT_NAME}}-frontend] listening on http://localhost:${PORT}`));
