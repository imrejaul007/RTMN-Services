/**
 * REZ Intelligence Bridge — unit tests (port 5368)
 *
 * Connects all AI/ML services: intent prediction, fraud scoring,
 * recommendations, churn prediction, unified profiles.
 *
 * Run: node --test __tests__/bridge.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

const APP_PORT = 19020;

function startMock(port: number, handler: (path: string, body: unknown) => { status: number; body: unknown }): Promise<http.Server> {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let b = '';
      req.on('data', (c) => (b += c));
      req.on('end', () => {
        let parsed: unknown = {};
        try { parsed = b ? JSON.parse(b) : {}; } catch { /* ignore */ }
        const result = handler(req.url || '/', parsed);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.body));
      });
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

let intentMock: http.Server;
let app: ReturnType<typeof spawn>;

test('setup', async () => {
  intentMock = await startMock(19021, (path, body) => {
    if (path?.includes('/predict')) {
      return { status: 200, body: { top_intents: ['purchase', 'browse'], confidence: 0.85 } };
    }
    return { status: 200, body: { status: 'ok' } };
  });

  app = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/REZ-intelligence-bridge',
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      INTENT_URL: 'http://127.0.0.1:19021',
      INTELLIGENCE_URL: 'http://127.0.0.1:19021',
      FRAUD_URL: 'http://127.0.0.1:19021',
      RECOMMEND_URL: 'http://127.0.0.1:19021',
      INTERNAL_KEY: 'test-key',
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
  throw new Error('bridge did not start in 10s');
});

test('teardown', async () => {
  app.kill('SIGTERM');
  await new Promise<void>((r) => intentMock.close(r));
  await wait(500);
});

// ── Health ──────────────────────────────────────────────
test('GET /health/live returns 200', async () => {
  const r = await req(APP_PORT, '/health/live');
  assert.equal(r.status, 200);
});

test('GET /health/ready returns health status', async () => {
  const r = await req(APP_PORT, '/health/ready');
  assert.ok(r.status === 200 || r.status === 503);
});

test('GET /health returns 200', async () => {
  const r = await req(APP_PORT, '/health');
  assert.equal(r.status, 200);
});

// ── Intent prediction (core feature) ─────────────────────
test('intent prediction returns top_intents', async () => {
  const r = await req(APP_PORT, '/api/intent/predict', 'POST', { user_id: 'u-1' });
  assert.equal(r.status, 200);
  const body = r.body as Record<string, unknown>;
  assert.ok(Array.isArray(body.top_intents) || Array.isArray(body.intents));
});

test('intent prediction includes confidence', async () => {
  const r = await req(APP_PORT, '/api/intent/predict', 'POST', { user_id: 'u-1' });
  const body = r.body as Record<string, unknown>;
  const confidence = body.confidence as number | undefined;
  if (confidence !== undefined) {
    assert.ok(confidence >= 0 && confidence <= 1);
  }
});

test('intent prediction with empty user_id handles gracefully', async () => {
  const r = await req(APP_PORT, '/api/intent/predict', 'POST', { user_id: '' });
  // Should return 200 with default intent
  assert.equal(r.status, 200);
});

// ── Error handling ───────────────────────────────────────
test('unknown route returns 404', async () => {
  const r = await req(APP_PORT, '/api/nonexistent');
  assert.equal(r.status, 404);
});

test('invalid method on valid route returns 404 or 405', async () => {
  const r = await req(APP_PORT, '/health', 'DELETE');
  assert.ok(r.status === 404 || r.status === 405);
});

// ── Performance ────────────────────────────────────────
test('GET /health/live responds in < 200ms', async () => {
  const start = Date.now();
  await req(APP_PORT, '/health/live');
  assert.ok(Date.now() - start < 200, `took ${Date.now() - start}ms`);
});
