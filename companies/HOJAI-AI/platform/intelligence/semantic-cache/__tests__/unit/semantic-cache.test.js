/**
 * semantic-cache - vitest unit tests
 */
'use strict';

process.env.SEMANTIC_CACHE_NO_LISTEN = '1';
process.env.SEMANTIC_CACHE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app } = require('../../src/index');

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('semantic-cache');
  });
});

describe('Embeddings', () => {
  test('POST /api/embed computes embedding', async () => {
    const res = await req('POST', '/api/embed', { text: 'hello world' });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.embedding)).toBe(true);
    expect(res.body.dimension).toBe(128);
  });
  test('rejects missing text (400)', async () => {
    const res = await req('POST', '/api/embed', {});
    expect(res.status).toBe(400);
  });
  test('POST /api/embed/batch handles multiple', async () => {
    const res = await req('POST', '/api/embed/batch', { texts: ['hello', 'world'] });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
  test('POST /api/similarity computes similarity', async () => {
    const res = await req('POST', '/api/similarity', { a: 'hello world', b: 'hello there' });
    expect(res.status).toBe(200);
    expect(typeof res.body.similarity).toBe('number');
  });
});

describe('Cache CRUD', () => {
  test('POST /api/cache adds entry', async () => {
    const res = await req('POST', '/api/cache', {
      prompt: 'What is the weather in NYC? #' + Date.now(), response: 'Sunny, 72F', model: 'gpt-4'
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.entry.id).toBeDefined();
  });
  test('rejects missing prompt (400)', async () => {
    const res = await req('POST', '/api/cache', { response: 'ok', model: 'gpt-4' });
    expect(res.status).toBe(400);
  });
  test('GET /api/cache lists entries', async () => {
    const res = await req('GET', '/api/cache');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
  test('GET /api/cache/:id returns entry', async () => {
    const list = await req('GET', '/api/cache');
    const id = list.body.entries[0].id;
    const res = await req('GET', `/api/cache/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.entry.id).toBe(id);
  });
  test('POST /api/cache/clear clears all', async () => {
    const res = await req('POST', '/api/cache/clear', {});
    expect([200, 201]).toContain(res.status);
  });
});

describe('Lookup', () => {
  beforeAll(async () => {
    await req('POST', '/api/cache', {
      prompt: 'weather NYC today', response: 'sunny', model: 'gpt-4'
    });
  });
  test('POST /api/lookup finds similar', async () => {
    const res = await req('POST', '/api/lookup', {
      prompt: 'weather in New York', model: 'gpt-4'
    });
    expect(res.status).toBe(200);
  });
  test('POST /api/lookup/batch handles multiple', async () => {
    const res = await req('POST', '/api/lookup/batch', {
      prompts: ['weather in NYC', 'random unrelated xyz']
    });
    expect(res.status).toBe(200);
  });
});

describe('Stats + audit', () => {
  test('GET /api/stats returns stats', async () => {
    const res = await req('GET', '/api/stats');
    expect(res.status).toBe(200);
  });
  test('GET /api/audit returns log', async () => {
    const res = await req('GET', '/api/audit');
    expect(res.status).toBe(200);
  });
});