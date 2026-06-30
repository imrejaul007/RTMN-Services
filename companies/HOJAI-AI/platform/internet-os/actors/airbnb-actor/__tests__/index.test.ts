/**
 * Airbnb Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { AirbnbActor } from '../src/index.js';

describe('AirbnbActor', () => {
  let actor: AirbnbActor;

  beforeEach(() => {
    actor = new AirbnbActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('airbnb');
    expect(actor.config.name).toBe('Airbnb Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('property_search');
    expect(actor.config.capabilities).toContain('pricing_analysis');
    expect(actor.config.capabilities).toContain('review_scrape');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(5);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid query input', async () => {
      const result = await actor.validate({ query: 'beach house', type: 'search' });
      expect(result).toBe(true);
    });

    it('should return true for valid url input', async () => {
      const result = await actor.validate({ url: 'https://www.airbnb.com/rooms/123', type: 'property' });
      expect(result).toBe(true);
    });

    it('should return false for empty input', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle search type', async () => {
      const input = {
        type: 'search' as const,
        query: 'cozy apartment',
        location: 'Goa',
        guests: 4,
        limit: 10,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle property type', async () => {
      const input = {
        type: 'property' as const,
        url: 'https://www.airbnb.com/rooms/456',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle pricing type', async () => {
      const input = {
        type: 'pricing' as const,
        url: 'https://www.airbnb.com/rooms/789',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
