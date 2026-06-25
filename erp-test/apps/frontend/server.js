/**
 * Erp Test — zero-build static frontend server.
 *
 * Serves apps/frontend/public/ on :3000 and proxies /api/* to the
 * backend on :4001.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PORT = Number(process.env.PORT || 3000);
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4001';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon'
};

async function serveStatic(req, res) {
  let rel = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  if (rel.startsWith('/api/')) return proxyApi(req, res);
  const file = path.join(PUBLIC_DIR, rel);
  try {
    const body = await fs.readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('Not Found');
  }
}

async function proxyApi(req, res) {
  const url = BACKEND + req.url;
  const headers = { 'content-type': req.headers['content-type'] || 'application/json' };
  const opts = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    opts.body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
  try {
    const upstream = await fetch(url, opts);
    const body = await upstream.text();
    res.writeHead(upstream.status, { 'content-type': upstream.headers.get('content-type') || 'application/json' });
    res.end(body);
  } catch (e) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'upstream error: ' + e.message }));
  }
}

http.createServer(serveStatic).listen(PORT, () => {
  console.log('[erp-test-frontend] http://localhost:' + PORT);
});
