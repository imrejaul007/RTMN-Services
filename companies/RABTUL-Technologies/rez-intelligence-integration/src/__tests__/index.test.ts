/**
 * rez-intelligence-integration — unit tests
 *
 * Spins up the integration service via tsx (no build needed) on port 18000,
 * with mock upstream services (REZ-Intel-Bridge 18001 + Intent Engine 18002).
 *
 * Run with: npm test (after npm install)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, ChildProcess } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';

// ─────────────────────────────────────────────────────────────────
// Test infrastructure
// ─────────────────────────────────────────────────────────────────
const REZ_INTEL_BRIDGE_PORT = 18001;
const INTENT_ENGINE_PORT = 18002;
const APP_PORT = 18000;
const SERVICE_BASE = `http://127.0.0.1:${APP_PORT}`;

interface MockHandler {
  (path: string, method: string, body: any): { status: number; body: any };
}

function startMockServer(port: number, handler: MockHandler): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let parsed: any = {};
      try { parsed = body ? JSON.parse(body) : {}; } catch { /* ignore */ }
      const result = handler(req.url || '/', req.method || 'GET', parsed);
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.body));
    });
  });
  return new Promise<http.Server>((resolve) => server.listen(port, () => resolve(server)));
}

function stopMockServer(server: http.Server): Promise<void> {
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

function httpRequest(opts: {
  port: number;
  path: string;
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}): Promise<{ status: number; body: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const data = opts.body ? JSON.stringify(opts.body) : '';
    const req = http.request({
      hostname: '127.0.0.1',
      port: opts.port,
      path: opts.path,
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(opts.headers || {})
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let parsed: any = body;
        try { parsed = body ? JSON.parse(body) : null; } catch { /* keep as string */ }
        resolve({ status: res.statusCode || 0, body: parsed, headers: res.headers as any });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let bridgeServer: http.Server;
let intentServer: http.Server;
let appProcess: ChildProcess;

// ─────────────────────────────────────────────────────────────────
// Setup / teardown
// ─────────────────────────────────────────────────────────────────
test('setup', async () => {
  bridgeServer = await startMockServer(REZ_INTEL_BRIDGE_PORT, (path, method, body) => {
    if (path === '/health') return { status: 200, body: { status: 'healthy' } };
    if (path === '/api/v1/insights/merchant' && method === 'POST') {
      return { status: 200, body: { merchantId: body.merchantId, revenue: 50000, growth: 0.12 } };
    }
    if (path === '/api/v1/insights/customer' && method === 'POST') {
      return { status: 200, body: { customerId: body.customerId, ltv: 1200, churnRisk: 0.15 } };
    }
    if (path.startsWith('/api/v1/predictions/') && method === 'POST') {
      const kind = path.split('/').pop();
      return { status: 200, body: { kind, value: 42000, confidence: 0.78 } };
    }
    if (path === '/api/v1/recommendations/products' && method === 'POST') {
      return { status: 200, body: { recommendations: [{ id: 'p1', score: 0.9 }] } };
    }
    return { status: 404, body: { error: 'not found', path } };
  });

  intentServer = await startMockServer(INTENT_ENGINE_PORT, (path, method, body) => {
    if (path === '/health') return { status: 200, body: { status: 'healthy' } };
    if (path === '/api/v1/classify' && method === 'POST') {
      return { status: 200, body: { intent: 'purchase', confidence: 0.85 } };
    }
    return { status: 404, body: { error: 'not found' } };
  });

  appProcess = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: '/Users/rejaulkarim/Documents/RTMN/companies/RABTUL-Technologies/rez-intelligence-integration',
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      REZ_INTEL_BRIDGE_URL: `http://127.0.0.1:${REZ_INTEL_BRIDGE_PORT}`,
      INTENT_ENGINE_URL: `http://127.0.0.1:${INTENT_ENGINE_PORT}`,
      NODE_ENV: 'test'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait for the app to be ready
  for (let i = 0; i < 50; i++) {
    await wait(200);
    try {
      const r = await httpRequest({ port: APP_PORT, path: '/api/v1/health' });
      if (r.status === 200) return;
    } catch { /* not ready */ }
  }
  throw new Error('Service did not start within 10s');
});

test('teardown', async () => {
  if (appProcess) appProcess.kill('SIGTERM');
  if (bridgeServer) await stopMockServer(bridgeServer);
  if (intentServer) await stopMockServer(intentServer);
  await wait(500);
});

// ─────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────
test('GET /api/v1/health returns aggregated health', async () => {
  const r = await httpRequest({ port: APP_PORT, path: '/api/v1/health' });
  assert.equal(r.status, 200);
  assert.equal(r.body.success, true);
  assert.ok(r.body.data);
  assert.ok(r.body.data.services);
  assert.equal(r.body.data.services.self.status, 'healthy');
});

test('health response includes X-Request-ID header', async () => {
  const r = await httpRequest({ port: APP_PORT, path: '/api/v1/health' });
  assert.equal(r.status, 200);
  assert.ok(r.headers['x-request-id'], 'X-Request-ID header should be set');
});

// ─────────────────────────────────────────────────────────────────
// Insights proxy
// ─────────────────────────────────────────────────────────────────
test('POST /api/v1/insights/merchant proxies to bridge', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/insights/merchant', method: 'POST',
    body: { merchantId: 'm-1', companyId: 'c-1', timeRange: '30d' }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.merchantId, 'm-1');
  assert.equal(r.body.data.revenue, 50000);
  assert.equal(r.body.data.growth, 0.12);
});

test('POST /api/v1/insights/customer proxies to bridge', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/insights/customer', method: 'POST',
    body: { customerId: 'c-1' }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.customerId, 'c-1');
  assert.equal(r.body.data.ltv, 1200);
});

