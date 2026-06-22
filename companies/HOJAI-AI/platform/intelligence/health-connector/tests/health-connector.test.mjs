#!/usr/bin/env node
/**
 * Health Connector — Test Suite (ESM)
 *
 * 30 tests covering: pure library functions, normalization, daily summary,
 * weekly trend, Pearson correlation, correlations engine, nudges, opt-in
 * registry, and the full HTTP API.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

process.env.PORT = '0';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';

const { default: app } = await import('../src/index.js');
const lib = await import('../lib/health.js');

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

const userId = `u-${Date.now()}`;

// ============================================================
// PURE LIBRARY TESTS
// ============================================================

test('lib — SOURCES exposes 5 providers', () => {
  assert.equal(lib.SOURCE_LIST.length, 5);
  assert.ok(lib.SOURCE_LIST.includes('apple_health'));
  assert.ok(lib.SOURCE_LIST.includes('google_fit'));
  assert.ok(lib.SOURCE_LIST.includes('whoop'));
  assert.ok(lib.SOURCE_LIST.includes('oura'));
  assert.ok(lib.SOURCE_LIST.includes('manual'));
});

test('lib — SOURCE_METRICS lists supported metrics per source', () => {
  assert.deepEqual(lib.SOURCE_METRICS.whoop, ['recovery_score', 'strain', 'sleep_minutes', 'workouts']);
  assert.deepEqual(lib.SOURCE_METRICS.oura, ['readiness_score', 'sleep_minutes', 'activity_score']);
  assert.ok(lib.SOURCE_METRICS.apple_health.includes('hrv'));
});

test('lib — normalizeReading accepts a valid reading', () => {
  const r = lib.normalizeReading({
    source: 'apple_health',
    metric: 'steps',
    value: 8500,
    takenAt: '2026-06-22T10:00:00Z',
  });
  assert.equal(r.source, 'apple_health');
  assert.equal(r.metric, 'steps');
  assert.equal(r.value, 8500);
  assert.equal(r.unit, 'count');
});

test('lib — normalizeReading rejects unknown source', () => {
  assert.throws(() => lib.normalizeReading({ source: 'fitbit', metric: 'steps', value: 1 }), /Unknown source/);
});

test('lib — normalizeReading rejects unsupported metric', () => {
  assert.throws(
    () => lib.normalizeReading({ source: 'oura', metric: 'hrv', value: 50 }),
    /not supported/
  );
});

test('lib — normalizeReading rejects non-numeric value', () => {
  assert.throws(
    () => lib.normalizeReading({ source: 'manual', metric: 'mood', value: 'happy' }),
    /finite number/
  );
});

test('lib — normalizeReading rejects invalid date', () => {
  assert.throws(
    () => lib.normalizeReading({ source: 'manual', metric: 'mood', value: 5, takenAt: 'not-a-date' }),
    /valid date/
  );
});

test('lib — dailySummary aggregates steps and sleep, averages mood', () => {
  const today = '2026-06-22';
  const readings = [
    { takenAt: `${today}T08:00:00Z`, metric: 'steps', value: 5000 },
    { takenAt: `${today}T18:00:00Z`, metric: 'steps', value: 3500 },
    { takenAt: `${today}T07:00:00Z`, metric: 'sleep_minutes', value: 420 },
    { takenAt: `${today}T22:00:00Z`, metric: 'mood', value: 6 },
    { takenAt: `${today}T15:00:00Z`, metric: 'mood', value: 8 },
  ];
  const summary = lib.dailySummary(readings, today);
  assert.equal(summary.date, today);
  assert.equal(summary.metrics.steps, 8500);
  assert.equal(summary.metrics.sleep_minutes, 420);
  assert.equal(summary.metrics.mood, 7); // average of 6 and 8
  assert.equal(summary.readingCount, 5);
});

test('lib — dailySummary returns empty when no readings match the date', () => {
  const summary = lib.dailySummary([], '2099-01-01');
  assert.equal(summary.readingCount, 0);
  assert.deepEqual(summary.metrics, {});
});

test('lib — weeklyTrend returns N days oldest-first', () => {
  const trend = lib.weeklyTrend([], 7);
  assert.equal(trend.length, 7);
  assert.ok(trend[0].date < trend[6].date);
});

test('lib — pearson returns 1 for perfectly correlated series', () => {
  assert.equal(lib.pearson([1, 2, 3, 4], [2, 4, 6, 8]), 1);
});

test('lib — pearson returns -1 for perfectly anti-correlated series', () => {
  assert.equal(lib.pearson([1, 2, 3, 4], [4, 3, 2, 1]), -1);
});

test('lib — pearson returns null for insufficient data', () => {
  assert.equal(lib.pearson([1], [2]), null);
  assert.equal(lib.pearson([], []), null);
  assert.equal(lib.pearson([1, 2], [1, 2, 3]), null);
});

test('lib — pearson returns null for zero variance', () => {
  assert.equal(lib.pearson([5, 5, 5], [1, 2, 3]), null);
});

test('lib — pearson returns 0 for uncorrelated series', () => {
  // Two independent quasi-random sequences (e-digits, pi-digits)
  const r = lib.pearson([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8], [2, 7, 1, 8, 2, 8, 1, 8, 2, 8, 4, 5]);
  assert.ok(Math.abs(r) < 0.3, `expected |r| < 0.3, got ${r}`);
});

test('lib — findCorrelations surfaces strong mood↔sleep relationships', () => {
  const today = new Date();
  const readings = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString();
    const sleep = 300 + i * 15; // 300, 315, 330 ... increasing
    const mood = 4 + i * 0.3;
    readings.push({ takenAt: iso, metric: 'sleep_minutes', value: sleep });
    readings.push({ takenAt: iso, metric: 'mood', value: mood });
  }
  const corrs = lib.findCorrelations(readings, 14, 0.5);
  const sleepCorr = corrs.find((c) => c.driver === 'mood' && c.target === 'sleep_minutes');
  assert.ok(sleepCorr, 'should find mood↔sleep correlation');
  assert.ok(sleepCorr.r > 0.9);
});

test('lib — findCorrelations returns empty when below threshold', () => {
  const corrs = lib.findCorrelations([], 14, 0.99);
  assert.equal(corrs.length, 0);
});

test('lib — nudgeForSleepDebt returns null when sleep is healthy', () => {
  const trend = [
    { date: '2026-06-20', metrics: { sleep_minutes: 480 } },
    { date: '2026-06-21', metrics: { sleep_minutes: 450 } },
    { date: '2026-06-22', metrics: { sleep_minutes: 460 } },
  ];
  assert.equal(lib.nudgeForSleepDebt(trend), null);
});

test('lib — nudgeForSleepDebt fires after 3 nights of <6h sleep', () => {
  const trend = [
    { date: '2026-06-20', metrics: { sleep_minutes: 300 } },
    { date: '2026-06-21', metrics: { sleep_minutes: 280 } },
    { date: '2026-06-22', metrics: { sleep_minutes: 200 } },
  ];
  const nudge = lib.nudgeForSleepDebt(trend);
  assert.ok(nudge);
  assert.equal(nudge.kind, 'sleep_debt');
  assert.ok(nudge.message.includes('block your calendar'));
});

test('lib — nudgeForSleepDebt severity escalates with debt duration', () => {
  const trend = Array.from({ length: 5 }, () => ({ metrics: { sleep_minutes: 200 } }));
  const nudge = lib.nudgeForSleepDebt(trend);
  assert.equal(nudge.severity, 'high');
});

test('lib — nudgeForWorkoutGoal fires when behind', () => {
  const trend = [
    { date: '2026-06-20', metrics: { workouts: 1 } },
    { date: '2026-06-21', metrics: { workouts: 0 } },
    { date: '2026-06-22', metrics: { workouts: 1 } },
  ];
  const nudge = lib.nudgeForWorkoutGoal(trend, 12);
  assert.ok(nudge);
  assert.equal(nudge.kind, 'workout_budget');
});

test('lib — nudgeForWorkoutGoal returns null when on track', () => {
  const trend = [
    { date: '2026-06-20', metrics: { workouts: 4 } },
    { date: '2026-06-21', metrics: { workouts: 5 } },
    { date: '2026-06-22', metrics: { workouts: 5 } },
  ];
  assert.equal(lib.nudgeForWorkoutGoal(trend, 12), null);
});

test('lib — defaultPrefs has nothing enabled and write off', () => {
  const p = lib.defaultPrefs();
  assert.deepEqual(p.enabledSources, []);
  assert.deepEqual(p.writeEnabled, {});
  assert.equal(p.digestHourUtc, 8);
});

test('lib — setSourceEnabled toggles sources', () => {
  const p = lib.setSourceEnabled(lib.defaultPrefs(), 'apple_health', true);
  assert.ok(p.enabledSources.includes('apple_health'));
  const p2 = lib.setSourceEnabled(p, 'apple_health', false);
  assert.ok(!p2.enabledSources.includes('apple_health'));
});

test('lib — setSourceEnabled rejects unknown source', () => {
  assert.throws(() => lib.setSourceEnabled(lib.defaultPrefs(), 'fitbit', true), /Unknown source/);
});

test('lib — isSourceEnabled returns false for default prefs', () => {
  assert.equal(lib.isSourceEnabled(lib.defaultPrefs(), 'apple_health'), false);
});

// ============================================================
// HTTP API TESTS
// ============================================================

test('http — GET /health returns healthy', async () => {
  const r = await fetch('/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
});

test('http — GET /api/health/sources lists all 5', async () => {
  const r = await fetch('/api/health/sources');
  assert.equal(r.status, 200);
  assert.equal(r.body.sources.length, 5);
  assert.ok(r.body.metrics.apple_health);
});

test('http — POST /api/health/:userId/reading rejects when source is not opted-in', async () => {
  const r = await fetch(`/api/health/${userId}/reading`, {
    method: 'POST',
    body: { source: 'apple_health', metric: 'steps', value: 1000 },
  });
  assert.equal(r.status, 403);
  assert.equal(r.body.error.code, 'source_disabled');
});

test('http — POST /api/health/:userId/reading accepts a reading when source enabled', async () => {
  await fetch(`/api/health/${userId}/preferences`, {
    method: 'PUT',
    body: { enabledSources: ['apple_health', 'manual'] },
  });
  const r = await fetch(`/api/health/${userId}/reading`, {
    method: 'POST',
    body: { source: 'apple_health', metric: 'steps', value: 8500, takenAt: '2026-06-22T10:00:00Z' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.value, 8500);
  assert.ok(r.body.id);
});

test('http — POST /api/health/:userId/readings batches', async () => {
  const r = await fetch(`/api/health/${userId}/readings`, {
    method: 'POST',
    body: {
      readings: [
        { source: 'manual', metric: 'mood', value: 7, takenAt: '2026-06-22T08:00:00Z' },
        { source: 'manual', metric: 'energy', value: 6, takenAt: '2026-06-22T08:00:00Z' },
        { source: 'whoop', metric: 'recovery_score', value: 75 }, // not enabled
      ],
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.stored, 2);
  assert.equal(r.body.errors.length, 1);
});

test('http — GET /api/health/:userId/summary aggregates today', async () => {
  const r = await fetch(`/api/health/${userId}/summary?date=2026-06-22`);
  assert.equal(r.status, 200);
  assert.equal(r.body.date, '2026-06-22');
  assert.ok(r.body.readingCount >= 1);
});

test('http — GET /api/health/:userId/trend returns N days', async () => {
  const r = await fetch(`/api/health/${userId}/trend?days=7`);
  assert.equal(r.status, 200);
  assert.equal(r.body.trend.length, 7);
});

test('http — DELETE /api/health/:userId deletes everything', async () => {
  const r = await fetch(`/api/health/${userId}`, { method: 'DELETE' });
  assert.equal(r.status, 200);
  assert.equal(r.body.disconnected, true);
  // confirm gone
  const after = await fetch(`/api/health/${userId}/readings`);
  assert.equal(after.body.count, 0);
});

process.on('exit', () => { try { server.close(); } catch {} });
