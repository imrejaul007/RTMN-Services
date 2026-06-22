/**
 * Investor Copilot — test suite
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hojai-investor-test-'));
process.env.HOJAI_DATA_DIR = TEST_DATA_DIR;
process.env.SERVICE_NAME = 'investor-copilot-test';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

// Dynamic import so each test can re-import with a fresh module cache via unique tmp dir
const { createApp } = await import('../src/index.js');

let server;
let baseUrl;

async function boot() {
  if (server) {
    await new Promise((r) => server.close(r));
    server = null;
  }
  // Fresh app instance — uses same persistent store (file-backed), but we wipe data
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

async function registerAndLogin() {
  const res = await req('POST', '/v1/founders/register', {
    email: `founder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
    password: 'password123',
    name: 'Jane Founder',
    companyName: 'Acme AI',
  });
  return res.body.token;
}

// ============ TESTS ============

test('GET /health', async () => {
  await boot();
  const res = await req('GET', '/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'investor-copilot');
});

test('GET /ready', async () => {
  await boot();
  const res = await req('GET', '/ready');
  assert.equal(res.status, 200);
  assert.equal(res.body.ready, true);
});

test('Register founder and receive token', async () => {
  await boot();
  const res = await req('POST', '/v1/founders/register', {
    email: 'founder1@example.com', password: 'password123', name: 'Jane', companyName: 'Acme',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.founder.companyName, 'Acme');
});

test('Duplicate registration is rejected', async () => {
  await boot();
  await req('POST', '/v1/founders/register', { email: 'dup@example.com', password: 'password123', name: 'A', companyName: 'B' });
  const res = await req('POST', '/v1/founders/register', { email: 'dup@example.com', password: 'password123', name: 'A', companyName: 'B' });
  assert.equal(res.status, 409);
});

test('Login with valid credentials', async () => {
  await boot();
  await req('POST', '/v1/founders/register', { email: 'login@example.com', password: 'password123', name: 'A', companyName: 'B' });
  const res = await req('POST', '/v1/founders/login', { email: 'login@example.com', password: 'password123' });
  assert.equal(res.status, 200);
  assert.ok(res.body.token);
});

test('Login with bad password is rejected', async () => {
  await boot();
  await req('POST', '/v1/founders/register', { email: 'bp@example.com', password: 'password123', name: 'A', companyName: 'B' });
  const res = await req('POST', '/v1/founders/login', { email: 'bp@example.com', password: 'wrong' });
  assert.equal(res.status, 401);
});

test('GET /v1/founders/me requires auth', async () => {
  await boot();
  const res = await req('GET', '/v1/founders/me');
  assert.equal(res.status, 401);
});

test('Create share class', async () => {
  await boot();
  const token = await registerAndLogin();
  const res = await req('POST', '/v1/share-classes', { name: 'Series A Preferred', authorized: 5_000_000, parValue: 0.001, liquidationPreference: 1.0 }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.shareClass.name, 'Series A Preferred');
});

test('Add shareholder and compute ownership %', async () => {
  await boot();
  const token = await registerAndLogin();
  const sc = await req('POST', '/v1/share-classes', { name: 'Common', authorized: 10_000_000 }, token);
  const scId = sc.body.shareClass.id;

  await req('POST', '/v1/shareholders', { name: 'Founder', shares: 7_000_000, shareClassId: scId, isFounder: true }, token);
  await req('POST', '/v1/shareholders', { name: 'Co-founder', shares: 3_000_000, shareClassId: scId, isFounder: true }, token);

  const list = await req('GET', '/v1/shareholders', null, token);
  assert.equal(list.status, 200);
  assert.equal(list.body.totalShares, 10_000_000);
  const founder = list.body.shareholders.find(s => s.name === 'Founder');
  assert.equal(founder.ownershipPercent, 70);
});

test('Create round with auto-typed valuation', async () => {
  await boot();
  const token = await registerAndLogin();
  const res = await req('POST', '/v1/rounds', { name: 'Seed 2026', targetRaise: 2_000_000, preMoneyValuation: 8_000_000 }, token);
  assert.equal(res.status, 201);
  assert.equal(res.body.round.type, 'Seed');
  assert.equal(res.body.round.postMoneyValuation, 10_000_000);
});

test('Round participation updates investor status to engaged', async () => {
  await boot();
  const token = await registerAndLogin();
  const round = await req('POST', '/v1/rounds', { name: 'Seed', targetRaise: 1_000_000, preMoneyValuation: 4_000_000 }, token);
  const inv = await req('POST', '/v1/investors', { name: 'Acme Ventures', type: 'vc', firm: 'Acme VC' }, token);
  const part = await req('POST', `/v1/rounds/${round.body.round.id}/participations`, { investorId: inv.body.investor.id, amount: 250_000 }, token);
  assert.equal(part.status, 201);
  assert.equal(part.body.participation.ownershipPercent, 5);

  const inv2 = await req('GET', '/v1/investors', null, token);
  const acme = inv2.body.investors.find(i => i.name === 'Acme Ventures');
  assert.equal(acme.status, 'engaged');
});

test('Round modeling returns ownership and dilution', async () => {
  await boot();
  const token = await registerAndLogin();
  const round = await req('POST', '/v1/rounds', { name: 'Series A', targetRaise: 3_000_000, preMoneyValuation: 12_000_000 }, token);
  const model = await req('POST', `/v1/rounds/${round.body.round.id}/model`, { investmentAmount: 1_000_000 }, token);
  assert.equal(model.status, 200);
  assert.equal(model.body.modeling.ownershipPercent, (1_000_000 / 15_000_000) * 100);
  assert.ok(model.body.modeling.estimatedShares > 0);
});

test('Investor follow-up records last contact', async () => {
  await boot();
  const token = await registerAndLogin();
  const inv = await req('POST', '/v1/investors', { name: 'Angel One', type: 'angel' }, token);
  const fu = await req('POST', `/v1/investors/${inv.body.investor.id}/follow-ups`, { type: 'call', notes: 'Great intro call', outcome: 'Wants to see deck' }, token);
  assert.equal(fu.status, 201);

  const list = await req('GET', `/v1/investors/${inv.body.investor.id}/follow-ups`, null, token);
  assert.equal(list.body.followUps.length, 1);
});

test('Create and list investor update', async () => {
  await boot();
  const token = await registerAndLogin();
  const res = await req('POST', '/v1/updates', { period: 'June 2026', content: 'Hit $50K MRR', highlights: ['Shipped v2'], metrics: { mrr: 50000 }, asks: ['Intros to fintech VCs'] }, token);
  assert.equal(res.status, 201);
  const list = await req('GET', '/v1/updates', null, token);
  assert.equal(list.body.updates.length, 1);
});

test('Dashboard returns aggregated stats', async () => {
  await boot();
  const token = await registerAndLogin();
  const sc = await req('POST', '/v1/share-classes', { name: 'Common', authorized: 10_000_000 }, token);
  await req('POST', '/v1/shareholders', { name: 'Founder', shares: 10_000_000, shareClassId: sc.body.shareClass.id }, token);
  await req('POST', '/v1/rounds', { name: 'Seed', targetRaise: 1_000_000, preMoneyValuation: 5_000_000 }, token);
  await req('POST', '/v1/investors', { name: 'V1', type: 'vc' }, token);
  await req('POST', '/v1/investors', { name: 'A1', type: 'angel' }, token);

  const dash = await req('GET', '/v1/dashboard', null, token);
  assert.equal(dash.status, 200);
  assert.equal(dash.body.dashboard.totalRounds, 1);
  assert.equal(dash.body.dashboard.totalInvestors, 2);
  assert.equal(dash.body.dashboard.totalShareholders, 1);
  assert.equal(dash.body.dashboard.totalShares, 10_000_000);
  assert.equal(dash.body.dashboard.topShareholders[0].name, 'Founder');
});

test('Invalid email on register returns 400', async () => {
  await boot();
  const res = await req('POST', '/v1/founders/register', { email: 'not-an-email', password: 'password123', name: 'X', companyName: 'Y' });
  assert.equal(res.status, 400);
});

test('Round not found returns 404', async () => {
  await boot();
  const token = await registerAndLogin();
  const res = await req('GET', '/v1/rounds/round_nonexistent', null, token);
  assert.equal(res.status, 404);
});

test('Unknown route returns 404', async () => {
  await boot();
  const res = await req('GET', '/v1/does-not-exist');
  assert.equal(res.status, 404);
});
