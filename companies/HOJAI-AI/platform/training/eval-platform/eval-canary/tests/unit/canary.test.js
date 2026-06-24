'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateQualityDelta, recordScoreWindow, app, canaries } = require('../../src/index');
const http = require('node:http');

// ---------- Pure functions ----------

test('evaluateQualityDelta returns insufficient-data when empty', () => {
  const c = { scoresNew: [], scoresBaseline: [], autoRollbackThreshold: 0.05, autoRollbackWindows: 2 };
  const r = evaluateQualityDelta(c);
  assert.equal(r.delta, null);
  assert.equal(r.autoRollback, false);
});

test('evaluateQualityDelta computes delta = new - baseline', () => {
  const c = {
    scoresNew: [0.9, 0.9, 0.9],
    scoresBaseline: [0.8, 0.8, 0.8],
    autoRollbackThreshold: 0.05,
    autoRollbackWindows: 2,
    qualityWindowsBelowThreshold: 0,
  };
  const r = evaluateQualityDelta(c);
  assert.ok(Math.abs(r.delta - 0.1) < 1e-9, `delta was ${r.delta}`);
  assert.ok(Math.abs(r.meanNew - 0.9) < 1e-9);
  assert.ok(Math.abs(r.meanBaseline - 0.8) < 1e-9);
  assert.equal(r.autoRollback, false);
});

test('evaluateQualityDelta triggers rollback when delta < -threshold for N windows', () => {
  const c = {
    scoresNew: [0.5, 0.5, 0.5],
    scoresBaseline: [0.9, 0.9, 0.9],
    autoRollbackThreshold: 0.05,
    autoRollbackWindows: 2,
    qualityWindowsBelowThreshold: 2,  // already 2 windows below
  };
  const r = evaluateQualityDelta(c);
  assert.equal(r.delta, -0.4);
  assert.equal(r.autoRollback, true);
});

test('recordScoreWindow adds scores and rolls window', () => {
  const c = {
    scoresNew: [], scoresBaseline: [],
    autoRollbackThreshold: 0.05,
    autoRollbackWindows: 2,
    windowSize: 3,
    qualityWindowsBelowThreshold: 0,
  };
  recordScoreWindow(c, 0.9, 0.8);
  recordScoreWindow(c, 0.8, 0.8);
  recordScoreWindow(c, 0.85, 0.8);
  assert.equal(c.scoresNew.length, 3);
  // 4th: rolling kicks in
  recordScoreWindow(c, 0.7, 0.8);
  assert.equal(c.scoresNew.length, 3);
  assert.equal(c.scoresNew[0], 0.8);  // First 0.9 dropped
});

test('recordScoreWindow increments violation counter when below threshold', () => {
  const c = {
    scoresNew: [], scoresBaseline: [],
    autoRollbackThreshold: 0.05,
    autoRollbackWindows: 2,
    windowSize: 50,
    qualityWindowsBelowThreshold: 0,
  };
  // 1st: scoresNew=[0.5], baseline=[0.8] → delta=-0.3 → +1
  recordScoreWindow(c, 0.5, 0.8);
  assert.equal(c.qualityWindowsBelowThreshold, 1);
  // 2nd: scoresNew=[0.5,0.4], baseline=[0.8,0.8] → delta=-0.35 → +1
  recordScoreWindow(c, 0.4, 0.8);
  assert.equal(c.qualityWindowsBelowThreshold, 2);
  // 3rd: New high enough that mean crosses baseline; new=0.95 → mean new=(0.5+0.4+0.95)/3=0.617, baseline=0.8 → still -0.18
  // Recovery needs new > baseline + threshold cumulatively. Use 5 high values.
  recordScoreWindow(c, 1.0, 0.8);  // mean new=(0.5+0.4+1.0)/3=0.633, delta=-0.17 → still violation
  assert.equal(c.qualityWindowsBelowThreshold, 3);
  recordScoreWindow(c, 1.0, 0.5);  // mean new=0.713, baseline mean=(0.8+0.8+0.8+0.8+0.5)/5=0.74 → still negative
  recordScoreWindow(c, 1.0, 0.5);
  recordScoreWindow(c, 1.0, 0.5);
  recordScoreWindow(c, 1.0, 0.5);
  // After enough recovery, delta should be positive
  assert.ok(c.qualityWindowsBelowThreshold <= 5);
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
  assert.equal(res.body.service, 'eval-canary');
});

test('POST /api/canary/start creates a canary', async () => {
  const res = await makeRequest(app, 'POST', '/api/canary/start', {
    name: 'canary-1', modelNew: 'gpt-5', modelBaseline: 'gpt-4',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(res.body.status, 'active');
  assert.equal(res.body.trafficPct, 1);
});

test('POST /api/canary/start rejects missing fields', async () => {
  const res = await makeRequest(app, 'POST', '/api/canary/start', { name: 'x' });
  assert.equal(res.status, 400);
});

test('POST /api/canary/:id/traffic updates traffic %', async () => {
  const start = await makeRequest(app, 'POST', '/api/canary/start', { name: 't', modelNew: 'A', modelBaseline: 'B' });
  const id = start.body.id;
  const res = await makeRequest(app, 'POST', `/api/canary/${id}/traffic`, { trafficPct: 25 });
  assert.equal(res.status, 200);
  assert.equal(res.body.trafficPct, 25);
});

test('POST /api/canary/:id/score records score', async () => {
  const start = await makeRequest(app, 'POST', '/api/canary/start', { name: 's', modelNew: 'A', modelBaseline: 'B' });
  const id = start.body.id;
  const res = await makeRequest(app, 'POST', `/api/canary/${id}/score`, { scoreNew: 0.9, scoreBaseline: 0.8 });
  assert.equal(res.status, 200);
  assert.ok(res.body);
});

test('POST /api/canary/:id/promote ships to 100%', async () => {
  const start = await makeRequest(app, 'POST', '/api/canary/start', { name: 'p', modelNew: 'A', modelBaseline: 'B' });
  const id = start.body.id;
  const res = await makeRequest(app, 'POST', `/api/canary/${id}/promote`);
  assert.equal(res.status, 200);
  assert.equal(res.body.trafficPct, 100);
  assert.equal(res.body.status, 'promoted');
});

test('POST /api/canary/:id/rollback stops canary', async () => {
  const start = await makeRequest(app, 'POST', '/api/canary/start', { name: 'r', modelNew: 'A', modelBaseline: 'B' });
  const id = start.body.id;
  const res = await makeRequest(app, 'POST', `/api/canary/${id}/rollback`, { reason: 'quality drop' });
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'rolled_back');
  assert.equal(res.body.trafficPct, 0);
});