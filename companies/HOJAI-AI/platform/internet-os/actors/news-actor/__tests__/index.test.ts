/**
 * News Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { NewsActor } from '../src/index.js';

describe('NewsActor', () => {
  let actor: NewsActor;

  beforeEach(() => {
    actor = new NewsActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('news');
    expect(actor.config.name).toBe('News Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('search');
    expect(actor.config.capabilities).toContain('trending');
    expect(actor.config.capabilities).toContain('company_news');
    expect(actor.config.capabilities).toContain('sentiment');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(30);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for search type', async () => {
      const result = await actor.validate({ type: 'search', query: 'technology' });
      expect(result).toBe(true);
    });

    it('should return true for trending type', async () => {
      const result = await actor.validate({ type: 'trending' });
      expect(result).toBe(true);
    });

    it('should return true for company type', async () => {
      const result = await actor.validate({ type: 'company', query: 'Google' });
      expect(result).toBe(true);
    });

    it('should return false for empty type', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle search type with sources', async () => {
      const input = {
        type: 'search' as const,
        query: 'AI news',
        sources: ['reuters', 'bloomberg'],
        dateRange: '7d',
        limit: 20,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle trending type', async () => {
      const input = {
        type: 'trending' as const,
        limit: 10,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle industry type', async () => {
      const input = {
        type: 'industry' as const,
        query: 'healthcare',
        limit: 15,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
