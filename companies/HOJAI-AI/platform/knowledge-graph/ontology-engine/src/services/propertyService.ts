/**
 * Property Service - CRUD operations for class properties
 */

import { query } from '../db/database.js';
import type {
  Property,
  Constraint,
  CreatePropertyRequest,
  UpdatePropertyRequest,
  PropertyRow,
  ConstraintRow,
  ConstraintType,
  PropertyDataType
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class PropertyService {
  /**
   * Create a new property
   */
  async create(data: CreatePropertyRequest): Promise<Property> {
    const id = uuidv4();

    const result = await query<PropertyRow>(
      `INSERT INTO properties (id, name, class_id, data_type, description, default_value, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        data.name,
        data.classId,
        data.dataType,
        data.description || null,
        data.defaultValue ? JSON.stringify(data.defaultValue) : null,
        data.metadata || {}
      ]
    );

    return this.mapRowToProperty(result.rows[0]);
  }

  /**
   * Get a property by ID
   */
  async getById(id: string): Promise<Property | null> {
    const result = await query<PropertyRow>(
      'SELECT * FROM properties WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToProperty(result.rows[0]);
  }

  /**
   * Get all properties for a class
   */
  async getByClassId(classId: string): Promise<Property[]> {
    const result = await query<PropertyRow>(
      'SELECT * FROM properties WHERE class_id = $1 ORDER BY name',
      [classId]
    );

    return result.rows.map(row => this.mapRowToProperty(row));
  }

  /**
   * Get all properties for a class including inherited ones
   */
  async getAllForClassIncludingInherited(classId: string): Promise<Property[]> {
    const result = await query<PropertyRow>(
      `WITH RECURSIVE inheritance_chain AS (
        SELECT id, parent_class_id FROM classes WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_class_id FROM classes c
        INNER JOIN inheritance_chain ic ON c.id = ic.parent_class_id
      )
      SELECT p.*
      FROM properties p
      INNER JOIN inheritance_chain ic ON p.class_id = ic.id
      ORDER BY p.name`,
      [classId]
    );

    return result.rows.map(row => ({
      ...this.mapRowToProperty(row),
      isInherited: row.class_id !== classId
    }));
  }

  /**
   * Update a property
   */
  async update(id: string, data: UpdatePropertyRequest): Promise<Property | null> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.dataType !== undefined) {
      updates.push(`data_type = $${paramIndex++}`);
      values.push(data.dataType);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex++}`);
      values.push(JSON.stringify(data.defaultValue));
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query<PropertyRow>(
      `UPDATE properties SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToProperty(result.rows[0]);
  }

  /**
   * Delete a property
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM properties WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get constraints for a property
   */
  async getConstraints(propertyId: string): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE property_id = $1 ORDER BY constraint_type',
      [propertyId]
    );

    return result.rows.map(row => this.mapRowToConstraint(row));
  }

  /**
   * Add a constraint to a property
   */
  async addConstraint(
    propertyId: string,
    constraintType: ConstraintType,
    value: unknown,
    errorMessage?: string
  ): Promise<Constraint> {
    const id = uuidv4();

    const result = await query<ConstraintRow>(
      `INSERT INTO constraints (id, property_id, constraint_type, value, error_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, propertyId, constraintType, JSON.stringify(value), errorMessage || null]
    );

    return this.mapRowToConstraint(result.rows[0]);
  }

  /**
   * Remove a constraint from a property
   */
  async removeConstraint(constraintId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM constraints WHERE id = $1 RETURNING id',
      [constraintId]
    );
    return result.rowCount > 0;
  }

  /**
   * Get property by name for a class
   */
  async getByNameAndClass(name: string, classId: string): Promise<Property | null> {
    const result = await query<PropertyRow>(
      'SELECT * FROM properties WHERE name = $1 AND class_id = $2',
      [name, classId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToProperty(result.rows[0]);
  }

  /**
   * Check if a property exists in a class or its ancestors
   */
  async existsInHierarchy(classId: string, propertyName: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `WITH RECURSIVE inheritance_chain AS (
        SELECT id FROM classes WHERE id = $1
        UNION ALL
        SELECT c.id FROM classes c
        INNER JOIN inheritance_chain ic ON c.id = ic.parent_class_id
      )
      SELECT EXISTS(
        SELECT 1 FROM properties p
        INNER JOIN inheritance_chain ic ON p.class_id = ic.id
        WHERE p.name = $2
      ) as exists`,
      [classId, propertyName]
    );

    return result.rows[0]?.exists || false;
  }

  /**
   * Map database row to Property
   */
  private mapRowToProperty(row: PropertyRow): Property {
    return {
      id: row.id,
      name: row.name,
      classId: row.class_id,
      dataType: row.data_type,
      description: row.description || undefined,
      defaultValue: row.default_value,
      isInherited: row.is_inherited,
      sourceClassId: row.source_class_id || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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

export const propertyService = new PropertyService();
export default propertyService;
