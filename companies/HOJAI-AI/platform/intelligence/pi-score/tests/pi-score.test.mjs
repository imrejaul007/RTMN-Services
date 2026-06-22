#!/usr/bin/env node
/**
 * PI Score Engine — Test Suite
 *
 * Boots the service in-process by importing its Express app, then drives
 * the HTTP API. We don't need a real memory-substrate / relationship-graph /
 * reflection-engine — the service degrades gracefully when downstreams are
 * unreachable, and POST /compute accepts an `overrides` body that lets us
 * inject raw counts directly. This is the cleanest way to test the scoring
 * algorithm.
 *
 * Auth: we pass `INTERNAL_SERVICE_TOKEN=test-internal-token` and send the
 * `x-internal-token` header on every request. The `requireAuth` middleware
 * accepts that header for service-to-service calls.
 */

const assert = require('node:assert/strict');
const http = require('node:http');
const { test } = require('node:test');

// env must be set BEFORE importing the app
process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const app = require('../src/index.js').default;
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
          resolve({ status: res.statusCode, body: parsed, raw: data });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('PI Score — /health returns ok', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
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
  assert.equal(typeof r.body.level, 'number');
  assert.ok(r.body.levelName.length > 0);
  assert.ok(r.body.components);
  assert.ok(r.body.computedAt);
});

test('PI Score — compute with no overrides yields a valid shape', async () => {
  const r = await fetch('/api/pi-score/user-bob/compute', { method: 'POST', body: {} });
  assert.equal(r.status, 200);
  assert.ok(r.body.userId);
  assert.equal(typeof r.body.overall, 'number');
  assert.ok(r.body.components);
  // components should include all 7
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
  assert.equal(r.body.level, 1);
  assert.equal(r.body.levelName, 'Newborn');
});

test('PI Score — compute with high counts: Soulmate (>=90)', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 200, contextHits: 50, learnedFacts: 20, contacts: 50, interactions: 100,
      goalsCompleted: 30, goalsActive: 10, wellnessCheckins: 30, reflections: 15,
    } },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.overall, 100);
  assert.equal(r.body.level, 6);
  assert.equal(r.body.levelName, 'Soulmate');
});

test('PI Score — compute: mid-range falls in Friend/Confidant', async () => {
  // Tuned so weighted avg ≈ 50 (Confidant lower edge)
  // memory=12 → 24 * 0.20 = 4.8
  // context=10 → 50 * 0.15 = 7.5
  // learning=2 → 20 * 0.15 = 3
  // relationships= (3*4)+(2*2)=16 → 16 * 0.15 = 2.4
  // goals= (3*8)+(5*3)=39 → 39 * 0.15 = 5.85
  // wellness=3 → 18 * 0.10 = 1.8
  // reflection=3 → 36 * 0.10 = 3.6
  // total ≈ 28.95 → Friend
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 12, contextHits: 10, learnedFacts: 2, contacts: 3, interactions: 2,
      goalsCompleted: 3, goalsActive: 5, wellnessCheckins: 3, reflections: 3,
    } },
  });
  assert.ok(r.body.overall >= 25 && r.body.overall < 50, `expected Friend range, got ${r.body.overall}`);
  assert.equal(r.body.level, 3);
  assert.equal(r.body.levelName, 'Friend');
});

test('PI Score — compute: clamped to 100 max', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 9999, contextHits: 9999, learnedFacts: 9999, contacts: 9999, interactions: 9999,
      goalsCompleted: 9999, goalsActive: 9999, wellnessCheckins: 9999, reflections: 9999,
    } },
  });
  assert.equal(r.body.overall, 100);
});

test('PI Score — compute: components add up correctly', async () => {
  const r = await fetch('/api/pi-score/u/compute', {
    method: 'POST',
    body: { overrides: {
      memories: 5, contextHits: 1, learnedFacts: 1, contacts: 1, interactions: 2,
      goalsCompleted: 0, goalsActive: 1, wellnessCheckins: 1, reflections: 0,
    } },
  });
  // memory=10, context=5, learning=10, rel=(1*4)+(2*2)=8, goals=(0)+(1*3)=3, wellness=6, reflection=0
  // weighted: 10*0.20 + 5*0.15 + 10*0.15 + 8*0.15 + 3*0.15 + 6*0.10 + 0 = 2 + 0.75 + 1.5 + 1.2 + 0.45 + 0.6 = 6.5
  assert.equal(r.body.components.memory, 10);
  assert.equal(r.body.components.context, 5);
  assert.equal(r.body.components.learning, 10);
  assert.equal(r.body.components.relationships, 8);
  assert.equal(r.body.components.goals, 3);
  assert.equal(r.body.components.wellness, 6);
  assert.equal(r.body.components.reflection, 0);
  assert.equal(r.body.overall, 6.5);
  assert.equal(r.body.level, 1);
});

test('PI Score — /api/pi-score/:userId/history returns array', async () => {
  const r = await fetch('/api/pi-score/u/history');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.history));
});

test('PI Score — /api/pi-score/:userId/widget returns compact shape', async () => {
  const r = await fetch('/api/pi-score/u/widget');
  assert.equal(r.status, 200);
  assert.equal(typeof r.body.score, 'number');
  assert.equal(typeof r.body.level, 'number');
  assert.equal(typeof r.body.levelName, 'string');
  assert.equal(typeof r.body.emoji, 'string');
  assert.equal(typeof r.body.tagline, 'string');
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
  // bypass our fetch helper and call directly
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

// Clean shutdown
process.on('exit', () => { try { server.close(); } catch {} });
