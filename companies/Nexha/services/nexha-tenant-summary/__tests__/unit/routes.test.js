/**
 * HTTP route tests for nexha-tenant-summary (ADR-0011 Phase 13, 2026-06-23).
 *
 * Stubs `globalThis.fetch` to simulate upstream services and exercises
 * the Express routes via supertest. No real Hub required.
 *
 * Usage: npm test
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const TENANT = 't_route';

function token(role = 'tenant:read', tenantId = TENANT) {
  return jwt.sign({ sub: 'u1', role, tenantId }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '5m' });
}

const originalFetch = globalThis.fetch;
function installFetchMock(responder) {
  globalThis.fetch = async (url, init) => {
    const data = await responder(url, init);
    // Default: wrap into a fetch Response shape if responder returned a plain object.
    if (data && typeof data === 'object' && 'ok' in data) return data;
    return {
      ok: true,
      status: 200,
      json: async () => data,
    };
  };
}
function restoreFetch() { globalThis.fetch = originalFetch; }

beforeEach(() => {
  vi.useRealTimers();
});
afterEach(() => {
  restoreFetch();
});

// ─────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────���──────

describe('auth', () => {
  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`/api/tenants/${TENANT}/summary`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('accepts a valid JWT', async () => {
    installFetchMock(async () => ({ total: 0 }));
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('accepts the internal token', async () => {
    process.env.INTERNAL_TOKEN = 'tok-abc';
    // re-require to pick up the env; but the middleware reads env on each request
    installFetchMock(async () => ({ total: 0 }));
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('x-internal-token', 'tok-abc');
    expect(res.status).toBe(200);
    delete process.env.INTERNAL_TOKEN;
  });

  it('rejects a bad JWT', async () => {
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ─────────────────────────────────────────────────────────────────
// /sources
// ────────────────────────────────────────────────────────────────

describe('GET /api/sources', () => {
  it('returns the list of configured fan-out targets', async () => {
    const res = await request(app)
      .get('/api/sources')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.sources)).toBe(true);
    expect(res.body.total).toBe(res.body.sources.length);
    for (const s of res.body.sources) {
      expect(s.key).toBeTypeOf('string');
      expect(s.service).toBeTypeOf('string');
      expect(s.path).toContain(':tenantId');
    }
  });
});

// ─────────────────────────────────────────────────────────────────
// /tenants/:tenantId/summary
// ────────────────────────────────────────────────────────────────

describe('GET /api/tenants/:tenantId/summary', () => {
  it('merges results from all upstream services', async () => {
    installFetchMock(async (url) => {
      if (url.includes('nexha-business-directory')) {
        return { companies: [{ companyId: 'co_1', name: 'A', industry: 'x', trustScore: 50 }], total: 1 };
      }
      if (url.includes('nexha-mission-planner')) {
        return { missions: [{ missionId: 'm_1', name: 'M', status: 'open', progress: 0 }], total: 1 };
      }
      return { total: 0 };
    });
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.tenantId).toBe(TENANT);
    expect(res.body.summary.health).toBe('healthy');
    expect(res.body.sections.directory.data.companies).toHaveLength(1);
    expect(res.body.sections.missions.data.missions).toHaveLength(1);
  });

  it('marks health=partial when one upstream is down', async () => {
    installFetchMock(async (url) => {
      if (url.includes('nexha-business-directory')) throw new Error('ECONNREFUSED');
      return { total: 0 };
    });
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.health).toBe('partial');
    expect(res.body.errors.directory.message).toBe('ECONNREFUSED');
  });

  it('marks health=degraded when all upstreams are down', async () => {
    installFetchMock(async () => { throw new Error('down'); });
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.health).toBe('degraded');
    expect(res.body.summary.okCount).toBe(0);
  });

  it('forwards Authorization and x-internal-token to upstream calls', async () => {
    let seenAuth = null;
    let seenInternal = null;
    installFetchMock(async (url, init) => {
      seenAuth = init.headers.authorization;
      seenInternal = init.headers['x-internal-token'];
      return { total: 0 };
    });
    await request(app)
      .get(`/api/tenants/${TENANT}/summary`)
      .set('Authorization', `Bearer ${token()}`)
      .set('x-internal-token', 'tok-xyz');
    expect(seenAuth).toBe(`Bearer ${token()}`);
    expect(seenInternal).toBe('tok-xyz');
  });
});

// ─────────────────────────────────────────────────────────────────
// /tenants/:tenantId/summary/:section
// ────────────────────────────────────────────────────────────────

describe('GET /api/tenants/:tenantId/summary/:section', () => {
  it('returns the requested section only', async () => {
    installFetchMock(async (url) => {
      if (url.includes('nexha-mission-planner')) {
        return { missions: [{ missionId: 'm_x', name: 'X', status: 'open', progress: 0 }], total: 1 };
      }
      return { total: 0 };
    });
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary/missions`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.section).toBe('missions');
    expect(res.body.data.total).toBe(1);
  });

  it('returns 404 for unknown section', async () => {
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary/nonexistent`)
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('UNKNOWN_SECTION');
  });

  it('returns 502/504 on upstream error', async () => {
    installFetchMock(async () => { throw new Error('upstream boom'); });
    const res = await request(app)
      .get(`/api/tenants/${TENANT}/summary/missions`)
      .set('Authorization', `Bearer ${token()}`);
    expect([502, 504]).toContain(res.status);
    expect(res.body.error.code).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// /health/upstreams
// ────────────────────────────────────────────────────────────────

describe('GET /api/health/upstreams', () => {
  it('reports each upstream as ok=true on success', async () => {
    installFetchMock(async () => ({}));
    const res = await request(app)
      .get('/api/health/upstreams')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.summary.up).toBeGreaterThan(0);
    expect(res.body.summary.down).toBe(0);
  });

  it('reports downstream services as ok=false on failure', async () => {
    installFetchMock(async (url) => {
      if (url.includes('nexha-business-directory')) throw new Error('boom');
      return {};
    });
    const res = await request(app)
      .get('/api/health/upstreams')
      .set('Authorization', `Bearer ${token()}`);
    expect(res.status).toBe(200);
    expect(res.body.upstreams.directory.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// Root + health
// ────────────────────────────────────────────────────────────────

describe('meta', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('nexha-tenant-summary');
  });

  it('GET /ready', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('GET / returns the service description', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('nexha-tenant-summary');
    expect(res.body.endpoints.summary).toBeDefined();
  });

  it('unknown route → 404 (under root, no auth needed)', async () => {
    const res = await request(app).get('/totally-unknown');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('unknown route under /api → 401 (auth runs first)', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(401);
  });
});