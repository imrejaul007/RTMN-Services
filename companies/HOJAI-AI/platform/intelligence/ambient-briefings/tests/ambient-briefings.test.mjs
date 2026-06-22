#!/usr/bin/env node
/**
 * Ambient Briefings — Test Suite (ESM)
 *
 * Tests:
 *   - Pure-function tests of lib/kinds.js (time math, kinds, fallback message)
 *   - HTTP API tests
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
const lib = await import('../lib/kinds.js');

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

test('lib — kindFor: returns mid-day for 1pm weekday', () => {
  assert.equal(lib.kindFor(13, 3), 'mid-day');  // Wed 1pm
});

test('lib — kindFor: returns evening for 7pm weekday', () => {
  assert.equal(lib.kindFor(19, 3), 'evening');  // Wed 7pm
});

test('lib — kindFor: returns weekend-prep on Fri 6pm', () => {
  assert.equal(lib.kindFor(18, 5), 'weekend-prep');
});

test('lib — kindFor: returns weekly-recap on Sun 8pm', () => {
  assert.equal(lib.kindFor(20, 0), 'weekly-recap');
});

test('lib — kindFor: returns null outside any window', () => {
  assert.equal(lib.kindFor(3, 3), null);   // Wed 3am
  assert.equal(lib.kindFor(15, 3), null);  // Wed 3pm (between mid-day and evening)
  assert.equal(lib.kindFor(22, 5), null);  // Fri 10pm (after weekend-prep window)
});

test('lib — KINDS: all 5 kinds present', () => {
  for (const k of ['mid-day', 'evening', 'weekend-prep', 'weekly-recap', 'monthly']) {
    assert.ok(lib.KINDS[k], `missing kind: ${k}`);
    assert.ok(lib.KINDS[k].icon);
    assert.ok(lib.KINDS[k].label);
    assert.ok(lib.KINDS[k].tone);
  }
});

test('lib — describeKind: returns metadata for valid kind', () => {
  assert.equal(lib.describeKind('evening').tone, 'reflective');
  assert.equal(lib.describeKind('mid-day').tone, 'casual');
  assert.equal(lib.describeKind('bogus'), null);
});

test('lib — alreadySentToday + markSent', () => {
  const log = {};
  assert.equal(lib.alreadySentToday(log, 'u', 'evening', '2026-06-22'), false);
  lib.markSent(log, 'u', 'evening', '2026-06-22');
  assert.equal(lib.alreadySentToday(log, 'u', 'evening', '2026-06-22'), true);
});

test('lib — fallbackMessage composes sections', () => {
  const sections = {
    calendar: { summary: '3 events today' },
    goals: { summary: '5 active goals' },
  };
  const msg = lib.fallbackMessage('mid-day', sections, 'Alex');
  assert.match(msg, /Quick check-in, Alex/);
  assert.match(msg, /3 events today/);
  assert.match(msg, /5 active goals/);
});

test('lib — fallbackMessage handles missing sections gracefully', () => {
  const msg = lib.fallbackMessage('evening', {});
  assert.ok(msg.length > 0);
  assert.match(msg, /Wrapping up/);
});

// ---------- HTTP API tests ----------

test('HTTP — /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'ambient-briefings');
});

test('HTTP — GET /api/ambient/schedule returns kinds + currentKind', async () => {
  const r = await fetch('/api/ambient/schedule?tz=UTC');
  assert.equal(r.status, 200);
  assert.equal(Array.isArray(r.body.todaySchedule));
  assert.equal(r.body.todaySchedule.length, 5);
  assert.equal(typeof r.body.currentKind === 'string' || r.body.currentKind === null);
});

test('HTTP — POST /api/ambient/evening with userId generates a briefing', async () => {
  const r = await fetch('/api/ambient/evening', {
    method: 'POST',
    body: { userId: 'u-ambient-1' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.kind, 'evening');
  assert.equal(r.body.label, 'Evening recap');
  assert.ok(r.body.message);
  assert.ok(r.body.sections);
});

test('HTTP — POST /api/ambient/mid-day also works', async () => {
  const r = await fetch('/api/ambient/mid-day', {
    method: 'POST',
    body: { userId: 'u-ambient-2' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.kind, 'mid-day');
});

test('HTTP — POST /api/ambient/:kind without userId returns 400', async () => {
  const r = await fetch('/api/ambient/evening', { method: 'POST', body: {} });
  assert.equal(r.status, 400);
});

test('HTTP — POST /api/ambient/bogus returns 400', async () => {
  const r = await fetch('/api/ambient/bogus', { method: 'POST', body: { userId: 'u' } });
  assert.equal(r.status, 400);
});

test('HTTP — second POST same day returns 409 ALREADY_SENT', async () => {
  const userId = 'u-dup-' + Date.now();
  const r1 = await fetch('/api/ambient/weekly-recap', { method: 'POST', body: { userId } });
  assert.equal(r1.status, 200);
  const r2 = await fetch('/api/ambient/weekly-recap', { method: 'POST', body: { userId } });
  assert.equal(r2.status, 409);
  assert.match(r2.body.error?.message || r2.full?.error?.message, /already sent/i);
});

test('HTTP — disabled kind returns 403', async () => {
  const userId = 'u-disabled-' + Date.now();
  await fetch('/api/ambient/preferences', {
    method: 'POST', body: { userId, kinds: { evening: false } },
  });
  const r = await fetch('/api/ambient/evening', { method: 'POST', body: { userId } });
  assert.equal(r.status, 403);
});

test('HTTP — POST /preferences merges with defaults', async () => {
  const userId = 'u-prefs-' + Date.now();
  const r = await fetch('/api/ambient/preferences', {
    method: 'POST',
    body: { userId, quietHoursStart: 23, timezone: 'America/Los_Angeles' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.quietHoursStart, 23);
  assert.equal(r.body.timezone, 'America/Los_Angeles');
  assert.equal(r.body.kinds['mid-day'], true); // default preserved
});

test('HTTP — GET /preferences/:userId returns merged prefs', async () => {
  const userId = 'u-prefs2-' + Date.now();
  await fetch('/api/ambient/preferences', {
    method: 'POST', body: { userId, quietHoursStart: 21 },
  });
  const r = await fetch(`/api/ambient/preferences/${userId}`);
  assert.equal(r.status, 200);
  assert.equal(r.body.quietHoursStart, 21);
});

test('HTTP — GET /preferences/:userId returns defaults for unknown user', async () => {
  const r = await fetch('/api/ambient/preferences/never-existed');
  assert.equal(r.status, 200);
  assert.equal(r.body.kinds['mid-day'], true);
  assert.equal(r.body.enabled, true);
});

test('HTTP — GET /history/:userId returns array', async () => {
  const userId = 'u-hist-' + Date.now();
  await fetch('/api/ambient/monthly', { method: 'POST', body: { userId } });
  const r = await fetch(`/api/ambient/history/${userId}`);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.briefings));
  assert.ok(r.body.briefings.length >= 1);
});

test('HTTP — auth required', async () => {
  const r = await new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: '/api/ambient/schedule', method: 'GET' },
      (res) => { res.resume(); res.on('end', () => resolve({ status: res.statusCode })); }
    );
    req.on('error', reject);
    req.end();
  });
  assert.equal(r.status, 401);
});

test('HTTP — 404 on unknown route', async () => {
  const r = await fetch('/api/ambient/nonsense');
  assert.equal(r.status, 404);
});

process.on('exit', () => { try { server.close(); } catch {} });