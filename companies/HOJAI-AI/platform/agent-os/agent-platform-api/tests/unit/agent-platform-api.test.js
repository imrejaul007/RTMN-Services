'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const {
  SERVICES,
  buildServiceMap,
  buildFullDeploySteps,
  parseServicePath,
  listServices,
  fetchWithTimeout,
  proxyTo,
  aggregateHealth,
  app,
} = require('../../src/index');

// ---------------------------------------------------------------------------
// SERVICES map
// ---------------------------------------------------------------------------

test('SERVICES has 11 sub-services', () => {
  assert.equal(Object.keys(SERVICES).length, 11);
});

test('SERVICES covers all 11 expected sub-services', () => {
  const keys = Object.keys(SERVICES);
  [
    'registry',
    'capabilities',
    'tools',
    'skills',
    'messagebus',
    'scheduler',
    'context',
    'memory',
    'orchestrator',
    'execution',
    'observability',
  ].forEach((k) => {
    assert.ok(keys.includes(k), `missing ${k}`);
  });
});

test('SERVICES ports are unique', () => {
  const ports = Object.values(SERVICES).map((s) => s.port);
  const unique = new Set(ports);
  assert.equal(unique.size, ports.length, `duplicate ports: ${ports.join(',')}`);
});

test('SERVICES ports are in agent-os range (4803-4814)', () => {
  for (const s of Object.values(SERVICES)) {
    assert.ok(s.port >= 4803 && s.port <= 4814, `port ${s.port} out of range`);
  }
});

test('SERVICES skips 4810 (reserved for merchant-agents) and 4815-4817', () => {
  const ports = Object.values(SERVICES).map((s) => s.port);
  assert.ok(!ports.includes(4810), '4810 should be reserved for merchant-agents');
  assert.ok(!ports.includes(4815), '4815 should be reserved');
  assert.ok(!ports.includes(4816), '4816 should be reserved');
  assert.ok(!ports.includes(4817), '4817 should be reserved');
});

// ---------------------------------------------------------------------------
// buildServiceMap
// ---------------------------------------------------------------------------

test('buildServiceMap returns array of service descriptors with keys', () => {
  const map = buildServiceMap(SERVICES);
  assert.equal(map.length, 11);
  for (const entry of map) {
    assert.ok(entry.key, 'key missing');
    assert.ok(entry.port, 'port missing');
    assert.ok(entry.name, 'name missing');
    assert.ok(entry.desc, 'desc missing');
  }
});

test('buildServiceMap handles null/undefined input safely', () => {
  assert.deepEqual(buildServiceMap(null), []);
  assert.deepEqual(buildServiceMap(undefined), []);
  assert.deepEqual(buildServiceMap({}), []);
});

