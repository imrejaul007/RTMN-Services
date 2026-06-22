/**
 * Storage abstraction with Redis + in-memory fallback.
 *
 * If Redis is unreachable (server not running, network down), transparently
 * fall back to an in-process Map-based store so the service can still
 * start, serve traffic, and pass tests in environments without Redis.
 *
 * Only the operations actually used by this service are implemented.
 */

import Redis from 'ioredis';

class MemoryStore {
  constructor() {
    this.kv = new Map();           // string -> string
    this.hash = new Map();         // string -> Map<field, value>
    this.sets = new Map();         // string -> Set
    this.lists = new Map();        // string -> Array (head = index 0)
  }

  async get(key) {
    return this.kv.has(key) ? this.kv.get(key) : null;
  }

  async set(key, value) {
    this.kv.set(key, value);
    return 'OK';
  }

  async del(key) {
    const existed = this.kv.delete(key);
    this.hash.delete(key);
    this.sets.delete(key);
    this.lists.delete(key);
    return existed ? 1 : 0;
  }

  async keys(pattern) {
    // Very small glob: only supports trailing '*' or exact match
    if (!pattern.includes('*')) {
      return this.kv.has(pattern) ? [pattern] : [];
    }
    const prefix = pattern.slice(0, pattern.indexOf('*'));
    const out = [];
    for (const k of this.kv.keys()) {
      if (k.startsWith(prefix)) out.push(k);
    }
    return out;
  }

  async smembers(key) {
    const s = this.sets.get(key);
    return s ? Array.from(s) : [];
  }

  async sadd(key, ...members) {
    let s = this.sets.get(key);
    if (!s) { s = new Set(); this.sets.set(key, s); }
    let added = 0;
    for (const m of members) {
      if (!s.has(m)) { s.add(m); added++; }
    }
    return added;
  }

  async srem(key, ...members) {
    const s = this.sets.get(key);
    if (!s) return 0;
    let removed = 0;
    for (const m of members) {
      if (s.delete(m)) removed++;
    }
    return removed;
  }

  async lpush(key, ...values) {
    let l = this.lists.get(key);
    if (!l) { l = []; this.lists.set(key, l); }
    l.unshift(...values);
    return l.length;
  }

  async rpush(key, ...values) {
    let l = this.lists.get(key);
    if (!l) { l = []; this.lists.set(key, l); }
    l.push(...values);
    return l.length;
  }

  async lrange(key, start, stop) {
    const l = this.lists.get(key);
    if (!l) return [];
    const s = start < 0 ? Math.max(l.length + start, 0) : start;
    const e = stop < 0 ? l.length + stop : stop;
    return l.slice(s, e + 1);
  }

  async ltrim(key, start, stop) {
    const l = this.lists.get(key);
    if (!l) return 'OK';
    const s = start < 0 ? Math.max(l.length + start, 0) : start;
    const e = stop < 0 ? l.length + stop : stop;
    this.lists.set(key, l.slice(s, e + 1));
    return 'OK';
  }

  async incr(key) {
    const cur = parseInt(this.kv.get(key) || '0', 10) + 1;
    this.kv.set(key, String(cur));
    return cur;
  }

  async ping() {
    return 'PONG';
  }
}

class RedisFallback {
  constructor(url) {
    this.url = url;
    this.mode = 'redis'; // or 'memory'
    this.memory = new MemoryStore();
    this._redis = null;
    this._connected = false;
    this._connectAttempted = false;

    this._init();
  }

