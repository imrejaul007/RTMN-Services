// Twin Registry tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4903, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Twin Registry HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // Types CRUD
  it('POST /api/types', async () => { const r = await httpReq('POST', '/api/types', { name: 'Customer', description: 'Customer twin', schema: { fields: ['name', 'email'] }, attributes: ['personal'], relationships: ['orders'] }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('POST /api/types → 400 without name', async () => { const r = await httpReq('POST', '/api/types', {}); expect(r.status).toBe(400); });
  it('GET /api/types', async () => { const r = await httpReq('GET', '/api/types'); expect(r.status).toBe(200); expect(r.body.types).toBeTruthy(); });
  it('GET /api/types/:id', async () => { const create = await httpReq('POST', '/api/types', { name: 'Get Type' }); const r = await httpReq('GET', '/api/types/' + create.body.id); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Type'); });
  it('PUT /api/types/:id', async () => { const create = await httpReq('POST', '/api/types', { name: 'Old Type' }); const r = await httpReq('PUT', '/api/types/' + create.body.id, { name: 'New Type', description: 'Updated' }); expect(r.status).toBe(200); expect(r.body.name).toBe('New Type'); });
  it('DELETE /api/types/:id', async () => { const create = await httpReq('POST', '/api/types', { name: 'Del' }); const r = await httpReq('DELETE', '/api/types/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Instances CRUD
  it('POST /api/instances', async () => { const t = await httpReq('POST', '/api/types', { name: 'InstType' }); const r = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Test Instance', data: { x: 1 }, tags: ['test'] }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.version).toBe(1); });
  it('POST /api/instances → 400 without typeId', async () => { const r = await httpReq('POST', '/api/instances', { name: 'x' }); expect(r.status).toBe(400); });
  it('GET /api/instances', async () => { const r = await httpReq('GET', '/api/instances'); expect(r.status).toBe(200); expect(r.body.instances).toBeTruthy(); });
  it('GET /api/instances/:id', async () => { const t = await httpReq('POST', '/api/types', { name: 'IType2' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Get Inst' }); const r = await httpReq('GET', '/api/instances/' + i.body.id); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Inst'); });
  it('PUT /api/instances/:id', async () => { const t = await httpReq('POST', '/api/types', { name: 'IType3' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Old Inst' }); const r = await httpReq('PUT', '/api/instances/' + i.body.id, { name: 'New Inst', status: 'archived' }); expect(r.status).toBe(200); expect(r.body.name).toBe('New Inst'); expect(r.body.status).toBe('archived'); });
  it('DELETE /api/instances/:id', async () => { const t = await httpReq('POST', '/api/types', { name: 'IType4' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Del' }); const r = await httpReq('DELETE', '/api/instances/' + i.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Versioning
  it('POST /api/instances/:id/versions', async () => { const t = await httpReq('POST', '/api/types', { name: 'VType' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Ver Inst' }); const r = await httpReq('POST', '/api/instances/' + i.body.id + '/versions'); expect(r.status).toBe(200); expect(r.body.bumped).toBe(2); });

  // Relationships
  it('POST /api/instances/:id/relationships', async () => { const t = await httpReq('POST', '/api/types', { name: 'RType' }); const i1 = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'I1' }); const i2 = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'I2' }); const r = await httpReq('POST', '/api/instances/' + i1.body.id + '/relationships', { toId: i2.body.id, type: 'references' }); expect(r.status).toBe(201); });
  it('GET /api/instances/:id/relationships', async () => { const t = await httpReq('POST', '/api/types', { name: 'RType2' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'Rel Inst' }); const r = await httpReq('GET', '/api/instances/' + i.body.id + '/relationships'); expect(r.status).toBe(200); });
  it('DELETE /api/instances/:id/relationships/:relId', async () => { const t = await httpReq('POST', '/api/types', { name: 'RType3' }); const i = await httpReq('POST', '/api/instances', { typeId: t.body.id, name: 'DelRel' }); const dep = await httpReq('POST', '/api/instances/' + i.body.id + '/relationships', { toId: 'other-id', type: 'uses' }); const r = await httpReq('DELETE', '/api/instances/' + i.body.id + '/relationships/' + dep.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Stats
  it('GET /api/stats', async () => { const r = await httpReq('GET', '/api/stats'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('totalTypes'); expect(r.body).toHaveProperty('totalInstances'); });
});