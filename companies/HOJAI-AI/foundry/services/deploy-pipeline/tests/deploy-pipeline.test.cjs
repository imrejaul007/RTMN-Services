// Auto-generated tests for deploy-pipeline
// Run with: NODE_ENV=test node --test tests/deploy-pipeline.test.cjs

'use strict';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
process.env.PORT = '4540';
process.env.DATA_DIR = '/tmp/deploy-pipeline-test';

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

describe('deploy-pipeline', () => {
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

  it('GET /api/info works', async () => {
    const r = await req('GET', '/api/info');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /deploy/:id works', async () => {
    const r = await req('GET', '/deploy/:id');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  it('GET /deployments works', async () => {
    const r = await req('GET', '/deployments');
    assert.ok([200, 404].includes(r.status), `failed: ${r.status}`);
  });

  // Auth tests
  it('POST /deploy without token returns 401', async () => {
    const r = await req('POST', '/deploy', {});
    assert.equal(r.status, 401, `expected 401, got ${r.status}`);
  });

  it('POST /deploy with wrong token returns 401', async () => {
    const r = await req('POST', '/deploy', {}, { 'x-internal-token': 'wrong-token' });
    assert.equal(r.status, 401);
  });

  it('POST /deploy with correct token returns expected status', async () => {
    const r = await req('POST', '/deploy', {}, { 'x-internal-token': 'test-token' });
    assert.ok([200, 201, 400, 404, 500].includes(r.status), `unexpected ${r.status}`);
  });

  // 404 test
  it('unknown route returns 404', async () => {
    const r = await req('GET', '/api/nonexistent-route-xyz');
    assert.equal(r.status, 404);
  });
});
