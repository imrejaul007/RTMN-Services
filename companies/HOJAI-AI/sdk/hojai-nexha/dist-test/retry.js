/**
 * HOJAI Nexha SDK — Retry with Exponential Backoff + Decorrelated Jitter
 */
import { NexhaError, isRetryable } from "./errors.js";
/**
 * Decorrelated Jitter: delay = min(maxDelay, random(baseDelay, baseDelay * 3 * attempt)
 * This is the AWS-recommended algorithm for distributed system retries.
 */
export function calculateDelay(attempt, baseDelayMs, maxDelayMs, useJitter) {
    if (attempt <= 0)
        return baseDelayMs;
    let delay;
    if (useJitter) {
        const lo = baseDelayMs;
        const hi = baseDelayMs * 3 * attempt;
        delay = Math.floor(Math.random() * (hi - lo + 1)) + lo;
    }
    else {
        delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
    }
    return Math.min(delay, maxDelayMs);
}
/** Sleep utility */
function snooze(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function withRetry(fn, opts = {}) {
    const { maxRetries = 3, baseDelayMs = 200, maxDelayMs = 5000, jitter = true, onRetry, signal, } = opts;
    let lastError;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        if (signal?.aborted)
            throw new NexhaError("Request aborted", "ABORT_ERROR");
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            if (attempt > maxRetries)
                break;
            if (!isRetryable(err))
                throw err;
            const delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter);
            onRetry?.(attempt, err, delayMs);
            await snooze(delayMs);
        }
    }
    throw lastError;
}
export function retryConfig(retries) {
    if (!retries || retries <= 0)
        return undefined;
    return { maxRetries: retries, baseDelayMs: 200, maxDelayMs: 5000, jitter: true };
}
//# sourceMappingURL=retry.js.map