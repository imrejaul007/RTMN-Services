/**
 * Knowledge Extraction unit tests — vitest
 * Tests the 17 public routes + named exports + bypass behavior.
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

describe('Knowledge Extraction — config exports', () => {
  it('app is the Express app', () => {
    expect(typeof app).toBe('function');
    expect(app.name).toBe('app');
  });

  it('exports authOrBypass middleware', () => {
    expect(typeof app.authOrBypass).toBe('function');
  });

  it('exports PORT as 4784 by default', () => {
    expect(app.PORT).toBe(4784);
  });

  it('exports SERVICE_NAME', () => {
    expect(app.SERVICE_NAME).toBe('knowledge-extraction');
  });

  it('exports stats object', () => {
    expect(app.stats).toBeTypeOf('object');
    expect(app.stats).toHaveProperty('extractionsRun');
    expect(app.stats).toHaveProperty('entitiesFound');
    expect(app.stats).toHaveProperty('factsExtracted');
  });
});

describe('Knowledge Extraction — health/info routes', () => {
  it('GET /api/health returns healthy', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('knowledge-extraction');
  });

  it('GET /api/stats returns stats shape', async () => {
    const res = await request('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('extractionsRun');
    expect(res.body).toHaveProperty('entitiesFound');
    expect(res.body).toHaveProperty('byType');
  });

  it('GET /api/ner/types returns entity types', async () => {
    const res = await request('GET', '/api/ner/types');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('types');
    expect(res.body.types).toBeTypeOf('object');
  });

  it('GET /api/kb/stats returns KB stats', async () => {
    const res = await request('GET', '/api/kb/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
  });

  it('GET /api/catalog/tech returns tech catalog', async () => {
    const res = await request('GET', '/api/catalog/tech');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('terms');
    expect(Array.isArray(res.body.terms)).toBe(true);
  });
});

describe('Knowledge Extraction — auth bypass behavior', () => {
  it('without bearer token and bypass=true: NER extract returns 200 (not 401)', async () => {
    const res = await request('POST', '/api/ner/extract', { text: 'Steve Jobs founded Apple.' });
    expect(res.status).toBe(200);
  });

  it('POST /api/ner/extract with empty body returns 400', async () => {
    const res = await request('POST', '/api/ner/extract', {});
    expect(res.status).toBe(400);
  });

  it('POST /api/extract-all with empty body returns 400', async () => {
    const res = await request('POST', '/api/extract-all', {});
    expect(res.status).toBe(400);
  });
});

describe('Knowledge Extraction — extract happy path', () => {
  it('POST /api/ner/extract finds entities', async () => {
    const res = await request('POST', '/api/ner/extract', {
      text: 'Albert Einstein worked at Princeton University in the United States.',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entities');
    expect(Array.isArray(res.body.entities)).toBe(true);
  });

  it('POST /api/facts/extract extracts triples', async () => {
    const res = await request('POST', '/api/facts/extract', {
      text: 'Einstein developed the theory of relativity.',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('facts');
  });

  it('POST /api/extract-all runs all extractors', async () => {
    const res = await request('POST', '/api/extract-all', {
      text: 'Steve Jobs co-founded Apple Computer in California in 1976.',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entities');
    expect(res.body).toHaveProperty('linked');
    expect(res.body).toHaveProperty('facts');
  });
});

describe('Knowledge Extraction — KB CRUD', () => {
  it('POST /api/kb/entities creates an entity', async () => {
    const res = await request('POST', '/api/kb/entities', {
      canonical: 'TestEntity',
      type: 'ORG',
      aliases: ['TE'],
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('entity');
    expect(res.body.entity.canonical).toBe('TestEntity');
  });

  it('GET /api/kb/entities lists entities', async () => {
    const res = await request('GET', '/api/kb/entities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('entities');
    expect(Array.isArray(res.body.entities)).toBe(true);
  });
});

describe('Knowledge Extraction — 404 handling', () => {
  it('unknown route returns 404', async () => {
    const res = await request('GET', '/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});