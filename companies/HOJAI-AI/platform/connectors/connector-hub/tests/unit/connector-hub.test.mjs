/**
 * Connector Hub — unit tests (ESM)
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.CONNECTOR_HUB_PORT = '0';

const app = (await import('../../src/index.js')).default;

let server;
let baseURL;

function req(method, path, body) {
  return new Promise((resolve) => {
    const url = new URL(path, baseURL);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'dev-token',
      },
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      baseURL = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => { if (server) server.close(); });

describe('Health & Lifecycle', () => {
  test('GET /health -> 200', async () => {
    const r = await req('GET', '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'healthy');
    assert.ok(Array.isArray(r.body.connectors));
  });
  test('GET /ready -> 200', async () => {
    const r = await req('GET', '/ready');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ready, true);
  });
});

describe('Connector Registry', () => {
  test('GET /api/connectors -> 200', async () => {
    const r = await req('GET', '/api/connectors');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.connectors));
    assert.ok(r.body.connectors.length >= 8);
  });
  test('GET /api/connectors/salesforce -> 200', async () => {
    const r = await req('GET', '/api/connectors/salesforce');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.name, 'salesforce');
    assert.ok(Array.isArray(r.body.kinds));
  });
  test('GET /api/connectors/stripe -> 200', async () => {
    const r = await req('GET', '/api/connectors/stripe');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/shopify -> 200', async () => {
    const r = await req('GET', '/api/connectors/shopify');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/slack -> 200', async () => {
    const r = await req('GET', '/api/connectors/slack');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/no-such -> 404', async () => {
    const r = await req('GET', '/api/connectors/no-such');
    assert.strictEqual(r.status, 404);
  });
});

describe('Resource Operations', () => {
  test('GET /api/connectors/salesforce/lead -> 200', async () => {
    const r = await req('GET', '/api/connectors/salesforce/lead');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.items));
  });
  test('GET /api/connectors/salesforce/contact -> 200', async () => {
    const r = await req('GET', '/api/connectors/salesforce/contact');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/stripe/customer -> 200', async () => {
    const r = await req('GET', '/api/connectors/stripe/customer');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/shopify/product -> 200', async () => {
    const r = await req('GET', '/api/connectors/shopify/product');
    assert.strictEqual(r.status, 200);
  });
  test('GET /api/connectors/salesforce/invalid-kind -> 400', async () => {
    const r = await req('GET', '/api/connectors/salesforce/invalid-kind');
    assert.strictEqual(r.status, 400);
  });
});

describe('Connections', () => {
  test('GET /api/connections -> 200', async () => {
    const r = await req('GET', '/api/connections');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.connections));
  });
});
