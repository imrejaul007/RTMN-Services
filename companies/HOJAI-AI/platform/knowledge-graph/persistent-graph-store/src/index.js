/**
 * KnowledgeOS Persistent Graph Store
 * Port: 4750
 *
 * PostgreSQL/pgvector-backed property graph database with:
 *   - Nodes (9 types: PERSON, ORGANIZATION, LOCATION, PRODUCT, SERVICE, CONCEPT, DOCUMENT, EVENT, PLACE)
 *   - Edges (WORKS_FOR, LOCATED_IN, PRODUCE, SELL, KNOWS, REPORTED_BY)
 *   - JSONB properties, vector embeddings, timestamps, source tracking
 *   - Graph traversal: BFS, DFS, shortest path
 *   - Vector similarity search via pgvector
 *   - JWT authentication
 *
 * @author HOJAI AI
 * @version 1.0.0
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';

const { Pool } = pg;

const app = express();
const PORT = process.env.PORT || 4750;
const SERVICE_NAME = 'knowledge-graph-persistent';
const VERSION = '1.0.0';

// Database configuration
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'knowledge_graph',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Node types
const NODE_TYPES = [
  'PERSON', 'ORGANIZATION', 'LOCATION', 'PRODUCT',
  'SERVICE', 'CONCEPT', 'DOCUMENT', 'EVENT', 'PLACE'
];

// Edge types
const EDGE_TYPES = [
  'WORKS_FOR', 'LOCATED_IN', 'PRODUCE', 'SELL',
  'KNOWS', 'REPORTED_BY'
];

// Statistics
const stats = {
  nodesCreated: 0,
  nodesUpdated: 0,
  nodesDeleted: 0,
  edgesCreated: 0,
  edgesDeleted: 0,
  traversals: 0,
  searches: 0,
  errors: 0,
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ready: true, timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ready: false, error: err.message });
  }
});

// JWT Authentication middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  // In production, validate JWT here. For now, accept any Bearer token.
  req.user = { id: 'authenticated' };
  next();
}

// Database initialization
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create extension for UUID
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Enable pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector');

    // Create nodes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS nodes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        type VARCHAR(50) NOT NULL,
        name VARCHAR(500) NOT NULL,
        properties JSONB DEFAULT '{}',
        embedding VECTOR(1536),
        source VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_node_type CHECK (type IN ('PERSON', 'ORGANIZATION', 'LOCATION', 'PRODUCT', 'SERVICE', 'CONCEPT', 'DOCUMENT', 'EVENT', 'PLACE'))
      )
    `);

    // Create edges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS edges (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        source_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        properties JSONB DEFAULT '{}',
        weight DECIMAL(5,2) DEFAULT 1.0,
        source VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT valid_edge_type CHECK (type IN ('WORKS_FOR', 'LOCATED_IN', 'PRODUCE', 'SELL', 'KNOWS', 'REPORTED_BY')),
        CONSTRAINT no_self_loop CHECK (source_id != target_id)
      )
    `);

    // Create indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_nodes_embedding ON nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_nodes_properties ON nodes USING gin(properties)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edges_source ON edges(source_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edges_target ON edges(target_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_edges_properties ON edges USING gin(properties)');

    // Create function to update updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger for nodes
    await client.query(`DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes`);
    await client.query(`
      CREATE TRIGGER update_nodes_updated_at
      BEFORE UPDATE ON nodes
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    `);

    console.log(`[${SERVICE_NAME}] Database initialized successfully`);
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Database initialization error:`, err.message);
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * Create a new node
 * POST /nodes
 */
