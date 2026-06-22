#!/usr/bin/env node
/**
 * Learning OS v2 — Test Suite (ESM)
 *
 * Tests the Ebbinghaus-style spaced repetition service.
 * - Pure-function tests of lib/ebbinghaus.js
 * - HTTP API tests
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
const lib = await import('../lib/ebbinghaus.js');

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

test('lib — retention: 1.0 at lastReviewedAt', () => {
  const now = new Date().toISOString();
  const r = lib.retention({ lastReviewedAt: Date.now(), stability: 86400 }, now);
  assert.equal(r, 1);
});

test('lib — retention: decays exponentially', () => {
  const now = new Date();
  const oneDayAgo = now.getTime() - 86400000;
  const r = lib.retention({ lastReviewedAt: oneDayAgo, stability: 86400 }, now.toISOString());
  // e^(-1) ≈ 0.368
  assert.ok(r > 0.36 && r < 0.38, `expected ~0.368, got ${r}`);
});

test('lib — retention: 1/e ≈ 0.368 at one half-life', () => {
  const now = new Date();
  const oneHalfLifeAgo = now.getTime() - 5 * 86400000;
  const r = lib.retention({ lastReviewedAt: oneHalfLifeAgo, stability: 5 * 86400 }, now.toISOString());
  // retention = e^(-t/S) where t=S → e^(-1) ≈ 0.368
  assert.ok(r > 0.36 && r < 0.38, `expected ~0.368, got ${r}`);
});

test('lib — review: remembered=true doubles stability', () => {
  const fact = { stability: 86400, reviews: 0 };
  const r = lib.review(fact, true);
  assert.equal(r.stability, 86400 * 2.5);
  assert.equal(r.reviews, 1);
  assert.equal(r.lastRemembered, true);
});

test('lib — review: forgotten halves stability', () => {
  const fact = { stability: 86400, reviews: 5 };
  const r = lib.review(fact, false);
  assert.equal(r.stability, 43200);
  assert.equal(r.reviews, 6);
  assert.equal(r.lastRemembered, false);
});

test('lib — review: forgotten respects minStability', () => {
  const fact = { stability: 1800, reviews: 10 };
  const r = lib.review(fact, false, { minStability: 3600 });
  assert.ok(r.stability >= 3600);
});

test('lib — dueForReview: returns facts below threshold', () => {
  const now = Date.now();
  const facts = [
    { factId: 'a', lastReviewedAt: now - 10*86400000, stability: 86400 },   // ret ~ 0.000045 → due
    { factId: 'b', lastReviewedAt: now - 1*86400000,  stability: 30*86400 },  // ret ~ 0.96 → not due
    { factId: 'c', lastReviewedAt: now - 5*86400000,  stability: 86400 },    // ret ~ 0.0067 → due
  ];
  const due = lib.dueForReview(facts, { threshold: 0.7 });
  assert.equal(due.length, 2);
  assert.equal(due[0].fact.factId, 'a'); // lowest retention first
  assert.equal(due[1].fact.factId, 'c');
});

test('lib — stabilityTier: 1d → novice, 1w → familiar, 1mo → solid, 3mo+ → mastered', () => {
  assert.equal(lib.stabilityTier(86400 * 0.5).tier, 'novice');
  assert.equal(lib.stabilityTier(86400 * 3).tier, 'familiar');
  assert.equal(lib.stabilityTier(86400 * 15).tier, 'solid');
  assert.equal(lib.stabilityTier(86400 * 100).tier, 'mastered');
});

// ---------- HTTP API tests ----------

test('HTTP — /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'learning-os-v2');
});

test('HTTP — POST /facts creates a fact', async () => {
  const r = await fetch('/api/learning/facts', {
    method: 'POST',
    body: { userId: 'u1', factId: 'likes-coffee', text: 'User likes coffee', category: 'preferences' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.factId, 'likes-coffee');
  assert.equal(r.body.text, 'User likes coffee');
  assert.equal(r.body.retention, 1);
  assert.equal(r.body.stabilityTier, 'familiar'); // default 1-day stability → 1 day exactly
});

test('HTTP — POST /facts without userId returns 400', async () => {
  const r = await fetch('/api/learning/facts', {
    method: 'POST', body: { factId: 'x', text: 'no user' },
  });
  assert.equal(r.status, 400);
});

test('HTTP — POST /facts without factId returns 400', async () => {
  const r = await fetch('/api/learning/facts', {
    method: 'POST', body: { userId: 'u', text: 'no factId' },
  });
  assert.equal(r.status, 400);
});

test('HTTP — POST /facts without text returns 400', async () => {
  const r = await fetch('/api/learning/facts', {
    method: 'POST', body: { userId: 'u', factId: 'x' },
  });
  assert.equal(r.status, 400);
});

test('HTTP — GET /facts/:userId lists facts sorted by retention asc', async () => {
  await fetch('/api/learning/seed/u2', { method: 'POST', body: {} });
  const r = await fetch('/api/learning/facts/u2');
  assert.equal(r.status, 200);
  assert.ok(r.body.count >= 5);
  for (let i = 1; i < r.body.facts.length; i++) {
    assert.ok(r.body.facts[i - 1].retention <= r.body.facts[i].retention + 0.001);
  }
});

test('HTTP — POST /review with remembered=true boosts stability', async () => {
  const userId = 'u3-' + Date.now();
  await fetch('/api/learning/facts', {
    method: 'POST', body: { userId, factId: 'f1', text: 'something', stability: 86400 },
  });
  const r = await fetch('/api/learning/review', {
    method: 'POST', body: { userId, factId: 'f1', remembered: true },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.stability, 86400 * 2.5);
  assert.equal(r.body.reviews, 1);
  assert.equal(r.body.lastRemembered, true);
});

test('HTTP — POST /review with remembered=false halves stability', async () => {
  const userId = 'u4-' + Date.now();
  await fetch('/api/learning/facts', {
    method: 'POST', body: { userId, factId: 'f2', text: 'something', stability: 86400 * 10 },
  });
  const r = await fetch('/api/learning/review', {
    method: 'POST', body: { userId, factId: 'f2', remembered: false },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.stability, 86400 * 5);
  assert.equal(r.body.lastRemembered, false);
});

test('HTTP — POST /review missing remembered returns 400', async () => {
  const r = await fetch('/api/learning/review', {
    method: 'POST', body: { userId: 'u5', factId: 'f1' },
  });
  assert.equal(r.status, 400);
});

test('HTTP — POST /review for unknown fact returns 404', async () => {
  const r = await fetch('/api/learning/review', {
    method: 'POST', body: { userId: 'u6', factId: 'nonexistent', remembered: true },
  });
  assert.equal(r.status, 404);
});

test('HTTP — GET /due/:userId returns facts below threshold', async () => {
  await fetch('/api/learning/seed/u7', { method: 'POST', body: {} });
  const r = await fetch('/api/learning/due/u7?threshold=0.7');
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.due));
  // All returned facts should have retention < 0.7
  for (const f of r.body.due) {
    assert.ok(f.retention < 0.7);
  }
});

test('HTTP — GET /stats/:userId returns tier counts', async () => {
  await fetch('/api/learning/seed/u8', { method: 'POST', body: {} });
  const r = await fetch('/api/learning/stats/u8');
  assert.equal(r.status, 200);
  assert.equal(r.body.totalFacts, 5);
  assert.ok(r.body.totalReviews >= 0);
  assert.ok(r.body.byStabilityTier);
  assert.ok(typeof r.body.dueForReview === 'number');
});

test('HTTP — DELETE /facts/:userId/:factId removes', async () => {
  await fetch('/api/learning/facts', {
    method: 'POST', body: { userId: 'u9', factId: 'delete-me', text: 'temporary' },
  });
  const del = await fetch('/api/learning/facts/u9/delete-me', { method: 'DELETE' });
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  const list = await fetch('/api/learning/facts/u9');
  assert.ok(!list.body.facts.some((f) => f.factId === 'delete-me'));
});

test('HTTP — DELETE unknown fact returns 404', async () => {
  const r = await fetch('/api/learning/facts/u10/ghost', { method: 'DELETE' });
  assert.equal(r.status, 404);
});

test('HTTP — auth required', async () => {
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/learning/facts/u', method: 'GET' },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(r.status, 401);
});

test('HTTP — 404 on unknown route', async () => {
  const r = await fetch('/api/learning/nonsense');
  assert.equal(r.status, 404);
});

process.on('exit', () => { try { server.close(); } catch {} });
