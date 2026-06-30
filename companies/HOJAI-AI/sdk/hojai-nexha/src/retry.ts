/**
 * HOJAI Nexha SDK — Retry with Exponential Backoff + Decorrelated Jitter
 */
import { NexhaError, isRetryable } from "./errors.js";

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  factor?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void;
  signal?: AbortSignal;
}

/**
 * Decorrelated Jitter: delay = min(maxDelay, random(baseDelay, baseDelay * 3 * attempt)
 * This is the AWS-recommended algorithm for distributed system retries.
 */
export function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  useJitter: boolean
): number {
  if (attempt <= 0) return baseDelayMs;
  let delay: number;
  if (useJitter) {
    const lo = baseDelayMs;
    const hi = baseDelayMs * 3 * attempt;
    delay = Math.floor(Math.random() * (hi - lo + 1)) + lo;
  } else {
    delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
  }
  return Math.min(delay, maxDelayMs);
}

/** Sleep utility */
function snooze(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 200,
    maxDelayMs = 5000,
    jitter = true,
    onRetry,
    signal,
  } = opts;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    if (signal?.aborted) throw new NexhaError("Request aborted", "ABORT_ERROR");
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries) break;
      if (!isRetryable(err)) throw err;
      const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter);
      onRetry?.(attempt, err, delayMs);
      await snooze(delayMs);
    }
  }
  throw lastError;
}

export function retryConfig(retries?: number): RetryOptions | undefined {
  if (!retries || retries <= 0) return undefined;
  return { maxRetries: retries, baseDelayMs: 200, maxDelayMs: 5000, jitter: true };
}
