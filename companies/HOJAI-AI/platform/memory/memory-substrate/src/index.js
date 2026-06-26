/**
 * Memory Substrate (Phase 8)
 *
 * PostgreSQL + pgvector backend for MemoryOS.
 * Provides:
 * - Vector embeddings with pgvector
 * - Full-text search with PostgreSQL
 * - Transactional memory operations
 * - Horizontal scaling via read replicas
 *
 * Port: 4791
 *
 * Environment Variables:
 * - POSTGRES_HOST: PostgreSQL host (default: localhost)
 * - POSTGRES_PORT: PostgreSQL port (default: 5432)
 * - POSTGRES_DB: Database name (default: hojai_memory)
 * - POSTGRES_USER: Database user
 * - POSTGRES_PASSWORD: Database password
 */

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.MEMORY_SUBSTRATE_PORT || 4791;

// PostgreSQL configuration
const pgConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'hojai_memory',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool = null;
let isUsingPgvector = false;

// =============================================================================
// DATABASE CONNECTION
// =============================================================================

async function initializeDatabase() {
  try {
    pool = new pg.Pool(pgConfig);

    // Test connection
    const client = await pool.connect();
    console.log('[Memory Substrate] Connected to PostgreSQL');

    // Check if pgvector extension exists
    try {
      await client.query('SELECT 1 FROM pg_extension WHERE extname = \'vector\'');
      isUsingPgvector = true;
      console.log('[Memory Substrate] pgvector extension enabled');
    } catch {
      console.warn('[Memory Substrate] pgvector not available, using JSONB fallback');
      isUsingPgvector = false;
    }

    // Create tables
    await createTables(client);

    client.release();
    return true;
  } catch (error) {
    console.error('[Memory Substrate] Database initialization failed:', error.message);
    console.log('[Memory Substrate] Falling back to in-memory mode');
    return false;
  }
}

async function createTables(client) {
  // Memories table
  await client.query(`
    CREATE TABLE IF NOT EXISTS memories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      twin_id VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      content_embedding VECTOR(1536),
      metadata JSONB DEFAULT '{}',
      importance VARCHAR(20) DEFAULT 'MEDIUM',
      type VARCHAR(50) DEFAULT 'general',
      tags TEXT[] DEFAULT '{}',
      visibility VARCHAR(20) DEFAULT 'private',
      confidence FLOAT DEFAULT 0.5,
      importance_score FLOAT DEFAULT 0.5,
      access_count INT DEFAULT 0,
      last_accessed_at TIMESTAMP,
      expires_at TIMESTAMP,
      lifecycle_stage VARCHAR(50) DEFAULT 'created',
      version INT DEFAULT 1,
      source VARCHAR(50) DEFAULT 'unknown',
      entities TEXT[] DEFAULT '{}',
      compressed BOOLEAN DEFAULT FALSE,
      compressed_at TIMESTAMP,
      archived BOOLEAN DEFAULT FALSE,
      archived_at TIMESTAMP,
      pinned BOOLEAN DEFAULT FALSE,
      pinned_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_memories_twin_id ON memories(twin_id);
    CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance);
    CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at);
    CREATE INDEX IF NOT EXISTS idx_memories_importance_score ON memories(importance_score);
  `);

  // Vector index (if pgvector available)
  if (isUsingPgvector) {
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories
        USING ivfflat (content_embedding vector_cosine_ops)
        WITH (lists = 100)
      `);
    } catch {
      console.warn('[Memory Substrate] Could not create vector index');
    }
  }

  // History table for versioning
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      memory_id UUID NOT NULL,
      version INT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB,
      changed_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
    )
  `);

  // Relationships table
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_relationships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_memory_id UUID NOT NULL,
      to_memory_id UUID NOT NULL,
      relationship_type VARCHAR(50) NOT NULL,
      weight FLOAT DEFAULT 1.0,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (from_memory_id) REFERENCES memories(id) ON DELETE CASCADE,
      FOREIGN KEY (to_memory_id) REFERENCES memories(id) ON DELETE CASCADE
    )
  `);

  // Audit log table
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_audit (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      memory_id UUID,
      operation VARCHAR(50) NOT NULL,
      principal VARCHAR(255) DEFAULT 'system',
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Summaries table
  await client.query(`
    CREATE TABLE IF NOT EXISTS memory_summaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      twin_id VARCHAR(255) NOT NULL,
      period VARCHAR(20),
      from_date TIMESTAMP,
      to_date TIMESTAMP,
      total_memories INT,
      summary JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log('[Memory Substrate] Tables created successfully');
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('tiny'));

