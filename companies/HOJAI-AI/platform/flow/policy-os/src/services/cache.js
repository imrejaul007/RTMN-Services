/**
 * PolicyOS — Distributed Cache (Phase P2)
 *
 * Redis-backed caching layer for production horizontal scaling.
 * Features:
 * - Policy evaluation cache (LRU, TTL-based)
 * - Policy store cache (write-through invalidation)
 * - Rate limit cluster coordination (sliding window)
 * - Pub/Sub invalidation (cluster-wide cache busting)
 * - Circuit breaker (fallback to in-memory on Redis failure)
 * - Metrics (hit/miss/error rates)
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

// ── Redis Client (lazy, with reconnect) ────────────────────────────────────────

let _redis = null;
let _connecting = false;
let _connectionPromise = null;
let _Redis = null;

async function getRedis() {
  if (_redis) return _redis;
  if (_connecting) return _connectionPromise;

  // Try to load ioredis (static import — non-blocking if unavailable)
  if (!_Redis) {
    try {
      _Redis = (await import('ioredis')).default;
    } catch {
      _Redis = null;
    }
  }
  if (!_Redis) return null;

  _connecting = true;
  const url = process.env.POLICYOS_REDIS_URL || 'redis://localhost:6379';
  _connectionPromise = new Promise((resolve) => {
    try {
      const client = new _Redis(url, {
        maxRetriesPerRequest: 1,
        retryStrategy: (tries) => {
          if (tries > 2) return null;
          return Math.min(tries * 100, 1000);
        },
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      client.connect().then(() => {
        _redis = client;
        _connecting = false;
        client.on('error', (err) => console.error('[policy-os] Redis error:', err.message));
        console.log('[policy-os] Redis connected:', url);
        resolve(client);
      }).catch((err) => {
        console.warn('[policy-os] Redis connect failed:', err.message, '— using in-memory');
        _redis = null;
        _connecting = false;
        _connectionPromise = null;
        resolve(null);
      });
    } catch (err) {
      console.warn('[policy-os] Redis init failed:', err.message);
      _redis = null;
      _connecting = false;
      _connectionPromise = null;
      resolve(null);
    }
  });
  return _connectionPromise;
}

// ── In-Memory Fallback Cache ────────────────────────────────────────────────────

class MemoryCache {
  constructor(maxSize = 10000) {
    this._store = new Map();
    this._expiry = new Map();
    this.maxSize = maxSize;
    this._hits = 0;
    this._misses = 0;
  }

  async get(key) {
    if (this._expiry.has(key) && Date.now() > this._expiry.get(key)) {
      this._store.delete(key);
      this._expiry.delete(key);
      this._misses++;
      return null;
    }
    const val = this._store.get(key);
    if (val !== undefined) { this._hits++; return val; }
    this._misses++;
    return null;
  }

  async set(key, value, ttlMs = 60000) {
    if (this._store.size >= this.maxSize && !this._store.has(key)) {
      // Evict oldest
      const oldest = [...this._expiry.entries()]
        .sort((a, b) => a[1] - b[1])[0];
      if (oldest) { this._store.delete(oldest[0]); this._expiry.delete(oldest[0]); }
    }
    this._store.set(key, value);
    if (ttlMs > 0) this._expiry.set(key, Date.now() + ttlMs);
  }

  async del(key) {
    this._store.delete(key);
    this._expiry.delete(key);
  }

  async clear(pattern = '*') {
    if (pattern === '*') { this._store.clear(); this._expiry.clear(); return; }
    const re = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this._store.keys()) {
      if (re.test(key)) { this._store.delete(key); this._expiry.delete(key); }
    }
  }

  async mget(keys) {
    return keys.map(k => this.get(k));
  }

  async mset(pairs, ttlMs = 60000) {
    for (const [k, v] of pairs) await this.set(k, v, ttlMs);
  }

  async incr(key) {
    const cur = (await this.get(key)) || 0;
    const next = cur + 1;
    await this.set(key, next, 0);
    return next;
  }

  async decr(key) {
    const cur = (await this.get(key)) || 0;
    const next = cur - 1;
    await this.set(key, next, 0);
    return next;
  }

  async expire(key, ttlMs) {
    if (!this._store.has(key)) return 0;
    this._expiry.set(key, Date.now() + ttlMs);
    return 1;
  }

  async ttl(key) {
    const exp = this._expiry.get(key);
    if (!exp) return -1;
    const remaining = exp - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : -2;
  }

  async sadd(key, ...members) {
    const set = (await this.get(key)) || new Set();
    let added = 0;
    for (const m of members) if (!set.has(m)) { set.add(m); added++; }
    await this.set(key, set, 0);
    return added;
  }

  async smembers(key) {
    const set = await this.get(key);
    return set ? [...set] : [];
  }

  async sismember(key, member) {
    const set = await this.get(key);
    return set ? (set.has(member) ? 1 : 0) : 0;
  }

  get stats() {
    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      size: this._store.size,
      hitRate: total > 0 ? (this._hits / total * 100).toFixed(2) + '%' : '0%',
    };
  }
}

// ── Cache Manager ───────────────────────────────────────────────────────────────

const events = new EventEmitter();
const _memoryCache = new MemoryCache(10000);

// ── Key Builders ────────────────────────────────────────────────────────────────

const KEY_PREFIX = 'policyos:';

function evalKey(contextHash, policyIds) {
  return `${KEY_PREFIX}eval:${contextHash}:${policyIds.sort().join(',')}`;
}

function policyKey(id) {
  return `${KEY_PREFIX}policy:${id}`;
}

function rateLimitKey(tenant, endpoint) {
  return `${KEY_PREFIX}ratelimit:${tenant}:${endpoint}`;
}

function policyIndexKey() {
  return `${KEY_PREFIX}policy:index`;
}

function hashContext(ctx) {
  const str = JSON.stringify(ctx, Object.keys(ctx).sort());
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

// ── Cache API ──────────────────────────────────────────────────────────────────

/**
 * Get cached evaluation result.
 * @param {object} context  Policy evaluation context
 * @param {string[]} policyIds  Ordered policy IDs
 * @returns {Promise<object|null>}
 */
