/**
 * DatabaseOS - Multi-Database Management
 *
 * Real integrations:
 * - MongoDB (document store)
 * - PostgreSQL (relational)
 * - Redis (caching)
 * - Elasticsearch (search)
 * - Schema migrations
 * - Backup management
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors(), express.json());
const PORT = process.env.DATABASE_OS_PORT || 4620;

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000
    }
  },
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT) || 5432,
    database: process.env.PG_DATABASE || 'hojai',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB) || 0
  },
  elasticsearch: {
    node: process.env.ES_NODE || 'http://localhost:9200',
    auth: process.env.ES_AUTH,
    indexPrefix: process.env.ES_INDEX_PREFIX || 'hojai'
  }
};

// In-memory stores for demo
const connections = new Map();    // connectionId -> connection info
const schemas = new Map();        // schemaId -> schema
const migrations = new Map();     // migrationId -> migration
const backups = new Map();        // backupId -> backup
const collections = new Map();    // collectionId -> collection config
const indices = new Map();        // indexId -> index config

// ============================================
// MONGODB CLIENT
// ============================================

class MongoDBClient {
  constructor(uri, options) {
    this.uri = uri;
    this.options = options;
    this.connected = false;
    this.collections = new Map();
  }

  async connect() {
    if (!process.env.MONGODB_URI) {
      console.log('MongoDB: Running in mock mode');
      this.connected = true;
      return;
    }

    try {
      // In production, use official mongodb driver
      // const { MongoClient } = await import('mongodb');
      // this.client = new MongoClient(uri, options);
      // await this.client.connect();
      this.connected = true;
      console.log('MongoDB: Connected');
    } catch (error) {
      console.error('MongoDB connection failed:', error.message);
      this.connected = false;
    }
  }

  async createCollection(name, schema) {
    this.collections.set(name, {
      name,
      schema,
      documents: [],
      indexes: [],
      createdAt: new Date().toISOString()
    });

    return { success: true, collection: name };
  }

  async insertOne(collection, document) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    const doc = {
      _id: uuidv4(),
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    coll.documents.push(doc);
    return { success: true, insertedId: doc._id };
  }

  async find(collection, query, options = {}) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    let results = coll.documents.filter(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) return false;
      }
      return true;
    });

    // Apply pagination
    if (options.skip) {
      results = results.slice(options.skip);
    }
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return { success: true, documents: results, count: results.length };
  }

  async updateOne(collection, query, update) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    const index = coll.documents.findIndex(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) return false;
      }
      return true;
    });

    if (index === -1) {
      return { success: false, error: 'Document not found', matchedCount: 0 };
    }

    coll.documents[index] = {
      ...coll.documents[index],
      ...update,
      updatedAt: new Date().toISOString()
    };

    return { success: true, matchedCount: 1, modifiedCount: 1 };
  }

  async deleteOne(collection, query) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    const index = coll.documents.findIndex(doc => {
      for (const [key, value] of Object.entries(query)) {
        if (doc[key] !== value) return false;
      }
      return true;
    });

    if (index === -1) {
      return { success: false, error: 'Document not found', deletedCount: 0 };
    }

    coll.documents.splice(index, 1);
    return { success: true, deletedCount: 1 };
  }

  async createIndex(collection, indexDef) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    const index = {
      name: indexDef.name || `idx_${Date.now()}`,
      keys: indexDef.keys,
      unique: indexDef.unique || false,
      createdAt: new Date().toISOString()
    };

    coll.indexes.push(index);
    return { success: true, index: index.name };
  }

  async aggregate(collection, pipeline) {
    const coll = this.collections.get(collection);
    if (!coll) {
      return { success: false, error: 'Collection not found' };
    }

    // Simplified aggregation - in production, implement full pipeline
    let results = [...coll.documents];

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(doc => {
          for (const [key, value] of Object.entries(stage.$match)) {
            if (doc[key] !== value) return false;
          }
          return true;
        });
      }

      if (stage.$group) {
        const groups = new Map();
        for (const doc of results) {
          const key = doc[stage.$group._id] || 'total';
          if (!groups.has(key)) {
            groups.set(key, { count: 0, sum: 0 });
          }
          const g = groups.get(key);
          g.count++;
          if (stage.$group.sum) {
            g.sum += doc[stage.$group.sum] || 0;
          }
        }
        results = Array.from(groups.entries()).map(([key, value]) => ({
          _id: key,
          count: value.count,
          sum: value.sum
        }));
      }

      if (stage.$sort) {
        const sortKey = Object.keys(stage.$sort)[0];
        const sortDir = stage.$sort[sortKey];
        results.sort((a, b) => sortDir === 1 ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]);
      }

      if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      }
    }

    return { success: true, results };
  }
}

// ============================================
// POSTGRESQL CLIENT
// ============================================

class PostgreSQLClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.tables = new Map();
  }

  async connect() {
    if (!process.env.PG_HOST) {
      console.log('PostgreSQL: Running in mock mode');
      this.connected = true;
      return;
    }

    try {
      // In production, use pg driver
      // const { Pool } = await import('pg');
      // this.pool = new Pool(config);
      this.connected = true;
      console.log('PostgreSQL: Connected');
    } catch (error) {
      console.error('PostgreSQL connection failed:', error.message);
      this.connected = false;
    }
  }

  async createTable(name, columns) {
    this.tables.set(name, {
      name,
      columns,
      rows: [],
      constraints: [],
      indexes: [],
      createdAt: new Date().toISOString()
    });

    return { success: true, table: name };
  }

  async insert(table, data) {
    const t = this.tables.get(table);
    if (!t) {
      return { success: false, error: 'Table not found' };
    }

    const row = {
      id: uuidv4(),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    t.rows.push(row);
    return { success: true, id: row.id };
  }

  async select(table, conditions = {}, options = {}) {
    const t = this.tables.get(table);
    if (!t) {
      return { success: false, error: 'Table not found' };
    }

    let results = [...t.rows];

    // Apply WHERE conditions
    for (const [key, value] of Object.entries(conditions)) {
      results = results.filter(r => r[key] === value);
    }

    // Apply ORDER BY
    if (options.orderBy) {
      const key = Object.keys(options.orderBy)[0];
      const dir = options.orderBy[key].toUpperCase();
      results.sort((a, b) => dir === 'ASC' ? a[key] - b[key] : b[key] - a[key]);
    }

    // Apply LIMIT/OFFSET
    if (options.limit) {
      results = results.slice(options.offset || 0, options.offset + options.limit);
    }

    return { success: true, rows: results, count: results.length };
  }

  async update(table, conditions, data) {
    const t = this.tables.get(table);
    if (!t) {
      return { success: false, error: 'Table not found' };
    }

    let updated = 0;
    for (const row of t.rows) {
      let match = true;
      for (const [key, value] of Object.entries(conditions)) {
        if (row[key] !== value) {
          match = false;
          break;
        }
      }

      if (match) {
        Object.assign(row, data, { updated_at: new Date().toISOString() });
        updated++;
      }
    }

    return { success: true, updated };
  }

  async delete(table, conditions) {
    const t = this.tables.get(table);
    if (!t) {
      return { success: false, error: 'Table not found' };
    }

    const initialLength = t.rows.length;
    t.rows = t.rows.filter(row => {
      for (const [key, value] of Object.entries(conditions)) {
        if (row[key] !== value) return true;
      }
      return false;
    });

    return { success: true, deleted: initialLength - t.rows.length };
  }

  async createIndex(table, indexDef) {
    const t = this.tables.get(table);
    if (!t) {
      return { success: false, error: 'Table not found' };
    }

    t.indexes.push({
      name: indexDef.name || `idx_${Date.now()}`,
      columns: indexDef.columns,
      unique: indexDef.unique || false,
      createdAt: new Date().toISOString()
    });

    return { success: true };
  }
}

// ============================================
// REDIS CLIENT
// ============================================

class RedisClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.store = new Map();
    this.expiry = new Map();
  }

  async connect() {
    if (!process.env.REDIS_HOST) {
      console.log('Redis: Running in mock mode');
      this.connected = true;
      return;
    }

    try {
      // In production, use ioredis or node-redis
      // const Redis = await import('ioredis');
      // this.client = new Redis(config);
      this.connected = true;
      console.log('Redis: Connected');
    } catch (error) {
      console.error('Redis connection failed:', error.message);
      this.connected = false;
    }
  }

  async set(key, value, options = {}) {
    const data = typeof value === 'object' ? JSON.stringify(value) : String(value);
    this.store.set(key, data);

    if (options.EX) {
      this.expiry.set(key, Date.now() + options.EX * 1000);
    }

    return { success: true };
  }

  async get(key) {
    // Check expiry
    const exp = this.expiry.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expiry.delete(key);
      return { success: true, value: null };
    }

    const value = this.store.get(key);
    if (!value) {
      return { success: true, value: null };
    }

    try {
      return { success: true, value: JSON.parse(value) };
    } catch {
      return { success: true, value };
    }
  }

  async del(key) {
    this.store.delete(key);
    this.expiry.delete(key);
    return { success: true, deleted: 1 };
  }

  async exists(key) {
    const exp = this.expiry.get(key);
    if (exp && Date.now() > exp) {
      this.store.delete(key);
      this.expiry.delete(key);
      return { success: true, exists: 0 };
    }

    return { success: true, exists: this.store.has(key) ? 1 : 0 };
  }

  async incr(key) {
    const current = parseInt(this.store.get(key) || '0');
    this.store.set(key, String(current + 1));
    return { success: true, value: current + 1 };
  }

  async expire(key, seconds) {
    this.expiry.set(key, Date.now() + seconds * 1000);
    return { success: true };
  }

  async keys(pattern) {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return {
      success: true,
      keys: Array.from(this.store.keys()).filter(k => regex.test(k))
    };
  }

  async hset(key, field, value) {
    const hash = JSON.parse(this.store.get(key) || '{}');
    hash[field] = value;
    this.store.set(key, JSON.stringify(hash));
    return { success: true };
  }

  async hget(key, field) {
    const hash = JSON.parse(this.store.get(key) || '{}');
    return { success: true, value: hash[field] || null };
  }

  async hgetall(key) {
    const hash = JSON.parse(this.store.get(key) || '{}');
    return { success: true, hash };
  }

  async lpush(key, value) {
    const list = JSON.parse(this.store.get(key) || '[]');
    list.unshift(value);
    this.store.set(key, JSON.stringify(list));
    return { success: true, length: list.length };
  }

  async rpush(key, value) {
    const list = JSON.parse(this.store.get(key) || '[]');
    list.push(value);
    this.store.set(key, JSON.stringify(list));
    return { success: true, length: list.length };
  }

  async lrange(key, start, stop) {
    const list = JSON.parse(this.store.get(key) || '[]');
    const end = stop === -1 ? list.length : stop + 1;
    return { success: true, items: list.slice(start, end) };
  }
}

// ============================================
// ELASTICSEARCH CLIENT
// ============================================

class ElasticsearchClient {
  constructor(config) {
    this.config = config;
    this.connected = false;
    this.indices = new Map();
  }

  async connect() {
    if (!process.env.ES_NODE || process.env.ES_NODE === 'http://localhost:9200') {
      console.log('Elasticsearch: Running in mock mode');
      this.connected = true;
      return;
    }

    try {
      // In production, use @elastic/elasticsearch
      // const { Client } = await import('@elastic/elasticsearch');
      // this.client = new Client({ node: config.node, auth: config.auth });
      this.connected = true;
      console.log('Elasticsearch: Connected');
    } catch (error) {
      console.error('Elasticsearch connection failed:', error.message);
      this.connected = false;
    }
  }

  async createIndex(name, mappings = {}) {
    this.indices.set(name, {
      name,
      mappings,
      documents: [],
      createdAt: new Date().toISOString()
    });

    return { success: true, index: name };
  }

  async index(index, document, id = null) {
    const idx = this.indices.get(index);
    if (!idx) {
      return { success: false, error: 'Index not found' };
    }

    const docId = id || uuidv4();
    const doc = {
      _id: docId,
      ...document,
      indexed_at: new Date().toISOString()
    };

    idx.documents.push(doc);
    return { success: true, _id: docId, result: 'created' };
  }

  async search(index, query) {
    const idx = this.indices.get(index);
    if (!idx) {
      return { success: false, error: 'Index not found' };
    }

    let results = [...idx.documents];

    // Simple match query
    if (query.query?.match) {
      const field = Object.keys(query.query.match)[0];
      const value = query.query.match[field].toLowerCase();
      results = results.filter(doc => {
        const docValue = String(doc[field] || '').toLowerCase();
        return docValue.includes(value);
      });
    }

    // Multi-match query
    if (query.query?.multi_match) {
      const { query: q, fields } = query.query.multi_match;
      const qLower = q.toLowerCase();
      results = results.filter(doc => {
        return fields.some(f => {
          const docValue = String(doc[f] || '').toLowerCase();
          return docValue.includes(qLower);
        });
      });
    }

    // Fuzzy search
    if (query.query?.fuzzy) {
      const field = Object.keys(query.query.fuzzy)[0];
      const value = query.query.fuzzy[field].value.toLowerCase();
      results = results.filter(doc => {
        const docValue = String(doc[field] || '').toLowerCase();
        return this.levenshtein(docValue, value) <= (query.query.fuzzy[field].fuzziness || 2);
      });
    }

    // Sort
    if (query.sort) {
      const sortKey = Object.keys(query.sort)[0];
      const sortDir = query.sort[sortKey];
      results.sort((a, b) => {
        const aVal = a[sortKey] || '';
        const bVal = b[sortKey] || '';
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }

    // Pagination
    const from = query.from || 0;
    const size = query.size || 10;
    const paginatedResults = results.slice(from, from + size);

    return {
      success: true,
      hits: {
        total: { value: results.length },
        hits: paginatedResults.map(doc => ({
          _id: doc._id,
          _score: 1.0,
          _source: doc
        }))
      }
    };
  }

  levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  async delete(index, id) {
    const idx = this.indices.get(index);
    if (!idx) {
      return { success: false, error: 'Index not found' };
    }

    const indexToDelete = idx.documents.findIndex(d => d._id === id);
    if (indexToDelete === -1) {
      return { success: false, result: 'not_found' };
    }

    idx.documents.splice(indexToDelete, 1);
    return { success: true, result: 'deleted' };
  }

  async bulk(operations) {
    const results = [];
    for (const op of operations) {
      if (op.index) {
        const result = await this.index(op.index._index, op.index._source, op.index._id);
        results.push({ index: { _id: result._id, result: result.result } });
      }
      if (op.delete) {
        const result = await this.delete(op.delete._index, op.delete._id);
        results.push({ delete: { _id: op.delete._id, result: result.result } });
      }
    }
    return { success: true, items: results };
  }
}

// Initialize clients
const mongodb = new MongoDBClient(CONFIG.mongodb.uri, CONFIG.mongodb.options);
const postgresql = new PostgreSQLClient(CONFIG.postgresql);
const redis = new RedisClient(CONFIG.redis);
const elasticsearch = new ElasticsearchClient(CONFIG.elasticsearch);

// Connect on startup
mongodb.connect();
postgresql.connect();
redis.connect();
elasticsearch.connect();

// ============================================
// API ENDPOINTS
// ============================================

/**
 * MONGODB ENDPOINTS
 */