  _init() {
    try {
      this._redis = new Redis(this.url, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null, // do not retry forever
        reconnectOnError: () => false
      });

      this._redis.on('connect', () => {
        this._connected = true;
        this.mode = 'redis';
        // eslint-disable-next-line no-console
        console.log('✅ Decision Engine Redis connected');
      });

      this._redis.on('error', (err) => {
        if (this.mode === 'redis') {
          this.mode = 'memory';
          this._connected = false;
          // eslint-disable-next-line no-console
          console.warn('⚠️  Decision Engine Redis unavailable, using in-memory fallback:', err.message);
        }
      });

      // Try to connect but don't block startup
      this._connectAttempted = true;
      this._redis.connect().catch((err) => {
        this.mode = 'memory';
        this._connected = false;
        // eslint-disable-next-line no-console
        console.warn('⚠️  Decision Engine Redis connect failed, using in-memory fallback:', err.message);
      });

      // After a short grace period, if still not connected, switch to memory mode
      setTimeout(() => {
        if (!this._connected) {
          this.mode = 'memory';
        }
      }, 500);
    } catch (err) {
      this.mode = 'memory';
      // eslint-disable-next-line no-console
      console.warn('⚠️  Decision Engine Redis init failed, using in-memory fallback:', err.message);
    }
  }

  _useMemory() {
    return this.mode === 'memory';
  }

  // ---- KV ----
  async get(key) {
    if (this._useMemory()) return this.memory.get(key);
    try {
      return await this._redis.get(key);
    } catch (e) {
      this._markMemory(e);
      return this.memory.get(key);
    }
  }

  async set(key, value) {
    if (this._useMemory()) return this.memory.set(key, value);
    try {
      return await this._redis.set(key, value);
    } catch (e) {
      this._markMemory(e);
      return this.memory.set(key, value);
    }
  }

  async del(key) {
    if (this._useMemory()) return this.memory.del(key);
    try {
      return await this._redis.del(key);
    } catch (e) {
      this._markMemory(e);
      return this.memory.del(key);
    }
  }

  async keys(pattern) {
    if (this._useMemory()) return this.memory.keys(pattern);
    try {
      return await this._redis.keys(pattern);
    } catch (e) {
      this._markMemory(e);
      return this.memory.keys(pattern);
    }
  }

  // ---- Sets ----
  async smembers(key) {
    if (this._useMemory()) return this.memory.smembers(key);
    try { return await this._redis.smembers(key); }
    catch (e) { this._markMemory(e); return this.memory.smembers(key); }
  }

  async sadd(key, ...members) {
    if (this._useMemory()) return this.memory.sadd(key, ...members);
    try { return await this._redis.sadd(key, ...members); }
    catch (e) { this._markMemory(e); return this.memory.sadd(key, ...members); }
  }

  async srem(key, ...members) {
    if (this._useMemory()) return this.memory.srem(key, ...members);
    try { return await this._redis.srem(key, ...members); }
    catch (e) { this._markMemory(e); return this.memory.srem(key, ...members); }
  }

  // ---- Lists ----
  async lpush(key, ...values) {
    if (this._useMemory()) return this.memory.lpush(key, ...values);
    try { return await this._redis.lpush(key, ...values); }
    catch (e) { this._markMemory(e); return this.memory.lpush(key, ...values); }
  }

  async rpush(key, ...values) {
    if (this._useMemory()) return this.memory.rpush(key, ...values);
    try { return await this._redis.rpush(key, ...values); }
    catch (e) { this._markMemory(e); return this.memory.rpush(key, ...values); }
  }

  async lrange(key, start, stop) {
    if (this._useMemory()) return this.memory.lrange(key, start, stop);
    try { return await this._redis.lrange(key, start, stop); }
    catch (e) { this._markMemory(e); return this.memory.lrange(key, start, stop); }
  }

  async ltrim(key, start, stop) {
    if (this._useMemory()) return this.memory.ltrim(key, start, stop);
    try { return await this._redis.ltrim(key, start, stop); }
    catch (e) { this._markMemory(e); return this.memory.ltrim(key, start, stop); }
  }

  // ---- Misc ----
  async incr(key) {
    if (this._useMemory()) return this.memory.incr(key);
    try { return await this._redis.incr(key); }
    catch (e) { this._markMemory(e); return this.memory.incr(key); }
  }

  async ping() {
    if (this._useMemory()) return this.memory.ping();
    try { return await this._redis.ping(); }
    catch (e) { this._markMemory(e); return this.memory.ping(); }
  }

  _markMemory(_err) {
    if (this.mode !== 'memory') {
      this.mode = 'memory';
      // eslint-disable-next-line no-console
      console.warn('⚠️  Decision Engine Redis switched to in-memory mode');
    }
  }

  // For diagnostics
  status() {
    return { mode: this.mode, url: this.url };
  }
}

export function createStorage(url) {
  return new RedisFallback(url);
}

export default RedisFallback;