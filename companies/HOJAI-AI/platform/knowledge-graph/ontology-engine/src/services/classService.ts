/**
 * Class Service - CRUD operations for ontological classes
 */

import { query, withTransaction } from '../db/database.js';
import type {
  OntologyClass,
  Property,
  CreateClassRequest,
  UpdateClassRequest,
  ClassRow,
  PropertyRow,
  HierarchyOptions
} from '../models/types.js';
import { v4 as uuidv4 } from 'uuid';

export class ClassService {
  /**
   * Create a new class
   */
  async create(data: CreateClassRequest): Promise<OntologyClass> {
    const id = uuidv4();

    const result = await query<ClassRow>(
      `INSERT INTO classes (id, name, description, parent_class_id, is_abstract, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, data.name, data.description || null, data.parentClassId || null, data.isAbstract || false, data.metadata || {}]
    );

    return this.mapRowToClass(result.rows[0]);
  }

  /**
   * Get a class by ID
   */
  async getById(id: string): Promise<OntologyClass | null> {
    const result = await query<ClassRow>(
      'SELECT * FROM classes WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToClass(result.rows[0]);
  }

  /**
   * Get a class by name
   */
  async getByName(name: string): Promise<OntologyClass | null> {
    const result = await query<ClassRow>(
      'SELECT * FROM classes WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToClass(result.rows[0]);
  }

  /**
   * Get all classes
   */
  async getAll(options?: HierarchyOptions): Promise<OntologyClass[]> {
    const result = await query<ClassRow>(
      'SELECT * FROM classes ORDER BY name'
    );

    const classes = result.rows.map(row => this.mapRowToClass(row));

    if (options?.includeProperties || options?.includeInherited) {
      return Promise.all(
        classes.map(c => this.enrichWithDetails(c, options))
      );
    }

    return classes;
  }

  /**
   * Get class with properties
   */
  async getWithProperties(id: string): Promise<OntologyClass | null> {
    const classResult = await query<ClassRow>(
      'SELECT * FROM classes WHERE id = $1',
      [id]
    );

    if (classResult.rows.length === 0) return null;

    const classData = this.mapRowToClass(classResult.rows[0]);

    // Get direct properties
    const propsResult = await query<PropertyRow>(
      'SELECT * FROM properties WHERE class_id = $1 ORDER BY name',
      [id]
    );

    classData.properties = propsResult.rows.map(row => this.mapRowToProperty(row));

    // Get inherited properties if needed
    const inheritedProps = await this.getInheritedProperties(id);
    classData.inheritedProperties = inheritedProps;

    return classData;
  }

  /**
   * Get inherited properties through class hierarchy
   */
  async getInheritedProperties(classId: string): Promise<Property[]> {
    const result = await query<PropertyRow>(
      `WITH RECURSIVE inheritance_chain AS (
        SELECT id, parent_class_id, name
        FROM classes
        WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_class_id, c.name
        FROM classes c
        INNER JOIN inheritance_chain ic ON c.id = ic.parent_class_id
      )
      SELECT p.*
      FROM properties p
      INNER JOIN inheritance_chain ic ON p.class_id = ic.id
      WHERE p.class_id != $1
      ORDER BY p.name`,
      [classId]
    );

    return result.rows.map(row => ({
      ...this.mapRowToProperty(row),
      isInherited: true
    }));
  }

  /**
   * Update a class
   */
  async update(id: string, data: UpdateClassRequest): Promise<OntologyClass | null> {
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
    if (data.parentClassId !== undefined) {
      updates.push(`parent_class_id = $${paramIndex++}`);
      values.push(data.parentClassId);
    }
    if (data.isAbstract !== undefined) {
      updates.push(`is_abstract = $${paramIndex++}`);
      values.push(data.isAbstract);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(data.metadata);
    }

    if (updates.length === 0) return this.getById(id);

    values.push(id);
    const result = await query<ClassRow>(
      `UPDATE classes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToClass(result.rows[0]);
  }

  /**
   * Delete a class
   */
  async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM classes WHERE id = $1 RETURNING id',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Get class hierarchy (ancestors)
   */
  async getHierarchy(id: string): Promise<OntologyClass[]> {
    const result = await query<ClassRow>(
      `WITH RECURSIVE class_hierarchy AS (
        SELECT * FROM classes WHERE id = $1
        UNION ALL
        SELECT c.* FROM classes c
        INNER JOIN class_hierarchy ch ON c.id = ch.parent_class_id
      )
      SELECT * FROM class_hierarchy ORDER BY name`,
      [id]
    );

    return result.rows.map(row => this.mapRowToClass(row));
  }

  /**
   * Get direct children of a class
   */
  async getChildren(id: string): Promise<OntologyClass[]> {
    const result = await query<ClassRow>(
      'SELECT * FROM classes WHERE parent_class_id = $1 ORDER BY name',
      [id]
    );

    return result.rows.map(row => this.mapRowToClass(row));
  }

  /**
   * Get all descendants of a class
   */
  async getDescendants(id: string): Promise<OntologyClass[]> {
    const result = await query<ClassRow>(
      `WITH RECURSIVE class_descendants AS (
        SELECT * FROM classes WHERE parent_class_id = $1
        UNION ALL
        SELECT c.* FROM classes c
        INNER JOIN class_descendants cd ON c.parent_class_id = cd.id
      )
      SELECT * FROM class_descendants ORDER BY name`,
      [id]
    );

    return result.rows.map(row => this.mapRowToClass(row));
  }

  /**
   * Get class lineage (path from root to this class)
   */
  async getLineage(id: string): Promise<OntologyClass[]> {
    const result = await query<ClassRow>(
      `WITH RECURSIVE class_lineage AS (
        SELECT *, 0 as level FROM classes WHERE id = $1
        UNION ALL
        SELECT c.*, cl.level + 1 FROM classes c
        INNER JOIN class_lineage cl ON c.id = cl.parent_class_id
      )
      SELECT * FROM class_lineage ORDER BY level DESC`,
      [id]
    );

    return result.rows.map(row => this.mapRowToClass(row));
  }

  /**
   * Check if a class is a subclass of another
   */
  async isSubclassOf(classId: string, potentialAncestorId: string): Promise<boolean> {
    const result = await query<{ exists: boolean }>(
      `WITH RECURSIVE ancestors AS (
        SELECT id, parent_class_id FROM classes WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_class_id FROM classes c
        INNER JOIN ancestors a ON c.id = a.parent_class_id
      )
      SELECT EXISTS(SELECT 1 FROM ancestors WHERE id = $2) as exists`,
      [classId, potentialAncestorId]
    );

    return result.rows[0]?.exists || false;
  }

  /**
   * Get all classes that are subclasses of a given class
   */
  async getSubclasses(parentId: string): Promise<OntologyClass[]> {
    return this.getDescendants(parentId);
  }

  /**
   * Enrich class with related data
   */
  private async enrichWithDetails(
    classData: OntologyClass,
    options: HierarchyOptions
  ): Promise<OntologyClass> {
    if (options.includeProperties) {
      const propsResult = await query<PropertyRow>(
        'SELECT * FROM properties WHERE class_id = $1 ORDER BY name',
        [classData.id]
      );
      classData.properties = propsResult.rows.map(row => this.mapRowToProperty(row));
    }

    if (options.includeInherited) {
      classData.inheritedProperties = await this.getInheritedProperties(classData.id);
    }

    return classData;
  }

  /**
   * Map database row to OntologyClass
   */
  private mapRowToClass(row: ClassRow): OntologyClass {
    return {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      parentClassId: row.parent_class_id || undefined,
      isAbstract: row.is_abstract,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
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
}

export const classService = new ClassService();
export default classService;
