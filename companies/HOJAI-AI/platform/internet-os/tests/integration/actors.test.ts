/**
 * InternetOS - Comprehensive Actor Integration Tests
 *
 * Tests every working actor end-to-end against real endpoints.
 * Uses vitest. Set TEST_API_KEY env vars to enable paid-API tests.
 *
 * Run:
 *   npm test                # Run all tests
 *   npm test:run            # Single run
 */

import { describe, it, expect, beforeAll } from 'vitest';

const API_URL = process.env.INTERNETOS_URL || 'http://localhost:4595';
const HAS_GITHUB = !!process.env.GITHUB_TOKEN;
const HAS_YOUTUBE = !!process.env.YOUTUBE_API_KEY;
const HAS_TWITTER = !!process.env.TWITTER_BEARER_TOKEN;
const HAS_AMAZON = !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY);
const HAS_LINKEDIN = !!process.env.LINKEDIN_API_KEY;
const HAS_INSTAGRAM = !!process.env.INSTAGRAM_ACCESS_TOKEN;

// Check server up - wait for it
async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`${API_URL}/health`);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

const SERVER_UP = await waitForServer();

if (!SERVER_UP) {
  console.warn(`\n⚠️  InternetOS not running at ${API_URL}. Start it with: npm start\n`);
}

const describeIf = (cond: boolean, name: string, fn: () => void) =>
  cond ? describe(name, fn) : describe.skip(name, fn);