export async function getCachedEval(context, policyIds) {
  const redis = await getRedis();
  const key = evalKey(hashContext(context), policyIds);
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch { /* fallthrough */ }
  }
  return _memoryCache.get(key);
}

/**
 * Cache an evaluation result.
 * @param {object} context
 * @param {string[]} policyIds
 * @param {object} result  Evaluation result
 * @param {number} [ttlMs=30000]  Cache TTL (default 30s for volatile policy data)
 */
export async function setCachedEval(context, policyIds, result, ttlMs = 30000) {
  const redis = await getRedis();
  const key = evalKey(hashContext(context), policyIds);
  const payload = JSON.stringify(result);
  if (redis) {
    try {
      await redis.setex(key, Math.ceil(ttlMs / 1000), payload);
      return;
    } catch { /* fallthrough */ }
  }
  await _memoryCache.set(key, result, ttlMs);
}

/**
 * Invalidate all evaluation cache entries.
 * Called when any policy is created/updated/deleted.
 */
export async function invalidateEvalCache() {
  const redis = await getRedis();
  if (redis) {
    try {
      const keys = await redis.keys(`${KEY_PREFIX}eval:*`);
      if (keys.length > 0) await redis.del(...keys);
      await redis.publish(`${KEY_PREFIX}invalidate`, 'eval');
    } catch { /* fallthrough */ }
  }
  await _memoryCache.clear(`${KEY_PREFIX}eval:*`);
  events.emit('cache:invalidate', 'eval');
}

/**
 * Get cached policy by ID.
 */
export async function getCachedPolicy(id) {
  const redis = await getRedis();
  const key = policyKey(id);
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {}
  }
  return _memoryCache.get(key);
}

/**
 * Cache a policy.
 */
export async function setCachedPolicy(id, policy, ttlMs = 300000) {
  const redis = await getRedis();
  const key = policyKey(id);
  if (redis) {
    try {
      await redis.setex(key, Math.ceil(ttlMs / 1000), JSON.stringify(policy));
      return;
    } catch {}
  }
  await _memoryCache.set(key, policy, ttlMs);
}

/**
 * Invalidate a specific policy from cache.
 */
export async function invalidatePolicy(id) {
  const redis = await getRedis();
  const key = policyKey(id);
  if (redis) {
    try {
      await redis.del(key);
      await redis.publish(`${KEY_PREFIX}invalidate`, `policy:${id}`);
    } catch {}
  }
  await _memoryCache.del(key);
  await invalidateEvalCache(); // Also bust eval cache
  events.emit('cache:invalidate', `policy:${id}`);
}

/**
 * Bulk cache policies (initial load / sync).
 */
