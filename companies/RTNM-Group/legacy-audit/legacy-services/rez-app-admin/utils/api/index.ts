/**
 * utils/api — lightweight wrapper around apiClient for screens that use
 * the generic `apiCall(url, options)` calling convention.
 *
 * Delegates to the singleton apiClient which handles auth headers,
 * token refresh, and error normalisation.
 */
import { apiClient } from '../../services/api/apiClient';

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Generic API call helper.
 *
 * Usage:
 *   const res = await apiCall('/api/admin/foo', { method: 'GET' });
 *   const res = await apiCall('/api/admin/foo', { method: 'POST', body: { x: 1 } });
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: ApiCallOptions = {}
): Promise<{ success: boolean; data?: T; message?: string; [key: string]: any }> {
  const { method = 'GET', body, headers } = options;

  switch (method) {
    case 'POST':
      return apiClient.post<T>(endpoint, body, { headers });
    case 'PUT':
      return apiClient.put<T>(endpoint, body, { headers });
    case 'PATCH':
      return apiClient.patch<T>(endpoint, body, { headers });
    case 'DELETE':
      return apiClient.delete<T>(endpoint, { headers });
    case 'GET':
    default:
      return apiClient.get<T>(endpoint, { headers });
  }
}

export default apiCall;
