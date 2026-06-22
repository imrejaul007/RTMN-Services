/**
 * REZ Atlas Gateway Service
 *
 * Reusable proxy service for communicating with Atlas microservices.
 * Handles HTTP requests to Atlas services with circuit breaker pattern,
 * timeout handling, and graceful error handling.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Default timeout for Atlas service calls (10 seconds)
const DEFAULT_TIMEOUT = 10000;

// Circuit breaker state
const circuitBreakers = new Map();

/**
 * Circuit breaker states
 */
const CIRCUIT_STATES = {
  CLOSED: 'closed',    // Normal operation
  OPEN: 'open',        // Failing, reject requests
  HALF_OPEN: 'half_open'  // Testing recovery
};

/**
 * Circuit breaker configuration per service
 */
const CB_CONFIG = {
  failureThreshold: 5,      // Open after 5 consecutive failures
  resetTimeout: 30000,     // Try again after 30 seconds
  halfOpenSuccessThreshold: 2  // Close after 2 successes in half-open
};

/**
 * Get or initialize circuit breaker for a service
 */
function getCircuitBreaker(serviceName) {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      state: CIRCUIT_STATES.CLOSED,
      failures: 0,
      successes: 0,
      lastFailure: null,
      nextAttempt: null
    });
  }
  return circuitBreakers.get(serviceName);
}

/**
 * Check if circuit breaker allows requests
 */
function canMakeRequest(serviceName) {
  const cb = getCircuitBreaker(serviceName);

  if (cb.state === CIRCUIT_STATES.CLOSED) {
    return { allowed: true, reason: null };
  }

  if (cb.state === CIRCUIT_STATES.OPEN) {
    // Check if we should transition to half-open
    if (Date.now() >= cb.nextAttempt) {
      cb.state = CIRCUIT_STATES.HALF_OPEN;
      cb.successes = 0;
      return { allowed: true, reason: 'testing_recovery' };
    }
    return {
      allowed: false,
      reason: 'circuit_open',
      nextAttempt: cb.nextAttempt
    };
  }

  // HALF_OPEN - allow requests
  return { allowed: true, reason: null };
}

/**
 * Record a successful request
 */
function recordSuccess(serviceName) {
  const cb = getCircuitBreaker(serviceName);
  cb.failures = 0;

  if (cb.state === CIRCUIT_STATES.HALF_OPEN) {
    cb.successes++;
    if (cb.successes >= CB_CONFIG.halfOpenSuccessThreshold) {
      cb.state = CIRCUIT_STATES.CLOSED;
      cb.successes = 0;
    }
  }
}

/**
 * Record a failed request
 */
function recordFailure(serviceName) {
  const cb = getCircuitBreaker(serviceName);
  cb.failures++;
  cb.lastFailure = Date.now();

  if (cb.state === CIRCUIT_STATES.HALF_OPEN) {
    // Immediate open on failure during half-open
    cb.state = CIRCUIT_STATES.OPEN;
    cb.nextAttempt = Date.now() + CB_CONFIG.resetTimeout;
    cb.successes = 0;
  } else if (cb.failures >= CB_CONFIG.failureThreshold) {
    cb.state = CIRCUIT_STATES.OPEN;
    cb.nextAttempt = Date.now() + CB_CONFIG.resetTimeout;
  }
}

/**
 * Make a GET request to an Atlas service
 */
