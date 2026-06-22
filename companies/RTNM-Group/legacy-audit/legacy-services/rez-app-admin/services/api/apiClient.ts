import { API_CONFIG, buildApiUrl } from '../../config/api';
import { storageService } from '../storage';
import Constants from 'expo-constants';
import { retry429 } from '../../utils/retryPolicy';
import { logger } from '../../utils/logger';

// Canonical API types — inlined to avoid local file path dependency
import type { ApiResponse as SharedApiResponse } from '../../types/rez-shared-types';

// CSRF-token handling (mirrors consumer + merchant). Admin had no CSRF support
// until agent 9 — add web-only cookie-based attachment on mutating requests.
// Native platforms skip silently (no document). ADM-008 FIX: warn on every
// missing CSRF token so operators can detect misconfiguration across all requests.
const _CSRF_MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// CSRF is not required for these unauthenticated endpoints (no session/cookie exists yet)
const _CSRF_EXEMPT_ENDPOINTS = new Set([
  'admin/auth/login',
  'auth/login',
  'admin/auth/refresh-token',
]);

// LOW FIX: Secure random for retry jitter (instead of Math.random)
function getSecureRandomJitter(maxMs: number): number {
  // Use Web Crypto API if available
  if (typeof globalThis !== 'undefined' && (globalThis as any).crypto?.getRandomValues) {
    const array = new Uint16Array(1);
    (globalThis as any).crypto.getRandomValues(array);
    return array[0] % maxMs;
  }
  // Fallback for non-browser environments (e.g., Jest)
  if (typeof require !== 'undefined') {
    try {
      const { randomBytes } = require('crypto');
      const buf = randomBytes(2);
      return buf.readUInt16BE(0) % maxMs;
    } catch {
      // Fallback only for environments without crypto
      return Date.now() % maxMs;
    }
  }
  return Date.now() % maxMs;
}

function readCsrfTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // Cookie read failed (sandboxed iframe, disabled cookies, etc.) — skip.
  }
  return null;
}

// Local augmentation: expose raw HTTP status on non-2xx responses so callers can
// distinguish specific status codes (e.g. 202 Accepted for pending approval)
// without this change propagating into shared types across other apps.
export type ApiResponse<T = unknown> = SharedApiResponse<T> & {
  httpStatus?: number;
};

