/**
 * Unit tests for ConstraintService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConstraintService } from '../../src/services/constraintService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('ConstraintService', () => {
  let service: ConstraintService;

  beforeEach(() => {
    service = new ConstraintService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a constraint for a property', async () => {
      const mockConstraint = {
        id: 'constraint-1',
        property_id: 'prop-1',
        relationship_type_id: null,
        constraint_type: 'required',
        value: true,
        error_message: 'Name is required',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConstraint], rowCount: 1 });

      const result = await service.create({
        propertyId: 'prop-1',
        constraintType: 'required',
        value: true,
        errorMessage: 'Name is required'
      });

      expect(result.propertyId).toBe('prop-1');
      expect(result.constraintType).toBe('required');
      expect(result.value).toBe(true);
    });

    it('should create a range constraint', async () => {
      const mockConstraint = {
        id: 'constraint-2',
        property_id: 'prop-2',
        relationship_type_id: null,
        constraint_type: 'range',
        value: { min: 0, max: 100 },
        error_message: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConstraint], rowCount: 1 });

      const result = await service.create({
        propertyId: 'prop-2',
        constraintType: 'range',
        value: { min: 0, max: 100 }
      });

      expect(result.constraintType).toBe('range');
      expect(result.value).toEqual({ min: 0, max: 100 });
    });

    it('should create a cardinality constraint', async () => {
      const mockConstraint = {
        id: 'constraint-3',
        property_id: 'prop-3',
        relationship_type_id: null,
        constraint_type: 'cardinality',
        value: { min: 1, max: 10 },
        error_message: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockConstraint], rowCount: 1 });

      const result = await service.create({
        propertyId: 'prop-3',
        constraintType: 'cardinality',
        value: { min: 1, max: 10 }
      });

      expect(result.constraintType).toBe('cardinality');
    });
  });

  describe('getById', () => {
    it('should return a constraint when found', async () => {
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

      const result = await service.getById('constraint-1');

      expect(result).toBeDefined();
      expect(result?.constraintType).toBe('required');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByPropertyId', () => {
    it('should return all constraints for a property', async () => {
      const mockConstraints = [
        {
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'required',
          value: true,
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'constraint-2',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'type',
          value: 'string',
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockConstraints, rowCount: 2 });

      const result = await service.getByPropertyId('prop-1');

      expect(result).toHaveLength(2);
    });
  });

  describe('getByType', () => {
    it('should return constraints by type', async () => {
      const mockConstraints = [
        {
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'required',
          value: true,
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockConstraints, rowCount: 1 });

      const result = await service.getByType('required');

      expect(result).toHaveLength(1);
      expect(result[0].constraintType).toBe('required');
    });
  });

  describe('getAll', () => {
    it('should return all constraints', async () => {
      const mockConstraints = [
        {
          id: 'constraint-1',
          property_id: 'prop-1',
          relationship_type_id: null,
          constraint_type: 'required',
          value: true,
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'constraint-2',
          property_id: 'prop-2',
          relationship_type_id: null,
          constraint_type: 'range',
          value: { min: 0, max: 100 },
          error_message: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockConstraints, rowCount: 2 });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update constraint value', async () => {
      const updatedConstraint = {
        id: 'constraint-1',
        property_id: 'prop-1',
        relationship_type_id: null,
        constraint_type: 'range',
        value: { min: 0, max: 200 },
        error_message: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedConstraint], rowCount: 1 });

      const result = await service.update('constraint-1', {
        value: { min: 0, max: 200 }
      });

      expect(result?.value).toEqual({ min: 0, max: 200 });
    });

    it('should update constraint error message', async () => {
      const updatedConstraint = {
        id: 'constraint-1',
        property_id: 'prop-1',
        relationship_type_id: null,
        constraint_type: 'required',
        value: true,
        error_message: 'Updated error message',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedConstraint], rowCount: 1 });

      const result = await service.update('constraint-1', {
        errorMessage: 'Updated error message'
      });

      expect(result?.errorMessage).toBe('Updated error message');
    });
  });

  describe('delete', () => {
    it('should return true when constraint is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete('constraint-1');

      expect(result).toBe(true);
    });

    it('should return false when constraint not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
