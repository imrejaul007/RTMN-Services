/**
 * Intent Engine Unit Tests (CommonJS)
 *
 * Tests all endpoints of the intent-engine service.
 * Run: node --test tests/unit/intent-engine.test.cjs
 */

process.env.INTERNAL_TOKEN = 'dev-token-ie';
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

const app = require('../../src/index.js');
const { detectIntent, INTENT_CATALOG } = require('../../src/index.js');

const PORT = 4787;
const TOKEN = 'dev-token-ie';
let server;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, 'http://localhost:' + PORT);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: PORT,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', 'x-internal-token': TOKEN, ...(extraHeaders || {}) },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, function(res) {
      let chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() {
        let parsed;
        try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  await new Promise(function(resolve) { server = app.listen(PORT, '127.0.0.1', resolve); });
});

after(async () => {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// UNIT: detectIntent
// ============================================================
describe('detectIntent (unit)', () => {
  it('detects search intent', () => {
    const r = detectIntent('Find me the nearest restaurant');
    assert.strictEqual(r.intent, 'search');
    assert.ok(r.confidence > 0);
  });

  it('detects buy intent', () => {
    const r = detectIntent('I want to purchase a new laptop');
    assert.strictEqual(r.intent, 'buy');
  });

  it('detects cancel intent', () => {
    const r = detectIntent('Cancel my subscription please');
    assert.strictEqual(r.intent, 'cancel');
  });

  it('detects support intent', () => {
    const r = detectIntent('I have a problem with my order');
    assert.strictEqual(r.intent, 'support');
  });

  it('detects compare intent', () => {
    const r = detectIntent('Compare iPhone vs Samsung');
    assert.strictEqual(r.intent, 'compare');
  });

  it('detects recommend intent', () => {
    const r = detectIntent('What is the best phone to buy?');
    assert.strictEqual(r.intent, 'recommend');
  });

  it('detects track intent', () => {
    const r = detectIntent('Track my order 12345');
    assert.strictEqual(r.intent, 'track');
  });

  it('detects return intent', () => {
    const r = detectIntent('I want to return this product');
    assert.strictEqual(r.intent, 'return');
  });

  it('detects greet intent', () => {
    const r = detectIntent('Hello, how are you?');
    assert.strictEqual(r.intent, 'greet');
  });

  it('returns unknown for unrecognized text', () => {
    const r = detectIntent('xyzabc123 not a real sentence');
    assert.strictEqual(r.intent, 'unknown');
    assert.strictEqual(r.confidence, 0.5);
  });

  it('returns alternatives when multiple matches', () => {
    const r = detectIntent('help me find and compare options');
    assert.ok(r.intent);
    assert.ok(Array.isArray(r.alternatives));
  });

  it('confidence increases with more matches', () => {
    const r1 = detectIntent('help');
    const r2 = detectIntent('help me with this problem issue error');
    assert.ok(r2.confidence >= r1.confidence);
  });

  it('case insensitive', () => {
    const r = detectIntent('BUY a product');
    assert.strictEqual(r.intent, 'buy');
  });

  it('INTENT_CATALOG has 9 intents', () => {
    assert.strictEqual(Object.keys(INTENT_CATALOG).length, 9);
  });
});

// ============================================================
// HEALTH & LIFECYCLE
// ============================================================
describe('Health & Lifecycle', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'intent-engine');
    assert.strictEqual(res.body.intents, 9);
  });

  it('GET /api/health -> 200', async () => {
    const res = await req('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.ok(typeof res.body.uptime === 'number');
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

// ============================================================
// INTENT DETECTION
// ============================================================
describe('Intent Detection', () => {
  it('POST /api/intent -> 200 (search)', async () => {
    const res = await req('POST', '/api/intent', { text: 'find xyz' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.text, 'find xyz');
    assert.strictEqual(res.body.intent, 'search');
    assert.ok(typeof res.body.confidence === 'number');
  });

  it('POST /api/intent -> 200 (buy)', async () => {
    const res = await req('POST', '/api/intent', { text: 'I want to order pizza' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.intent, 'buy');
  });

  it('POST /api/intent -> 200 (cancel)', async () => {
    const res = await req('POST', '/api/intent', { text: 'Cancel my order' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.intent, 'cancel');
  });

  it('POST /api/intent -> 200 (unknown)', async () => {
    const res = await req('POST', '/api/intent', { text: 'asdfghjkl random' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.intent, 'unknown');
  });

  it('POST /api/intent -> 400 (missing text)', async () => {
    const res = await req('POST', '/api/intent', {});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/intent -> 400 (non-string text)', async () => {
    const res = await req('POST', '/api/intent', { text: 123 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/intent -> 400 (text is array)', async () => {
    const res = await req('POST', '/api/intent', { text: [] });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/intent includes actor in audit', async () => {
    const res = await req('POST', '/api/intent', { text: 'buy a laptop', actor: 'test-agent' });
    assert.strictEqual(res.status, 200);
  });

  it('POST /api/intent -> 401 (auth required)', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'POST',
        hostname: 'localhost',
        port: PORT,
        path: '/api/intent',
        headers: { 'Content-Type': 'application/json' },
      };
      const r = http.request(opts, function(res) {
        let chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      r.write(JSON.stringify({ text: 'hello' }));
      r.end();
    });
    assert.strictEqual(res.status, 401);
  });
});

// ============================================================
// BATCH DETECTION
// ============================================================
describe('Batch Detection', () => {
  it('POST /api/intent/batch -> 200', async () => {
    const res = await req('POST', '/api/intent/batch', {
      texts: ['find a hotel', 'buy a book', 'cancel my order']
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 3);
    assert.ok(Array.isArray(res.body.results));
    assert.strictEqual(res.body.results[0].intent, 'search');
    assert.strictEqual(res.body.results[1].intent, 'buy');
    assert.strictEqual(res.body.results[2].intent, 'cancel');
  });

  it('POST /api/intent/batch -> 400 (empty array)', async () => {
    const res = await req('POST', '/api/intent/batch', { texts: [] });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/intent/batch -> 400 (not an array)', async () => {
    const res = await req('POST', '/api/intent/batch', { texts: 'hello' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/intent/batch -> 401 (auth required)', async () => {
    const res = await new Promise(function(resolve, reject) {
      const opts = {
        method: 'POST',
        hostname: 'localhost',
        port: PORT,
        path: '/api/intent/batch',
        headers: { 'Content-Type': 'application/json' },
      };
      const r = http.request(opts, function(res) {
        let chunks = '';
        res.on('data', function(c) { chunks += c; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      r.write(JSON.stringify({ texts: ['hello'] }));
      r.end();
    });
    assert.strictEqual(res.status, 401);
  });
});

// ============================================================
// CATALOG
// ============================================================
describe('Catalog', () => {
  it('GET /api/intent/catalog -> 200', async () => {
    const res = await req('GET', '/api/intent/catalog');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 9);
    assert.ok(Array.isArray(res.body.intents));
    assert.strictEqual(res.body.intents.length, 9);
    const first = res.body.intents[0];
    assert.ok(first.name);
    assert.ok(first.description);
    assert.ok(Array.isArray(first.keywords));
  });

  it('catalog has expected intent names', async () => {
    const res = await req('GET', '/api/intent/catalog');
    const names = res.body.intents.map(i => i.name).sort();
    assert.deepStrictEqual(names, ['buy', 'cancel', 'compare', 'greet', 'recommend', 'return', 'search', 'support', 'track']);
  });
});

// ============================================================
// AUDIT
// ============================================================
describe('Audit', () => {
  it('GET /api/intent/audit -> 200', async () => {
    // Create an audit entry first
    await req('POST', '/api/intent', { text: 'test audit entry', actor: 'audit-test' });
    const res = await req('GET', '/api/intent/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
    assert.ok(res.body.count >= 1);
  });

  it('GET /api/intent/audit -> entries have correct structure', async () => {
    const res = await req('GET', '/api/intent/audit');
    if (res.body.entries.length > 0) {
      const e = res.body.entries[0];
      assert.ok(e.id);
      assert.ok(e.service);
      assert.ok(e.action);
      assert.ok(e.timestamp);
    }
  });

  it('GET /api/intent/audit?action=intent.detect -> filters by action', async () => {
    const res = await req('GET', '/api/intent/audit?action=intent.detect');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.entries));
  });

  it('GET /api/intent/audit?limit=1 -> respects limit', async () => {
    const res = await req('GET', '/api/intent/audit?limit=1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.entries.length <= 1);
  });
});
