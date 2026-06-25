/**
 * Vector DB unit tests — node:test (CJS)
 * Tests the 20 public routes + named exports + auth bypass behavior.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

// Bust module cache so tests get a fresh app instance each run
const srcPath = require.resolve('../../src/index.js');
delete require.cache[srcPath];
Object.keys(require.cache).forEach(k => {
  if (k.includes('vector-db')) delete require.cache[k];
});

const app = require('../../src/index.js');

const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'vector-db-internal-token';
const TEST_COLLECTION = 'test-node-coll';
const TEST_DIM = 4;

let server;
let baseUrl;

before(async () => {
  return new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
});

function req(method, path, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const headers = { 'Content-Type': 'application/json' };
    if (extraHeaders) Object.assign(headers, extraHeaders);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers };
    const req2 = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req2.on('error', reject);
    if (body !== undefined) req2.write(JSON.stringify(body));
    req2.end();
  });
}

function withAuth(body) { return { ...body, _token: INTERNAL_TOKEN }; }

// Strip _token from body before sending — it's not a real field
function authReq(method, path, body) {
  const { _token, ...realBody } = body || {};
  return req(method, path, Object.keys(realBody).length ? realBody : undefined,
    _token ? { 'x-internal-token': _token } : {});
}

// ---------- exports ----------

test('app is the Express app (function)', () => {
  assert.equals(typeof app, 'function');
  assert.equals(app.name, 'app');
});

test('app.app is the Express app', () => {
  assert.equals(typeof app.app, 'function');
});

test('PORT exported as 4780 by default', () => {
  assert.equals(app.PORT, 4780);
});

test('SERVICE_NAME exported as vector-db', () => {
  assert.equals(app.SERVICE_NAME, 'vector-db');
});

test('collections Map exported', () => {
  assert.ok(app.collections instanceof Map);
});

test('stats object exported', () => {
  assert.ok(app.stats instanceof Object);
  assert.ok('totalCollectionsCreated' in app.stats);
});

test('embed function exported', () => {
  assert.equals(typeof app.embed, 'function');
});

test('cosineSimilarity function exported', () => {
  assert.equals(typeof app.cosineSimilarity, 'function');
});

test('dotSimilarity function exported', () => {
  assert.equals(typeof app.dotSimilarity, 'function');
});

test('euclideanSimilarity function exported', () => {
  assert.equals(typeof app.euclideanSimilarity, 'function');
});

// ---------- embedding helpers ----------

test('embed() returns an array of DEFAULT_DIM=128 by default', () => {
  const v = app.embed('hello world');
  assert.ok(Array.isArray(v));
  assert.equals(v.length, 128);
});

test('embed() returns an array of requested dim', () => {
  const v = app.embed('hello world', 4);
  assert.ok(Array.isArray(v));
  assert.equals(v.length, 4);
});

test('embed() L2-normalized: norm close to 1 for meaningful text', () => {
  const v = app.embed('machine learning artificial intelligence');
  let normSq = 0;
  for (const x of v) normSq += x * x;
  const norm = Math.sqrt(normSq);
  assert.ok(norm > 0.5, 'non-trivial text should have norm > 0.5');
});

test('embed() empty-ish text returns near-zero vector', () => {
  const v = app.embed('a an the');
  let normSq = 0;
  for (const x of v) normSq += x * x;
  const norm = Math.sqrt(normSq);
  assert.ok(norm < 0.01, 'only stopwords should give near-zero norm');
});

test('cosineSimilarity identical vectors = 1', () => {
  const v = [0.5, 0.5, 0.5, 0.5];
  assert.ok(Math.abs(app.cosineSimilarity(v, v) - 1) < 0.0001);
});

test('cosineSimilarity orthogonal vectors ≈ 0', () => {
  const a = [1, 0, 0, 0];
  const b = [0, 1, 0, 0];
  assert.ok(Math.abs(app.cosineSimilarity(a, b)) < 0.0001);
});

test('dotSimilarity correct for normalized vectors', () => {
  const a = [1, 0, 0, 0];
  const b = [0, 1, 0, 0];
  assert.equals(app.dotSimilarity(a, b), 0);
  assert.equals(app.dotSimilarity(a, a), 1);
});

test('euclideanSimilarity identical = 1, far apart ≈ 0', () => {
  const a = [0, 0, 0, 0];
  const b = [3, 4, 0, 0]; // distance=5
  assert.ok(Math.abs(app.euclideanSimilarity(a, a) - 1) < 0.0001);
  assert.ok(app.euclideanSimilarity(a, b) < 0.3);
});

// ---------- health ----------

test('GET /api/health returns 200 + healthy', async () => {
  const res = await req('GET', '/api/health');
  assert.equals(res.status, 200);
  assert.equals(res.body.status, 'healthy');
  assert.equals(res.body.service, 'vector-db');
  assert.ok(res.body.collections >= 0);
  assert.ok(res.body.totalVectors >= 0);
  assert.ok(res.body.timestamp);
});

test('GET /ready returns 200 + ready:true', async () => {
  const res = await req('GET', '/ready');
  assert.equals(res.status, 200);
  assert.equals(res.body.ready, true);
});

test('GET /health redirects to /api/health', async () => {
  const res = await req('GET', '/health');
  // 301 or 302 redirect
  assert.ok([301, 302].includes(res.status), `expected redirect, got ${res.status}`);
});

// ---------- stats ----------

test('GET /api/stats returns 200 + stats object', async () => {
  const res = await req('GET', '/api/stats');
  assert.equals(res.status, 200);
  assert.ok('collections' in res.body);
  assert.ok('vectors' in res.body);
  assert.ok('counters' in res.body);
  assert.ok('auditEntries' in res.body);
});

// ---------- collection CRUD ----------

test('POST /api/collections creates a collection', async () => {
  const res = await authReq('POST', '/api/collections', {
    name: TEST_COLLECTION, dimension: TEST_DIM, metric: 'cosine', _token: INTERNAL_TOKEN
  });
  assert.ok([200, 201, 409].includes(res.status), `got ${res.status}: ${JSON.stringify(res.body)}`);
  if (res.status !== 409) {
    assert.equals(res.body.name, TEST_COLLECTION);
    assert.equals(res.body.dimension, TEST_DIM);
    assert.equals(res.body.metric, 'cosine');
  }
});

test('POST /api/collections rejects duplicate', async () => {
  const res = await authReq('POST', '/api/collections', {
    name: TEST_COLLECTION, dimension: TEST_DIM, _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 409);
  assert.ok(res.body.code === 'COLLECTION_EXISTS' || res.body.error.includes('already exists'));
});

test('GET /api/collections lists collections', async () => {
  const res = await req('GET', '/api/collections');
  assert.equals(res.status, 200);
  assert.ok(Array.isArray(res.body.collections));
  assert.ok(res.body.collections.length > 0);
  const found = res.body.collections.find(c => c.name === TEST_COLLECTION);
  assert.ok(found, `collection ${TEST_COLLECTION} should be in list`);
});

test('GET /api/collections/:name returns a collection', async () => {
  const res = await req('GET', `/api/collections/${TEST_COLLECTION}`);
  assert.equals(res.status, 200);
  assert.equals(res.body.name, TEST_COLLECTION);
  assert.equals(res.body.dimension, TEST_DIM);
});

test('GET /api/collections/:name 404 for unknown', async () => {
  const res = await req('GET', '/api/collections/does-not-exist-xyz');
  assert.equals(res.status, 404);
});

test('PATCH /api/collections/:name updates metadata', async () => {
  const res = await authReq('PATCH', `/api/collections/${TEST_COLLECTION}`, {
    metric: 'dot', _token: INTERNAL_TOKEN
  });
  assert.equals(res.status, 200);
  assert.equals(res.body.metric, 'dot');
});

test('DELETE /api/collections/:name deletes collection', async () => {
  // First recreate a collection to delete
  const name = 'coll-to-delete';
  await authReq('POST', '/api/collections', { name, dimension: 4, _token: INTERNAL_TOKEN });
  const res = await authReq('DELETE', `/api/collections/${name}`, { _token: INTERNAL_TOKEN });
  assert.equals(res.status, 200);
  assert.equals(res.body.name, name);
});

test('DELETE /api/collections/:name 404 for unknown', async () => {
  const res = await authReq('DELETE', '/api/collections/does-not-exist', { _token: INTERNAL_TOKEN });
  assert.equals(res.status, 404);
});

// ---------- vector CRUD ----------

test('POST /api/embed returns an embedding', async () => {
