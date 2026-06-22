/**
 * Memory Confidence — Persistence Layer
 *
 * MongoDB-backed store with graceful in-memory fallback.
 * Collections:
 *   facts         — confidence-tracked facts
 *   recallEvents  — append-only recall log
 *   audit         — every confidence change
 */

import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'hojai_memory_confidence';
const SERVICE = 'memory-confidence';

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
  await d.collection('facts').createIndex({ id: 1 }, { unique: true });
  await d.collection('facts').createIndex({ twinId: 1 });
  await d.collection('recallEvents').createIndex({ ts: -1 });
  await d.collection('audit').createIndex({ ts: -1 });
}

export async function factUpsert(f) {
  if (!isUsingMongo()) return;
  await db.collection('facts').updateOne(
    { id: f.id },
    { $set: f },
    { upsert: true }
  );
}

export async function factDelete(id) {
  if (!isUsingMongo()) return;
  await db.collection('facts').deleteOne({ id });
}

export async function factsListAll() {
  if (!isUsingMongo()) return null;
  return db.collection('facts').find({}).toArray();
}

export async function recallAppend(evt) {
  if (!isUsingMongo()) return;
  await db.collection('recallEvents').insertOne(evt);
}

export async function recallListAll() {
  if (!isUsingMongo()) return null;
  return db.collection('recallEvents').find({}).sort({ ts: -1 }).toArray();
}

export async function auditAppend(entry) {
  if (!isUsingMongo()) return;
  await db.collection('audit').insertOne(entry);
}

export async function auditListAll() {
  if (!isUsingMongo()) return null;
  return db.collection('audit').find({}).sort({ ts: -1 }).toArray();
}
