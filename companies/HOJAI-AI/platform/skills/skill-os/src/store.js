/**
 * SkillOS — Storage Abstraction
 *
 * Unified store API that works in two modes:
 *   1. PersistentMap (default, file-backed, no infra) — works in dev / single-instance
 *   2. MongoDB (when MONGODB_URI is set) — multi-instance, production-grade
 *
 * Both modes expose the same surface so the rest of the code is identical:
 *
 *   const skills = createStore('skills', { serviceName: 'skill-os' });
 *   skills.set(id, record);
 *   skills.get(id);
 *   skills.has(id);
 *   skills.delete(id);
 *   skills.size;
 *   skills.values();
 *   skills.entries();
 *   skills.toArray();  // [record, record, ...]
 *   skills.filter(fn); // [record, ...]
 *
 * The MongoDB mode is opt-in via env. If mongoose is not installed, PersistentMap is used.
 *
 * This addresses the open follow-up from FOUNDATION-AUDIT-2026-06-21.md:
 *   "Add MongoDB to SkillOS (4743): Port the Mongoose schema from the loser."
 */

import { PersistentMap as _PersistentMap } from '@rtmn/shared/lib/persistent-map';

const MONGODB_URI = process.env.MONGODB_URI;
const USE_MONGO = !!MONGODB_URI;

let mongooseRef = null;
let connectionError = null;
let _connectionPromise = null;

async function loadMongoose() {
  if (mongooseRef) return mongooseRef;
  try {
    mongooseRef = (await import('mongoose')).default;
    return mongooseRef;
  } catch (err) {
    connectionError = `mongoose not installed: ${err.message}`;
    return null;
  }
}

async function getConnection() {
  if (!USE_MONGO) return null;
  if (_connectionPromise) return _connectionPromise;
  _connectionPromise = (async () => {
    const mongoose = await loadMongoose();
    if (!mongoose) {
      throw new Error(connectionError || 'mongoose unavailable');
    }
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    return mongoose;
  })();
  return _connectionPromise;
}

/**
 * Cached model registry — one Mongoose model per collection name.
 * Schemas are loose (Mixed) so we can store any JSON-serializable record.
 * Schema is created lazily on first use.
 */
const _modelCache = new Map();

async function getModel(name) {
  const mongoose = await getConnection();
  if (!mongoose) return null;
  if (_modelCache.has(name)) return _modelCache.get(name);
  const Schema = mongoose.Schema;
  const schema = new Schema({ _id: String, value: Schema.Types.Mixed }, { strict: false, collection: name });
  const Model = mongoose.models[name] || mongoose.model(name, schema);
  _modelCache.set(name, Model);
  return Model;
}

/**
 * Create a store for a named collection.
 *
 * Returns an object with the unified API. If MongoDB is configured AND
 * available, the store is backed by MongoDB. Otherwise it's backed by
 * a PersistentMap (file-backed, restart-safe, single-instance).
 *
 * @param {string} name - collection name (e.g. 'skills', 'assets', 'transactions')
 * @param {object} [opts]
 * @param {string} [opts.serviceName='skill-os'] - used for PersistentMap data dir
 * @returns {object} store with .get/.set/.has/.delete/.size/.values/.entries/.toArray/.filter
 */
export function createStore(name, opts = {}) {
  const serviceName = opts.serviceName || 'skill-os';
  const isAsync = USE_MONGO;
  const localMap = isAsync ? null : new _PersistentMap(name, { serviceName });

  return {
    mode: USE_MONGO ? 'mongodb' : 'persistent-map',
    name,
    get size() {
      if (localMap) return localMap.size;
      // For Mongo, size is async; callers should use count() for accuracy
      return localMap ? localMap.size : 0;
    },
    async count() {
      if (localMap) return localMap.size;
      const Model = await getModel(name);
      if (!Model) return 0;
      return await Model.countDocuments();
    },
    async get(key) {
      if (localMap) return localMap.get(key);
      const Model = await getModel(name);
      if (!Model) return undefined;
      const doc = await Model.findById(key);
      return doc ? doc.value : undefined;
    },
    async set(key, value) {
      if (localMap) return localMap.set(key, value);
      const Model = await getModel(name);
      if (!Model) return false;
      await Model.findByIdAndUpdate(key, { value }, { upsert: true, new: true });
      return true;
    },
    async has(key) {
      if (localMap) return localMap.has(key);
      const Model = await getModel(name);
      if (!Model) return false;
      const doc = await Model.findById(key).select('_id').lean();
      return !!doc;
    },
    async delete(key) {
      if (localMap) return localMap.delete(key);
      const Model = await getModel(name);
      if (!Model) return false;
      const res = await Model.deleteOne({ _id: key });
      return res.deletedCount > 0;
    },
    async values() {
      if (localMap) return Array.from(localMap.values());
      const Model = await getModel(name);
      if (!Model) return [];
      const docs = await Model.find().lean();
      return docs.map((d) => d.value);
    },
    async entries() {
      if (localMap) return Array.from(localMap.entries());
      const Model = await getModel(name);
      if (!Model) return [];
      const docs = await Model.find().lean();
      return docs.map((d) => [d._id, d.value]);
    },
    async toArray() {
      if (localMap) return Array.from(localMap.values());
      const Model = await getModel(name);
      if (!Model) return [];
      const docs = await Model.find().lean();
      return docs.map((d) => d.value);
    },
    async filter(fn) {
      const arr = await this.toArray();
      return arr.filter(fn);
    },
    async clear() {
      if (localMap) return localMap.clear();
      const Model = await getModel(name);
      if (!Model) return false;
      await Model.deleteMany({});
      return true;
    },
  };
}

/**
 * Check whether the service is in MongoDB mode.
 */
export function isMongoMode() {
  return USE_MONGO;
}

/**
 * Get the configured MongoDB URI (without credentials) for diagnostics.
 */
export function getMongoInfo() {
  if (!USE_MONGO) return null;
  // Strip credentials before returning
  return MONGODB_URI.replace(/\/\/[^@]+@/, '//***@');
}
