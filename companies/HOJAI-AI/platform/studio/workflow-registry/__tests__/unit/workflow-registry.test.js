// Workflow Registry tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4902, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Workflow Registry HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // Templates CRUD
  it('POST /api/templates', async () => { const r = await httpReq('POST', '/api/templates', { name: 'Test Workflow', category: 'automation', industry: 'tech', complexity: 'simple', nodes: [], edges: [] }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.version).toBe(1); });
  it('POST /api/templates → 400 without name', async () => { const r = await httpReq('POST', '/api/templates', {}); expect(r.status).toBe(400); });
  it('GET /api/templates', async () => { const r = await httpReq('GET', '/api/templates'); expect(r.status).toBe(200); expect(r.body.templates).toBeTruthy(); });
  it('GET /api/templates?category=automation', async () => { const r = await httpReq('GET', '/api/templates?category=automation'); expect(r.status).toBe(200); });
  it('GET /api/templates/:id', async () => { const create = await httpReq('POST', '/api/templates', { name: 'Get Tmpl', category: 'test' }); const r = await httpReq('GET', '/api/templates/' + create.body.id); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Tmpl'); });
  it('PUT /api/templates/:id', async () => { const create = await httpReq('POST', '/api/templates', { name: 'Old', category: 'test' }); const r = await httpReq('PUT', '/api/templates/' + create.body.id, { name: 'New', complexity: 'complex' }); expect(r.status).toBe(200); expect(r.body.name).toBe('New'); expect(r.body.complexity).toBe('complex'); });
  it('DELETE /api/templates/:id', async () => { const create = await httpReq('POST', '/api/templates', { name: 'Del' }); const r = await httpReq('DELETE', '/api/templates/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Versioning
  it('POST /api/templates/:id/versions', async () => { const create = await httpReq('POST', '/api/templates', { name: 'Ver Tmpl' }); const r = await httpReq('POST', '/api/templates/' + create.body.id + '/versions'); expect(r.status).toBe(200); expect(r.body.bumped).toBe(2); });
  it('GET /api/templates/:id/versions', async () => { const create = await httpReq('POST', '/api/templates', { name: 'VList' }); const r = await httpReq('GET', '/api/templates/' + create.body.id + '/versions'); expect(r.status).toBe(200); expect(r.body.versions).toBeTruthy(); });

  // Categories
  it('POST /api/categories', async () => { const r = await httpReq('POST', '/api/categories', { name: 'Marketing', type: 'use-case', description: 'Marketing workflows' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/categories', async () => { const r = await httpReq('GET', '/api/categories'); expect(r.status).toBe(200); expect(r.body.categories).toBeTruthy(); });

  // Search
  it('GET /api/search', async () => { const r = await httpReq('GET', '/api/search?q=test'); expect(r.status).toBe(200); expect(r.body.results).toBeTruthy(); });
  it('GET /api/search?industry=tech', async () => { const r = await httpReq('GET', '/api/search?industry=tech'); expect(r.status).toBe(200); });

  // Analytics
  it('GET /api/analytics', async () => { const r = await httpReq('GET', '/api/analytics'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('total'); expect(r.body).toHaveProperty('byCategory'); });
});