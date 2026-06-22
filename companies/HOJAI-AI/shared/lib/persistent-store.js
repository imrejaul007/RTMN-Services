/**
 * RTMN Persistent Store - File-backed JSON storage
 *
 * Drop-in replacement for in-memory Map that survives process restarts.
 * Each "collection" is a JSON file in a per-service data directory.
 *
 * This is NOT a replacement for MongoDB/Postgres in high-throughput scenarios,
 * but it eliminates the worst pain point (data loss on restart) without
 * requiring any infrastructure setup.
 *
 * Usage:
 *   import { createPersistentStore } from '@rtmn/shared/lib/persistent-store';
 *
 *   const users = createPersistentStore('users', { key: 'email' });
 *   users.set('alice@example.com', { email: 'alice@example.com', name: 'Alice' });
 *   const alice = users.get('alice@example.com'); // Survives restart
 *
 * Or use as a Mongoose-like model:
 *   import { createModel } from '@rtmn/shared/lib/persistent-store';
 *
 *   const User = createModel('User', { key: 'email' });
 *   await User.create({ email: 'alice@example.com', name: 'Alice' });
 *   const alice = await User.findOne({ email: 'alice@example.com' });
 *   const all = await User.find({ role: 'admin' });
 *   await User.updateOne({ email: 'alice@example.com' }, { name: 'Alice 2' });
 *   await User.deleteOne({ email: 'alice@example.com' });
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Normalize a user-provided encryption key into a 32-byte Buffer.
 * Accepts: raw 32-byte buffer, hex string (64 chars), or base64 string (>=32 bytes decoded).
 */
