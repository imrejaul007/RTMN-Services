// Knowledge Registry tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4900, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Knowledge Registry HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // Assets CRUD
  it('POST /api/assets', async () => { const r = await httpReq('POST', '/api/assets', { name: 'Test Knowledge', type: 'article', content: 'Test content', tags: ['test'], taxonomy: 'tech', confidence: 0.95 }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.version).toBe(1); });
  it('POST /api/assets → 400 without name', async () => { const r = await httpReq('POST', '/api/assets', { type: 'article' }); expect(r.status).toBe(400); });
  it('GET /api/assets', async () => { const r = await httpReq('GET', '/api/assets'); expect(r.status).toBe(200); expect(r.body.assets).toBeTruthy(); });
  it('GET /api/assets?type=article', async () => { const r = await httpReq('GET', '/api/assets?type=article'); expect(r.status).toBe(200); });
  it('GET /api/assets/:id', async () => { const create = await httpReq('POST', '/api/assets', { name: 'Get Test', type: 'fact' }); const r = await httpReq('GET', '/api/assets/' + create.body.id); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Test'); });
  it('PUT /api/assets/:id', async () => { const create = await httpReq('POST', '/api/assets', { name: 'Old Name', type: 'fact' }); const r = await httpReq('PUT', '/api/assets/' + create.body.id, { name: 'New Name' }); expect(r.status).toBe(200); expect(r.body.name).toBe('New Name'); });
  it('DELETE /api/assets/:id', async () => { const create = await httpReq('POST', '/api/assets', { name: 'Del', type: 'fact' }); const r = await httpReq('DELETE', '/api/assets/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Versioning
  it('POST /api/assets/:id/versions', async () => { const create = await httpReq('POST', '/api/assets', { name: 'Version Test', type: 'fact' }); const r = await httpReq('POST', '/api/assets/' + create.body.id + '/versions'); expect(r.status).toBe(200); expect(r.body.bumped).toBe(2); });
  it('GET /api/assets/:id/versions', async () => { const create = await httpReq('POST', '/api/assets', { name: 'VList', type: 'fact' }); const r = await httpReq('GET', '/api/assets/' + create.body.id + '/versions'); expect(r.status).toBe(200); expect(r.body.versions).toBeTruthy(); });

  // Taxonomy
  it('POST /api/taxonomy', async () => { const r = await httpReq('POST', '/api/taxonomy', { name: 'Technology', description: 'Tech category' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/taxonomy', async () => { const r = await httpReq('GET', '/api/taxonomy'); expect(r.status).toBe(200); expect(r.body.categories).toBeTruthy(); });

  // Search
  it('GET /api/search', async () => { const r = await httpReq('GET', '/api/search?q=test'); expect(r.status).toBe(200); expect(r.body.results).toBeTruthy(); });
  it('GET /api/search?type=article', async () => { const r = await httpReq('GET', '/api/search?type=article'); expect(r.status).toBe(200); });

  // Dependencies
  it('POST /api/assets/:id/dependencies', async () => { const a1 = await httpReq('POST', '/api/assets', { name: 'A1', type: 'fact' }); const a2 = await httpReq('POST', '/api/assets', { name: 'A2', type: 'fact' }); const r = await httpReq('POST', '/api/assets/' + a1.body.id + '/dependencies', { toId: a2.body.id, type: 'uses' }); expect(r.status).toBe(201); });
  it('GET /api/assets/:id/dependencies', async () => { const a = await httpReq('POST', '/api/assets', { name: 'Dep Test', type: 'fact' }); const r = await httpReq('GET', '/api/assets/' + a.body.id + '/dependencies'); expect(r.status).toBe(200); });

  // Analytics
  it('GET /api/stats', async () => { const r = await httpReq('GET', '/api/stats'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('total'); expect(r.body).toHaveProperty('byType'); });
});