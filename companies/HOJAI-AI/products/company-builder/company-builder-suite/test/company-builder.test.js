/**
 * Company Builder Suite — test suite
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hojai-cb-test-'));
process.env.HOJAI_DATA_DIR = TEST_DATA_DIR;
process.env.SERVICE_NAME = 'company-builder-test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { createApp } = await import('../src/index.js');

let server;
let baseUrl;

async function boot() {
  if (server) {
    await new Promise((r) => server.close(r));
    server = null;
  }
  const app = createApp();
  server = await new Promise((resolve, reject) => {
    const s = app.listen(0, () => resolve(s));
    s.on('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
  await new Promise(r => setTimeout(r, 50));
}

function req(method, p, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(url, opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

after(async () => {
  if (server) await new Promise(r => server.close(r));
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch {}
});

async function registerUser() {
  const res = await req('POST', '/v1/users/register', {
    email: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
    password: 'password123',
    name: 'Jane',
  });
  return res.body.token;
}

// ============ TESTS ============

test('GET /health', async () => {
  await boot();
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'company-builder-suite');
});

test('GET /ready', async () => {
  await boot();
  const res = await req('GET', '/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.ready, true);
});

test('Register user and receive token', async () => {
  await boot();
  const res = await req('POST', '/v1/users/register', { email: 'u1@example.com', password: 'password123', name: 'Jane' });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
});

test('Login works with valid credentials', async () => {
  await boot();
  await req('POST', '/v1/users/register', { email: 'login@example.com', password: 'password123', name: 'A' });
  const res = await req('POST', '/v1/users/login', { email: 'login@example.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('Login with bad password returns 401', async () => {
  await boot();
  await req('POST', '/v1/users/register', { email: 'bp@example.com', password: 'password123', name: 'A' });
  const res = await req('POST', '/v1/users/login', { email: 'bp@example.com', password: 'wrong' });
  assert.equal(res.status, 401);
});

test('Create entity auto-generates compliance tasks', async () => {
  await boot();
  const token = await registerUser();
  const res = await req('POST', '/v1/entities', {
    name: 'Acme Inc', type: 'c-corp', state: 'DE', industry: 'SaaS', formationDate: '2026-01-15', einNumber: '12-3456789',
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.entity.status, 'active');
  // Check tasks generated
  const upcoming = await req('GET', '/v1/compliance/upcoming?days=365', null, token);
  assert.ok(upcoming.body.count >= 3, `expected ≥3 compliance tasks, got ${upcoming.body.count}`);
});

test('Entity without formationDate is in-formation', async () => {
  await boot();
  const token = await registerUser();
  const res = await req('POST', '/v1/entities', { name: 'NewLLC', type: 'llc', state: 'WY' }, token);
  assert.equal(res.body.entity.status, 'in-formation');
});

test('Get entity returns members, grants, docs, registrations arrays', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'llc', state: 'DE', formationDate: '2026-01-01' }, token);
  const res = await req('GET', `/v1/entities/${ent.body.entity.id}`, null, token);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.members));
  assert.ok(Array.isArray(res.body.grants));
  assert.ok(Array.isArray(res.body.documents));
  assert.ok(Array.isArray(res.body.registrations));
});

test('Add founder member with ownership %', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const res = await req('POST', `/v1/entities/${ent.body.entity.id}/members`, {
    name: 'Jane Founder', email: 'jane@x.com', role: 'ceo', ownershipPercent: 60, title: 'CEO', shares: 6_000_000,
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.member.ownershipPercent, 60);
  assert.equal(res.body.member.vestingMonths, 48);
  assert.equal(res.body.member.cliffMonths, 12);
});

test('Add registration (EIN) to entity', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const res = await req('POST', `/v1/entities/${ent.body.entity.id}/registrations`, {
    type: 'ein', jurisdiction: 'Federal', number: '12-3456789', filedDate: '2026-01-15', status: 'active',
  }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.registration.type, 'ein');
});

test('Issue equity grant (ISO) and compute vesting', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  // Grant with start date 5 years ago (60 months, beyond 48-month vest schedule)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 5);
  const grant = await req('POST', `/v1/entities/${ent.body.entity.id}/grants`, {
    recipientName: 'Employee 1', type: 'iso', shares: 10000, strikePrice: 0.10, grantDate: startDate.toISOString(),
  }, token);
  assert.equal(grant.status, 201);
  const vesting = await req('GET', `/v1/grants/${grant.body.grant.id}/vesting`, null, token);
  assert.equal(vesting.body.schedule.percentVested, 100);
  assert.equal(vesting.body.schedule.vested, 10000);
});

test('Equity grant within cliff is 0% vested', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const grant = await req('POST', `/v1/entities/${ent.body.entity.id}/grants`, {
    recipientName: 'E2', type: 'iso', shares: 10000, grantDate: new Date().toISOString(),
  }, token);
  const vesting = await req('GET', `/v1/grants/${grant.body.grant.id}/vesting`, null, token);
  assert.equal(vesting.body.schedule.vested, 0);
  assert.equal(vesting.body.schedule.percentVested, 0);
});

test('Create governance document and mark executed', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const doc = await req('POST', `/v1/entities/${ent.body.entity.id}/documents`, {
    type: 'bylaws', title: 'Initial Bylaws', body: 'Bylaws content...', signatories: ['Jane', 'John'],
  }, token);
  assert.equal(doc.status, 201);
  assert.equal(doc.body.document.status, 'draft');

  const exec = await req('PUT', `/v1/documents/${doc.body.document.id}/execute`, { signatories: ['Jane', 'John'] }, token);
  assert.equal(exec.body.document.status, 'executed');
  assert.ok(exec.body.document.executedAt);
});

test('File annual report and mark as filed', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const filing = await req('POST', `/v1/entities/${ent.body.entity.id}/filings`, {
    type: 'Annual Report', dueDate: '2026-03-01', jurisdiction: 'DE', fee: 300,
  }, token);
  assert.equal(filing.status, 201);

  const filed = await req('PUT', `/v1/filings/${filing.body.filing.id}/filed`, { confirmationNumber: 'AR-2026-001' }, token);
  assert.equal(filed.body.filing.status, 'filed');
  assert.equal(filed.body.filing.confirmationNumber, 'AR-2026-001');
});

test('Complete compliance task', async () => {
  await boot();
  const token = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'c-corp', state: 'DE' }, token);
  const tasks = await req('GET', '/v1/compliance/upcoming?days=365', null, token);
  const firstTask = tasks.body.tasks[0];
  const done = await req('PUT', `/v1/compliance/${firstTask.id}/complete`, { notes: 'Filed via IRS website' }, token);
  assert.equal(done.body.task.status, 'completed');
});

test('Dashboard returns aggregated stats', async () => {
  await boot();
  const token = await registerUser();
  await req('POST', '/v1/entities', { name: 'Corp1', type: 'c-corp', state: 'DE' }, token);
  await req('POST', '/v1/entities', { name: 'LLC1', type: 'llc', state: 'WY' }, token);
  await req('POST', '/v1/entities', { name: 'Corp2', type: 'c-corp', state: 'DE' }, token);

  const dash = await req('GET', '/v1/dashboard', null, token);
  assert.equal(dash.status, 200);
  assert.equal(dash.body.dashboard.totalEntities, 3);
  assert.equal(dash.body.dashboard.entityBreakdown['c-corp'], 2);
  assert.equal(dash.body.dashboard.entityBreakdown['llc'], 1);
});

test('Unauthorized request returns 401', async () => {
  await boot();
  const res = await req('GET', '/v1/entities');
  assert.equal(res.status, 401);
});

test('Cross-user entity access returns 404', async () => {
  await boot();
  const token1 = await registerUser();
  const token2 = await registerUser();
  const ent = await req('POST', '/v1/entities', { name: 'X', type: 'llc', state: 'DE' }, token1);
  const res = await req('GET', `/v1/entities/${ent.body.entity.id}`, null, token2);
  assert.equal(res.status, 404);
});

test('Invalid entity type returns 400', async () => {
  await boot();
  const token = await registerUser();
  const res = await req('POST', '/v1/entities', { name: 'X', type: 'invalid-type', state: 'DE' }, token);
  assert.equal(res.status, 400);
});

test('Unknown route returns 404', async () => {
  await boot();
  const res = await req('GET', '/v1/does-not-exist');
  assert.equal(res.status, 404);
});
