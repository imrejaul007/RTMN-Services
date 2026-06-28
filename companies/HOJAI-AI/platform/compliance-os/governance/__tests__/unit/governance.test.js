// Governance OS unit tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4895, path, method, headers: {} };
    if (body) {
      const json = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(json);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Governance OS HTTP API', () => {
  beforeAll(async () => {
    const mod = await import('../../src/index.js');
    server = mod.default;
    await new Promise(r => setTimeout(r, 200));
  });
  afterAll(() => { if (server) server.close(); });

  // Health
  it('GET /health', async () => {
    const res = await httpReq('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /ready', async () => {
    const res = await httpReq('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  // Compliance report (empty state)
  it('GET /api/compliance/report', async () => {
    const res = await httpReq('GET', '/api/compliance/report');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.complianceScore).toBe(100);
  });

  // Policies CRUD
  it('POST /api/policies should create policy', async () => {
    const res = await httpReq('POST', '/api/policies', {
      name: 'No Data Exfiltration',
      description: 'Block data exfiltration attempts',
      type: 'security',
      rules: [{ type: 'deny', action: 'export_data' }],
      severity: 'high',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.name).toBe('No Data Exfiltration');
    expect(res.body.status).toBe('active');
    expect(res.body.version).toBe(1);
  });

  it('POST /api/policies should return 400 without required fields', async () => {
    const res = await httpReq('POST', '/api/policies', { name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('GET /api/policies should list policies', async () => {
    const res = await httpReq('GET', '/api/policies');
    expect(res.status).toBe(200);
    expect(res.body.policies.length).toBeGreaterThan(0);
  });

  it('GET /api/policies?type=security should filter', async () => {
    const res = await httpReq('GET', '/api/policies?type=security');
    expect(res.status).toBe(200);
    expect(res.body.policies.every(p => p.type === 'security')).toBe(true);
  });

  it('GET /api/policies/:id should get policy', async () => {
    const create = await httpReq('POST', '/api/policies', { name: 'Get Test', type: 'privacy', rules: [{ type: 'allow', action: 'read' }] });
    const res = await httpReq('GET', `/api/policies/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Get Test');
  });

  // Policy evaluation
  it('POST /api/policies/:id/evaluate should allow non-violated action', async () => {
    const create = await httpReq('POST', '/api/policies', { name: 'Eval Test', type: 'data', rules: [{ type: 'deny', action: 'delete_all' }] });
    const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'read', actor: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('allow');
  });

  it('POST /api/policies/:id/evaluate should deny violated action', async () => {
    const create = await httpReq('POST', '/api/policies', { name: 'Deny Test', type: 'data', rules: [{ type: 'deny', action: 'delete_all' }] });
    const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'delete_all', actor: 'user-1' });
    expect(res.status).toBe(200);
    expect(res.body.decision).toBe('deny');
  });

  it('POST /api/policies/:id/evaluate should record violation', async () => {
    const create = await httpReq('POST', '/api/policies', { name: 'Violate Test', type: 'data', rules: [{ type: 'deny', action: 'steal_data' }] });
    await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'steal_data', actor: 'bad-actor' });
    const violations = await httpReq('GET', '/api/violations');
    expect(violations.body.violations.some(v => v.policyId === create.body.id)).toBe(true);
  });

  it('POST /api/policies/:id/evaluate should return 400 without required fields', async () => {
    const create = await httpReq('POST', '/api/policies', { name: 'No Actor', type: 'test', rules: [] });
    const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'do' });
    expect(res.status).toBe(400);
  });

  // Audit trail
  it('POST /api/audits should create audit', async () => {
    const res = await httpReq('POST', '/api/audits', { actor: 'user-1', action: 'login', resource: '/api/auth', outcome: 'success' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.actor).toBe('user-1');
  });

  it('POST /api/audits should return 400 without required fields', async () => {
    const res = await httpReq('POST', '/api/audits', { actor: 'user-1' });
    expect(res.status).toBe(400);
  });

  it('GET /api/audits should list audits', async () => {
    const res = await httpReq('GET', '/api/audits');
    expect(res.status).toBe(200);
    expect(res.body.audits).toBeTruthy();
  });

  it('GET /api/audits?actor=user-1 should filter', async () => {
    const res = await httpReq('GET', '/api/audits?actor=user-1');
    expect(res.status).toBe(200);
    expect(res.body.audits.every(a => a.actor === 'user-1')).toBe(true);
  });

  it('GET /api/audits/:id should get audit', async () => {
    const create = await httpReq('POST', '/api/audits', { actor: 'a', action: 'b' });
    const res = await httpReq('GET', `/api/audits/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(create.body.id);
  });

  // Violations
  it('GET /api/violations should list violations', async () => {
    const res = await httpReq('GET', '/api/violations');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('violations');
  });

  it('GET /api/violations?severity=high should filter', async () => {
    const res = await httpReq('GET', '/api/violations?severity=high');
    expect(res.status).toBe(200);
  });

  // Compliance report with data
  it('GET /api/compliance/report should reflect policies and violations', async () => {
    const res = await httpReq('GET', '/api/compliance/report');
    expect(res.status).toBe(200);
    expect(res.body.summary.totalPolicies).toBeGreaterThan(0);
  });
});