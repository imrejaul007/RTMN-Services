/**
 * HOJAI pgvector Service - Real PostgreSQL + pgvector Storage Service
 * Version: 2.0.0 | Date: June 2, 2026
 * Purpose: Vector storage and similarity search using PostgreSQL with pgvector extension
 *
 * Features:
 * - Real PostgreSQL + pgvector for production use
 * - Cosine similarity, Euclidean distance, and dot product search
 * - Hybrid search (BM25 + vector) support
 * - Automatic table and index creation
 * - Transaction support
 */

import { v4 as uuidv4 } from 'uuid';
import { getConnection, PGConnectionManager } from '../connection.js';
import type { Logger } from '../utils/logger.js';
import type {
  VectorRecord,
  VectorInsert,
  SearchRequest,
  SearchResult,
  NamespaceStats,
  SimilarityMetric,
} from '../types/index.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DIMENSIONS = 1536;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 1000;
const RRF_K = 60; // Reciprocal Rank Fusion constant

// ============================================================================
// Storage Service
// ============================================================================

/**
 * Database row type for embeddings table
 */
interface EmbeddingRow {
  id: string;
  namespace: string;
  chunk_text: string;
  embedding: number[];
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at?: Date;
  document_id?: string | null;
}

/**
 * Query result row type
 */
interface QueryRow {
  id: string;
  namespace: string;
  chunk_text: string;
  score?: number;
  bm25_score?: number;
  metadata: Record<string, unknown> | null;
  created_at: Date;
}

class PGVectorStorage {
  private connection: PGConnectionManager;
  private logger: Logger;
  private initialized: boolean = false;

  constructor(connection: PGConnectionManager, logger: Logger) {
    this.connection = connection;
    this.logger = logger;
  }

