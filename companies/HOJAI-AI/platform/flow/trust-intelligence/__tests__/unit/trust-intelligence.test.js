/**
 * trust-intelligence - vitest unit tests
 */
'use strict';

process.env.TRUST_INTELLIGENCE_NO_LISTEN = '1';
process.env.TRUST_INTELLIGENCE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const path = require('path');

let app;
beforeAll(async () => {
  const mod = await import(path.resolve(__dirname, '../../src/index.js'));
  app = mod.app || mod.default;
});

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Health', () => {
  test('GET /health returns ok', async () => {
    const res = await req('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Trust scoring', () => {
  test('POST /api/agents/:id/trust/score records event', async () => {
    const res = await req('POST', '/api/agents/agent-1/trust/score', {
      source: 'observation', score: 80
    });
    expect(res.status).toBe(201);
    expect(typeof res.body.effectiveTrust).toBe('number');
    expect(res.body.level).toBeDefined();
  });
  test('rejects invalid source (400)', async () => {
    const res = await req('POST', '/api/agents/agent-1/trust/score', {
      source: 'invalid', score: 80
    });
    expect(res.status).toBe(400);
  });
  test('rejects out-of-range score (400)', async () => {
    const res = await req('POST', '/api/agents/agent-1/trust/score', {
      source: 'observation', score: 150
    });
    expect(res.status).toBe(400);
  });
  test('GET /api/agents/:id/trust/score returns trust info', async () => {
    const res = await req('GET', '/api/agents/agent-1/trust/score');
    expect(res.status).toBe(200);
    expect(res.body.effectiveTrust).toBeDefined();
  });
  test('GET /api/agents/:id/trust/history returns events', async () => {
    const res = await req('GET', '/api/agents/agent-1/trust/history');
    expect(res.status).toBe(200);
  });
  test('GET /api/agents/:id/trust/decay returns decay info', async () => {
    const res = await req('GET', '/api/agents/agent-1/trust/decay');
    expect(res.status).toBe(200);
  });
});

describe('Bulk + levels', () => {
  test('POST /api/agents/bulk/score scores multiple', async () => {
    const res = await req('POST', '/api/agents/bulk/score', {
      agentIds: ['agent-1', 'agent-2']
    });
    expect([200, 201]).toContain(res.status);
  });
  test('GET /api/trust/levels returns thresholds', async () => {
    const res = await req('GET', '/api/trust/levels');
    expect(res.status).toBe(200);
  });
});

describe('Reputation', () => {
  test('POST + GET /api/agents/:id/reputation', async () => {
    let res = await req('POST', '/api/agents/agent-2/reputation', { type: 'positive', weight: 1 });
    expect([200, 201]).toContain(res.status);
    res = await req('GET', '/api/agents/agent-2/reputation');
    expect(res.status).toBe(200);
  });
  test('GET /api/agents/top-trusted returns leaderboard', async () => {
    const res = await req('GET', '/api/agents/top-trusted');
    expect(res.status).toBe(200);
  });
});

describe('Risk flags', () => {
  test('POST /api/agents/:id/risk/flag adds flag', async () => {
    const res = await req('POST', '/api/agents/agent-3/risk/flag', {
      severity: 7, reason: 'test'
    });
    expect([200, 201]).toContain(res.status);
  });
  test('GET /api/agents/:id/risk returns flags', async () => {
    const res = await req('GET', '/api/agents/agent-3/risk');
    expect(res.status).toBe(200);
  });
  test('POST /api/agents/:id/risk/clear clears flags', async () => {
    const res = await req('POST', '/api/agents/agent-3/risk/clear', {});
    expect([200, 201]).toContain(res.status);
  });
});

describe('Confidence + edges', () => {
  test('POST + GET /api/agents/:id/confidence', async () => {
    let res = await req('POST', '/api/agents/agent-4/confidence', {
      confidence: 0.8, correct: true
    });
    expect([200, 201]).toContain(res.status);
    res = await req('GET', '/api/agents/agent-4/confidence');
    expect(res.status).toBe(200);
  });
  test('POST /api/trust/edges adds edge', async () => {
    const res = await req('POST', '/api/trust/edges', {
      trusterId: 'agent-1', trusteeId: 'agent-2', weight: 0.5
    });
    expect([200, 201]).toContain(res.status);
  });
});

describe('Analytics', () => {
  test('GET /api/analytics/distribution', async () => {
    const res = await req('GET', '/api/analytics/distribution');
    expect(res.status).toBe(200);
  });
  test('GET /api/analytics/reliability', async () => {
    const res = await req('GET', '/api/analytics/reliability');
    expect(res.status).toBe(200);
  });
  test('GET /api/analytics/leaderboard', async () => {
    const res = await req('GET', '/api/analytics/leaderboard');
    expect(res.status).toBe(200);
  });
});

describe('Models + sync', () => {
  test('POST + GET /api/models/:id/trust', async () => {
    let res = await req('POST', '/api/models/model-x/trust', {
      accuracy: 0.95, calibration: 0.9, sampleSize: 100
    });
    expect([200, 201]).toContain(res.status);
    res = await req('GET', '/api/models/model-x/trust');
    expect(res.status).toBe(200);
  });
});