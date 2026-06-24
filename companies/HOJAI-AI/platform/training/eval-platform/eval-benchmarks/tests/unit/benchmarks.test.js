'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateBenchmark, summarizeRun, updateLeaderboard, getLeaderboard,
  publicExport, seedSamples, runBenchmark, heuristicCorrectness,
  app,
} = require('../../src/index');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

// ---------- validateBenchmark ----------

test('validateBenchmark rejects non-object', () => {
  const errs = validateBenchmark(null);
  assert.ok(errs.length > 0);
});

test('validateBenchmark requires items array', () => {
  const errs = validateBenchmark({ id: 'x' });
  assert.ok(errs.some(e => /items/i.test(e)));
});

test('validateBenchmark accepts minimal valid benchmark', () => {
  const errs = validateBenchmark({
    id: 'b1', items: [{ question: 'q', answer: 'a' }],
  });
  assert.deepEqual(errs, []);
});

test('validateBenchmark flags empty items', () => {
  const errs = validateBenchmark({ id: 'b1', items: [] });
  assert.ok(errs.length > 0);
});

// ---------- summarizeRun ----------

test('summarizeRun computes accuracy + percentiles', () => {
  const items = [
    { q: '1' }, { q: '2' }, { q: '3' }, { q: '4' }, { q: '5' },
  ];
  const scored = [
    { correct: true, score: 1, latencyMs: 100 },
    { correct: true, score: 1, latencyMs: 200 },
    { correct: false, score: 0, latencyMs: 300 },
    { correct: true, score: 1, latencyMs: 400 },
    { correct: false, score: 0, latencyMs: 500 },
  ];
  const s = summarizeRun(items, scored);
  assert.equal(s.total, 5);
  assert.equal(s.correct, 3);
  assert.equal(s.accuracy, 0.6);
  assert.equal(s.p50LatencyMs, 300);
});

test('summarizeRun handles empty', () => {
  const s = summarizeRun([], []);
  assert.equal(s.total, 0);
  assert.equal(s.accuracy, 0);
});

// ---------- updateLeaderboard + getLeaderboard ----------

test('updateLeaderboard adds entry and ranks', () => {
  let lb = {};
  updateLeaderboard(lb, 'bench1', 'A', { accuracy: 0.9, total: 10, correct: 9 });
  updateLeaderboard(lb, 'bench1', 'B', { accuracy: 0.7, total: 10, correct: 7 });
  updateLeaderboard(lb, 'bench1', 'C', { accuracy: 0.95, total: 10, correct: 9 });
  const result = getLeaderboard(lb, 'bench1', 10);
  assert.equal(result.count, 3);
  // Best first
  assert.equal(result.entries[0].modelId, 'C');
  assert.equal(result.entries[0].rank, 1);
  assert.equal(result.entries[2].modelId, 'B');
});

test('getLeaderboard respects limit', () => {
  let lb = {};
  for (let i = 0; i < 10; i++) {
    updateLeaderboard(lb, 'b1', `m${i}`, { accuracy: i / 10, total: 10, correct: i });
  }
  const result = getLeaderboard(lb, 'b1', 3);
  assert.equal(result.entries.length, 3);
});

test('getLeaderboard returns empty for unknown benchmark', () => {
  const result = getLeaderboard({}, 'unknown');
  assert.equal(result.count, 0);
});

// ---------- publicExport ----------

test('publicExport strips answers and keeps structure', () => {
  const b = {
    id: 'b1', name: 'Test', category: 'general',
    description: 'd', items: [
      { question: 'q1', answer: 'a1' },
      { question: 'q2', choices: ['x', 'y'], answer: 'x' },
    ],
  };
  const exp = publicExport(b);
  assert.equal(exp.id, 'b1');
  assert.equal(exp.itemCount, 2);
  // Answers stripped
  assert.equal(exp.publicItems[0].question, 'q1');
  assert.equal(exp.publicItems[0].answer, undefined);
  assert.deepEqual(exp.publicItems[1].choices, ['x', 'y']);
});

// ---------- seedSamples ----------

test('seedSamples returns a {seeded, skipped} object', () => {
  const r = seedSamples(() => {});
  assert.ok(r);
  assert.equal(typeof r.seeded, 'number');
  assert.equal(typeof r.skipped, 'number');
});

// ---------- heuristicCorrectness + runBenchmark ----------

test('heuristicCorrectness exact match = correct', () => {
  const r = heuristicCorrectness({ answer: 'Paris' }, 'Paris');
  assert.equal(r.correct, true);
  assert.equal(r.score, 1);
});

test('heuristicCorrectness mismatch = 0', () => {
  const r = heuristicCorrectness({ answer: 'Paris' }, 'London');
  assert.equal(r.correct, false);
});

test('runBenchmark uses modelFn', () => {
  const benchmark = {
    items: [
      { question: 'q1', answer: 'a1' },
      { question: 'q2', answer: 'a2' },
    ],
  };
  const result = runBenchmark(benchmark, (item) => item.answer);
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.correct, 2);
  assert.equal(result.summary.accuracy, 1);
});

test('runBenchmark with wrong model gets 0% accuracy', () => {
  const benchmark = { items: [{ question: 'q', answer: 'a' }] };
  const result = runBenchmark(benchmark, () => 'wrong');
  assert.equal(result.summary.accuracy, 0);
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
  const res = await makeRequest(app(), 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'eval-benchmarks');
});

test('GET /api/benchmarks lists benchmarks', async () => {
  const res = await makeRequest(app(), 'GET', '/api/benchmarks');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.benchmarks));
});

test('POST /api/benchmarks creates a custom benchmark', async () => {
  const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const res = await makeRequest(app(), 'POST', '/api/benchmarks', {
    id, name: 'custom-test', category: 'test',
    items: [{ question: 'q', answer: 'a' }],
  });
  assert.equal(res.status, 201);
  // Cleanup
  try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'benchmarks', `${id}.json`)); } catch (_) { /* ignore */ }
});

test('GET /api/benchmarks/leaderboard returns rankings', async () => {
  const res = await makeRequest(app(), 'GET', '/api/benchmarks/leaderboard');
  assert.equal(res.status, 200);
  assert.ok(res.body);
});