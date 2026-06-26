'use strict';
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Start the app with auth disabled for testing
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';

const app = require('../../src/index.js');

let server;
let baseURL;

function makeRequest(method, path, body, extraHeaders) {
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
        ...extraHeaders,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

before(() => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseURL = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

after(() => { if (server) server.close(); });

describe('GET /ready', () => {
  test('returns 200 with ready status', async () => {
    const res = await makeRequest('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
    assert.ok(res.body.timestamp);
  });
});

describe('GET /api/health', () => {
  test('returns 200', async () => {
    const res = await makeRequest('GET', '/api/health');
    assert.strictEqual(res.status, 200);
  });
});

describe('GET /api/flags', () => {
  test('returns list of flags', async () => {
    const res = await makeRequest('GET', '/api/flags');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.flags));
    assert.ok(res.body.flags.length >= 4);
  });
});

describe('GET /api/flags/:key', () => {
  test('returns a specific flag', async () => {
    const res = await makeRequest('GET', '/api/flags/ai-model-v2-rollout');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.key, 'ai-model-v2-rollout');
  });
  test('returns 404 for unknown flag', async () => {
    const res = await makeRequest('GET', '/api/flags/no-such-flag');
    assert.strictEqual(res.status, 404);
  });
});

describe('POST /api/flags', () => {
  test('creates a new flag', async () => {
    const flag = {
      key: 'test-flag-' + Date.now(),
      name: 'Test Flag',
      type: 'boolean',
      enabled: true,
    };
    const res = await makeRequest('POST', '/api/flags', flag);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.key, flag.key);
  });
  test('rejects duplicate key', async () => {
    const flag = { key: 'duplicate-test', name: 'Dup', type: 'boolean' };
    await makeRequest('POST', '/api/flags', flag);
    const res = await makeRequest('POST', '/api/flags', flag);
    assert.strictEqual(res.status, 409);
  });
});

describe('PUT /api/flags/:key', () => {
  test('updates an existing flag', async () => {
    const key = 'update-test-' + Date.now();
    await makeRequest('POST', '/api/flags', { key, name: 'Old Name', type: 'boolean' });
    const res = await makeRequest('PUT', `/api/flags/${key}`, { name: 'New Name' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'New Name');
  });
  test('returns 404 for unknown flag', async () => {
    const res = await makeRequest('PUT', '/api/flags/no-such', { name: 'X' });
    assert.strictEqual(res.status, 404);
  });
});

describe('DELETE /api/flags/:key', () => {
  test('deletes a flag', async () => {
    const key = 'delete-test-' + Date.now();
    await makeRequest('POST', '/api/flags', { key, name: 'Del', type: 'boolean' });
    const res = await makeRequest('DELETE', `/api/flags/${key}`);
    assert.strictEqual(res.status, 204);
  });
  test('returns 404 for unknown flag', async () => {
    const res = await makeRequest('DELETE', '/api/flags/no-such');
    assert.strictEqual(res.status, 404);
  });
});

describe('POST /api/flags/:key/toggle', () => {
  test('toggles flag enabled state', async () => {
    const key = 'toggle-test-' + Date.now();
    await makeRequest('POST', '/api/flags', { key, name: 'Toggle', type: 'boolean', enabled: true });
    const res = await makeRequest('POST', `/api/flags/${key}/toggle`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.enabled, false);
  });
});

describe('POST /api/flags/evaluate', () => {
  test('evaluates a boolean flag', async () => {
    const res = await makeRequest('POST', '/api/flags/evaluate', {
      key: 'ai-model-v2-rollout',
      context: { tenantType: 'internal' },
    });
    assert.strictEqual(res.status, 200);
    assert.ok('result' in res.body);
  });
  test('returns 404 for unknown flag', async () => {
    const res = await makeRequest('POST', '/api/flags/evaluate', { key: 'no-such' });
    assert.strictEqual(res.status, 404);
  });
});

describe('POST /api/flags/bulk-evaluate', () => {
  test('evaluates multiple flags', async () => {
    const res = await makeRequest('POST', '/api/flags/bulk-evaluate', {
      keys: ['ai-model-v2-rollout', 'use-new-checkout'],
      context: {},
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.results));
    assert.strictEqual(res.body.results.length, 2);
  });
});

describe('GET /api/flags/:key/history', () => {
  test('returns flag history', async () => {
    const res = await makeRequest('GET', '/api/flags/ai-model-v2-rollout/history');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.history));
  });
});

describe('GET /api/segments', () => {
  test('returns list of segments', async () => {
    const res = await makeRequest('GET', '/api/segments');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.segments));
  });
});

describe('POST /api/segments', () => {
  test('creates a new segment', async () => {
    const seg = {
      key: 'test-seg-' + Date.now(),
      name: 'Test Segment',
      description: 'Test',
      conditions: [{ attribute: 'plan', op: 'eq', values: ['premium'] }],
    };
    const res = await makeRequest('POST', '/api/segments', seg);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.key, seg.key);
  });
});

describe('GET /api/audit', () => {
  test('returns audit log', async () => {
    const res = await makeRequest('GET', '/api/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
  });
});
