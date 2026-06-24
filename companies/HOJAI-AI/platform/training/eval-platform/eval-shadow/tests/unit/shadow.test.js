'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mean, stddev, studentTPairedTTest, twoTailedTProb,
  incompleteBeta, logGamma,
  app, runs,
} = require('../../src/index');
const http = require('node:http');

// ---------- Basic stats ----------

test('mean of empty = 0', () => {
  assert.equal(mean([]), 0);
});

test('mean computes arithmetic mean', () => {
  assert.equal(mean([1, 2, 3, 4, 5]), 3);
});

test('stddev of single = 0', () => {
  assert.equal(stddev([5]), 0);
});

test('stddev of constant = 0', () => {
  assert.equal(stddev([5, 5, 5, 5]), 0);
});

test('stddev of varied', () => {
  // [2,4,4,4,5,5,7,9] has known stddev = 2.138
  const s = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
  assert.ok(Math.abs(s - 2.138) < 0.01, `stddev was ${s}`);
});

// ---------- logGamma ----------

test('logGamma(1) = 0', () => {
  assert.ok(Math.abs(logGamma(1) - 0) < 1e-9);
});

test('logGamma(0.5) = log(sqrt(pi))', () => {
  assert.ok(Math.abs(logGamma(0.5) - Math.log(Math.sqrt(Math.PI))) < 1e-9);
});

test('logGamma(n) = log((n-1)!) for positive ints', () => {
  // logGamma(5) = log(24) ≈ 3.178
  assert.ok(Math.abs(logGamma(5) - Math.log(24)) < 1e-9);
});

// ---------- incompleteBeta ----------

test('incompleteBeta(0) = 0', () => {
  assert.equal(incompleteBeta(0, 1, 1), 0);
});

test('incompleteBeta(1) = 1', () => {
  assert.equal(incompleteBeta(1, 1, 1), 1);
});

// ---------- twoTailedTProb ----------

test('twoTailedTProb handles infinity as 0', () => {
  assert.equal(twoTailedTProb(Infinity, 10), 0);
});

test('twoTailedTProb handles df<=0 as 1', () => {
  assert.equal(twoTailedTProb(2, 0), 1);
});

test('twoTailedTProb for t=0 is ~0.5', () => {
  const p = twoTailedTProb(0, 10);
  assert.ok(Math.abs(p - 0.5) < 0.01, `p was ${p}`);
});

test('twoTailedTProb for large t → 0', () => {
  assert.ok(twoTailedTProb(10, 10) < 0.001);
});

// ---------- studentTPairedTTest ----------

test('studentTPairedTTest throws on length mismatch', () => {
  assert.throws(() => studentTPairedTTest([1, 2], [1, 2, 3]), /length mismatch/);
});

test('studentTPairedTTest returns safe for n<2', () => {
  const r = studentTPairedTTest([1], [1]);
  assert.equal(r.pValue, 1);
  assert.equal(r.df, 0);
});

test('studentTPairedTTest for B>A (B better): negative t', () => {
  // b - a < 0 → t negative → p small
  const a = [0.5, 0.5, 0.5, 0.5, 0.5];
  const b = [0.6, 0.6, 0.6, 0.6, 0.6];
  const r = studentTPairedTTest(a, b);
  assert.ok(r.t < 0);
  assert.ok(r.pValue < 0.05);
});

test('studentTPairedTTest for identical returns p ~ 1', () => {
  const a = [0.5, 0.5, 0.5, 0.5, 0.5];
  const b = [0.5, 0.5, 0.5, 0.5, 0.5];
  const r = studentTPairedTTest(a, b);
  assert.equal(r.t, 0);
  assert.equal(r.pValue, 1);
});

test('studentTPairedTTest for constant non-zero diff → p=0', () => {
  const a = [0.5, 0.5, 0.5, 0.5, 0.5];
  const b = [0.6, 0.6, 0.6, 0.6, 0.6];
  const r = studentTPairedTTest(a, b);
  assert.equal(r.pValue, 0);
});

test('studentTPairedTTest noisy data has reasonable p', () => {
  // a is slightly better than b with noise
  const a = [0.7, 0.75, 0.72, 0.68, 0.71, 0.74, 0.73, 0.69, 0.72, 0.71];
  const b = [0.6, 0.62, 0.58, 0.65, 0.61, 0.59, 0.63, 0.64, 0.60, 0.62];
  const r = studentTPairedTTest(a, b);
  assert.ok(r.t > 0);
  assert.ok(r.pValue < 0.01, `pValue was ${r.pValue}`);
  assert.equal(r.df, 9);
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
  assert.equal(res.body.service, 'eval-shadow');
});

test('POST /api/shadow/start creates a run', async () => {
  const res = await makeRequest(app, 'POST', '/api/shadow/start', {
    name: 'test-run', modelA: 'A', modelB: 'B',
  });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(res.body.name, 'test-run');
});

test('POST /api/shadow/:id/compare adds a comparison', async () => {
  const start = await makeRequest(app, 'POST', '/api/shadow/start', { name: 'comp', modelA: 'A', modelB: 'B' });
  const id = start.body.id;
  const res = await makeRequest(app, 'POST', `/api/shadow/${id}/compare`, {
    input: 'q', outputA: 'a', outputB: 'b', scoreA: 0.9, scoreB: 0.5,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.scoreA, 0.9);
});

test('POST /api/shadow/:id/decide returns recommendation', async () => {
  const start = await makeRequest(app, 'POST', '/api/shadow/start', { name: 'dec', modelA: 'A', modelB: 'B' });
  const id = start.body.id;
  // Add several comparisons: A is better
  for (let i = 0; i < 5; i++) {
    await makeRequest(app, 'POST', `/api/shadow/${id}/compare`, {
      input: `q${i}`, outputA: 'aa', outputB: 'bb', scoreA: 0.8, scoreB: 0.5,
    });
  }
  const res = await makeRequest(app, 'POST', `/api/shadow/${id}/decide`, { minN: 3 });
  assert.equal(res.status, 200);
  assert.ok(res.body.recommendation);
  assert.equal(res.body.recommendation, 'ship_a');
});

test('GET /api/shadow/:id/compare returns summary', async () => {
  const start = await makeRequest(app, 'POST', '/api/shadow/start', { name: 'sum', modelA: 'A', modelB: 'B' });
  const id = start.body.id;
  await makeRequest(app, 'POST', `/api/shadow/${id}/compare`, {
    input: 'q', outputA: 'a', outputB: 'b', scoreA: 0.7, scoreB: 0.8,
  });
  const res = await makeRequest(app, 'GET', `/api/shadow/${id}/compare`);
  assert.equal(res.status, 200);
  assert.equal(res.body.summary.count, 1);
  assert.ok(res.body.summary.meanA > 0);
});