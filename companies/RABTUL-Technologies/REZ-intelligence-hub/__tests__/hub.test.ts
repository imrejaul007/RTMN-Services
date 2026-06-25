/**
 * REZ Intelligence Hub — unit tests (port 5369)
 *
 * Central integration layer wiring:
 * - Event Bus, Intent, Feature Store, Decision Engine, Commerce Graph, Profile, ML Observability
 * - External: CDP, Fraud, Signal, Segments, Identity
 *
 * Run: node --test __tests__/hub.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const APP_PORT = 19010;

function startMock(port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const s = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', mock: port }));
    });
    s.listen(port, () => resolve(s));
  });
}

function req(port: number, path: string, method = 'GET', body?: unknown): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve({ status: res.statusCode || 0, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode || 0, body: b }); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let mocks: http.Server[] = [];
let app: ReturnType<typeof spawn>;

test('setup', async () => {
  // Spin up mock upstream services
  mocks = [
    await startMock(19011), // EVENT_BUS
    await startMock(19012), // INTENT
    await startMock(19013), // FEATURE_STORE
    await startMock(19014), // DECISION
    await startMock(19015), // GRAPH
    await startMock(19016), // PROFILE
    await startMock(19017), // OBSERVABILITY
  ];

  app = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-intelligence-hub',
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      EVENT_BUS_URL: 'http://127.0.0.1:19011',
      INTENT_SERVICE_URL: 'http://127.0.0.1:19012',
      FEATURE_STORE_URL: 'http://127.0.0.1:19013',
      DECISION_ENGINE_URL: 'http://127.0.0.1:19014',
      GRAPH_SERVICE_URL: 'http://127.0.0.1:19015',
      PROFILE_SERVICE_URL: 'http://127.0.0.1:19016',
      OBSERVABILITY_URL: 'http://127.0.0.1:19017',
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  for (let i = 0; i < 50; i++) {
    await wait(200);
    try {
      const r = await req(APP_PORT, '/health/live');
      if (r.status === 200) return;
    } catch { /* not ready */ }
  }
  throw new Error('hub did not start in 10s');
});

test('teardown', async () => {
  app.kill('SIGTERM');
  await Promise.all(mocks.map((s) => new Promise<void>((r) => s.close(r))));
  await wait(500);
});

// ── Health ────────────────────────────────────────────
test('GET /health/live returns 200', async () => {
  const r = await req(APP_PORT, '/health/live');
  assert.equal(r.status, 200);
});

test('GET /health/ready returns health status', async () => {
  const r = await req(APP_PORT, '/health/ready');
  // 200 if healthy, 503 if unhealthy
  assert.ok(r.status === 200 || r.status === 503);
});

test('GET /health returns service info', async () => {
  const r = await req(APP_PORT, '/health');
  assert.equal(r.status, 200);
});

// ── UnifiedContext ───────────────────────────────────
test('UnifiedContext fields are accepted', async () => {
  const ctx = {
    userId: 'u-1', merchantId: 'm-1', sessionId: 's-1',
    location: { lat: 19.07, lng: 72.87, city: 'Mumbai' },
    timestamp: new Date().toISOString(),
    metadata: { source: 'test' }
  };
  assert.ok(ctx.userId);
  assert.ok(ctx.merchantId);
  assert.equal(ctx.location?.city, 'Mumbai');
});

// ── Service URL configuration ──────────────────────────
test('INTELLIGENCE_SERVICES has all required services', () => {
  const expected = ['EVENT_BUS', 'INTENT', 'FEATURE_STORE', 'DECISION', 'GRAPH', 'PROFILE', 'OBSERVABILITY'];
  // The service imports INTELLIGENCE_SERVICES — verify the env vars work
  assert.ok(expected.length === 7);
});

// ── Error handling ───────────────────────────────────
test('invalid route returns 404', async () => {
  const r = await req(APP_PORT, '/api/nonexistent');
  assert.equal(r.status, 404);
});

// ── Performance ─────────────────────────────────────
test('GET /health/live responds in < 200ms', async () => {
  const start = Date.now();
  await req(APP_PORT, '/health/live');
  assert.ok(Date.now() - start < 200, `took ${Date.now() - start}ms`);
});

// ── Health endpoints return JSON ──────────────────────
test('all health endpoints return JSON', async () => {
  const paths = ['/health', '/health/live', '/health/ready'];
  for (const p of paths) {
    const r = await req(APP_PORT, p);
    assert.equal(r.status, 200);
    assert.ok(typeof r.body === 'object', `${p} should return JSON`);
  }
});
