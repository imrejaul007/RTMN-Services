import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const PORT = 4501;
let server;

before(() => {
  // Import and start server
  process.env.PORT = PORT;
  import('../src/index.js');
  server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', service: 'hojai-gateway' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  server.listen(PORT);
});

after(() => {
  server?.close();
});

describe('HOJAI Gateway', () => {
  it('should have health endpoint', async () => {
    const res = await fetch(`http://localhost:${PORT}/health`);
    const data = await res.json();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.service, 'hojai-gateway');
  });
});