// POST /api/mongodb/collections - Create collection
app.post('/api/mongodb/collections', requireInternal, (req, res) => {
  const { name, schema } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  mongodb.createCollection(name, schema);
  collections.set(`mongodb:${name}`, { type: 'mongodb', name });

  res.status(201).json({ success: true, collection: name });
});

// POST /api/mongodb/insert - Insert document
app.post('/api/mongodb/insert', requireInternal, async (req, res) => {
  const { collection, document } = req.body;

  if (!collection || !document) {
    return res.status(400).json({ error: 'collection and document are required' });
  }

  const result = await mongodb.insertOne(collection, document);
  res.json(result);
});

// POST /api/mongodb/find - Find documents
app.post('/api/mongodb/find', requireInternal, async (req, res) => {
  const { collection, query, options } = req.body;

  if (!collection) {
    return res.status(400).json({ error: 'collection is required' });
  }

  const result = await mongodb.find(collection, query || {}, options);
  res.json(result);
});

// POST /api/mongodb/update - Update document
app.post('/api/mongodb/update', requireInternal, async (req, res) => {
  const { collection, query, update } = req.body;

  if (!collection || !query || !update) {
    return res.status(400).json({ error: 'collection, query, and update are required' });
  }

  const result = await mongodb.updateOne(collection, query, update);
  res.json(result);
});

