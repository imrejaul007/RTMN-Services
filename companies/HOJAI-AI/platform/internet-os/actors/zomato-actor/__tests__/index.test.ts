/**
 * Zomato Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ZomatoActor } from '../src/index.js';

describe('ZomatoActor', () => {
  let actor: ZomatoActor;

  beforeEach(() => {
    actor = new ZomatoActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('zomato');
    expect(actor.config.name).toBe('Zomato Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('restaurant_search');
    expect(actor.config.capabilities).toContain('menu_extraction');
    expect(actor.config.capabilities).toContain('review_scrape');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(10);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid query input', async () => {
      const result = await actor.validate({ query: 'biryani', type: 'search' });
      expect(result).toBe(true);
    });

    it('should return true for valid url input', async () => {
      const result = await actor.validate({ url: 'https://www.zomato.com/bangalore/restaurant', type: 'restaurant' });
      expect(result).toBe(true);
    });

    it('should return false for empty input', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle search type', async () => {
      const input = {
        type: 'search' as const,
        query: 'pizza',
        location: 'Bangalore',
        limit: 10,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle restaurant type', async () => {
      const input = {
        type: 'restaurant' as const,
        url: 'https://www.zomato.com/bangalore/some-restaurant',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle reviews type', async () => {
      const input = {
        type: 'reviews' as const,
        url: 'https://www.zomato.com/bangalore/some-restaurant',
        limit: 20,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