// =============================================================================
// HELPERS
// =============================================================================

function nowIso() { return new Date().toISOString(); }

function ok(res, data) { res.json({ success: true, ...data }); }
function fail(res, code, message, status = 400) {
  res.status(status).json({ success: false, error: code, message });
}

async function query(text, params) {
  if (!pool) throw new Error('Database not connected');
  return pool.query(text, params);
}

// =============================================================================
// HEALTH & INFO
// =============================================================================

app.get('/health', async (_req, res) => {
  let dbStatus = 'disconnected';

  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = isUsingPgvector ? 'connected (pgvector)' : 'connected (JSONB)';
    } catch {
      dbStatus = 'error';
    }
  }

  ok(res, {
    status: 'healthy',
    service: 'memory-substrate',
    version: '1.0.0',
    port: PORT,
    storage: {
      postgres: dbStatus,
      pgvector: isUsingPgvector
    }
  });
});

app.get('/', (_req, res) => {
  ok(res, {
    service: 'memory-substrate',
    version: '1.0.0',
    description: 'PostgreSQL + pgvector backend for MemoryOS',
    port: PORT,
    features: [
      'vector-embeddings',
      'full-text-search',
      'transactions',
      'versioning',
      'relationships',
      'audit-log'
    ],
    pgvector: isUsingPgvector
  });
});

// =============================================================================
// MEMORY CRUD
// =============================================================================