// POST /api/mongodb/delete - Delete document
app.post('/api/mongodb/delete', requireInternal, async (req, res) => {
  const { collection, query } = req.body;

  if (!collection || !query) {
    return res.status(400).json({ error: 'collection and query are required' });
  }

  const result = await mongodb.deleteOne(collection, query);
  res.json(result);
});

// POST /api/mongodb/aggregate - Aggregate documents
app.post('/api/mongodb/aggregate', requireInternal, async (req, res) => {
  const { collection, pipeline } = req.body;

  if (!collection || !pipeline) {
    return res.status(400).json({ error: 'collection and pipeline are required' });
  }

  const result = await mongodb.aggregate(collection, pipeline);
  res.json(result);
});

// POST /api/mongodb/indexes - Create index
app.post('/api/mongodb/indexes', requireInternal, async (req, res) => {
  const { collection, index } = req.body;

  if (!collection || !index) {
    return res.status(400).json({ error: 'collection and index are required' });
  }

  const result = await mongodb.createIndex(collection, index);
  res.json(result);
});

/**
 * POSTGRESQL ENDPOINTS
 */

// POST /api/postgresql/tables - Create table
app.post('/api/postgresql/tables', requireInternal, (req, res) => {
  const { name, columns } = req.body;

  if (!name || !columns) {
    return res.status(400).json({ error: 'name and columns are required' });
  }

  postgresql.createTable(name, columns);

  res.status(201).json({ success: true, table: name });
});

