/**
 * PolicyOS — Cache Service Tests (Phase P2)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

// ── Helpers ─────────────────────────────────────────────────────────────

function makeCtx(userId, action) {
  return { user: { id: userId }, action };
}

// ── Eval Cache ──────────────────────────────────────────────────────────

describe('getCachedEval / setCachedEval', () => {

  it('stores and retrieves evaluation result', async () => {
    const ctx = makeCtx('u1', 'read');
    const result = { allowed: true, policyUsed: 'pol-1' };
    await setCachedEval(ctx, ['pol-1'], result, 10000);
    const cached = await getCachedEval(ctx, ['pol-1']);
    assert.strictEqual(cached !== null, true);
    assert.strictEqual(cached.allowed, true);
  });

  it('returns null on cache miss', async () => {
    const ctx = makeCtx('nonexistent', 'read');
    const cached = await getCachedEval(ctx, ['pol-99']);
    assert.strictEqual(cached, null);
  });

  it('isolates different contexts', async () => {
    const ctx1 = makeCtx('alice', 'read');
    const ctx2 = makeCtx('bob', 'read');
    await setCachedEval(ctx1, ['pol-1'], { allowed: true }, 10000);
    await setCachedEval(ctx2, ['pol-1'], { allowed: false }, 10000);
    const r1 = await getCachedEval(ctx1, ['pol-1']);
    const r2 = await getCachedEval(ctx2, ['pol-1']);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r2.allowed, false);
  });

  it('same context keys in different order produce same result', async () => {
    const ctx1 = { user: { id: 'u1' }, action: 'read', resource: 'docs' };
    const ctx2 = { resource: 'docs', action: 'read', user: { id: 'u1' } };
    await setCachedEval(ctx1, ['pol-1'], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx2, ['pol-1']);
    assert.strictEqual(cached !== null, true);
  });
});

// ── Policy Cache ────────────────────────────────────────────────────────

describe('getCachedPolicy / setCachedPolicy', () => {

  it('stores and retrieves policy', async () => {
    const policy = { id: 'pol-test', name: 'Test', effect: 'allow' };
    await setCachedPolicy('pol-test', policy, 10000);
    const cached = await getCachedPolicy('pol-test');
    assert.strictEqual(cached !== null, true);
    assert.strictEqual(cached.id, 'pol-test');
  });

  it('returns null on miss', async () => {
    const cached = await getCachedPolicy('nonexistent');
    assert.strictEqual(cached, null);
  });
});

// ── Bulk Cache ────────────────────────────────────────────────────────

describe('bulkCachePolicies', () => {

  it('caches multiple policies', async () => {
    const policies = [
      { id: 'bulk-1', name: 'Bulk 1', effect: 'allow' },
      { id: 'bulk-2', name: 'Bulk 2', effect: 'deny' },
    ];
    await bulkCachePolicies(policies, 10000);
    const c1 = await getCachedPolicy('bulk-1');
    const c2 = await getCachedPolicy('bulk-2');
    assert.strictEqual(c1 !== null, true);
    assert.strictEqual(c2 !== null, true);
    assert.strictEqual(c1.id, 'bulk-1');
    assert.strictEqual(c2.id, 'bulk-2');
  });
});

// ── Invalidation ─────────────────────────────────────────────────────

describe('invalidateEvalCache', () => {

  it('clears all evaluation cache entries', async () => {
    const ctx = makeCtx('inval-u1', 'read');
    await setCachedEval(ctx, ['pol-1'], { allowed: true }, 10000);
    await invalidateEvalCache();
    const cached = await getCachedEval(ctx, ['pol-1']);
    assert.strictEqual(cached, null);
  });
});

describe('invalidatePolicy', () => {

  it('clears policy and eval cache', async () => {
    const ctx = makeCtx('inval-u2', 'read');
    await setCachedPolicy('pol-specific', { id: 'pol-specific' }, 10000);
    await setCachedEval(ctx, ['pol-specific'], { allowed: true }, 10000);
    await invalidatePolicy('pol-specific');
    const cached = await getCachedPolicy('pol-specific');
    const evalCached = await getCachedEval(ctx, ['pol-specific']);
    assert.strictEqual(cached, null);
    assert.strictEqual(evalCached, null);
  });
});

// ── Rate Limiter ──────────────────────────────────────────────────────

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
    assert.strictEqual(r.remaining <= 3, true);
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
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(tenant, '/api/a', 3, 60000);
    }
    const rA = await checkRateLimit(tenant, '/api/a', 3, 60000);
    const rB = await checkRateLimit(tenant, '/api/b', 3, 60000);
    assert.strictEqual(rA.allowed, false);
    assert.strictEqual(rB.allowed, true);
  });

  it('blocks when limit is zero', async () => {
    const r = await checkRateLimit('tenant-zero', '/api/zero', 0, 60000);
    assert.strictEqual(r.allowed, false);
    assert.strictEqual(r.remaining, 0);
  });

  it('returns correct window info', async () => {
    const r = await checkRateLimit('tenant-info', '/api/info', 100, 60000);
    assert.strictEqual(r.limit, 100);
    assert.strictEqual(r.windowMs, 60000);
    assert.ok(r.resetAt > Date.now());
  });
});

// ── Cache Stats ──────────────────────────────────────────────────────

describe('getCacheStats', () => {

  it('returns stats with required fields', async () => {
    const stats = await getCacheStats();
    assert.strictEqual(typeof stats === 'object', true);
    assert.strictEqual(typeof stats.driver === 'string', true);
    assert.strictEqual(typeof stats.memory === 'object', true);
    assert.strictEqual(typeof stats.memory.hits === 'number', true);
    assert.strictEqual(typeof stats.memory.misses === 'number', true);
    assert.strictEqual(typeof stats.memory.size === 'number', true);
    assert.strictEqual(typeof stats.memory.hitRate === 'string', true);
  });

  it('driver is either redis or memory', async () => {
    const stats = await getCacheStats();
    assert.ok(['redis', 'memory'].includes(stats.driver));
  });
});

// ── Edge Cases ──────────────────────────────────────────────────────

describe('Edge cases', () => {

  it('handles null context values', async () => {
    const ctx = { user: null, action: undefined, resource: 'docs' };
    await setCachedEval(ctx, ['pol-1'], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx, ['pol-1']);
    assert.strictEqual(cached !== null, true);
  });

  it('handles empty policy ID array', async () => {
    const ctx = { user: { id: 'u1' } };
    await setCachedEval(ctx, [], { allowed: true }, 10000);
    const cached = await getCachedEval(ctx, []);
    assert.strictEqual(cached !== null, true);
  });
});
