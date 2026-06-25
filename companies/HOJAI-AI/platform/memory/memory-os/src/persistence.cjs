/**
 * MemoryOS Persistence Layer
 *
 * MongoDB-backed store with graceful in-memory fallback.
 *
 * If MONGODB_URI is set and reachable, all reads/writes go to Mongo.
 * Otherwise, the in-memory Map is used (dev/demo mode).
 *
 * Collections:
 *   memories       — the main memory records
 *   history        — versioned snapshots
 *   knowledgeNodes — graph nodes
 *   knowledgeEdges — graph edges (inferred from node.links; kept here for query speed)
 *   timelines      — per-twin id lists
 *   workingMemory  — current task context per twin
 *   longTermMemory — long-term entries per twin
 *   summaries      — period summaries
 *   sharingPolicies — per-memory sharing policies
 *   audit          — privacy audit log
 *   contradictions — contradiction log per memory
 */



const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB || 'hojai_memory';
const SERVICE = process.env.SERVICE_NAME || 'memory-os';

let client = null;
let db = null;
let connected = false;
let connecting = null;

async function connect() {
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
      console.warn(`[${SERVICE}] MongoDB unavailable (${err.message}); using in-memory fallback`);
      connected = false;
      db = null;
      return null;
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

async function ensureIndexes(database) {
  const promises = [];
  promises.push(database.collection('memories').createIndexes([
    { key: { twinId: 1, type: 1, kind: 1 } },
    { key: { twinId: 1, createdAt: -1 } },
    { key: { twinId: 1, importance: 1 } },
    { key: { twinId: 1, lifecycleStage: 1 } },
    { key: { content: 'text', tags: 'text' } },
    { key: { vectorId: 1 }, sparse: true },
  ]));
  promises.push(database.collection('history').createIndex({ memoryId: 1, version: 1 }));
  promises.push(database.collection('knowledgeNodes').createIndex({ id: 1 }, { unique: true }));
  promises.push(database.collection('timelines').createIndex({ twinId: 1 }, { unique: true }));
  promises.push(database.collection('workingMemory').createIndex({ twinId: 1 }, { unique: true }));
  promises.push(database.collection('longTermMemory').createIndex({ twinId: 1 }));
  promises.push(database.collection('summaries').createIndex({ id: 1 }, { unique: true }));
  promises.push(database.collection('sharingPolicies').createIndex({ memoryId: 1 }));
  promises.push(database.collection('audit').createIndex({ ts: -1 }));
  promises.push(database.collection('contradictions').createIndex({ memoryId: 1 }));
  await Promise.all(promises);
}

function isUsingMongo() {
  return connected && db !== null;
}
function getDb() { return db; }

async function close() {
  if (client) {
    try { await client.close(); } catch (e) { /* ignore */ }
    client = null;
    db = null;
    connected = false;
  }
}

// ---- Memory CRUD ----

async function memoryInsert(memory) {
  if (!isUsingMongo()) return null;
  await db.collection('memories').insertOne(memory);
  return memory;
}

async function memoryGet(id) {
  if (!isUsingMongo()) return null;
  return db.collection('memories').findOne({ id });
}

async function memoryReplace(memory) {
  if (!isUsingMongo()) return null;
  const { _id, ...rest } = memory;
  await db.collection('memories').replaceOne({ id: memory.id }, rest);
  return memory;
}

async function memoryDelete(id) {
  if (!isUsingMongo()) return null;
  await db.collection('memories').deleteOne({ id });
  await db.collection('history').deleteMany({ memoryId: id });
  await db.collection('sharingPolicies').deleteMany({ memoryId: id });
  await db.collection('contradictions').deleteMany({ memoryId: id });
  return true;
}

async function memoryList(filter = {}, options = {}) {
  if (!isUsingMongo()) return null;
  const { limit = 50, offset = 0, sort = { createdAt: -1 } } = options;
  const cursor = db.collection('memories')
    .find(filter)
    .sort(sort)
    .skip(offset)
    .limit(limit);
  const list = await cursor.toArray();
  const total = await db.collection('memories').countDocuments(filter);
  return { list, total };
}

async function memoryFindManyByIds(ids) {
  if (!isUsingMongo()) return null;
  return db.collection('memories').find({ id: { $in: ids } }).toArray();
}

async function memoryAddEmbeddingId(id, vectorId) {
  if (!isUsingMongo()) return null;
  await db.collection('memories').updateOne({ id }, { $set: { vectorId, embeddedAt: new Date().toISOString() } });
  return true;
}

async function memoryBackfillMissingVectors() {
  if (!isUsingMongo()) return null;
  return db.collection('memories').countDocuments({ vectorId: { $exists: false } });
}

// ---- History ----

async function historyInsert(memoryId, entry) {
  if (!isUsingMongo()) return null;
  await db.collection('history').insertOne({ memoryId, ...entry });
}

async function historyList(memoryId) {
  if (!isUsingMongo()) return null;
  return db.collection('history').find({ memoryId }).sort({ version: 1 }).toArray();
}

// ---- Knowledge graph ----

async function kgNodeUpsert(node) {
  if (!isUsingMongo()) return null;
  const { _id, ...rest } = node;
  await db.collection('knowledgeNodes').replaceOne({ id: node.id }, rest, { upsert: true });
  return node;
}

async function kgNodeGet(id) {
  if (!isUsingMongo()) return null;
  return db.collection('knowledgeNodes').findOne({ id });
}

async function kgNodeList() {
  if (!isUsingMongo()) return null;
  return db.collection('knowledgeNodes').find({}).toArray();
}

async function kgNodeUpdateLinks(id, links) {
  if (!isUsingMongo()) return null;
  await db.collection('knowledgeNodes').updateOne({ id }, { $set: { links } });
}

async function kgWalk(start, depth, rel) {
  if (!isUsingMongo()) return null;
  const all = await db.collection('knowledgeNodes').find({}).toArray();
  const byId = new Map(all.map(n => [n.id, n]));
  const visited = new Set();
  const queue = [{ id: start, d: 0, path: [] }];
  const found = [];
  while (queue.length) {
    const { id, d, path } = queue.shift();
    if (visited.has(id) || d > depth) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    found.push({ id, type: node.type, label: node.label, depth: d, path: [...path, id] });
    for (const e of (node.links || [])) {
      if (rel && e.rel !== rel) continue;
      queue.push({ id: e.to, d: d + 1, path: [...path, id] });
    }
  }
  return found;
}

// ---- Timelines ----

async function timelineAppend(twinId, memoryId) {
  if (!isUsingMongo()) return null;
  await db.collection('timelines').updateOne(
    { twinId },
    { $push: { memoryIds: memoryId }, $setOnInsert: { twinId } },
    { upsert: true }
  );
}

async function timelineList(twinId) {
  if (!isUsingMongo()) return null;
  const t = await db.collection('timelines').findOne({ twinId });
  return t ? (t.memoryIds || []) : [];
}

// ---- Working / long-term / summaries / sharing / contradictions ----

async function workingSet(twinId, wm) {
  if (!isUsingMongo()) return null;
  await db.collection('workingMemory').replaceOne({ twinId }, { twinId, ...wm }, { upsert: true });
}

async function workingGet(twinId) {
  if (!isUsingMongo()) return null;
  return db.collection('workingMemory').findOne({ twinId });
}

async function longtermAppend(twinId, entry) {
  if (!isUsingMongo()) return null;
  await db.collection('longTermMemory').updateOne(
    { twinId },
    { $push: { entries: entry }, $setOnInsert: { twinId } },
    { upsert: true }
  );
}

async function longtermList(twinId) {
  if (!isUsingMongo()) return null;
  const r = await db.collection('longTermMemory').findOne({ twinId });
  return r ? (r.entries || []) : [];
}

async function summaryInsert(summary) {
  if (!isUsingMongo()) return null;
  await db.collection('summaries').insertOne(summary);
}

async function summaryList(twinId) {
  if (!isUsingMongo()) return null;
  const filter = twinId ? { twinId } : {};
  return db.collection('summaries').find(filter).toArray();
}

async function sharingAppend(memoryId, policy) {
  if (!isUsingMongo()) return null;
  await db.collection('sharingPolicies').updateOne(
    { memoryId },
    { $push: { policies: policy }, $setOnInsert: { memoryId } },
    { upsert: true }
  );
}

async function sharingList(memoryId) {
  if (!isUsingMongo()) return null;
  const r = await db.collection('sharingPolicies').findOne({ memoryId });
  return r ? (r.policies || []) : [];
}

async function contradictionAppend(memoryId, entry) {
  if (!isUsingMongo()) return null;
  await db.collection('contradictions').updateOne(
    { memoryId },
    { $push: { log: entry }, $setOnInsert: { memoryId } },
    { upsert: true }
  );
}

async function contradictionList(memoryId) {
  if (!isUsingMongo()) return null;
  const r = await db.collection('contradictions').findOne({ memoryId });
  return r ? (r.log || []) : [];
}

async function auditAppend(entry) {
  if (!isUsingMongo()) return null;
  await db.collection('audit').insertOne(entry);
}

async function auditList({ principal, op, limit = 100 }) {
  if (!isUsingMongo()) return null;
  const filter = {};
  if (principal) filter.principal = principal;
  if (op) filter.op = op;
  return db.collection('audit').find(filter).sort({ ts: -1 }).limit(limit).toArray();
}

async function auditCount() {
  if (!isUsingMongo()) return null;
  return db.collection('audit').countDocuments();
}

async function cleanupExpired(nowIso) {
  if (!isUsingMongo()) return null;
  const r = await db.collection('memories').deleteMany({ expiresAt: { $lte: nowIso } });
  return r.deletedCount || 0;
}

module.exports = {
  connect,
  close,
  isUsingMongo,
  getDb,
  memoryInsert,
  memoryGet,
  memoryReplace,
  memoryDelete,
  memoryList,
  memoryFindManyByIds,
  memoryAddEmbeddingId,
  memoryBackfillMissingVectors,
  historyInsert,
  historyList,
  kgNodeUpsert,
  kgNodeGet,
  kgNodeList,
  kgNodeUpdateLinks,
  kgWalk,
  timelineAppend,
  timelineList,
  workingSet,
  workingGet,
  longtermAppend,
  longtermList,
  summaryInsert,
  summaryList,
  sharingAppend,
  sharingList,
  contradictionAppend,
  contradictionList,
  auditAppend,
  auditList,
  auditCount,
  cleanupExpired,
};
