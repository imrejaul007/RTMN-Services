/**
 * Vector DB unit tests — vitest
 * Tests the 20 public routes + named exports + bypass behavior.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from '../../src/index.js';

let server;
let baseUrl;
const TEST_COLLECTION = 'test-vitest-coll';
const TEST_DIM = 4;

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

describe('Vector DB — config exports', () => {
  it('app is the Express app', () => {
    expect(typeof app).toBe('function');
    expect(app.name).toBe('app');
  });

  it('exports authOrBypass middleware', () => {
    expect(typeof app.authOrBypass).toBe('function');
  });

  it('exports PORT as 4780 by default', () => {
    expect(app.PORT).toBe(4780);
  });

  it('exports SERVICE_NAME', () => {
    expect(app.SERVICE_NAME).toBe('vector-db');
  });
});

describe('Vector DB — health/info routes', () => {
  it('GET /api/health returns healthy', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('vector-db');
  });

  it('GET /api/stats returns stats', async () => {
    const res = await request('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collections');
    expect(res.body).toHaveProperty('vectors');
  });

  it('GET /api/audit returns audit log', async () => {
    const res = await request('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });
});

describe('Vector DB — collection CRUD', () => {
  it('POST /api/collections creates a collection', async () => {
    const res = await request('POST', '/api/collections', {
      name: TEST_COLLECTION,
      dimension: TEST_DIM,
      metric: 'cosine',
    });
    expect([200, 201, 409]).toContain(res.status);
  });

  it('GET /api/collections lists collections', async () => {
    const res = await request('GET', '/api/collections');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collections');
  });

  it('GET /api/collections/:name returns a collection', async () => {
    const res = await request('GET', `/api/collections/${TEST_COLLECTION}`);
    expect(res.status).toBe(200);
  });

  it('PATCH /api/collections/:name updates metadata', async () => {
    const res = await request('PATCH', `/api/collections/${TEST_COLLECTION}`, {
      metadata: { team: 'qa' },
    });
    expect(res.status).toBe(200);
  });
});

describe('Vector DB — vector CRUD + search', () => {
  it('POST /api/embed returns an embedding', async () => {
    const res = await request('POST', '/api/embed', {
      text: 'hello world',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('vector');
    expect(Array.isArray(res.body.vector)).toBe(true);
  });

  it('POST /api/collections/:name/vectors inserts a vector', async () => {
    const res = await request('POST', `/api/collections/${TEST_COLLECTION}/vectors`, {
      values: [0.1, 0.2, 0.3, 0.4],
      metadata: { tag: 'a' },
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
  });

  it('POST /api/collections/:name/vectors/batch inserts batch', async () => {
    const res = await request('POST', `/api/collections/${TEST_COLLECTION}/vectors/batch`, {
      vectors: [
        { values: [0.5, 0.5, 0.5, 0.5], metadata: { tag: 'b' } },
        { values: [0.9, 0.1, 0.1, 0.1], metadata: { tag: 'c' } },
      ],
    });
    expect([200, 201]).toContain(res.status);
  });

  it('GET /api/collections/:name/vectors lists vectors', async () => {
    const res = await request('GET', `/api/collections/${TEST_COLLECTION}/vectors`);
    expect(res.status).toBe(200);
  });

  it('POST /api/collections/:name/search returns matches', async () => {
    const res = await request('POST', `/api/collections/${TEST_COLLECTION}/search`, {
      query: [0.1, 0.2, 0.3, 0.4],
      topK: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matches');
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  it('POST /api/query searches across a single collection', async () => {
    const res = await request('POST', '/api/query', {
      collection: TEST_COLLECTION,
      query: [0.1, 0.2, 0.3, 0.4],
      topK: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matches');
  });
});

describe('Vector DB — auth bypass behavior', () => {
  it('POST /api/collections with no bearer returns 2xx (not 401)', async () => {
    const res = await request('POST', '/api/collections', {
      name: 'bypass-test-coll',
      dimension: 2,
    });
    expect([200, 201, 409]).toContain(res.status);
  });

  it('POST /api/collections with empty body returns 400', async () => {
    const res = await request('POST', '/api/collections', {});
    expect(res.status).toBe(400);
  });

  it('POST /api/embed with empty body returns 400', async () => {
    const res = await request('POST', '/api/embed', {});
    expect(res.status).toBe(400);
  });
});

describe('Vector DB — 404 handling', () => {
  it('unknown route returns 404', async () => {
    const res = await request('GET', '/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});