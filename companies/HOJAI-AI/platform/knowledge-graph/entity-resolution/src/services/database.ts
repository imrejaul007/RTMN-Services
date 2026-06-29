/**
 * Database Service - PostgreSQL + pgvector operations
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import {
  Entity,
  EntitySource,
  EntityAlias,
  EntityLink,
  ReviewQueueItem,
  BlockingStrategy,
  SourceReliability,
} from '../types';
import { logger } from '../utils/logger';

export class DatabaseService {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL || 'postgresql://localhost:5432/entity_resolution',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err.message });
    });
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      logger.debug('Query executed', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query failed', { text: text.substring(0, 100), error });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Entity CRUD operations
  async createEntity(entity: Omit<Entity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Entity> {
    const id = `ent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const result = await this.query<Entity>(
      `INSERT INTO entities (
        id, canonical_id, type, primary_name, attributes, aliases, sources,
        status, confidence, review_status, linked_entities, merged_from, merged_into,
        created_at, updated_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        entity.canonicalId || id,
        entity.type,
        entity.primaryName,
        JSON.stringify(entity.attributes),
        entity.aliases,
        entity.sources,
        entity.status || 'active',
        entity.confidence || 0.5,
        entity.reviewStatus || 'approved',
        JSON.stringify(entity.linkedEntities || []),
        entity.mergedFrom || [],
        entity.mergedInto || null,
        now,
        now,
        JSON.stringify(entity.metadata || {}),
      ]
    );

    return this.mapDbToEntity(result.rows[0]);
  }

  async getEntityById(id: string): Promise<Entity | null> {
    const result = await this.query<Entity>(
      'SELECT * FROM entities WHERE id = $1 AND status != $2',
      [id, 'archived']
    );

    if (result.rows.length === 0) return null;
    return this.mapDbToEntity(result.rows[0]);
  }

  async getEntityByCanonicalId(canonicalId: string): Promise<Entity[]> {
    const result = await this.query<Entity>(
      'SELECT * FROM entities WHERE canonical_id = $1 AND status != $2 ORDER BY created_at DESC',
      [canonicalId, 'archived']
    );

    return result.rows.map((row) => this.mapDbToEntity(row));
  }

  async updateEntity(id: string, updates: Partial<Entity>): Promise<Entity | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (updates.primaryName !== undefined) {
      fields.push(`primary_name = $${paramIndex++}`);
      values.push(updates.primaryName);
    }
    if (updates.attributes !== undefined) {
      fields.push(`attributes = $${paramIndex++}`);
      values.push(JSON.stringify(updates.attributes));
    }
    if (updates.aliases !== undefined) {
      fields.push(`aliases = $${paramIndex++}`);
      values.push(updates.aliases);
    }
    if (updates.sources !== undefined) {
      fields.push(`sources = $${paramIndex++}`);
      values.push(updates.sources);
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.confidence !== undefined) {
      fields.push(`confidence = $${paramIndex++}`);
      values.push(updates.confidence);
    }
    if (updates.reviewStatus !== undefined) {
      fields.push(`review_status = $${paramIndex++}`);
      values.push(updates.reviewStatus);
    }
    if (updates.linkedEntities !== undefined) {
      fields.push(`linked_entities = $${paramIndex++}`);
      values.push(JSON.stringify(updates.linkedEntities));
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return this.getEntityById(id);

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const result = await this.query<Entity>(
      `UPDATE entities SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapDbToEntity(result.rows[0]);
  }

  async deleteEntity(id: string, hardDelete: boolean = false): Promise<boolean> {
    if (hardDelete) {
      const result = await this.query('DELETE FROM entities WHERE id = $1', [id]);
      return (result.rowCount ?? 0) > 0;
    }

    const result = await this.query(
      'UPDATE entities SET status = $1, updated_at = $2 WHERE id = $3',
      ['archived', new Date(), id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Blocking key operations
  async createBlockingKey(
    entityId: string,
    strategy: BlockingStrategy,
    key: string
  ): Promise<void> {
    await this.query(
      `INSERT INTO blocking_keys (entity_id, strategy, blocking_key)
       VALUES ($1, $2, $3)
       ON CONFLICT (entity_id, strategy) DO UPDATE SET blocking_key = $3, updated_at = NOW()`,
      [entityId, strategy, key]
    );
  }

  async findCandidatesByBlockingKey(
    strategies: BlockingStrategy[],
    key: string,
    excludeEntityId?: string
  ): Promise<Entity[]> {
    const placeholders = strategies.map((_, i) => `$${i + 2}`).join(', ');
    let query = `
      SELECT DISTINCT e.* FROM entities e
      JOIN blocking_keys bk ON e.id = bk.entity_id
      WHERE bk.strategy IN (${placeholders})
      AND bk.blocking_key = $1
      AND e.status != 'archived'
    `;

    const params: unknown[] = [key, ...strategies];

    if (excludeEntityId) {
      query += ` AND e.id != $${params.length + 1}`;
      params.push(excludeEntityId);
    }

    query += ' LIMIT 100';

    const result = await this.query<Entity>(query, params);
    return result.rows.map((row) => this.mapDbToEntity(row));
  }

  async findCandidatesByVectorSimilarity(
    embedding: number[],
    threshold: number = 0.8,
    limit: number = 10
  ): Promise<{ entity: Entity; similarity: number }[]> {
    const result = await this.query<{ id: string; similarity: number }>(
      `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
       FROM entity_embeddings
       WHERE 1 - (embedding <=> $1::vector) > $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      [JSON.stringify(embedding), threshold, limit]
    );

    const entities: { entity: Entity; similarity: number }[] = [];
    for (const row of result.rows) {
      const entity = await this.getEntityById(row.id);
      if (entity) {
        entities.push({ entity, similarity: row.similarity });
      }
    }

    return entities;
  }

  async storeEntityEmbedding(entityId: string, embedding: number[]): Promise<void> {
    await this.query(
      `INSERT INTO entity_embeddings (entity_id, embedding)
       VALUES ($1, $2::vector)
       ON CONFLICT (entity_id) DO UPDATE SET embedding = $2::vector, updated_at = NOW()`,
      [entityId, JSON.stringify(embedding)]
    );
  }

  // Alias management
  async createAlias(alias: Omit<EntityAlias, 'aliasId' | 'createdAt'>): Promise<EntityAlias> {
    const id = `alias_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.query<EntityAlias>(
      `INSERT INTO entity_aliases (id, canonical_id, alias, type, confidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, alias.canonicalId, alias.alias, alias.type, alias.confidence, new Date()]
    );

    return this.mapDbToAlias(result.rows[0]);
  }

  async getAliasesByCanonicalId(canonicalId: string): Promise<EntityAlias[]> {
    const result = await this.query<EntityAlias>(
      'SELECT * FROM entity_aliases WHERE canonical_id = $1 ORDER BY confidence DESC',
      [canonicalId]
    );

    return result.rows.map((row) => this.mapDbToAlias(row));
  }

  async deleteAlias(aliasId: string): Promise<boolean> {
    const result = await this.query('DELETE FROM entity_aliases WHERE id = $1', [aliasId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Source tracking
  async createSource(source: Omit<EntitySource, 'contributedAt' | 'lastSyncedAt'>): Promise<EntitySource> {
    const result = await this.query<EntitySource>(
      `INSERT INTO entity_sources (source_id, source_name, reliability, contributed_at, last_synced_at, record_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (source_id) DO UPDATE SET
         source_name = $2, reliability = $3, last_synced_at = $5, record_count = $6
       RETURNING *`,
      [source.sourceId, source.sourceName, source.reliability, new Date(), new Date(), source.recordCount]
    );

    return this.mapDbToSource(result.rows[0]);
  }

  async getSource(sourceId: string): Promise<EntitySource | null> {
    const result = await this.query<EntitySource>(
      'SELECT * FROM entity_sources WHERE source_id = $1',
      [sourceId]
    );

    if (result.rows.length === 0) return null;
    return this.mapDbToSource(result.rows[0]);
  }

  async getSourceReliability(sourceId: string): Promise<SourceReliability> {
    const source = await this.getSource(sourceId);
    return source?.reliability || 'standard';
  }

  async getReliabilityWeight(sourceId: string): Promise<number> {
    const reliability = await this.getSourceReliability(sourceId);
    const weights: Record<SourceReliability, number> = {
      verified: 1.0,
      trusted: 0.9,
      standard: 0.7,
      unverified: 0.5,
    };
    return weights[reliability] || 0.7;
  }

  // Link operations
  async createLink(link: Omit<EntityLink, 'linkId' | 'createdAt'>): Promise<EntityLink> {
    const id = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.query<EntityLink>(
      `INSERT INTO entity_links (id, source_entity_id, target_entity_id, relationship_type, confidence, source_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, link.sourceEntityId, link.targetEntityId, link.relationshipType, link.confidence, link.sourceId, new Date()]
    );

    return this.mapDbToLink(result.rows[0]);
  }

  async getLinksByEntityId(entityId: string): Promise<EntityLink[]> {
    const result = await this.query<EntityLink>(
      `SELECT * FROM entity_links
       WHERE source_entity_id = $1 OR target_entity_id = $1
       ORDER BY confidence DESC`,
      [entityId]
    );

    return result.rows.map((row) => this.mapDbToLink(row));
  }

  async verifyLink(linkId: string, userId: string): Promise<EntityLink | null> {
    const result = await this.query<EntityLink>(
      `UPDATE entity_links SET verified_at = $1, verified_by = $2 WHERE id = $3 RETURNING *`,
      [new Date(), userId, linkId]
    );

    if (result.rows.length === 0) return null;
    return this.mapDbToLink(result.rows[0]);
  }

  async deleteLink(linkId: string): Promise<boolean> {
    const result = await this.query('DELETE FROM entity_links WHERE id = $1', [linkId]);
    return (result.rowCount ?? 0) > 0;
  }

  // Merge operations
  async mergeEntities(
    sourceIds: string[],
    targetId: string,
    userId: string,
    reason: string
  ): Promise<Entity | null> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      // Update target entity with merged status
      const mergedFrom = [...new Set(sourceIds)];
      await client.query(
        `UPDATE entities SET
           status = 'active',
           merged_from = array_cat(merged_from, $1::text[]),
           updated_at = NOW()
         WHERE id = $2`,
        [mergedFrom, targetId]
      );

      // Archive source entities
      for (const sourceId of sourceIds) {
        await client.query(
          `UPDATE entities SET
             status = 'merged',
             merged_into = $1,
             updated_at = NOW()
           WHERE id = $2`,
          [targetId, sourceId]
        );

        // Transfer aliases
        await client.query(
          `UPDATE entity_aliases SET canonical_id = $1 WHERE canonical_id = $2`,
          [targetId, sourceId]
        );

        // Transfer links
        await client.query(
          `UPDATE entity_links SET source_entity_id = $1 WHERE source_entity_id = $2`,
          [targetId, sourceId]
        );
        await client.query(
          `UPDATE entity_links SET target_entity_id = $1 WHERE target_entity_id = $2`,
          [targetId, sourceId]
        );
      }

      // Record merge
      await client.query(
        `INSERT INTO entity_merges (id, source_ids, target_id, merged_at, merged_by, reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          mergedFrom,
          targetId,
          new Date(),
          userId,
          reason,
        ]
      );

      await client.query('COMMIT');

      return this.getEntityById(targetId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async splitEntity(
    entityId: string,
    newEntityIds: string[],
    userId: string
  ): Promise<Entity[]> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');

      // Get original entity
      const original = await this.getEntityById(entityId);
      if (!original) throw new Error('Entity not found');

      // Mark original as split
      await client.query(
        `UPDATE entities SET status = 'split', updated_at = NOW() WHERE id = $1`,
        [entityId]
      );

      // Create new entities with inherited data
      const newEntities: Entity[] = [];
      for (let i = 0; i < newEntityIds.length; i++) {
        const newEntity = await this.createEntity({
          ...original,
          id: newEntityIds[i],
          canonicalId: newEntityIds[i],
          status: 'active',
          mergedFrom: [entityId],
        });
        newEntities.push(newEntity);
      }

      await client.query('COMMIT');
      return newEntities;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Review queue operations
  async addToReviewQueue(item: Omit<ReviewQueueItem, 'id' | 'createdAt'>): Promise<ReviewQueueItem> {
    const id = `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await this.query<ReviewQueueItem>(
      `INSERT INTO review_queue (id, type, priority, entity_ids, confidence, reason, suggested_action, created_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, item.type, item.priority, item.entityIds, item.confidence, item.reason, item.suggestedAction || null, new Date(), 'pending']
    );

    return this.mapDbToReviewItem(result.rows[0]);
  }

  async getReviewQueue(
    limit: number = 50,
    offset: number = 0,
    status?: string,
    priority?: string
  ): Promise<{ items: ReviewQueueItem[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }

    if (priority) {
      conditions.push(`priority = $${params.length + 1}`);
      params.push(priority);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM review_queue ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await this.query<ReviewQueueItem>(
      `SELECT * FROM review_queue ${whereClause}
       ORDER BY
         CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      items: result.rows.map((row) => this.mapDbToReviewItem(row)),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async processReviewItem(
    id: string,
    action: 'approved' | 'rejected',
    userId: string,
    notes?: string
  ): Promise<ReviewQueueItem | null> {
    const result = await this.query<ReviewQueueItem>(
      `UPDATE review_queue
       SET status = $1, reviewed_at = $2, reviewed_by = $3, notes = $4
       WHERE id = $5
       RETURNING *`,
      [action, new Date(), userId, notes || null, id]
    );

    if (result.rows.length === 0) return null;
    return this.mapDbToReviewItem(result.rows[0]);
  }

  // Statistics
  async getStatistics(): Promise<{
    totalEntities: number;
    byType: Record<string, number>;
    byConfidenceLevel: Record<string, number>;
    pendingReviews: number;
    averageConfidence: number;
  }> {
    const [totalResult, typeResult, confidenceResult, reviewResult, avgResult] = await Promise.all([
      this.query<{ count: string }>('SELECT COUNT(*) as count FROM entities WHERE status != $1', ['archived']),
      this.query<{ type: string; count: string }>('SELECT type, COUNT(*) as count FROM entities WHERE status != $1 GROUP BY type', ['archived']),
      this.query<{ level: string; count: string }>(
        `SELECT
           CASE
             WHEN confidence >= 0.85 THEN 'high'
             WHEN confidence >= 0.70 THEN 'medium'
             WHEN confidence >= 0.50 THEN 'low'
             ELSE 'uncertain'
           END as level,
           COUNT(*) as count
         FROM entities WHERE status != $1 GROUP BY level`,
        ['archived']
      ),
      this.query<{ count: string }>('SELECT COUNT(*) as count FROM review_queue WHERE status = $1', ['pending']),
      this.query<{ avg: string }>('SELECT COALESCE(AVG(confidence), 0) as avg FROM entities WHERE status != $1', ['archived']),
    ]);

    const byType: Record<string, number> = {};
    for (const row of typeResult.rows) {
      byType[row.type] = parseInt(row.count, 10);
    }

    const byConfidenceLevel: Record<string, number> = {};
    for (const row of confidenceResult.rows) {
      byConfidenceLevel[row.level] = parseInt(row.count, 10);
    }

    return {
      totalEntities: parseInt(totalResult.rows[0].count, 10),
      byType,
      byConfidenceLevel,
      pendingReviews: parseInt(reviewResult.rows[0].count, 10),
      averageConfidence: parseFloat(avgResult.rows[0].avg),
    };
  }

  // Mapping functions
  private mapDbToEntity(row: unknown): Entity {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      canonicalId: r.canonical_id as string,
      type: r.type as Entity['type'],
      primaryName: r.primary_name as string,
      attributes: typeof r.attributes === 'string' ? JSON.parse(r.attributes) : (r.attributes || {}),
      aliases: r.aliases as string[] || [],
      sources: r.sources as string[] || [],
      status: r.status as Entity['status'],
      confidence: r.confidence as number,
      reviewStatus: r.review_status as Entity['reviewStatus'],
      linkedEntities: typeof r.linked_entities === 'string' ? JSON.parse(r.linked_entities) : (r.linked_entities || []),
      mergedFrom: r.merged_from as string[] || [],
      mergedInto: r.merged_into as string | undefined,
      createdAt: new Date(r.created_at as string),
      updatedAt: new Date(r.updated_at as string),
      metadata: typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}),
    };
  }

  private mapDbToAlias(row: unknown): EntityAlias {
    const r = row as Record<string, unknown>;
    return {
      aliasId: r.id as string,
      canonicalId: r.canonical_id as string,
      alias: r.alias as string,
      type: r.type as EntityAlias['type'],
      confidence: r.confidence as number,
      createdAt: new Date(r.created_at as string),
    };
  }

  private mapDbToSource(row: unknown): EntitySource {
    const r = row as Record<string, unknown>;
    return {
      sourceId: r.source_id as string,
      sourceName: r.source_name as string,
      reliability: r.reliability as EntitySource['reliability'],
      contributedAt: new Date(r.contributed_at as string),
      lastSyncedAt: new Date(r.last_synced_at as string),
      recordCount: r.record_count as number,
    };
  }

  private mapDbToLink(row: unknown): EntityLink {
    const r = row as Record<string, unknown>;
    return {
      linkId: r.id as string,
      sourceEntityId: r.source_entity_id as string,
      targetEntityId: r.target_entity_id as string,
      relationshipType: r.relationship_type as string,
      confidence: r.confidence as number,
      sourceId: r.source_id as string,
      createdAt: new Date(r.created_at as string),
      verifiedAt: r.verified_at ? new Date(r.verified_at as string) : undefined,
      verifiedBy: r.verified_by as string | undefined,
    };
  }

  private mapDbToReviewItem(row: unknown): ReviewQueueItem {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      type: r.type as ReviewQueueItem['type'],
      priority: r.priority as ReviewQueueItem['priority'],
      entityIds: r.entity_ids as string[],
      confidence: r.confidence as number,
      reason: r.reason as string,
      suggestedAction: r.suggested_action as string | undefined,
      createdAt: new Date(r.created_at as string),
      reviewedAt: r.reviewed_at ? new Date(r.reviewed_at as string) : undefined,
      reviewedBy: r.reviewed_by as string | undefined,
      status: r.status as ReviewQueueItem['status'],
      notes: r.notes as string | undefined,
    };
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabaseService(connectionString?: string): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(connectionString);
  }
  return dbInstance;
}

export function resetDatabaseService(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}