app.post('/nodes', requireAuth, async (req, res) => {
  try {
    const { type, name, properties = {}, embedding, source } = req.body;

    if (!type || !NODE_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid node type. Must be one of: ${NODE_TYPES.join(', ')}`,
      });
    }

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required and must be a string' });
    }

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO nodes (id, type, name, properties, embedding, source)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, type, name, JSON.stringify(properties), embedding || null, source || null]
    );

    stats.nodesCreated++;
    res.status(201).json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    console.error('Node creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get node by ID
 * GET /nodes/:id
 */
app.get('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM nodes WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all nodes with optional filters
 * GET /nodes?type=PERSON&limit=50&offset=0
 */
app.get('/nodes', async (req, res) => {
  try {
    const { type, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM nodes';
    const params = [];

    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    const countResult = await pool.query(
      type ? 'SELECT COUNT(*) FROM nodes WHERE type = $1' : 'SELECT COUNT(*) FROM nodes',
      type ? [type] : []
    );

    res.json({
      nodes: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update a node
 * PUT /nodes/:id
 */
app.put('/nodes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, name, properties, embedding, source } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (type !== undefined) {
      if (!NODE_TYPES.includes(type)) {
        return res.status(400).json({
          error: `Invalid node type. Must be one of: ${NODE_TYPES.join(', ')}`,
        });
      }
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (properties !== undefined) {
      updates.push(`properties = $${paramIndex++}`);
      values.push(JSON.stringify(properties));
    }

    if (embedding !== undefined) {
      updates.push(`embedding = $${paramIndex++}`);
      values.push(embedding);
    }

    if (source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(source);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE nodes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    stats.nodesUpdated++;
    res.json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete a node
 * DELETE /nodes/:id
 */
app.delete('/nodes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM nodes WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    stats.nodesDeleted++;
    res.json({ message: 'Node deleted', id: result.rows[0].id });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// EDGE OPERATIONS
// ============================================================================

/**
 * Create a new edge
 * POST /edges
 */
app.post('/edges', requireAuth, async (req, res) => {
  try {
    const { sourceId, targetId, type, properties = {}, weight = 1.0, source } = req.body;

    if (!sourceId || !targetId) {
      return res.status(400).json({ error: 'sourceId and targetId are required' });
    }

    if (!type || !EDGE_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid edge type. Must be one of: ${EDGE_TYPES.join(', ')}`,
      });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ error: 'Self-loops are not allowed' });
    }

    // Verify both nodes exist
    const sourceNode = await pool.query('SELECT id FROM nodes WHERE id = $1', [sourceId]);
    const targetNode = await pool.query('SELECT id FROM nodes WHERE id = $1', [targetId]);

    if (sourceNode.rows.length === 0) {
      return res.status(400).json({ error: 'Source node not found' });
    }

    if (targetNode.rows.length === 0) {
      return res.status(400).json({ error: 'Target node not found' });
    }

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO edges (id, source_id, target_id, type, properties, weight, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, sourceId, targetId, type, JSON.stringify(properties), weight, source || null]
    );

    stats.edgesCreated++;
    res.status(201).json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    console.error('Edge creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get edge by ID
 * GET /edges/:id
 */
app.get('/edges/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM edges WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get all edges with optional filters
 * GET /edges?type=KNOWS&sourceId=xxx&limit=50
 */
app.get('/edges', async (req, res) => {
  try {
    const { type, sourceId, targetId, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (sourceId) {
      conditions.push(`source_id = $${paramIndex++}`);
      params.push(sourceId);
    }

    if (targetId) {
      conditions.push(`target_id = $${paramIndex++}`);
      params.push(targetId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM edges ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      edges: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update an edge
 * PUT /edges/:id
 */
app.put('/edges/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, properties, weight, source } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (type !== undefined) {
      if (!EDGE_TYPES.includes(type)) {
        return res.status(400).json({
          error: `Invalid edge type. Must be one of: ${EDGE_TYPES.join(', ')}`,
        });
      }
      updates.push(`type = $${paramIndex++}`);
      values.push(type);
    }

    if (properties !== undefined) {
      updates.push(`properties = $${paramIndex++}`);
      values.push(JSON.stringify(properties));
    }

    if (weight !== undefined) {
      updates.push(`weight = $${paramIndex++}`);
      values.push(weight);
    }

    if (source !== undefined) {
      updates.push(`source = $${paramIndex++}`);
      values.push(source);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE edges SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Delete an edge
 * DELETE /edges/:id
 */
app.delete('/edges/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM edges WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Edge not found' });
    }

    stats.edgesDeleted++;
    res.json({ message: 'Edge deleted', id: result.rows[0].id });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// GRAPH TRAVERSAL OPERATIONS
// ============================================================================

/**
 * BFS traversal from a start node
 * POST /graph/traverse/:startId
 */
app.post('/graph/traverse/:startId', requireAuth, async (req, res) => {
  try {
    const { startId } = req.params;
    const { maxDepth = 3, direction = 'out', edgeTypes = [], nodeTypes = [] } = req.body;

    // Verify start node exists
    const startNode = await pool.query('SELECT * FROM nodes WHERE id = $1', [startId]);
    if (startNode.rows.length === 0) {
      return res.status(404).json({ error: 'Start node not found' });
    }

    const visited = new Set([startId]);
    const results = [];
    const queue = [{ id: startId, depth: 0, path: [] }];

    while (queue.length > 0) {
      const { id, depth, path } = queue.shift();

      if (depth >= maxDepth) continue;

      // Get neighbors based on direction
      let neighborQuery;
      let params;

      if (direction === 'out') {
        neighborQuery = `
          SELECT e.*, n.*, n.id as node_id
          FROM edges e
          JOIN nodes n ON e.target_id = n.id
          WHERE e.source_id = $1
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      } else if (direction === 'in') {
        neighborQuery = `
          SELECT e.*, n.*, n.id as node_id
          FROM edges e
          JOIN nodes n ON e.source_id = n.id
          WHERE e.target_id = $1
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      } else {
        // Both directions
        neighborQuery = `
          SELECT e.*,
                 CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END as neighbor_id
          FROM edges e
          WHERE (e.source_id = $1 OR e.target_id = $1)
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      }

      const neighbors = await pool.query(neighborQuery, params);

      for (const row of neighbors.rows) {
        const neighborId = row.neighbor_id || row.node_id;

        if (!visited.has(neighborId)) {
          // Filter by node types if specified
          if (nodeTypes.length > 0) {
            const nodeCheck = await pool.query(
              'SELECT type FROM nodes WHERE id = $1 AND type = ANY($2)',
              [neighborId, nodeTypes]
            );
            if (nodeCheck.rows.length === 0) continue;
          }

          visited.add(neighborId);
          const newPath = [...path, row.id];

          // Get full node data
          const nodeData = await pool.query('SELECT * FROM nodes WHERE id = $1', [neighborId]);

          results.push({
            node: nodeData.rows[0],
            edge: { id: row.id, type: row.type, properties: row.properties },
            depth: depth + 1,
            path: newPath,
          });

          queue.push({ id: neighborId, depth: depth + 1, path: newPath });
        }
      }
    }

    stats.traversals++;
    res.json({
      startNode: startNode.rows[0],
      visitedCount: visited.size,
      results,
    });
  } catch (err) {
    stats.errors++;
    console.error('BFS traversal error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DFS traversal from a start node
 * POST /graph/dfs/:startId
 */
app.post('/graph/dfs/:startId', requireAuth, async (req, res) => {
  try {
    const { startId } = req.params;
    const { maxDepth = 3, direction = 'out', edgeTypes = [] } = req.body;

    // Verify start node exists
    const startNode = await pool.query('SELECT * FROM nodes WHERE id = $1', [startId]);
    if (startNode.rows.length === 0) {
      return res.status(404).json({ error: 'Start node not found' });
    }

    const visited = new Set();
    const results = [];

    async function dfs(id, depth, path) {
      if (depth > maxDepth || visited.has(id)) return;
      visited.add(id);

      // Get node data
      const nodeData = await pool.query('SELECT * FROM nodes WHERE id = $1', [id]);
      if (nodeData.rows.length > 0) {
        results.push({ node: nodeData.rows[0], depth, path });
      }

      // Get neighbors
      let neighborQuery;
      let params;

      if (direction === 'out') {
        neighborQuery = `
          SELECT e.*, e.target_id as neighbor_id
          FROM edges e WHERE e.source_id = $1
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      } else if (direction === 'in') {
        neighborQuery = `
          SELECT e.*, e.source_id as neighbor_id
          FROM edges e WHERE e.target_id = $1
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      } else {
        neighborQuery = `
          SELECT e.*,
                 CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END as neighbor_id
          FROM edges e
          WHERE e.source_id = $1 OR e.target_id = $1
          ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
        `;
        params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];
      }

      const neighbors = await pool.query(neighborQuery, params);

      for (const row of neighbors.rows) {
        const neighborId = row.neighbor_id;
        await dfs(neighborId, depth + 1, [...path, row.id]);
      }
    }

    await dfs(startId, 0, []);
    stats.traversals++;

    res.json({
      startNode: startNode.rows[0],
      visitedCount: visited.size,
      results,
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Find shortest path between two nodes (BFS-based)
 * POST /graph/path/:startId/:endId
 */
app.post('/graph/path/:startId/:endId', requireAuth, async (req, res) => {
  try {
    const { startId, endId } = req.params;
    const { edgeTypes = [] } = req.body;

    // Verify both nodes exist
    const startNode = await pool.query('SELECT * FROM nodes WHERE id = $1', [startId]);
    const endNode = await pool.query('SELECT * FROM nodes WHERE id = $1', [endId]);

    if (startNode.rows.length === 0) {
      return res.status(404).json({ error: 'Start node not found' });
    }

    if (endNode.rows.length === 0) {
      return res.status(404).json({ error: 'End node not found' });
    }

    if (startId === endId) {
      return res.json({
        path: [startNode.rows[0]],
        edges: [],
        length: 0,
      });
    }

    const visited = new Set([startId]);
    const queue = [{ id: startId, path: [startNode.rows[0]], edges: [] }];

    while (queue.length > 0) {
      const { id, path, edges } = queue.shift();

      // Get outgoing edges
      let neighborQuery = `
        SELECT e.*, n.*
        FROM edges e
        JOIN nodes n ON e.target_id = n.id
        WHERE e.source_id = $1
        ${edgeTypes.length > 0 ? 'AND e.type = ANY($2)' : ''}
      `;
      let params = edgeTypes.length > 0 ? [id, edgeTypes] : [id];

      const neighbors = await pool.query(neighborQuery, params);

      for (const row of neighbors.rows) {
        if (!visited.has(row.target_id)) {
          const newPath = [...path, row];
          const newEdges = [...edges, { id: row.id, type: row.type, properties: row.properties }];

          if (row.target_id === endId) {
            return res.json({
              path: newPath,
              edges: newEdges,
              length: newPath.length - 1,
            });
          }

          visited.add(row.target_id);
          queue.push({ id: row.target_id, path: newPath, edges: newEdges });
        }
      }
    }

    res.json({
      path: null,
      edges: [],
      length: -1,
      message: 'No path found',
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Search nodes by vector similarity
 * POST /graph/search
 */
app.post('/graph/search', requireAuth, async (req, res) => {
  try {
    const { query, embedding, topK = 10, nodeTypes = [], minScore = 0.0 } = req.body;

    if (!embedding && !query) {
      return res.status(400).json({ error: 'Either embedding or query is required' });
    }

    // If query is provided but not embedding, use text search
    if (query && !embedding) {
      const textResults = await pool.query(
        `SELECT * FROM nodes
         WHERE name ILIKE $1 OR properties::text ILIKE $1
         ${nodeTypes.length > 0 ? 'AND type = ANY($2)' : ''}
         ORDER BY created_at DESC
         LIMIT $${nodeTypes.length > 0 ? 3 : 1}`,
        [`%${query}%`, nodeTypes.length > 0 ? nodeTypes : null]
      );

      stats.searches++;
      return res.json({
        query,
        results: textResults.rows,
        count: textResults.rows.length,
        type: 'text',
      });
    }

    // Vector similarity search
    const results = await pool.query(
      `SELECT id, type, name, properties, source, created_at,
              1 - (embedding <=> $1::vector) as score
       FROM nodes
       WHERE embedding IS NOT NULL
       ${nodeTypes.length > 0 ? 'AND type = ANY($2)' : ''}
       AND 1 - (embedding <=> $1::vector) >= $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      [JSON.stringify(embedding), nodeTypes.length > 0 ? nodeTypes : null, minScore, topK]
    );

    stats.searches++;
    res.json({
      query,
      results: results.rows.map(r => ({
        ...r,
        score: parseFloat(r.score.toFixed(4)),
      })),
      count: results.rows.length,
      type: 'vector',
    });
  } catch (err) {
    stats.errors++;
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get neighbors of a node
 * GET /graph/neighbors/:nodeId
 */
app.get('/graph/neighbors/:nodeId', async (req, res) => {
  try {
    const { nodeId } = req.params;
    const { direction = 'both', depth = 1 } = req.query;

    // Verify node exists
    const node = await pool.query('SELECT * FROM nodes WHERE id = $1', [nodeId]);
    if (node.rows.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }

    let query;
    if (direction === 'out') {
      query = `
        SELECT e.*, n.*
        FROM edges e
        JOIN nodes n ON e.target_id = n.id
        WHERE e.source_id = $1
      `;
    } else if (direction === 'in') {
      query = `
        SELECT e.*, n.*
        FROM edges e
        JOIN nodes n ON e.source_id = n.id
        WHERE e.target_id = $1
      `;
    } else {
      query = `
        SELECT e.*,
               CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END as neighbor_id
        FROM edges e
        WHERE e.source_id = $1 OR e.target_id = $1
      `;
    }

    const results = await pool.query(query, [nodeId]);

    // Get full node data for neighbors
    const neighbors = [];
    for (const row of results.rows) {
      const neighborId = row.neighbor_id || row.id;
      const neighborNode = await pool.query('SELECT * FROM nodes WHERE id = $1', [neighborId]);
      if (neighborNode.rows.length > 0) {
        neighbors.push({
          node: neighborNode.rows[0],
          edge: {
            id: row.id,
            type: row.type,
            properties: row.properties,
            direction: row.source_id === nodeId ? 'outgoing' : 'incoming',
          },
        });
      }
    }

    res.json({
      node: node.rows[0],
      neighbors,
      count: neighbors.length,
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// STATISTICS AND UTILITY ENDPOINTS
// ============================================================================

/**
 * Get service statistics
 * GET /stats
 */
app.get('/stats', async (_req, res) => {
  try {
    const nodeCount = await pool.query('SELECT COUNT(*) FROM nodes');
    const edgeCount = await pool.query('SELECT COUNT(*) FROM edges');

    const typeStats = await pool.query(`
      SELECT type, COUNT(*) as count FROM nodes GROUP BY type
    `);

    const edgeTypeStats = await pool.query(`
      SELECT type, COUNT(*) as count FROM edges GROUP BY type
    `);

    res.json({
      ...stats,
      totalNodes: parseInt(nodeCount.rows[0].count),
      totalEdges: parseInt(edgeCount.rows[0].count),
      nodesByType: typeStats.rows.reduce((acc, r) => ({ ...acc, [r.type]: parseInt(r.count) }), {}),
      edgesByType: edgeTypeStats.rows.reduce((acc, r) => ({ ...acc, [r.type]: parseInt(r.count) }), {}),
    });
  } catch (err) {
    stats.errors++;
    res.status(500).json({ error: err.message });
  }
});

/**
 * Reset statistics
 * POST /stats/reset
 */
app.post('/stats/reset', requireAuth, (_req, res) => {
  stats.nodesCreated = 0;
  stats.nodesUpdated = 0;
  stats.nodesDeleted = 0;
  stats.edgesCreated = 0;
  stats.edgesDeleted = 0;
  stats.traversals = 0;
  stats.searches = 0;
  stats.errors = 0;
  res.json({ message: 'Stats reset', stats });
});

/**
 * Get available node types
 * GET /types/nodes
 */
app.get('/types/nodes', (_req, res) => {
  res.json({ nodeTypes: NODE_TYPES });
});

/**
 * Get available edge types
 * GET /types/edges
 */
app.get('/types/edges', (_req, res) => {
  res.json({ edgeTypes: EDGE_TYPES });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

app.use((err, req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  stats.errors++;
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================================================
// START
// ============================================================================

let server;

async function start() {
  try {
    await initDatabase();
    server = app.listen(PORT, () => {
      console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
      console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/health`);
      console.log(`[${SERVICE_NAME}] ready: http://localhost:${PORT}/ready`);
    });

    process.on('SIGTERM', () => {
      console.log(`[${SERVICE_NAME}] SIGTERM received`);
      pool.end().then(() => process.exit(0));
    });

    process.on('SIGINT', () => {
      console.log(`[${SERVICE_NAME}] SIGINT received`);
      pool.end().then(() => process.exit(0));
    });
  } catch (err) {
    console.error(`[${SERVICE_NAME}] Failed to start:`, err);
    process.exit(1);
  }
}

// Only start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app, pool, initDatabase, stats, start };
export default app;
