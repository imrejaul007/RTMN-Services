/**
 * REE Trust Platform — unit tests (port 3001)
 *
 * Tests the trust scoring + fraud signal aggregation service.
 * Run: node --test __tests__/trust.test.ts
 *
 * Endpoints:
 *   GET  /health                        — service health
 *   GET  /api/trust/:entityType/:entityId  — get trust score
 *   POST /api/trust/calculate           — calculate trust from factors
 *   GET  /api/trust/:entityType/:entityId/history
 *   POST /api/fraud/signals            — record fraud signal
 *   GET  /api/fraud/signals            — list fraud signals
 *   GET  /api/fraud/entity/:type/:id    — fraud history for entity
 *   POST /api/risk/assess              — risk assessment
 *   POST /api/reputation/:type/:id/events — record reputation event
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const APP_PORT = 19001;

function startMockUpstream(port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', upstream: port }));
      });
    });
    s.listen(port, () => resolve(s));
  });
}

function stopServer(s: http.Server): Promise<void> {
  return new Promise((r) => s.close(r));
}

function req(opts: {
  port: number; path: string; method?: string; body?: unknown;
}): Promise<{ status: number; body: unknown; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const data = opts.body ? JSON.stringify(opts.body) : '';
    const r = http.request({
      hostname: '127.0.0.1', port: opts.port, path: opts.path,
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        let parsed: unknown = b;
        try { parsed = JSON.parse(b); } catch { /* not json */ }
        resolve({ status: res.statusCode || 0, body: parsed, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

let upstream: http.Server;
let app: ReturnType<typeof spawn>;

test('setup', async () => {
  upstream = await startMockUpstream(19002);
  // Spawn the service
  app = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/Users/rejaulkarim/Documents/RTMN/companies/RTNM-REE/trust-platform',
    env: { ...process.env, PORT: String(APP_PORT), UPSTREAM_URL: 'http://127.0.0.1:19002', NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  // Wait for ready
  for (let i = 0; i < 50; i++) {
    await wait(200);
    try {
      const r = await req({ port: APP_PORT, path: '/health' });
      if (r.status === 200) return;
    } catch { /* not ready */ }
  }
  throw new Error('trust-platform did not start in 10s');
});

test('teardown', async () => {
  app.kill('SIGTERM');
  await stopServer(upstream);
  await wait(500);
});

// ── Health ──────────────────────────────────────────────────────────
test('GET /health returns 200', async () => {
  const r = await req({ port: APP_PORT, path: '/health' });
  assert.equal(r.status, 200);
  assert.ok(r.body && typeof r.body === 'object');
});

// ── Trust scoring ─────────────────────────────────────────────────
test('GET /api/trust/:entityType/:entityId returns trust score', async () => {
  const r = await req({ port: APP_PORT, path: '/api/trust/merchant/m-1' });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.ok(body);
});

test('POST /api/trust/calculate computes score from factors', async () => {
  const factors = [
    { name: 'successful_transactions', impact: 50, weight: 2 },
    { name: 'response_time', impact: 20, weight: 1 },
    { name: 'dispute_rate', impact: -30, weight: 1 },
  ];
  const r = await req({
    port: APP_PORT, path: '/api/trust/calculate', method: 'POST',
    body: { factors }
  });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.equal(typeof body.score, 'number');
  // Base 500 + (50*2 + 20*1 + -30*1) = 500 + 100 + 20 - 30 = 590
  assert.ok(body.score as number >= 0 && body.score as number <= 1000);
});

test('trust score capped at 0 and 1000', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/trust/calculate', method: 'POST',
    body: { factors: [{ name: 'x', impact: 9999, weight: 10 }] }
  });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  const score = body.score as number;
  assert.ok(score <= 1000, `score ${score} should be ≤ 1000`);
  assert.ok(score >= 0, `score ${score} should be ≥ 0`);
});

test('GET /api/trust/:type/:id/history returns array', async () => {
  const r = await req({ port: APP_PORT, path: '/api/trust/merchant/m-1/history' });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray((r.body as Record<string, unknown>).history));
});

// ── Fraud signals ────────────────────────────────────────────────
test('POST /api/fraud/signals records a fraud signal', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/fraud/signals', method: 'POST',
    body: { entityType: 'merchant', entityId: 'm-suspect', signalType: 'chargeback_spike', severity: 'high', details: { amount: 5000 } }
  });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.equal(body.signalType, 'chargeback_spike');
  assert.equal(body.severity, 'high');
});

test('GET /api/fraud/signals lists signals', async () => {
  const r = await req({ port: APP_PORT, path: '/api/fraud/signals' });
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body));
});

test('GET /api/fraud/entity/:type/:id returns entity fraud history', async () => {
  const r = await req({ port: APP_PORT, path: '/api/fraud/entity/merchant/m-suspect' });
  assert.equal(r.status, 200);
});

test('POST /api/fraud/signals validates required fields', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/fraud/signals', method: 'POST',
    body: { entityType: 'merchant' }  // missing entityId, signalType, severity
  });
  // Should 400 or 500 depending on validation
  assert.ok(r.status >= 400);
});

// ── Risk assessment ───────────────────────────────────────────────
test('POST /api/risk/assess returns risk level', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/risk/assess', method: 'POST',
    body: { entityType: 'merchant', entityId: 'm-1', factors: [] }
  });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.ok(body.assessmentId);
  assert.ok(body.riskLevel);
});

test('risk level is one of the expected values', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/risk/assess', method: 'POST',
    body: { entityType: 'merchant', entityId: 'm-1', factors: [] }
  });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  const level = body.riskLevel as string;
  assert.ok(['very_low', 'low', 'medium', 'high', 'very_high'].includes(level),
    `riskLevel "${level}" should be one of very_low/low/medium/high/very_high`);
});

// ── Reputation events ───────────────────────────────────────────
test('POST /api/reputation/:type/:id/events records event', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/reputation/merchant/m-1/events', method: 'POST',
    body: { eventType: 'transaction_success', impact: 10 }
  });
  assert.equal(r.status, 200);
});

// ── Error handling ──────────────────────────────────────────────
test('unknown route returns 404', async () => {
  const r = await req({ port: APP_PORT, path: '/api/nonexistent/route' });
  assert.equal(r.status, 404);
});

test('POST /api/trust/calculate with no factors returns 200', async () => {
  const r = await req({
    port: APP_PORT, path: '/api/trust/calculate', method: 'POST',
    body: { factors: [] }
  });
  assert.equal(r.status, 200);
});

// ── Performance ──────────────────────────────────────────────────
test('GET /health responds in < 200ms', async () => {
  const start = Date.now();
  await req({ port: APP_PORT, path: '/health' });
  assert.ok(Date.now() - start < 200, `health took ${Date.now() - start}ms (should be < 200ms)`);
});
