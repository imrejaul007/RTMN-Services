// Memory Lifecycle OS tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4899, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Memory Lifecycle OS HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // CRUD
  it('POST /api/memories', async () => { const r = await httpReq('POST', '/api/memories', { owner: 'user1', content: 'Test fact', type: 'fact', confidence: 0.9 }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.owner).toBe('user1'); });
  it('POST /api/memories → 400 without owner', async () => { const r = await httpReq('POST', '/api/memories', { content: 'x' }); expect(r.status).toBe(400); });
  it('GET /api/memories', async () => { const r = await httpReq('GET', '/api/memories'); expect(r.status).toBe(200); expect(r.body.memories).toBeTruthy(); });
  it('GET /api/memories?owner=user1', async () => { const r = await httpReq('GET', '/api/memories?owner=user1'); expect(r.status).toBe(200); });
  it('GET /api/memories/:id', async () => { const create = await httpReq('POST', '/api/memories', { owner: 'user2', content: 'Find me' }); const r = await httpReq('GET', '/api/memories/' + create.body.id); expect(r.status).toBe(200); expect(r.body.content).toBe('Find me'); });
  it('GET /api/memories/:id → 404', async () => { const r = await httpReq('GET', '/api/memories/nonexistent'); expect(r.status).toBe(404); });
  it('PUT /api/memories/:id', async () => { const create = await httpReq('POST', '/api/memories', { owner: 'u3', content: 'Original' }); const r = await httpReq('PUT', '/api/memories/' + create.body.id, { content: 'Updated' }); expect(r.status).toBe(200); expect(r.body.content).toBe('Updated'); });
  it('DELETE /api/memories/:id', async () => { const create = await httpReq('POST', '/api/memories', { owner: 'u4', content: 'To delete' }); const r = await httpReq('DELETE', '/api/memories/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Expired
  it('GET /api/memories/expired', async () => { const r = await httpReq('GET', '/api/memories/expired'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('expired'); });

  // Pruning
  it('POST /api/prune', async () => { const r = await httpReq('POST', '/api/prune', { minConfidence: 0.3 }); expect(r.status).toBe(200); expect(r.body).toHaveProperty('pruned'); });
  it('POST /api/prune → 400 without minConfidence', async () => { /* threshold has default */ const r = await httpReq('POST', '/api/prune', {}); expect(r.status).toBe(200); });

  // Compaction
  it('POST /api/compact', async () => { const r = await httpReq('POST', '/api/compact', { confidenceThreshold: 0.7 }); expect(r.status).toBe(200); expect(r.body).toHaveProperty('compacted'); });

  // Archival
  it('POST /api/archive', async () => { const r = await httpReq('POST', '/api/archive', { olderThanDays: 30 }); expect(r.status).toBe(200); expect(r.body).toHaveProperty('archived'); });

  // GDPR
  it('POST /api/gdpr/delete', async () => { const r = await httpReq('POST', '/api/gdpr/delete', { owner: 'gdpr-user' }); expect(r.status).toBe(200); expect(r.body.owner).toBe('gdpr-user'); });
  it('POST /api/gdpr/delete → 400 without owner', async () => { const r = await httpReq('POST', '/api/gdpr/delete', {}); expect(r.status).toBe(400); });

  // Hooks
  it('POST /api/hooks', async () => { const r = await httpReq('POST', '/api/hooks', { name: 'TestHook', event: 'on-forget', callback: 'console.log' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/hooks', async () => { const r = await httpReq('GET', '/api/hooks'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('hooks'); });
  it('DELETE /api/hooks/:id', async () => { const create = await httpReq('POST', '/api/hooks', { name: 'DelHook', event: 'on-archive', callback: 'x' }); const r = await httpReq('DELETE', '/api/hooks/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Stats
  it('GET /api/stats', async () => { const r = await httpReq('GET', '/api/stats'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('total'); expect(r.body).toHaveProperty('byType'); expect(r.body).toHaveProperty('byConfidence'); });
});