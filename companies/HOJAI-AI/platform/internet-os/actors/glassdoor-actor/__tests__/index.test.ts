/**
 * Glassdoor Actor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlassdoorActor } from '../src/index.js';

describe('GlassdoorActor', () => {
  let actor: GlassdoorActor;

  beforeEach(() => {
    actor = new GlassdoorActor();
  });

  describe('constructor', () => {
    it('should have correct config', () => {
      expect(actor.config.id).toBe('glassdoor');
      expect(actor.config.name).toBe('Glassdoor Actor');
      expect(actor.config.version).toBe('1.0.0');
      expect(actor.config.capabilities).toContain('reviews');
      expect(actor.config.capabilities).toContain('salaries');
      expect(actor.config.capabilities).toContain('interviews');
      expect(actor.config.capabilities).toContain('ratings');
    });

    it('should have rate limit configured', () => {
      expect(actor.config.rateLimit).toEqual({ requests: 10, window: 60000 });
    });
  });

  describe('validate', () => {
    it('should validate search_company with companyName', async () => {
      const valid = await actor.validate({
        action: 'search_company',
        companyName: 'Google',
      });
      expect(valid).toBe(true);
    });

    it('should reject search_company without companyName', async () => {
      const invalid = await actor.validate({
        action: 'search_company',
      });
      expect(invalid).toBe(false);
    });

    it('should validate get_company_overview with companyId', async () => {
      const valid = await actor.validate({
        action: 'get_company_overview',
        companyId: '12345',
      });
      expect(valid).toBe(true);
    });

    it('should reject get_company_overview without companyId', async () => {
      const invalid = await actor.validate({
        action: 'get_company_overview',
      });
      expect(invalid).toBe(false);
    });

    it('should validate get_salaries with companyId', async () => {
      const valid = await actor.validate({
        action: 'get_salaries',
        companyId: '12345',
      });
      expect(valid).toBe(true);
    });

    it('should validate get_interviews with companyId', async () => {
      const valid = await actor.validate({
        action: 'get_interviews',
        companyId: '12345',
      });
      expect(valid).toBe(true);
    });

    it('should reject unknown actions', async () => {
      const invalid = await actor.validate({
        action: 'unknown_action',
        companyName: 'Test',
      });
      expect(invalid).toBe(false);
    });

    it('should reject null input', async () => {
      const invalid = await actor.validate(null);
      expect(invalid).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should return error for unknown action', async () => {
      const result = await actor.scrape({
        action: 'unknown_action',
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should require companyName for search_company', async () => {
      const result = await actor.scrape({
        action: 'search_company',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('companyName is required');
    });

    it('should require companyId for get_company_overview', async () => {
      const result = await actor.scrape({
        action: 'get_company_overview',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('companyId is required');
    });

    it('should require companyId for get_salaries', async () => {
      const result = await actor.scrape({
        action: 'get_salaries',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('companyId is required');
    });

    it('should require companyId for get_interviews', async () => {
      const result = await actor.scrape({
        action: 'get_interviews',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('companyId is required');
    });
  });

  describe('capabilities', () => {
    it('should support reviews capability', () => {
      expect(actor.config.capabilities).toContain('reviews');
    });

    it('should support salaries capability', () => {
      expect(actor.config.capabilities).toContain('salaries');
    });

    it('should support interviews capability', () => {
      expect(actor.config.capabilities).toContain('interviews');
    });

    it('should support ratings capability', () => {
      expect(actor.config.capabilities).toContain('ratings');
    });
  });
});
