/**
 * Unit tests for PropertyService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PropertyService } from '../../src/services/propertyService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('PropertyService', () => {
  let service: PropertyService;

  beforeEach(() => {
    service = new PropertyService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a property with all fields', async () => {
      const mockProperty = {
        id: 'prop-1',
        name: 'name',
        class_id: 'class-1',
        data_type: 'string',
        description: 'The name property',
        default_value: null,
        is_inherited: false,
        source_class_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockProperty], rowCount: 1 });

      const result = await service.create({
        name: 'name',
        classId: 'class-1',
        dataType: 'string',
        description: 'The name property'
      });

      expect(result.name).toBe('name');
      expect(result.dataType).toBe('string');
      expect(result.classId).toBe('class-1');
    });

    it('should create property with default value', async () => {
      const mockProperty = {
        id: 'prop-1',
        name: 'status',
        class_id: 'class-1',
        data_type: 'string',
        description: null,
        default_value: 'active',
        is_inherited: false,
        source_class_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockProperty], rowCount: 1 });

      const result = await service.create({
        name: 'status',
        classId: 'class-1',
        dataType: 'string',
        defaultValue: 'active'
      });

      expect(result.defaultValue).toBe('active');
    });
  });

  describe('getById', () => {
    it('should return a property when found', async () => {
      const mockProperty = {
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
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockProperty], rowCount: 1 });

      const result = await service.getById('prop-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('age');
      expect(result?.dataType).toBe('number');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByClassId', () => {
    it('should return all properties for a class', async () => {
      const mockProperties = [
        {
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
        },
        {
          id: 'prop-2',
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
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockProperties, rowCount: 2 });

      const result = await service.getByClassId('class-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('getAllForClassIncludingInherited', () => {
    it('should return direct and inherited properties', async () => {
      const mockProperties = [
        {
          id: 'prop-1',
          name: 'name',
          class_id: 'parent-class',
          data_type: 'string',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: 'parent-class',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'prop-2',
          name: 'age',
          class_id: 'child-class',
          data_type: 'number',
          description: null,
          default_value: null,
          is_inherited: false,
          source_class_id: 'child-class',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockProperties, rowCount: 2 });

      const result = await service.getAllForClassIncludingInherited('child-class');

      expect(result).toHaveLength(2);
      expect(result.some(p => p.name === 'name' && p.isInherited)).toBe(true);
    });
  });

  describe('update', () => {
    it('should update property name', async () => {
      const updatedProperty = {
        id: 'prop-1',
        name: 'newName',
        class_id: 'class-1',
        data_type: 'string',
        description: null,
        default_value: null,
        is_inherited: false,
        source_class_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedProperty], rowCount: 1 });

      const result = await service.update('prop-1', { name: 'newName' });

      expect(result?.name).toBe('newName');
    });

    it('should update property data type', async () => {
      const updatedProperty = {
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
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedProperty], rowCount: 1 });

      const result = await service.update('prop-1', { dataType: 'number' });

      expect(result?.dataType).toBe('number');
    });
  });

  describe('delete', () => {
    it('should return true when property is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete('prop-1');

      expect(result).toBe(true);
    });

    it('should return false when property not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getConstraints', () => {
    it('should return constraints for a property', async () => {
      const mockConstraints = [
        {
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'required',
          value: true,
          error_message: 'Name is required',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockConstraints, rowCount: 1 });

      const result = await service.getConstraints('prop-1');

      expect(result).toHaveLength(1);
      expect(result[0].constraintType).toBe('required');
    });
  });

  describe('addConstraint', () => {
    it('should add a constraint to a property', async () => {
      const mockConstraint = {
        id: 'constraint-1',
        property_id: 'prop-1',
        relationship_type_id: null,
        constraint_type: 'required',
        value: true,
        error_message: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConstraint], rowCount: 1 });

      const result = await service.addConstraint('prop-1', 'required', true);

      expect(result.propertyId).toBe('prop-1');
      expect(result.constraintType).toBe('required');
    });
  });

  describe('existsInHierarchy', () => {
    it('should return true when property exists in hierarchy', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });

      const result = await service.existsInHierarchy('child-class', 'inheritedProperty');

      expect(result).toBe(true);
    });

    it('should return false when property does not exist in hierarchy', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });

      const result = await service.existsInHierarchy('class-1', 'nonexistentProperty');

      expect(result).toBe(false);
    });
  });
});
