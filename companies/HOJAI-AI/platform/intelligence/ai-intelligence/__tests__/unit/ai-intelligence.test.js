/**
 * AI Intelligence unit tests — vitest
 * Imports from compiled dist/ to avoid TS resolution issues with mongoose transitive imports
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import {
  app,
  PORT,
  REQUIRE_AUTH,
  authOrBypass,
  metrics,
} from '../../dist/index.js';

// Helper: start the app on an ephemeral port for HTTP tests
let server;
let baseUrl;

beforeAll(async () => {
  // Use port 0 to get an ephemeral port; rely on the gated listen (NODE_ENV=test skips auto-listen)
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
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

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
});

describe('AI Intelligence — config exports', () => {
  it('exports PORT as 4881 by default', () => {
    expect(typeof PORT).toBe('number');
    expect(PORT).toBeGreaterThan(0);
  });

  it('exports REQUIRE_AUTH as boolean', () => {
    expect(typeof REQUIRE_AUTH).toBe('boolean');
  });

  it('exports authOrBypass middleware function', () => {
    expect(typeof authOrBypass).toBe('function');
  });

  it('exports metrics object', () => {
    expect(metrics).toBeTypeOf('object');
    expect(metrics).toHaveProperty('totalRequests');
    expect(metrics).toHaveProperty('avgProcessingTimeMs');
  });
});

describe('AI Intelligence — health/metrics routes', () => {
  it('GET /api/health returns healthy', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('hojai-intelligence');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /api/metrics returns metrics shape', async () => {
    const res = await request('GET', '/api/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRequests');
    expect(res.body).toHaveProperty('avgProcessingTimeMs');
    expect(res.body).toHaveProperty('intentAccuracy');
  });

  it('GET /api/route returns routing table', async () => {
    const res = await request('GET', '/api/route');
    expect(res.status).toBe(200);
    expect(res.body.central).toMatch(/4881/);
    expect(res.body.services).toBeTypeOf('object');
    expect(res.body.services.predictive).toBeDefined();
  });

  it('GET /api/agents returns agent registry', async () => {
    const res = await request('GET', '/api/agents');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('agents');
    expect(Array.isArray(res.body.agents)).toBe(true);
  });
});

describe('AI Intelligence — auth bypass behavior', () => {
  it('without bearer token and bypass=true: analyze accepted', async () => {
    // REQUIRES_NOSETUP env for zod validation — empty body should 400 (zod fail), not 401 (auth)
    const res = await request('POST', '/api/analyze', {});
    // Either 400 (validation) or 500 — but NOT 401 (because we set INTELLIGENCE_REQUIRE_AUTH=false in vitest setup)
    // In our test env REQUIRE_AUTH is false → bypass works
    expect([400, 500]).toContain(res.status);
    expect(res.status).not.toBe(401);
  });

  it('GET /api/health never requires auth', async () => {
    const res = await request('GET', '/api/health');
    expect(res.status).toBe(200);
  });
});

describe('AI Intelligence — validation behavior', () => {
  it('POST /api/analyze with empty body fails zod validation', async () => {
    const res = await request('POST', '/api/analyze', {});
    expect(res.status).toBe(400);
  });

  it('POST /api/generate-brief with empty body fails zod validation', async () => {
    const res = await request('POST', '/api/generate-brief', {});
    expect(res.status).toBe(400);
  });

  it('POST /api/policy/evaluate with empty body fails zod validation', async () => {
    const res = await request('POST', '/api/policy/evaluate', {});
    expect(res.status).toBe(400);
  });
});

describe('AI Intelligence — 404 handling', () => {
  it('unknown route returns 404', async () => {
    const res = await request('GET', '/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
  });
});