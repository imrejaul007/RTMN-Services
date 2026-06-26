// Isolate deprecation test
const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('http');

process.env.SERVICE_NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
const { app, agents, versions, deployments, metrics, policies, auditLog, stats } = require('../src/index.js');

let server;

function mkReq(port) {
  var base = 'http://localhost:' + port;
  return function req(method, path, body) {
    return new Promise(function(resolve, reject) {
      const url = new URL(path, base);
      const opts = {
        method: method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json', 'x-internal-token': 'test-token' },
      };
      const r = http.request(opts, function(res) {
        let data = '';
        res.on('data', function(chunk) { data += chunk; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  };
}

describe('Deprecation Isolate', function() {
  beforeEach(async function() {
    agents.clear();
    versions.clear();
    deployments.clear();
    metrics.clear();
    policies.clear();
    auditLog.length = 0;
    await new Promise(function(resolve) { server = app.listen(49991, '127.0.0.1', resolve); });
  });

  afterEach(async function() {
    await new Promise(function(resolve) { server.close(resolve); });
  });

  it('GET /api/agents/deprecated -> 200', async function() {
    const r = mkReq(49991);
    // Create agent
    const c = await r('POST', '/api/agents', { name: 'ListDeprecatedAgent' });
    console.log('Create:', c.status, c.body.error || 'ok, id=' + (c.body.agent && c.body.agent.id));
    // Set active and deprecate
    await r('PUT', '/api/agents/' + c.body.agent.id, { status: 'active' });
    const d = await r('POST', '/api/agents/' + c.body.agent.id + '/deprecate', {});
    console.log('Deprecate:', d.status, d.body.error || 'ok, status=' + (d.body.agent && d.body.agent.status));
    // GET
    const res = await r('GET', '/api/agents/deprecated');
    console.log('GET /api/agents/deprecated:', res.status, JSON.stringify(res.body).substring(0, 200));
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
  });
});