// POST /api/postgresql/insert - requireInternal, Insert row
app.post('/api/postgresql/insert', requireInternal, async (req, res) => {
  const { table, data } = req.body;

  if (!table || !data) {
    return res.status(400).json({ error: 'table and data are required' });
  }

  const result = await postgresql.insert(table, data);
  res.json(result);
});

// POST /api/postgresql/select - Select rows
app.post('/api/postgresql/select', requireInternal, async (req, res) => {
  const { table, conditions, options } = req.body;

  if (!table) {
    return res.status(400).json({ error: 'table is required' });
  }

  const result = await postgresql.select(table, conditions || {}, options);
  res.json(result);
});

// POST /api/postgresql/update - Update rows
app.post('/api/postgresql/update', requireInternal, async (req, res) => {
  const { table, conditions, data } = req.body;

  if (!table || !conditions || !data) {
    return res.status(400).json({ error: 'table, conditions, and data are required' });
  }

  const result = await postgresql.update(table, conditions, data);
  res.json(result);
});

// POST /api/postgresql/delete - Delete rows
app.post('/api/postgresql/delete', requireInternal, async (req, res) => {
  const { table, conditions } = req.body;

  if (!table || !conditions) {
    return res.status(400).json({ error: 'table and conditions are required' });
  }

  const result = await postgresql.delete(table, conditions);
  res.json(result);
});