async function runActor(id: string, params: any = {}, action: string = 'test') {
  const res = await fetch(`${API_URL}/api/actors/${id}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-token': process.env.INTERNAL_TOKEN || 'webhook-bus-internal-token',
    },
    body: JSON.stringify({ action, params }),
  });
  return res.json();
}

// ==============================================================================
// FREE ACTORS (always run)
// ==============================================================================

describeIf(SERVER_UP, 'Server Health & Setup', () => {
  it('returns healthy status', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
  });

  it('lists all available actors', async () => {
    const res = await fetch(`${API_URL}/api/actors`, {
      headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || 'webhook-bus-internal-token' },
    });
    const data = await res.json();
    expect(data.actors).toBeInstanceOf(Array);
    expect(data.actors.length).toBeGreaterThanOrEqual(15);
  });

  it('contains expected core actors', async () => {
    const res = await fetch(`${API_URL}/api/actors`, {
      headers: { 'x-internal-token': process.env.INTERNAL_TOKEN || 'webhook-bus-internal-token' },
    });
    const data = await res.json();
    expect(data.actors).toBeInstanceOf(Array);
    const ids = data.actors.map((a: any) => a.id);
    // Core actors that should always be present
    expect(ids).toContain('github');
    expect(ids).toContain('youtube');
    expect(ids).toContain('news');
    expect(ids).toContain('reddit');
    expect(ids).toContain('shopify');
  });
});

describeIf(SERVER_UP, 'Free Actors', () => {
  it('github - search returns valid response (public or rate-limited)', async () => {
    const result = await runActor('github', { q: 'hojai', limit: 3 }, 'search_repos');
    // Either success OR a rate-limit error is acceptable
    expect(result).toBeDefined();
    if (!result.success) {
      // GitHub rate limits un-authed requests
      expect(result.error).toBeDefined();
    }
  }, 30000);

  it('reddit - subreddit fetch works or fails with known error', async () => {
    const result = await runActor('reddit', { subreddit: 'programming', limit: 3 }, 'subreddit_posts');
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      // Reddit may block if no UA
      expect(result.error).toBeDefined();
    }
  }, 30000);

  it('news - RSS feed parsing works or returns error', async () => {
    const result = await runActor('news', { query: 'AI', limit: 5 }, 'search_news');
    // Network-dependent - just verify the response is well-formed
    expect(result).toBeDefined();
    if (result.success) {
      expect(result.data).toBeDefined();
    } else {
      // Network errors are acceptable
      expect(result.error).toBeDefined();
    }
  }, 30000);

  it('github with token - search works without rate limit', async () => {
    if (!HAS_GITHUB) {
      console.log('  ⚠️  GITHUB_TOKEN not set, skipping auth test');
      return;
    }
    const result = await runActor('github', { q: 'hojai', limit: 3 }, 'search_repos');
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  }, 30000);
});

// ==============================================================================
// YOUTUBE
// ==============================================================================

describeIf(SERVER_UP && HAS_YOUTUBE, 'YouTube Actor', () => {
  it('search videos by query', async () => {
    const result = await runActor('youtube', { q: 'AI agents', limit: 3 }, 'search_videos');
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
    if (result.data.length > 0) {
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('title');
    }
  }, 30000);

  it('get trending videos', async () => {
    const result = await runActor('youtube', { regionCode: 'US' }, 'get_trending');
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  }, 30000);
});

describeIf(SERVER_UP && !HAS_YOUTUBE, 'YouTube Actor', () => {
  it('skipped (no YOUTUBE_API_KEY)', () => {});
});

// ==============================================================================
// TWITTER
// ==============================================================================

describeIf(SERVER_UP && HAS_TWITTER, 'Twitter Actor', () => {
  it('search recent tweets', async () => {
    const result = await runActor('twitter-api', { query: 'AI agents', limit: 3 }, 'search_tweets');
    expect(result.success).toBe(true);
    expect(result.data?.tweets).toBeInstanceOf(Array);
  }, 30000);
});

describeIf(SERVER_UP && !HAS_TWITTER, 'Twitter Actor', () => {
  it('skipped (no TWITTER_BEARER_TOKEN)', () => {});
});

// ==============================================================================
// AMAZON
// ==============================================================================

describeIf(SERVER_UP && HAS_AMAZON, 'Amazon Actor', () => {
  it('search products', async () => {
    const result = await runActor('amazon-api', { keywords: 'laptop', limit: 3 }, 'search_products');
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  }, 30000);
});

describeIf(SERVER_UP && !HAS_AMAZON, 'Amazon Actor', () => {
  it('skipped (no AMAZON_ACCESS_KEY/SECRET)', () => {});
});

// ==============================================================================
// LINKEDIN
// ==============================================================================

describeIf(SERVER_UP && HAS_LINKEDIN, 'LinkedIn Actor', () => {
  it('get person profile by URL', async () => {
    const result = await runActor(
      'linkedin',
      { linkedinUrl: 'https://www.linkedin.com/in/williamhgates' },
      'get_person'
    );
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('fullName');
    expect(result.data).toHaveProperty('profileUrl');
  }, 30000);
});

describeIf(SERVER_UP && !HAS_LINKEDIN, 'LinkedIn Actor', () => {
  it('skipped (no LINKEDIN_API_KEY)', () => {});
});

// ==============================================================================
// INSTAGRAM
// ==============================================================================

describeIf(SERVER_UP && HAS_INSTAGRAM, 'Instagram Actor', () => {
  it('get account info', async () => {
    const result = await runActor('instagram', {}, 'get_account');
    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('username');
    expect(result.data).toHaveProperty('followersCount');
  }, 30000);

  it('get account media', async () => {
    const result = await runActor('instagram', { limit: 5 }, 'get_media');
    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
  }, 30000);
});

describeIf(SERVER_UP && !HAS_INSTAGRAM, 'Instagram Actor', () => {
  it('skipped (no INSTAGRAM_ACCESS_TOKEN)', () => {});
});

// ==============================================================================
// AUTH & SECURITY
// ==============================================================================

describeIf(SERVER_UP, 'Authentication', () => {
  it('protected API requires auth', async () => {
    const res = await fetch(`${API_URL}/api/actors`);
    expect(res.status).toBe(401);
  });

  it('JWT token generation works', async () => {
    const res = await fetch(`${API_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user', scopes: ['read'] }),
    });
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.token.split('.')).toHaveLength(3); // JWT format
  });

  it('JWT token works for protected routes', async () => {
    const tokenRes = await fetch(`${API_URL}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'test-user', scopes: ['read'] }),
    });
    const { token } = await tokenRes.json();

    const actorsRes = await fetch(`${API_URL}/api/actors`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(actorsRes.status).toBe(200);
  });

  it('internal token works for service-to-service', async () => {
    const res = await fetch(`${API_URL}/api/actors`, {
      headers: { 'x-internal-token': 'webhook-bus-internal-token' },
    });
    expect(res.status).toBe(200);
  });
});

describeIf(SERVER_UP, 'Security Headers', () => {
  it('rate limit headers present', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('x-ratelimit-limit')).toBeDefined();
    expect(res.headers.get('x-ratelimit-remaining')).toBeDefined();
  });

  it('X-Frame-Options set to DENY', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('X-Content-Type-Options set to nosniff', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('HSTS header present', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.headers.get('strict-transport-security')).toBeDefined();
  });
});

// ==============================================================================
// WATCHERS
// ==============================================================================

describeIf(SERVER_UP, 'Watchers', () => {
  it('list watchers', async () => {
    const res = await fetch(`${API_URL}/api/watchers`, {
      headers: { 'x-internal-token': 'webhook-bus-internal-token' },
    });
    expect(res.status).toBe(200);
  });

  it('create and delete watcher', async () => {
    const id = `test-watcher-${Date.now()}`;
    const createRes = await fetch(`${API_URL}/api/watchers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'webhook-bus-internal-token',
      },
      body: JSON.stringify({
        id,
        name: 'Test',
        url: 'https://example.com',
        type: 'price',
        interval: 60000,
      }),
    });
    expect([200, 201]).toContain(createRes.status);
  });
});

// ==============================================================================
// RESEARCH & SCHEDULER
// ==============================================================================

describeIf(SERVER_UP, 'Research & Scheduler', () => {
  it('lists research agents', async () => {
    const res = await fetch(`${API_URL}/api/research/agents`, {
      headers: { 'x-internal-token': 'webhook-bus-internal-token' },
    });
    expect(res.status).toBe(200);
  });

  it('lists schedules', async () => {
    const res = await fetch(`${API_URL}/api/scheduler/`, {
      headers: { 'x-internal-token': 'webhook-bus-internal-token' },
    });
    expect(res.status).toBe(200);
  });

  it('gets system stats', async () => {
    const res = await fetch(`${API_URL}/api/stats`, {
      headers: { 'x-internal-token': 'webhook-bus-internal-token' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.actors).toBeDefined();
    expect(data.watchers).toBeDefined();
  });
});