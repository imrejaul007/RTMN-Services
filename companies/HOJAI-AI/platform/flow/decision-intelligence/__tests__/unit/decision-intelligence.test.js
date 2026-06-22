/**
 * Decision Intelligence unit tests — vitest
 * Tests the 16 public routes + named exports + bypass behavior.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../../src/index.js';

let server;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Decision Intelligence — config exports', () => {
  it('app is the Express app', () => {
    expect(typeof app).toBe('function');
    expect(app.name).toBe('app');
  });

  it('exports authOrBypass middleware', () => {
    expect(typeof app.authOrBypass).toBe('function');
  });

  it('exports PORT as 4756 by default', () => {
    expect(app.PORT).toBe(4756);
  });

  it('exports SERVICE_NAME', () => {
    expect(app.SERVICE_NAME).toBe('decision-intelligence');
  });

  it('exports items + users + events stores', () => {
    expect(app.items).toBeTypeOf('object');
    expect(app.users).toBeTypeOf('object');
    expect(Array.isArray(app.events)).toBe(true);
  });
});

describe('Decision Intelligence — health/info routes', () => {
  it('GET /api/health returns healthy', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('decision-intelligence');
  });

  it('GET /api/methods lists available methods', async () => {
    const res = await request('GET', '/api/methods');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('recommendation');
    expect(res.body).toHaveProperty('decision');
  });

  it('GET /api/stats returns stats', async () => {
    const res = await request('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('users');
  });

  it('GET /api/audit returns audit log', async () => {
    const res = await request('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });
});

describe('Decision Intelligence — recommendation flow', () => {
  it('POST /api/recommend/event records event', async () => {
    const res = await request('POST', '/api/recommend/event', {
      userId: 'u1',
      itemId: 'i1',
      eventType: 'view',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('event');
  });

  it('POST /api/recommend/items returns recommendations', async () => {
    // First record a couple events
    await request('POST', '/api/recommend/event', { userId: 'u2', itemId: 'i2', eventType: 'click' });
    await request('POST', '/api/recommend/event', { userId: 'u2', itemId: 'i3', eventType: 'like' });

    const res = await request('POST', '/api/recommend/items', {
      userId: 'u2',
      method: 'hybrid',
      k: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('recommendations');
    expect(Array.isArray(res.body.recommendations)).toBe(true);
  });

  it('POST /api/recommend/items/batch handles multiple users', async () => {
    const res = await request('POST', '/api/recommend/items/batch', {
      userIds: ['u1', 'u2'],
      k: 3,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('GET /api/recommend/similarity/:itemId returns similar items', async () => {
    const res = await request('GET', '/api/recommend/similarity/i1');
    expect(res.status).toBe(200);
  });
});

describe('Decision Intelligence — NBA flow', () => {
  it('GET /api/nba/actions lists templates', async () => {
    const res = await request('GET', '/api/nba/actions');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('templates');
  });

  it('POST /api/nba/actions creates a template', async () => {
    const res = await request('POST', '/api/nba/actions', {
      id: 'test-template',
      name: 'Test',
      description: 'Test action',
      goal: 'revenue',
      score: 0.8,
    });
    expect([200, 201, 409]).toContain(res.status);
  });

  it('POST /api/nba returns next best action', async () => {
    const res = await request('POST', '/api/nba', {
      customer: { id: 'c1', tier: 'gold' },
      goal: 'revenue',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ranked');
  });
});

describe('Decision Intelligence — multi-criteria decision', () => {
  it('POST /api/decision/wsm ranks alternatives', async () => {
    const res = await request('POST', '/api/decision/wsm', {
      alternatives: [
        { name: 'A', scores: { cost: 0.7, speed: 0.5, quality: 0.9 } },
        { name: 'B', scores: { cost: 0.5, speed: 0.9, quality: 0.6 } },
      ],
      weights: { cost: 0.4, speed: 0.3, quality: 0.3 },
    });
    expect(res.status).toBe(200);
    expect(res.body.method).toBe('wsm');
    expect(res.body).toHaveProperty('ranking');
    expect(res.body).toHaveProperty('winner');
    expect(res.body.ranking.length).toBe(2);
  });

  it('POST /api/decision/topsis ranks alternatives', async () => {
    const res = await request('POST', '/api/decision/topsis', {
      alternatives: [
        { name: 'A', scores: { cost: 0.7, speed: 0.5 } },
        { name: 'B', scores: { cost: 0.5, speed: 0.9 } },
      ],
      criteria: ['cost', 'speed'],
      weights: { cost: 0.5, speed: 0.5 },
      impacts: { cost: 'negative', speed: 'positive' },
    });
    expect(res.status).toBe(200);
    expect(res.body.method).toBe('topsis');
    expect(res.body).toHaveProperty('ranking');
  });
});

describe('Decision Intelligence — auth bypass behavior', () => {
  it('POST /api/recommend/event with no bearer token returns 201 (not 401)', async () => {
    const res = await request('POST', '/api/recommend/event', {
      userId: 'ub',
      itemId: 'ib',
      eventType: 'click',
    });
    expect(res.status).toBe(201);
  });

  it('POST /api/recommend/event with invalid eventType returns 400', async () => {
    const res = await request('POST', '/api/recommend/event', {
      userId: 'u',
      itemId: 'i',
      eventType: 'unknown',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/decision/wsm with empty alternatives returns 400', async () => {
    const res = await request('POST', '/api/decision/wsm', {
      alternatives: [],
      weights: { cost: 1 },
    });
    expect(res.status).toBe(400);
  });
});

describe('Decision Intelligence — 404 handling', () => {
  it('unknown route returns 404', async () => {
    const res = await request('GET', '/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});