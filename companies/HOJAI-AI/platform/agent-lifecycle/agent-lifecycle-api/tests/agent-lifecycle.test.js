/**
 * @fileOverview Agent Lifecycle API Tests
 * Tests all CRUD, versioning, deployment, monitoring, policies, and lifecycle endpoints.
 */

const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

// Load the app directly — it auto-starts unless NO_LISTEN=true
process.env.NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
const { app, agents, versions, deployments, metrics, policies, auditLog, stats } = require('../src/index.js');

const BASE = 'http://localhost:4910';

// Minimal HTTP helper
function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'test-token',
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Start server for tests
let server;
beforeEach(async () => {
  // Reset in-memory state
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
  policies.set('deployment', { id: 'deployment', name: 'Default Deployment Policy', description: 'Controls agent deployment behavior', rules: [{ max_concurrent_instances: 5, require_approval: false }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('deprecation', { id: 'deprecation', name: 'Default Deprecation Policy', description: 'Controls agent deprecation timeline', rules: [{ notice_period_days: 90, replacement_required: true }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('retirement', { id: 'retirement', name: 'Default Retirement Policy', description: 'Controls agent retirement process', rules: [{ grace_period_days: 30, data_retention_days: 180 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  // Start server
  server = app.listen(4910, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
});

afterEach(async () => {
  await new Promise(resolve => server.close(resolve));
});

describe('Agent CRUD', () => {
  it('POST /api/agents → 201', async () => {
    const res = await request('POST', '/api/agents', {
      name: 'TestAgent',
      type: 'reasoning',
      capabilities: ['code-review', 'debugging'],
      version: '1.0.0',
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.name, 'TestAgent');
    assert.strictEqual(res.body.status, 'active');
  });

  it('GET /api/agents → 200 with list', async () => {
    await request('POST', '/api/agents', { name: 'Agent1', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', '/api/agents', { name: 'Agent2', type: 'creative', capabilities: [], version: '1.0.0' });
    const res = await request('GET', '/api/agents');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
    assert.strictEqual(res.body.agents.length, 2);
  });

  it('GET /api/agents/:id → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'FetchAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('GET', `/api/agents/${created.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'FetchAgent');
  });

  it('GET /api/agents/:id → 404 for unknown id', async () => {
    const res = await request('GET', '/api/agents/unknown-id-12345');
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/agents/:id → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'UpdateAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('PUT', `/api/agents/${created.body.id}`, { name: 'UpdatedAgent', type: 'updated' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'UpdatedAgent');
  });

  it('DELETE /api/agents/:id → 204', async () => {
    const created = await request('POST', '/api/agents', { name: 'DeleteAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('DELETE', `/api/agents/${created.body.id}`);
    assert.strictEqual(res.status, 204);
  });
});

describe('Agent Versioning', () => {
  it('POST /api/agents/:id/versions → 201', async () => {
    const created = await request('POST', '/api/agents', { name: 'VersionAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/versions`, {
      version: '1.1.0',
      changelog: 'Minor improvements',
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.version, '1.1.0');
    assert.strictEqual(res.body.agent_id, created.body.id);
  });

  it('GET /api/agents/:id/versions → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'VListAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/versions`, { version: '1.1.0', changelog: 'A' });
    await request('POST', `/api/agents/${created.body.id}/versions`, { version: '1.2.0', changelog: 'B' });
    const res = await request('GET', `/api/agents/${created.body.id}/versions`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.versions));
    assert.strictEqual(res.body.versions.length, 3); // v1.0.0 + 2 new
  });

  it('GET /api/agents/:id/versions/:version → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'VGetAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/versions`, { version: '1.1.0', changelog: 'New features' });
    const res = await request('GET', `/api/agents/${created.body.id}/versions/1.1.0`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.version, '1.1.0');
  });

  it('POST /api/agents/:id/rollback → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'RollbackAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/versions`, { version: '1.1.0', changelog: 'New' });
    const res = await request('POST', `/api/agents/${created.body.id}/rollback`, { target_version: '1.0.0' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.current_version, '1.0.0');
  });
});

describe('Agent Deployment', () => {
  it('POST /api/agents/:id/deploy → 201', async () => {
    const created = await request('POST', '/api/agents', { name: 'DeployAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/deploy`, { environment: 'staging', version: '1.0.0' });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.environment, 'staging');
    assert.strictEqual(res.body.status, 'deployed');
  });

  it('POST /api/agents/:id/deploy with canary → 201', async () => {
    const created = await request('POST', '/api/agents', { name: 'CanaryAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/deploy`, { environment: 'production', version: '1.0.0', canary: { enabled: true, percentage: 20 } });
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(res.body.canary, { enabled: true, percentage: 20 });
  });

  it('GET /api/agents/:id/deployments → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'DeployListAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/deploy`, { environment: 'dev', version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/deploy`, { environment: 'staging', version: '1.0.0' });
    const res = await request('GET', `/api/agents/${created.body.id}/deployments`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.deployments));
    assert.strictEqual(res.body.deployments.length, 2);
  });
});

describe('Agent Monitoring', () => {
  it('POST /api/agents/:id/metrics → 201', async () => {
    const created = await request('POST', '/api/agents', { name: 'MetricsAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/metrics`, {
      timestamp: new Date().toISOString(),
      requests: 100,
      errors: 2,
      latency_avg_ms: 150,
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.agent_id, created.body.id);
  });

  it('GET /api/agents/:id/metrics → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'MetricsGetAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/metrics`, { timestamp: new Date().toISOString(), requests: 50, errors: 1, latency_avg_ms: 100 });
    const res = await request('GET', `/api/agents/${created.body.id}/metrics`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.metrics));
  });

  it('GET /api/agents/:id/metrics/summary → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'SummaryAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/metrics`, { timestamp: new Date().toISOString(), requests: 100, errors: 5, latency_avg_ms: 200 });
    const res = await request('GET', `/api/agents/${created.body.id}/metrics/summary`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.total_requests >= 100);
  });
});

describe('Agent Deprecation', () => {
  it('POST /api/agents/:id/deprecate → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'DeprecateAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/deprecate`, {
      reason: 'End of life',
      sunset_date: '2026-12-31',
      replacement_agent_id: 'replacement-123',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'deprecated');
    assert.ok(res.body.deprecated_at);
  });

  it('GET /api/deprecated → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'ListDeprecatedAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/deprecate`, { reason: 'EOL' });
    const res = await request('GET', '/api/deprecated');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
    assert.ok(res.body.agents.some(a => a.id === created.body.id));
  });
});

describe('Agent Retirement', () => {
  it('POST /api/agents/:id/retire → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'RetireAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('POST', `/api/agents/${created.body.id}/retire', {
      reason: 'Superseded',
      archive_data: true,
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'retired');
    assert.ok(res.body.retired_at);
  });

  it('POST /api/agents/:id/restore → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'RestoreAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/retire', { reason: 'Temp retire' });
    const res = await request('POST', `/api/agents/${created.body.id}/restore`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'active');
  });

  it('GET /api/retired → 200', async () => {
    const created = await request('POST', '/api/agents', { name: 'ListRetiredAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    await request('POST', `/api/agents/${created.body.id}/retire`, { reason: 'Permanent' });
    const res = await request('GET', '/api/retired');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.agents));
    assert.ok(res.body.agents.some(a => a.id === created.body.id));
  });
});

describe('Agent Policies', () => {
  it('GET /api/policies → 200 with seeded policies', async () => {
    const res = await request('GET', '/api/policies');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.policies));
    assert.ok(res.body.policies.length >= 3); // seeded deployment, deprecation, retirement
  });

  it('POST /api/policies → 201', async () => {
    const res = await request('POST', '/api/policies', {
      name: 'Custom Policy',
      description: 'Test policy',
      rules: [{ max_instances: 10 }],
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
  });

  it('GET /api/policies/:id → 200', async () => {
    const res = await request('GET', '/api/policies/deployment');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Default Deployment Policy');
  });

  it('PUT /api/policies/:id → 200', async () => {
    const res = await request('PUT', '/api/policies/deployment', { name: 'Updated Deployment Policy' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Updated Deployment Policy');
  });

  it('DELETE /api/policies/:id → 204', async () => {
    await request('POST', '/api/policies', { name: 'TempPolicy', description: 'Delete me', rules: [] });
    const list = await request('GET', '/api/policies');
    const temp = list.body.policies.find(p => p.name === 'TempPolicy');
    const res = await request('DELETE', `/api/policies/${temp.id}`);
    assert.strictEqual(res.status, 204);
  });
});

describe('Health & Stats', () => {
  it('GET /health → 200', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.status);
  });

  it('GET /api/stats → 200', async () => {
    const res = await request('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.total_agents === 'number');
    assert.ok(typeof res.body.total_requests === 'number');
  });

  it('GET /api/audit → 200', async () => {
    await request('POST', '/api/agents', { name: 'AuditAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('GET', '/api/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.logs));
  });
});

describe('Quality Endpoint', () => {
  it('GET /api/agents/:id/quality → 200 with scores', async () => {
    const created = await request('POST', '/api/agents', { name: 'QualityAgent', type: 'reasoning', capabilities: [], version: '1.0.0' });
    const res = await request('GET', `/api/agents/${created.body.id}/quality`);
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.overall_score === 'number');
    assert.ok(res.body.overall_score >= 0 && res.body.overall_score <= 1);
  });
});
