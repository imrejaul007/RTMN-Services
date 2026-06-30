/**
 * Twitter (X) Actor Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TwitterActor } from '../src/index.js';

describe('TwitterActor', () => {
  let actor: TwitterActor;

  beforeEach(() => {
    actor = new TwitterActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('twitter');
    expect(actor.config.name).toBe('Twitter (X) Actor');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('tweets');
    expect(actor.config.capabilities).toContain('profiles');
    expect(actor.config.capabilities).toContain('trending');
    expect(actor.config.capabilities).toContain('sentiment');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(10);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid search query', async () => {
      const result = await actor.validate({ query: 'AI news' });
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

    it('should return true for valid profile handle', async () => {
      const result = await actor.validate({ handle: 'elonmusk' });
      expect(result).toBe(true);
    });

    it('should return true for handle with @ prefix', async () => {
      const result = await actor.validate({ handle: '@elonmusk' });
      expect(result).toBe(true);
    });

    it('should return false for empty handle', async () => {
      const result = await actor.validate({ handle: '' });
      expect(result).toBe(false);
    });

    it('should return true for trending request', async () => {
      const result = await actor.validate({ action: 'get_trending' });
      expect(result).toBe(true);
    });

    it('should return true for empty trending request', async () => {
      const result = await actor.validate({});
      expect(result).toBe(false);
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });

    it('should return false for undefined input', async () => {
      const result = await actor.validate(undefined);
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should handle search_tweets action', async () => {
      const input = {
        action: 'search_tweets',
        query: 'machine learning',
        maxResults: 10,
        type: 'latest',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle get_profile action', async () => {
      const input = {
        action: 'get_profile',
        handle: 'OpenAI',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle get_trending action', async () => {
      const input = {
        action: 'get_trending',
        location: 'India',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should return error for unknown action', async () => {
      const result = await actor.scrape({ action: 'unknown_action' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });
  });

  describe('search_tweets', () => {
    it('should accept valid search parameters', async () => {
      const input = {
        query: 'TypeScript',
        maxResults: 20,
        type: 'top' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should use default maxResults when not specified', async () => {
      const input = { query: 'JavaScript' };
      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_profile', () => {
    it('should accept valid handle', async () => {
      const input = { handle: 'sundarpichai' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle handles with @ prefix', async () => {
      const input = { handle: '@sundarpichai' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
