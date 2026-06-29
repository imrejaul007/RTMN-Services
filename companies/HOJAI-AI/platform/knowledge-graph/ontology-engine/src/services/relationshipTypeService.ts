/**
 * Relationship Type Service - CRUD for relationship types between classes
 */

import { query } from '../db/database.js';
import type {
  RelationshipType,
  CreateRelationshipTypeRequest,
  UpdateRelationshipTypeRequest,
  RelationshipTypeRow
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export interface CreateRelationshipTypeRequest {
  name: string;
  sourceClassId: string;
  targetClassId: string;
  description?: string;
  direction?: 'outbound' | 'inbound' | 'undirected';
  isTransitive?: boolean;
  isSymmetric?: boolean;
  inverseRelationshipId?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateRelationshipTypeRequest {
  name?: string;
  description?: string;
  direction?: 'outbound' | 'inbound' | 'undirected';
  isTransitive?: boolean;
  isSymmetric?: boolean;
  inverseRelationshipId?: string;
  metadata?: Record<string, unknown>;
}

export class RelationshipTypeService {
  /**
   * Create a new relationship type
   */
  async create(data: CreateRelationshipTypeRequest): Promise<RelationshipType> {
    const id = uuidv4();

    const result = await query<RelationshipTypeRow>(
      `INSERT INTO relationship_types
       (id, name, source_class_id, target_class_id, description, direction, is_transitive, is_symmetric, inverse_relationship_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        data.name,
        data.sourceClassId,
        data.targetClassId,
        data.description || null,
        data.direction || 'undirected',
        data.isTransitive || false,
        data.isSymmetric || false,
        data.inverseRelationshipId || null,
        data.metadata || {}
      ]
    );

    return this.mapRowToRelationshipType(result.rows[0]);
  }

  /**
   * Get a relationship type by ID
   */
  async getById(id: string): Promise<RelationshipType | null> {
    const result = await query<RelationshipTypeRow>(
      'SELECT * FROM relationship_types WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToRelationshipType(result.rows[0]);
  }

  /**
   * Get a relationship type by name
   */
  async getByName(name: string): Promise<RelationshipType | null> {
    const result = await query<RelationshipTypeRow>(
      'SELECT * FROM relationship_types WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToRelationshipType(result.rows[0]);
  }

  /**
   * Get all relationship types
   */
  async getAll(): Promise<RelationshipType[]> {
    const result = await query<RelationshipTypeRow>(
      'SELECT * FROM relationship_types ORDER BY name'
    );

    return result.rows.map(row => this.mapRowToRelationshipType(row));
  }

  /**
   * Get relationship types by source class
   */
  async getBySourceClass(sourceClassId: string): Promise<RelationshipType[]> {
    const result = await query<RelationshipTypeRow>(
      'SELECT * FROM relationship_types WHERE source_class_id = $1 ORDER BY name',
      [sourceClassId]
    );

    return result.rows.map(row => this.mapRowToRelationshipType(row));
  }

  /**
   * Get relationship types by target class
   */
  async getByTargetClass(targetClassId: string): Promise<RelationshipType[]> {
    const result = await query<RelationshipTypeRow>(
      'SELECT * FROM relationship_types WHERE target_class_id = $1 ORDER BY name',
      [targetClassId]
    );

    return result.rows.map(row => this.mapRowToRelationshipType(row));
  }

  /**
   * Get all relationship types for a class (as source or target)
   */
  async getByClassId(classId: string): Promise<RelationshipType[]> {
    const result = await query<RelationshipTypeRow>(
      `SELECT * FROM relationship_types
       WHERE source_class_id = $1 OR target_class_id = $1
       ORDER BY name`,
      [classId]
    );

    return result.rows.map(row => this.mapRowToRelationshipType(row));
  }

  /**
   * Update a relationship type
   */
  async update(id: string, data: UpdateRelationshipTypeRequest): Promise<RelationshipType | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.direction !== undefined) {
      updates.push(`direction = $${paramIndex++}`);
      values.push(data.direction);
    }
    if (data.isTransitive !== undefined) {
      updates.push(`is_transitive = $${paramIndex++}`);
      values.push(data.isTransitive);
    }
    if (data.isSymmetric !== undefined) {
      updates.push(`is_symmetric = $${paramIndex++}`);
      values.push(data.isSymmetric);
    }
    if (data.inverseRelationshipId !== undefined) {
      updates.push(`inverse_relationship_id = $${paramIndex++}`);
      values.push(data.inverseRelationshipId);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query<RelationshipTypeRow>(
      `UPDATE relationship_types SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToRelationshipType(result.rows[0]);
  }

  /**
   * Delete a relationship type
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM relationship_types WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get transitive closure of relationships
   */
  async getTransitiveClosure(startClassId: string, relationshipName?: string): Promise<string[]> {
    const relationshipFilter = relationshipName
      ? 'AND rt.name = $2'
      : '';
    const params = relationshipName
      ? [startClassId, relationshipName]
      : [startClassId];

    const result = await query<{ target_class_id: string }>(
      `WITH RECURSIVE transitive_rels AS (
        SELECT rt.target_class_id
        FROM relationship_types rt
        WHERE rt.source_class_id = $1 AND rt.is_transitive = true ${relationshipFilter}
        UNION ALL
        SELECT rt2.target_class_id
        FROM relationship_types rt2
        INNER JOIN transitive_rels tr ON rt2.source_class_id = tr.target_class_id
        WHERE rt2.is_transitive = true ${relationshipFilter}
      )
      SELECT DISTINCT target_class_id FROM transitive_rels`,
      params
    );

    return result.rows.map(row => row.target_class_id);
  }

  /**
   * Map database row to RelationshipType
   */
  private mapRowToRelationshipType(row: RelationshipTypeRow): RelationshipType {
    return {
      id: row.id,
      name: row.name,
      sourceClassId: row.source_class_id,
      targetClassId: row.target_class_id,
      description: row.description || undefined,
      direction: row.direction,
      isTransitive: row.is_transitive,
      isSymmetric: row.is_symmetric,
      inverseRelationshipId: row.inverse_relationship_id || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const relationshipTypeService = new RelationshipTypeService();
export default relationshipTypeService;
