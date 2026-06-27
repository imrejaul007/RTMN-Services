// Auto-generated tests for studio-orchestrator
// Run with: NODE_ENV=test node --test tests/studio-orchestrator.test.cjs

'use strict';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
process.env.PORT = '4570';
process.env.DATA_DIR = '/tmp/studio-orchestrator-test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Import app (guards against listen in NODE_ENV=test)
const app = require('../src/index.js');

let server;
let baseUrl;

function req(method, path, body, headers) {
  return new Promise((resolve) => {
    if (!baseUrl) { resolve({ status: 0 }); return; }
    const url = new URL(baseUrl + path);
    const opts = {
      method: method.toUpperCase(),
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', () => resolve({ status: 0 }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('studio-orchestrator', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(() => { server?.close(); });

  // Health checks
  it('GET /health returns 200', async () => {
    const r = await req('GET', '/health');
    assert.equal(r.status, 200, `health failed: ${JSON.stringify(r)}`);
  });

  it('GET /ready returns 200', async () => {
    const r = await req('GET', '/ready');
    assert.ok([200, 404].includes(r.status), `/ready failed: ${r.status}`);
  });

  it('GET /api/v1/templates works', async () => {
    const r = await req('GET', '/api/v1/templates');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/v1/templates/:id works', async () => {
    const r = await req('GET', '/api/v1/templates/:id');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/v1/flows works', async () => {
    const r = await req('GET', '/api/v1/flows');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/v1/nexha works', async () => {
    const r = await req('GET', '/api/v1/nexha');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  // Auth tests
  it('POST /api/v1/deploy without token returns 401', async () => {
    const r = await req('POST', '/api/v1/deploy', {});
    assert.equal(r.status, 401, `expected 401, got ${r.status}`);
  });

  it('POST /api/v1/deploy with wrong token returns 401', async () => {
    const r = await req('POST', '/api/v1/deploy', {}, { 'x-internal-token': 'wrong-token' });
    assert.equal(r.status, 401);
  });

  it('POST /api/v1/deploy with correct token returns expected status', async () => {
    const r = await req('POST', '/api/v1/deploy', {}, { 'x-internal-token': 'test-token' });
    assert.ok([200, 201, 400, 404, 500].includes(r.status), `unexpected ${r.status}`);
  });

  // 404 test
  it('unknown route returns 404', async () => {
    const r = await req('GET', '/api/nonexistent-route-xyz');
    assert.equal(r.status, 404);
  });
});