  /**
   * Initialize the storage - create tables and indexes if they don't exist
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('storage_already_initialized');
      return;
    }

    const startTime = Date.now();
    this.logger.info('storage_initializing');

    try {
      // Create the embeddings table with pgvector column
      await this.connection.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          namespace TEXT NOT NULL,
          document_id TEXT,
          chunk_text TEXT NOT NULL,
          embedding VECTOR(${DEFAULT_DIMENSIONS}) NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // Create indexes for efficient querying
      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_namespace
        ON embeddings(namespace)
      `);

      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_document_id
        ON embeddings(document_id)
      `);

      // Create vector index using IVFFlat for approximate nearest neighbor search
      // Note: Requires pgvector >= 0.5.0
      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_vector_cosine
        ON embeddings USING ivfflat(embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      // Create full-text search index for hybrid search
      await this.connection.query(`
        CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_text_fts
        ON embeddings USING gin(to_tsvector('english', chunk_text))
      `);

      // Create trigger to update updated_at
      await this.connection.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      await this.connection.query(`
        DROP TRIGGER IF EXISTS update_embeddings_updated_at ON embeddings
      `);

      await this.connection.query(`
        CREATE TRIGGER update_embeddings_updated_at
        BEFORE UPDATE ON embeddings
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column()
      `);

      this.initialized = true;
      const duration = Date.now() - startTime;
      this.logger.info('storage_initialized', {
        message: 'PostgreSQL pgvector storage initialized',
        durationMs: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('storage_init_failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: duration,
      });
      throw error;
    }
  }

  /**
   * Insert a single vector
   */
  async insert(vector: VectorInsert): Promise<VectorRecord> {
    const id = vector.id || uuidv4();
    const created_at = new Date().toISOString();

    this.logger.debug('storage_insert', {
      id,
      namespace: vector.namespace,
      dimensions: vector.embedding.length,
    });

    const result = await this.connection.query<EmbeddingRow>(
      `
      INSERT INTO embeddings (id, namespace, document_id, chunk_text, embedding, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, namespace, chunk_text, embedding, metadata, created_at
      `,
      [
        id,
        vector.namespace,
        vector.metadata?.['documentId'] as string || null,
        vector.metadata?.['text'] as string || vector.metadata?.['chunkText'] as string || '',
        `[${vector.embedding.join(',')}]`,
        vector.metadata ? JSON.stringify(vector.metadata) : null,
        created_at,
      ]
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error('Failed to insert vector: no row returned');
    }

    return {
      id: row.id,
      namespace: row.namespace,
      embedding: row.embedding,
      metadata: row.metadata || undefined,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  /**
   * Insert multiple vectors in a batch
   */
  async insertBatch(
    vectors: VectorInsert[]
  ): Promise<{ ids: string[]; errors: Array<{ index: number; error: string }> }> {
    const ids: string[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    if (vectors.length === 0) {
      return { ids, errors };
    }

    this.logger.info('storage_batch_insert', {
      count: vectors.length,
    });

    // Use transaction for batch insert
    try {
      await this.connection.transaction(async (client) => {
        for (let i = 0; i < vectors.length; i++) {
          const vector = vectors[i];
          if (!vector) {
            errors.push({ index: i, error: 'Vector is undefined' });
            continue;
          }
          try {
            const id = vector.id || uuidv4();
            const createdAt = new Date().toISOString();

            await client.query(
              `
              INSERT INTO embeddings (id, namespace, document_id, chunk_text, embedding, metadata, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
              `,
              [
                id,
                vector.namespace,
                vector.metadata?.['documentId'] as string || null,
                vector.metadata?.['text'] as string || vector.metadata?.['chunkText'] as string || '',
                `[${vector.embedding.join(',')}]`,
                vector.metadata ? JSON.stringify(vector.metadata) : null,
                createdAt,
              ]
            );

            ids.push(id);
          } catch (err) {
            errors.push({
              index: i,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }
      });

      this.logger.info('storage_batch_insert_complete', {
        inserted: ids.length,
        failed: errors.length,
      });

      return { ids, errors };
    } catch (error) {
      this.logger.error('storage_batch_insert_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get a vector by ID
   */
  async getById(id: string): Promise<VectorRecord | null> {
    this.logger.debug('storage_get_by_id', { id });

    const result = await this.connection.query<EmbeddingRow>(
      `
      SELECT id, namespace, chunk_text, embedding, metadata, created_at
      FROM embeddings
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      namespace: row.namespace,
      embedding: row.embedding,
      metadata: row.metadata || undefined,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    };
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<boolean> {
    this.logger.debug('storage_delete', { id });

    const result = await this.connection.query(
      `DELETE FROM embeddings WHERE id = $1`,
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  /**
   * Search for similar vectors
   */
  async search(request: SearchRequest): Promise<SearchResult[]> {
    const { embedding, limit = DEFAULT_LIMIT, threshold, namespace } = request;
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    this.logger.debug('storage_search', {
      dimensions: embedding.length,
      limit: effectiveLimit,
      threshold,
      namespace,
    });

    // Build the embedding array for PostgreSQL
    const embeddingArray = `[${embedding.join(',')}]`;

    // Build the query
    let query: string;
    let params: unknown[];

    if (namespace) {
      query = `
        SELECT
          id,
          namespace,
          chunk_text,
          1 - (embedding <=> $1) as score,
          metadata,
          created_at
        FROM embeddings
        WHERE namespace = $2
        ${threshold !== undefined ? `AND (1 - (embedding <=> $1)) >= $3` : ''}
        ORDER BY embedding <=> $1
        LIMIT $${threshold ? 4 : 3}
      `;
      params = threshold
        ? [embeddingArray, namespace, threshold, effectiveLimit]
        : [embeddingArray, namespace, effectiveLimit];
    } else {
      query = `
        SELECT
          id,
          namespace,
          chunk_text,
          1 - (embedding <=> $1) as score,
          metadata,
          created_at
        FROM embeddings
        ${threshold !== undefined ? `WHERE (1 - (embedding <=> $1)) >= $2` : ''}
        ORDER BY embedding <=> $1
        LIMIT $${threshold ? 3 : 2}
      `;
      params = threshold
        ? [embeddingArray, threshold, effectiveLimit]
        : [embeddingArray, effectiveLimit];
    }

    const result = await this.connection.query<QueryRow>(query, params);

    return result.rows.map((row) => ({
      id: row.id,
      score: row.score ?? 0,
      namespace: row.namespace,
      metadata: row.metadata || undefined,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  }

  /**
   * Hybrid search combining BM25 (full-text) and vector similarity
   * Uses Reciprocal Rank Fusion (RRF) to combine results
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    topK: number = 20,
    namespace?: string
  ): Promise<SearchResult[]> {
    const effectiveLimit = Math.min(topK, MAX_LIMIT);
    const embeddingArray = `[${queryEmbedding.join(',')}]`;

    this.logger.debug('storage_hybrid_search', {
      queryLength: query.length,
      topK: effectiveLimit,
      namespace,
    });

    // BM25 search using PostgreSQL full-text search
    const sanitizedQuery = query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    const bm25Query = `
      SELECT
        id,
        namespace,
        chunk_text,
        ts_rank(to_tsvector('english', chunk_text), query) as bm25_score,
        metadata,
        created_at
      FROM embeddings, to_tsquery('english', $1) query
      WHERE to_tsvector('english', chunk_text) @@ query
      ${namespace ? 'AND namespace = $2' : ''}
      ORDER BY ts_rank(to_tsvector('english', chunk_text), query) DESC
      LIMIT $${namespace ? 3 : 2}
    `;

    const bm25Params = namespace
      ? [sanitizedQuery, namespace, effectiveLimit * 2]
      : [sanitizedQuery, effectiveLimit * 2];
    const bm25Result = await this.connection.query<QueryRow>(bm25Query, bm25Params);

    // Vector search
    const vectorResult = await this.search({
      embedding: queryEmbedding,
      limit: effectiveLimit * 2,
      namespace,
    });

    // Apply Reciprocal Rank Fusion
    const scores = new Map<string, { result: SearchResult; rrfScore: number }>();

    // Add BM25 results with RRF score
    bm25Result.rows.forEach((row, index) => {
      const rrfScore = 1 / (RRF_K + index + 1);
      scores.set(row.id, {
        result: {
          id: row.id,
          score: row.bm25_score ?? 0,
          namespace: row.namespace,
          metadata: row.metadata || undefined,
          created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        },
        rrfScore,
      });
    });

    // Add vector results with RRF score
    vectorResult.forEach((result, index) => {
      const existing = scores.get(result.id);
      if (existing) {
        existing.rrfScore += 1 / (RRF_K + index + 1);
        // Update score to be the max of the two
        existing.result.score = Math.max(existing.result.score, result.score);
      } else {
        scores.set(result.id, {
          result: {
            ...result,
            score: result.score,
          },
          rrfScore: 1 / (RRF_K + index + 1),
        });
      }
    });

    // Sort by RRF score and return top K
    const fused = Array.from(scores.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .slice(0, effectiveLimit)
      .map((item) => item.result);

    this.logger.debug('storage_hybrid_search_complete', {
      results: fused.length,
    });

    return fused;
  }

  /**
   * List vectors by namespace
   */
  async listByNamespace(namespace: string, limit = 100, offset = 0): Promise<VectorRecord[]> {
    const effectiveLimit = Math.min(limit, MAX_LIMIT);

    this.logger.debug('storage_list_by_namespace', {
      namespace,
      limit: effectiveLimit,
      offset,
    });

    const result = await this.connection.query<EmbeddingRow>(
      `
      SELECT id, namespace, chunk_text, embedding, metadata, created_at
      FROM embeddings
      WHERE namespace = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [namespace, effectiveLimit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      namespace: row.namespace,
      embedding: row.embedding,
      metadata: row.metadata || undefined,
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    }));
  }

  /**
   * Get statistics for a namespace
   */
  async getNamespaceStats(namespace: string): Promise<NamespaceStats | null> {
    this.logger.debug('storage_namespace_stats', { namespace });

    interface StatsRow {
      count: string;
      dimensions: string;
      created_at: Date;
      last_updated: Date;
    }

    const dimensions = process.env['PGVECTOR_DIMENSIONS'] || String(DEFAULT_DIMENSIONS);

    const result = await this.connection.query<StatsRow>(
      `
      SELECT
        COUNT(*) as count,
        $1::integer as dimensions,
        MIN(created_at) as created_at,
        MAX(updated_at) as last_updated
      FROM embeddings
      WHERE namespace = $2
      `,
      [dimensions, namespace]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const count = parseInt(row.count, 10);
    if (count === 0) {
      return null;
    }

    return {
      namespace,
      count,
      dimensions: parseInt(row.dimensions, 10),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      last_updated: row.last_updated instanceof Date ? row.last_updated.toISOString() : String(row.last_updated),
    };
  }

  /**
   * List all namespaces with their stats
   */
  async listNamespaces(): Promise<NamespaceStats[]> {
    this.logger.debug('storage_list_namespaces');

    interface NamespaceRow {
      namespace: string;
      count: string;
      dimensions: string;
      created_at: Date;
      last_updated: Date;
    }

    const dimensions = process.env['PGVECTOR_DIMENSIONS'] || String(DEFAULT_DIMENSIONS);

    const result = await this.connection.query<NamespaceRow>(
      `
      SELECT
        namespace,
        COUNT(*) as count,
        $1::integer as dimensions,
        MIN(created_at) as created_at,
        MAX(updated_at) as last_updated
      FROM embeddings
      GROUP BY namespace
      ORDER BY namespace
      `,
      [dimensions]
    );

    return result.rows.map((row) => ({
      namespace: row.namespace,
      count: parseInt(row.count, 10),
      dimensions: parseInt(row.dimensions, 10),
      created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      last_updated: row.last_updated instanceof Date ? row.last_updated.toISOString() : String(row.last_updated),
    }));
  }

  /**
   * Count vectors in storage
   */
  async count(namespace?: string): Promise<number> {
    interface CountRow {
      count: string;
    }

    if (namespace) {
      const result = await this.connection.query<CountRow>(
        `SELECT COUNT(*) as count FROM embeddings WHERE namespace = $1`,
        [namespace]
      );
      return parseInt(result.rows[0]?.count || '0', 10);
    }

    const result = await this.connection.query<CountRow>(
      `SELECT COUNT(*) as count FROM embeddings`
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  }

  /**
   * Clear all vectors from a namespace or entire storage
   */
  async clear(namespace?: string): Promise<number> {
    this.logger.info('storage_clear', { namespace });

    if (namespace) {
      const result = await this.connection.query(
        `DELETE FROM embeddings WHERE namespace = $1`,
        [namespace]
      );
      return result.rowCount || 0;
    }

    const result = await this.connection.query(`DELETE FROM embeddings`);
    return result.rowCount || 0;
  }

  /**
   * Delete vectors by document ID
   */
  async deleteByDocumentId(documentId: string, namespace?: string): Promise<number> {
    this.logger.info('storage_delete_by_document_id', {
      documentId,
      namespace,
    });

    if (namespace) {
      const result = await this.connection.query(
        `DELETE FROM embeddings WHERE document_id = $1 AND namespace = $2`,
        [documentId, namespace]
      );
      return result.rowCount || 0;
    }

    const result = await this.connection.query(
      `DELETE FROM embeddings WHERE document_id = $1`,
      [documentId]
    );
    return result.rowCount || 0;
  }

  /**
   * Update metadata for a vector
   */
  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<boolean> {
    this.logger.debug('storage_update_metadata', { id });

    const result = await this.connection.query(
      `
      UPDATE embeddings
      SET metadata = $2
      WHERE id = $1
      `,
      [id, JSON.stringify(metadata)]
    );

    return (result.rowCount || 0) > 0;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let storageInstance: PGVectorStorage | null = null;

export function initializeStorage(logger: Logger): void {
  const connection = getConnection();
  storageInstance = new PGVectorStorage(connection, logger);
  logger.info('storage_initialized', {
    message: 'PGVector storage instance created (call initialize() to set up tables)',
  });
}

export async function initializeStorageAsync(logger: Logger): Promise<void> {
  const connection = getConnection();
  storageInstance = new PGVectorStorage(connection, logger);
  await storageInstance.initialize();
}

export function getStorage(): PGVectorStorage {
  if (!storageInstance) {
    throw new Error('Storage not initialized. Call initializeStorage() first.');
  }
  return storageInstance;
}

export function getStorageLogger(): Logger {
  const storage = getStorage();
  return storage['logger'] as Logger;
}

// ============================================================================
// Export for testing
// ============================================================================

export { PGVectorStorage };
