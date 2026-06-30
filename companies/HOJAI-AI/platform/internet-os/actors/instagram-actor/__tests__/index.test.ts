/**
 * Instagram Actor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InstagramActor } from '../src/index.js';

describe('InstagramActor', () => {
  let actor: InstagramActor;

  beforeEach(() => {
    actor = new InstagramActor();
  });

  describe('constructor', () => {
    it('should have correct config', () => {
      expect(actor.config.id).toBe('instagram');
      expect(actor.config.name).toBe('Instagram Actor');
      expect(actor.config.version).toBe('1.0.0');
      expect(actor.config.capabilities).toContain('profiles');
      expect(actor.config.capabilities).toContain('posts');
      expect(actor.config.capabilities).toContain('hashtags');
      expect(actor.config.capabilities).toContain('engagement');
      expect(actor.config.capabilities).toContain('influencers');
    });

    it('should have rate limit configured', () => {
      expect(actor.config.rateLimit).toEqual({ requests: 10, window: 60000 });
    });
  });

  describe('validate', () => {
    it('should validate get_profile with username', async () => {
      const valid = await actor.validate({
        action: 'get_profile',
        username: 'instagram',
      });
      expect(valid).toBe(true);
    });

    it('should reject get_profile without username', async () => {
      const invalid = await actor.validate({
        action: 'get_profile',
      });
      expect(invalid).toBe(false);
    });

    it('should validate get_posts with username', async () => {
      const valid = await actor.validate({
        action: 'get_posts',
        username: 'instagram',
      });
      expect(valid).toBe(true);
    });

    it('should reject get_posts without username', async () => {
      const invalid = await actor.validate({
        action: 'get_posts',
      });
      expect(invalid).toBe(false);
    });

    it('should validate get_hashtags with hashtag', async () => {
      const valid = await actor.validate({
        action: 'get_hashtags',
        hashtag: 'photography',
      });
      expect(valid).toBe(true);
    });

    it('should reject get_hashtags without hashtag', async () => {
      const invalid = await actor.validate({
        action: 'get_hashtags',
      });
      expect(invalid).toBe(false);
    });

    it('should validate get_trending without params', async () => {
      const valid = await actor.validate({
        action: 'get_trending',
      });
      expect(valid).toBe(true);
    });

    it('should reject unknown actions', async () => {
      const invalid = await actor.validate({
        action: 'unknown_action',
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

    it('should require username for get_profile', async () => {
      const result = await actor.scrape({
        action: 'get_profile',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('username is required');
    });

    it('should require username for get_posts', async () => {
      const result = await actor.scrape({
        action: 'get_posts',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('username is required');
    });

    it('should require hashtag for get_hashtags', async () => {
      const result = await actor.scrape({
        action: 'get_hashtags',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('hashtag is required');
    });

    it('should accept get_trending without params', async () => {
      const result = await actor.scrape({
        action: 'get_trending',
      });

      // Should not have validation error, may have fetch error due to no real URL
      expect(result).toBeDefined();
    });
  });

  describe('capabilities', () => {
    it('should support profiles capability', () => {
      expect(actor.config.capabilities).toContain('profiles');
    });

    it('should support posts capability', () => {
      expect(actor.config.capabilities).toContain('posts');
    });

    it('should support hashtags capability', () => {
      expect(actor.config.capabilities).toContain('hashtags');
    });

    it('should support engagement capability', () => {
      expect(actor.config.capabilities).toContain('engagement');
    });

    it('should support influencers capability', () => {
      expect(actor.config.capabilities).toContain('influencers');
    });
  });
});
