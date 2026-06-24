'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SERVICES, buildServiceMap, buildFullRunSteps, app,
} = require('../../src/index');
const http = require('node:http');

// ---------- SERVICES map ----------

test('SERVICES has 7 sub-services', () => {
  assert.equal(Object.keys(SERVICES).length, 7);
});

test('SERVICES covers all expected services', () => {
  const keys = Object.keys(SERVICES);
  ['datasets', 'judges', 'live', 'shadow', 'canary', 'review', 'benchmarks'].forEach(k => {
    assert.ok(keys.includes(k), `missing ${k}`);
  });
});

test('SERVICES ports are unique', () => {
  const ports = Object.values(SERVICES).map(s => s.port);
  const unique = new Set(ports);
  assert.equal(unique.size, ports.length, `duplicate ports: ${ports.join(',')}`);
});

test('SERVICES ports are in eval range (4780-4790)', () => {
  for (const s of Object.values(SERVICES)) {
    assert.ok(s.port >= 4780 && s.port <= 4790, `port ${s.port} out of range`);
  }
});

// ---------- buildServiceMap ----------

test('buildServiceMap returns array of service info', () => {
  const map = buildServiceMap(SERVICES);
  assert.equal(map.length, 7);
  assert.ok(map[0].key);
  assert.ok(map[0].port);
  assert.ok(map[0].name);
  assert.ok(map[0].desc);
});

// ---------- buildFullRunSteps ----------

test('buildFullRunSteps returns empty for empty opts', () => {
  assert.deepEqual(buildFullRunSteps({}), []);
});

test('buildFullRunSteps includes split step when datasetId given', () => {
  const steps = buildFullRunSteps({ datasetId: 'd1' });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].step, 'split');
  assert.equal(steps[0].service, 'datasets');
});

test('buildFullRunSteps includes judge step when judge + text given', () => {
  const steps = buildFullRunSteps({ judge: 'accuracy', text: 'q' });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].step, 'judge');
});

test('buildFullRunSteps includes shadow + compare for modelA/modelB', () => {
  const steps = buildFullRunSteps({ modelA: 'A', modelB: 'B' });
  assert.equal(steps.length, 2);
  assert.equal(steps[0].step, 'shadow');
  assert.equal(steps[1].step, 'compare');
});

test('buildFullRunSteps includes canary for baseline + candidate', () => {
  const steps = buildFullRunSteps({ canaryBaseline: 'A', canaryCandidate: 'B' });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].step, 'canary');
});

test('buildFullRunSteps includes benchmark run', () => {
  const steps = buildFullRunSteps({ publishBenchmarkId: 'b1', publishModelId: 'm1' });
  assert.equal(steps.length, 1);
  assert.equal(steps[0].step, 'benchmark');
});

test('buildFullRunSteps composes multiple', () => {
  const steps = buildFullRunSteps({
    datasetId: 'd1', judge: 'accuracy', text: 'q',
    modelA: 'A', modelB: 'B',
    canaryBaseline: 'X', canaryCandidate: 'Y',
  });
  // split + judge + shadow + compare + canary
  assert.equal(steps.length, 5);
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

test('GET /api/health returns ok with sub-service count', async () => {
  const res = await makeRequest(app(), 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'eval-platform-api');
  assert.equal(res.body.subServices, 7);
});

test('GET /api/eval/services lists sub-services', async () => {
  const res = await makeRequest(app(), 'GET', '/api/eval/services');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 7);
  assert.equal(res.body.services.length, 7);
});

test('POST /api/eval/full-run with no opts returns 400', async () => {
  const res = await makeRequest(app(), 'POST', '/api/eval/full-run', {});
  assert.equal(res.status, 400);
});

test('POST /api/eval/full-run returns pipeline plan', async () => {
  const res = await makeRequest(app(), 'POST', '/api/eval/full-run', {
    datasetId: 'd1', modelA: 'A', modelB: 'B',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.stepCount, 3);
  assert.equal(res.body.steps.length, 3);
});

test('GET /api/eval/platform/status attempts sub-service health', async () => {
  const res = await makeRequest(app(), 'GET', '/api/eval/platform/status');
  assert.equal(res.status, 200);
  // Even with no services running, gateway itself is healthy
  assert.equal(res.body.gateway.ok, true);
  assert.ok(res.body.total !== undefined);
});