export async function atlasGet(serviceName, baseUrl, endpoint, params = {}, options = {}) {
  const { allowed, reason, nextAttempt } = canMakeRequest(serviceName);

  if (!allowed) {
    return {
      success: false,
      error: 'Service temporarily unavailable',
      reason: reason,
      service: serviceName,
      nextRetry: nextAttempt ? new Date(nextAttempt).toISOString() : null
    };
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const url = `${baseUrl}${endpoint}`;
  const requestId = uuidv4();

  try {
    const response = await axios.get(url, {
      params,
      timeout,
      headers: {
        'X-Request-ID': requestId,
        'X-Source-Service': 'salesmind'
      }
    });

    recordSuccess(serviceName);

    return {
      success: true,
      data: response.data,
      requestId,
      service: serviceName
    };
  } catch (error) {
    recordFailure(serviceName);

    return {
      success: false,
      error: error.message || 'Request failed',
      status: error.response?.status,
      service: serviceName,
      requestId
    };
  }
}

/**
 * Make a POST request to an Atlas service
 */
export async function atlasPost(serviceName, baseUrl, endpoint, data = {}, options = {}) {
  const { allowed, reason, nextAttempt } = canMakeRequest(serviceName);

  if (!allowed) {
    return {
      success: false,
      error: 'Service temporarily unavailable',
      reason: reason,
      service: serviceName,
      nextRetry: nextAttempt ? new Date(nextAttempt).toISOString() : null
    };
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const url = `${baseUrl}${endpoint}`;
  const requestId = uuidv4();

  try {
    const response = await axios.post(url, data, {
      timeout,
      headers: {
        'X-Request-ID': requestId,
        'X-Source-Service': 'salesmind',
        'Content-Type': 'application/json'
      }
    });

    recordSuccess(serviceName);

    return {
      success: true,
      data: response.data,
      requestId,
      service: serviceName
    };
  } catch (error) {
    recordFailure(serviceName);

    return {
      success: false,
      error: error.message || 'Request failed',
      status: error.response?.status,
      service: serviceName,
      requestId
    };
  }
}

/**
 * Make a PATCH request to an Atlas service
 */
export async function atlasPatch(serviceName, baseUrl, endpoint, data = {}, options = {}) {
  const { allowed, reason, nextAttempt } = canMakeRequest(serviceName);

  if (!allowed) {
    return {
      success: false,
      error: 'Service temporarily unavailable',
      reason: reason,
      service: serviceName,
      nextRetry: nextAttempt ? new Date(nextAttempt).toISOString() : null
    };
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const url = `${baseUrl}${endpoint}`;
  const requestId = uuidv4();

  try {
    const response = await axios.patch(url, data, {
      timeout,
      headers: {
        'X-Request-ID': requestId,
        'X-Source-Service': 'salesmind',
        'Content-Type': 'application/json'
      }
    });

    recordSuccess(serviceName);

    return {
      success: true,
      data: response.data,
      requestId,
      service: serviceName
    };
  } catch (error) {
    recordFailure(serviceName);

    return {
      success: false,
      error: error.message || 'Request failed',
      status: error.response?.status,
      service: serviceName,
      requestId
    };
  }
}

/**
 * Make a DELETE request to an Atlas service
 */
export async function atlasDelete(serviceName, baseUrl, endpoint, options = {}) {
  const { allowed, reason, nextAttempt } = canMakeRequest(serviceName);

  if (!allowed) {
    return {
      success: false,
      error: 'Service temporarily unavailable',
      reason: reason,
      service: serviceName,
      nextRetry: nextAttempt ? new Date(nextAttempt).toISOString() : null
    };
  }

  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const url = `${baseUrl}${endpoint}`;
  const requestId = uuidv4();

  try {
    const response = await axios.delete(url, {
      timeout,
      headers: {
        'X-Request-ID': requestId,
        'X-Source-Service': 'salesmind'
      }
    });

    recordSuccess(serviceName);

    return {
      success: true,
      data: response.data,
      requestId,
      service: serviceName
    };
  } catch (error) {
    recordFailure(serviceName);

    return {
      success: false,
      error: error.message || 'Request failed',
      status: error.response?.status,
      service: serviceName,
      requestId
    };
  }
}

/**
 * Health check for a single Atlas service
 */
export async function checkAtlasHealth(serviceName, baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/health`, {
      timeout: 3000
    });

    recordSuccess(serviceName);

    return {
      service: serviceName,
      status: 'up',
      data: response.data
    };
  } catch (error) {
    recordFailure(serviceName);

    return {
      service: serviceName,
      status: 'down',
      error: error.message
    };
  }
}

/**
 * Check health of all Atlas services
 */
export async function checkAllAtlasHealth(services) {
  const checks = await Promise.allSettled(
    services.map(s => checkAtlasHealth(s.name, s.url))
  );

  return services.map((s, i) => ({
    name: s.name,
    url: s.url,
    ...(checks[i].status === 'fulfilled' ? checks[i].value : { status: 'error', error: checks[i].reason })
  }));
}

/**
 * Get circuit breaker status for all services
 */
export function getCircuitBreakerStatus() {
  const status = {};
  for (const [name, cb] of circuitBreakers) {
    status[name] = {
      state: cb.state,
      failures: cb.failures,
      successes: cb.successes,
      lastFailure: cb.lastFailure ? new Date(cb.lastFailure).toISOString() : null,
      nextAttempt: cb.nextAttempt ? new Date(cb.nextAttempt).toISOString() : null
    };
  }
  return status;
}

/**
 * Reset circuit breaker for a service
 */
export function resetCircuitBreaker(serviceName) {
  if (circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      state: CIRCUIT_STATES.CLOSED,
      failures: 0,
      successes: 0,
      lastFailure: null,
      nextAttempt: null
    });
    return { success: true, message: `Circuit breaker for ${serviceName} has been reset` };
  }
  return { success: false, message: `No circuit breaker found for ${serviceName}` };
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers() {
  circuitBreakers.clear();
  return { success: true, message: 'All circuit breakers have been reset' };
}

export default {
  atlasGet,
  atlasPost,
  atlasPatch,
  atlasDelete,
  checkAtlasHealth,
  checkAllAtlasHealth,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  resetAllCircuitBreakers
};
