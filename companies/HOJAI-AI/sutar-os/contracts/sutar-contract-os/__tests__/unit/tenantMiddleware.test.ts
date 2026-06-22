// ============================================================================
// SUTAR Contract OS - Tenant Middleware HTTP Tests (ADR-0009 Phase 1)
// ============================================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

async function startServer(envOverrides: Record<string, string> = {}): Promise<{ url: string; close: () => Promise<void> }> {
  delete process.env.REQUIRE_AUTH;
  delete process.env.REQUIRE_TENANT;
  delete process.env.ALLOW_HEADER_TENANT;
  Object.assign(process.env, envOverrides);

  process.env.PORT = '0';

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

describe('Contract OS — Tenant Middleware HTTP', () => {
  let server: { url: string; close: () => Promise<void> };

  describe('strict mode (REQUIRE_TENANT=true)', () => {
    beforeEach(async () => {
      server = await startServer({ REQUIRE_TENANT: 'true', ALLOW_HEADER_TENANT: 'true' });
    });
    afterEach(async () => {
      await server.close();
    });

    it('public health endpoints work without a tenant', async () => {
      const r1 = await fetch(`${server.url}/health`);
      expect(r1.status).toBe(200);
      const r2 = await fetch(`${server.url}/health/ready`);
      expect(r2.status).toBe(200);
      const r3 = await fetch(`${server.url}/health/live`);
      expect(r3.status).toBe(200);
    });

    it('protected admin endpoint returns 400 without tenant', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`);
      expect(r.status).toBe(400);
      const body = await r.json();
      expect(body.error).toBe('TENANT_REQUIRED');
    });

    it('protected admin endpoint accepts X-Company-Id header', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`, {
        headers: { 'X-Company-Id': 'acme' },
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.tenant.companyId).toBe('acme');
    });

    it('GET /api/v1/contracts returns 400 without tenant', async () => {
      const r = await fetch(`${server.url}/api/v1/contracts`);
      expect(r.status).toBe(400);
    });

    it('GET /api/v1/contracts works with tenant header', async () => {
      const r = await fetch(`${server.url}/api/v1/contracts`, {
        headers: { 'X-Company-Id': 'acme' },
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.data.contracts).toEqual([]);
      expect(body.data.total).toBe(0);
    });

    it('two tenants get isolated contract lists', async () => {
      // Create one contract as tenant-A via the admin/seed path
      const seedA = await fetch(`${server.url}/api/v1/admin/seed`, {
        method: 'POST',
        headers: { 'X-Company-Id': 'tenant-A', 'Content-Type': 'application/json' },
        body: JSON.stringify({ contracts: [{ id: 'c-A-1', title: 'A contract' }] }),
      }).catch(() => null);

      // Use the actual route to create a contract — note this requires auth
      // For this test we directly insert via a helper endpoint
      // Since we don't have a public seed endpoint, we use the buckets directly
      const mod = await import('../../src/services/tenantStore.js');
      mod.tenantStores.contracts.for({ tenant: { companyId: 'tenant-A', source: 'test' } } as any).set('c-A-1', { id: 'c-A-1', title: 'A' });
      mod.tenantStores.contracts.for({ tenant: { companyId: 'tenant-B', source: 'test' } } as any).set('c-B-1', { id: 'c-B-1', title: 'B' });

      const rA = await fetch(`${server.url}/api/v1/contracts`, { headers: { 'X-Company-Id': 'tenant-A' } });
      const rB = await fetch(`${server.url}/api/v1/contracts`, { headers: { 'X-Company-Id': 'tenant-B' } });
      const bA = await rA.json();
      const bB = await rB.json();
      expect(bA.data.contracts).toHaveLength(1);
      expect(bA.data.contracts[0].id).toBe('c-A-1');
      expect(bB.data.contracts).toHaveLength(1);
      expect(bB.data.contracts[0].id).toBe('c-B-1');

      // Cleanup
      mod.tenantStores.resetAll();
    });

    it('GET /api/v1/admin/tenants lists known tenants', async () => {
      const mod = await import('../../src/services/tenantStore.js');
      mod.tenantStores.contracts.for({ tenant: { companyId: 'tenant-X', source: 'test' } } as any).set('c', 1);

      const r = await fetch(`${server.url}/api/v1/admin/tenants`, {
        headers: { 'X-Company-Id': 'tenant-X' },
      });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.totals.tenantCount).toBeGreaterThanOrEqual(1);

      mod.tenantStores.resetAll();
    });
  });

  describe('default permissive mode (REQUIRE_TENANT unset)', () => {
    beforeEach(async () => {
      server = await startServer({});
    });
    afterEach(async () => {
      await server.close();
    });

    it('works without a tenant (falls back to default)', async () => {
      const r = await fetch(`${server.url}/api/v1/contracts`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.contracts).toEqual([]);
    });

    it('admin/whoami returns null tenant', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.data.tenant).toBeNull();
    });
  });
});