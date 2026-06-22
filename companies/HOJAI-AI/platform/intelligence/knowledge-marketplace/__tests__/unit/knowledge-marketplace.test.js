/**
 * Knowledge Marketplace unit tests — vitest
 * Tests the 18 public routes + named exports + bypass behavior.
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

describe('Knowledge Marketplace — config exports', () => {
  it('app is the Express app', () => {
    expect(typeof app).toBe('function');
    expect(app.name).toBe('app');
  });

  it('exports authOrBypass middleware', () => {
    expect(typeof app.authOrBypass).toBe('function');
  });

  it('exports PORT as 4939 by default', () => {
    expect(app.PORT).toBe(4939);
  });
});

describe('Knowledge Marketplace — health/info routes', () => {
  it('GET /health returns healthy', async () => {
    const res = await request('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('GET /api/categories returns categories', async () => {
    const res = await request('GET', '/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('categories');
  });

  it('GET /api/industries returns industries', async () => {
    const res = await request('GET', '/api/industries');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('industries');
  });

  it('GET /api/stats returns stats', async () => {
    const res = await request('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('stats');
    expect(res.body.stats).toHaveProperty('totalPacks');
  });

  it('GET /api/knowledge/featured/list returns featured packs', async () => {
    const res = await request('GET', '/api/knowledge/featured/list');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('knowledgePacks');
  });

  it('GET /api/creator/packs returns creator packs', async () => {
    const res = await request('GET', '/api/creator/packs?creatorId=any');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('packs');
  });
});

describe('Knowledge Marketplace — knowledge CRUD', () => {
  it('GET /api/knowledge lists knowledge packs', async () => {
    const res = await request('GET', '/api/knowledge');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('knowledgePacks');
  });

  it('GET /api/knowledge/:id returns a specific pack', async () => {
    // First get the list to find a real id
    const list = await request('GET', '/api/knowledge');
    const firstId = list.body.knowledgePacks[0]?.id;
    if (!firstId) {
      // skip if no seeded packs
      expect(firstId).toBeTruthy();
      return;
    }
    const res = await request('GET', `/api/knowledge/${firstId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pack');
  });

  it('GET /api/search returns search results', async () => {
    const res = await request('GET', '/api/search?q=test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
  });
});

describe('Knowledge Marketplace — auth bypass behavior', () => {
  it('POST /api/knowledge with no bearer returns 201 (not 401)', async () => {
    const res = await request('POST', '/api/knowledge', {
      name: 'Test Pack',
      category: 'sop',
      creator: { id: 'c1', name: 'Test Creator' },
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('pack');
  });

  it('POST /api/knowledge with missing fields returns 400', async () => {
    const res = await request('POST', '/api/knowledge', { name: 'Only Name' });
    expect(res.status).toBe(400);
  });

  it('POST /api/knowledge/:id/purchase creates purchase', async () => {
    const list = await request('GET', '/api/knowledge');
    const firstId = list.body.knowledgePacks[0]?.id;
    if (!firstId) {
      expect(firstId).toBeTruthy();
      return;
    }
    const res = await request('POST', `/api/knowledge/${firstId}/purchase`, {
      userId: 'b1',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('POST /api/knowledge/:id/reviews adds review', async () => {
    const list = await request('GET', '/api/knowledge');
    const firstId = list.body.knowledgePacks[0]?.id;
    if (!firstId) {
      expect(firstId).toBeTruthy();
      return;
    }
    const res = await request('POST', `/api/knowledge/${firstId}/reviews`, {
      rating: 5,
      comment: 'Great!',
      reviewer: 'r1',
    });
    expect([200, 201]).toContain(res.status);
  });

  it('PATCH /api/knowledge/:id updates pack', async () => {
    const list = await request('GET', '/api/knowledge');
    const firstId = list.body.knowledgePacks[0]?.id;
    if (!firstId) {
      expect(firstId).toBeTruthy();
      return;
    }
    const res = await request('PATCH', `/api/knowledge/${firstId}`, {
      price: 99,
    });
    expect(res.status).toBe(200);
  });
});

describe('Knowledge Marketplace — purchases + downloads', () => {
  it('GET /api/purchases returns purchases', async () => {
    const res = await request('GET', '/api/purchases?userId=b1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('purchases');
  });

  it('GET /api/knowledge/:id/download returns download URL', async () => {
    const list = await request('GET', '/api/knowledge');
    const firstId = list.body.knowledgePacks[0]?.id;
    if (!firstId) {
      expect(firstId).toBeTruthy();
      return;
    }
    const res = await request('GET', `/api/knowledge/${firstId}/download`);
    expect(res.status).toBe(200);
  });
});

describe('Knowledge Marketplace — 404 handling', () => {
  it('unknown route returns 404', async () => {
    const res = await request('GET', '/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});