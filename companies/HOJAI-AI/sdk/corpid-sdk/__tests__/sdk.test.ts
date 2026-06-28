/**
 * CorpID SDK Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CorpID, CorpIDError } from '../src/index';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockResponse(data: any, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }) as any;
}

describe('CorpID SDK', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('uses default baseUrl', () => {
      const client = new CorpID();
      expect((client as any).baseUrl).toBe('http://localhost:4702');
    });

    it('uses custom baseUrl', () => {
      const client = new CorpID({ baseUrl: 'https://api.example.com' });
      expect((client as any).baseUrl).toBe('https://api.example.com');
    });

    it('uses custom timeout', () => {
      const client = new CorpID({ timeout: 60000 });
      expect((client as any).timeout).toBe(60000);
    });
  });

  describe('register', () => {
    it('registers a new user', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        user: {
          id: 'CI-IND-xxx',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        },
      }));

      const client = new CorpID();
      const user = await client.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(user.email).toBe('test@example.com');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4702/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', name: 'Test User', password: 'password123' }),
        })
      );
    });
  });

  describe('login', () => {
    it('returns tokens and sets accessToken', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        accessToken: 'access-token-xxx',
        refreshToken: 'refresh-token-xxx',
        expiresIn: 3600,
        user: { id: 'CI-IND-xxx', email: 'test@example.com', name: 'Test' },
      }));

      const client = new CorpID();
      const result = await client.login({ email: 'test@example.com', password: 'password' });

      expect(result.accessToken).toBe('access-token-xxx');
      expect((client as any).accessToken).toBe('access-token-xxx');
    });

    it('handles MFA required response', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        mfaRequired: true,
        mfaToken: 'mfa-token-xxx',
      }));

      const client = new CorpID();
      const result = await client.login({ email: 'test@example.com', password: 'password' });

      expect(result.mfaRequired).toBe(true);
      expect(result.mfaToken).toBe('mfa-token-xxx');
    });
  });

  describe('agentCreate', () => {
    it('creates an agent passport', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        agent: {
          agentId: 'CI-AGT-xxx',
          name: 'sales-bot',
          permissions: ['leads:read'],
          status: 'active',
        },
      }));

      const client = new CorpID({ accessToken: 'test-token' });
      const agent = await client.agentCreate({
        name: 'sales-bot',
        permissions: ['leads:read'],
      });

      expect(agent.agentId).toBe('CI-AGT-xxx');
      expect(agent.permissions).toContain('leads:read');
    });
  });

  describe('delegationCreate', () => {
    it('creates a delegation', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        delegation: {
          delegationId: 'DEL-xxx',
          scope: ['leads:read'],
          status: 'active',
        },
      }));

      const client = new CorpID({ accessToken: 'test-token' });
      const delegation = await client.delegationCreate({
        delegateId: 'CI-AGT-xxx',
        scope: ['leads:read'],
      });

      expect(delegation.delegationId).toBe('DEL-xxx');
    });
  });

  describe('trustScore', () => {
    it('gets trust score for entity', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        corpId: 'CI-AGT-xxx',
        score: 85,
        level: 'gold',
      }));

      const client = new CorpID();
      const trust = await client.trustScore('CI-AGT-xxx');

      expect(trust.score).toBe(85);
      expect(trust.level).toBe('gold');
    });
  });

  describe('timeline', () => {
    it('gets timeline for entity', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: true,
        timeline: [
          { id: 'EVT-1', title: 'Logged In', icon: '🔐' },
          { id: 'EVT-2', title: 'Trust Score Updated', icon: '⭐' },
        ],
      }));

      const client = new CorpID({ accessToken: 'test-token' });
      const events = await client.timeline('CI-IND-xxx');

      expect(events).toHaveLength(2);
      expect(events[0].title).toBe('Logged In');
    });
  });

  describe('error handling', () => {
    it('throws CorpIDError on API error', async () => {
      mockFetch.mockResolvedValue(createMockResponse({
        success: false,
        error: 'User not found',
      }, 404));

      const client = new CorpID();

      await expect(client.userGet('invalid-id')).rejects.toThrow(CorpIDError);
    });

    it('throws CorpIDError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new CorpID({ timeout: 100 });

      await expect(client.me()).rejects.toThrow('Network error');
    });
  });

  describe('API key auth', () => {
    it('includes X-API-Key header', async () => {
      mockFetch.mockResolvedValue(createMockResponse({ success: true, user: {} }));

      const client = new CorpID({ apiKey: 'my-api-key' });
      await client.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-API-Key': 'my-api-key' }),
        })
      );
    });
  });
});