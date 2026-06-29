/**
 * Unit tests for TaxonomyService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxonomyService } from '../../src/services/taxonomyService.js';

// Mock the database module
vi.mock('../../src/db/database.js', () => ({
  query: vi.fn()
}));

import { query } from '../../src/db/database.js';

const mockQuery = query as ReturnType<typeof vi.fn>;

describe('TaxonomyService', () => {
  let service: TaxonomyService;

  beforeEach(() => {
    service = new TaxonomyService();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a root node', async () => {
      const mockNode = {
        id: 'node-1',
        name: 'Root Category',
        slug: 'root-category',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'node-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockNode], rowCount: 1 });

      const result = await service.create({ name: 'Root Category' });

      expect(result.name).toBe('Root Category');
      expect(result.slug).toBe('root-category');
      expect(result.depth).toBe(0);
      expect(result.parentId).toBeUndefined();
    });

    it('should create a child node with correct depth', async () => {
      const parentNode = {
        id: 'parent-id',
        name: 'Parent',
        slug: 'parent',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'parent-id',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      const childNode = {
        id: 'child-id',
        name: 'Child',
        slug: 'child',
        parent_id: 'parent-id',
        class_id: null,
        depth: 1,
        path: 'parent-id.child-id',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      // First query: get parent for depth calculation
      mockQuery.mockResolvedValueOnce({ rows: [parentNode], rowCount: 1 });
      // Second query: insert
      mockQuery.mockResolvedValueOnce({ rows: [childNode], rowCount: 1 });

      const result = await service.create({ name: 'Child', parentId: 'parent-id' });

      expect(result.parentId).toBe('parent-id');
      expect(result.depth).toBe(1);
    });

    it('should generate slug from name', async () => {
      const mockNode = {
        id: 'node-1',
        name: 'My Category Name',
        slug: 'my-category-name',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'node-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockNode], rowCount: 1 });

      const result = await service.create({ name: 'My Category Name' });

      expect(result.slug).toBe('my-category-name');
    });
  });

  describe('getById', () => {
    it('should return a node when found', async () => {
      const mockNode = {
        id: 'node-1',
        name: 'Test Node',
        slug: 'test-node',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'node-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockNode], rowCount: 1 });

      const result = await service.getById('node-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('node-1');
      expect(result?.name).toBe('Test Node');
    });

    it('should return null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getBySlug', () => {
    it('should return a node by slug', async () => {
      const mockNode = {
        id: 'node-1',
        name: 'Test Node',
        slug: 'test-node',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'node-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockNode], rowCount: 1 });

      const result = await service.getBySlug('test-node');

      expect(result?.slug).toBe('test-node');
    });
  });

  describe('getAll', () => {
    it('should return all nodes', async () => {
      const mockNodes = [
        { id: '1', name: 'Node 1', slug: 'node-1', parent_id: null, class_id: null, depth: 0, path: '1', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: '2', name: 'Node 2', slug: 'node-2', parent_id: null, class_id: null, depth: 0, path: '2', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNodes, rowCount: 2 });

      const result = await service.getAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('getRootNodes', () => {
    it('should return only root nodes', async () => {
      const mockNodes = [
        { id: '1', name: 'Root', slug: 'root', parent_id: null, class_id: null, depth: 0, path: '1', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNodes, rowCount: 1 });

      const result = await service.getRootNodes();

      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBeUndefined();
    });
  });

  describe('getChildren', () => {
    it('should return children of a node', async () => {
      const mockChildren = [
        { id: 'child-1', name: 'Child 1', slug: 'child-1', parent_id: 'parent', class_id: null, depth: 1, path: 'parent.child-1', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockChildren, rowCount: 1 });

      const result = await service.getChildren('parent');

      expect(result).toHaveLength(1);
      expect(result[0].parentId).toBe('parent');
    });
  });

  describe('getAncestors', () => {
    it('should return ancestors from immediate parent to root', async () => {
      const mockAncestors = [
        { id: 'parent', name: 'Parent', slug: 'parent', parent_id: null, class_id: null, depth: 0, path: 'parent', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockAncestors, rowCount: 1 });

      const result = await service.getAncestors('child');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Parent');
    });
  });

  describe('getDescendants', () => {
    it('should return all descendants', async () => {
      const mockDescendants = [
        { id: 'child', name: 'Child', slug: 'child', parent_id: 'parent', class_id: null, depth: 1, path: 'parent.child', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'grandchild', name: 'Grandchild', slug: 'grandchild', parent_id: 'child', class_id: null, depth: 2, path: 'parent.child.grandchild', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockDescendants, rowCount: 2 });

      const result = await service.getDescendants('parent');

      expect(result).toHaveLength(2);
    });
  });

  describe('getSiblings', () => {
    it('should return siblings excluding self', async () => {
      const node = {
        id: 'sibling-1',
        name: 'Sibling 1',
        slug: 'sibling-1',
        parent_id: 'parent',
        class_id: null,
        depth: 1,
        path: 'parent.sibling-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      const siblings = [
        { id: 'sibling-1', name: 'Sibling 1', slug: 'sibling-1', parent_id: 'parent', class_id: null, depth: 1, path: 'parent.sibling-1', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'sibling-2', name: 'Sibling 2', slug: 'sibling-2', parent_id: 'parent', class_id: null, depth: 1, path: 'parent.sibling-2', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      // getById for node
      mockQuery.mockResolvedValueOnce({ rows: [node], rowCount: 1 });
      // getChildren for siblings
      mockQuery.mockResolvedValueOnce({ rows: siblings, rowCount: 2 });

      const result = await service.getSiblings('sibling-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sibling-2');
    });
  });

  describe('getCommonAncestor', () => {
    it('should find common ancestor of two nodes', async () => {
      const ancestors1 = [
        { id: 'node1', name: 'Node 1', slug: 'node1', parent_id: 'root', class_id: null, depth: 1, path: 'root.node1', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'root', name: 'Root', slug: 'root', parent_id: null, class_id: null, depth: 0, path: 'root', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      const ancestors2 = [
        { id: 'node2', name: 'Node 2', slug: 'node2', parent_id: 'root', class_id: null, depth: 1, path: 'root.node2', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: 'root', name: 'Root', slug: 'root', parent_id: null, class_id: null, depth: 0, path: 'root', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      // First getAncestors call for node1
      mockQuery.mockResolvedValueOnce({ rows: ancestors1, rowCount: 2 });
      // Second getAncestors call for node2
      mockQuery.mockResolvedValueOnce({ rows: ancestors2, rowCount: 2 });

      const result = await service.getCommonAncestor('node1', 'node2');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Root');
    });
  });

  describe('getByDepth', () => {
    it('should return nodes at specific depth', async () => {
      const mockNodes = [
        { id: 'node-1', name: 'Node 1', slug: 'node-1', parent_id: 'root', class_id: null, depth: 1, path: 'root.node-1', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNodes, rowCount: 1 });

      const result = await service.getByDepth(1);

      expect(result).toHaveLength(1);
      expect(result[0].depth).toBe(1);
      expect(result[0].id).toBe('node-1');
    });
  });

  describe('getStats', () => {
    it('should return taxonomy statistics', async () => {
      // Single query returns all nodes
      mockQuery.mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'Root', slug: 'root', parent_id: null, class_id: null, depth: 0, path: '1', metadata: {}, created_at: new Date(), updated_at: new Date() },
          { id: '2', name: 'Level1-A', slug: 'level1-a', parent_id: '1', class_id: null, depth: 1, path: '1.2', metadata: {}, created_at: new Date(), updated_at: new Date() },
          { id: '3', name: 'Level1-B', slug: 'level1-b', parent_id: '1', class_id: null, depth: 1, path: '1.3', metadata: {}, created_at: new Date(), updated_at: new Date() },
          { id: '4', name: 'Level2', slug: 'level2', parent_id: '2', class_id: null, depth: 2, path: '1.2.4', metadata: {}, created_at: new Date(), updated_at: new Date() }
        ],
        rowCount: 4
      });

      const result = await service.getStats();

      expect(result.totalNodes).toBe(4);
      expect(result.maxDepth).toBe(2);
      expect(result.avgDepth).toBe(1);
      expect(result.nodesPerDepth[0]).toBe(1);
      expect(result.nodesPerDepth[1]).toBe(2);
      expect(result.nodesPerDepth[2]).toBe(1);
    });
  });

  describe('delete', () => {
    it('should return false when node not found', async () => {
      // getById for existence check
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await service.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should return true when node is deleted', async () => {
      const mockNode = {
        id: 'node-1',
        name: 'Test Node',
        slug: 'test-node',
        parent_id: null,
        class_id: null,
        depth: 0,
        path: 'node-1',
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      };

      // getById returns the node
      mockQuery.mockResolvedValueOnce({ rows: [mockNode], rowCount: 1 });
      // getChildren returns empty
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      // delete returns 1
      mockQuery.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.delete('node-1');

      expect(result).toBe(true);
    });
  });

  describe('find', () => {
    it('should find nodes matching predicate', async () => {
      const mockNodes = [
        { id: '1', name: 'Apple', slug: 'apple', parent_id: null, class_id: null, depth: 0, path: '1', metadata: {}, created_at: new Date(), updated_at: new Date() },
        { id: '2', name: 'Banana', slug: 'banana', parent_id: null, class_id: null, depth: 0, path: '2', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockNodes, rowCount: 2 });

      const result = await service.find(node => node.name.startsWith('A'));

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Apple');
    });
  });

  describe('isAncestorOf', () => {
    it('should return true when first node is ancestor of second', async () => {
      const ancestors = [
        { id: 'ancestor', name: 'Ancestor', slug: 'ancestor', parent_id: null, class_id: null, depth: 0, path: 'ancestor', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: ancestors, rowCount: 1 });

      const result = await service.isAncestorOf('ancestor', 'descendant');

      expect(result).toBe(true);
    });

    it('should return false when first node is not ancestor of second', async () => {
      const ancestors = [
        { id: 'other', name: 'Other', slug: 'other', parent_id: null, class_id: null, depth: 0, path: 'other', metadata: {}, created_at: new Date(), updated_at: new Date() }
      ];

      mockQuery.mockResolvedValueOnce({ rows: ancestors, rowCount: 1 });

      const result = await service.isAncestorOf('node-a', 'node-b');

      expect(result).toBe(false);
    });
  });
});
