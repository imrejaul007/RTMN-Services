/**
 * MemoryOS Integration Tests (simplified - no axios mocking)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import MemoryOSIntegration from '../../src/services/memoryOSIntegration.js';

describe('MemoryOSIntegration', () => {
  let memoryOS;
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {}
  };

  beforeEach(() => {
    memoryOS = new MemoryOSIntegration(mockLogger, {
      memoryOSUrl: 'http://localhost:4703',
      twinOSUrl: 'http://localhost:4705'
    });
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      expect(memoryOS.config.memoryOSUrl).toBe('http://localhost:4703');
      expect(memoryOS.config.twinOSUrl).toBe('http://localhost:4705');
    });

    it('should initialize empty stats', () => {
      const stats = memoryOS.getStats();
      expect(stats.memoryReads).toBe(0);
      expect(stats.memoryWrites).toBe(0);
      expect(stats.twinReads).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.errors).toBe(0);
    });
  });

  describe('getUserContext()', () => {
    it('should return default context when service unavailable', async () => {
      // This will fail to connect but should return default
      const result = await memoryOS.getUserContext('user-1');

      // Should return default context structure
      expect(result).toBeDefined();
      expect(result.firstVisit).toBe(true);
    });
  });

  describe('saveUserContext()', () => {
    it('should handle save errors gracefully', async () => {
      const result = await memoryOS.saveUserContext('user-1', { test: true });

      // Should return error structure (not throw)
      expect(result).toBeDefined();
    });
  });

  describe('getConversationHistory()', () => {
    it('should return empty array when service unavailable', async () => {
      const result = await memoryOS.getConversationHistory('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUserPreferences()', () => {
    it('should return default preferences when service unavailable', async () => {
      const result = await memoryOS.getUserPreferences('user-1');

      // Should return default preferences
      expect(result).toBeDefined();
      expect(result.language).toBeDefined();
    });
  });

  describe('getCustomerTwin()', () => {
    it('should return null when service unavailable', async () => {
      const result = await memoryOS.getCustomerTwin('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getMerchantTwin()', () => {
    it('should return null when service unavailable', async () => {
      const result = await memoryOS.getMerchantTwin('merchant-1');

      expect(result).toBeNull();
    });
  });

  describe('learnFromBehavior()', () => {
    it('should handle learn errors gracefully', async () => {
      const result = await memoryOS.learnFromBehavior('user-1', { action: 'test' });

      // Should return error structure
      expect(result).toBeDefined();
    });
  });

  describe('searchMemory()', () => {
    it('should return empty results when service unavailable', async () => {
      const result = await memoryOS.searchMemory('user-1', 'test query');

      expect(result.results).toEqual([]);
    });
  });

  describe('getStats()', () => {
    it('should track stats correctly', () => {
      const stats = memoryOS.getStats();

      expect(stats.cacheSize).toBeDefined();
      expect(stats.cacheHitRate).toBeDefined();
      expect(stats.cacheHitRate).toBe(0); // No hits yet
    });

    it('should calculate cache hit rate correctly', () => {
      // Manually trigger cache miss
      memoryOS.stats.cacheMisses = 5;
      memoryOS.stats.cacheHits = 3;

      const stats = memoryOS.getStats();
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(35);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(40);
    });
  });

  describe('recommendations', () => {
    it('should generate recommendations with empty data', async () => {
      const result = await memoryOS.getRecommendations('user-1');

      expect(result.success).toBe(true);
      expect(result.recommendations).toEqual([]);
    });
  });
});
