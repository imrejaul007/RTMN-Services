/**
 * RTMN Persistent Map - Drop-in replacement for `new Map()` with file persistence
 *
 * Same synchronous API as the standard JavaScript Map, but writes are
 * persisted to disk in the background. This means:
 *
 *   const users = new PersistentMap('users', { serviceName: 'my-service' });
 *   users.set('alice', { name: 'Alice' });   // returns immediately
 *   users.get('alice');                      // returns the value
 *   users.has('alice');                      // returns true
 *   users.delete('alice');                   // returns true
 *   users.size;                              // number of entries
 *   for (const [k, v] of users.entries()) { ... }   // iteration
 *
 * **Trade-offs** (vs the async `PersistentStore`):
 *   - ✅ Drop-in: no need to refactor every callsite to use `await`
 *   - ✅ Read-after-write consistency: in-memory Map is updated synchronously
 *   - ⚠️  Crash-during-write may lose the most recent write (the in-memory state is
 *       authoritative, but the file may be slightly behind). On restart, the file
 *       is loaded back into memory, so the worst case is "1-N writes lost where
 *       N is how many writes happened since the last successful fsync".
 *   - ⚠️  Not safe for high-write workloads. If you need strong durability, use
 *       the async `PersistentStore` instead.
 *
 * **When to use this vs PersistentStore:**
 *   - Use `PersistentMap` for: small lookup tables, config, demo data, anything
 *     where losing 1-10 writes is acceptable.
 *   - Use `PersistentStore` for: financial transactions, user accounts, anything
 *     where every write must survive.
 *
 * Usage:
 *   import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
 *   const meetings = new PersistentMap('meetings', { serviceName: 'meeting-os' });
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function resolveDataDir(serviceName) {
  if (process.env.HOJAI_DATA_DIR) {
    return process.env.HOJAI_DATA_DIR;
  }
  // Try ./data first, then /tmp/hojai-<service>
  const cwd = process.cwd();
  const localData = path.resolve(cwd, 'data');
  if (fs.existsSync(localData)) {
    return localData;
  }
  return `/tmp/hojai-${serviceName || 'service'}`;
}

class PersistentMap {
  /**
   * @param {string} name - Collection name (e.g., 'meetings', 'users')
   * @param {object} [options]
   * @param {string} [options.serviceName] - Service name for data dir resolution
   * @param {number} [options.flushIntervalMs=2000] - How often to flush to disk
   * @param {boolean} [options.flushOnWrite=false] - If true, write on every set/delete
   *   (slower but more durable). Default is to batch writes.
   */
  constructor(name, options = {}) {
    this.name = name;
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'service';
    this.filePath = path.join(resolveDataDir(this.serviceName), `${name}.json`);
    this._data = new Map();
    this._dirty = false;
    this._flushIntervalMs = options.flushIntervalMs ?? 2000;
    this._flushOnWrite = options.flushOnWrite ?? false;
    this._writing = false;
    this._writeChain = Promise.resolve();
    this._timer = null;
    this._load();

    if (this._flushIntervalMs > 0) {
      this._timer = setInterval(() => this._flush(), this._flushIntervalMs);
      // Don't keep the event loop alive just for flushing
      if (this._timer.unref) this._timer.unref();
    }
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const entries = JSON.parse(raw);
        for (const [k, v] of entries) {
          this._data.set(k, v);
        }
      } else {
        // Make sure parent dir exists
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          try { fs.mkdirSync(dir, { recursive: true }); } catch {}
        }
      }
    } catch (err) {
      // If file is corrupted, log and start fresh. The next flush will rewrite it.
      // eslint-disable-next-line no-console
      console.error(`[PersistentMap:${this.name}] Failed to load ${this.filePath}:`, err.message);
    }
  }

  _markDirty() {
    this._dirty = true;
    if (this._flushOnWrite) {
      // Caller doesn't await, so this is fire-and-forget
      this._flush();
    }
  }

  _flush() {
    if (!this._dirty || this._writing) return this._writeChain;
    this._writing = true;
    this._writeChain = this._writeChain.then(async () => {
      try {
        const entries = Array.from(this._data.entries());
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const tmpPath = `${this.filePath}.tmp`;
        await fs.promises.writeFile(tmpPath, JSON.stringify(entries, null, 2), 'utf8');
        await fs.promises.rename(tmpPath, this.filePath);
        this._dirty = false;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[PersistentMap:${this.name}] Flush failed:`, err.message);
      } finally {
        this._writing = false;
      }
    });
    return this._writeChain;
  }

  /** Force a flush to disk. Returns a promise that resolves when the write completes. */
  flush() {
    return this._flush();
  }

  /** Map API: get */
  get(key) {
    return this._data.get(key);
  }

  /** Map API: has */
  has(key) {
    return this._data.has(key);
  }

  /** Map API: set */
  set(key, value) {
    this._data.set(key, value);
    this._markDirty();
    return this;
  }

  /** Map API: delete */
  delete(key) {
    const existed = this._data.delete(key);
    if (existed) this._markDirty();
    return existed;
  }

  /** Map API: clear */
  clear() {
    this._data.clear();
    this._markDirty();
  }

  /** Map API: size */
  get size() {
    return this._data.size;
  }

  /** Map API: keys */
  keys() {
    return this._data.keys();
  }

  /** Map API: values */
  values() {
    return this._data.values();
  }

  /** Map API: entries */
  entries() {
    return this._data.entries();
  }

  /** Map API: forEach */
  forEach(callback, thisArg) {
    this._data.forEach(callback, thisArg);
  }

  /** Map API: iterator (so `for (const [k, v] of map)` works) */
  [Symbol.iterator]() {
    return this._data.entries();
  }

  /** Non-Map helper: generate a unique ID */
  newId(prefix = '') {
    return prefix
      ? `${prefix}_${crypto.randomBytes(6).toString('hex')}`
      : crypto.randomBytes(8).toString('hex');
  }

  /** Non-Map helper: convert to plain array of values */
  toArray() {
    return Array.from(this._data.values());
  }

  /** Stop the background flush timer. Call this on graceful shutdown. */
  stopAutoFlush() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}

export { PersistentMap };
export default PersistentMap;
