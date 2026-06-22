#!/usr/bin/env node

/**
 * Simple HTTP server for REZ API Documentation
 * Serves OpenAPI specs and Swagger UI
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const DOCS_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getContentType(ext) {
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = getContentType(ext);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
      }
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end(data);
  });
}

function serveDirIndex(res, dirPath) {
  const files = fs.readdirSync(dirPath);
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>REZ API Documentation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
    h1 { color: #6366f1; }
    ul { list-style: none; padding: 0; }
    li { padding: 10px; border-bottom: 1px solid #eee; }
    a { color: #6366f1; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px; }
    .yaml { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <h1>REZ API Documentation</h1>
  <p>OpenAPI 3.0 specifications for RTMN Services</p>
  <h2>API Specifications</h2>
  <ul>
    <li><a href="index.html">Swagger UI (Interactive Documentation)</a></li>
    <li><a href="index.yaml">index.yaml</a> <span class="badge yaml">Unified Spec</span></li>
    <li><a href="graphql-federation.yaml">graphql-federation.yaml</a> <span class="badge yaml">Port 5000</span></li>
    <li><a href="automl.yaml">automl.yaml</a> <span class="badge yaml">Port 5001</span></li>
    <li><a href="invoice-ocr.yaml">invoice-ocr.yaml</a> <span class="badge yaml">Port 5002</span></li>
    <li><a href="contracts.yaml">contracts.yaml</a> <span class="badge yaml">Port 5003</span></li>
    <li><a href="legal.yaml">legal.yaml</a> <span class="badge yaml">Port 5004</span></li>
    <li><a href="cosmic-twin.yaml">cosmic-twin.yaml</a> <span class="badge yaml">Port 5005</span></li>
    <li><a href="ranking.yaml">ranking.yaml</a> <span class="badge yaml">Port 5006</span></li>
  </ul>
  <h2>Services</h2>
  <table>
    <tr><th>Service</th><th>Port</th><th>Description</th></tr>
    <tr><td>GraphQL Federation</td><td>5000</td><td>GraphQL Gateway</td></tr>
    <tr><td>AutoML Pipeline</td><td>5001</td><td>ML Model Training</td></tr>
    <tr><td>Invoice OCR</td><td>5002</td><td>Invoice Processing</td></tr>
    <tr><td>Contract Management</td><td>5003</td><td>Contract Lifecycle</td></tr>
    <tr><td>Legal Document AI</td><td>5004</td><td>Legal Analysis</td></tr>
    <tr><td>Cosmic Twin</td><td>5005</td><td>Digital Twins</td></tr>
    <tr><td>Ranking Service</td><td>5006</td><td>ML Ranking</td></tr>
  </table>
</body>
</html>
  `;
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
}

const server = http.createServer((req, res) => {
  // Remove query strings and decode URI
  let urlPath = req.url.split('?')[0];
  urlPath = decodeURIComponent(urlPath);

  // Default to index.html
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  const filePath = path.join(DOCS_DIR, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DOCS_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Check if path is a directory or file
  fs.stat(filePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    if (stats.isDirectory()) {
      serveDirIndex(res, filePath);
    } else {
      serveFile(res, filePath);
    }
  });
});

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        REZ Platform API Documentation Server                ║
╠═══════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT.toString().padEnd(27)}║
║                                                               ║
║  Endpoints:                                                   ║
║    - /              → Documentation index                     ║
║    - /index.html    → Swagger UI                              ║
║    - /index.yaml    → Unified API spec                       ║
║    - /*.yaml        → Individual service specs                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
