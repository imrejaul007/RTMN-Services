// ============================================================================
// SUTAR Economy OS - Tenant Key Helper Tests (ADR-0009 Phase 1)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { tkey, untkey, getCompanyId, resolveTenant, DEFAULT_TENANT } from '../../src/services/tenantKey.js';
import type { Request } from 'express';

function fakeReq(companyId?: string): Partial<Request> {
  if (!companyId) return {};
  return { tenant: { companyId, source: 'jwt' } } as any;
}

describe('tenantKey', () => {
  describe('tkey()', () => {
    it('returns default::id when no request', () => {
      expect(tkey(undefined, 'user-1')).toBe('default::user-1');
      expect(tkey(null, 'user-1')).toBe('default::user-1');
    });

    it('returns default::id when request has no tenant', () => {
      expect(tkey({} as Request, 'user-1')).toBe('default::user-1');
    });

    it('returns tenant::id when request has tenant', () => {
      expect(tkey(fakeReq('acme') as Request, 'user-1')).toBe('acme::user-1');
      expect(tkey(fakeReq('beta-corp') as Request, 'order-42')).toBe('beta-corp::order-42');
    });

    it('falls back to default when companyId is empty string', () => {
      expect(tkey(fakeReq('') as Request, 'user-1')).toBe('default::user-1');
    });

    it('handles special characters in ids', () => {
      expect(tkey(fakeReq('acme') as Request, 'escrow/abc:123')).toBe('acme::escrow/abc:123');
    });
  });

  describe('untkey()', () => {
    it('strips the current tenant prefix', () => {
      expect(untkey('acme::user-1', fakeReq('acme') as Request)).toBe('user-1');
    });

    it('falls back to first prefix when current tenant does not match', () => {
      expect(untkey('other::user-1', fakeReq('acme') as Request)).toBe('user-1');
    });

    it('returns input as-is when no separator', () => {
      expect(untkey('no-separator')).toBe('no-separator');
    });

    it('handles empty/null input', () => {
      expect(untkey('')).toBe('');
      expect(untkey(null as any)).toBe(null);
    });
  });

  describe('getCompanyId()', () => {
    it('returns default when no tenant', () => {
      expect(getCompanyId(undefined)).toBe(DEFAULT_TENANT);
      expect(getCompanyId({} as Request)).toBe(DEFAULT_TENANT);
    });

    it('returns tenant id when present', () => {
      expect(getCompanyId(fakeReq('acme') as Request)).toBe('acme');
    });
  });

  describe('resolveTenant()', () => {
    it('matches getCompanyId behavior', () => {
      expect(resolveTenant(fakeReq('acme') as Request)).toBe('acme');
      expect(resolveTenant(undefined)).toBe(DEFAULT_TENANT);
    });
  });

  describe('multi-tenant isolation pattern', () => {
    it('produces different keys for same logical id under different tenants', () => {
      const acmeKey = tkey(fakeReq('acme') as Request, 'user-1');
      const betaKey = tkey(fakeReq('beta') as Request, 'user-1');
      expect(acmeKey).not.toBe(betaKey);
      expect(acmeKey).toBe('acme::user-1');
      expect(betaKey).toBe('beta::user-1');
    });

    it('simulates a Map lookup partition pattern', () => {
      const store: Record<string, number> = {};

      // Acme earns 100 karma points
      const acmeKey = tkey(fakeReq('acme') as Request, 'user-1');
      store[acmeKey] = 100;

      // Beta earns 50 karma points for the same logical user-1
      const betaKey = tkey(fakeReq('beta') as Request, 'user-1');
      store[betaKey] = 50;

      // Acme reads — sees only its own 100
      expect(store[tkey(fakeReq('acme') as Request, 'user-1')]).toBe(100);

      // Beta reads — sees only its own 50
      expect(store[tkey(fakeReq('beta') as Request, 'user-1')]).toBe(50);

      // No tenant context — falls into default bucket
      store[tkey(undefined, 'user-1')] = 999;
      expect(store[tkey(fakeReq('acme') as Request, 'user-1')]).toBe(100);
      expect(store[tkey(fakeReq('beta') as Request, 'user-1')]).toBe(50);
    });
  });
});