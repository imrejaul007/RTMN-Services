// Shared retry policy — cross-app consolidation (see arch-fitness rules).
//
// retry429 wraps a fetch-producing callback and transparently retries on HTTP
// 429 Too Many Requests. It honours the Retry-After response header when
// present, and otherwise applies capped exponential backoff with crypto-based
// jitter. Jitter uses crypto.getRandomValues (not Math.random) to stay within
// the "no Math.random() for IDs" arch-fitness rule — jitter isn't strictly an
// ID, but we keep the pattern consistent and avoid introducing Math.random
// anywhere near request flows.

export interface RetryOptions {
  /** Max retries AFTER the first attempt (default 3 — total up to 4 fetches). */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default 1000). */
  baseDelayMs?: number;
  /** Upper bound for backoff + jitter delay (default 30000). */
  maxDelayMs?: number;
}

/** Defaults exposed so non-fetch callers can apply the same cap without hard-coding. */
export const RETRY_429_DEFAULT_MAX_RETRIES = 3;
export const RETRY_429_DEFAULT_BASE_DELAY_MS = 1000;
export const RETRY_429_DEFAULT_MAX_DELAY_MS = 30000;

/**
 * Compute the delay for a single 429 retry attempt. Honours Retry-After when
 * provided, otherwise applies capped exponential backoff plus crypto jitter.
 */
export function computeRetry429DelayMs(
  attempt: number,
  retryAfterHeader: string | null | undefined,
  opts: RetryOptions = {},
): number {
  const {
    baseDelayMs = RETRY_429_DEFAULT_BASE_DELAY_MS,
    maxDelayMs = RETRY_429_DEFAULT_MAX_DELAY_MS,
  } = opts;
  const retryAfter = parseInt(retryAfterHeader ?? '', 10);
  const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
  const base =
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff;
  return base + cryptoJitterMs(250);
}

/**
 * Generate crypto-backed jitter in ms, up to `cap` (default 250ms).
 * Falls back to 0 jitter if crypto.getRandomValues is unavailable — callers
 * must never use Math.random() here per arch-fitness rule 5.
 */
function cryptoJitterMs(cap: number = 250): number {
  try {
    const g = (globalThis as unknown as { crypto?: Crypto }).crypto;
    if (g && typeof g.getRandomValues === 'function') {
      const buf = new Uint32Array(1);
      g.getRandomValues(buf);
      const first = buf[0] ?? 0;
      return (first / 0xffffffff) * cap;
    }
  } catch {
    // crypto unavailable — fall through to deterministic zero jitter
  }
  return 0;
}

/**
 * Invoke `fn` and transparently retry on HTTP 429 responses.
 *
 * The callback receives the current attempt number (0 for the first call,
 * 1..maxRetries for subsequent retries) so it can regenerate AbortControllers,
 * refresh headers, or tag telemetry. Non-429 responses (including 5xx and
 * network-level failures thrown as exceptions) are returned/raised unchanged.
 */
export async function retry429(
  fn: (attempt: number) => Promise<Response>,
  opts: RetryOptions = {},
): Promise<Response> {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000 } = opts;
  let response: Response = await fn(0);
  let attempt = 0;
  while (response.status === 429 && attempt < maxRetries) {
    const retryAfterHeader = response.headers.get('retry-after') ?? '';
    const retryAfter = parseInt(retryAfterHeader, 10);
    const backoff = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
    const delay =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff;
    const jitter = cryptoJitterMs(250);
    await new Promise<void>((resolve) => setTimeout(resolve, delay + jitter));
    attempt += 1;
    response = await fn(attempt);
  }
  return response;
}