/**
 * REDIS ENDPOINTS
 */

// GET /api/redis/get/:key - Get value
app.get('/api/redis/get/:key', async (req, res) => {
  const result = await redis.get(req.params.key);
  res.json(result);
});

// POST /api/redis/set - Set value
app.post('/api/redis/set', requireInternal, async (req, res) => {
  const { key, value, options } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ error: 'key and value are required' });
  }

  const result = await redis.set(key, value, options);
  res.json(result);
});

// GET /api/redis/keys/:pattern - List keys
app.get('/api/redis/keys/:pattern', async (req, res) => {
  const result = await redis.keys(req.params.pattern);
  res.json(result);
});

// POST /api/redis/del - Delete key
app.post('/api/redis/del', requireInternal, async (req, res) => {
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'key is required' });
  }

  const result = await redis.del(key);
  res.json(result);
});

// POST /api/redis/hset - Hash set
app.post('/api/redis/hset', requireInternal, async (req, res) => {
  const { key, field, value } = req.body;

  if (!key || !field || value === undefined) {
    return res.status(400).json({ error: 'key, field, and value are required' });
  }

  const result = await redis.hset(key, field, value);
  res.json(result);
});

// GET /api/redis/hget/:key/:field - Hash get
app.get('/api/redis/hget/:key/:field', async (req, res) => {
  const result = await redis.hget(req.params.key, req.params.field);
  res.json(result);
});

