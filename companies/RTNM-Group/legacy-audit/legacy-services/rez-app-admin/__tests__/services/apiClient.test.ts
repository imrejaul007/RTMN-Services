/**
 * Admin API Client — Smoke Tests
 *
 * Validates: request construction, auth headers, timeout handling,
 * 401 → token refresh flow, error responses.
 */

jest.mock('../../services/storage', () => ({
  storageService: {
    getAuthToken: jest.fn().mockResolvedValue('test-token'),
    getRefreshToken: jest.fn().mockResolvedValue('test-refresh'),
    setAuthToken: jest.fn().mockResolvedValue(undefined),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    setUserData: jest.fn().mockResolvedValue(undefined),
    logout: jest.fn().mockResolvedValue(undefined),
  },
  COOKIE_AUTH_ENABLED: false,
}));

jest.mock('../../config/api', () => ({
  API_CONFIG: { TIMEOUT: 10000 },
  buildApiUrl: (endpoint: string) => `https://api.test.com/api/${endpoint}`,
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { version: '1.0.0' },
    manifest: { version: '1.0.0' },
  },
}));

import { apiClient } from '../../services/api/apiClient';

const mockFetch = global.fetch as jest.Mock;

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET requests', () => {
    it('sends correct headers with auth token', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 1 } }),
      });

      await apiClient.get('admin/merchants');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/api/admin/merchants',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    it('returns parsed response data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [{ id: 'm1' }] }),
      });

      const result = await apiClient.get('admin/merchants');
      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: 'm1' }]);
    });
  });

  describe('POST requests', () => {
    it('sends body as JSON', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 'new' } }),
      });

      await apiClient.post('admin/merchants', { name: 'Test Store' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Store' }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('returns error message on non-OK response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ success: false, message: 'Validation failed' }),
      });

      const result = await apiClient.post('admin/merchants', {});
      expect(result.success).toBe(false);
      expect(result.message).toBe('Validation failed');
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'));

      const result = await apiClient.get('admin/merchants');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to fetch');
    });

    it('handles timeout via AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const result = await apiClient.get('admin/slow-endpoint');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Request timeout');
    });
  });

  describe('401 handling', () => {
    it('attempts token refresh on 401', async () => {
      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: () => Promise.resolve({ success: false, message: 'Token expired' }),
        })
        // Refresh token call
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: { token: 'new-token', refreshToken: 'new-refresh' },
            }),
        })
        // Retry original call
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { id: 1 } }),
        });

      const result = await apiClient.get('admin/merchants');
      expect(result.success).toBe(true);
      // Should have called fetch 3 times: original, refresh, retry
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
});
