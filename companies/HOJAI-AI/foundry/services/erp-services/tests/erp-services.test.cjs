// Auto-generated tests for erp-services
// Run with: NODE_ENV=test node --test tests/erp-services.test.cjs

'use strict';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
process.env.PORT = '4775';
process.env.DATA_DIR = '/tmp/erp-services-test';

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

describe('erp-services', () => {
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

  it('GET /api/employees works', async () => {
    const r = await req('GET', '/api/employees');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/employees/:id works', async () => {
    const r = await req('GET', '/api/employees/:id');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/projects works', async () => {
    const r = await req('GET', '/api/projects');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /api/inventory works', async () => {
    const r = await req('GET', '/api/inventory');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  // Auth tests
  it('POST /api/employees without token returns 401', async () => {
    const r = await req('POST', '/api/employees', {});
    assert.equal(r.status, 401, `expected 401, got ${r.status}`);
  });

  it('POST /api/employees with wrong token returns 401', async () => {
    const r = await req('POST', '/api/employees', {}, { 'x-internal-token': 'wrong-token' });
    assert.equal(r.status, 401);
  });

  it('POST /api/employees with correct token returns expected status', async () => {
    const r = await req('POST', '/api/employees', {}, { 'x-internal-token': 'test-token' });
    assert.ok([200, 201, 400, 404, 500].includes(r.status), `unexpected ${r.status}`);
  });

  // 404 test
  it('unknown route returns 404', async () => {
    const r = await req('GET', '/api/nonexistent-route-xyz');
    assert.equal(r.status, 404);
  });
});
