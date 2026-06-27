/**
 * HOJAI AI - Agent Reputation Service
 * Unit Tests — node --test
 */

const { test, before } = require('node:test');
const assert = require('node:assert');
const { createServer } = require('node:http');

process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';

let BASE;
let app;

before(async () => {
  app = require('../../src/index.js');
  const srv = createServer(app);
  await new Promise(res => srv.listen(0, res));
  const { port } = srv.address();
  BASE = `http://localhost:${port}`;
});

function authHeaders(extras = {}) {
  return { 'x-internal-token': 'dev-token', 'content-type': 'application/json', ...extras };
}

// ── Health & Lifecycle ────────────────────────────────────────────────────────

test('GET /health returns service info', async () => {
  const r = await fetch(`${BASE}/health`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.service, 'Agent Reputation Service');
  assert.ok(typeof b.stats.totalAgents === 'number');
});

test('GET /ready returns 200', async () => {
  const r = await fetch(`${BASE}/ready`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.ready, true);
});

test('GET /unknown returns 404', async () => {
  const r = await fetch(`${BASE}/does-not-exist`);
  assert.strictEqual(r.status, 404);
});

// ── Reputation CRUD ──────────────────────────────────────────────────────────

test('POST /api/reputation creates a reputation record', async () => {
  const r = await fetch(`${BASE}/api/reputation`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ agentId: 'agent-001', agentType: 'merchant' }),
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.strictEqual(b.agentId, 'agent-001');
  assert.strictEqual(b.agentType, 'merchant');
  assert.ok(typeof b.overall === 'number');
  assert.ok(Array.isArray(b.badges));
});

test('POST /api/reputation 400 when agentId missing', async () => {
  const r = await fetch(`${BASE}/api/reputation`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ agentType: 'merchant' }),
  });
  assert.strictEqual(r.status, 400);
});

test('GET /api/reputation/:agentId returns record', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.agentId, 'agent-001');
});

test('GET /api/reputation/:agentId 404 for unknown', async () => {
  const r = await fetch(`${BASE}/api/reputation/unknown-agent`);
  assert.strictEqual(r.status, 404);
});

test('GET /api/reputation/:agentId/trust returns trust score', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/trust`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.agentId, 'agent-001');
  assert.ok(typeof b.trustScore === 'number');
  assert.ok(typeof b.level === 'string');
});

// ── Transactions ─────────────────────────────────────────────────────────────

test('POST /api/reputation/:agentId/transactions records a transaction', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ success: true, volume: 100, responseTime: 1.5, type: 'payment' }),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.transaction);
  assert.ok(b.reputation);
});

test('GET /api/reputation/:agentId/transactions returns history', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/transactions`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(typeof b.total === 'number');
  assert.ok(Array.isArray(b.transactions));
});

test('GET /api/reputation/:agentId/transactions?limit= filters', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/transactions?limit=1`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.transactions.length <= 1);
});

// ── Disputes ─────────────────────────────────────────────────────────────────

test('POST /api/reputation/:agentId/disputes records a dispute', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/disputes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason: 'item not delivered', severity: 'high', disputedBy: 'buyer-1' }),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.dispute);
  assert.ok(b.reputation);
});

test('POST /api/reputation/:agentId/disputes 400 when reason missing', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/disputes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  assert.strictEqual(r.status, 400);
});

// ── Block/Unblock ────────────────────────────────────────────────────────────

test('POST /api/reputation/:agentId/block blocks agent', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/block`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason: 'spam' }),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.blocked, true);
  assert.strictEqual(b.blockReason, 'spam');
});

test('POST /api/reputation/:agentId/unblock unblocks agent', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/unblock`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.blocked, false);
});

test('POST /api/reputation/:agentId/block 404 for unknown agent', async () => {
  const r = await fetch(`${BASE}/api/reputation/unknown-agent/block`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reason: 'spam' }),
  });
  assert.strictEqual(r.status, 404);
});

// ── Verify ──────────────────────────────────────────────────────────────────

test('POST /api/reputation/:agentId/verify verifies agent', async () => {
  const r = await fetch(`${BASE}/api/reputation/agent-001/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.verified, true);
  assert.ok(b.verifiedAt);
});

// ── Leaderboard & Stats ───────────────────────────────────────────────────────

test('GET /api/leaderboard returns ranked agents', async () => {
  const r = await fetch(`${BASE}/api/leaderboard`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.leaderboard));
});

test('GET /api/leaderboard?type= filters by agent type', async () => {
  const r = await fetch(`${BASE}/api/leaderboard?type=merchant`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.leaderboard.forEach(a => assert.strictEqual(a.agentType, 'merchant'));
});

test('GET /api/stats returns network stats', async () => {
  const r = await fetch(`${BASE}/api/stats`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(typeof b.totalAgents === 'number');
  assert.ok(typeof b.avgTrustScore === 'string');
  assert.ok(typeof b.byLevel === 'object');
});

// ── Auth ─────────────────────────────────────────────────────────────────────

test('POST /api/reputation without auth → 401', async () => {
  const r = await fetch(`${BASE}/api/reputation`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ agentId: 'x', agentType: 'merchant' }),
  });
  assert.strictEqual(r.status, 401);
});

test('GET /api/leaderboard without auth → 200 (public)', async () => {
  const r = await fetch(`${BASE}/api/leaderboard`);
  assert.strictEqual(r.status, 200);
});
