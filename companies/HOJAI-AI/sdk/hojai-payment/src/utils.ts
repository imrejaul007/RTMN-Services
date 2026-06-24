/**
 * Internal utilities for HOJAI Payment SDK (shared pattern across @hojai/*)
 *
 * Provides:
 *  - sleep(ms)             — sleep helper
 *  - buildUrl(...)         — build a URL with query params
 *  - backoff(attempt, ...) — exponential backoff
 *  - HttpError             — tagged HTTP error (non-retryable)
 *  - request(...)          — HTTP with retries (5xx only) + timeout
 */

import type { HojaiConfig } from './foundation-config.js';

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a URL with query parameters
 */
export function buildUrl(base: string, path: string, params?: Record<string, unknown>): string {
  const url = new URL(path, base);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(key, String(v));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }
  }
  return url.toString();
}

/**
 * Sleep with exponential backoff
 */
export function backoff(attempt: number, base: number = 300): number {
  return Math.min(base * Math.pow(2, attempt), 30000);
}

/**
 * Tagged HTTP error — non-retryable.
 * Thrown when the server returns 4xx (or 5xx after retries are exhausted).
 */
export class HttpError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Make an HTTP request with retries (5xx only) and timeout.
 */
export async function request<T = unknown>(
  config: HojaiConfig,
  method: string,
  path: string,
  body?: unknown,
  options: { timeout?: number; maxRetries?: number; headers?: Record<string, string> } = {}
): Promise<T> {
  const fetchImpl = config.fetchImpl || globalThis.fetch;
  const timeout = options.timeout ?? config.timeout ?? 10000;
  const maxRetries = options.maxRetries ?? config.maxRetries ?? 3;
  const url = new URL(path, config.baseUrl).toString();

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        ...options.headers
      };
      const res = await fetchImpl(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) {
        const text = await res.text();
        if (res.status >= 500 && attempt < maxRetries) {
          await sleep(backoff(attempt));
          continue;
        }
        throw new HttpError(res.status, text);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return (await res.json()) as T;
      }
      return (await res.text()) as unknown as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof HttpError) {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(backoff(attempt));
        continue;
      }
    }
  }
  throw lastError || new Error('Request failed');
}
