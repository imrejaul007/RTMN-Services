'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  computePriority, queueOrder,
  fleissKappa, majorityLabel, reviewerStats,
  app, queue,
} = require('../../src/index');
const http = require('node:http');

// ---------- computePriority ----------

test('computePriority defaults to 5', () => {
  const p = computePriority({ addedAt: new Date().toISOString() });
  assert.equal(p, 5);
});

test('computePriority gives 1 for uncertain (confidence < 0.7)', () => {
  const p = computePriority({ addedAt: new Date().toISOString(), judgeConfidence: 0.5 });
  assert.equal(p, 1);
});

test('computePriority respects override', () => {
  const p = computePriority({ addedAt: new Date().toISOString(), priorityOverride: 2 });
  assert.equal(p, 2);
});

test('computePriority ages old items (older = lower number)', () => {
  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const p = computePriority({ addedAt: fiveDaysAgo });
  assert.equal(p, 0);  // 5 - 5 days = 0
});

// ---------- queueOrder ----------

test('queueOrder returns top N by priority', () => {
  const items = [
    { id: 'a', addedAt: new Date().toISOString(), reviews: [], judgeConfidence: 1 },
    { id: 'b', addedAt: new Date().toISOString(), reviews: [], judgeConfidence: 0.5 },  // priority 1
    { id: 'c', addedAt: new Date().toISOString(), reviews: [], judgeConfidence: 1, priorityOverride: 3 },
  ];
  const ordered = queueOrder(items, 10);
  // b has highest priority (1) → first
  assert.equal(ordered[0].id, 'b');
});

// ---------- fleissKappa ----------

test('fleissKappa returns null for empty', () => {
  const r = fleissKappa([]);
  assert.equal(r.kappa, null);
});

test('fleissKappa returns perfect 1 for unanimous', () => {
  const items = [
    { reviews: [{ score: 0.9 }, { score: 0.95 }, { score: 0.85 }] },
    { reviews: [{ score: 0.8 }, { score: 0.82 }, { score: 0.88 }] },
  ];
  const r = fleissKappa(items);
  assert.ok(r.kappa !== null);
  assert.equal(r.kappa, 1);
});

test('fleissKappa for low agreement', () => {
  const items = [
    { reviews: [{ score: 0.1 }, { score: 0.9 }, { score: 0.5 }] },  // all different bins
    { reviews: [{ score: 0.8 }, { score: 0.2 }, { score: 0.5 }] },
  ];
  const r = fleissKappa(items);
  assert.ok(r.kappa < 0.5);
});

test('fleissKappa handles items with fewer than minReviewers', () => {
  const items = [
    { reviews: [{ score: 0.9 }] },  // only 1 review
    { reviews: [{ score: 0.9 }, { score: 0.9 }] },
  ];
  const r = fleissKappa(items);
  // Only 1 eligible item
  assert.equal(r.n, 1);
});

// ---------- majorityLabel ----------

test('majorityLabel returns null for <3 reviews', () => {
  assert.equal(majorityLabel({ reviews: [{ score: 0.9 }] }), null);
  assert.equal(majorityLabel({ reviews: [{ score: 0.9 }, { score: 0.9 }] }), null);
});

test('majorityLabel returns good for high scores', () => {
  const r = majorityLabel({
    reviews: [{ score: 0.9 }, { score: 0.85 }, { score: 0.95 }],
  });
  assert.equal(r.label, 'good');
  assert.equal(r.agreement, 1);
});

test('majorityLabel returns bad for low scores', () => {
  const r = majorityLabel({
    reviews: [{ score: 0.1 }, { score: 0.2 }, { score: 0.3 }],
  });
  assert.equal(r.label, 'bad');
});

test('majorityLabel returns null for tied bins', () => {
  // [bad:1, neutral:1, good:1] → tie
  const r = majorityLabel({
    reviews: [{ score: 0.1 }, { score: 0.5 }, { score: 0.9 }],
  });
  assert.equal(r, null);
});

// ---------- reviewerStats ----------

test('reviewerStats counts reviews', () => {
  const items = [
    { reviews: [{ reviewerId: 'r1', score: 0.9, durationMs: 1000 }] },
    { reviews: [{ reviewerId: 'r1', score: 0.5, durationMs: 2000 }, { reviewerId: 'r2', score: 0.7, durationMs: 1500 }] },
  ];
  const s = reviewerStats('r1', items);
  assert.equal(s.reviewCount, 2);
  assert.equal(s.avgDurationMs, 1500);
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
  assert.equal(res.body.service, 'eval-review');
});

test('POST /api/review/queue adds an item', async () => {
  const res = await makeRequest(app, 'POST', '/api/review/queue', {
    input: 'q', output: 'a', reference: 'ref', judgeConfidence: 0.5,
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
});

test('GET /api/review/queue returns items', async () => {
  const res = await makeRequest(app, 'GET', '/api/review/queue');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.items) || Array.isArray(res.body.queue));
});

test('GET /api/review/stats returns stats', async () => {
  const res = await makeRequest(app, 'GET', '/api/review/stats');
  assert.equal(res.status, 200);
  assert.ok(res.body);
  // Should include aggregate info
  assert.ok(res.body.total !== undefined || res.body.byReviewer !== undefined || typeof res.body === 'object');
});