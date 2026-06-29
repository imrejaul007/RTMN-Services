/**
 * Unit tests for ValidationService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationService } from '../../src/services/validationService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('ValidationService', () => {
  let service: ValidationService;

  beforeEach(() => {
    service = new ValidationService();
    vi.clearAllMocks();
  });

  describe('validate', () => {
    it('should return error for nonexistent class', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.validate('nonexistent', { name: 'test' });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not found');
    });

    it('should validate a correct entity', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Person',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock properties (no required constraints)
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.validate('class-1', { name: 'John', age: 30 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Person',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock properties with a required constraint
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'name',
          class_id: 'class-1',
          data_type: 'string',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock constraint
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'required',
          value: true,
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      const result = await service.validate('class-1', { age: 30 });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraintType === 'required')).toBe(true);
    });

    it('should validate string type correctly', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock string property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'name',
          class_id: 'class-1',
          data_type: 'string',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Valid string
      const validResult = await service.validate('class-1', { name: 'John' });
      expect(validResult.valid).toBe(true);
    });

    it('should detect incorrect types', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock number property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'age',
          class_id: 'class-1',
          data_type: 'number',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // String instead of number
      const result = await service.validate('class-1', { age: 'not a number' });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraintType === 'type')).toBe(true);
    });

    it('should validate array cardinality', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock array property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'tags',
          class_id: 'class-1',
          data_type: 'array',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Cardinality constraint: min 1
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'cardinality',
          value: { min: 1 },
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Empty array
      const result = await service.validate('class-1', { tags: [] });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraintType === 'cardinality')).toBe(true);
    });

    it('should validate number range', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock number property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'age',
          class_id: 'class-1',
          data_type: 'number',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Range constraint: 0-150
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'range',
          value: { min: 0, max: 150 },
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Out of range
      const result = await service.validate('class-1', { age: 200 });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraintType === 'range')).toBe(true);
    });

    it('should validate pattern (regex)', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock string property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'email',
          class_id: 'class-1',
          data_type: 'string',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Pattern constraint
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'pattern',
          value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Invalid email
      const result = await service.validate('class-1', { email: 'not-an-email' });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.constraintType === 'pattern')).toBe(true);
    });

    it('should warn about unknown properties in non-strict mode', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No properties
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.validate('class-1', { unknownProp: 'value' }, false);

      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should error on unknown properties in strict mode', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No properties
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.validate('class-1', { unknownProp: 'value' }, true);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Unknown property'))).toBe(true);
    });

    it('should validate URI type - valid', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock URI property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'url',
          class_id: 'class-1',
          data_type: 'uri',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Valid URI
      const validResult = await service.validate('class-1', { url: 'https://example.com' });
      expect(validResult.valid).toBe(true);
    });

    it('should validate URI type - invalid', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock URI property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'url',
          class_id: 'class-1',
          data_type: 'uri',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Invalid URI
      const invalidResult = await service.validate('class-1', { url: 'not a uri' });
      expect(invalidResult.valid).toBe(false);
    });

    it('should validate date type - valid', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock date property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'birthDate',
          class_id: 'class-1',
          data_type: 'date',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Valid date
      const validResult = await service.validate('class-1', { birthDate: '1990-01-15' });
      expect(validResult.valid).toBe(true);
    });

    it('should validate date type - invalid', async () => {
      // Mock class
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'class-1',
          name: 'Test',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // Mock date property
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'prop-1',
          name: 'birthDate',
          class_id: 'class-1',
          data_type: 'date',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }],
        rowCount: 1
      });

      // No constraints
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      // Invalid date
      const invalidResult = await service.validate('class-1', { birthDate: 'not-a-date' });
      expect(invalidResult.valid).toBe(false);
    });
  });

  describe('validateRelationship', () => {
    it('should return error for nonexistent relationship type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.validateRelationship('source', 'target', 'nonexistent');

      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain('not found');
    });
  });
});
