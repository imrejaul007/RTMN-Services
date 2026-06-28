// Event Platform tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4901, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('Event Platform HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // Schemas
  it('POST /api/schemas', async () => { const r = await httpReq('POST', '/api/schemas', { name: 'user_event', version: 1, fields: ['userId', 'action'] }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/schemas', async () => { const r = await httpReq('GET', '/api/schemas'); expect(r.status).toBe(200); expect(r.body.schemas).toBeTruthy(); });
  it('GET /api/schemas/:name', async () => { const r = await httpReq('GET', '/api/schemas/user_event'); expect(r.status).toBe(200); expect(r.body.name).toBe('user_event'); });
  it('POST /api/schemas → 400 without fields', async () => { const r = await httpReq('POST', '/api/schemas', { name: 'bad' }); expect(r.status).toBe(400); });

  // Events
  it('POST /api/events', async () => { const r = await httpReq('POST', '/api/events', { type: 'click', source: 'web', data: { x: 1 } }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.type).toBe('click'); });
  it('POST /api/events → 400 without type', async () => { const r = await httpReq('POST', '/api/events', { source: 'web' }); expect(r.status).toBe(400); });
  it('GET /api/events', async () => { const r = await httpReq('GET', '/api/events'); expect(r.status).toBe(200); expect(r.body.events).toBeTruthy(); });
  it('GET /api/events?type=click', async () => { const r = await httpReq('GET', '/api/events?type=click'); expect(r.status).toBe(200); });

  // Subscriptions
  it('POST /api/subscriptions', async () => { const r = await httpReq('POST', '/api/subscriptions', { name: 'Click Watcher', type: 'click', callback: 'http://cb.example.com' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/subscriptions', async () => { const r = await httpReq('GET', '/api/subscriptions'); expect(r.status).toBe(200); expect(r.body.subscriptions).toBeTruthy(); });
  it('DELETE /api/subscriptions/:id', async () => { const create = await httpReq('POST', '/api/subscriptions', { name: 'DelSub', type: 'click', callback: 'x' }); const r = await httpReq('DELETE', '/api/subscriptions/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Rules
  it('POST /api/rules', async () => { const r = await httpReq('POST', '/api/rules', { name: 'Log Clicks', eventType: 'click', destination: 'logger' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('GET /api/rules', async () => { const r = await httpReq('GET', '/api/rules'); expect(r.status).toBe(200); expect(r.body.rules).toBeTruthy(); });
  it('DELETE /api/rules/:id', async () => { const create = await httpReq('POST', '/api/rules', { name: 'DelRule', eventType: 'click', destination: 'x' }); const r = await httpReq('DELETE', '/api/rules/' + create.body.id); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Replay
  it('POST /api/replay', async () => { const r = await httpReq('POST', '/api/replay', { from: '2026-06-01T00:00:00Z', to: '2026-06-28T00:00:00Z', target: 'analytics' }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); expect(r.body.status).toBe('running'); });
  it('GET /api/replay/:id', async () => { const create = await httpReq('POST', '/api/replay', { from: '2026-06-01', to: '2026-06-28', target: 'x' }); const r = await httpReq('GET', '/api/replay/' + create.body.id); expect(r.status).toBe(200); });

  // Analytics
  it('GET /api/analytics', async () => { const r = await httpReq('GET', '/api/analytics'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('total'); expect(r.body).toHaveProperty('byType'); });
});