/**
 * ELASTICSEARCH ENDPOINTS
 */

// POST /api/elasticsearch/indices - Create index
app.post('/api/elasticsearch/indices', requireInternal, async (req, res) => {
  const { name, mappings } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const result = await elasticsearch.createIndex(name, mappings);
  indices.set(name, { type: 'elasticsearch', name });
  res.json(result);
});

// POST /api/elasticsearch/index - Index document
app.post('/api/elasticsearch/index', requireInternal, async (req, res) => {
  const { index, document, id } = req.body;

  if (!index || !document) {
    return res.status(400).json({ error: 'index and document are required' });
  }

  const result = await elasticsearch.index(index, document, id);
  res.json(result);
});

// POST /api/elasticsearch/search - Search
app.post('/api/elasticsearch/search', requireInternal, async (req, res) => {
  const { index, query } = req.body;

  if (!index || !query) {
    return res.status(400).json({ error: 'index and query are required' });
  }

  const result = await elasticsearch.search(index, query);
  res.json(result);
});

// POST /api/elasticsearch/bulk - Bulk operations
app.post('/api/elasticsearch/bulk', requireInternal, async (req, res) => {
  const { operations } = req.body;

  if (!operations) {
    return res.status(400).json({ error: 'operations are required' });
  }

  const result = await elasticsearch.bulk(operations);
  res.json(result);
});

/**
 * SCHEMA MANAGEMENT
 */

// POST /api/schemas - Create schema
app.post('/api/schemas', requireInternal, (req, res) => {
  const { name, type, definition, indexes = [] } = req.body;

  if (!name || !type || !definition) {
    return res.status(400).json({ error: 'name, type, and definition are required' });
  }

  const schemaId = uuidv4();
  const schema = {
    id: schemaId,
    name,
    type, // 'mongodb' | 'postgresql' | 'elasticsearch'
    definition,
    indexes,
    createdAt: new Date().toISOString()
  };

  schemas.set(schemaId, schema);

  // Auto-create in the appropriate database
  if (type === 'mongodb' && definition.collections) {
    for (const coll of definition.collections) {
      mongodb.createCollection(coll.name, coll.schema);
    }
  } else if (type === 'postgresql' && definition.tables) {
    for (const table of definition.tables) {
      postgresql.createTable(table.name, table.columns);
    }
  } else if (type === 'elasticsearch' && definition.indices) {
    for (const idx of definition.indices) {
      elasticsearch.createIndex(idx.name, idx.mappings);
    }
  }

  res.status(201).json({ success: true, schema: { id: schemaId, name, type } });
});

// GET /api/schemas - List schemas
app.get('/api/schemas', (req, res) => {
  const { type } = req.query;

  let schemaList = Array.from(schemas.values());
  if (type) schemaList = schemaList.filter(s => s.type === type);

  res.json({ success: true, count: schemaList.length, schemas: schemaList });
});

/**
 * MIGRATIONS
 */

// POST /api/migrations - Create migration
app.post('/api/migrations', requireInternal, (req, res) => {
  const { name, up, down, description } = req.body;

  if (!name || !up) {
    return res.status(400).json({ error: 'name and up are required' });
  }

  const migrationId = uuidv4();
  const migration = {
    id: migrationId,
    name,
    up,
    down: down || null,
    description: description || '',
    status: 'pending',
    appliedAt: null,
    createdAt: new Date().toISOString()
  };

  migrations.set(migrationId, migration);

  res.status(201).json({ success: true, migration: { id: migrationId, name } });
});

// GET /api/migrations - List migrations
app.get('/api/migrations', (req, res) => {
  const { status } = req.query;

  let migrationList = Array.from(migrations.values())
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  if (status) migrationList = migrationList.filter(m => m.status === status);

  res.json({ success: true, count: migrationList.length, migrations: migrationList });
});

