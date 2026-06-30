/**
 * Google Maps Actor Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleMapsActor } from '../src/index.js';

describe('GoogleMapsActor', () => {
  let actor: GoogleMapsActor;

  beforeEach(() => {
    actor = new GoogleMapsActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('google_maps');
    expect(actor.config.name).toBe('Google Maps Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('business_search');
    expect(actor.config.capabilities).toContain('reviews');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(10);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid query input', async () => {
      const result = await actor.validate({ query: 'pizza in bangalore' });
      expect(result).toBe(true);
    });

    it('should return false for empty query', async () => {
      const result = await actor.validate({ query: '' });
      expect(result).toBe(false);
    });

    it('should return false for missing query', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle search input structure', async () => {
      const input = {
        query: 'pizza',
        location: 'Bangalore',
        maxResults: 5,
        includeReviews: true,
      };

      // Just validate the input structure
      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with default location', async () => {
      const input = {
        query: 'coffee shop',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