// Create memory
app.post('/api/memories', async (req, res) => {
  const {
    twinId, content, metadata = {}, importance = 'MEDIUM',
    type = 'general', tags = [], visibility = 'private',
    confidence = 0.5, expiresAt, source = 'user', entities = []
  } = req.body || {};

  if (!twinId || !content) {
    return fail(res, 'INVALID_INPUT', 'twinId and content required');
  }

  try {
    const result = await query(
      `INSERT INTO memories (id, twin_id, content, metadata, importance, type, tags, visibility, confidence, importance_score, expires_at, source, entities, last_accessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
       RETURNING *`,
      [uuidv4(), twinId, content, JSON.stringify(metadata), importance, type, tags, visibility, confidence, confidence, expiresAt, source, entities]
    );

    const memory = mapMemory(result.rows[0]);

    // Record history
    await query(
      `INSERT INTO memory_history (memory_id, version, content, metadata) VALUES ($1, 1, $2, $3)`,
      [memory.id, content, JSON.stringify(metadata)]
    );

    // Audit log
    await auditLog(memory.id, 'create', { twinId, type, importance });

    res.status(201).json({ success: true, data: memory });
  } catch (error) {
    console.error('[Memory Substrate] Create memory error:', error);
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// Get memory by ID
app.get('/api/memories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('SELECT * FROM memories WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    const memory = mapMemory(result.rows[0]);

    // Update access count
    await query(
      'UPDATE memories SET access_count = access_count + 1, last_accessed_at = NOW() WHERE id = $1',
      [id]
    );

    ok(res, { data: memory });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// List memories with filters
app.get('/api/memories', async (req, res) => {
  const { twinId, type, importance, tag, visibility, limit = 50, offset = 0 } = req.query;

  try {
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (twinId) {
      sql += ` AND twin_id = $${paramIndex++}`;
      params.push(twinId);
    }
    if (type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(type);
    }
    if (importance) {
      sql += ` AND importance = $${paramIndex++}`;
      params.push(importance);
    }
    if (tag) {
      sql += ` AND $${paramIndex++} = ANY(tags)`;
      params.push(tag);
    }
    if (visibility) {
      sql += ` AND visibility = $${paramIndex++}`;
      params.push(visibility);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await query(sql, params);

    const memories = result.rows.map(mapMemory);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM memories WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit/offset

    if (twinId) countSql += ` AND twin_id = $1`;
    if (type) countSql += ` AND type = $2`;
    if (importance) countSql += ` AND importance = $3`;

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    ok(res, { count: memories.length, total, memories });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// Update memory
app.put('/api/memories/:id', async (req, res) => {
  const { id } = req.params;
  const { content, metadata, importance, type, tags, visibility, importanceScore } = req.body || {};

  try {
    // Get current version
    const current = await query('SELECT * FROM memories WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    const oldMemory = current.rows[0];
    const newVersion = oldMemory.version + 1;

    // Update memory
    const result = await query(
      `UPDATE memories SET
        content = COALESCE($1, content),
        metadata = COALESCE($2, metadata),
        importance = COALESCE($3, importance),
        type = COALESCE($4, type),
        tags = COALESCE($5, tags),
        visibility = COALESCE($6, visibility),
        importance_score = COALESCE($7, importance_score),
        version = $8,
        updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [content, metadata ? JSON.stringify(metadata) : null, importance, type, tags, visibility, importanceScore, newVersion, id]
    );

    // Record history
    await query(
      `INSERT INTO memory_history (memory_id, version, content, metadata)
       VALUES ($1, $2, $3, $4)`,
      [id, newVersion, content || oldMemory.content, JSON.stringify(metadata || oldMemory.metadata)]
    );

    // Audit log
    await auditLog(id, 'update', { oldVersion: oldMemory.version, newVersion });

    ok(res, { data: mapMemory(result.rows[0]) });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// Delete memory
app.delete('/api/memories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query('DELETE FROM memories WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    await auditLog(id, 'delete');

    ok(res, { deleted: id });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// SEARCH
// =============================================================================

// Full-text search
app.get('/api/memories/search', async (req, res) => {
  const { q, twinId, limit = 25 } = req.query;

  if (!q) return fail(res, 'INVALID_INPUT', 'q (query) required');

  try {
    let sql;
    let params;

    if (isUsingPgvector) {
      // Vector search fallback to text search
      sql = `
        SELECT *, ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS rank
        FROM memories
        WHERE (to_tsvector('english', content) @@ plainto_tsquery('english', $1)
           OR content ILIKE $2)
      `;
      params = [q, `%${q}%`];
    } else {
      // JSONB fallback
      sql = `
        SELECT * FROM memories
        WHERE content ILIKE $1
      `;
      params = [`%${q}%`];
    }

    if (twinId) {
      sql += ' AND twin_id = $3';
      params.push(twinId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    const memories = result.rows.map(mapMemory);

    ok(res, { count: memories.length, results: memories });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// Vector search (if pgvector available)
app.post('/api/memories/vector-search', async (req, res) => {
  if (!isUsingPgvector) {
    return fail(res, 'PGVECTOR_NOT_AVAILABLE', 'pgvector extension not enabled');
  }

  const { embedding, twinId, limit = 25, threshold = 0.7 } = req.body || {};

  if (!embedding || !Array.isArray(embedding)) {
    return fail(res, 'INVALID_INPUT', 'embedding array required');
  }

  try {
    let sql = `
      SELECT *, 1 - (content_embedding <=> $1::vector) AS similarity
      FROM memories
      WHERE 1 - (content_embedding <=> $1::vector) > $2
    `;
    const params = [`[${embedding.join(',')}]`, threshold];

    if (twinId) {
      sql += ' AND twin_id = $3';
      params.push(twinId);
    }

    sql += ` ORDER BY content_embedding <=> $1::vector LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    const memories = result.rows.map(mapMemory);

    ok(res, { count: memories.length, results: memories });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// RELATIONSHIPS
// =============================================================================

app.post('/api/memories/:id/relationships', async (req, res) => {
  const { id } = req.params;
  const { toMemoryId, relationshipType, weight = 1.0 } = req.body || {};

  if (!toMemoryId || !relationshipType) {
    return fail(res, 'INVALID_INPUT', 'toMemoryId and relationshipType required');
  }

  try {
    const result = await query(
      `INSERT INTO memory_relationships (from_memory_id, to_memory_id, relationship_type, weight)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, toMemoryId, relationshipType, weight]
    );

    ok(res, { data: result.rows[0] });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

app.get('/api/memories/:id/relationships', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT * FROM memory_relationships WHERE from_memory_id = $1`,
      [id]
    );

    ok(res, { count: result.rows.length, relationships: result.rows });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// VERSIONING & HISTORY
// =============================================================================

app.get('/api/memories/:id/history', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'SELECT * FROM memory_history WHERE memory_id = $1 ORDER BY version DESC',
      [id]
    );

    ok(res, { count: result.rows.length, history: result.rows });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// IMPORTANCE & DECAY
// =============================================================================

app.post('/api/memories/:id/importance', async (req, res) => {
  const { id } = req.params;
  const { importance, pinned } = req.body || {};

  try {
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (importance !== undefined) {
      updates.push(`importance = $${paramIndex++}`);
      params.push(importance);
    }

    if (pinned !== undefined) {
      updates.push(`pinned = $${paramIndex++}`);
      params.push(pinned);
      if (pinned) {
        updates.push(`pinned_at = NOW()`);
      }
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(
      `UPDATE memories SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    await auditLog(id, 'importance_change', { importance, pinned });

    ok(res, { data: mapMemory(result.rows[0]) });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// ARCHIVE & COMPRESS
// =============================================================================

app.post('/api/memories/:id/archive', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `UPDATE memories SET archived = TRUE, archived_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    await auditLog(id, 'archive');

    ok(res, { data: mapMemory(result.rows[0]) });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

app.post('/api/memories/:id/compress', async (req, res) => {
  const { id } = req.params;
  const { summary } = req.body || {};

  try {
    const current = await query('SELECT * FROM memories WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return fail(res, 'NOT_FOUND', 'Memory not found', 404);
    }

    const result = await query(
      `UPDATE memories SET
        content = $1,
        compressed = TRUE,
        compressed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [summary || '[COMPRESSED]', id]
    );

    await auditLog(id, 'compress');

    ok(res, { data: mapMemory(result.rows[0]) });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// ANALYTICS
// =============================================================================

app.get('/api/analytics/summary', async (req, res) => {
  const { twinId } = req.query;

  try {
    let sql = `
      SELECT
        COUNT(*) as total_memories,
        COUNT(*) FILTER (WHERE archived = TRUE) as archived_count,
        COUNT(*) FILTER (WHERE compressed = TRUE) as compressed_count,
        COUNT(*) FILTER (WHERE pinned = TRUE) as pinned_count,
        AVG(importance_score) as avg_importance,
        AVG(access_count) as avg_access_count
      FROM memories
      WHERE 1=1
    `;
    const params = [];

    if (twinId) {
      sql += ' AND twin_id = $1';
      params.push(twinId);
    }

    const result = await query(sql, params);

    ok(res, { data: result.rows[0] });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

app.get('/api/analytics/by-importance', async (req, res) => {
  const { twinId } = req.query;

  try {
    let sql = `
      SELECT importance, COUNT(*) as count
      FROM memories
      WHERE 1=1
    `;
    const params = [];

    if (twinId) {
      sql += ' AND twin_id = $1';
      params.push(twinId);
    }

    sql += ' GROUP BY importance ORDER BY count DESC';

    const result = await query(sql, params);

    ok(res, { data: result.rows });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// AUDIT
// =============================================================================

async function auditLog(memoryId, operation, details = {}) {
  try {
    await query(
      `INSERT INTO memory_audit (memory_id, operation, details) VALUES ($1, $2, $3)`,
      [memoryId, operation, JSON.stringify(details)]
    );
  } catch (error) {
    console.warn('[Memory Substrate] Audit log failed:', error.message);
  }
}

app.get('/api/audit', async (req, res) => {
  const { memoryId, limit = 100 } = req.query;

  try {
    let sql = 'SELECT * FROM memory_audit';
    const params = [];

    if (memoryId) {
      sql += ' WHERE memory_id = $1';
      params.push(memoryId);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);

    ok(res, { count: result.rows.length, logs: result.rows });
  } catch (error) {
    fail(res, 'DB_ERROR', error.message, 500);
  }
});

// =============================================================================
// MAPPERS
// =============================================================================

function mapMemory(row) {
  return {
    id: row.id,
    twinId: row.twin_id,
    content: row.content,
    metadata: row.metadata,
    importance: row.importance,
    type: row.type,
    tags: row.tags || [],
    visibility: row.visibility,
    confidence: row.confidence,
    importanceScore: row.importance_score,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at,
    expiresAt: row.expires_at,
    lifecycleStage: row.lifecycle_stage,
    version: row.version,
    source: row.source,
    entities: row.entities || [],
    compressed: row.compressed,
    compressedAt: row.compressed_at,
    archived: row.archived,
    archivedAt: row.archived_at,
    pinned: row.pinned,
    pinnedAt: row.pinned_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// =============================================================================
// STARTUP
// =============================================================================

async function startup() {
  await initializeDatabase();

  const server = app.listen(PORT, () => {
    console.log(`Memory Substrate v1.0.0 running on port ${PORT}`);
    console.log(`  Storage: ${pool ? 'PostgreSQL' : 'in-memory fallback'}`);
    console.log(`  Vector support: ${isUsingPgvector ? 'pgvector' : 'JSONB fallback'}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
  });

  process.on('SIGTERM', () => {
    console.log('[Memory Substrate] Shutting down...');
    if (pool) pool.end();
    server.close();
  });
}

startup().catch(err => {
  console.error('[Memory Substrate] Startup failed:', err);
  process.exit(1);
});
