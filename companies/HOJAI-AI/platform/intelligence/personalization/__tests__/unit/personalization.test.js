// Personalization OS tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4893, path, method, headers: {} };
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
describe('Personalization OS', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const res = await httpReq('GET', '/health'); expect(res.status).toBe(200); expect(res.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const res = await httpReq('GET', '/ready'); expect(res.status).toBe(200); expect(res.body.ready).toBe(true); });
  it('POST /api/profiles', async () => { const res = await httpReq('POST', '/api/profiles', { userId: 'user-1', name: 'John' }); expect(res.status).toBe(201); expect(res.body.userId).toBe('user-1'); });
  it('POST /api/profiles duplicate → 409', async () => { await httpReq('POST', '/api/profiles', { userId: 'dup', name: 'X' }); const res = await httpReq('POST', '/api/profiles', { userId: 'dup', name: 'Y' }); expect(res.status).toBe(409); });
  it('POST /api/profiles → 400 without userId', async () => { const res = await httpReq('POST', '/api/profiles', { name: 'No ID' }); expect(res.status).toBe(400); });
  it('GET /api/profiles lists', async () => { const res = await httpReq('GET', '/api/profiles'); expect(res.status).toBe(200); expect(res.body.profiles).toBeTruthy(); });
  it('GET /api/profiles?userId= gets one', async () => { await httpReq('POST', '/api/profiles', { userId: 'get-one', name: 'Test' }); const res = await httpReq('GET', '/api/profiles?userId=get-one'); expect(res.status).toBe(200); expect(res.body.userId).toBe('get-one'); });
  it('GET /api/profiles?userId= → 404 unknown', async () => { const res = await httpReq('GET', '/api/profiles?userId=nobody'); expect(res.status).toBe(404); });
  it('PUT /api/profiles/:userId', async () => { await httpReq('POST', '/api/profiles', { userId: 'put-test', name: 'Old' }); const res = await httpReq('PUT', '/api/profiles/put-test', { name: 'New', preferences: { lang: 'en' } }); expect(res.status).toBe(200); expect(res.body.name).toBe('New'); });
  it('POST /api/preferences/:userId/track', async () => { await httpReq('POST', '/api/profiles', { userId: 'track-test', name: 'Track' }); const res = await httpReq('POST', '/api/preferences/track-test/track', { action: 'like', itemId: 'item-1', itemType: 'food' }); expect(res.status).toBe(200); expect(res.body.event.action).toBe('like'); expect(res.body.newAffinity).toHaveProperty('food'); });
  it('POST /api/preferences/:userId/track → 404 unknown user', async () => { const res = await httpReq('POST', '/api/preferences/nobody/track', { action: 'view', itemId: 'x' }); expect(res.status).toBe(404); });
  it('GET /api/preferences/:userId/events', async () => { const res = await httpReq('GET', '/api/preferences/track-test/events'); expect(res.status).toBe(200); });
  it('GET /api/recommendations/:userId', async () => { await httpReq('POST', '/api/profiles', { userId: 'rec-test', name: 'Rec' }); for (let i = 0; i < 3; i++) await httpReq('POST', '/api/preferences/rec-test/track', { action: 'like', itemId: `item-${i}`, itemType: 'food' }); const res = await httpReq('GET', '/api/recommendations/rec-test?limit=5'); expect(res.status).toBe(200); expect(res.body.recommendations).toBeTruthy(); });
  it('GET /api/recommendations/:userId → 404 unknown', async () => { const res = await httpReq('GET', '/api/recommendations/nobody'); expect(res.status).toBe(404); });
  it('GET /api/segments', async () => { const res = await httpReq('GET', '/api/segments'); expect(res.status).toBe(200); expect(res.body).toHaveProperty('segments'); });
});