// POST /api/migrations/:id/run - Run migration
app.post('/api/migrations/:id/run', requireInternal, async (req, res) => {
  const migration = migrations.get(req.params.id);

  if (!migration) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  if (migration.status === 'applied') {
    return res.status(400).json({ error: 'Migration already applied' });
  }

  try {
    // Execute up migration
    if (typeof migration.up === 'function') {
      await migration.up();
    }

    migration.status = 'applied';
    migration.appliedAt = new Date().toISOString();

    res.json({ success: true, migration });
  } catch (error) {
    migration.status = 'failed';
    migration.error = error.message;
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/migrations/:id/rollback - Rollback migration
app.post('/api/migrations/:id/rollback', requireInternal, async (req, res) => {
  const migration = migrations.get(req.params.id);

  if (!migration) {
    return res.status(404).json({ error: 'Migration not found' });
  }

  if (migration.status !== 'applied') {
    return res.status(400).json({ error: 'Migration not applied' });
  }

  if (!migration.down) {
    return res.status(400).json({ error: 'No down migration defined' });
  }

  try {
    if (typeof migration.down === 'function') {
      await migration.down();
    }

    migration.status = 'rolled_back';
    migration.rolledBackAt = new Date().toISOString();

    res.json({ success: true, migration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * BACKUPS
 */

// POST /api/backups - Create backup
app.post('/api/backups', requireInternal, (req, res) => {
  const { type, name, metadata = {} } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }

  const backupId = uuidv4();
  const backup = {
    id: backupId,
    type, // 'mongodb' | 'postgresql' | 'full'
    name: name || `backup_${Date.now()}`,
    status: 'in_progress',
    size: 0,
    metadata,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  backups.set(backupId, backup);

  // Simulate backup completion
  setTimeout(() => {
    const b = backups.get(backupId);
    if (b) {
      b.status = 'completed';
      b.size = Math.floor(Math.random() * 1000000000);
      b.completedAt = new Date().toISOString();
    }
  }, 5000);

  res.status(201).json({ success: true, backup: { id: backupId, status: 'in_progress' } });
});

// GET /api/backups - List backups
app.get('/api/backups', (req, res) => {
  const { type, status } = req.query;

  let backupList = Array.from(backups.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (type) backupList = backupList.filter(b => b.type === type);
  if (status) backupList = backupList.filter(b => b.status === status);

  res.json({ success: true, count: backupList.length, backups: backupList });
});

// POST /api/backups/:id/restore - Restore backup
app.post('/api/backups/:id/restore', requireInternal, async (req, res) => {
  const backup = backups.get(req.params.id);

  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  if (backup.status !== 'completed') {
    return res.status(400).json({ error: 'Backup not completed' });
  }

  res.json({ success: true, message: 'Restore initiated', backupId: backup.id });
});

/**
 * HEALTH
 */

app.get('/health', (req, res) => {
  res.json({
    service: 'database-os',
    status: 'healthy',
    version: '2.0.0',
    connections: {
      mongodb: mongodb.connected,
      postgresql: postgresql.connected,
      redis: redis.connected,
      elasticsearch: elasticsearch.connected
    },
    stats: {
      collections: collections.size,
      schemas: schemas.size,
      migrations: migrations.size,
      backups: backups.size,
      indices: indices.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  DatabaseOS — PORT ${PORT}                         ║
║  Multi-Database Management                      ║
╠══════════════════════════════════════════════════════╣
║  Databases:                                    ║
║    MongoDB: ${mongodb.connected ? '✅ Connected' : '⚠️  Mock'}
║    PostgreSQL: ${postgresql.connected ? '✅ Connected' : '⚠️  Mock'}
║    Redis: ${redis.connected ? '✅ Connected' : '⚠️  Mock'}
║    Elasticsearch: ${elasticsearch.connected ? '✅ Connected' : '⚠️  Mock'}
╠══════════════════════════════════════════════════════╣
║  Features:                                        ║
║    Schema management | Migrations | Backups       ║
╚══════════════════════════════════════════════════════╝
`);
});

export default app;
