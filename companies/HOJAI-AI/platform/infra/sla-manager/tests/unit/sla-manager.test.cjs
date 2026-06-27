/**
 * HOJAI AI - SLA Manager
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
  assert.strictEqual(b.status, 'healthy');
  assert.strictEqual(b.service, 'sla-manager');
  assert.ok(typeof b.policies === 'number');
  assert.ok(typeof b.agreements === 'number');
});

test('GET /ready returns 200', async () => {
  const r = await fetch(`${BASE}/ready`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.ready, true);
});

test('GET /unknown returns 404', async () => {
  const r = await fetch(`${BASE}/unknown`);
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error);
});

// ── Policies ────────────────────────────────────────────────────────────────

test('GET /api/policies returns seeded policies', async () => {
  const r = await fetch(`${BASE}/api/policies`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.policies));
  assert.ok(b.total >= 3);
  const tiers = b.policies.map(p => p.tier);
  assert.ok(tiers.includes('gold'));
  assert.ok(tiers.includes('silver'));
  assert.ok(tiers.includes('bronze'));
});

test('GET /api/policies?tier=gold filters by tier', async () => {
  const r = await fetch(`${BASE}/api/policies?tier=gold`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.policies.forEach(p => assert.strictEqual(p.tier, 'gold'));
});

test('GET /api/policies/:id returns known policy', async () => {
  const r = await fetch(`${BASE}/api/policies/policy-1`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.id, 'policy-1');
  assert.strictEqual(b.tier, 'gold');
});

test('GET /api/policies/:id 404 for unknown', async () => {
  const r = await fetch(`${BASE}/api/policies/nonexistent`);
  assert.strictEqual(r.status, 404);
});

test('POST /api/policies creates a new policy', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'Platinum Support', tier: 'platinum', responseTime: 0.5, resolutionTime: 2, price: 1999 })
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.id.startsWith('policy-'));
  assert.strictEqual(b.name, 'Platinum Support');
  assert.strictEqual(b.tier, 'platinum');
});

test('POST /api/policies 400 when name is missing', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ tier: 'bronze' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('required'));
});

test('PUT /api/policies/:id updates a policy', async () => {
  const r = await fetch(`${BASE}/api/policies/policy-1`, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({ name: 'Gold Support Updated', responseTime: 2 })
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.name, 'Gold Support Updated');
  assert.strictEqual(b.responseTime, 2);
});

test('DELETE /api/policies/:id removes a policy', async () => {
  // Create one to delete
  const cr = await fetch(`${BASE}/api/policies`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ name: 'Temp Policy', tier: 'bronze' })
  });
  const { id } = await cr.json();
  const dr = await fetch(`${BASE}/api/policies/${id}`, { method: 'DELETE', headers: authHeaders() });
  assert.strictEqual(dr.status, 200);
  const db = await dr.json();
  assert.ok(db.message);
  // Verify gone
  const gr = await fetch(`${BASE}/api/policies/${id}`);
  assert.strictEqual(gr.status, 404);
});

// ── Agreements ────────────────────────────────────────────────────────────────

test('GET /api/agreements returns seeded agreements', async () => {
  const r = await fetch(`${BASE}/api/agreements`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.agreements));
  assert.ok(b.total >= 3);
});

test('GET /api/agreements?customerId= filters', async () => {
  const r = await fetch(`${BASE}/api/agreements?customerId=cust-1`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.agreements.forEach(a => assert.strictEqual(a.customerId, 'cust-1'));
});

test('GET /api/agreements/:id returns agreement with policy', async () => {
  const r = await fetch(`${BASE}/api/agreements/agr-1`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.id, 'agr-1');
  assert.ok(b.policy);
  assert.strictEqual(b.policy.tier, 'gold');
});

test('POST /api/agreements creates an agreement', async () => {
  const r = await fetch(`${BASE}/api/agreements`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ customerId: 'cust-new', customerName: 'New Corp', policyId: 'policy-2', startDate: '2025-01-01', endDate: '2026-01-01' })
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.id.startsWith('agr-'));
  assert.strictEqual(b.customerId, 'cust-new');
  assert.strictEqual(b.status, 'active');
});

test('POST /api/agreements 400 when customerId is missing', async () => {
  const r = await fetch(`${BASE}/api/agreements`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ policyId: 'policy-1' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('required'));
});

test('PUT /api/agreements/:id updates agreement status', async () => {
  const r = await fetch(`${BASE}/api/agreements/agr-2`, {
    method: 'PUT', headers: authHeaders(),
    body: JSON.stringify({ status: 'suspended' })
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.status, 'suspended');
});

// ── Breaches ────────────────────────────────────────────────────────────────

test('GET /api/breaches returns breach list', async () => {
  const r = await fetch(`${BASE}/api/breaches`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(Array.isArray(b.breaches));
});

test('GET /api/breaches?resolved=false filters', async () => {
  const r = await fetch(`${BASE}/api/breaches?resolved=false`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.breaches.forEach(br => assert.strictEqual(br.resolved, false));
});

test('POST /api/breaches creates a breach record', async () => {
  const r = await fetch(`${BASE}/api/breaches`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ agreementId: 'agr-1', type: 'response_time', severity: 'high', description: 'Response delayed' })
  });
  assert.strictEqual(r.status, 201);
  const b = await r.json();
  assert.ok(b.id.startsWith('brch-'));
  assert.strictEqual(b.type, 'response_time');
  assert.strictEqual(b.severity, 'high');
  assert.strictEqual(b.resolved, false);
});

test('POST /api/breaches 400 when agreementId is missing', async () => {
  const r = await fetch(`${BASE}/api/breaches`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ type: 'response_time' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('required'));
});

test('POST /api/breaches/:id/resolve marks breach resolved', async () => {
  // Create one to resolve
  const cr = await fetch(`${BASE}/api/breaches`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ agreementId: 'agr-1', type: 'resolution_time', severity: 'medium' })
  });
  const { id } = await cr.json();
  const rr = await fetch(`${BASE}/api/breaches/${id}/resolve`, { method: 'POST', headers: authHeaders() });
  assert.strictEqual(rr.status, 200);
  const rb = await rr.json();
  assert.strictEqual(rb.resolved, true);
  assert.ok(rb.resolvedAt);
});

// ── Compliance ──────────────────────────────────────────────────────────────

test('GET /api/agreements/:id/compliance returns compliance metrics', async () => {
  const r = await fetch(`${BASE}/api/agreements/agr-1/compliance`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.agreementId, 'agr-1');
  assert.ok(typeof b.complianceRate === 'string');
  assert.ok(b.complianceRate.endsWith('%'));
  assert.ok(b.policy);
});

test('GET /api/agreements/:id/compliance 404 for unknown agreement', async () => {
  const r = await fetch(`${BASE}/api/agreements/nonexistent/compliance`);
  assert.strictEqual(r.status, 404);
});

// ── Statistics ──────────────────────────────────────────────────────────────

test('GET /api/statistics returns aggregate stats', async () => {
  const r = await fetch(`${BASE}/api/statistics`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(typeof b.totalPolicies === 'number');
  assert.ok(typeof b.totalAgreements === 'number');
  assert.ok(typeof b.avgComplianceRate === 'string');
  assert.ok(typeof b.byTier === 'object');
  assert.ok(typeof b.financialImpact === 'number');
});

// ── Auth ───────────────────────────────────────────────────────────────────

test('POST /api/policies without auth → 401', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x', tier: 'bronze' })
  });
  assert.strictEqual(r.status, 401);
});