test('listServices is an alias for buildServiceMap', () => {
  const a = buildServiceMap(SERVICES);
  const b = listServices(SERVICES);
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------
// buildFullDeploySteps
// ---------------------------------------------------------------------------

test('buildFullDeploySteps returns empty array for empty opts', () => {
  assert.deepEqual(buildFullDeploySteps({}), []);
});

test('buildFullDeploySteps returns empty array for null/undefined opts', () => {
  assert.deepEqual(buildFullDeploySteps(null), []);
  assert.deepEqual(buildFullDeploySteps(undefined), []);
});

test('buildFullDeploySteps returns empty array when name or type missing', () => {
  assert.deepEqual(buildFullDeploySteps({ type: 'genie' }), []);
  assert.deepEqual(buildFullDeploySteps({ name: 'foo' }), []);
});

test('buildFullDeploySteps minimal case: just name + type', () => {
  const steps = buildFullDeploySteps({ name: 'a1', type: 'genie' });
  // create-agent + create-context = 2
  assert.equal(steps.length, 2);
  assert.equal(steps[0].step, 'create-agent');
  assert.equal(steps[0].service, 'registry');
  assert.equal(steps[0].method, 'POST');
  assert.equal(steps[0].endpoint, '/api/agents');
  assert.equal(steps[1].step, 'create-context');
  assert.equal(steps[1].service, 'context');
});

test('buildFullDeploySteps attaches capabilities/tools/skills as separate PATCHes', () => {
  const steps = buildFullDeploySteps({
    name: 'a1',
    type: 'merchant',
    capabilities: ['c1', 'c2'],
    tools: ['t1'],
    skills: ['s1', 's2', 's3'],
  });
  // create + caps + tools + skills + context = 5
  assert.equal(steps.length, 5);
  assert.equal(steps[1].step, 'attach-caps');
  assert.deepEqual(steps[1].body, { capabilities: ['c1', 'c2'] });
  assert.equal(steps[2].step, 'attach-tools');
  assert.deepEqual(steps[2].body, { tools: ['t1'] });
  assert.equal(steps[3].step, 'attach-skills');
  assert.deepEqual(steps[3].body, { skills: ['s1', 's2', 's3'] });
});

test('buildFullDeploySteps adds start-execution step only when goal provided', () => {
  const withoutGoal = buildFullDeploySteps({ name: 'a1', type: 'genie' });
  assert.equal(withoutGoal.length, 2);
  assert.ok(!withoutGoal.some((s) => s.step === 'start-execution'));

  const withGoal = buildFullDeploySteps({ name: 'a1', type: 'genie', goal: 'summarize X' });
  assert.equal(withGoal.length, 3);
  const exec = withGoal.find((s) => s.step === 'start-execution');
  assert.ok(exec);
  assert.equal(exec.service, 'execution');
  assert.equal(exec.endpoint, '/api/executions');
  assert.equal(exec.body.goal, 'summarize X');
});

test('buildFullDeploySteps composes full 6-step pipeline', () => {
  const steps = buildFullDeploySteps({
    name: 'a1',
    type: 'genie',
    capabilities: ['c1'],
    tools: ['t1'],
    skills: ['s1'],
    goal: 'do a thing',
  });
  assert.equal(steps.length, 6);
  assert.deepEqual(
    steps.map((s) => s.step),
    ['create-agent', 'attach-caps', 'attach-tools', 'attach-skills', 'create-context', 'start-execution']
  );
});

test('buildFullDeploySteps omits attach steps when arrays empty', () => {
  const steps = buildFullDeploySteps({
    name: 'a1',
    type: 'genie',
    capabilities: [],
    tools: [],
    skills: [],
  });
  assert.equal(steps.length, 2);
  assert.ok(!steps.some((s) => s.step === 'attach-caps'));
  assert.ok(!steps.some((s) => s.step === 'attach-tools'));
  assert.ok(!steps.some((s) => s.step === 'attach-skills'));
});

// ---------------------------------------------------------------------------
// parseServicePath
// ---------------------------------------------------------------------------

test('parseServicePath parses registry key', () => {
  const r = parseServicePath('registry/agents/abc');
  assert.deepEqual(r, { key: 'registry', restPath: '/agents/abc' });
});

test('parseServicePath handles leading slash', () => {
  const r = parseServicePath('/tools/list');
  assert.deepEqual(r, { key: 'tools', restPath: '/list' });
});

test('parseServicePath returns null for unknown keys', () => {
  const r = parseServicePath('unknown/x/y');
  assert.equal(r, null);
});

test('parseServicePath handles bare key', () => {
  const r = parseServicePath('registry');
  assert.deepEqual(r, { key: 'registry', restPath: '/' });
});

test('parseServicePath handles null/undefined safely', () => {
  assert.equal(parseServicePath(null), null);
  assert.equal(parseServicePath(undefined), null);
  assert.equal(parseServicePath(''), null);
});

// ---------------------------------------------------------------------------
// fetchWithTimeout + proxyTo
// ---------------------------------------------------------------------------

test('fetchWithTimeout times out on unreachable host', async () => {
  // Port 1 (or any closed port on localhost) should reject almost immediately
  await assert.rejects(
    () => fetchWithTimeout('http://127.0.0.1:1/never', {}, 100),
    () => true
  );
});

test('proxyTo returns 404 for unknown service', async () => {
  const r = await proxyTo('not-a-real-key', '/whatever', 'GET');
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
  assert.equal(r.error, 'unknown_service');
  assert.equal(r.serviceKey, 'not-a-real-key');
});

test('proxyTo returns 502 when downstream is unreachable', async () => {
  // Use a custom SERVICES map so we don't hit a real sub-service port
  const customServices = { dummy: { port: 1, name: 'dummy', desc: 'down' } };
  const r = await proxyTo('dummy', '/api/anything', 'GET', null, {}, customServices);
  assert.equal(r.ok, false);
  assert.equal(r.status, 502);
  assert.equal(r.error, 'proxy_failed');
  assert.equal(r.serviceKey, 'dummy');
});

// ---------------------------------------------------------------------------
// aggregateHealth
// ---------------------------------------------------------------------------

test('aggregateHealth returns ok:true with 11 services even when all are down', async () => {
  // Custom map pointing at unreachable ports; result should be a graceful aggregate
  const down = {};
  for (const [key, s] of Object.entries(SERVICES)) {
    down[key] = { port: 1, name: s.name, desc: s.desc };
  }
  const h = await aggregateHealth(down, 100);
  assert.equal(h.ok, true);
  assert.equal(h.total, 11);
  assert.equal(h.healthy, 0);
  assert.equal(h.services.length, 11);
  for (const s of h.services) {
    assert.equal(s.healthy, false);
    assert.ok(typeof s.latencyMs === 'number');
    assert.ok(s.error, 'error message should be present');
  }
});

test('aggregateHealth marks reachable service as healthy', async () => {
  // Spin up a tiny HTTP server on a random port that responds to /health
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'mock' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  const oneSvc = { mock: { port, name: 'mock', desc: 'test' } };
  try {
    const h = await aggregateHealth(oneSvc, 1000);
    assert.equal(h.total, 1);
    assert.equal(h.healthy, 1);
    assert.equal(h.services[0].healthy, true);
    assert.equal(h.services[0].port, port);
    assert.equal(h.services[0].key, 'mock');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

// ---------------------------------------------------------------------------
// HTTP integration (using supertest-free raw http requests)
// ---------------------------------------------------------------------------

function makeRequest(theApp, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const server = theApp.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = {
        method,
        hostname: '127.0.0.1',
        port,
        path: urlPath,
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

test('GET /health returns ok with sub-service count', async () => {
  const res = await makeRequest(app(), 'GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.service, 'agent-platform-api');
  assert.equal(res.body.ok, true);
  assert.equal(res.body.subServices, 11);
});

test('GET /api/agent/services lists all sub-services', async () => {
  const res = await makeRequest(app(), 'GET', '/api/agent/services');
  assert.equal(res.status, 200);
  assert.equal(res.body.count, 11);
  assert.equal(res.body.services.length, 11);
  const keys = res.body.services.map((s) => s.key);
  assert.ok(keys.includes('registry'));
  assert.ok(keys.includes('execution'));
});

test('POST /api/agent/full-deploy with no opts returns 400', async () => {
  const res = await makeRequest(app(), 'POST', '/api/agent/full-deploy', {});
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'no_steps');
});

test('POST /api/agent/full-deploy returns 6-step plan for full request', async () => {
  const res = await makeRequest(app(), 'POST', '/api/agent/full-deploy', {
    name: 'a1',
    type: 'genie',
    capabilities: ['c1'],
    tools: ['t1'],
    skills: ['s1'],
    goal: 'do it',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.stepCount, 6);
  assert.equal(res.body.steps.length, 6);
  assert.equal(res.body.steps[0].step, 'create-agent');
});

test('GET /api/agent/platform/status returns gateway + aggregated health', async () => {
  const res = await makeRequest(app(), 'GET', '/api/agent/platform/status');
  assert.equal(res.status, 200);
  assert.equal(res.body.gateway.ok, true);
  assert.equal(res.body.gateway.service, 'agent-platform-api');
  assert.equal(res.body.total, 11);
  assert.equal(res.body.services.length, 11);
  // Most likely all sub-services are down in test env, so healthy may be 0
  assert.ok(res.body.healthy >= 0);
});

test('ANY /api/agent/:unknown returns 404 with error envelope', async () => {
  const res = await makeRequest(app(), 'GET', '/api/agent/foobar/some/path');
  // proxyTo returns status:404 for unknown service, and we forward that
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'unknown_service');
});

test('GET /api/agent/registry/search proxies to agent-registry (graceful 502 if down)', async () => {
  // Sub-service isn't running in test env — proxyTo returns 502
  const res = await makeRequest(app(), 'GET', '/api/agent/registry/search?capability=foo');
  assert.equal(res.status, 502);
  assert.equal(res.body.error, 'proxy_failed');
});

test('Unknown route returns 404 JSON', async () => {
  const res = await makeRequest(app(), 'GET', '/totally/unknown');
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'not_found');
});

test('POST /api/agent/full-deploy with only name + type returns 2-step plan', async () => {
  const res = await makeRequest(app(), 'POST', '/api/agent/full-deploy', {
    name: 'a1',
    type: 'merchant',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.stepCount, 2);
  assert.equal(res.body.steps[0].body.owner, undefined);
});

test('POST /api/agent/full-deploy with name + type + owner + metadata includes them', async () => {
  const res = await makeRequest(app(), 'POST', '/api/agent/full-deploy', {
    name: 'a1',
    type: 'genie',
    owner: 'alice',
    metadata: { team: 'platform' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.steps[0].body.owner, 'alice');
  assert.deepEqual(res.body.steps[0].body.metadata, { team: 'platform' });
});