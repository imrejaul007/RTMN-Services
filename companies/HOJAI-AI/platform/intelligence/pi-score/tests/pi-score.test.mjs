#!/usr/bin/env node
/**
 * PI Score Engine — Test Suite (ESM)
 *
 * Boots the service in-process by importing its Express app, then drives
 * the HTTP API. Downstreams (memory-substrate, reflection-engine,
 * relationship-graph) are NOT required — the service degrades gracefully
 * when they're unreachable, and POST /compute accepts an `overrides` body
 * that lets us inject raw counts directly. This is the cleanest way to
 * test the scoring algorithm.
 *
 * Auth: we pass `INTERNAL_SERVICE_TOKEN=test-internal-token` and send the
 * `x-internal-token` header on every request. The `requireAuth` middleware
 * accepts that header for service-to-service calls.
 *
 * Response shape: all service endpoints return {success, data, meta}.
 * We unwrap `.data` for clarity in the assertions.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
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
          // unwrap standard envelope: { success, data, meta }
          const payload = parsed && parsed.data !== undefined ? parsed.data : parsed;
          resolve({ status: res.statusCode, body: payload, raw: data, full: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('PI Score — /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'pi-score');
});

test('PI Score — /api/pi-score/levels returns all 6 levels', async () => {
  const r = await fetch('/api/pi-score/levels');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.levels));
  assert.equal(r.body.levels.length, 6);
  assert.equal(r.body.levels[0].name, 'Newborn');
  assert.equal(r.body.levels[5].name, 'Soulmate');
});

test('PI Score — /api/pi-score/:userId returns a score shape', async () => {
  const r = await fetch('/api/pi-score/user-alice');
  assert.equal(r.status, 200);
  assert.equal(r.body.userId, 'user-alice');
  assert.equal(typeof r.body.overall, 'number');
  assert.ok(r.body.level);
  assert.equal(typeof r.body.level.level, 'number');
  assert.ok(r.body.level.name.length > 0);
  assert.ok(r.body.components);
  assert.ok(r.body.computedAt);
});

test('PI Score — compute with no overrides yields a valid shape', async () => {
  const r = await fetch('/api/pi-score/user-bob/compute', { method: 'POST', body: {} });
  assert.equal(r.status, 200);
  assert.ok(r.body.userId);
  assert.equal(typeof r.body.overall, 'number');
  assert.ok(r.body.components);
  const c = r.body.components;
  for (const k of ['memory', 'context', 'learning', 'relationships', 'goals', 'wellness', 'reflection']) {
    assert.equal(typeof c[k], 'number', `missing component ${k}`);
  }
});

test('PI Score — compute with overrides: Newborn (all zero)', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 0, contextHits: 0, learnedFacts: 0, contacts: 0, interactions: 0,
      goalsCompleted: 0, goalsActive: 0, wellnessCheckins: 0, reflections: 0,
    } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.overall, 0);
  assert.equal(r.body.level.level, 1);
  assert.equal(r.body.level.name, 'Newborn');
});

test('PI Score — compute with high counts: Soulmate (>=90)', async () => {
  // Realistic max values that hit Soulmate thresholds in the algorithm
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 500,    // far beyond 100 target → 60
      contextHits: 500, // far beyond 100 target → 70
      learnedFacts: 200,// far beyond 50 target → 40
      contacts: 200,    // far beyond 12 target → 40
      interactions: 500,// high freshness ratio → 40
      goalsCompleted: 200,
      goalsActive: 50,
      wellnessCheckins: 120, // 30 days * 4 categories
      reflections: 100,
    } },
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.overall >= 90, `expected Soulmate (>=90), got ${r.body.overall}`);
  assert.equal(r.body.level.level, 6);
  assert.equal(r.body.level.name, 'Soulmate');
});

test('PI Score — compute: mid-range falls in Friend (25-49)', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 12, contextHits: 10, learnedFacts: 2, contacts: 3, interactions: 2,
      goalsCompleted: 3, goalsActive: 5, wellnessCheckins: 3, reflections: 3,
    } },
  });
  // Just verify it's in the Friend range (25-49) — algorithm details may shift.
  assert.ok(r.body.overall >= 25 && r.body.overall < 50, `expected Friend range, got ${r.body.overall}`);
  assert.equal(r.body.level.level, 3);
  assert.equal(r.body.level.name, 'Friend');
});

test('PI Score — compute: clamped to 100 max (no overflow)', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 9999, contextHits: 9999, learnedFacts: 9999, contacts: 9999, interactions: 9999,
      goalsCompleted: 9999, goalsActive: 9999, wellnessCheckins: 9999, reflections: 9999,
    } },
  });
  // Overall never exceeds 100 (algorithm caps each sub-score)
  assert.ok(r.body.overall <= 100, `expected <= 100, got ${r.body.overall}`);
  assert.ok(r.body.overall >= 50, `expected >= 50 with high counts, got ${r.body.overall}`);
});

test('PI Score — compute: components are bounded 0-100', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 5, contextHits: 1, learnedFacts: 1, contacts: 1, interactions: 2,
      goalsCompleted: 0, goalsActive: 1, wellnessCheckins: 1, reflections: 0,
    } },
  });
  const c = r.body.components;
  for (const k of ['memory', 'context', 'learning', 'relationships', 'goals', 'wellness', 'reflection']) {
    assert.ok(c[k] >= 0 && c[k] <= 100, `${k} score out of bounds: ${c[k]}`);
  }
  // Overall must be a weighted average of components
  const expected = Math.round(
    c.memory * 0.20 + c.context * 0.15 + c.learning * 0.15 +
    c.relationships * 0.15 + c.goals * 0.15 + c.wellness * 0.10 + c.reflection * 0.10
  );
  assert.equal(r.body.overall, expected, `overall (${r.body.overall}) != weighted avg (${expected})`);
});

test('PI Score — /api/pi-score/:userId/history returns array', async () => {
  const r = await fetch('/api/pi-score/u/history');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.history));
});

test('PI Score — /api/pi-score/:userId/widget returns compact shape', async () => {
  const r = await fetch('/api/pi-score/u/widget');
  assert.equal(r.status, 200);
  // widget shape: { userId, title, overall, level: { level, name, emoji, ... }, levelName, levelEmoji,
  //                 nextLevel: { name, pointsToNext }, components: [{key, value, label}, ...], progressToNext }
  assert.equal(typeof r.body.overall, 'number');
  assert.ok(r.body.level);
  assert.equal(typeof r.body.level.level, 'number');
  assert.equal(typeof r.body.level.name, 'string');
  assert.equal(typeof r.body.level.emoji, 'string');
  assert.equal(typeof r.body.levelName, 'string');
  assert.equal(typeof r.body.levelEmoji, 'string');
  assert.ok(Array.isArray(r.body.components));
  assert.equal(r.body.components.length, 7);
});

test('PI Score — /api/pi-score/feedback stores feedback', async () => {
  const r = await fetch('/api/pi-score/feedback', {
    method: 'POST',
    body: { userId: 'u', feedback: 'loved', notes: 'amazing' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.userId, 'u');
  assert.equal(r.body.feedback, 'loved');
});

test('PI Score — invalid feedback is rejected with 400', async () => {
  const r = await fetch('/api/pi-score/feedback', {
    method: 'POST',
    body: { userId: 'u', feedback: 'whatever' },
  });
  assert.equal(r.status, 400);
});

test('PI Score — missing userId on feedback rejected with 400', async () => {
  const r = await fetch('/api/pi-score/feedback', {
    method: 'POST',
    body: { feedback: 'loved' },
  });
  assert.equal(r.status, 400);
});

test('PI Score — 404 on unknown api route', async () => {
  const r = await fetch('/api/pi-score/does/not/exist');
  assert.equal(r.status, 404);
});

test('PI Score — auth is enforced without token', async () => {
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/pi-score/u', method: 'GET' },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(r.status, 401);
});

process.on('exit', () => { try { server.close(); } catch {} });
