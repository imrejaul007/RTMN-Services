/**
 * REZ Intelligence Connectors — unit tests (port 5367)
 *
 * 9 connectors: Event, Order, Payment, Auth, Notification, Delivery,
 * Catalog, Search, QR, DOOH, Booking.
 * Plus 3 health endpoints: /health, /health/live, /health/ready
 *
 * Run: node --test __tests__/connectors.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const APP_PORT = 19030;

function req(port: number, path: string, method = 'GET'): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const r = http.request({ hostname: '127.0.0.1', port, path, method, headers: { 'Content-Type': 'application/json' } }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => { try { resolve({ status: res.statusCode || 0, body: JSON.parse(b) }); } catch { resolve({ status: res.statusCode || 0, body: b }); } });
    });
    r.on('error', reject);
    r.end();
  });
}

let app: ReturnType<typeof spawn>;

test('setup', async () => {
  app = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-intelligence-connectors',
    env: { ...process.env, PORT: String(APP_PORT), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  for (let i = 0; i < 50; i++) {
    await wait(200);
    try {
      const r = await req(APP_PORT, '/health');
      if (r.status === 200) return;
    } catch { /* not ready */ }
  }
  throw new Error('connectors did not start in 10s');
});

test('teardown', async () => {
  app.kill('SIGTERM');
  await wait(500);
});

// ── HTTP health endpoints ─────────────────────────────────────────────
test('GET /health returns 200 + service info', async () => {
  const r = await req(APP_PORT, '/health');
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.equal(body.status, 'healthy');
  assert.equal(body.service, 'rez-intelligence-connectors');
  assert.ok(body.timestamp);
  assert.ok(body.uptime !== undefined);
});

test('GET /health/live returns { status: alive }', async () => {
  const r = await req(APP_PORT, '/health/live');
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.equal(body.status, 'alive');
});

test('GET /health/ready returns { status: ready }', async () => {
  const r = await req(APP_PORT, '/health/ready');
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.equal(body.status, 'ready');
});

test('all 3 health endpoints return JSON', async () => {
  for (const p of ['/health', '/health/live', '/health/ready']) {
    const r = await req(APP_PORT, p);
    assert.equal(r.status, 200, `${p} should return 200`);
    assert.equal(typeof r.body, 'object', `${p} should return JSON`);
  }
});

// ── Performance ───────────────────────────────────────────
test('GET /health/live responds in < 50ms', async () => {
  const start = Date.now();
  await req(APP_PORT, '/health/live');
  assert.ok(Date.now() - start < 50, `took ${Date.now() - start}ms`);
});

test('GET /health responds in < 200ms', async () => {
  const start = Date.now();
  await req(APP_PORT, '/health');
  assert.ok(Date.now() - start < 200, `took ${Date.now() - start}ms`);
});

// ── Error handling ─────────────────────────────────────
test('unknown route returns 404', async () => {
  const r = await req(APP_PORT, '/nonexistent');
  assert.equal(r.status, 404);
});

test('POST to /health returns 404', async () => {
  const r = await req(APP_PORT, '/health', 'POST');
  assert.equal(r.status, 404);
});

test('GET to /api/nonexistent returns 404', async () => {
  const r = await req(APP_PORT, '/api/xyz');
  assert.equal(r.status, 404);
});
