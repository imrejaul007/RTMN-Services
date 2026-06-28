// Governance OS tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4895, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Governance OS', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const res = await httpReq('GET', '/health'); expect(res.status).toBe(200); expect(res.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const res = await httpReq('GET', '/ready'); expect(res.status).toBe(200); expect(res.body.ready).toBe(true); });
  it('GET /api/compliance/report empty', async () => { const res = await httpReq('GET', '/api/compliance/report'); expect(res.status).toBe(200); expect(res.body.complianceScore).toBe(100); });
  it('POST /api/policies', async () => { const res = await httpReq('POST', '/api/policies', { name: 'No Exfil', description: 'Block data exfil', type: 'security', rules: [{ type: 'deny', action: 'export_data' }], severity: 'high' }); expect(res.status).toBe(201); expect(res.body.id).toBeTruthy(); expect(res.body.status).toBe('active'); });
  it('POST /api/policies → 400 without required', async () => { const res = await httpReq('POST', '/api/policies', { name: 'Incomplete' }); expect(res.status).toBe(400); });
  it('GET /api/policies', async () => { const res = await httpReq('GET', '/api/policies'); expect(res.status).toBe(200); expect(res.body.policies.length).toBeGreaterThan(0); });
  it('GET /api/policies?type=security', async () => { const res = await httpReq('GET', '/api/policies?type=security'); expect(res.status).toBe(200); expect(res.body.policies.every(p => p.type === 'security')).toBe(true); });
  it('GET /api/policies/:id', async () => { const create = await httpReq('POST', '/api/policies', { name: 'Get Test', type: 'privacy', rules: [{ type: 'allow', action: 'read' }] }); const res = await httpReq('GET', `/api/policies/${create.body.id}`); expect(res.status).toBe(200); expect(res.body.name).toBe('Get Test'); });
  it('POST /api/policies/:id/evaluate → allow', async () => { const create = await httpReq('POST', '/api/policies', { name: 'Eval Test', type: 'data', rules: [{ type: 'deny', action: 'delete_all' }] }); const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'read', actor: 'user-1' }); expect(res.status).toBe(200); expect(res.body.decision).toBe('allow'); });
  it('POST /api/policies/:id/evaluate → deny', async () => { const create = await httpReq('POST', '/api/policies', { name: 'Deny Test', type: 'data', rules: [{ type: 'deny', action: 'delete_all' }] }); const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'delete_all', actor: 'user-1' }); expect(res.status).toBe(200); expect(res.body.decision).toBe('deny'); });
  it('POST /api/policies/:id/evaluate → records violation', async () => { const create = await httpReq('POST', '/api/policies', { name: 'Violate Test', type: 'data', rules: [{ type: 'deny', action: 'steal' }] }); await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'steal', actor: 'bad' }); const violations = await httpReq('GET', '/api/violations'); expect(violations.body.violations.some(v => v.policyId === create.body.id)).toBe(true); });
  it('POST /api/policies/:id/evaluate → 400 without actor', async () => { const create = await httpReq('POST', '/api/policies', { name: 'No Actor', type: 'test', rules: [] }); const res = await httpReq('POST', `/api/policies/${create.body.id}/evaluate`, { action: 'do' }); expect(res.status).toBe(400); });
  it('POST /api/audits', async () => { const res = await httpReq('POST', '/api/audits', { actor: 'user-1', action: 'login', resource: '/api/auth', outcome: 'success' }); expect(res.status).toBe(201); expect(res.body.id).toBeTruthy(); });
  it('POST /api/audits → 400 without required', async () => { const res = await httpReq('POST', '/api/audits', { actor: 'u' }); expect(res.status).toBe(400); });
  it('GET /api/audits', async () => { const res = await httpReq('GET', '/api/audits'); expect(res.status).toBe(200); expect(res.body.audits).toBeTruthy(); });
  it('GET /api/audits/:id', async () => { const create = await httpReq('POST', '/api/audits', { actor: 'a', action: 'b' }); const res = await httpReq('GET', `/api/audits/${create.body.id}`); expect(res.status).toBe(200); expect(res.body.id).toBe(create.body.id); });
  it('GET /api/violations', async () => { const res = await httpReq('GET', '/api/violations'); expect(res.status).toBe(200); expect(res.body).toHaveProperty('violations'); });
  it('GET /api/compliance/report with data', async () => { const res = await httpReq('GET', '/api/compliance/report'); expect(res.status).toBe(200); expect(res.body.summary.totalPolicies).toBeGreaterThan(0); });
});
