/**
 * HOJAI AI - Compliance Engine
 * Unit Tests — node --test
 */

import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from 'node:http';
import { Buffer } from 'node:buffer';

// ESM dynamic import
// Must set env BEFORE importing the module (module evaluates top-level at load time)
process.env.COMPLIANCE_LIMIT = '1000';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'false';
// Set a fixed SERVICE_TOKEN so our test header matches
process.env.COMPLIANCE_SERVICE_TOKEN = 'eyJzZXJ2aWNlIjoiY29tcGxpYW5jZS1lbmdpbmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODI1MTg2NjQ3MzQsImV4cCI6MTgxNDA1NDY2NDczNH0=';

const SVC = JSON.stringify({ service: 'compliance-engine', role: 'admin', iat: 1782518664734, exp: 1814054664734 });
const SVC_TOKEN = 'eyJzZXJ2aWNlIjoiY29tcGxpYW5jZS1lbmdpbmUiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3ODI1MTg2NjQ3MzQsImV4cCI6MTgxNDA1NDY2NDczNH0=';

let BASE;
let app;

before(async () => {
  const mod = await import('../../src/index.js');
  app = mod.default;
  const srv = createServer(app);
  await new Promise(res => srv.listen(0, res));
  const { port } = srv.address();
  BASE = `http://localhost:${port}`;
  await new Promise(r => setTimeout(r, 50));
});

function authHeaders(extras = {}) {
  return { 'x-internal-token': 'dev-token', 'x-service-token': SVC_TOKEN, 'content-type': 'application/json', ...extras };
}

// ── Health & Lifecycle ────────────────────────────────────────────────────────

test('GET /health returns service info', async () => {
  const r = await fetch(`${BASE}/health`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.status, 'healthy');
  assert.strictEqual(b.service, 'compliance-engine');
  assert.ok(typeof b.counts === 'object');
  assert.strictEqual(b.counts.controls, 32); // 10 GDPR + 7 SOC2 + 4 HIPAA + 6 PCI + 5 ISO
});

test('GET /ready returns 200', async () => {
  const r = await fetch(`${BASE}/ready`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.ready, true);
});

test('GET / redirects to /health', async () => {
  const r = await fetch(`${BASE}/`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.status, 'healthy');
});

// ── Frameworks ────────────────────────────────────────────────────────────────

test('GET /api/frameworks returns all 5 frameworks', async () => {
  const r = await fetch(`${BASE}/api/frameworks`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.count, 5);
  const ids = b.frameworks.map(f => f.id).sort();
  assert.deepStrictEqual(ids, ['gdpr', 'hipaa', 'iso27001', 'pci-dss', 'soc2']);
});

test('GET /api/frameworks/:id/controls returns controls for known framework', async () => {
  const r = await fetch(`${BASE}/api/frameworks/gdpr/controls`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.framework, 'gdpr');
  assert.strictEqual(b.count, 10);
  assert.strictEqual(b.controls[0].id, 'gdpr.art5');
});

test('GET /api/frameworks/:id/controls 404 for unknown framework', async () => {
  const r = await fetch(`${BASE}/api/frameworks/nonexistent/controls`);
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('not found'));
});

test('GET /api/frameworks/:id/snapshot returns full readiness report', async () => {
  const r = await fetch(`${BASE}/api/frameworks/soc2/snapshot`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.summary.framework, 'soc2');
  assert.strictEqual(b.summary.total, 7);
  assert.strictEqual(b.summary.uncovered, 7); // no policies/evidence yet
  assert.strictEqual(b.summary.readiness, 0);
  assert.ok(Array.isArray(b.controls));
  assert.strictEqual(b.controls.length, 7);
  b.controls.forEach(c => assert.strictEqual(c.status, 'uncovered'));
});

test('GET /api/frameworks/hipaa/snapshot with no coverage shows 0 readiness', async () => {
  const r = await fetch(`${BASE}/api/frameworks/hipaa/snapshot`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.summary.total, 4);
  assert.strictEqual(b.summary.readiness, 0);
});

// ── Controls (read-only index) ────────────────────────────────────────────────

test('GET /api/controls returns all 35 indexed controls', async () => {
  const r = await fetch(`${BASE}/api/controls`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.count, 32);
  assert.ok(b.controls.length >= 32);
  const found = b.controls.find(c => c.id === 'gdpr.art32');
  assert.ok(found);
  assert.strictEqual(found.framework, 'gdpr');
  assert.strictEqual(found.severity, 'high');
});

test('GET /api/controls/:id returns known control', async () => {
  const r = await fetch(`${BASE}/api/controls/soc2.cc6`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.id, 'soc2.cc6');
  assert.strictEqual(b.framework, 'soc2');
  assert.strictEqual(b.severity, 'critical');
});

