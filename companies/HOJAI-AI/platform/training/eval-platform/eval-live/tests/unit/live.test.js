'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  shouldSample, timeBucket, dayKey,
  indexSample, windowIndex, listRecentWindows, summarizeWindow,
  evaluateAlerts, alerts, alertFires,
  config,
  app,
} = require('../../src/index');
const http = require('node:http');

// ---------- Sampling ----------

test('shouldSample returns boolean', () => {
  assert.equal(typeof shouldSample(0), 'boolean');
  assert.equal(shouldSample(0), false);
  assert.equal(shouldSample(1), true);
});

test('shouldSample clamps rate to [0,1]', () => {
  // rate=-1 → max(0, ...) = 0 → always false
  assert.equal(shouldSample(-1), false);
  // rate=2 → min(1, ...) = 1 → always true
  assert.equal(shouldSample(2), true);
});

// ---------- Time bucketing ----------

test('timeBucket produces ISO string', () => {
  const bucket = timeBucket(new Date('2026-06-24T10:07:30Z'));
  assert.equal(typeof bucket, 'string');
  assert.ok(bucket.includes('T'));
});

test('timeBucket groups same-window timestamps', () => {
  const a = timeBucket(new Date('2026-06-24T10:00:00Z'));
  const b = timeBucket(new Date('2026-06-24T10:04:59Z'));
  const c = timeBucket(new Date('2026-06-24T10:05:00Z'));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('dayKey returns YYYY-MM-DD', () => {
  const k = dayKey(new Date('2026-06-24T10:00:00Z'));
  assert.equal(k, '2026-06-24');
});

// ---------- indexSample + summarizeWindow + listRecentWindows ----------

test('indexSample adds sample to windowIndex', () => {
  windowIndex.clear();
  indexSample({
    ts: Date.now(),
    latencyMs: 100,
    costUsd: 0.001,
    scores: { accuracy: 0.9 },
  });
  assert.equal(windowIndex.size, 1);
  const [entry] = windowIndex.values();
  assert.equal(entry.count, 1);
});

test('summarizeWindow computes p50/p95/p99', () => {
  const entry = {
    count: 100,
    scores: { accuracy: [0.8, 0.9, 0.85] },
    latencies: Array.from({ length: 100 }, (_, i) => i + 1),
    costs: [0.001, 0.002, 0.003],
  };
  const s = summarizeWindow(entry);
  assert.equal(s.count, 100);
  assert.ok(s.latencyMs.p50 > 0);
  assert.ok(s.latencyMs.p95 >= s.latencyMs.p50);
  assert.ok(s.latencyMs.p99 >= s.latencyMs.p95);
  assert.equal(Math.round(s.scores.accuracy * 100) / 100, 0.85);
  assert.equal(s.costUsd.total, 0.006);
});

test('summarizeWindow handles empty', () => {
  const s = summarizeWindow({ count: 0, scores: {}, latencies: [], costs: [] });
  assert.equal(s.count, 0);
  assert.equal(s.latencyMs.p50, null);
});

test('listRecentWindows returns sorted windows', () => {
  windowIndex.clear();
  const now = Date.now();
  indexSample({ ts: now - 600000, latencyMs: 10, scores: { accuracy: 0.7 } });
  indexSample({ ts: now - 300000, latencyMs: 20, scores: { accuracy: 0.8 } });
  indexSample({ ts: now, latencyMs: 30, scores: { accuracy: 0.9 } });
  const wins = listRecentWindows(10);
  assert.equal(wins.length, 3);
  // Latest first via ascending sort
  assert.equal(wins[wins.length - 1].scores.accuracy, 0.9);
});

// ---------- Alerts ----------

test('evaluateAlerts fires when threshold violated', () => {
  // Clear any state
  alerts.length = 0;
  alertFires.length = 0;
  windowIndex.clear();
  // Seed enough windows with low latency to violate threshold
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    indexSample({ ts: now - (2 - i) * 600000, latencyMs: 10, scores: { accuracy: 0.5 } });
  }
  alerts.push({
    id: 'a1', name: 'low-acc',
    metric: 'scores.accuracy',
    threshold: 0.7,
    direction: 'lt',
    windowCount: 3,
  });
  const fired = evaluateAlerts();
  assert.equal(fired.length, 1);
  assert.equal(fired[0].alertId, 'a1');
});

test('evaluateAlerts does not fire when above threshold', () => {
  alerts.length = 0;
  alertFires.length = 0;
  windowIndex.clear();
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    indexSample({ ts: now - (2 - i) * 600000, latencyMs: 10, scores: { accuracy: 0.95 } });
  }
  alerts.push({
    id: 'a2', name: 'high-acc',
    metric: 'scores.accuracy',
    threshold: 0.7,
    direction: 'lt',
    windowCount: 3,
  });
  const fired = evaluateAlerts();
  assert.equal(fired.length, 0);
});

test('evaluateAlerts handles gt direction', () => {
  alerts.length = 0;
  alertFires.length = 0;
  windowIndex.clear();
  const now = Date.now();
  for (let i = 0; i < 3; i++) {
    indexSample({ ts: now - (2 - i) * 600000, latencyMs: 10, scores: { accuracy: 0.3 } });
  }
  alerts.push({
    id: 'a3', name: 'low-acc-gt',
    metric: 'scores.accuracy',
    threshold: 0.5,
    direction: 'gt',
    windowCount: 3,
  });
  // gt direction: fires when value > threshold (low scores wouldn't trigger gt)
  const fired = evaluateAlerts();
  assert.equal(fired.length, 0);
});

// ---------- HTTP ----------

function makeRequest(theApp, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const server = theApp.listen(0, () => {
      const { port } = server.address();
      const opts = {
        method, hostname: '127.0.0.1', port, path: urlPath,
        headers: { 'Content-Type': 'application/json' },
      };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on('error', reject);
      if (body !== undefined) req.write(JSON.stringify(body));
      req.end();
    });
  });
}

test('GET /api/health returns ok', async () => {
  const res = await makeRequest(app, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'eval-live');
});

test('POST /api/config updates sampling rate', async () => {
  const res = await makeRequest(app, 'POST', '/api/config', { samplingRate: 0 });
  assert.equal(res.status, 200);
  assert.equal(res.body.samplingRate, 0);
  // Restore
  await makeRequest(app, 'POST', '/api/config', { samplingRate: 0.1 });
});

test('POST /api/sample applies sampling (forceScore=false)', async () => {
  // Set rate to 0 → should not sample
  await makeRequest(app, 'POST', '/api/config', { samplingRate: 0 });
  const res = await makeRequest(app, 'POST', '/api/sample', { input: 'q', output: 'a' });
  assert.equal(res.status, 201);
  assert.equal(res.body.sampled, false);
  // Restore
  await makeRequest(app, 'POST', '/api/config', { samplingRate: 0.1 });
});

test('POST /api/score records a sample', async () => {
  const res = await makeRequest(app, 'POST', '/api/score', {
    input: 'q', output: 'a', reference: 'a', scores: { accuracy: 1 },
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.ok !== false);
});

test('GET /api/metrics returns summary', async () => {
  const res = await makeRequest(app, 'GET', '/api/metrics');
  assert.equal(res.status, 200);
  assert.ok(res.body);
});

test('GET /api/dashboard returns dashboard data', async () => {
  const res = await makeRequest(app, 'GET', '/api/dashboard');
  assert.equal(res.status, 200);
  assert.ok(res.body);
});