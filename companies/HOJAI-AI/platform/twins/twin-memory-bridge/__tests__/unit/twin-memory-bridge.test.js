/**
 * Twin Memory Bridge Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.TWIN_MEMORY_BRIDGE_PORT = '4704';

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

describe('Twin Memory Bridge — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
  });
});

describe('Twin Memory Bridge — Twin Links', () => {
  it('GET /api/twin-links → list links', async () => {
    const r = await fetch(url('/api/twin-links'));
    assert.equal(r.status, 200);
  });

  it('POST /api/twin-links → create link', async () => {
    const r = await fetch(url('/api/twin-links'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twinId: 'twin-123',
        memoryPartition: 'partition-1',
        kind: 'semantic'
      })
    });
    assert.equal(r.status, 201);
  });

  it('GET /api/twin-links/:twinId → get link', async () => {
    const r = await fetch(url('/api/twin-links/twin-123'));
    assert.equal(r.status, 200);
  });
});

describe('Twin Memory Bridge — Memory Partition', () => {
  it('GET /api/partitions → list partitions', async () => {
    const r = await fetch(url('/api/partitions'));
    assert.equal(r.status, 200);
  });
});

describe('Twin Memory Bridge — Twin by Memory', () => {
  it('GET /api/twins-by-memory/:partitionId → get twins', async () => {
    const r = await fetch(url('/api/twins-by-memory/partition-1'));
    assert.equal(r.status, 200);
  });
});

after(() => { server?.close(); });
