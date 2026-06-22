/**
 * Memory Tier Service Tests
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock mongoose
jest.mock('mongoose', () => {
  const mockModel = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data) => ({ _id: 'test-id', ...data })),
    countDocuments: jest.fn().mockResolvedValue(0),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  };

  return {
    Schema: jest.fn().mockImplementation(() => ({
      index: jest.fn(),
      pre: jest.fn(),
    })),
    model: jest.fn().mockReturnValue(mockModel),
  };
});

import { MemoryTierService } from '../services/memoryTierService';

describe('MemoryTierService', () => {
  let service: MemoryTierService;

  beforeEach(() => {
    service = new MemoryTierService();
  });

  describe('Store Memory', () => {
    test('stores in L1 tier', async () => {
      const memory = await service.store('user1', 'L1', {
        content: 'Test memory',
        type: 'conversation',
      });

      expect(memory).toBeDefined();
      expect(memory.content).toBe('Test memory');
    });

    test('stores in L4 tier', async () => {
      const memory = await service.store('user1', 'L4', {
        content: 'Business policy',
        type: 'policy',
      });

      expect(memory).toBeDefined();
    });
  });

  describe('Retrieve Memory', () => {
    test('retrieves from L1 tier', async () => {
      const memories = await service.retrieve('user1', ['L1']);

      expect(memories).toBeDefined();
      expect(Array.isArray(memories)).toBe(true);
    });

    test('retrieves from multiple tiers', async () => {
      const memories = await service.retrieve('user1', ['L1', 'L2', 'L3']);

      expect(Array.isArray(memories)).toBe(true);
    });
  });

  describe('Search Memory', () => {
    test('searches across all tiers', async () => {
      const results = await service.search('user1', 'rahul');

      expect(results).toBeDefined();
    });
  });

  describe('Get Context', () => {
    test('assembles context string', async () => {
      const context = await service.getContext('user1');

      expect(typeof context).toBe('string');
    });
  });

  describe('Get Stats', () => {
    test('returns tier counts', async () => {
      const stats = await service.stats('user1');

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('L1');
      expect(stats).toHaveProperty('L2');
      expect(stats).toHaveProperty('L3');
      expect(stats).toHaveProperty('L4');
      expect(stats).toHaveProperty('L5');
    });
  });
});
