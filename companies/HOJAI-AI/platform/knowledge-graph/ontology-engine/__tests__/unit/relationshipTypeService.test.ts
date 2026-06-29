/**
 * Unit tests for RelationshipTypeService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationshipTypeService } from '../../src/services/relationshipTypeService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('RelationshipTypeService', () => {
  let service: RelationshipTypeService;

  beforeEach(() => {
    service = new RelationshipTypeService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a relationship type', async () => {
      const mockRelType = {
        id: 'rel-1',
        name: 'knows',
        source_class_id: 'Person',
        target_class_id: 'Person',
        description: 'Knows relationship',
        direction: 'undirected',
        is_transitive: false,
        is_symmetric: true,
        inverse_relationship_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRelType], rowCount: 1 });

      const result = await service.create({
        name: 'knows',
        sourceClassId: 'Person',
        targetClassId: 'Person',
        description: 'Knows relationship',
        isSymmetric: true
      });

      expect(result.name).toBe('knows');
      expect(result.isSymmetric).toBe(true);
      expect(result.isTransitive).toBe(false);
    });

    it('should create a transitive relationship', async () => {
      const mockRelType = {
        id: 'rel-1',
        name: 'ancestorOf',
        source_class_id: 'Person',
        target_class_id: 'Person',
        description: null,
        direction: 'outbound',
        is_transitive: true,
        is_symmetric: false,
        inverse_relationship_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRelType], rowCount: 1 });

      const result = await service.create({
        name: 'ancestorOf',
        sourceClassId: 'Person',
        targetClassId: 'Person',
        isTransitive: true,
        direction: 'outbound'
      });

      expect(result.isTransitive).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a relationship type when found', async () => {
      const mockRelType = {
        id: 'rel-1',
        name: 'parentOf',
        source_class_id: 'Person',
        target_class_id: 'Person',
        description: null,
        direction: 'outbound',
        is_transitive: true,
        is_symmetric: false,
        inverse_relationship_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRelType], rowCount: 1 });

      const result = await service.getById('rel-1');

      expect(result).toBeDefined();
      expect(result?.name).toBe('parentOf');
      expect(result?.isTransitive).toBe(true);
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return a relationship type by name', async () => {
      const mockRelType = {
        id: 'rel-1',
        name: 'locatedIn',
        source_class_id: 'Place',
        target_class_id: 'Place',
        description: null,
        direction: 'outbound',
        is_transitive: true,
        is_symmetric: false,
        inverse_relationship_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRelType], rowCount: 1 });

      const result = await service.getByName('locatedIn');

      expect(result?.name).toBe('locatedIn');
    });
  });

  describe('getAll', () => {
    it('should return all relationship types', async () => {
      const mockRelTypes = [
        {
          id: 'rel-1',
          name: 'knows',
          source_class_id: 'Person',
          target_class_id: 'Person',
          description: null,
          direction: 'undirected',
          is_transitive: false,
          is_symmetric: true,
          inverse_relationship_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'rel-2',
          name: 'parentOf',
          source_class_id: 'Person',
          target_class_id: 'Person',
          description: null,
          direction: 'outbound',
          is_transitive: true,
          is_symmetric: false,
          inverse_relationship_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRelTypes, rowCount: 2 });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('getBySourceClass', () => {
    it('should return relationships by source class', async () => {
      const mockRelTypes = [
        {
          id: 'rel-1',
          name: 'knows',
          source_class_id: 'Person',
          target_class_id: 'Person',
          description: null,
          direction: 'undirected',
          is_transitive: false,
          is_symmetric: true,
          inverse_relationship_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRelTypes, rowCount: 1 });

      const result = await service.getBySourceClass('Person');

      expect(result).toHaveLength(1);
      expect(result[0].sourceClassId).toBe('Person');
    });
  });

  describe('getByTargetClass', () => {
    it('should return relationships by target class', async () => {
      const mockRelTypes = [
        {
          id: 'rel-1',
          name: 'parentOf',
          source_class_id: 'Person',
          target_class_id: 'Person',
          description: null,
          direction: 'outbound',
          is_transitive: true,
          is_symmetric: false,
          inverse_relationship_id: null,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockRelTypes, rowCount: 1 });

      const result = await service.getByTargetClass('Person');

      expect(result).toHaveLength(1);
      expect(result[0].targetClassId).toBe('Person');
    });
  });

  describe('update', () => {
    it('should update relationship type properties', async () => {
      const updatedRelType = {
        id: 'rel-1',
        name: 'updatedKnows',
        source_class_id: 'Person',
        target_class_id: 'Person',
        description: 'Updated description',
        direction: 'undirected',
        is_transitive: true,
        is_symmetric: true,
        inverse_relationship_id: null,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedRelType], rowCount: 1 });

      const result = await service.update('rel-1', {
        name: 'updatedKnows',
        description: 'Updated description',
        isTransitive: true
      });

      expect(result?.name).toBe('updatedKnows');
      expect(result?.description).toBe('Updated description');
      expect(result?.isTransitive).toBe(true);
    });
  });

  describe('delete', () => {
    it('should return true when relationship type is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete('rel-1');

      expect(result).toBe(true);
    });

    it('should return false when relationship type not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getTransitiveClosure', () => {
    it('should return transitive closure of a class', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { target_class_id: 'ClassB' },
          { target_class_id: 'ClassC' }
        ],
        rowCount: 2
      });

      const result = await service.getTransitiveClosure('ClassA');

      expect(result).toContain('ClassB');
      expect(result).toContain('ClassC');
    });

    it('should filter by relationship name', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ target_class_id: 'ClassC' }],
        rowCount: 1
      });

      const result = await service.getTransitiveClosure('ClassA', 'knows');

      expect(result).toHaveLength(1);
    });
  });
});
