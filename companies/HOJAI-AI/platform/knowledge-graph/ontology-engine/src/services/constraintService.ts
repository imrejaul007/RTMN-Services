/**
 * Constraint Service - CRUD for constraints on properties and relationships
 */

import { query } from '../db/database.js';
import type {
  Constraint,
  CreateConstraintRequest,
  ConstraintRow,
  ConstraintType
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class ConstraintService {
  /**
   * Create a new constraint
   */
  async create(data: CreateConstraintRequest): Promise<Constraint> {
    const id = uuidv4();

    const result = await query<ConstraintRow>(
      `INSERT INTO constraints (id, property_id, relationship_type_id, constraint_type, value, error_message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        data.propertyId || null,
        data.relationshipTypeId || null,
        data.constraintType,
        JSON.stringify(data.value),
        data.errorMessage || null,
        data.metadata || {}
      ]
    );

    return this.mapRowToConstraint(result.rows[0]);
  }

  /**
   * Get a constraint by ID
   */
  async getById(id: string): Promise<Constraint | null> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToConstraint(result.rows[0]);
  }

  /**
   * Get all constraints for a property
   */
  async getByPropertyId(propertyId: string): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE property_id = $1 ORDER BY constraint_type',
      [propertyId]
    );

    return result.rows.map(row => this.mapRowToConstraint(row));
  }

  /**
   * Get all constraints for a relationship type
   */
  async getByRelationshipTypeId(relationshipTypeId: string): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE relationship_type_id = $1 ORDER BY constraint_type',
      [relationshipTypeId]
    );

    return result.rows.map(row => this.mapRowToConstraint(row));
  }

  /**
   * Get all constraints of a specific type
   */
  async getByType(constraintType: ConstraintType): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE constraint_type = $1 ORDER BY created_at DESC',
      [constraintType]
    );

    return result.rows.map(row => this.mapRowToConstraint(row));
  }

  /**
   * Get all constraints
   */
  async getAll(): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints ORDER BY constraint_type, created_at DESC'
    );

    return result.rows.map(row => this.mapRowToConstraint(row));
  }

  /**
   * Update a constraint
   */
  async update(
    id: string,
    data: { value?: unknown; errorMessage?: string; metadata?: Record<string, unknown> }
  ): Promise<Constraint | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      values.push(JSON.stringify(data.value));
    }
    if (data.errorMessage !== undefined) {
      updates.push(`error_message = $${paramIndex++}`);
      values.push(data.errorMessage);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query<ConstraintRow>(
      `UPDATE constraints SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToConstraint(result.rows[0]);
  }

  /**
   * Delete a constraint
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM constraints WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Map database row to Constraint
   */
  private mapRowToConstraint(row: ConstraintRow): Constraint {
    return {
      id: row.id,
      propertyId: row.property_id || undefined,
      relationshipTypeId: row.relationship_type_id || undefined,
      constraintType: row.constraint_type,
      value: row.value,
      errorMessage: row.error_message || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export const constraintService = new ConstraintService();
export default constraintService;
