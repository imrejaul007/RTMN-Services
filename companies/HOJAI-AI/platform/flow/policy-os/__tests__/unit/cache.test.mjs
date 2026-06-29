/**
 * PolicyOS — Cache Service Tests (Phase P2)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const {
  getCachedEval,
  setCachedEval,
  invalidateEvalCache,
  getCachedPolicy,
  setCachedPolicy,
  invalidatePolicy,
  bulkCachePolicies,
  checkRateLimit,
  getCacheStats,
} = await import('../../src/services/cache.js');

// ── MemoryCache unit tests ────────────────────────────────────────────────────

describe('MemoryCache', async () => {
  const { default: { default: cacheModule } } = await import('../../src/services/cache.js');
  const MemoryCache = cacheModule ? null : null; // tested indirectly

  // Direct cache API tests (use in-memory fallback)
  describe('eval cache', () => {
    it('stores and retrieves evaluation result', async () => {
      const ctx = { user: { id: 'u1' }, action: 'read', resource: 'docs' };
      const result = { allowed: true, policyUsed: 'pol-1' };
      await setCachedEval(ctx, ['pol-1'], result, 10000);
      const cached = await getCachedEval(ctx, ['pol-1']);
      assert.strictEqual(cached.allowed, true);
      assert.strictEqual(cached.policyUsed, 'pol-1');
    });

    it('returns null on cache miss', async () => {
      const ctx = { user: { id: 'nonexistent' }, action: 'read' };
      const cached = await getCachedEval(ctx, ['pol-99']);
      assert.strictEqual(cached, null);
    });

    it('isolates different contexts', async () => {
      const ctx1 = { user: { id: 'alice' }, action: 'read' };
      const ctx2 = { user: { id: 'bob' }, action: 'read' };
      await setCachedEval(ctx1, ['pol-1'], { allowed: true }, 10000);
      await setCachedEval(ctx2, ['pol-1'], { allowed: false }, 10000);
      const r1 = await getCachedEval(ctx1, ['pol-1']);
      const r2 = await getCachedEval(ctx2, ['pol-1']);
      assert.strictEqual(r1.allowed, true);
      assert.strictEqual(r2.allowed, false);
    });
  });

  describe('policy cache', () => {
    it('stores and retrieves policy', async () => {
      const policy = { id: 'pol-test', name: 'Test', effect: 'allow' };
      await setCachedPolicy('pol-test', policy, 10000);
      const cached = await getCachedPolicy('pol-test');
      assert.deepStrictEqual(cached, policy);
    });

    it('returns null on miss', async () => {
      const cached = await getCachedPolicy('nonexistent');
      assert.strictEqual(cached, null);
    });
  });

  describe('bulk cache', () => {
    it('caches multiple policies', async () => {
      const policies = [
        { id: 'bulk-1', name: 'Bulk 1', effect: 'allow' },
        { id: 'bulk-2', name: 'Bulk 2', effect: 'deny' },
      ];
      await bulkCachePolicies(policies, 10000);
      const c1 = await getCachedPolicy('bulk-1');
      const c2 = await getCachedPolicy('bulk-2');
      assert.strictEqual(c1.id, 'bulk-1');
      assert.strictEqual(c2.id, 'bulk-2');
    });
  });

  describe('invalidation', () => {
    it('invalidateEvalCache clears all eval entries', async () => {
      await setCachedEval({ user: { id: 'u1' }, action: 'read' }, ['pol-1'], { allowed: true }, 10000);
      await invalidateEvalCache();
      const cached = await getCachedEval({ user: { id: 'u1' }, action: 'read' }, ['pol-1']);
      assert.strictEqual(cached, null);
    });

    it('invalidatePolicy clears specific policy and eval cache', async () => {
      await setCachedPolicy('pol-specific', { id: 'pol-specific' }, 10000);
      await setCachedEval({ user: { id: 'u1' }, action: 'read' }, ['pol-specific'], { allowed: true }, 10000);
      await invalidatePolicy('pol-specific');
      const cached = await getCachedPolicy('pol-specific');
      const evalCached = await getCachedEval({ user: { id: 'u1' }, action: 'read' }, ['pol-specific']);
      assert.strictEqual(cached, null);
      assert.strictEqual(evalCached, null);
    });
  });
});

// ── Rate Limiter ───────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('allows requests under limit', async () => {
    const result = await checkRateLimit('tenant-rl-1', '/api/evaluate', 5, 60000);
    assert.strictEqual(result.allowed, true);
    assert.ok(result.remaining <= 5);
    assert.ok(result.resetAt > Date.now());
  });

  it('tracks remaining count', async () => {
    const tenant = 'tenant-rl-2';
    await checkRateLimit(tenant, '/api/test', 3, 60000);
    await checkRateLimit(tenant, '/api/test', 3, 60000);
    const r = await checkRateLimit(tenant, '/api/test', 3, 60000);
    assert.strictEqual(r.allowed, true);
    assert.strictEqual(r.remaining, 0);
  });

  it('blocks when limit exceeded', async () => {
    const tenant = 'tenant-rl-3';
    const limit = 2;
    await checkRateLimit(tenant, '/api/blocked', limit, 60000);
    await checkRateLimit(tenant, '/api/blocked', limit, 60000);
    const r = await checkRateLimit(tenant, '/api/blocked', limit, 60000);
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  it('tracks per-endpoint independently', async () => {
    const tenant = 'tenant-rl-4';
    // Exhaust limit on endpoint A
    for (let i = 0; i < 3; i++) await checkRateLimit(tenant, '/api/a', 3, 60000);
    const rA = await checkRateLimit(tenant, '/api/a', 3, 60000);
    // Endpoint B should still have capacity
    const rB = await checkRateLimit(tenant, '/api/b', 3, 60000);
    assert.strictEqual(rA.allowed, false);
    assert.strictEqual(rB.allowed, true);
  });
});

// ── Cache Stats ─────────────────────────────────────────────────────────

describe('getCacheStats', () => {
  it('returns stats object', async () => {
    const stats = await getCacheStats();
    assert.ok(typeof stats === 'object');
    assert.ok(typeof stats.driver === 'string');
    assert.ok(typeof stats.memory === 'object');
    assert.ok(['redis', 'memory'].includes(stats.driver));
    assert.ok(typeof stats.memory.hits === 'number');
    assert.ok(typeof stats.memory.misses === 'number');
    assert.ok(typeof stats.memory.size === 'number');
    assert.ok(typeof stats.memory.hitRate === 'string');
  });
});

// ── Context Hashing ─────────────────────────────────────────────────────

describe('Context hashing', () => {
  it('same context produces same hash', async () => {
    const ctx = { user: { id: 'alice', role: 'admin' }, action: 'read', resource: 'docs' };
    await setCachedEval(ctx, ['pol-1'], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx, ['pol-1']);
    assert.strictEqual(cached?.allowed, true);
  });

  it('different context produces different cache entry', async () => {
    const ctx1 = { user: { id: 'alice' }, action: 'read' };
    const ctx2 = { user: { id: 'bob' }, action: 'read' };
    await setCachedEval(ctx1, ['pol-1'], { allowed: true }, 10000);
    await setCachedEval(ctx2, ['pol-1'], { allowed: false }, 10000);
    const c1 = await getCachedEval(ctx1, ['pol-1']);
    const c2 = await getCachedEval(ctx2, ['pol-1']);
    assert.strictEqual(c1.allowed, true);
    assert.strictEqual(c2.allowed, false);
  });

  it('ordering of context keys does not affect hash', async () => {
    const ctx1 = { user: { id: 'u1' }, action: 'read', resource: 'docs' };
    const ctx2 = { resource: 'docs', action: 'read', user: { id: 'u1' } };
    await setCachedEval(ctx1, ['pol-1'], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx2, ['pol-1']);
    assert.strictEqual(cached?.allowed, true);
  });
});

// ── Edge Cases ─────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles null/undefined context values', async () => {
    const ctx = { user: null, action: undefined, resource: 'docs' };
    const result = { allowed: true };
    await setCachedEval(ctx, ['pol-1'], result, 10000);
    const cached = await getCachedEval(ctx, ['pol-1']);
    assert.strictEqual(cached?.allowed, true);
  });

  it('handles empty policy ID list', async () => {
    const ctx = { user: { id: 'u1' } };
    await setCachedEval(ctx, [], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx, []);
    assert.strictEqual(cached?.allowed, true);
  });

  it('handles rate limit with zero limit', async () => {
    const r = await checkRateLimit('tenant-zero', '/api/zero', 0, 60000);
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  it('rate limit returns correct window info', async () => {
    const r = await checkRateLimit('tenant-info', '/api/info', 100, 60000);
    assert.strictEqual(r.limit, 100);
    assert.strictEqual(r.windowMs, 60000);
    assert.ok(r.resetAt > Date.now());
  });
});
