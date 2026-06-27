/**
 * MemoryOS unit tests — node --test
 *
 * Auth: REQUIRE_AUTH=true + x-internal-token matching INTERNAL_SERVICE_TOKEN.
 * The /ready endpoint is on the PUBLIC_PATHS list, so no auth needed there.
 *
 * Note: memory-os src/index.js exports `app` as default and uses NODE_ENV guard
 * to skip server startup in test mode. The module loads all the routes when imported.
 */

process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';
process.env.PORT = '4703';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

// Import the app — NODE_ENV=test blocks server.listen() in index.js
await import('../../src/index.js');
const { default: app } = await import('../../src/index.js');

// Start a test server on an ephemeral port
let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }
const hdrs = (extra = {}) => ({ 'Content-Type': 'application/json', 'x-internal-token': 'dev-token', ...extra });

describe('MemoryOS — Health & Readiness', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
  });

  it('GET /ready → 200', async () => {
    const r = await fetch(url('/ready'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.ready, true);
  });
});

describe('MemoryOS — Auth', () => {
  it('POST /api/memories/bulk-create without token → 401', async () => {
    const r = await fetch(url('/api/memories/bulk-create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(r.status, 401);
  });

  it('POST /api/memories with x-internal-token → 201', async () => {
    const r = await fetch(url('/api/memories'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ twinId: 'twin-auth', content: 'Auth test', type: 'knowledge', importance: 'High' }),
    });
    assert.equal(r.status, 201);
  });

  it('POST /api/memories with wrong token → 401', async () => {
    const r = await fetch(url('/api/memories/bulk-create'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': 'wrong-token' },
      body: JSON.stringify({ items: [] }),
    });
    assert.equal(r.status, 401);
  });
});

describe('MemoryOS — Memory CRUD', () => {
  let memId;

  it('POST /api/memories → 201', async () => {
    const r = await fetch(url('/api/memories'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ twinId: 'twin-1', content: 'Test memory', type: 'knowledge', importance: 'High' }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
    const j = JSON.parse(text);
    assert.ok(j.id || j.data?.id, 'response should have an id');
    memId = j.id || j.data?.id;
  });

  it('GET /api/memories → 200', async () => {
    const r = await fetch(url('/api/memories'), { headers: hdrs() });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.memories) || Array.isArray(j), 'should return array of memories');
  });

  it('GET /api/memories/:id → 200', async () => {
    const r = await fetch(url('/api/memories/' + memId), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('PUT /api/memories/:id → 200', async () => {
    const r = await fetch(url('/api/memories/' + memId), {
      method: 'PUT',
      headers: hdrs(),
      body: JSON.stringify({ content: 'Updated content' }),
    });
    const text = await r.text();
    assert.equal(r.status, 200, text);
    const j = JSON.parse(text);
    assert.ok(j.success !== false, 'update should succeed');
  });

  it('DELETE /api/memories/:id → 200', async () => {
    const r = await fetch(url('/api/memories/' + memId), {
      method: 'DELETE',
      headers: hdrs(),
    });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/:id after delete → 404', async () => {
    const r = await fetch(url('/api/memories/' + memId), { headers: hdrs() });
    assert.equal(r.status, 404);
  });
});

describe('MemoryOS — Search', () => {
  it('GET /api/memories/search?q=meeting → 200', async () => {
    const r = await fetch(url('/api/memories/search?q=meeting'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/search without q → 400', async () => {
    const r = await fetch(url('/api/memories/search'), { headers: hdrs() });
    assert.equal(r.status, 400);
  });
});

describe('MemoryOS — Knowledge Graph', () => {
  it('GET /api/knowledge-graph/walk → 200', async () => {
    const r = await fetch(url('/api/knowledge-graph/walk?start=node-test-1&depth=1'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('POST /api/knowledge-graph/nodes → 201', async () => {
    const r = await fetch(url('/api/knowledge-graph/nodes'), {
      method: 'POST',
      headers: hdrs(),
      body: JSON.stringify({ id: 'node-test-1', label: 'Test Node', type: 'person' }),
    });
    const text = await r.text();
    assert.equal(r.status, 201, text);
  });

  it('GET /api/knowledge-graph/nodes/:id → 200', async () => {
    const r = await fetch(url('/api/knowledge-graph/nodes/node-test-1'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });
});

describe('MemoryOS — Analytics & Metadata', () => {
  it('GET /api/memories/analytics/growth → 200', async () => {
    const r = await fetch(url('/api/memories/analytics/growth'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/analytics/by-type → 200', async () => {
    const r = await fetch(url('/api/memories/analytics/by-type'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/timeline → 200', async () => {
    const r = await fetch(url('/api/memories/timeline'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/summaries → 200', async () => {
    const r = await fetch(url('/api/memories/summaries'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/by-importance/:level → 200', async () => {
    const r = await fetch(url('/api/memories/by-importance/High'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });

  it('GET /api/memories/analytics/recall-freq → 200', async () => {
    const r = await fetch(url('/api/memories/analytics/recall-freq'), { headers: hdrs() });
    assert.equal(r.status, 200);
  });
});

describe('MemoryOS — 404', () => {
  it('GET /unknown-path with token → 404', async () => {
    const r = await fetch(url('/unknown-path'), { headers: hdrs() });
    assert.equal(r.status, 404);
  });
});

after(() => { server?.close(); });