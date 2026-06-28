// Personalization OS unit tests
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4893, path, method, headers: {} };
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
describe('Personalization OS HTTP API', () => {
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

  // Profiles
  it('POST /api/profiles should create profile', async () => {
    const res = await httpReq('POST', '/api/profiles', { userId: 'user-1', name: 'John Doe', preferences: { theme: 'dark' }, traits: { age: 30 } });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('user-1');
    expect(res.body.affinityScores).toEqual({});
    expect(res.body.interactionCount).toBe(0);
  });

  it('POST /api/profiles should return 409 for duplicate', async () => {
    await httpReq('POST', '/api/profiles', { userId: 'dup-user', name: 'Dup' });
    const res = await httpReq('POST', '/api/profiles', { userId: 'dup-user', name: 'Dup 2' });
    expect(res.status).toBe(409);
  });

  it('GET /api/profiles should list profiles', async () => {
    const res = await httpReq('GET', '/api/profiles');
    expect(res.status).toBe(200);
    expect(res.body.profiles).toBeTruthy();
  });

  it('GET /api/profiles?userId= should get specific profile', async () => {
    await httpReq('POST', '/api/profiles', { userId: 'get-test', name: 'Test' });
    const res = await httpReq('GET', '/api/profiles?userId=get-test');
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('get-test');
  });

  it('PUT /api/profiles/:userId should update', async () => {
    await httpReq('POST', '/api/profiles', { userId: 'put-test', name: 'Old' });
    const res = await httpReq('PUT', '/api/profiles/put-test', { name: 'New', preferences: { lang: 'en' } });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
    expect(res.body.preferences.lang).toBe('en');
  });

  // Preferences tracking
  it('POST /api/preferences/:userId/track should track action', async () => {
    await httpReq('POST', '/api/profiles', { userId: 'track-test', name: 'Track' });
    const res = await httpReq('POST', '/api/preferences/track-test/track', { action: 'like', itemId: 'item-1', itemType: 'food', value: 5 });
    expect(res.status).toBe(200);
    expect(res.body.event.action).toBe('like');
    expect(res.body.newAffinity).toHaveProperty('food');
  });

  it('POST /api/preferences/:userId/track should return 404 for unknown user', async () => {
    const res = await httpReq('POST', '/api/preferences/nobody/track', { action: 'view', itemId: 'x' });
    expect(res.status).toBe(404);
  });

  it('GET /api/preferences/:userId/events should list events', async () => {
    const res = await httpReq('GET', '/api/preferences/track-test/events');
    expect(res.status).toBe(200);
    expect(res.body.events).toBeTruthy();
  });

  // Recommendations
  it('GET /api/recommendations/:userId should return recommendations', async () => {
    await httpReq('POST', '/api/profiles', { userId: 'rec-test', name: 'Rec' });
    // Seed some affinity
    for (let i = 0; i < 3; i++) {
      await httpReq('POST', '/api/preferences/rec-test/track', { action: 'like', itemId: `item-${i}`, itemType: 'food' });
    }
    const res = await httpReq('GET', '/api/recommendations/rec-test?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.recommendations).toBeTruthy();
    expect(res.body.userId).toBe('rec-test');
  });

  it('GET /api/recommendations/:userId should return 404 for unknown user', async () => {
    const res = await httpReq('GET', '/api/recommendations/nobody');
    expect(res.status).toBe(404);
  });

  // Segments
  it('GET /api/segments should return segments', async () => {
    const res = await httpReq('GET', '/api/segments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('segments');
    expect(res.body).toHaveProperty('totalSegments');
  });
});