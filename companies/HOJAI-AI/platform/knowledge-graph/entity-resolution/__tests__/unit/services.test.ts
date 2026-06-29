import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResolutionService } from '../../src/services/resolution.js';

// Mock database
vi.mock('../../src/services/database.js', () => ({
  DatabaseService: vi.fn().mockImplementation(() => ({
    createCanonicalEntity: vi.fn().mockResolvedValue({ id: 'canonical-1' }),
    getCanonicalEntity: vi.fn().mockResolvedValue({ id: 'canonical-1', name: 'John Smith' }),
    addEntityAlias: vi.fn().mockResolvedValue({}),
    getEntitySources: vi.fn().mockResolvedValue([{ source: 'doc1', reliability: 0.9 }]),
    addToReviewQueue: vi.fn().mockResolvedValue({ id: 'review-1' }),
    getReviewQueue: vi.fn().mockResolvedValue([]),
    updateReviewItem: vi.fn().mockResolvedValue({}),
    linkEntities: vi.fn().mockResolvedValue({}),
    mergeEntities: vi.fn().mockResolvedValue({}),
    splitEntities: vi.fn().mockResolvedValue({}),
    getLinkedEntities: vi.fn().mockResolvedValue([])
  }))
}));

describe('ResolutionService', () => {
  let service: ResolutionService;

  beforeEach(() => {
    service = new ResolutionService();
  });

  describe('resolve', () => {
    it('should resolve a single entity', async () => {
      const entity = { name: 'John Smith', type: 'person' };
      const result = await service.resolve(entity, 'test-source');
      expect(result).toBeDefined();
      expect(result.canonicalId).toBeDefined();
    });

    it('should throw error for missing entity', async () => {
      await expect(service.resolve(null as any, 'test')).rejects.toThrow('Entity is required');
    });
  });

  describe('batchResolve', () => {
    it('should resolve multiple entities', async () => {
      const entities = [
        { name: 'John Smith' },
        { name: 'Jane Doe' }
      ];
      const results = await service.batchResolve(entities, 'test-source');
      expect(results).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      const results = await service.batchResolve([], 'test-source');
      expect(results).toHaveLength(0);
    });
  });

  describe('getCanonicalEntity', () => {
    it('should get canonical entity by id', async () => {
      const entity = await service.getCanonicalEntity('canonical-1');
      expect(entity).toBeDefined();
      expect(entity?.id).toBe('canonical-1');
    });

    it('should return null for non-existent entity', async () => {
      const entity = await service.getCanonicalEntity('non-existent');
      expect(entity).toBeNull();
    });
  });

  describe('getEntitySources', () => {
    it('should get sources for an entity', async () => {
      const sources = await service.getEntitySources('canonical-1');
      expect(sources).toBeDefined();
      expect(Array.isArray(sources)).toBe(true);
    });
  });

  describe('getEntityAliases', () => {
    it('should get aliases for an entity', async () => {
      const aliases = await service.getEntityAliases('canonical-1');
      expect(aliases).toBeDefined();
      expect(Array.isArray(aliases)).toBe(true);
    });
  });

  describe('getReviewQueue', () => {
    it('should get review queue with pagination', async () => {
      const queue = await service.getReviewQueue({ limit: 10, offset: 0 });
      expect(queue).toBeDefined();
      expect(Array.isArray(queue.items)).toBe(true);
    });
  });
});