function normalizeKey(key) {
  if (Buffer.isBuffer(key)) {
    if (key.length !== 32) throw new Error('encryptionKey must be exactly 32 bytes');
    return key;
  }
  if (typeof key !== 'string') throw new Error('encryptionKey must be a string or Buffer');
  // Try hex first (64 chars = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(key)) return Buffer.from(key, 'hex');
  // Try base64
  const b64 = Buffer.from(key, 'base64');
  if (b64.length === 32) return b64;
  // Last resort: SHA-256 the input to get 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string with AES-256-GCM. Output format: base64(iv).base64(tag).base64(ct).
 * The 3-part base64 format is also the marker we use to skip "already encrypted" values.
 */
function encryptAtRest(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(Buffer.from(String(plaintext), 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

/**
 * Attempt to decrypt a value. Returns null if it doesn't look encrypted
 * (so callers can leave already-cleartext values alone on legacy data).
 */
function tryDecryptAtRest(value, key) {
  if (typeof value !== 'string') return null;
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ct = Buffer.from(parts[2], 'base64');
    if (iv.length !== 12 || tag.length !== 16 || ct.length === 0) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (_) {
    return null;
  }
}

/**
 * Resolve the data directory for a service.
 * Defaults to <service-name>/data relative to cwd, or /tmp/hojai-<service> as fallback.
 */
function resolveDataDir(serviceName) {
  if (process.env.HOJAI_DATA_DIR) {
    return process.env.HOJAI_DATA_DIR;
  }
  const dir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      // Fall back to /tmp
      return `/tmp/hojai-${serviceName || 'service'}`;
    }
  }
  return dir;
}

/**
 * PersistentStore - A Map-like collection backed by a JSON file.
 *
 * @param {string} name - Collection name (e.g., 'users', 'orders')
 * @param {object} options
 * @param {string} [options.key='id'] - Field used as primary key
 * @param {string} [options.serviceName] - Service name for data dir
 * @param {string[]} [options.encryptFields] - Field names whose values
 *   should be encrypted at rest with AES-256-GCM. Requires either
 *   `options.encryptionKey` (32 raw bytes, hex string, or base64) or
 *   the `PERSISTENT_STORE_KEY` env var. Defaults to ['password',
 *   'passwordHash'] when `options.encrypt=true`.
 * @param {boolean} [options.encrypt=false] - Encrypt sensitive fields by default.
 * @param {string|Buffer} [options.encryptionKey] - 32-byte key.
 */
export class PersistentStore {
  constructor(name, options = {}) {
    this.name = name;
    this.keyField = options.key || 'id';
    this.serviceName = options.serviceName || process.env.SERVICE_NAME || 'shared';
    this.filePath = path.join(resolveDataDir(this.serviceName), `${name}.json`);
    this._data = new Map();
    this._loaded = false;
    this._writeQueue = Promise.resolve();
    this._autoId = 1;

    // SECURITY FIX (HOJAI C-6): Optional at-rest encryption for sensitive
    // fields. Default off (preserves existing behavior); opt in with
    // `encrypt: true` or `encryptFields: [...]`.
    this.encryptFields = options.encryptFields ||
      (options.encrypt ? ['password', 'passwordHash'] : []);
    this._cipherKey = null;
    if (this.encryptFields.length) {
      const key = options.encryptionKey || process.env.PERSISTENT_STORE_KEY;
      if (!key) {
        console.warn(
          `[PersistentStore:${this.name}] encryptFields configured but no ` +
          `encryption key provided (set PERSISTENT_STORE_KEY or pass ` +
          `options.encryptionKey). Sensitive fields will be written in ` +
          `cleartext. This is a security risk.`
        );
      } else {
        this._cipherKey = normalizeKey(key);
      }
    }

    this._load();
  }

  /**
   * Encrypt the configured sensitive fields of a record before persistence.
   * Returns a new object; the original is untouched.
   */
  _maybeEncryptFields(record) {
    if (!this._cipherKey || !record || typeof record !== 'object') return record;
    const out = { ...record };
    for (const field of this.encryptFields) {
      if (out[field] == null) continue;
      if (typeof out[field] !== 'string' && !Buffer.isBuffer(out[field])) continue;
      // Skip if already encrypted (heuristic: looks like base64 with >=3 parts)
      const str = String(out[field]);
      if (/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/.test(str) && str.length > 40) {
        continue;
      }
      out[field] = encryptAtRest(str, this._cipherKey);
    }
    return out;
  }

  /**
   * Decrypt the configured sensitive fields when reading from disk.
   */
  _maybeDecryptFields(record) {
    if (!this._cipherKey || !record || typeof record !== 'object') return record;
    const out = { ...record };
    for (const field of this.encryptFields) {
      if (out[field] == null) continue;
      const decrypted = tryDecryptAtRest(String(out[field]), this._cipherKey);
      if (decrypted !== null) out[field] = decrypted;
    }
    return out;
  }

  _load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const entries = JSON.parse(raw);
        for (const [k, v] of entries) {
          const decrypted = this._maybeDecryptFields(v);
          this._data.set(k, decrypted);
          if (v && typeof v === 'object' && v._autoId && v._autoId >= this._autoId) {
            this._autoId = v._autoId + 1;
          }
        }
        this._loaded = true;
      }
    } catch (err) {
      // If file is corrupted, log and start fresh
      console.error(`[PersistentStore:${this.name}] Failed to load ${this.filePath}:`, err.message);
    }
  }

  _persist() {
    // Serialize writes to avoid concurrent fs writes
    this._writeQueue = this._writeQueue.then(() => this._writeNow()).catch((err) => {
      console.error(`[PersistentStore:${this.name}] Write failed:`, err.message);
    });
    return this._writeQueue;
  }

  _writeNow() {
    return new Promise((resolve, reject) => {
      try {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const entries = Array.from(this._data.entries())
          .map(([k, v]) => [k, this._maybeEncryptFields(v)]);
        // Write to temp file then rename for atomicity
        const tmpPath = `${this.filePath}.tmp`;
        fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2), 'utf8');
        fs.renameSync(tmpPath, this.filePath);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Get value by key */
  get(key) {
    return this._data.get(String(key));
  }

  /** Check if key exists */
  has(key) {
    return this._data.has(String(key));
  }

  /** Set value (replaces if exists). Returns the value. */
  async set(key, value) {
    this._data.set(String(key), value);
    await this._persist();
    return value;
  }

  /** Delete by key. Returns true if deleted. */
  async delete(key) {
    const existed = this._data.delete(String(key));
    if (existed) await this._persist();
    return existed;
  }

  /** Number of entries */
  get size() {
    return this._data.size;
  }

  /** Iterate values */
  values() {
    return this._data.values();
  }

  /** Iterate keys */
  keys() {
    return this._data.keys();
  }

  /** Iterate entries */
  entries() {
    return this._data.entries();
  }

  /** Clear all entries */
  async clear() {
    this._data.clear();
    await this._persist();
  }

  /**
   * Flush all pending writes to disk and wait for completion.
   * Use this in graceful-shutdown handlers to ensure the on-disk
   * state matches the in-memory state before the process exits.
   *
   * Idempotent: returns the same promise on concurrent calls.
   */
  async flush() {
    return this._writeQueue;
  }

  /** Convert to array of values */
  toArray() {
    return Array.from(this._data.values());
  }

  /** Find first matching entry (sync, in-memory) */
  findOne(predicate) {
    for (const v of this._data.values()) {
      if (predicate(v)) return v;
    }
    return null;
  }

  /** Find all matching entries (sync, in-memory) */
  find(predicate) {
    const results = [];
    for (const v of this._data.values()) {
      if (predicate(v)) results.push(v);
    }
    return results;
  }

  /** Generate a unique ID */
  newId(prefix = '') {
    return prefix ? `${prefix}_${crypto.randomBytes(6).toString('hex')}` : crypto.randomBytes(8).toString('hex');
  }
}

/**
 * Model - Mongoose-like wrapper around PersistentStore.
 *
 * Provides async create/find/findOne/update/delete methods that match Mongoose's API
 * closely enough to be a drop-in replacement for simple CRUD services.
 *
 * @param {string} name - Model name
 * @param {object} options
 * @param {string} [options.key='id'] - Primary key field
 * @param {function} [options.schema] - Optional validator function (data) => cleanedData
 */
export class Model {
  constructor(name, options = {}) {
    this.name = name;
    this.store = new PersistentStore(name.toLowerCase() + 's', options);
    this.schema = options.schema || null;
  }

  _clean(data) {
    if (!this.schema) return { ...data };
    const cleaned = this.schema(data);
    return typeof cleaned === 'object' ? cleaned : { ...data };
  }

  /** Create new entry. Auto-assigns ID if not provided. */
  async create(data) {
    const cleaned = this._clean(data);
    if (!cleaned[this.store.keyField]) {
      cleaned[this.store.keyField] = this.store.newId(`${this.name.toLowerCase()}_`);
    }
    cleaned.createdAt = cleaned.createdAt || new Date().toISOString();
    cleaned.updatedAt = new Date().toISOString();
    await this.store.set(cleaned[this.store.keyField], cleaned);
    return cleaned;
  }

  /** Find single entry by key or query */
  async findOne(query) {
    if (typeof query === 'string') {
      return this.store.get(query) || null;
    }
    return this.store.findOne((item) => {
      for (const [k, v] of Object.entries(query)) {
        if (item[k] !== v) return false;
      }
      return true;
    }) || null;
  }

  /** Find all entries matching query (or all if no query) */
  async find(query = null) {
    let results = this.store.toArray();
    if (query) {
      results = results.filter((item) => {
        for (const [k, v] of Object.entries(query)) {
          if (item[k] !== v) return false;
        }
        return true;
      });
    }
    return results;
  }

  /** Find by ID */
  async findById(id) {
    return this.store.get(id) || null;
  }

  /** Update one entry */
  async updateOne(query, updates) {
    const existing = await this.findOne(query);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await this.store.set(existing[this.store.keyField], updated);
    return updated;
  }

  /** Update by ID */
  async findByIdAndUpdate(id, updates) {
    return this.updateOne({ [this.store.keyField]: id }, updates);
  }

  /** Delete one entry */
  async deleteOne(query) {
    const existing = await this.findOne(query);
    if (!existing) return null;
    await this.store.delete(existing[this.store.keyField]);
    return existing;
  }

  /** Delete by ID */
  async findByIdAndDelete(id) {
    return this.deleteOne({ [this.store.keyField]: id });
  }

  /** Count entries matching query */
  async countDocuments(query = null) {
    const results = await this.find(query);
    return results.length;
  }

  /** Drop all entries (DANGEROUS - for testing only) */
  async deleteMany(query = null) {
    if (!query) {
      const count = this.store.size;
      await this.store.clear();
      return count;
    }
    const matches = await this.find(query);
    for (const m of matches) {
      await this.store.delete(m[this.store.keyField]);
    }
    return matches.length;
  }
}

/**
 * Factory: create a model (recommended)
 */
export function createModel(name, options = {}) {
  return new Model(name, options);
}

/**
 * Factory: create a raw persistent store
 */
export function createPersistentStore(name, options = {}) {
  return new PersistentStore(name, options);
}

/**
 * Helper: model registry (so multiple models can share a service)
 */
const _modelRegistry = {};
export function getModel(name, options = {}) {
  if (!_modelRegistry[name]) {
    _modelRegistry[name] = new Model(name, options);
  }
  return _modelRegistry[name];
}

/**
 * For tests: reset the model registry
 */
export function _resetModelRegistry() {
  for (const key of Object.keys(_modelRegistry)) {
    delete _modelRegistry[key];
  }
}

// Re-export the at-rest encryption helpers so callers can use them on
// other stores or for hand-rolled persistence layers.
export { normalizeKey, encryptAtRest, tryDecryptAtRest };

export default {
  PersistentStore,
  Model,
  createModel,
  createPersistentStore,
  getModel,
  normalizeKey,
  encryptAtRest,
  tryDecryptAtRest,
};
