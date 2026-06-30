/**
 * GitHub Actor Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubActor } from '../src/index.js';

describe('GitHubActor', () => {
  let actor: GitHubActor;

  beforeEach(() => {
    actor = new GitHubActor();
  });

  describe('configuration', () => {
    it('should have correct actor configuration', () => {
      expect(actor.config.id).toBe('github');
      expect(actor.config.name).toBe('GitHub Actor');
      expect(actor.config.version).toBe('1.0.0');
      expect(actor.config.capabilities).toContain('repositories');
      expect(actor.config.capabilities).toContain('users');
      expect(actor.config.capabilities).toContain('trending');
      expect(actor.config.capabilities).toContain('code');
    });

    it('should have rate limiting configured', () => {
      expect(actor.config.rateLimit).toBeDefined();
      expect(actor.config.rateLimit.requests).toBe(30);
      expect(actor.config.rateLimit.window).toBe(60000);
    });
  });

  describe('validate', () => {
    describe('search_repos action', () => {
      it('should return true for valid search query', async () => {
        const result = await actor.validate({
          action: 'search_repos',
          params: { query: 'typescript' },
        });
        expect(result).toBe(true);
      });

      it('should return true for search with all options', async () => {
        const result = await actor.validate({
          action: 'search_repos',
          params: {
            query: 'react hooks',
            language: 'typescript',
            sort: 'stars',
            order: 'desc',
            limit: 20,
          },
        });
        expect(result).toBe(true);
      });

      it('should return false for empty query', async () => {
        const result = await actor.validate({
          action: 'search_repos',
          params: { query: '' },
        });
        expect(result).toBe(false);
      });

      it('should return false for missing query', async () => {
        const result = await actor.validate({
          action: 'search_repos',
          params: {},
        });
        expect(result).toBe(false);
      });
    });

    describe('get_repo action', () => {
      it('should return true for valid owner and repo', async () => {
        const result = await actor.validate({
          action: 'get_repo',
          params: { owner: 'facebook', repo: 'react' },
        });
        expect(result).toBe(true);
      });

      it('should return true with additional options', async () => {
        const result = await actor.validate({
          action: 'get_repo',
          params: {
            owner: 'microsoft',
            repo: 'typescript',
            includeReadme: true,
            includeContributors: true,
          },
        });
        expect(result).toBe(true);
      });

      it('should return false for missing owner', async () => {
        const result = await actor.validate({
          action: 'get_repo',
          params: { repo: 'react' },
        });
        expect(result).toBe(false);
      });

      it('should return false for missing repo', async () => {
        const result = await actor.validate({
          action: 'get_repo',
          params: { owner: 'facebook' },
        });
        expect(result).toBe(false);
      });

      it('should return false for empty owner', async () => {
        const result = await actor.validate({
          action: 'get_repo',
          params: { owner: '', repo: 'react' },
        });
        expect(result).toBe(false);
      });
    });

    describe('get_user action', () => {
      it('should return true for valid username', async () => {
        const result = await actor.validate({
          action: 'get_user',
          params: { username: 'torvalds' },
        });
        expect(result).toBe(true);
      });

      it('should return true with contributions flag', async () => {
        const result = await actor.validate({
          action: 'get_user',
          params: { username: 'sindresorhus', includeContributions: true },
        });
        expect(result).toBe(true);
      });

      it('should return false for missing username', async () => {
        const result = await actor.validate({
          action: 'get_user',
          params: {},
        });
        expect(result).toBe(false);
      });

      it('should return false for empty username', async () => {
        const result = await actor.validate({
          action: 'get_user',
          params: { username: '' },
        });
        expect(result).toBe(false);
      });
    });

    describe('get_trending action', () => {
      it('should return true with no params', async () => {
        const result = await actor.validate({
          action: 'get_trending',
          params: {},
        });
        expect(result).toBe(true);
      });

      it('should return true with language param', async () => {
        const result = await actor.validate({
          action: 'get_trending',
          params: { language: 'python' },
        });
        expect(result).toBe(true);
      });

      it('should return true with all params', async () => {
        const result = await actor.validate({
          action: 'get_trending',
          params: {
            language: 'javascript',
            timeframe: 'weekly',
            limit: 50,
          },
        });
        expect(result).toBe(true);
      });
    });

    describe('invalid actions', () => {
      it('should return false for unknown action', async () => {
        const result = await actor.validate({
          action: 'unknown_action',
          params: {},
        });
        expect(result).toBe(false);
      });

      it('should return false for missing action', async () => {
        const result = await actor.validate({
          params: {},
        });
        expect(result).toBe(false);
      });
    });

    it('should return false for null input', async () => {
      const result = await actor.validate(null);
      expect(result).toBe(false);
    });

    it('should return false for non-object input', async () => {
      const result = await actor.validate('invalid');
      expect(result).toBe(false);
    });
  });

  describe('scrape', () => {
    it('should return error for unknown action', async () => {
      const result = await actor.scrape({
        action: 'unknown_action',
        params: {},
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown action');
    });

    it('should return structure with metadata on error', async () => {
      const result = await actor.scrape({
        action: 'unknown_action',
        params: {},
      });
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });
  });

  describe('parseNumber helper', () => {
    it('should parse plain numbers', () => {
      // Access private method via prototype
      const parseNumber = (actor as any).parseNumber.bind(actor);
      expect(parseNumber('1234')).toBe(1234);
    });

    it('should parse numbers with K suffix', () => {
      const parseNumber = (actor as any).parseNumber.bind(actor);
      expect(parseNumber('1.5k')).toBe(1500);
      expect(parseNumber('10K')).toBe(10000);
    });

    it('should parse numbers with M suffix', () => {
      const parseNumber = (actor as any).parseNumber.bind(actor);
      expect(parseNumber('2.5m')).toBe(2500000);
    });

    it('should handle empty string', () => {
      const parseNumber = (actor as any).parseNumber.bind(actor);
      expect(parseNumber('')).toBe(0);
    });
  });
});

describe('GitHubActor Integration', () => {
  let actor: GitHubActor;

  beforeEach(() => {
    actor = new GitHubActor();
  });

  it('should route search_repos action and return valid structure', async () => {
    const result = await actor.scrape({
      action: 'search_repos',
      params: { query: 'test' },
    });
    // Result depends on actual GitHub scraping - may succeed or fail due to network
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    // If success is true, data should be present; if false, error should be present
    if (result.success) {
      expect(result).toHaveProperty('data');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('should route get_repo action and return valid structure', async () => {
    const result = await actor.scrape({
      action: 'get_repo',
      params: { owner: 'facebook', repo: 'react' },
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (result.success) {
      expect(result).toHaveProperty('data');
      expect((result as any).data).toHaveProperty('owner');
      expect((result as any).data).toHaveProperty('repo');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('should route get_user action and return valid structure', async () => {
    const result = await actor.scrape({
      action: 'get_user',
      params: { username: 'torvalds' },
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (result.success) {
      expect(result).toHaveProperty('data');
      expect((result as any).data).toHaveProperty('username');
    } else {
      expect(result).toHaveProperty('error');
    }
  });

  it('should route get_trending action and return valid structure', async () => {
    const result = await actor.scrape({
      action: 'get_trending',
      params: { language: 'javascript' },
    });
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
    if (result.success) {
      expect(result).toHaveProperty('data');
    } else {
      expect(result).toHaveProperty('error');
    }
  });
});
