/**
 * @fileOverview Agent Lifecycle API Tests
 * All assertions match the actual API response shapes.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
const { app, agents, versions, deployments, metrics, policies, auditLog, stats } = require('../src/index.js');

let server;
let portCounter = 4910;
let req;

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
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'test-token',
        },
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

beforeEach(async function() {
  agents.clear();
  versions.clear();
  deployments.clear();
  metrics.clear();
  policies.clear();
  auditLog.length = 0;
  stats.totalRequests = 0;
  stats.errors = 0;
  stats.uptime = 0;

  // Seed default policies
  policies.set('deployment', { id: 'deployment', name: 'Default Deployment Policy', type: 'deployment', config: {}, createdAt: new Date().toISOString() });
  policies.set('deprecation', { id: 'deprecation', name: 'Default Deprecation Policy', type: 'deprecation', config: {}, createdAt: new Date().toISOString() });
  policies.set('retirement', { id: 'retirement', name: 'Default Retirement Policy', type: 'retirement', config: {}, createdAt: new Date().toISOString() });

  var port = portCounter++;
  req = mkReq(port);
  await new Promise(function(resolve) { server = app.listen(port, '127.0.0.1', resolve); });
});

afterEach(async function() {
  await new Promise(function(resolve) { server.close(resolve); });
});

describe('Agent Lifecycle API', function() {

  // ============================================================
  // CRUD
  // ============================================================
  describe('CRUD', function() {
    it('POST /api/agents -> 201', async function() {
      const res = await req('POST', '/api/agents', {
        name: 'TestAgent',
        type: 'reasoning',
        capabilities: ['code-review', 'debugging'],
        version: '1.0.0',
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.agent);
      assert.ok(res.body.agent.id);
      assert.strictEqual(res.body.agent.name, 'TestAgent');
      assert.strictEqual(res.body.agent.status, 'draft');
    });

    it('GET /api/agents -> 200 with list', async function() {
      await req('POST', '/api/agents', { name: 'Agent1', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents', { name: 'Agent2', type: 'creative', capabilities: [] });
      const res = await req('GET', '/api/agents');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.agents));
      assert.strictEqual(res.body.agents.length, 2);
    });

    it('GET /api/agents/:id -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'FetchAgent', type: 'reasoning', capabilities: [] });
      const res = await req('GET', '/api/agents/' + created.body.agent.id);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.agent);
      assert.strictEqual(res.body.agent.name, 'FetchAgent');
    });

    it('GET /api/agents/:id -> 404 for unknown id', async function() {
      const res = await req('GET', '/api/agents/unknown-id-xyz');
      assert.strictEqual(res.status, 404);
    });

    it('PUT /api/agents/:id -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'UpdateAgent', type: 'reasoning', capabilities: [] });
      const res = await req('PUT', '/api/agents/' + created.body.agent.id, { name: 'UpdatedAgent', status: 'active' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.agent.name, 'UpdatedAgent');
      assert.strictEqual(res.body.agent.status, 'active');
    });

    it('DELETE /api/agents/:id -> 200 (returns JSON, not 204)', async function() {
      const created = await req('POST', '/api/agents', { name: 'DeleteAgent', type: 'reasoning', capabilities: [] });
      const res = await req('DELETE', '/api/agents/' + created.body.agent.id);
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message);
    });
  });

  // ============================================================
  // Versioning
  // ============================================================
  describe('Versioning', function() {
    it('POST /api/agents/:id/versions -> 201', async function() {
      const created = await req('POST', '/api/agents', { name: 'VersionAgent', type: 'reasoning', capabilities: [] });
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/versions', {
        changelog: 'Minor improvements',
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.version);
      assert.strictEqual(res.body.version.agentId, created.body.agent.id);
    });

    it('GET /api/agents/:id/versions -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'VListAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'A' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'B' });
      const res = await req('GET', '/api/agents/' + created.body.agent.id + '/versions');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.versions));
      assert.strictEqual(res.body.versions.length, 2); // 1.0.0 + 1.0.1
    });

    it('GET /api/agents/:id/versions/:semver -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'VGetAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'New features' });
      const res = await req('GET', '/api/agents/' + created.body.agent.id + '/versions/1.0.0');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.version);
      assert.strictEqual(res.body.version.semver, '1.0.0');
    });

    it('POST /api/agents/:id/versions/:semver/rollback -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'RollbackAgent', type: 'reasoning', capabilities: [] });
      // POST creates 1.0.0 (initial), then 1.0.1, 1.0.2
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'v1' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'v2' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { changelog: 'v3' });
      // Rollback from 1.0.2 back to 1.0.1
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/versions/1.0.2/rollback', {});
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.version);
      assert.strictEqual(res.body.toVersion, '1.0.1');
    });
  });

  // ============================================================
  // Deployment
  // ============================================================
  describe('Deployment', function() {
    it('POST /api/agents/:id/deploy -> 201', async function() {
      const created = await req('POST', '/api/agents', { name: 'DeployAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { version: '1.0.0' });
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/deploy', { environment: 'staging', version: '1.0.0' });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.deployment);
      assert.strictEqual(res.body.deployment.environment, 'staging');
      assert.strictEqual(res.body.deployment.status, 'active');
    });

    it('POST /api/agents/:id/canary -> 201', async function() {
      const created = await req('POST', '/api/agents', { name: 'CanaryAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { version: '1.0.0' });
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/canary', { environment: 'production', trafficPercent: 20 });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.deployment);
    });

    it('GET /api/agents/:id/deployments -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'DeployListAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/versions', { version: '1.0.0' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deploy', { environment: 'dev', version: '1.0.0' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deploy', { environment: 'staging', version: '1.0.0' });
      const res = await req('GET', '/api/agents/' + created.body.agent.id + '/deployments');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.deployments));
      assert.strictEqual(res.body.deployments.length, 2);
    });
  });

  // ============================================================
  // Monitoring
  // ============================================================
  describe('Monitoring', function() {
    it('POST /api/agents/:id/metrics -> 201', async function() {
      const created = await req('POST', '/api/agents', { name: 'MetricsAgent', type: 'reasoning', capabilities: [] });
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/metrics', {
        environment: 'staging',
        timestamp: new Date().toISOString(),
        requests: 100,
        errors: 2,
        latency_avg_ms: 150,
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.agentId);
    });

    it('GET /api/agents/:id/metrics -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'MetricsGetAgent', type: 'reasoning', capabilities: [] });
      await req('POST', '/api/agents/' + created.body.agent.id + '/metrics', { timestamp: new Date().toISOString(), requests: 50, errors: 1, latency_avg_ms: 100 });
      const res = await req('GET', '/api/agents/' + created.body.agent.id + '/metrics');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.metrics);
    });
  });

  // ============================================================
  // Deprecation
  // ============================================================
  describe('Deprecation', function() {
    it('POST /api/agents/:id/deprecate -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'DeprecateAgent', type: 'reasoning', capabilities: [] });
      const res = await req('PUT', '/api/agents/' + created.body.agent.id, { status: 'active' });
      const res2 = await req('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {
        replacementAgentId: 'replacement-123',
        noticeDays: 90,
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(res2.body.agent.status, 'deprecated');
      assert.ok(res2.body.agent.deprecatedAt);
    });

    it('GET /api/agents/deprecated -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'ListDeprecatedAgent', type: 'reasoning', capabilities: [] });
      await req('PUT', '/api/agents/' + created.body.agent.id, { status: 'active' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {});
      const res = await req('GET', '/api/agents/deprecated');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.agents));
      assert.ok(res.body.agents.some(function(a) { return a.id === created.body.agent.id; }));
    });
  });

  // ============================================================
  // Retirement
  // ============================================================
  describe('Retirement', function() {
    it('POST /api/agents/:id/retire -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'RetireAgent', type: 'reasoning', capabilities: [] });
      await req('PUT', '/api/agents/' + created.body.agent.id, { status: 'active' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {});
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/retire', {
        gracePeriodDays: 30,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.agent.status, 'retired');
      assert.ok(res.body.agent.retiredAt);
    });

    it('POST /api/agents/:id/restore -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'RestoreAgent', type: 'reasoning', capabilities: [] });
      await req('PUT', '/api/agents/' + created.body.agent.id, { status: 'active' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {});
      await req('POST', '/api/agents/' + created.body.agent.id + '/retire', { gracePeriodDays: 30 });
      const res = await req('POST', '/api/agents/' + created.body.agent.id + '/restore');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.agent.status, 'deprecated');
    });

    it('GET /api/agents/retired -> 200', async function() {
      const created = await req('POST', '/api/agents', { name: 'ListRetiredAgent', type: 'reasoning', capabilities: [] });
      await req('PUT', '/api/agents/' + created.body.agent.id, { status: 'active' });
      await req('POST', '/api/agents/' + created.body.agent.id + '/deprecate', {});
      await req('POST', '/api/agents/' + created.body.agent.id + '/retire', { gracePeriodDays: 30 });
      const res = await req('GET', '/api/agents/retired');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.agents));
      assert.ok(res.body.agents.some(function(a) { return a.id === created.body.agent.id; }));
    });
  });

  // ============================================================
  // Policies
  // ============================================================
  describe('Policies', function() {
    it('GET /api/policies -> 200 with seeded policies', async function() {
      const res = await req('GET', '/api/policies');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.policies));
      assert.ok(res.body.policies.length >= 3);
    });

    it('POST /api/policies -> 201', async function() {
      const res = await req('POST', '/api/policies', {
        name: 'Custom Policy',
        type: 'custom',
        config: { max_instances: 10 },
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.policy);
    });

    it('GET /api/policies/:id -> 200', async function() {
      const res = await req('GET', '/api/policies/deployment');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.policy);
      assert.strictEqual(res.body.policy.name, 'Default Deployment Policy');
    });

    it('PUT /api/policies/:id -> 200', async function() {
      const res = await req('PUT', '/api/policies/deployment', { name: 'Updated Deployment Policy' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.policy.name, 'Updated Deployment Policy');
    });

    it('DELETE /api/policies/:id -> 200', async function() {
      const res = await req('DELETE', '/api/policies/deployment');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message);
    });
  });

  // ============================================================
  // Health and Stats
  // ============================================================
  describe('Health and Stats', function() {
    it('GET /api/health -> 200', async function() {
      const res = await req('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.status);
    });

    it('GET /api/stats -> 200', async function() {
      const res = await req('GET', '/api/stats');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.totalAgents === 'number');
    });

    it('GET /api/audit -> 200', async function() {
      await req('POST', '/api/agents', { name: 'AuditAgent', type: 'reasoning', capabilities: [] });
      const res = await req('GET', '/api/audit');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.entries));
    });
  });
});