test('GET /api/controls/:id 404 for unknown control', async () => {
  const r = await fetch(`${BASE}/api/controls/unknown.ctrl`);
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('not found'));
});

// ── Policies (require auth) ──────────────────────────────────────────────────

test('POST /api/policies creates a policy covering multiple controls', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'Data Retention Policy', controlIds: ['gdpr.art5', 'gdpr.art17'], evidenceTypes: ['logs', 'audit'] })
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.id.startsWith('cmp-pol-'));
  assert.strictEqual(b.name, 'Data Retention Policy');
  assert.deepStrictEqual(b.controlIds, ['gdpr.art5', 'gdpr.art17']);
});

test('POST /api/policies 400 when name is missing', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ controlIds: ['gdpr.art5'] })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('name'));
});

test('POST /api/policies 400 when controlId is unknown', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name: 'Bad Policy', controlIds: ['fake.ctrl'] })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.includes('unknown controlId'));
});

test('GET /api/policies lists all policies', async () => {
  const r = await fetch(`${BASE}/api/policies`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.count >= 1);
  assert.ok(b.policies.length >= 1);
});

test('GET /api/policies/:id returns specific policy', async () => {
  const r = await fetch(`${BASE}/api/policies`);
  const all = await r.json();
  const pol = all.policies[0];
  const r2 = await fetch(`${BASE}/api/policies/${pol.id}`);
  assert.strictEqual(r2.status, 200);
  const b = await r2.json();
  assert.strictEqual(b.id, pol.id);
});

test('DELETE /api/policies/:id removes a policy', async () => {
  // Create one first
  const cr = await fetch(`${BASE}/api/policies`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ name: 'Delete Me', controlIds: ['iso.a5'] })
  });
  const { id } = await cr.json();
  const dr = await fetch(`${BASE}/api/policies/${id}`, { method: 'DELETE', headers: authHeaders() });
  assert.strictEqual(dr.status, 200);
  const db = await dr.json();
  assert.strictEqual(db.deleted, true);
  // Verify gone
  const gr = await fetch(`${BASE}/api/policies/${id}`);
  assert.strictEqual(gr.status, 404);
});

// ── Coverage ──────────────────────────────────────────────────────────────────

test('GET /api/coverage reflects current policy state', async () => {
  const r = await fetch(`${BASE}/api/coverage`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.framework, 'all');
  assert.strictEqual(b.total, 32);
  // After test runs that created policies, some may be covered — just verify structure
  assert.ok(b.gaps <= b.total);
  assert.ok(Array.isArray(b.uncovered));
});

test('GET /api/coverage?framework=gdpr filters to one framework', async () => {
  const r = await fetch(`${BASE}/api/coverage?framework=gdpr`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.framework, 'gdpr');
  assert.strictEqual(b.total, 10);
});

// ── Evidence ─────────────────────────────────────────────────────────────────

test('POST /api/evidence creates evidence linked to a control', async () => {
  const r = await fetch(`${BASE}/api/evidence`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ controlId: 'gdpr.art32', kind: 'audit-log', summary: 'Firewall logs reviewed', source: 'siem' })
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.id.startsWith('ev-'));
  assert.strictEqual(b.controlId, 'gdpr.art32');
  assert.strictEqual(b.kind, 'audit-log');
  assert.strictEqual(b.summary, 'Firewall logs reviewed');
});

test('POST /api/evidence 400 for unknown controlId', async () => {
  const r = await fetch(`${BASE}/api/evidence`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'fake', kind: 'log', summary: 'x' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.includes('controlId'));
});

test('POST /api/evidence 400 when kind is missing', async () => {
  const r = await fetch(`${BASE}/api/evidence`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'gdpr.art5', summary: 'x' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('kind'));
});

test('GET /api/evidence returns evidence list', async () => {
  const r = await fetch(`${BASE}/api/evidence`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.count >= 1);
  assert.ok(Array.isArray(b.evidence));
});

test('GET /api/evidence?controlId= filters by control', async () => {
  const r = await fetch(`${BASE}/api/evidence?controlId=gdpr.art32`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.evidence.forEach(e => assert.strictEqual(e.controlId, 'gdpr.art32'));
});

test('GET /api/evidence/:id returns specific evidence', async () => {
  const list = await (await fetch(`${BASE}/api/evidence`)).json();
  const ev = list.evidence[0];
  const r = await fetch(`${BASE}/api/evidence/${ev.id}`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.id, ev.id);
});

test('GET /api/evidence/:id 404 for unknown id', async () => {
  const r = await fetch(`${BASE}/api/evidence/ev-doesnotexist`);
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('not found'));
});

