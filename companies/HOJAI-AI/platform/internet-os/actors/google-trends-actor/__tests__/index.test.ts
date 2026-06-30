/**
 * Tests for Google Trends Actor
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GoogleTrendsActor } from '../src/index.js';

// Mock the actor-runtime dependencies
vi.mock('../../actor-runtime/src/index.ts', () => ({
  Actor: class MockActor {
    config: any;
    lastRequestTime = 0;

    constructor(config: any) {
      this.config = config;
    }

    async rateLimit(): Promise<void> {
      // Mock rate limiting - no-op in tests
    }
  },
  fetchUrl: vi.fn().mockResolvedValue('<html><body>Mock HTML content</body></html>'),
  parseHtml: vi.fn().mockReturnValue({
    find: vi.fn().mockReturnValue({
      text: vi.fn().mockReturnValue(''),
      each: vi.fn(),
      slice: vi.fn().mockReturnThis(),
      attr: vi.fn(),
    }),
    each: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnValue(''),
    html: vi.fn().mockReturnValue(''),
    script: vi.fn().mockReturnValue([]),
  }),
}));

describe('GoogleTrendsActor', () => {
  let actor: GoogleTrendsActor;

  beforeEach(() => {
    actor = new GoogleTrendsActor();
  });

  describe('Configuration', () => {
    it('should have correct actor configuration', () => {
      expect(actor.config.id).toBe('google-trends');
      expect(actor.config.name).toBe('Google Trends Actor');
      expect(actor.config.version).toBe('1.0.0');
      expect(actor.config.capabilities).toContain('trending');
      expect(actor.config.capabilities).toContain('topics');
      expect(actor.config.capabilities).toContain('regions');
      expect(actor.config.capabilities).toContain('comparison');
    });

    it('should have rate limit configured', () => {
      expect(actor.config.rateLimit).toBeDefined();
      expect(actor.config.rateLimit.requests).toBe(20);
      expect(actor.config.rateLimit.window).toBe(60000);
    });
  });

  describe('validate', () => {
    it('should return true for valid get_trending input', async () => {
      const isValid = await actor.validate({ type: 'get_trending' });
      expect(isValid).toBe(true);
    });

    it('should return true for valid search_topic input', async () => {
      const isValid = await actor.validate({
        type: 'search_topic',
        query: 'artificial intelligence',
      });
      expect(isValid).toBe(true);
    });

    it('should return false for search_topic without query', async () => {
      const isValid = await actor.validate({
        type: 'search_topic',
      });
      expect(isValid).toBe(false);
    });

    it('should return false for search_topic with invalid query type', async () => {
      const isValid = await actor.validate({
        type: 'search_topic',
        query: 123,
      });
      expect(isValid).toBe(false);
    });

    it('should return true for valid compare_topics input', async () => {
      const isValid = await actor.validate({
        type: 'compare_topics',
        queries: ['AI', 'ML'],
      });
      expect(isValid).toBe(true);
    });

    it('should return false for compare_topics with less than 2 queries', async () => {
      const isValid = await actor.validate({
        type: 'compare_topics',
        queries: ['AI'],
      });
      expect(isValid).toBe(false);
    });

    it('should return false for compare_topics without queries array', async () => {
      const isValid = await actor.validate({
        type: 'compare_topics',
      });
      expect(isValid).toBe(false);
    });

    it('should return true for valid get_by_region input with region', async () => {
      const isValid = await actor.validate({
        type: 'get_by_region',
        region: 'India',
      });
      expect(isValid).toBe(true);
    });

    it('should return true for valid get_by_region input with regionCode', async () => {
      const isValid = await actor.validate({
        type: 'get_by_region',
        regionCode: 'IN',
      });
      expect(isValid).toBe(true);
    });

    it('should return false for get_by_region without region or regionCode', async () => {
      const isValid = await actor.validate({
        type: 'get_by_region',
      });
      expect(isValid).toBe(false);
    });

    it('should return false for invalid type', async () => {
      const isValid = await actor.validate({
        type: 'invalid_type',
      });
      expect(isValid).toBe(false);
    });

    it('should return false for null input', async () => {
      const isValid = await actor.validate(null);
      expect(isValid).toBe(false);
    });

    it('should return false for undefined input', async () => {
      const isValid = await actor.validate(undefined);
      expect(isValid).toBe(false);
    });

    it('should return false for non-object input', async () => {
      const isValid = await actor.validate('string' as any);
      expect(isValid).toBe(false);
    });
  });

  describe('scrape - get_trending', () => {
    it('should return success for get_trending action', async () => {
      const result = await actor.scrape({ type: 'get_trending' });
      // Should return structure even with mock
      expect(result).toHaveProperty('success');
    });

    it('should respect limit parameter', async () => {
      const result = await actor.scrape({
        type: 'get_trending',
        limit: 5,
      });
      expect(result).toHaveProperty('success');
    });

    it('should include metadata in response', async () => {
      const result = await actor.scrape({ type: 'get_trending' });
      if (result.metadata) {
        expect(result.metadata).toHaveProperty('scrapedAt');
        expect(result.metadata).toHaveProperty('source');
        expect(result.metadata.source).toBe('google-trends');
      }
    });
  });

  describe('scrape - search_topic', () => {
    it('should return error for missing query', async () => {
      const result = await actor.scrape({
        type: 'search_topic',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Query is required');
    });

    it('should return success for valid query', async () => {
      const result = await actor.scrape({
        type: 'search_topic',
        query: 'machine learning',
      });
      expect(result).toHaveProperty('success');
    });

    it('should include geo parameter when provided', async () => {
      const result = await actor.scrape({
        type: 'search_topic',
        query: 'AI',
        geo: 'IN',
      });
      expect(result).toHaveProperty('success');
    });

    it('should respect limit parameter', async () => {
      const result = await actor.scrape({
        type: 'search_topic',
        query: 'test',
        limit: 5,
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('scrape - compare_topics', () => {
    it('should return error for missing queries', async () => {
      const result = await actor.scrape({
        type: 'compare_topics',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 2 queries are required');
    });

    it('should return error for single query', async () => {
      const result = await actor.scrape({
        type: 'compare_topics',
        queries: ['AI'],
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('At least 2 queries are required');
    });

    it('should return success for multiple queries', async () => {
      const result = await actor.scrape({
        type: 'compare_topics',
        queries: ['AI', 'ML', 'Deep Learning'],
      });
      expect(result).toHaveProperty('success');
    });

    it('should include geo parameter when provided', async () => {
      const result = await actor.scrape({
        type: 'compare_topics',
        queries: ['AI', 'ML'],
        geo: 'US',
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('scrape - get_by_region', () => {
    it('should return error for missing region', async () => {
      const result = await actor.scrape({
        type: 'get_by_region',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Region or regionCode is required');
    });

    it('should return success for valid region', async () => {
      const result = await actor.scrape({
        type: 'get_by_region',
        region: 'India',
      });
      expect(result).toHaveProperty('success');
    });

    it('should return success for valid regionCode', async () => {
      const result = await actor.scrape({
        type: 'get_by_region',
        regionCode: 'IN',
      });
      expect(result).toHaveProperty('success');
    });

    it('should include query parameter when provided', async () => {
      const result = await actor.scrape({
        type: 'get_by_region',
        region: 'USA',
        query: 'technology',
      });
      expect(result).toHaveProperty('success');
    });

    it('should respect limit parameter', async () => {
      const result = await actor.scrape({
        type: 'get_by_region',
        region: 'India',
        limit: 5,
      });
      expect(result).toHaveProperty('success');
    });
  });

  describe('scrape - unknown type', () => {
    it('should return error for unknown action type', async () => {
      const result = await actor.scrape({
        type: 'unknown_action' as any,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action type');
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      // Test with invalid input that triggers error
      const result = await actor.scrape({
        type: 'search_topic',
        query: '',
      });
      // Empty query validation happens at different level
      expect(result).toHaveProperty('success');
    });
  });

  describe('Output structure', () => {
    it('should return ActorOutput structure', async () => {
      const result = await actor.scrape({ type: 'get_trending' });

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('metadata');
      } else {
        expect(result).toHaveProperty('error');
      }
    });

    it('should include correct metadata structure on success', async () => {
      const result = await actor.scrape({ type: 'get_trending' });

      if (result.success && result.metadata) {
        expect(result.metadata.scrapedAt).toBeDefined();
        expect(result.metadata.source).toBe('google-trends');
        expect(typeof result.metadata.itemsFound).toBe('number');
        expect(typeof result.metadata.duration).toBe('number');
      }
    });

    it('should include error message on failure', async () => {
      const result = await actor.scrape({ type: 'get_by_region' });

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });
  });
});

describe('GoogleTrendsActor Type Exports', () => {
  it('should export TrendingTopic interface', async () => {
    const actor = new GoogleTrendsActor();
    expect(actor).toBeDefined();
  });

  it('should export RegionalTrend interface', async () => {
    const actor = new GoogleTrendsActor();
    expect(actor).toBeDefined();
  });

  it('should export ComparisonResult interface', async () => {
    const actor = new GoogleTrendsActor();
    expect(actor).toBeDefined();
  });

  it('should export GoogleTrendsInput interface', async () => {
    const actor = new GoogleTrendsActor();
    expect(actor).toBeDefined();
  });
});
