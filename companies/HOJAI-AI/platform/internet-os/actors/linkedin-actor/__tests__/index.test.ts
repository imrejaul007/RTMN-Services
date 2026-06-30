/**
 * LinkedIn Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LinkedInActor } from '../src/index.js';

describe('LinkedInActor', () => {
  let actor: LinkedInActor;

  beforeEach(() => {
    actor = new LinkedInActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('linkedin');
    expect(actor.config.name).toBe('LinkedIn Scraper');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('company_search');
    expect(actor.config.capabilities).toContain('employee_search');
    expect(actor.config.capabilities).toContain('job_search');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(5);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid query input', async () => {
      const result = await actor.validate({ query: 'software engineer', type: 'search' });
      expect(result).toBe(true);
    });

    it('should return true for valid url input', async () => {
      const result = await actor.validate({ url: 'https://linkedin.com/company/google', type: 'company' });
      expect(result).toBe(true);
    });

    it('should return false for empty input', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle company type', async () => {
      const input = {
        type: 'company' as const,
        url: 'https://linkedin.com/company/microsoft',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle profile type', async () => {
      const input = {
        type: 'profile' as const,
        url: 'https://linkedin.com/in/someone',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle jobs type', async () => {
      const input = {
        type: 'jobs' as const,
        query: 'data scientist',
        limit: 20,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
