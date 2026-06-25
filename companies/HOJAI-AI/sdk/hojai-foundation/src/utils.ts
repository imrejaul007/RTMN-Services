/**
 * Internal utilities for HOJAI Foundation SDK
 */

import type { HojaiConfig } from './config.js';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class HojaiApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'HojaiApiError';
  }
}

export class HojaiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HojaiAuthError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a full URL from a base and path */
export function buildUrl(base: string, path: string): string {
  return new URL(path, base).toString();
}

/** Exponential backoff with 30s cap */
export function backoff(attempt: number, base = 300): number {
  return Math.min(base * Math.pow(2, attempt), 30_000);
}

/** Sleep utility */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Core HTTP client
//
// All module clients call this. It:
//   - Appends the Bearer token from authState if set
//   - Handles { success: true/false } envelopes from RTMN backends
//   - Retries on 5xx
//   - Throws HojaiApiError or HojaiAuthError
// ---------------------------------------------------------------------------

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
}

/** Merged config type — what all clients pass to request() */
export type HojaiClientConfig = HojaiConfig & { authState: AuthState };

export interface RequestOptions {
  headers?: Record<string, string>;
  /** Override the global timeout for this call */
  timeout?: number;
}

export async function request<T = unknown>(
  config: HojaiConfig & { authState: AuthState },
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? globalThis.fetch;
  const timeout = options.timeout ?? config.timeout ?? 10_000;
  const maxRetries = config.maxRetries ?? 3;
  const url = buildUrl(config.baseUrl ?? 'http://localhost:4399', path);
  const log = config.logger ?? (() => {});

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  if (config.authState.accessToken) {
    headers['Authorization'] = `Bearer ${config.authState.accessToken}`;
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      log('debug', `${method} ${url}`, { attempt, body });
      const res = await fetchImpl(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timer);

      // 401 → auth error (caller should call login() / refresh)
      if (res.status === 401) {
        throw new HojaiAuthError(`Authentication required (401). Call hojai.login() first.`);
      }

      // 5xx → retry
      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();

        // RTMN error envelope: { success: false, error: { code, message } }
        if (json && typeof json === 'object' && !json.success && (json as any).error) {
          const err = (json as any).error;
          throw new HojaiApiError(
            err.code ?? 'UNKNOWN_ERROR',
            err.message ?? `HTTP ${res.status}`,
            res.status
          );
        }

        // Unwrap data/twin/policy wrappers when present
        if (json && typeof json === 'object') {
          if ('data' in json) return json.data as T;
          if ('twin' in json) return json.twin as T;
          if ('user' in json) return json.user as T;
        }

        return json as T;
      }

      return (await res.text()) as unknown as T;

    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HojaiApiError || err instanceof HojaiAuthError) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error('Request failed after retries');
}