const MAX_RETRIES = 3;

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;
  private onLogoutCallback: (() => void) | null = null;

  /**
   * Register a callback to be invoked when a token refresh fails and the user
   * must be redirected to the login screen. Wire this up from AuthContext.
   */
  setOnLogoutCallback(callback: () => void) {
    this.onLogoutCallback = callback;
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns the new access token on success, or null on failure.
   */
  private async attemptTokenRefresh(): Promise<string | null> {
    // Deduplicate concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      // Bound the refresh attempt: without this, a hung auth service would leave
      // `refreshPromise` pending forever and every subsequent API call would queue
      // behind it indefinitely (since concurrent callers await the shared promise).
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      try {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) return null;

        const url = buildApiUrl('admin/auth/refresh-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
          credentials: 'include', // Phase 6: send httpOnly cookies cross-origin
          signal: controller.signal,
        });

        const data = await response.json();

        if (response.ok && data?.success && data?.data?.token) {
          await storageService.setAuthToken(data.data.token);
          if (data.data.refreshToken) {
            await storageService.setRefreshToken(data.data.refreshToken);
          }
          if (data.data.user) {
            await storageService.setUserData(data.data.user);
          }
          logger.info('[Admin API] Token refreshed successfully');
          return data.data.token as string;
        }

        return null;
      } catch (err: any) {
        // Treat AbortError (our 15s timeout) as a refresh failure rather than rethrowing;
        // callers expect null on any failure and will trigger the logout path.
        if (err?.name === 'AbortError') {
          logger.error('[Admin API] Token refresh timed out');
          return null;
        }
        logger.error('[Admin API] Token refresh failed:', err);
        return null;
      } finally {
        clearTimeout(timeoutId);
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async getHeaders(
    customHeaders?: Record<string, string>
  ): Promise<Record<string, string>> {
    const token = await storageService.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // PERF-10: Opt in to response compression. Backend (Express +
      // compression middleware on the gateway) only returns gzipped bodies
      // when the client advertises support. Typical admin JSON responses
      // (orders list, user lists) compress 3-5x — 150KB → 35KB.
      'Accept-Encoding': 'gzip, deflate',
      // BUG-048: Read version from app config instead of hardcoding it.
      'X-App-Version':
        Constants.expoConfig?.version ??
        String((Constants.manifest as Record<string, unknown>)?.version ?? '1.0.0'),
      ...customHeaders,
    };

    // Always set the Authorization header when a token is available.
    // On web, cookies (rez_access_token) are also sent via credentials:'include' and act as a
    // supplement. On native, cookies are not sent automatically, so the Bearer token is the
    // only auth mechanism — omitting it when COOKIE_AUTH_ENABLED=true caused all native
    // requests to return 401.
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Public method to get authentication headers for use in other services
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await storageService.getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // BUG-058 FIX: body is now generic <B> so callers get type safety and the
  // internal `any` is confined to the JSON serialisation call.
  // BUG-071 FIX: retryCount passed as a function parameter instead of leaking
  // internal state through options with `as any`.
  private async request<T, B = Record<string, unknown>>(
    method: string,
    endpoint: string,
    body?: B,
    options?: RequestOptions,
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const headers = await this.getHeaders(options?.headers);
    const timeout = options?.timeout || API_CONFIG.TIMEOUT;

    // Agent-9: attach X-CSRF-Token on mutating requests when running in a
    // browser context. Mirrors the merchant interceptor at services/api/client.ts.
    // Native skips silently — there's no document.cookie to read from.
    // MEDIUM FIX: Block mutating requests without CSRF token for security.
    if (
      typeof document !== 'undefined' &&
      _CSRF_MUTATING_METHODS.has(method) &&
      !_CSRF_EXEMPT_ENDPOINTS.has(endpoint)
    ) {
      const csrfToken = readCsrfTokenFromCookie();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      } else {
        logger.error('[admin apiClient] CSRF token required for mutating request', {
          method,
          endpoint,
        });
        return {
          success: false,
          message: 'CSRF token required for this operation',
          httpStatus: 403,
        } as ApiResponse<T>;
      }
    }

    logger.info(`🌐 [Admin API] ${method} ${url}`);

    // Serialise the body once — retry attempts after a 429 must not re-stringify.
    const serializedBody = body !== undefined && body !== null ? JSON.stringify(body) : undefined;

    // Each retry attempt owns its AbortController + timeout. We return the
    // outermost timeoutId via a mutable ref so the finally block can clear it.
    let activeTimeoutId: ReturnType<typeof setTimeout> | null = null;
    // ADMIN-004 — preserved single clearTimeout semantics by only tracking the
    // latest timer and clearing it in the finally block.
    const cleanupTimeout = () => {
      if (activeTimeoutId) {
        clearTimeout(activeTimeoutId);
        activeTimeoutId = null;
      }
    };

    try {
      // retry429 transparently retries on HTTP 429 with crypto-jittered
      // exponential backoff, honouring Retry-After. See utils/retryPolicy.ts.
      const response = await retry429(async () => {
        cleanupTimeout();
        const controller = new AbortController();
        activeTimeoutId = setTimeout(() => controller.abort(), timeout);
        return fetch(url, {
          method,
          headers,
          body: serializedBody,
          signal: controller.signal,
          credentials: 'include', // Phase 6: send httpOnly cookies cross-origin
        });
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(
          `❌ [Admin API] ${method} ${endpoint} failed:`,
          data.message || response.statusText
        );

        // A10-M14 FIX: Check content-type before treating response as JSON.
        // If the server returns a non-JSON response (e.g. 502 Bad Gateway with HTML),
        // response.json() above would throw before we reach this block, losing the message.
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.includes('application/json')) {
          return {
            success: false,
            message: `Server error (${response.status}). Please try again.`,
            httpStatus: response.status,
          };
        }

        // Handle 401 - attempt token refresh before logging out
        if (response.status === 401 && !endpoint.includes('/auth/')) {
          logger.info('[Admin API] Token expired, attempting refresh...');
          const newToken = await this.attemptTokenRefresh();
          if (newToken) {
            // Retry the original request with the refreshed token.
            // Always inject the Authorization header — on native there are no cookies,
            // so the Bearer token is the only auth mechanism. On web the cookie is also
            // sent via credentials:'include' as a supplement, which is harmless.
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            // Add AbortController with timeout for retry request
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), timeout);
            try {
              const retryResponse = await fetch(url, {
                method,
                headers: retryHeaders,
                body: body ? JSON.stringify(body) : undefined,
                signal: retryController.signal,
                credentials: 'include', // Phase 6: send httpOnly cookies cross-origin
              });
              const retryData = await retryResponse.json();
              if (retryResponse.ok) {
                logger.info(`✅ [Admin API] ${method} ${endpoint} success (after refresh)`);
                return { ...retryData, httpStatus: retryResponse.status };
              }
            } catch (retryError: any) {
              if (retryError.name !== 'AbortError') throw retryError;
              throw new Error('Retry request timeout');
            } finally {
              clearTimeout(retryTimeoutId);
            }
          }

          // Refresh failed — log out and redirect to login
          logger.info('[Admin API] Token refresh failed, clearing auth data');
          await storageService.logout();
          // Invoke the registered logout callback so the auth context can
          // dispatch LOGOUT and trigger navigation to the login screen.
          if (this.onLogoutCallback) {
            this.onLogoutCallback();
          }
          return {
            success: false,
            message: 'Session expired. Please log in again.',
          };
        }

        // Handle 429 - rate limited, retry with server-requested delay + jitter
        // BUG-071 FIX: retryCount is a function parameter, not leaked through options
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
          // LOW FIX: Use secure random for jitter instead of Math.random
          const jitter = getSecureRandomJitter(2000); // 0-2s jitter to avoid thundering herd
          const delay = retryAfter * 1000 + jitter;
          logger.info(
            `⏳ [Admin API] Rate limited, retrying in ${(delay / 1000).toFixed(1)}s (attempt ${retryCount + 1}/${MAX_RETRIES})...`
          );
          await new Promise((r) => setTimeout(r, delay));
          return this.request<T, B>(method, endpoint, body, options, retryCount + 1);
        }

        // Spread all fields so callers can inspect extra flags (e.g. requiresTotp: true).
        return {
          ...data,
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
          httpStatus: response.status,
        };
      }

      logger.info(`✅ [Admin API] ${method} ${endpoint} success`);
      // Include httpStatus on success too so callers can distinguish e.g. 202 Accepted
      // (pending approval) from plain 200 OK.
      return { ...data, httpStatus: response.status };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error(`❌ [Admin API] ${method} ${endpoint} timeout`);
        return {
          success: false,
          message: 'Request timeout',
        };
      }

      logger.error(`❌ [Admin API] ${method} ${endpoint} error:`, error.message);
      return {
        success: false,
        message: error.message || 'Network error',
      };
    } finally {
      // ADMIN-004: Clear timeout once, using finally block. With retry429 wiring
      // we track the latest attempt's timer via cleanupTimeout so only the
      // active timer is cleared — stale timers are cleared before each retry.
      cleanupTimeout();
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  // BUG-058 FIX: body params typed as Record<string, unknown> by default;
  // callers can still pass a specific type via the generic: post<Response, Body>.
  async post<T, B = Record<string, unknown>>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T, B>('POST', endpoint, body, options);
  }

  async put<T, B = Record<string, unknown>>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T, B>('PUT', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  async patch<T, B = Record<string, unknown>>(
    endpoint: string,
    body?: B,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<T, B>('PATCH', endpoint, body, options);
  }

  /**
   * Upload file using FormData
   * @param endpoint API endpoint
   * @param formData FormData with file(s)
   * @param options Request options
   */
  async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const token = await storageService.getAuthToken();
    const timeout = options?.timeout || 60000; // 60 second timeout for uploads

    logger.info(`📤 [Admin API] UPLOAD ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        ...options?.headers,
      };

      // Always set the Authorization header when a token is available.
      // On native, cookies are not sent automatically so the Bearer token is required.
      // On web, the httpOnly cookie is also sent via credentials:'include' as a supplement.
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Agent-9: uploads are POST mutating requests — attach CSRF on web.
      // We intentionally do NOT wrap uploadFile with retry429: the FormData stream
      // is consumed on first use (see ADMIN-008) and cannot be replayed.
      if (typeof document !== 'undefined') {
        const csrfToken = readCsrfTokenFromCookie();
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        } else {
          // ADM-008 FIX: warn on every upload request so repeated failures are visible
          logger.warn('[admin apiClient] CSRF token missing for mutating request', {
            method: 'POST',
            endpoint,
          });
        }
      }

      // Don't set Content-Type for FormData - let the browser set it with boundary
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
        credentials: 'include', // Phase 6: send httpOnly cookies cross-origin
      });

      const data = await response.json();

      if (!response.ok) {
        logger.error(
          `❌ [Admin API] UPLOAD ${endpoint} failed:`,
          data.message || response.statusText
        );

        if (response.status === 401 && !endpoint.includes('/auth/')) {
          logger.info('[Admin API] Token expired during upload, attempting refresh...');
          const newToken = await this.attemptTokenRefresh();
          if (newToken) {
            // ADMIN-008: FormData stream is consumed after first use.
            // Cannot retry since the stream body was already read by the first fetch.
            // Token was refreshed successfully — tell user to re-upload.
            return {
              success: false,
              message: 'Your session was refreshed. Please try uploading again.',
            };
          }

          logger.info('[Admin API] Token refresh failed, clearing auth data');
          await storageService.logout();
        }

        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      logger.info(`✅ [Admin API] UPLOAD ${endpoint} success`);
      return data;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        logger.error(`❌ [Admin API] UPLOAD ${endpoint} timeout`);
        return {
          success: false,
          message: 'Upload timeout',
        };
      }

      logger.error(`❌ [Admin API] UPLOAD ${endpoint} error:`, error.message);
      return {
        success: false,
        message: error.message || 'Upload failed',
      };
    } finally {
      // ADMIN-007: Clear FormData on failure to prevent memory leak
      clearTimeout(timeoutId);
      // FormData will be garbage collected when reference is lost
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
