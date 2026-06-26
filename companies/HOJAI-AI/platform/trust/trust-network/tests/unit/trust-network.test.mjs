'use strict';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.TRUST_NETWORK_PORT = '0';

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
    assert.strictEqual(r.body.service, 'trust-network');
  });
  test('GET /ready -> 200', async () => {
    const r = await req('GET', '/ready');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.ready, true);
  });
});

describe('Entity CRUD', () => {
  test('GET /api/entities -> 200 with seeded data', async () => {
    const r = await req('GET', '/api/entities');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.entities));
    assert.ok(r.body.entities.length >= 9); // 3 humans + 4 orgs + 3 content
  });
  test('GET /api/entities?entityType=human -> filters correctly', async () => {
    const r = await req('GET', '/api/entities?entityType=human');
    assert.strictEqual(r.status, 200);
    r.body.entities.forEach((e) => assert.strictEqual(e.entityType, 'human'));
  });
  test('GET /api/entities?minScore=80 -> filters by score', async () => {
    const r = await req('GET', '/api/entities?minScore=80');
    assert.strictEqual(r.status, 200);
    r.body.entities.forEach((e) => assert.ok(e.score >= 80));
  });
  test('GET /api/entities?q=hojai -> searches by name', async () => {
    const r = await req('GET', '/api/entities?q=hojai');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.entities.length >= 1);
    assert.ok(r.body.entities.some((e) => e.name.toLowerCase().includes('hojai')));
  });
  test('GET /api/entities/:id -> 200 for seeded entity', async () => {
    const r = await req('GET', '/api/entities/human-imrejaul-reja');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.entityId, 'human-imrejaul-reja');
    assert.ok(Array.isArray(r.body.endorsements));
    assert.ok(Array.isArray(r.body.verifications));
  });
  test('GET /api/entities/:id -> 404 for unknown', async () => {
    const r = await req('GET', '/api/entities/no-such-entity');
    assert.strictEqual(r.status, 404);
  });
  test('POST /api/entities -> 201 creates entity', async () => {
    const r = await req('POST', '/api/entities', {
      entityType: 'human',
      name: 'Test User ' + Date.now(),
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.entityType, 'human');
  });
  test('POST /api/entities -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/entities', {});
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/entities -> 400 for invalid entityType', async () => {
    const r = await req('POST', '/api/entities', { entityType: 'robot', name: 'Test' });
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/entities -> 409 for duplicate', async () => {
    const r = await req('POST', '/api/entities', {
      entityType: 'human',
      name: 'Imrejaul Reja',
    });
    assert.strictEqual(r.status, 409);
  });
  test('POST /api/entities requires auth', async () => {
    const r = await new Promise((resolve) => {
      const opts = {
        method: 'POST',
        hostname: new URL(baseURL).hostname,
        port: new URL(baseURL).port,
        path: '/api/entities',
        headers: { 'Content-Type': 'application/json' },
      };
      const req2 = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
      });
      req2.write(JSON.stringify({ entityType: 'human', name: 'NoAuth' }));
      req2.end();
    });
    assert.strictEqual(r.status, 401);
  });
});

describe('Endorsements', () => {
  test('GET /api/endorsements -> 200', async () => {
    const r = await req('GET', '/api/endorsements');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.endorsements));
    assert.ok(r.body.count >= 3); // seeded
  });
  test('GET /api/endorsements?fromEntityId -> filters', async () => {
    const r = await req('GET', '/api/endorsements?fromEntityId=human-imrejaul-reja');
    assert.strictEqual(r.status, 200);
    r.body.endorsements.forEach((e) => assert.strictEqual(e.fromEntityId, 'human-imrejaul-reja'));
  });
  test('POST /api/endorsements -> 201', async () => {
    const r = await req('POST', '/api/endorsements', {
      fromEntityId: 'human-imrejaul-reja',
      toEntityId: 'organization-hojai-ai',
      weight: 25,
      reason: 'great platform',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.weight, 25);
  });
  test('POST /api/endorsements -> 400 for missing fields', async () => {
    const r = await req('POST', '/api/endorsements', {});
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/endorsements -> 404 for unknown entity', async () => {
    const r = await req('POST', '/api/endorsements', {
      fromEntityId: 'human-imrejaul-reja',
      toEntityId: 'no-such-entity',
      weight: 10,
    });
    assert.strictEqual(r.status, 404);
  });
});

describe('Risk Flags', () => {
  test('GET /api/risk-flags -> 200', async () => {
    const r = await req('GET', '/api/risk-flags');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.flags));
  });
  test('POST /api/risk-flags -> 201', async () => {
    const r = await req('POST', '/api/risk-flags', {
      entityId: 'human-imrejaul-reja',
      kind: 'tos-violation',
      severity: 5,
      reason: 'test flag',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.kind, 'tos-violation');
  });
  test('POST /api/risk-flags -> 400 for missing', async () => {
    const r = await req('POST', '/api/risk-flags', {});
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/risk-flags -> 404 for unknown entity', async () => {
    const r = await req('POST', '/api/risk-flags', {
      entityId: 'no-such-entity',
      kind: 'fraud-suspected',
      severity: 8,
    });
    assert.strictEqual(r.status, 404);
  });
});

describe('Verifications', () => {
  test('GET /api/verifications -> 200', async () => {
    const r = await req('GET', '/api/verifications');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.verifications));
    assert.ok(r.body.count >= 3); // seeded
  });
  test('POST /api/verifications -> 201', async () => {
    const r = await req('POST', '/api/verifications', {
      entityId: 'human-anita-verma',
      kind: 'email',
      verifiedBy: 'corpID:4702',
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.kind, 'email');
  });
  test('POST /api/verifications -> 400 for missing', async () => {
    const r = await req('POST', '/api/verifications', {});
    assert.strictEqual(r.status, 400);
  });
  test('POST /api/verifications -> 404 for unknown entity', async () => {
    const r = await req('POST', '/api/verifications', {
      entityId: 'no-such-entity',
      kind: 'identity',
      verifiedBy: 'corpID:4702',
    });
    assert.strictEqual(r.status, 404);
  });
});

describe('Network Rollups', () => {
  test('GET /api/top-trusted -> 200', async () => {
    const r = await req('GET', '/api/top-trusted');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.entities));
    assert.ok(r.body.entities.length <= 10);
  });
  test('GET /api/top-trusted?entityType=organization&limit=5 -> filters', async () => {
    const r = await req('GET', '/api/top-trusted?entityType=organization&limit=5');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.entities.length <= 5);
    r.body.entities.forEach((e) => assert.strictEqual(e.entityType, 'organization'));
  });
  test('GET /api/by-type/human -> 200', async () => {
    const r = await req('GET', '/api/by-type/human');
    assert.strictEqual(r.status, 200);
    r.body.entities.forEach((e) => assert.strictEqual(e.entityType, 'human'));
  });
  test('GET /api/by-type/organization -> 200', async () => {
    const r = await req('GET', '/api/by-type/organization');
    assert.strictEqual(r.status, 200);
  });
});

describe('Audit', () => {
  test('GET /api/audit -> 200', async () => {
    const r = await req('GET', '/api/audit');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.entries));
  });
  test('GET /api/audit?limit=5 -> respects limit', async () => {
    const r = await req('GET', '/api/audit?limit=5');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.entries.length <= 5);
  });
});