// ── Attestations ─────────────────────────────────────────────────────────────

test('POST /api/attestations creates an attestation', async () => {
  const r = await fetch(`${BASE}/api/attestations`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'soc2.cc6', attestedBy: 'cto@example.com', validUntil: '2027-01-01T00:00:00Z' })
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.id.startsWith('att-'));
  assert.strictEqual(b.controlId, 'soc2.cc6');
  assert.strictEqual(b.status, 'active');
  assert.strictEqual(b.attestedBy, 'cto@example.com');
});

test('POST /api/attestations 400 when attestedBy is missing', async () => {
  const r = await fetch(`${BASE}/api/attestations`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'gdpr.art5' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('attestedby'));
});

test('POST /api/attestations 400 for unknown controlId', async () => {
  const r = await fetch(`${BASE}/api/attestations`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'fake', attestedBy: 'bob' })
  });
  assert.strictEqual(r.status, 400);
  const b = await r.json();
  assert.ok(b.error.includes('controlId'));
});

test('GET /api/attestations returns attestation list', async () => {
  const r = await fetch(`${BASE}/api/attestations`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.count >= 1);
  assert.ok(Array.isArray(b.attestations));
});

test('GET /api/attestations?controlId= filters attestations', async () => {
  const r = await fetch(`${BASE}/api/attestations?controlId=soc2.cc6`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.attestations.forEach(a => assert.strictEqual(a.controlId, 'soc2.cc6'));
});

test('POST /api/attestations/:id/revoke revokes an attestation', async () => {
  const list = await (await fetch(`${BASE}/api/attestations`)).json();
  const att = list.attestations[0];
  const r = await fetch(`${BASE}/api/attestations/${att.id}/revoke`, {
    method: 'POST', headers: authHeaders()
  });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.strictEqual(b.status, 'revoked');
  assert.ok(b.revokedAt);
});

test('POST /api/attestations/:id/revoke 404 for unknown id', async () => {
  const r = await fetch(`${BASE}/api/attestations/att-fake/revoke`, {
    method: 'POST', headers: authHeaders()
  });
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('not found'));
});

// ── Snapshot after data exists ───────────────────────────────────────────────

test('GET /api/frameworks/gdpr/snapshot reflects attested control', async () => {
  // Create an attestation for gdpr.art32 so snapshot shows attested status
  await fetch(`${BASE}/api/attestations`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ controlId: 'gdpr.art32', attestedBy: 'auditor@example.com', validUntil: '2028-01-01T00:00:00Z' })
  });
  const r = await fetch(`${BASE}/api/frameworks/gdpr/snapshot`);
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  const art32 = b.controls.find(c => c.controlId === 'gdpr.art32');
  assert.ok(art32);
  assert.ok(art32.evidenceCount >= 0);
  // After attestation → attested
  assert.strictEqual(art32.status, 'attested');
});

// ── Audit log ────────────────────────────────────────────────────────────────

test('GET /api/audit returns audit entries', async () => {
  const r = await fetch(`${BASE}/api/audit`, { headers: authHeaders() });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  assert.ok(b.count >= 0);
  assert.ok(Array.isArray(b.entries));
});

test('GET /api/audit?type= filters by event type', async () => {
  const r = await fetch(`${BASE}/api/audit?type=policy.mapped`, { headers: authHeaders() });
  assert.strictEqual(r.status, 200);
  const b = await r.json();
  b.entries.forEach(e => assert.strictEqual(e.type, 'policy.mapped'));
});

// ── Auth ─────────────────────────────────────────────────────────────────────

test('Unauthenticated POST /api/policies → 401', async () => {
  const r = await fetch(`${BASE}/api/policies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'x', controlIds: [] })
  });
  assert.strictEqual(r.status, 401);
});

test('Wrong token POST /api/evidence → 401', async () => {
  const r = await fetch(`${BASE}/api/evidence`, {
    method: 'POST',
    headers: { 'x-internal-token': 'dev-token', 'x-service-token': 'wrong', 'content-type': 'application/json' },
    body: JSON.stringify({ controlId: 'gdpr.art5', kind: 'x', summary: 'x' })
  });
  assert.strictEqual(r.status, 401);
});

// ── 404 handler ───────────────────────────────────────────────────────────────

test('GET /unknown returns 404', async () => {
  const r = await fetch(`${BASE}/unknown/path`);
  assert.strictEqual(r.status, 404);
  const b = await r.json();
  assert.ok(b.error.toLowerCase().includes('not found'));
});
