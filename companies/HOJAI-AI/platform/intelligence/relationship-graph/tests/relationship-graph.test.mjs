#!/usr/bin/env node
/**
 * Relationship Graph — Test Suite (ESM)
 *
 * Tests the relationship memory service in-process. The lib functions
 * (computeStrength, staleRelationships, etc.) are tested as pure functions.
 * The HTTP API is tested by importing the app and driving it.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
const lib = await import('../lib/strength.js');

const server = app.listen(0);
const port = server.address().port;
const TOKEN = 'test-internal-token';

function fetch(p, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = { 'x-internal-token': TOKEN, ...(options.headers || {}) };
    if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';
    const body = options.body ? JSON.stringify(options.body) : null;
    const req = http.request(
      { host: '127.0.0.1', port, path: p, method: options.method || 'GET', headers },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed = data;
          try { parsed = JSON.parse(data); } catch {}
          const payload = parsed && parsed.data !== undefined ? parsed.data : parsed;
          resolve({ status: res.statusCode, body: payload, full: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// ---------- pure-function tests ----------

test('lib — computeStrength: high base + recent contact → high strength', () => {
  const now = new Date();
  const rel = { baseStrength: 90, lastContactAt: now.toISOString(), interactions: 50 };
  const s = lib.computeStrength(rel, now.toISOString());
  assert.ok(s >= 80, `expected >= 80, got ${s}`);
});

test('lib — computeStrength: high base but no recent contact → decays', () => {
  const now = new Date();
  const longAgo = new Date(now.getTime() - 365 * 86400000);
  const rel = { baseStrength: 90, lastContactAt: longAgo.toISOString(), interactions: 50, halfLifeDays: 30 };
  const s = lib.computeStrength(rel, now.toISOString());
  // 1 year / 30 day half-life = 12 half-lives → 100 * 0.5^12 ≈ 0.024 → rounds to 0
  // combined = 90*0.5 + 0.024*0.3 + ~26*0.2 = 45 + 0 + 5.2 = 50
  assert.ok(s < 60, `expected < 60 after decay, got ${s}`);
});

test('lib — computeStrength: many interactions boost strength', () => {
  const now = new Date();
  const rel = { baseStrength: 50, lastContactAt: now.toISOString(), interactions: 1000 };
  const s = lib.computeStrength(rel, now.toISOString());
  // interactionBoost = min(30, log2(1001)*5) ≈ 50 → clamped to 30
  // recencyScore = 100; combined = 50*0.5 + 100*0.3 + 30*0.2 = 25 + 30 + 6 = 61
  assert.ok(s >= 60, `expected >= 60 with many interactions, got ${s}`);
});

test('lib — computeStrength: clamp to 0-100', () => {
  const now = new Date();
  const high = lib.computeStrength({ baseStrength: 200, interactions: 9999, lastContactAt: now.toISOString() }, now.toISOString());
  const low = lib.computeStrength({ baseStrength: 0, interactions: 0 }, now.toISOString());
  assert.ok(high <= 100);
  assert.ok(low >= 0);
});

test('lib — strengthLevel: buckets correctly', () => {
  assert.equal(lib.strengthLevel(95).level, 'inner_circle');
  assert.equal(lib.strengthLevel(80).level, 'inner_circle');
  assert.equal(lib.strengthLevel(70).level, 'close');
  assert.equal(lib.strengthLevel(50).level, 'active');
  assert.equal(lib.strengthLevel(30).level, 'fading');
  assert.equal(lib.strengthLevel(10).level, 'dormant');
});

test('lib — daysSinceLastContact: 0 for today', () => {
  const now = new Date();
  const rel = { lastContactAt: now.toISOString() };
  assert.equal(lib.daysSinceLastContact(rel, now.toISOString()), 0);
});

test('lib — daysSinceLastContact: Infinity when null', () => {
  assert.equal(lib.daysSinceLastContact({ lastContactAt: null }), Infinity);
});

test('lib — staleRelationships: filters by minStrength and minDaysSince', () => {
  const now = new Date();
  const rels = [
    { personId: 'a', baseStrength: 80, lastContactAt: new Date(now.getTime() - 10*86400000).toISOString(), interactions: 10 }, // strong, stale
    { personId: 'b', baseStrength: 80, lastContactAt: new Date(now.getTime() - 1*86400000).toISOString(),  interactions: 10 }, // strong, fresh
    { personId: 'c', baseStrength: 20, lastContactAt: new Date(now.getTime() - 30*86400000).toISOString(),interactions: 10 }, // weak, stale
  ];
  const stale = lib.staleRelationships(rels, { minStrength: 30, minDaysSince: 7 });
  assert.equal(stale.length, 1);
  assert.equal(stale[0].personId, 'a');
});

test('lib — peopleByContext: matches by tag', () => {
  const rels = [
    { personId: 'a', contexts: ['work', 'tennis'] },
    { personId: 'b', contexts: ['family'] },
    { personId: 'c', contexts: ['work'] },
  ];
  assert.equal(lib.peopleByContext(rels, 'work').length, 2);
  assert.equal(lib.peopleByContext(rels, 'tennis').length, 1);
  assert.equal(lib.peopleByContext(rels, 'unknown').length, 0);
});

test('lib — summary: counts and averages', () => {
  const now = new Date();
  const rels = [
    { personId: 'a', lastContactAt: new Date(now.getTime() - 3*86400000).toISOString(), accuracyScore: 0.9 },
    { personId: 'b', lastContactAt: new Date(now.getTime() - 10*86400000).toISOString(), accuracyScore: 0.7 },
    { personId: 'c', lastContactAt: new Date(now.getTime() - 90*86400000).toISOString(), accuracyScore: 0.5 },
  ];
  const s = lib.summary(rels, now.toISOString());
  assert.equal(s.people_count, 3);
  assert.equal(s.recently_contacted, 2); // a (3d) + b (10d) within 14 days
  assert.ok(s.accuracy_score > 0.5 && s.accuracy_score < 1);
});

// ---------- HTTP API tests ----------

test('HTTP — /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'relationship-graph');
});

test('HTTP — POST /person creates relationship', async () => {
  const r = await fetch('/api/relationships/u-test/person', {
    method: 'POST',
    body: { personId: 'alice', name: 'Alice', contexts: ['work'], baseStrength: 90 },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.personId, 'alice');
  assert.equal(r.body.name, 'Alice');
  // baseStrength=90, just contacted → strength ≈ 75 → close
  assert.equal(r.body.strengthLevel, 'close');
  assert.ok(r.body.strength >= 70);
});

test('HTTP — POST /person without personId returns 400', async () => {
  const r = await fetch('/api/relationships/u-test/person', { method: 'POST', body: { name: 'No ID' } });
  assert.equal(r.status, 400);
});

test('HTTP — GET /person/:id returns the relationship', async () => {
  await fetch('/api/relationships/u-test2/person', {
    method: 'POST', body: { personId: 'bob', name: 'Bob' },
  });
  const r = await fetch('/api/relationships/u-test2/person/bob');
  assert.equal(r.status, 200);
  assert.equal(r.body.personId, 'bob');
});

test('HTTP — GET unknown person returns 404', async () => {
  const r = await fetch('/api/relationships/u-test3/person/ghost');
  assert.equal(r.status, 404);
});

test('HTTP — POST /person updates an existing relationship', async () => {
  await fetch('/api/relationships/u-test4/person', {
    method: 'POST', body: { personId: 'carol', baseStrength: 50 },
  });
  const r = await fetch('/api/relationships/u-test4/person', {
    method: 'POST', body: { personId: 'carol', baseStrength: 80, notes: 'updated' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.notes, 'updated');
});

test('HTTP — DELETE /person/:id removes', async () => {
  await fetch('/api/relationships/u-test5/person', { method: 'POST', body: { personId: 'dan' } });
  const del = await fetch('/api/relationships/u-test5/person/dan', { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  const get = await fetch('/api/relationships/u-test5/person/dan');
  assert.equal(get.status, 404);
});

test('HTTP — POST /interaction bumps interaction count and updates lastContactAt', async () => {
  await fetch('/api/relationships/u-test6/person', { method: 'POST', body: { personId: 'eve' } });
  const r = await fetch('/api/relationships/u-test6/interaction', {
    method: 'POST', body: { personId: 'eve', kind: 'call', note: 'weekly sync' },
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.interactions >= 1);
});

test('HTTP — POST /interaction auto-creates relationship for new contact', async () => {
  const r = await fetch('/api/relationships/u-test7/interaction', {
    method: 'POST', body: { personId: 'newcontact' },
  });
  assert.equal(r.status, 200);
  // verify it was created
  const get = await fetch('/api/relationships/u-test7/person/newcontact');
  assert.equal(get.status, 200);
});

test('HTTP — GET /stale returns reach-out candidates', async () => {
  await fetch('/api/relationships/u-test8/seed', { method: 'POST', body: {} });
  // minStrength=20 to include sam (baseStrength=30 → current strength still above 20)
  const r = await fetch('/api/relationships/u-test8/stale?minStrength=20&minDays=7');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.candidates));
  // priya (30d), dad (14d), jordan (60d), sam (90d) should all be candidates
  assert.ok(r.body.candidates.length >= 3);
  const names = r.body.candidates.map((c) => c.personId);
  assert.ok(names.includes('priya'));
  assert.ok(names.includes('sam'));
});

test('HTTP — GET /by-context/:tag filters by tag', async () => {
  await fetch('/api/relationships/u-test9/seed', { method: 'POST', body: {} });
  const r = await fetch('/api/relationships/u-test9/by-context/family');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 2); // mom + dad
  const ids = r.body.people.map((p) => p.personId);
  assert.ok(ids.includes('mom'));
  assert.ok(ids.includes('dad'));
});

test('HTTP — GET /summary returns stats', async () => {
  await fetch('/api/relationships/u-test10/seed', { method: 'POST', body: {} });
  const r = await fetch('/api/relationships/u-test10/summary');
  assert.equal(r.status, 200);
  assert.equal(r.body.people_count, 6);
  assert.ok(r.body.recently_contacted >= 1);
  assert.ok(typeof r.body.accuracy_score === 'number');
});

test('HTTP — GET /:userId returns sorted list', async () => {
  await fetch('/api/relationships/u-test11/seed', { method: 'POST', body: {} });
  const r = await fetch('/api/relationships/u-test11');
  assert.equal(r.status, 200);
  assert.equal(r.body.count, 6);
  // verify sorted by strength desc
  for (let i = 1; i < r.body.relationships.length; i++) {
    assert.ok(r.body.relationships[i - 1].strength >= r.body.relationships[i].strength,
      `not sorted: ${r.body.relationships[i - 1].strength} < ${r.body.relationships[i].strength}`);
  }
});

test('HTTP — auth required without token', async () => {
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/relationships/u', method: 'GET' },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(r.status, 401);
});

test('HTTP — 404 on unknown route', async () => {
  const r = await fetch('/api/relationships/u/nonsense');
  assert.equal(r.status, 404);
});

process.on('exit', () => { try { server.close(); } catch {} });
