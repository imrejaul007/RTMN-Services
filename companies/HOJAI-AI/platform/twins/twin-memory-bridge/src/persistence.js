/**
 * Twin Memory Bridge — Persistence Layer
 *
 * MongoDB-backed store with graceful in-memory fallback.
 * Collections:
 *   bindings   — { twinId, partitions: {kind: partitionId}, updatedAt, metadata }
 *   partitions — { id, twinId, kind, ref, createdAt, stats, metadata }
 *   audit      — { kind, twinId, partitionId, ts, payload }
 */

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'hojai_twin_memory';
const SERVICE = 'twin-memory-bridge';

let client = null;
let db = null;
let connected = false;
let connecting = null;

export function isUsingMongo() { return connected; }
export function getDb() { return db; }

export async function connect() {
  if (connected) return db;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      client = new MongoClient(MONGO_URI, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
      });
      await client.connect();
      db = client.db(DB_NAME);
      await ensureIndexes(db);
      connected = true;
      console.log(`[${SERVICE}] MongoDB connected: ${MONGO_URI} / ${DB_NAME}`);
      return db;
    } catch (err) {
      console.warn(`[${SERVICE}] MongoDB unavailable, using in-memory fallback: ${err.message}`);
      connected = false;
      return null;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

async function ensureIndexes(d) {
  await d.collection('bindings').createIndex({ twinId: 1 }, { unique: true });
  await d.collection('partitions').createIndex({ id: 1 }, { unique: true });
  await d.collection('partitions').createIndex({ twinId: 1, kind: 1 });
  await d.collection('audit').createIndex({ ts: -1 });
  await d.collection('audit').createIndex({ twinId: 1 });
}

// ---- bindings ----

export async function bindingUpsert(twinId, binding) {
  if (!isUsingMongo()) return;
  await db.collection('bindings').updateOne(
    { twinId },
    { $set: { ...binding, twinId, updatedAt: new Date().toISOString() } },
    { upsert: true }
  );
}

export async function bindingDeleteKind(twinId, kind) {
  if (!isUsingMongo()) return;
  await db.collection('bindings').updateOne(
    { twinId },
    { $unset: { [`partitions.${kind}`]: '' }, $set: { updatedAt: new Date().toISOString() } }
  );
}

export async function bindingDeleteAll(twinId) {
  if (!isUsingMongo()) return;
  await db.collection('bindings').deleteOne({ twinId });
}

export async function bindingsListAll() {
  if (!isUsingMongo()) return null;
  return db.collection('bindings').find({}).toArray();
}

// ---- partitions ----

export async function partitionUpsert(p) {
  if (!isUsingMongo()) return;
  await db.collection('partitions').updateOne(
    { id: p.id },
    { $set: p },
    { upsert: true }
  );
}

export async function partitionOrphan(partitionId) {
  if (!isUsingMongo()) return;
  await db.collection('partitions').updateOne(
    { id: partitionId },
    { $set: { twinId: null, orphanedAt: new Date().toISOString() } }
  );
}

export async function partitionInc(partitionId, field, by = 1) {
  if (!isUsingMongo()) return;
  await db.collection('partitions').updateOne(
    { id: partitionId },
    { $inc: { [`stats.${field}`]: by } }
  );
}

export async function partitionsListAll() {
  if (!isUsingMongo()) return null;
  return db.collection('partitions').find({}).toArray();
}

// ---- audit ----

export async function auditAppend(entry) {
  if (!isUsingMongo()) return;
  await db.collection('audit').insertOne({ ...entry, ts: new Date().toISOString() });
}

export async function auditList(filter = {}, limit = 100) {
  if (!isUsingMongo()) return null;
  return db.collection('audit').find(filter).sort({ ts: -1 }).limit(limit).toArray();
}