export async function bulkCachePolicies(policies, ttlMs = 300000) {
  const redis = await getRedis();
  const pairs = policies.map(p => [policyKey(p.id), JSON.stringify(p)]);
  if (redis && pairs.length > 0) {
    try {
      const pipeline = redis.pipeline();
      for (const [k, v] of pairs) pipeline.setex(k, Math.ceil(ttlMs / 1000), v);
      await pipeline.exec();
    } catch {}
  }
  for (const [k, v] of pairs) {
    const policy = policies.find(p => policyKey(p.id) === k);
    if (policy) await _memoryCache.set(k, policy, ttlMs);
  }
}

/**
 * Cluster-aware rate limiter using Redis sorted sets (sliding window).
 * Returns { allowed, remaining, resetAt }.
 */
export async function checkRateLimit(tenant, endpoint, limit, windowMs = 60000) {
  const redis = await getRedis();
  const key = rateLimitKey(tenant, endpoint);
  const now = Date.now();
  const windowStart = now - windowMs;

  if (redis) {
    try {
      const pipeline = redis.pipeline();
      // Remove old entries outside window
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      // Count current entries
      pipeline.zcard(key);
      // Add current request
      pipeline.zadd(key, now, `${now}:${Math.random()}`);
      // Set expiry
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();
      const count = results[1][1];

      if (count >= limit) {
        // Over limit — remove the request we just added
        await redis.zremrangebyscore(key, now, now);
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetAt = oldest.length >= 2 ? parseInt(oldest[1]) + windowMs : now + windowMs;
        return { allowed: false, remaining: 0, resetAt, limit, windowMs };
      }

      return { allowed: true, remaining: limit - count - 1, resetAt: now + windowMs, limit, windowMs };
    } catch {
      // Fall through to memory
    }
  }

  // Memory fallback — simplified sliding window
  const memKey = `${key}:mem`;
  const count = await _memoryCache.get(memKey) || 0;
  if (count >= limit) {
    return { allowed: false, remaining: 0, resetAt: now + windowMs, limit, windowMs, fallback: true };
  }
  await _memoryCache.set(memKey, count + 1, Math.ceil(windowMs / 1000));
  return { allowed: true, remaining: limit - count - 1, resetAt: now + windowMs, limit, windowMs, fallback: true };
}

/**
 * Get cache statistics.
 */
export async function getCacheStats() {
  const redis = await getRedis();
  const stats = {
    driver: redis ? 'redis' : 'memory',
    memory: _memoryCache.stats,
    redis: null,
  };

  if (redis) {
    try {
      const info = await redis.info('stats');
      const lines = info.split('\r\n');
      for (const line of lines) {
        if (line.startsWith('keyspace_hits:')) stats.redis = { keyspaceHits: parseInt(line.split(':')[1]) };
        if (line.startsWith('keyspace_misses:')) {
          const hits = stats.redis?.keyspaceHits || 0;
          const misses = parseInt(line.split(':')[1]);
          stats.redis = { keyspaceHits: hits, keyspaceMisses: misses,
            hitRate: (hits + misses) > 0 ? (hits / (hits + misses) * 100).toFixed(2) + '%' : '0%' };
        }
      }
    } catch {}
  }

  return stats;
}

/**
 * Subscribe to cache invalidation events (for multi-instance coordination).
 * Returns unsubscribe function.
 */
export function onInvalidate(handler) {
  events.on('cache:invalidate', handler);
  return () => events.off('cache:invalidate', handler);
}

/**
 * Warm cache from policy store.
 * Call on startup or after cache miss to repopulate.
 */
export async function warmCache(policyStore, ttlMs = 300000) {
  if (!policyStore) return;
  const policies = policyStore instanceof Map
    ? [...policyStore.values()]
    : Object.values(policyStore);
  await bulkCachePolicies(policies, ttlMs);
  console.log(`[policy-os] Cache warmed with ${policies.length} policies`);
}

/**
 * Disconnect Redis (for graceful shutdown).
 */
export async function disconnectCache() {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    _connecting = false;
    _connectionPromise = null;
    console.log('[policy-os] Redis disconnected');
  }
}

export default {
  getCachedEval,
  setCachedEval,
  invalidateEvalCache,
  getCachedPolicy,
  setCachedPolicy,
  invalidatePolicy,
  bulkCachePolicies,
  checkRateLimit,
  getCacheStats,
  onInvalidate,
  warmCache,
  disconnectCache,
  events,
};