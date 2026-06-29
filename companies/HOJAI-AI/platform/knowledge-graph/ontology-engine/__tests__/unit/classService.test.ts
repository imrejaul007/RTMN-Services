/**
 * Unit tests for ClassService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClassService } from '../../src/services/classService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn(),
  withTransaction: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('ClassService', () => {
  let service: ClassService;

  beforeEach(() => {
    service = new ClassService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('create', () => {
    it('should create a new class with all fields', async () => {
      const mockClass = {
        id: 'test-uuid',
        name: 'TestClass',
        description: 'A test class',
        parent_class_id: null,
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockClass], rowCount: 1 });

      const result = await service.create({
        name: 'TestClass',
        description: 'A test class',
        isAbstract: false
      });

      expect(result).toBeDefined();
      expect(result.name).toBe('TestClass');
      expect(result.description).toBe('A test class');
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it('should create a class with parent', async () => {
      const mockClass = {
        id: 'child-uuid',
        name: 'ChildClass',
        description: null,
        parent_class_id: 'parent-uuid',
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockClass], rowCount: 1 });

      const result = await service.create({
        name: 'ChildClass',
        parentClassId: 'parent-uuid'
      });

      expect(result.parentClassId).toBe('parent-uuid');
    });

    it('should create an abstract class', async () => {
      const mockClass = {
        id: 'abstract-uuid',
        name: 'AbstractClass',
        description: 'An abstract class',
        parent_class_id: null,
        is_abstract: true,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockClass], rowCount: 1 });

      const result = await service.create({
        name: 'AbstractClass',
        description: 'An abstract class',
        isAbstract: true
      });

      expect(result.isAbstract).toBe(true);
    });
  });

  describe('getById', () => {
    it('should return a class when found', async () => {
      const mockClass = {
        id: 'test-uuid',
        name: 'TestClass',
        description: 'Test',
        parent_class_id: null,
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockClass], rowCount: 1 });

      const result = await service.getById('test-uuid');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-uuid');
      expect(result?.name).toBe('TestClass');
    });

    it('should return null when class not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByName', () => {
    it('should return a class by name', async () => {
      const mockClass = {
        id: 'test-uuid',
        name: 'MyClass',
        description: 'Test',
        parent_class_id: null,
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockClass], rowCount: 1 });

      const result = await service.getByName('MyClass');

      expect(result?.name).toBe('MyClass');
    });
  });

  describe('getAll', () => {
    it('should return all classes', async () => {
      const mockClasses = [
        {
          id: 'class-1',
          name: 'ClassA',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'class-2',
          name: 'ClassB',
          description: null,
          parent_class_id: null,
          is_abstract: false,
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockClasses, rowCount: 2 });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('ClassA');
      expect(result[1].name).toBe('ClassB');
    });
  });

  describe('update', () => {
    it('should update class name', async () => {
      const updatedClass = {
        id: 'test-uuid',
        name: 'UpdatedName',
        description: null,
        parent_class_id: null,
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedClass], rowCount: 1 });

      const result = await service.update('test-uuid', { name: 'UpdatedName' });

      expect(result?.name).toBe('UpdatedName');
    });

    it('should update class parent', async () => {
      const updatedClass = {
        id: 'child-uuid',
        name: 'Child',
        description: null,
        parent_class_id: 'new-parent-uuid',
        is_abstract: false,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [updatedClass], rowCount: 1 });

      const result = await service.update('child-uuid', { parentClassId: 'new-parent-uuid' });

      expect(result?.parentClassId).toBe('new-parent-uuid');
    });

    it('should return null for nonexistent class', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.update('nonexistent', { name: 'NewName' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when class is deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete('test-uuid');

      expect(result).toBe(true);
    });

    it('should return false when class not found', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getHierarchy', () => {
    it('should return class hierarchy', async () => {
      const mockHierarchy = [
        { id: 'root', name: 'Root', description: null, parent_class_id: null, is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'child', name: 'Child', description: null, parent_class_id: 'root', is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockHierarchy, rowCount: 2 });

      const result = await service.getHierarchy('child');

      expect(result).toHaveLength(2);
    });
  });

  describe('getChildren', () => {
    it('should return direct children', async () => {
      const mockChildren = [
        { id: 'child-1', name: 'Child1', description: null, parent_class_id: 'parent', is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockChildren, rowCount: 1 });

      const result = await service.getChildren('parent');

      expect(result).toHaveLength(1);
      expect(result[0].parentClassId).toBe('parent');
    });
  });

  describe('isSubclassOf', () => {
    it('should return true when class is subclass', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }], rowCount: 1 });

      const result = await service.isSubclassOf('child', 'parent');

      expect(result).toBe(true);
    });

    it('should return false when class is not subclass', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: false }], rowCount: 1 });

      const result = await service.isSubclassOf('class-a', 'class-b');

      expect(result).toBe(false);
    });
  });

  describe('getLineage', () => {
    it('should return lineage from root to class', async () => {
      const mockLineage = [
        { id: 'root', name: 'Root', description: null, parent_class_id: null, is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'middle', name: 'Middle', description: null, parent_class_id: 'root', is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'leaf', name: 'Leaf', description: null, parent_class_id: 'middle', is_abstract: false, metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockLineage, rowCount: 3 });

      const result = await service.getLineage('leaf');

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Root');
      expect(result[2].name).toBe('Leaf');
    });
  });
});
