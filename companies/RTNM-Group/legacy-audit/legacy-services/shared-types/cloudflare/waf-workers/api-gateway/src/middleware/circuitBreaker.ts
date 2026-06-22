/**
 * Circuit Breaker — Fail fast when upstream services are degraded
 * Prevents cascading failures by failing closed when error rates spike
 */

import type { Middleware } from 'itty-router';

// In-memory circuit breaker state (per instance)
// In production, use Redis for distributed state
const circuitState: Record<string, { failures: number; lastFailure: number; isOpen: boolean }> = {
  auth: { failures: 0, lastFailure: 0, isOpen: false },
  merchant: { failures: 0, lastFailure: 0, isOpen: false },
  wallet: { failures: 0, lastFailure: 0, isOpen: false },
  default: { failures: 0, lastFailure: 0, isOpen: false },
};

const FAILURE_THRESHOLD = 5; // Open circuit after 5 consecutive failures
const RECOVERY_TIMEOUT_MS = 30 * 1000; // Try again after 30 seconds
const HALF_OPEN_MAX_REQUESTS = 3; // Allow 3 requests in half-open state

const circuitCounters: Record<string, number> = { auth: 0, merchant: 0, wallet: 0, default: 0 };

function isCircuitOpen(name: string): boolean {
  const state = circuitState[name];
  if (!state) return false;

  if (state.isOpen) {
    // Check if recovery timeout has passed
    if (Date.now() - state.lastFailure > RECOVERY_TIMEOUT_MS) {
      // Transition to half-open
      state.isOpen = false;
      state.failures = 0;
      circuitCounters[name] = 0;
      console.info('[CircuitBreaker] Circuit transitioning to half-open:', { service: name });
    }
    return true;
  }
  return false;
}

export function withCircuitBreaker(service: string): Middleware {
  return async (_request: Request, env: Env, ctx: ExecutionContext): Promise<Response | undefined> => {
    const state = circuitState[service] || circuitState.default;

    // Check if circuit is open (fast fail)
    if (state.isOpen && Date.now() - state.lastFailure < RECOVERY_TIMEOUT_MS) {
      console.warn('[CircuitBreaker] Circuit open, failing fast:', { service });
      return new Response(JSON.stringify({
        error: 'Service Temporarily Unavailable',
        message: 'The upstream service is temporarily unavailable. Please try again later.',
        code: 'CIRCUIT_OPEN',
        retryAfter: Math.ceil(RECOVERY_TIMEOUT_MS / 1000),
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(RECOVERY_TIMEOUT_MS / 1000)),
          'Cache-Control': 'no-store',
        },
      });
    }

    return undefined;
  };
}

/**
 * Call this when an upstream request succeeds
 */
export function circuitSuccess(service: string): void {
  const state = circuitState[service] || circuitState.default;
  state.failures = 0;
  state.isOpen = false;
}

/**
 * Call this when an upstream request fails
 */
export function circuitFailure(service: string): void {
  const state = circuitState[service] || circuitState.default;
  state.failures++;
  state.lastFailure = Date.now();

  if (state.failures >= FAILURE_THRESHOLD) {
    state.isOpen = true;
    console.error('[CircuitBreaker] Circuit OPENED:', { service, failures: state.failures });
  }
}
