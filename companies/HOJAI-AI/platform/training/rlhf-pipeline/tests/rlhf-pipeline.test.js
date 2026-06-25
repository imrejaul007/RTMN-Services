'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../src/index');
const { tmpdir } = require('os');
const path = require('path');
const http = require('node:http');
const fs = require('fs');

function makeTmpDir() {
  const d = path.join(tmpdir(), 'rlhf-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  fs.mkdirSync(d, { recursive: true });
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
    const server = theApp.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// ---------- HTTP integration tests ----------

test('GET /api/health returns counts', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'rlhf-pipeline');
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

test('GET /api/preferences returns seed pairs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/preferences');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 6, 'should have seed pairs');
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/preferences/:id finds by id', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const listRes = await httpReq(port, 'GET', '/api/preferences');
  const id = listRes.body.pairs[0].id;
  const res = await httpReq(port, 'GET', `/api/preferences/${id}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.prompt);
  assert.ok(res.body.chosen);
  assert.ok(res.body.rejected);
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/preferences creates pair (auth required)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res401 = await httpReq(port, 'POST', '/api/preferences', { prompt: 'test', chosen: 'a', rejected: 'b' });
  assert.equal(res401.status, 401);
  const res = await httpReq(port, 'POST', '/api/preferences', { prompt: 'What is AI?', chosen: 'AI is artificial intelligence.', rejected: 'IDK', source: 'test' }, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(res.body.source, 'test');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/preferences/bulk creates multiple pairs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'POST', '/api/preferences/bulk', {
    pairs: [
      { prompt: 'p1', chosen: 'c1', rejected: 'r1' },
      { prompt: 'p2', chosen: 'c2', rejected: 'r2' },
      { prompt: 'p3', chosen: 'c3', rejected: 'r3' },
    ]
  }, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 201);
  assert.equal(res.body.created, 3);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/preferences/:id 404 on unknown id', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/preferences/fake-id-123');
  assert.equal(res.status, 404);
  server.close();
  delete process.env.DATA_DIR;
});

test('DELETE /api/preferences/:id deletes (auth)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'rlhf-pipeline-internal-token' };
  const create = await httpReq(port, 'POST', '/api/preferences', { prompt: 'del', chosen: 'c', rejected: 'r' }, hdrs);
  const del = await httpReq(port, 'DELETE', `/api/preferences/${create.body.id}`, {}, hdrs);
  assert.equal(del.status, 200);
  assert.equal(del.body.deleted, true);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/preferences/stats/summary returns stats', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/preferences/stats/summary');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 6);
  assert.ok(typeof res.body.avgChosenScore === 'number');
  assert.ok(typeof res.body.bySource === 'object');
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/ppo/jobs returns seed jobs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/ppo/jobs');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 2);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/ppo/jobs/:id finds job', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const listRes = await httpReq(port, 'GET', '/api/ppo/jobs');
  const id = listRes.body.jobs[0].id;
  const res = await httpReq(port, 'GET', `/api/ppo/jobs/${id}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.id);
  assert.ok(res.body.type);
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/ppo/start queues job (auth)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'POST', '/api/ppo/start', { baseModel: 'test-model', config: { totalSteps: 5 } }, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 202);
  assert.ok(res.body.id);
  assert.equal(res.body.status, 'queued');
  assert.equal(res.body.baseModel, 'test-model');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/ppo/start requires baseModel', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'POST', '/api/ppo/start', {}, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 400);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/ppo/curves returns training curves', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/ppo/curves');
  assert.equal(res.status, 200);
  assert.ok(res.body.curves);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/reward-model/jobs returns seed jobs', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/reward-model/jobs');
  assert.equal(res.status, 200);
  assert.ok(res.body.count >= 1);
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/reward-model/train queues job (auth)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'POST', '/api/reward-model/train', { baseModel: 'llama-3-8b', config: { totalSteps: 3 } }, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 202);
  assert.ok(res.body.id);
  assert.equal(res.body.status, 'queued');
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/reward-model/latest returns latest job', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/reward-model/latest');
  assert.equal(res.status, 200);
  assert.ok(res.body.id);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/reward-model/curves returns curves', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/reward-model/curves');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.curves));
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
  assert.ok(res.body.count >= 2);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/comparisons/next returns highest priority', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/comparisons/next');
  assert.equal(res.status, 200);
  assert.ok(res.body.id);
  assert.equal(res.body.status, 'pending');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/comparisons creates comparison (auth)', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'POST', '/api/comparisons', { prompt: 'Test?', responseA: 'Answer A', responseB: 'Answer B', priority: 'high' }, { 'x-internal-token': 'rlhf-pipeline-internal-token' });
  assert.equal(res.status, 201);
  assert.equal(res.body.priority, 'high');
  assert.equal(res.body.status, 'pending');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/comparisons/:id/resolve resolves and adds to preferences', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'rlhf-pipeline-internal-token' };
  const create = await httpReq(port, 'POST', '/api/comparisons', { prompt: 'resolve me', responseA: 'A', responseB: 'B' }, hdrs);
  const id = create.body.id;
  const resolve = await httpReq(port, 'POST', `/api/comparisons/${id}/resolve`, { winner: 'A' }, hdrs);
  assert.equal(resolve.status, 200);
  assert.equal(resolve.body.status, 'resolved');
  assert.equal(resolve.body.winner, 'A');
  // Check it was added to preferences
  const pref = await httpReq(port, 'GET', '/api/preferences');
  const addedPair = pref.body.pairs.find(p => p.metadata && p.metadata.comparisonId === id);
  assert.ok(addedPair, 'resolved comparison should add a preference pair');
  server.close();
  delete process.env.DATA_DIR;
});

test('POST /api/comparisons/:id/resolve rejects invalid winner', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const hdrs = { 'x-internal-token': 'rlhf-pipeline-internal-token' };
  const create = await httpReq(port, 'POST', '/api/comparisons', { prompt: 'test', responseA: 'A', responseB: 'B' }, hdrs);
  const res = await httpReq(port, 'POST', `/api/comparisons/${create.body.id}/resolve`, { winner: 'C' }, hdrs);
  assert.equal(res.status, 400);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/comparisons/stats returns stats', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/comparisons/stats');
  assert.equal(res.status, 200);
  assert.ok(typeof res.body.total === 'number');
  assert.ok(typeof res.body.pending === 'number');
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/metrics/overview returns all metrics', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/metrics/overview');
  assert.equal(res.status, 200);
  assert.ok(res.body.preferencePairs);
  assert.ok(res.body.ppoJobs);
  assert.ok(res.body.rewardModels);
  assert.ok(res.body.comparisonQueue);
  server.close();
  delete process.env.DATA_DIR;
});

test('GET /api/metrics/training-efficiency returns efficiency data', async () => {
  const DATA_DIR = makeTmpDir();
  process.env.DATA_DIR = DATA_DIR;
  const theApp = app();
  const { server, port } = await startServer(theApp, 0);
  const res = await httpReq(port, 'GET', '/api/metrics/training-efficiency');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.jobs));
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
