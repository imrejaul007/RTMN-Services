/**
 * Validation Service - Schema validation for entities against classes
 */

import { query } from '../db/database.js';
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Property,
  PropertyRow,
  Constraint,
  ConstraintRow,
  OntologyClass,
  ClassRow,
  PropertyDataType
} from '../models/types.js';

export class ValidationService {
  /**
   * Validate an entity against a class schema
   */
  async validate(
    classId: string,
    data: Record<string, unknown>,
    strict: boolean = false
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get the class and its properties (including inherited)
    const classData = await this.getClassWithProperties(classId);
    if (!classData) {
      errors.push({
        path: '$',
        message: `Class with ID '${classId}' not found`,
        constraintType: 'required'
      });
      return { valid: false, errors, warnings };
    }

    // Get all properties for this class (including inherited)
    const allProperties = await this.getAllPropertiesForClass(classId);

    // Check for required properties
    const requiredProps = allProperties.filter(p =>
      p.constraints?.some(c => c.constraintType === 'required')
    );

    for (const required of requiredProps) {
      if (data[required.name] === undefined || data[required.name] === null) {
        errors.push({
          path: `$.${required.name}`,
          message: `Required property '${required.name}' is missing`,
          constraintType: 'required',
          expected: 'any value'
        });
      }
    }

    // Validate each provided property
    for (const [key, value] of Object.entries(data)) {
      const property = allProperties.find(p => p.name === key);

      if (!property) {
        if (strict) {
          errors.push({
            path: `$.${key}`,
            message: `Unknown property '${key}' for class '${classData.name}'`,
            constraintType: 'type'
          });
        } else {
          warnings.push({
            path: `$.${key}`,
            message: `Property '${key}' is not defined in class '${classData.name}'`,
            suggestion: 'Add property definition or remove from data'
          });
        }
        continue;
      }

      // Type validation
      const typeErrors = this.validateType(property, value);
      errors.push(...typeErrors.map(e => ({ ...e, path: `$.${key}` })));

      // Constraint validation
      if (property.constraints) {
        for (const constraint of property.constraints) {
          const constraintErrors = this.validateConstraint(constraint, value);
          if (constraintErrors.length > 0) {
            errors.push(...constraintErrors.map(e => ({
              ...e,
              path: `$.${key}`,
              constraintType: constraint.constraintType
            })));
          }
        }
      }
    }

    // Apply default values for missing optional properties
    for (const prop of allProperties) {
      if (
        data[prop.name] === undefined &&
        prop.defaultValue !== undefined &&
        !requiredProps.includes(prop)
      ) {
        warnings.push({
          path: `$.${prop.name}`,
          message: `Property '${prop.name}' will use default value`,
          suggestion: `Default value: ${JSON.stringify(prop.defaultValue)}`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get class with its direct properties
   */
  private async getClassWithProperties(classId: string): Promise<OntologyClass | null> {
    const result = await query<ClassRow>(
      'SELECT * FROM classes WHERE id = $1',
      [classId]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
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
   * Get all properties for a class including inherited ones
   */
  private async getAllPropertiesForClass(classId: string): Promise<Property[]> {
    const result = await query<PropertyRow>(
      `WITH RECURSIVE inheritance_chain AS (
        SELECT id, parent_class_id FROM classes WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_class_id FROM classes c
        INNER JOIN inheritance_chain ic ON c.id = ic.parent_class_id
      )
      SELECT p.*, ic.id as source_class_id,
             CASE WHEN p.class_id != $1 THEN true ELSE false END as is_inherited
      FROM properties p
      INNER JOIN inheritance_chain ic ON p.class_id = ic.id
      ORDER BY p.name`,
      [classId]
    );

    const properties: Property[] = [];

    for (const row of result.rows) {
      const prop: Property = {
        id: row.id,
        name: row.name,
        classId: row.class_id,
        dataType: row.data_type,
        description: row.description || undefined,
        defaultValue: row.default_value,
        isInherited: row.class_id !== classId,
        sourceClassId: row.source_class_id || undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      // Get constraints for this property
      prop.constraints = await this.getConstraintsForProperty(row.id);
      properties.push(prop);
    }

    return properties;
  }

  /**
   * Get constraints for a property
   */
  private async getConstraintsForProperty(propertyId: string): Promise<Constraint[]> {
    const result = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE property_id = $1 ORDER BY constraint_type',
      [propertyId]
    );

    return result.rows.map(row => ({
      id: row.id,
      propertyId: row.property_id || undefined,
      relationshipTypeId: row.relationship_type_id || undefined,
      constraintType: row.constraint_type,
      value: row.value,
      errorMessage: row.error_message || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  /**
   * Validate property type
   */
  private validateType(property: Property, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined) {
      return errors; // null/undefined is handled by required constraint
    }

    const dataType = property.dataType;
    const typeValid = this.checkType(value, dataType);

    if (!typeValid) {
      errors.push({
        path: '',
        message: property.errorMessage || `Expected type '${dataType}' but got '${typeof value}'`,
        constraintType: 'type',
        expected: dataType,
        actual: typeof value
      });
    }

    return errors;
  }

  /**
   * Check if a value matches a data type
   */
  private checkType(value: unknown, dataType: PropertyDataType): boolean {
    switch (dataType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'datetime':
        return typeof value === 'string' && !isNaN(Date.parse(value));
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'uri':
        return typeof value === 'string' && this.isValidUri(value);
      case 'enum':
        return true; // Enum validation is done via range constraint
      default:
        return true;
    }
  }

  /**
   * Check if a string is a valid URI
   */
  private isValidUri(uri: string): boolean {
    try {
      new URL(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a specific constraint
   */
  private validateConstraint(constraint: Constraint, value: unknown): ValidationError[] {
    const errors: ValidationError[] = [];
    const constraintValue = constraint.value;

    switch (constraint.constraintType) {
      case 'required':
        if (value === undefined || value === null) {
          errors.push({
            path: '',
            message: constraint.errorMessage || 'Value is required',
            constraintType: 'required'
          });
        }
        break;

      case 'type':
        // Type validation is handled separately
        break;

      case 'cardinality':
        if (Array.isArray(value)) {
          const cardValue = constraintValue as { min?: number; max?: number };
          if (cardValue.min !== undefined && value.length < cardValue.min) {
            errors.push({
              path: '',
              message: constraint.errorMessage || `Array length must be at least ${cardValue.min}`,
              constraintType: 'cardinality',
              expected: `min: ${cardValue.min}`,
              actual: value.length
            });
          }
          if (cardValue.max !== undefined && value.length > cardValue.max) {
            errors.push({
              path: '',
              message: constraint.errorMessage || `Array length must be at most ${cardValue.max}`,
              constraintType: 'cardinality',
              expected: `max: ${cardValue.max}`,
              actual: value.length
            });
          }
        }
        break;

      case 'range':
        if (typeof value === 'number') {
          const range = constraintValue as { min?: number; max?: number };
          if (range.min !== undefined && value < range.min) {
            errors.push({
              path: '',
              message: constraint.errorMessage || `Value must be at least ${range.min}`,
              constraintType: 'range',
              expected: `min: ${range.min}`,
              actual: value
            });
          }
          if (range.max !== undefined && value > range.max) {
            errors.push({
              path: '',
              message: constraint.errorMessage || `Value must be at most ${range.max}`,
              constraintType: 'range',
              expected: `max: ${range.max}`,
              actual: value
            });
          }
        }
        break;

      case 'pattern':
        if (typeof value === 'string') {
          const pattern = constraintValue as string;
          const regex = new RegExp(pattern);
          if (!regex.test(value)) {
            errors.push({
              path: '',
              message: constraint.errorMessage || `Value must match pattern: ${pattern}`,
              constraintType: 'pattern',
              expected: `pattern: ${pattern}`,
              actual: value
            });
          }
        }
        break;

      case 'custom':
        // Custom validation logic can be extended here
        break;
    }

    return errors;
  }

  /**
   * Validate an instance against relationship constraints
   */
  async validateRelationship(
    sourceClassId: string,
    targetClassId: string,
    relationshipTypeId: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Get the relationship type
    const relResult = await query(
      'SELECT * FROM relationship_types WHERE id = $1',
      [relationshipTypeId]
    );

    if (relResult.rows.length === 0) {
      errors.push({
        path: '$',
        message: `Relationship type '${relationshipTypeId}' not found`,
        constraintType: 'required'
      });
      return { valid: false, errors, warnings };
    }

    const relType = relResult.rows[0];

    // Check source class
    if (relType.source_class_id !== sourceClassId) {
      errors.push({
        path: '$.sourceClassId',
        message: `Source class does not match relationship source (expected '${relType.source_class_id}')`,
        constraintType: 'type',
        expected: relType.source_class_id,
        actual: sourceClassId
      });
    }

    // Check target class
    if (relType.target_class_id !== targetClassId) {
      errors.push({
        path: '$.targetClassId',
        message: `Target class does not match relationship target (expected '${relType.target_class_id}')`,
        constraintType: 'type',
        expected: relType.target_class_id,
        actual: targetClassId
      });
    }

    // Get and apply relationship constraints
    const constraintsResult = await query<ConstraintRow>(
      'SELECT * FROM constraints WHERE relationship_type_id = $1',
      [relationshipTypeId]
    );

    for (const row of constraintsResult.rows) {
      const constraint = {
        id: row.id,
        relationshipTypeId: row.relationship_type_id || undefined,
        constraintType: row.constraint_type,
        value: row.value,
        errorMessage: row.error_message || undefined,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };

      const constraintErrors = this.validateConstraint(constraint, null);
      errors.push(...constraintErrors.map(e => ({
        ...e,
        path: '$.relationship'
      })));
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const validationService = new ValidationService();
export default validationService;
