/**
 * Justdial Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { JustdialActor } from '../src/index.js';

describe('JustdialActor', () => {
  let actor: JustdialActor;

  beforeEach(() => {
    actor = new JustdialActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('justdial');
    expect(actor.config.name).toBe('Justdial India Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('business_search');
    expect(actor.config.capabilities).toContain('phone_numbers');
    expect(actor.config.capabilities).toContain('addresses');
    expect(actor.config.capabilities).toContain('reviews');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(10);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid query input', async () => {
      const result = await actor.validate({ query: 'restaurants' });
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
    it('should handle basic search input', async () => {
      const input = {
        query: 'electricians',
        location: 'Mumbai',
        limit: 20,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with default location', async () => {
      const input = {
        query: 'plumbers',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with custom limit', async () => {
      const input = {
        query: 'salons',
        location: 'Delhi',
        limit: 50,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
