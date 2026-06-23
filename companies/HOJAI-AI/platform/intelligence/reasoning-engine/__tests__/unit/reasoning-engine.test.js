/**
 * reasoning-engine - vitest unit tests
 */
'use strict';

process.env.REASONING_ENGINE_NO_LISTEN = '1';
process.env.REASONING_ENGINE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, decompose, STRATEGIES } = require('../../src/index');

let server;
let baseUrl;

beforeAll(async () => {
  server = http.createServer(app);
  await new Promise(resolve => server.listen(0, () => resolve()));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

function req(method, p, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + p);
    const opts = { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers: { 'Content-Type': 'application/json' } };
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => (data += c));
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

describe('Exports', () => {
  test('exports authOrBypass + flags', () => {
    expect(typeof app.authOrBypass).toBe('function');
    expect(app.SERVICE_NAME).toBe('reasoning-engine');
    expect(app.REASONING_ENGINE_NO_LISTEN).toBe(true);
  });
  test('exports STRATEGIES with 3 strategies', () => {
    expect(Object.keys(STRATEGIES).length).toBe(3);
    expect(STRATEGIES.deductive).toBeDefined();
    expect(STRATEGIES.inductive).toBeDefined();
    expect(STRATEGIES.abductive).toBeDefined();
  });
});

describe('Helper', () => {
  test('decompose splits on punctuation', () => {
    const steps = decompose('Apples are red. Bananas are yellow. So fruits have colors.', 'deductive');
    expect(steps.length).toBeGreaterThanOrEqual(2);
    steps.forEach(s => expect(s.confidence).toBeGreaterThan(0));
  });
  test('decompose handles single sentence', () => {
    const steps = decompose('just one statement', 'inductive');
    expect(steps.length).toBe(1);
  });
});

describe('Health', () => {
  test('GET /health', async () => {
    const r = await req('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('healthy');
  });
  test('GET /api/health', async () => {
    const r = await req('GET', '/api/health');
    expect(r.status).toBe(200);
    expect(r.body.service).toBe('reasoning-engine');
  });
  test('GET /ready', async () => {
    const r = await req('GET', '/ready');
    expect(r.status).toBe(200);
  });
});

describe('Reason validation', () => {
  test('rejects missing query (400)', async () => {
    const r = await req('POST', '/api/reason', { strategy: 'deductive' });
    expect(r.status).toBe(400);
  });
  test('rejects unknown strategy (400)', async () => {
    const r = await req('POST', '/api/reason', { query: 'test', strategy: 'galactic' });
    expect(r.status).toBe(400);
  });
});

describe('Reason happy path', () => {
  test('POST /api/reason creates run', async () => {
    const r = await req('POST', '/api/reason', { query: 'All men are mortal. Socrates is a man. Therefore?', strategy: 'deductive' });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
    expect(r.body.steps.length).toBeGreaterThan(0);
    expect(r.body.confidence).toBeGreaterThan(0);
  });
  test('GET /api/reason lists', async () => {
    const r = await req('GET', '/api/reason');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.runs)).toBe(true);
  });
  test('GET /api/reason/:id 404 for missing', async () => {
    const r = await req('GET', '/api/reason/missing-id');
    expect(r.status).toBe(404);
  });
  test('GET /api/reason/templates', async () => {
    const r = await req('GET', '/api/reason/templates');
    expect(r.status).toBe(200);
    expect(r.body.strategies.length).toBe(3);
  });
  test('GET /api/reason/audit', async () => {
    const r = await req('GET', '/api/reason/audit');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.entries)).toBe(true);
  });
  test('DELETE /api/reason/:id 404 for missing', async () => {
    const r = await req('DELETE', '/api/reason/missing-id');
    expect(r.status).toBe(404);
  });
});