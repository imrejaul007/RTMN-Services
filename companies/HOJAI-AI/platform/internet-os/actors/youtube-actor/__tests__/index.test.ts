/**
 * YouTube Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { YouTubeActor } from '../src/index.js';

describe('YouTubeActor', () => {
  let actor: YouTubeActor;

  beforeEach(() => {
    actor = new YouTubeActor();
  });

  it('should have correct configuration', () => {
    expect(actor.config.id).toBe('youtube');
    expect(actor.config.name).toBe('YouTube Actor');
    expect(actor.config.version).toBe('1.0.0');
    expect(actor.config.capabilities).toContain('videos');
    expect(actor.config.capabilities).toContain('channels');
    expect(actor.config.capabilities).toContain('trending');
    expect(actor.config.capabilities).toContain('search');
  });

  it('should have rate limiting configured', () => {
    expect(actor.config.rateLimit).toBeDefined();
    expect(actor.config.rateLimit?.requests).toBe(20);
    expect(actor.config.rateLimit?.window).toBe(60000);
  });

  describe('validate', () => {
    it('should return true for valid search query', async () => {
      const result = await actor.validate({ query: 'react tutorial' });
      expect(result).toBe(true);
    });

    it('should return false for empty query', async () => {
      const result = await actor.validate({ query: '' });
      expect(result).toBe(false);
    });

    it('should return false for empty query string', async () => {
      const result = await actor.validate({ query: '' });
      expect(result).toBe(false);
    });

    it('should return false for whitespace-only query', async () => {
      const result = await actor.validate({ query: '   ' });
      expect(result).toBe(false);
    });

    it('should return true for valid videoId', async () => {
      const result = await actor.validate({ videoId: 'dQw4w9WgXcQ' });
      expect(result).toBe(true);
    });

    it('should return true for valid video URL', async () => {
      const result = await actor.validate({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
      expect(result).toBe(true);
    });

    it('should return true for valid channelId', async () => {
      const result = await actor.validate({ channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' });
      expect(result).toBe(true);
    });

    it('should return true for valid handle', async () => {
      const result = await actor.validate({ handle: '@google' });
      expect(result).toBe(true);
    });

    it('should return true for valid channel URL', async () => {
      const result = await actor.validate({ url: 'https://www.youtube.com/@GoogleDevelopers' });
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
  });

  describe('search_videos', () => {
    it('should handle search input structure', async () => {
      const input = {
        query: 'machine learning tutorial',
        maxResults: 10,
        sortBy: 'relevance' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with default parameters', async () => {
      const input = {
        query: 'web development',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with view_count sort', async () => {
      const input = {
        query: 'coding tutorial',
        sortBy: 'view_count' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle search with upload_date sort', async () => {
      const input = {
        query: 'latest tech news',
        sortBy: 'upload_date' as const,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_video', () => {
    it('should handle videoId input', async () => {
      const input = {
        videoId: 'dQw4w9WgXcQ',
        includeComments: true,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle URL input', async () => {
      const input = {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle video without comments', async () => {
      const input = {
        videoId: 'abc123',
        includeComments: false,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_channel', () => {
    it('should handle channelId input', async () => {
      const input = {
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle handle input', async () => {
      const input = {
        handle: '@TechGuy',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle channel URL input', async () => {
      const input = {
        url: 'https://www.youtube.com/@GoogleDevelopers',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });

  describe('get_trending', () => {
    it('should handle trending input with defaults', async () => {
      const input = {};

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle trending with region', async () => {
      const input = {
        region: 'US',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle trending with category', async () => {
      const input = {
        category: 'music',
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });

    it('should handle trending with maxResults', async () => {
      const input = {
        maxResults: 50,
      };

      const isValid = await actor.validate(input);
      expect(isValid).toBe(true);
    });
  });
});
