/**
 * Genie Memory Connector Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.GENIE_MEMORY_PORT = '4896';

const { default: app } = await import('../../src/index.js');

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

describe('Genie Memory Connector — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
    assert.equal(j.service, 'genie-memory-connector');
  });
});

describe('Genie Memory Connector — Sync', () => {
  it('POST /api/sync/:userId → sync memory', async () => {
    const r = await fetch(url('/api/sync/user-123'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Meeting at 3pm with team',
        type: 'event',
        importance: 'Medium'
      })
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.memoryId);
    assert.equal(j.synced, true);
  });

  it('GET /api/sync/:userId/status → get sync status', async () => {
    const r = await fetch(url('/api/sync/user-123/status'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.userId, 'user-123');
    assert.ok(typeof j.totalSynced === 'number');
  });

  it('POST /api/sync/:userId/batch → batch sync', async () => {
    const r = await fetch(url('/api/sync/user-456/batch'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memories: [
          { content: 'Memory 1', type: 'knowledge' },
          { content: 'Memory 2', type: 'event' }
        ]
      })
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.synced, 2);
  });
});

describe('Genie Memory Connector — Context', () => {
  it('GET /api/context/:userId → get context', async () => {
    const r = await fetch(url('/api/context/user-123'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.context);
    assert.equal(j.context.userId, 'user-123');
  });

  it('GET /api/context/:userId?includeOrg=false → filtered context', async () => {
    const r = await fetch(url('/api/context/user-123?includeOrg=false'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.context.organizationalContext, null);
  });
});

describe('Genie Memory Connector — Memories', () => {
  it('GET /api/memories/:userId → list memories', async () => {
    const r = await fetch(url('/api/memories/user-123'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.memories));
  });

  it('GET /api/memories/:userId?type=event → filtered', async () => {
    const r = await fetch(url('/api/memories/user-123?type=event'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.memories));
  });
});

describe('Genie Memory Connector — Search', () => {
  it('POST /api/search → search memories', async () => {
    const r = await fetch(url('/api/search'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'user-123',
        query: 'meeting'
      })
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.results));
  });
});

describe('Genie Memory Connector — Graph', () => {
  it('GET /api/graph/:userId → get memory graph', async () => {
    const r = await fetch(url('/api/graph/user-123'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.nodes));
    assert.ok(Array.isArray(j.edges));
    assert.ok(j.stats);
  });
});

after(() => { server?.close(); });