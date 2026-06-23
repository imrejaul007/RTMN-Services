/**
 * rag-platform - vitest unit tests
 * Tests helpers directly + HTTP routes that don't need upstream vector-db/inference.
 */
'use strict';

process.env.RAG_PLATFORM_NO_LISTEN = '1';
process.env.RAG_PLATFORM_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
const { app, chunkText, splitSentences, buildContext, buildUserPrompt } = require('../../src/index');

describe('Helper functions', () => {
  test('splitSentences splits on . ! ?', () => {
    const out = splitSentences('Hello world. How are you? Fine!');
    expect(out.length).toBeGreaterThanOrEqual(3);
  });
  test('chunkText splits long text into chunks', () => {
    const text = 'The quick brown fox. '.repeat(50); // ~1000 chars with sentence breaks
    const chunks = chunkText(text, 100, 10);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(100);
  });
  test('buildContext assembles source citations', () => {
    const matches = [
      { document: 'hello world from doc-1' }
    ];
    const ctx = buildContext(matches);
    expect(ctx).toMatch(/Source 1/);
    expect(ctx).toMatch(/doc-1/);
  });
  test('buildUserPrompt embeds query + context', () => {
    const prompt = buildUserPrompt('What is X?', 'Context: X is foo.');
    expect(prompt).toMatch(/What is X/);
    expect(prompt).toMatch(/Context: X is foo/);
  });
});

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
    expect(res.body.service).toBe('rag-platform');
  });
});

describe('Config', () => {
  test('GET /api/config returns config', async () => {
    const res = await req('GET', '/api/config');
    expect(res.status).toBe(200);
    expect(res.body.defaultChunkSize).toBeDefined();
  });
  test('POST /api/config updates config', async () => {
    const res = await req('POST', '/api/config', { defaultChunkSize: 500 });
    expect(res.status).toBe(200);
    expect(res.body.config.defaultChunkSize).toBe(500);
  });
});

describe('Documents validation', () => {
  test('rejects missing collection (400)', async () => {
    const res = await req('POST', '/api/documents', { content: 'hello' });
    expect(res.status).toBe(400);
  });
  test('rejects missing content (400)', async () => {
    const res = await req('POST', '/api/documents', { collection: 'c1' });
    expect(res.status).toBe(400);
  });
  test('GET /api/documents lists (may be empty)', async () => {
    const res = await req('GET', '/api/documents');
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
  });
});

describe('Retrieve validation', () => {
  test('rejects missing collection (400)', async () => {
    const res = await req('POST', '/api/retrieve', { query: 'foo' });
    expect(res.status).toBe(400);
  });
  test('rejects missing query (400)', async () => {
    const res = await req('POST', '/api/retrieve', { collection: 'c1' });
    expect(res.status).toBe(400);
  });
});

describe('RAG query validation', () => {
  test('rejects missing collection (400)', async () => {
    const res = await req('POST', '/api/rag/query', { query: 'foo' });
    expect(res.status).toBe(400);
  });
  test('rejects missing query (400)', async () => {
    const res = await req('POST', '/api/rag/query', { collection: 'c1' });
    expect(res.status).toBe(400);
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