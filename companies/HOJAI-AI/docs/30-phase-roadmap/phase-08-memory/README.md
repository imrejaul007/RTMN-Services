# Phase 8: Memory & Context Production-Readiness

**Duration:** 1 week (Week 13)
**Priority:** P2 (Medium)
**Owner:** Senior Engineer

---

## Goal

Production-grade memory layer with PostgreSQL backend, confidence tracking, and consolidation.

---

## Deliverables

### 8.1 Build Memory Substrate (PostgreSQL)

**File:** `platform/memory/memory-substrate/` (currently EMPTY)

**Tasks:**

1. Create PostgreSQL backend with pgvector
2. Implement migration from PersistentMap
3. Add backup/restore endpoints
4. Add replication (read replicas)

**Implementation:**

```javascript
import { Pool } from 'pg';
import pgvector from 'pgvector';

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'hojai_memory',
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max: 20
});

// Create memories table with vector column
await pool.query(`
  CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB,
    confidence FLOAT DEFAULT 1.0,
    importance FLOAT DEFAULT 0.5,
    access_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP,
    expires_at TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS memories_user_id_idx ON memories(user_id);
  CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);
`);

// Store memory
app.post('/api/memories', async (req, res) => {
  const { userId, content, embedding, metadata, confidence } = req.body;

  const result = await pool.query(
    `INSERT INTO memories (id, user_id, content, embedding, metadata, confidence)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, content, pgvector.toSql(embedding), metadata, confidence]
  );

  res.json(result.rows[0]);
});

// Vector search
app.post('/api/memories/search', async (req, res) => {
  const { userId, embedding, limit = 10, threshold = 0.7 } = req.body;

  const result = await pool.query(
    `SELECT *, 1 - (embedding <=> $1) AS similarity
     FROM memories
     WHERE user_id = $2 AND 1 - (embedding <=> $1) > $3
     ORDER BY similarity DESC
     LIMIT $4`,
    [pgvector.toSql(embedding), userId, threshold, limit]
  );

  res.json(result.rows);
});
```

---

### 8.2 Add Memory Confidence Tracking

**File:** `platform/memory/memory-confidence/src/index.js`

**Tasks:**

1. Implement confidence formula: `base × decay × contradiction`
2. Track per-fact confidence
3. Surface low-confidence facts
4. Add confidence metrics

**Implementation:**

```javascript
// Confidence calculation
function calculateConfidence(memory) {
  const baseConfidence = memory.confidence || 1.0;

  // Time decay: confidence decreases over time
  const ageInDays = (Date.now() - new Date(memory.created_at)) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.exp(-ageInDays / 365); // Half-life of 1 year

  // Contradiction factor: reduces confidence if contradicted
  const contradictionFactor = memory.contradicted ? 0.3 : 1.0;

  // Access boost: frequently accessed memories get confidence boost
  const accessBoost = Math.min(1.2, 1 + (memory.access_count / 100) * 0.2);

  return baseConfidence * decayFactor * contradictionFactor * accessBoost;
}

// Update confidence periodically
setInterval(async () => {
  const memories = await pool.query('SELECT * FROM memories');

  for (const memory of memories.rows) {
    const newConfidence = calculateConfidence(memory);

    await pool.query(
      'UPDATE memories SET confidence = $1 WHERE id = $2',
      [newConfidence, memory.id]
    );
  }
}, 24 * 60 * 60 * 1000); // Daily
```

---

### 8.3 Build Memory Consolidation

**File:** `platform/memory/memory-os/src/consolidation.js`

**Tasks:**

1. Daily job: merge duplicate memories
2. Archive memories older than 2 years
3. Compress long-term memories
4. Generate health report

**Implementation:**

```javascript
import cron from 'node-cron';

// Daily consolidation at 3am
cron.schedule('0 3 * * *', async () => {
  logger.info('Starting memory consolidation');

  // 1. Find duplicates
  const duplicates = await pool.query(`
    SELECT user_id, content, COUNT(*) as count, array_agg(id) as ids
    FROM memories
    GROUP BY user_id, content
    HAVING COUNT(*) > 1
  `);

  for (const dup of duplicates.rows) {
    // Keep the one with highest confidence, merge metadata
    const ids = dup.ids;
    const keepId = ids[0]; // TODO: pick by confidence
    const removeIds = ids.slice(1);

    await pool.query('DELETE FROM memories WHERE id = ANY($1)', [removeIds]);
  }

  // 2. Archive old memories
  const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
  await pool.query(
    'UPDATE memories SET archived = true WHERE created_at < $1',
    [twoYearsAgo]
  );

  // 3. Compress long memories
  const longMemories = await pool.query(
    "SELECT * FROM memories WHERE length(content) > 2000 AND importance < 0.7"
  );

  for (const memory of longMemories.rows) {
    const summary = await inferenceGateway.complete({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Summarize this in 100 words: ${memory.content}`
      }],
      maxTokens: 150
    });

    await pool.query(
      'UPDATE memories SET content = $1 WHERE id = $2',
      [summary.content, memory.id]
    );
  }

  logger.info('Memory consolidation complete');
});
```

---

## Success Criteria

✅ PostgreSQL backend deployed with pgvector
✅ Migration from PersistentMap complete
✅ Confidence tracking working
✅ Daily consolidation runs
✅ 30% memory reduction without data loss

---

*Phase 8 documentation: 2026-06-22*