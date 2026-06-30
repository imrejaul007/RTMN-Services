/**
 * Crunchbase Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CrunchbaseActor } from '../src/index.js';

describe('CrunchbaseActor', () => {
  let actor: CrunchbaseActor;

  beforeEach(() => {
    actor = new CrunchbaseActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('crunchbase');
    expect(actor.config.name).toBe('Crunchbase Actor');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('companies');
    expect(actor.config.capabilities).toContain('funding');
    expect(actor.config.capabilities).toContain('people');
    expect(actor.config.capabilities).toContain('acquisitions');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(10);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid search query', async () => {
      const result = await actor.validate({ query: 'artificial intelligence startups' });
      expect(result).toBe(true);
    });

    it('should return false for empty query', async () => {
      const result = await actor.validate({ query: '' });
      expect(result).toBe(false);
    });

    it('should return false for missing query in search', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });

    it('should return true for valid permalink', async () => {
      const result = await actor.validate({ permalink: 'openai' });
      expect(result).toBe(true);
    });

    it('should return true for valid URL', async () => {
      const result = await actor.validate({ url: 'https://www.crunchbase.com/organization/openai' });
      expect(result).toBe(true);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined input', async () => {
      const result = await actor.validate(undefined);
      expect(result).toBe(false);
    });

    it('should return false for non-object input', async () => {
      const result = await actor.validate('string' as any);
      expect(result).toBe(false);
    });
  });

  describe('search_company', () => {
    it('should handle search input structure', async () => {
      const input = {
        query: 'fintech companies',
        maxResults: 10,
        type: 'companies' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with default parameters', async () => {
      const input = {
        query: 'saas startups',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with people type', async () => {
      const input = {
        query: 'elon musk',
        type: 'people' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with organizations type', async () => {
      const input = {
        query: 'tech companies',
        type: 'organizations' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_company', () => {
    it('should handle permalink input', async () => {
      const input = {
        permalink: 'stripe',
        includeFunding: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL input', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/stripe',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle company without funding', async () => {
      const input = {
        permalink: 'small-startup',
        includeFunding: false,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle company with people', async () => {
      const input = {
        permalink: 'google',
        includePeople: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle company with all options', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/uber',
        includeFunding: true,
        includePeople: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_funding', () => {
    it('should handle permalink input', async () => {
      const input = {
        permalink: 'airbnb',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL input', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/airbnb/funding_rounds',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL without funding_rounds path', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/airbnb',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_people', () => {
    it('should handle permalink input with all type', async () => {
      const input = {
        permalink: 'apple',
        type: 'all' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle permalink input with founders type', async () => {
      const input = {
        permalink: 'facebook',
        type: 'founders' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle permalink input with executives type', async () => {
      const input = {
        permalink: 'microsoft',
        type: 'executives' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL input', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/tesla/people',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL without people path', async () => {
      const input = {
        url: 'https://www.crunchbase.com/organization/tesla',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
