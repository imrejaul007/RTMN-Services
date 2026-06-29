import { describe, it, expect } from 'vitest';

describe('Social Connector', () => {
  describe('Accounts API', () => {
    it('should list connected accounts', async () => {
      const res = await fetch('http://localhost:5492/api/accounts', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.accounts).toBeDefined();
    });

    it('should connect Facebook account', async () => {
      const res = await fetch('http://localhost:5492/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          platform: 'facebook',
          accessToken: 'fb_token_123'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.account.platform).toBe('facebook');
    });

    it('should reject invalid platform', async () => {
      const res = await fetch('http://localhost:5492/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          platform: 'invalid_platform'
        })
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Posts API', () => {
    it('should create post', async () => {
      const res = await fetch('http://localhost:5492/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test' },
        body: JSON.stringify({
          platforms: ['facebook'],
          content: 'Test post content'
        })
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.post.postId).toBeDefined();
    });

    it('should list posts', async () => {
      const res = await fetch('http://localhost:5492/api/posts', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.posts).toBeDefined();
    });
  });

  describe('Metrics API', () => {
    it('should return metrics', async () => {
      const res = await fetch('http://localhost:5492/api/metrics', {
        headers: { 'X-API-Key': 'test' }
      });
      expect(res.ok).toBe(true);
      const data = await res.json();
      expect(data.totalPosts).toBeDefined();
    });
  });
});
