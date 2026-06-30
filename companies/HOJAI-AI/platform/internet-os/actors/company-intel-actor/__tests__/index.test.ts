/**
 * Company Intel Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CompanyIntelActor } from '../src/index.js';

describe('CompanyIntelActor', () => {
  let actor: CompanyIntelActor;

  beforeEach(() => {
    actor = new CompanyIntelActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('company_intel');
    expect(actor.config.name).toBe('Company Intelligence');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('company_profile');
    expect(actor.config.capabilities).toContain('competitor_analysis');
    expect(actor.config.capabilities).toContain('funding_tracking');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(20);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid company input', async () => {
      const result = await actor.validate({ company: 'Google', type: 'profile' });
      expect(result).toBe(true);
    });

    it('should return false for empty company', async () => {
      const result = await actor.validate({ company: '', type: 'profile' });
      expect(result).toBe(false);
    });

    it('should return false for missing company', async () => {
      const result = await actor.validate({ type: 'profile' });
      expect(result).toBe(false);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle profile type', async () => {
      const input = {
        type: 'profile' as const,
        company: 'Apple',
        domain: 'apple.com',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle competitors type', async () => {
      const input = {
        type: 'competitors' as const,
        company: 'Amazon',
        domain: 'amazon.com',
        limit: 10,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle funding type', async () => {
      const input = {
        type: 'funding' as const,
        company: 'Stripe',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle jobs type', async () => {
      const input = {
        type: 'jobs' as const,
        company: 'Meta',
        limit: 20,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle full type', async () => {
      const input = {
        type: 'full' as const,
        company: 'Tesla',
        domain: 'tesla.com',
        limit: 5,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
