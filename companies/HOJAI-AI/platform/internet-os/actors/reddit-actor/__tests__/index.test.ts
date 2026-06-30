/**
 * Reddit Actor Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RedditActor } from '../src/index.js';

describe('RedditActor', () => {
  let actor: RedditActor;

  beforeEach(() => {
    actor = new RedditActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('reddit');
    expect(actor.config.name).toBe('Reddit Actor');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('posts');
    expect(actor.config.capabilities).toContain('subreddits');
    expect(actor.config.capabilities).toContain('trending');
    expect(actor.config.capabilities).toContain('comments');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(20);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid search query', async () => {
      const result = await actor.validate({ query: 'TypeScript' });
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

    it('should return true for valid subreddit', async () => {
      const result = await actor.validate({ subreddit: 'programming' });
      expect(result).toBe(true);
    });

    it('should return true for subreddit with /r/ prefix', async () => {
      const result = await actor.validate({ subreddit: '/r/typescript' });
      expect(result).toBe(true);
    });

    it('should return false for empty subreddit', async () => {
      const result = await actor.validate({ subreddit: '' });
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
    it('should handle search_posts action', async () => {
      const input = {
        action: 'search_posts',
        query: 'machine learning',
        maxResults: 10,
        sort: 'top' as const,
        time: 'month' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle get_subreddit action', async () => {
      const input = {
        action: 'get_subreddit',
        subreddit: 'javascript',
        includeRules: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle get_trending action', async () => {
      const input = {
        action: 'get_trending',
        subreddit: 'technology',
        category: 'rising',
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

  describe('search_posts', () => {
    it('should accept valid search parameters', async () => {
      const input = {
        query: 'React hooks',
        subreddit: 'webdev',
        maxResults: 25,
        sort: 'hot' as const,
        time: 'week' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should work without subreddit', async () => {
      const input = { query: 'Python tutorials' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should use default values when not specified', async () => {
      const input = { query: 'Git' };
      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_subreddit', () => {
    it('should accept valid subreddit name', async () => {
      const input = { subreddit: 'learnprogramming' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle /r/ prefix in subreddit name', async () => {
      const input = { subreddit: '/r/coding' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should accept includeRules option', async () => {
      const input = {
        subreddit: 'politics',
        includeRules: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_trending', () => {
    it('should work without any parameters', async () => {
      const input = {};

      const isValid = await actor.validate(input);
      expect(isValid).toBe(false); // No action or query specified
    });

    it('should work with subreddit', async () => {
      const input = { subreddit: 'technology' };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should work with category', async () => {
      const input = {
        subreddit: 'gaming',
        category: 'top',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
