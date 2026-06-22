/**
 * sutar-shared/tenant helper tests, executed from the decision-engine
 * vitest harness because sutar-shared itself doesn't yet have its own
 * vitest install. Covers the helper that the 7 SUTAR stub services use
 * (sutar-agent-id, sutar-agent-network, sutar-gateway, sutar-identity,
 * sutar-memory-bridge, sutar-monitoring, sutar-twin-os).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import http from 'http';

// sutar-shared lives at: HOJAI-AI/sutar-os/core/sutar-shared/tenant.js
// Use absolute path so module resolution doesn't depend on cwd.
import { createRequire } from 'module';
const require_ = createRequire(import.meta.url);
const helperPath = require_.resolve('/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/sutar-os/core/sutar-shared/tenant.js');
const { applyTenantContext, getTenantId, tkey, untkey } = require_(helperPath);

describe('sutar-shared/tenant', () => {
  describe('helpers (pure)', () => {
    it('getTenantId returns default when no tenant', () => {
      expect(getTenantId({})).toBe('default');
      expect(getTenantId(null)).toBe('default');
      expect(getTenantId(undefined)).toBe('default');
    });

    it('getTenantId returns companyId when tenant present', () => {
      expect(getTenantId({ tenant: { companyId: 'acme', source: 'jwt' } })).toBe('acme');
    });

    it('getTenantId falls back when companyId empty', () => {
      expect(getTenantId({ tenant: { companyId: '', source: 'jwt' } })).toBe('default');
    });

    it('tkey prefixes with tenant id', () => {
      expect(tkey({ tenant: { companyId: 'acme', source: 'jwt' } }, 'u1')).toBe('acme::u1');
    });

    it('tkey uses default when no tenant', () => {
      expect(tkey({}, 'u1')).toBe('default::u1');
    });

    it('untkey strips matching tenant prefix', () => {
      expect(untkey('acme::u1', { tenant: { companyId: 'acme', source: 'jwt' } })).toBe('u1');
    });

    it('untkey falls back when tenant mismatches', () => {
      expect(untkey('beta::u1', { tenant: { companyId: 'acme', source: 'jwt' } })).toBe('u1');
    });

    it('untkey returns unchanged for no separator', () => {
      expect(untkey('plain')).toBe('plain');
    });

    it('untkey handles null/undefined', () => {
      expect(untkey(null)).toBe(null);
      expect(untkey(undefined)).toBe(undefined);
    });
  });

  describe('applyTenantContext HTTP integration (default permissive)', () => {
    let server: { url: string; close: () => Promise<void> };

    beforeEach(async () => {
      // ALLOW_HEADER_TENANT=true is required for X-Company-Id to take effect
      // in non-strict mode (default behavior is to ignore the header unless
      // explicitly enabled). This matches the behavior of the real services.
      delete process.env.REQUIRE_TENANT;
      process.env.ALLOW_HEADER_TENANT = 'true';

      const app = express();
      app.use(express.json());
      applyTenantContext(app, {
        serviceName: 'test-stub',
        publicPathPatterns: [/^\/health$/],
      });
      app.get('/api/v1/things', (req, res) => res.json({ tenant: getTenantId(req) }));

      server = await new Promise<any>((resolve) => {
        const s = http.createServer(app).listen(0, () => {
          const addr: any = s.address();
          resolve({
            url: `http://127.0.0.1:${addr.port}`,
            close: () => new Promise<void>((r) => s.close(() => r())),
          });
        });
      });
    });
    afterEach(async () => {
      delete process.env.ALLOW_HEADER_TENANT;
      await server.close();
    });

    it('GET /api/v1/admin/tenant/whoami returns tenant info', async () => {
      const r = await fetch(`${server.url}/api/v1/admin/tenant/whoami`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.success).toBe(true);
      expect(body.data.service).toBe('test-stub');
      expect(body.data.tenantId).toBe('default');
    });

    it('GET /api/v1/things works without tenant (falls back to default)', async () => {
      const r = await fetch(`${server.url}/api/v1/things`);
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.tenant).toBe('default');
    });

    it('two tenants see different tenant ids', async () => {
      const r1 = await fetch(`${server.url}/api/v1/things`, { headers: { 'X-Company-Id': 'tenant-A' } });
      const r2 = await fetch(`${server.url}/api/v1/things`, { headers: { 'X-Company-Id': 'tenant-B' } });
      const b1 = await r1.json();
      const b2 = await r2.json();
      expect(b1.tenant).toBe('tenant-A');
      expect(b2.tenant).toBe('tenant-B');
    });
  });

  describe('applyTenantContext strict mode (REQUIRE_TENANT=true)', () => {
    let server: { url: string; close: () => Promise<void> };

    beforeEach(async () => {
      process.env.REQUIRE_TENANT = 'true';
      process.env.ALLOW_HEADER_TENANT = 'true';

      const app = express();
      app.use(express.json());
      applyTenantContext(app, {
        serviceName: 'test-stub-strict',
        publicPathPatterns: [],
      });
      app.get('/api/v1/things', (req, res) => res.json({ tenant: getTenantId(req) }));

      server = await new Promise<any>((resolve) => {
        const s = http.createServer(app).listen(0, () => {
          const addr: any = s.address();
          resolve({
            url: `http://127.0.0.1:${addr.port}`,
            close: () => new Promise<void>((r) => s.close(() => r())),
          });
        });
      });
    });
    afterEach(async () => {
      delete process.env.REQUIRE_TENANT;
      delete process.env.ALLOW_HEADER_TENANT;
      await server.close();
    });

    it('returns 400 without tenant in strict mode', async () => {
      const r = await fetch(`${server.url}/api/v1/things`);
      expect(r.status).toBe(400);
      const body = await r.json();
      expect(body.error).toBe('TENANT_REQUIRED');
    });

    it('accepts X-Company-Id in strict mode', async () => {
      const r = await fetch(`${server.url}/api/v1/things`, { headers: { 'X-Company-Id': 'strict' } });
      expect(r.status).toBe(200);
      const body = await r.json();
      expect(body.tenant).toBe('strict');
    });
  });
});