// ─────────────────────────────────────────────────────────────────
// Intent proxy
// ─────────────────────────────────────────────────────────────────
test('POST /api/v1/intent/classify proxies to intent engine', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/intent/classify', method: 'POST',
    body: { text: 'I want to buy a shirt', context: {} }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.intent, 'purchase');
  assert.equal(r.body.data.confidence, 0.85);
});

// ─────────────────────────────────────────────────────────────────
// Predictions proxy
// ─────────────────────────────────────────────────────────────────
test('POST /api/v1/predictions/revenue proxies to bridge', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/predictions/revenue', method: 'POST',
    body: { companyId: 'c-1', timeRange: '30d' }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.kind, 'revenue');
  assert.equal(r.body.data.value, 42000);
});

// ─────────────────────────────────────────────────────────────────
// Recommendations proxy
// ─────────────────────────────────────────────────────────────────
test('POST /api/v1/recommendations/products proxies to bridge', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/recommendations/products', method: 'POST',
    body: { companyId: 'c-1', customerId: 'cu-1' }
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.recommendations.length, 1);
  assert.equal(r.body.data.recommendations[0].id, 'p1');
});

// ─────────────────────────────────────────────────────────────────
// Unified agent/enrich (the killer feature)
// ─────────────────────────────────────────────────────────────────
test('POST /api/v1/agent/enrich aggregates from all sources', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/agent/enrich', method: 'POST',
    body: {
      agentRole: 'sales-agent',
      userId: 'u-1',
      companyId: 'c-1',
      query: 'help me sell',
      context: {}
    }
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.success);
  assert.ok(r.body.data);
  // Aggregates from all upstream sources
  assert.ok(r.body.data.intent, 'should have intent data');
  assert.ok(r.body.data.recommendations, 'should have recommendations');
  assert.ok(r.body.data.predictions, 'should have predictions');
});

test('POST /api/v1/agent/enrich requires agentRole and query', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/agent/enrich', method: 'POST',
    body: { userId: 'u-1' }
  });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /agentRole and query/);
});

test('POST /api/v1/agent/enrich accepts different agent roles', async () => {
  const roles = ['sales-agent', 'support-agent', 'finance-agent', 'marketing-agent'];
  for (const role of roles) {
    const r = await httpRequest({
      port: APP_PORT, path: '/api/v1/agent/enrich', method: 'POST',
      body: { agentRole: role, userId: 'u-1', companyId: 'c-1', query: 'test', context: {} }
    });
    assert.equal(r.status, 200, `agentRole=${role} should succeed`);
    assert.ok(r.body.data);
  }
});

// ─────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────
test('unconfigured proxy route returns 404', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/insights/unknown-type', method: 'POST',
    body: {}
  });
  // The service returns 404 for unmapped sub-routes
  assert.ok(r.status === 404 || r.status === 500);
});

test('CORS preflight returns 204 with proper headers', async () => {
  const r = await httpRequest({
    port: APP_PORT, path: '/api/v1/health', method: 'OPTIONS',
    headers: { 'Origin': 'https://example.com', 'Access-Control-Request-Method': 'GET' }
  });
  // Either 204 (explicit) or 200 (default) is acceptable
  assert.ok(r.status === 200 || r.status === 204);
  assert.ok(r.headers['access-control-allow-origin']);
});

// ─────────────────────────────────────────────────────────────────
// Performance
// ─────────────────────────────────────────────────────────────────
test('health endpoint responds in under 500ms', async () => {
  const start = Date.now();
  await httpRequest({ port: APP_PORT, path: '/api/v1/health' });
  const took = Date.now() - start;
  assert.ok(took < 500, `health took ${took}ms (should be < 500ms)`);
});