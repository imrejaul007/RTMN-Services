/**
 * MemoryOS Mobile SDK Tests
 */

import { describe, it, expect } from 'vitest';
import { MemoryOSMobile, createMemoryOS } from '../src/index.js';

describe('MemoryOS Mobile SDK', () => {
  describe('constructor', () => {
    it('should create instance with default config', () => {
      const memory = new MemoryOSMobile({});
      expect(memory).toBeDefined();
    });

    it('should create instance with custom baseUrl', () => {
      const memory = new MemoryOSMobile({ baseUrl: 'http://localhost:4703' });
      expect(memory).toBeDefined();
    });

    it('should create instance using factory', () => {
      const memory = createMemoryOS({ baseUrl: 'http://localhost:4703' });
      expect(memory).toBeDefined();
    });
  });

  describe('cache operations', () => {
    it('should clear cache', () => {
      const memory = new MemoryOSMobile({});
      memory.clearCache();
      const stats = memory.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache stats', () => {
      const memory = new MemoryOSMobile({});
      const stats = memory.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('oldest');
    });
  });

  describe('healthCheck', () => {
    it('should handle connection error gracefully', async () => {
      const memory = new MemoryOSMobile({ baseUrl: 'http://invalid:9999' });
      const health = await memory.healthCheck();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('store', () => {
    it('should handle store error gracefully', async () => {
      const memory = new MemoryOSMobile({ baseUrl: 'http://invalid:9999' });
      await expect(
        memory.store('user1', 'test content')
      ).rejects.toThrow();
    });
  });

  describe('search', () => {
    it('should return empty results on error', async () => {
      const memory = new MemoryOSMobile({ baseUrl: 'http://invalid:9999' });
      const result = await memory.search({ query: 'test' });
      expect(result.results).toEqual([]);
      expect(result.count).toBe(0);
    });
  });
});

describe('Type exports', () => {
  it('should export Memory type', () => {
    const memory: import('../src/index.js').Memory = {
      id: 'test-id',
      twinId: 'twin-1',
      type: 'knowledge',
      content: 'Test content',
      importance: 'Medium',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    expect(memory.id).toBe('test-id');
  });
});