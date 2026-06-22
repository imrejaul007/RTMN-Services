// ============================================================================
// SUTAR Economy OS - Tenant Middleware Integration Tests (ADR-0009 Phase 1)
// ============================================================================
//
// Verifies the route-level behavior of createTenantContext + the per-tenant
// tkey() prefix strategy. Uses Node's built-in fetch (Node 18+) against a
// real in-process server.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

async function startServer(envOverrides: Record<string, string> = {}): Promise<{ url: string; close: () => Promise<void> }> {
  // Reset env so previous tests don't leak
  delete process.env.REQUIRE_AUTH;
  delete process.env.REQUIRE_TENANT;
  delete process.env.ALLOW_HEADER_TENANT;
  Object.assign(process.env, envOverrides);

  process.env.PORT = '0';

  // Dynamic ESM import so env changes apply before module init
  const mod = await import('../../src/index.js');
  const app = mod.default;

  const { createServer } = await import('http');
  return new Promise((resolve) => {
    const server: Server = createServer(app);
    server.listen(0, () => {
      const addr = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise<void>((r) => server.close(() => r())),
      });
    });
  });
}

describe('Economy OS — Tenant Middleware HTTP', () => {
  let server: { url: string; close: () => Promise<void> };

  describe('default permissive mode (REQUIRE_TENANT unset)', () => {
    beforeEach(async () => {
      server = await startServer({});
    });
    afterEach(async () => {
      await server.close();
    });

    it('GET /health is public', async () => {
      const r = await fetch(`${server.url}/health`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.status).toBe('healthy');
    });

    it('GET /unknown-path returns 404', async () => {
      const r = await fetch(`${server.url}/unknown-path`);
      expect(r.status).toBe(404);
    });

    it('GET /api/v1/info is public (no tenant required)', async () => {
      const r = await fetch(`${server.url}/api/v1/info`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('sutar-economy-os');
    });

    it('GET /api/v1/admin/tenants returns tenant config', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenants`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.data.service).toBe('sutar-economy-os');
      expect(body.data.strategy).toBe('in-memory-key-prefix');
    });

    it('GET /api/v1/admin/tenant/whoami returns default tenant when none set', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.companyId).toBe('default');
    });
  });

  describe('header-based tenant mode (ALLOW_HEADER_TENANT=true)', () => {
    beforeEach(async () => {
      server = await startServer({ ALLOW_HEADER_TENANT: 'true' });
    });
    afterEach(async () => {
      await server.close();
    });

    it('X-Company-Id header resolves tenant', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`, {
        headers: { 'X-Company-Id': 'acme-corp' },
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.companyId).toBe('acme-corp');
      expect(body.data.tenant.source).toBe('header');
    });

    it('different tenants get different companyIds', async () => {
      const r1 = await fetch(`${server.url}/api/v1/admin/tenant/whoami`, {
        headers: { 'X-Company-Id': 'tenant-a' },
      });
      const r2 = await fetch(`${server.url}/api/v1/admin/tenant/whoami`, {
        headers: { 'X-Company-Id': 'tenant-b' },
      });
      const b1 = await r1.json();
      const b2 = await r2.json();
      expect(b1.data.companyId).toBe('tenant-a');
      expect(b2.data.companyId).toBe('tenant-b');
    });
  });

  describe('strict tenant mode (REQUIRE_TENANT=true)', () => {
    beforeEach(async () => {
      server = await startServer({ REQUIRE_TENANT: 'true', ALLOW_HEADER_TENANT: 'true' });
    });
    afterEach(async () => {
      await server.close();
    });

    it('public paths still work without a tenant', async () => {
      const r1 = await fetch(`${server.url}/health`);
      expect(r1.status).toBe(200);
      const r2 = await fetch(`${server.url}/api/v1/info`);
      expect(r2.status).toBe(200);
    });

    it('protected paths return 400 without a tenant', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`);
      expect(r.status).toBe(400);
      const body = await r.json();
      expect(body.error).toBe('TENANT_REQUIRED');
    });

    it('protected paths accept X-Company-Id header in strict mode', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`, {
        headers: { 'X-Company-Id': 'strict-tenant' },
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.companyId).toBe('strict-tenant');
    });

    it('POST /api/v1/karma/earn returns 400 without tenant (strict)', async () => {
      const r = await fetch(`${server.url}/api/v1/karma/earn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityId: 'u-1',
          entityType: 'user',
          action: 'helpful_response',
        }),
      });
      expect(r.status).toBe(400);
    });

    it('POST /api/v1/karma/earn accepts header tenant (strict)', async () => {
      const r = await fetch(`${server.url}/api/v1/karma/earn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Company-Id': 'acme',
        },
        body: JSON.stringify({
          entityId: 'u-1',
          entityType: 'user',
          action: 'helpful_response',
        }),
      });
      // Should pass tenant middleware (and auth middleware if it's strict)
      // The actual earn may succeed (200) or fail with auth (401) but NOT 400
      expect(r.status).not.toBe(400);
    });
  });
});