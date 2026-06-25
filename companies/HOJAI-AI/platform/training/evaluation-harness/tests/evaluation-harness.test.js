'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app, scorers, ALL_SCORER_TYPES, seedBenchmarks, buildComparison, aggregateResults, findBenchmark } = require('../src/index');
const { tmpdir } = require('os');
const path = require('path');
const http = require('node:http');

// ---------- helpers ----------

function makeTmpDir() {
  const d = path.join(tmpdir(), 'eval-harness-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  require('fs').mkdirSync(d, { recursive: true });
  return d;
}

function httpReq(port, method, urlPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = { method, hostname: '127.0.0.1', port, path: urlPath,
      headers: { 'Content-Type': 'application/json', ...headers } };
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

function startServer(theApp, port) {
  return new Promise(resolve => {
    const server = theApp.listen(port, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

// ---------- scorer unit tests ----------

test('8 scorers are registered', () => {
  assert.equal(ALL_SCORER_TYPES.length, 8);
  assert.ok(scorers['exact-match']);
  assert.ok(scorers['substring-match']);
  assert.ok(scorers['substring-absence']);
  assert.ok(scorers['json-schema-match']);
  assert.ok(scorers['token-overlap']);
  assert.ok(scorers['levenshtein-similarity']);
  assert.ok(scorers['numeric-tolerance']);
  assert.ok(scorers['regex-match']);
});

test('exact-match: exact match scores 1', () => {
  const r = scorers['exact-match'].score({ output: '  42  ', testCase: { expectedOutput: '42' } });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('exact-match: mismatch scores 0', () => {
  const r = scorers['exact-match'].score({ output: 'forty-two', testCase: { expectedOutput: '42' } });
  assert.equal(r.score, 0);
  assert.equal(r.passed, false);
});

test('substring-match: single substring passes', () => {
  const r = scorers['substring-match'].score({ output: 'The capital is Paris', testCase: { expectedContains: 'Paris' } });
  assert.ok(r.passed);
  assert.ok(r.score > 0);
});

test('substring-match: array of substrings all must match', () => {
  const r = scorers['substring-match'].score({ output: 'Paris and France', testCase: { expectedContains: ['Paris', 'France'] } });
  assert.ok(r.passed);
});

test('substring-absence: clean output scores 1', () => {
  const r = scorers['substring-absence'].score({ output: 'All good here', testCase: { expectedNotContains: ['bad', 'fail'] } });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('substring-absence: forbidden word scores 0', () => {
  const r = scorers['substring-absence'].score({ output: 'This is bad', testCase: { expectedNotContains: 'bad' } });
  assert.equal(r.score, 0);
  assert.equal(r.passed, false);
});

test('json-schema-match: valid JSON matching schema scores 1', () => {
  const r = scorers['json-schema-match'].score({
    output: '{"name": "Alice", "age": 30}',
    testCase: { expectedJsonSchema: { type: 'object', required: ['name', 'age'], properties: { name: { type: 'string' }, age: { type: 'number' } } } }
  });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('json-schema-match: invalid JSON scores 0', () => {
  const r = scorers['json-schema-match'].score({ output: 'not json', testCase: { expectedJsonSchema: { type: 'object' } } });
  assert.equal(r.score, 0);
  assert.equal(r.passed, false);
});

test('token-overlap: partial overlap scores between 0 and 1', () => {
  const r = scorers['token-overlap'].score({ output: 'hello world', testCase: { expectedOutput: 'hello there world' } });
  assert.ok(r.score > 0);
  assert.ok(r.score < 1);
});

test('levenshtein-similarity: identical strings score 1', () => {
  const r = scorers['levenshtein-similarity'].score({ output: 'hello', testCase: { expectedOutput: 'hello' } });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('levenshtein-similarity: different strings score < 1', () => {
  const r = scorers['levenshtein-similarity'].score({ output: 'hello', testCase: { expectedOutput: 'world' } });
  assert.ok(r.score < 1);
});

test('numeric-tolerance: exact match scores 1', () => {
  const r = scorers['numeric-tolerance'].score({ output: '42', testCase: { expectedOutput: '42', expectedTolerance: 0 } });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('numeric-tolerance: within tolerance passes', () => {
  const r = scorers['numeric-tolerance'].score({ output: '42.5', testCase: { expectedOutput: '42', expectedTolerance: 1 } });
  assert.ok(r.passed);
});

test('regex-match: matching pattern scores 1', () => {
  const r = scorers['regex-match'].score({ output: 'abc123', testCase: { expectedRegex: '^[a-z]+\\d+$' } });
  assert.equal(r.score, 1);
  assert.equal(r.passed, true);
});

test('regex-match: non-matching scores 0', () => {
  const r = scorers['regex-match'].score({ output: '123abc', testCase: { expectedRegex: '^[a-z]+\\d+$' } });
  assert.equal(r.score, 0);
  assert.equal(r.passed, false);
});

// ---------- helper unit tests ----------

test('aggregateResults: empty results', () => {
  const r = aggregateResults([], ['exact-match']);
  assert.equal(r.totalTestCases, 0);
  assert.ok(Number.isFinite(r.avgScore));
});

test('aggregateResults: all passing', () => {
  const results = [
    { scores: { 'exact-match': { score: 1, passed: true } }, perScorerPassed: 1, perScorerTotal: 1, latencyMs: 100, usage: { tokensIn: 10, tokensOut: 5, costUsd: 0.001 } },
    { scores: { 'exact-match': { score: 1, passed: true } }, perScorerPassed: 1, perScorerTotal: 1, latencyMs: 100, usage: { tokensIn: 10, tokensOut: 5, costUsd: 0.001 } },
  ];
  const r = aggregateResults(results, ['exact-match']);
  assert.equal(r.passRate, 1);
  assert.equal(r.totalTestCases, 2);
  assert.equal(r.passedTestCases, 2);
});

test('buildComparison: returns per-test-case winner', () => {
  const runA = {
    id: 'a', scorerTypes: ['exact-match'],
    results: [
      { testCaseId: 't1', input: 'q1', scores: { 'exact-match': { score: 1 } } },
      { testCaseId: 't2', input: 'q2', scores: { 'exact-match': { score: 0 } } },
    ],
    aggregate: { passRate: 0.5, avgScore: 0.5 },
  };
  const runB = {
    id: 'b', scorerTypes: ['exact-match'],
    results: [
      { testCaseId: 't1', input: 'q1', scores: { 'exact-match': { score: 0 } } },
      { testCaseId: 't2', input: 'q2', scores: { 'exact-match': { score: 1 } } },
    ],
    aggregate: { passRate: 0.5, avgScore: 0.5 },
  };
  const cmp = buildComparison(runA, runB);
  assert.equal(cmp.runIdA, 'a');
  assert.equal(cmp.runIdB, 'b');
  assert.ok(cmp.aggregate);
});

test('findBenchmark: finds by id', () => {
  const data = { data: [{ id: 'abc', slug: 'test', testCases: [] }] };
  const r = findBenchmark(data, 'abc');
  assert.equal(r.id, 'abc');
});

test('findBenchmark: finds by slug', () => {
  const data = { data: [{ id: 'xyz', slug: 'hello-world', testCases: [] }] };
  const r = findBenchmark(data, 'hello-world');
  assert.equal(r.slug, 'hello-world');
});

test('findBenchmark: not found returns null', () => {
  const data = { data: [] };
  const r = findBenchmark(data, 'nope');
  assert.equal(r, null);
});

// ---------- HTTP integration tests ----------

test('GET /api/health returns counts', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.ok(res.body.counts);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /ready returns ready', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/ready');
  assert.equal(res.status, 200);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /health redirects to /api/health', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/health');
  assert.equal(res.status, 200);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/benchmarks returns seed data', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/benchmarks');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 2);
  assert.ok(res.body.benchmarks.length >= 2);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/benchmarks/:idOrSlug finds by slug', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/benchmarks/basic-qa');
  assert.equal(res.status, 200);
  assert.ok(res.body.slug === 'basic-qa' || res.body.id);
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/benchmarks creates new benchmark (auth required)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res401 = await httpReq(port, 'POST', '/api/benchmarks', { slug: 'new', name: 'New' });
  assert.equal(res401.status, 401);
  const res = await httpReq(port, 'POST', '/api/benchmarks', { slug: 'new-bmk', name: 'New Benchmark', description: 'Test', category: 'qa', testCases: [{ input: 'What is 1+1?', expectedOutput: '2' }] }, { 'x-internal-token': 'eval-harness-internal-token' });
  assert.equal(res.status, 201);
  assert.equal(res.body.slug, 'new-bmk');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/benchmarks rejects duplicate slug', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'eval-harness-internal-token' };
  await httpReq(port, 'POST', '/api/benchmarks', { slug: 'dup-test', name: 'Dup', testCases: [] }, hdrs);
  const res = await httpReq(port, 'POST', '/api/benchmarks', { slug: 'dup-test', name: 'Dup Again', testCases: [] }, hdrs);
  assert.equal(res.status, 409);
  server.close();
  delete process.env.DATA_DIR;
});

test('DELETE /api/benchmarks/:idOrSlug deletes (auth)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'eval-harness-internal-token' };
  const create = await httpReq(port, 'POST', '/api/benchmarks', { slug: 'to-delete', name: 'Delete Me', testCases: [] }, hdrs);
  const id = create.body.id;
  const res = await httpReq(port, 'DELETE', `/api/benchmarks/${id}`, {}, hdrs);
  assert.equal(res.status, 200);
  assert.equal(res.body.deleted, true);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/runs returns seed runs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/runs');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 2);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/comparisons returns seed comparisons', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/comparisons');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 1);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/scorers lists all 8 scorers', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/scorers');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 8);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/scorers/:type returns scorer', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/scorers/exact-match');
  assert.equal(res.status, 200);
  assert.ok(res.body.description);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/stats returns pass rate stats', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/stats');
  assert.equal(res.status, 200);
  assert.ok(res.body.totals);
  assert.ok(res.body.passRate);
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/compare requires two completed runs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'eval-harness-internal-token' };
  const runsRes = await httpReq(port, 'GET', '/api/runs');
  const runs = runsRes.body.runs;
  const completed = runs.filter(r => r.status === 'completed');
  if (completed.length >= 2) {
    const res = await httpReq(port, 'POST', '/api/compare', { runIdA: completed[0].id, runIdB: completed[1].id }, hdrs);
    assert.equal(res.status, 201);
    assert.ok(res.body.perTestCase);
  }
  server.close();
  delete process.env.DATA_DIR;
});

test('404 on unknown route', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/nonexistent');
  assert.equal(res.status, 404);
  server.close();
  delete process.env.DATA_DIR;
});
