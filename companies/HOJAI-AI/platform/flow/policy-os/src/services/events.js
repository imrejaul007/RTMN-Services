/**
 * PolicyOS — Event Bus Service
 *
 * Thin wrapper around RTMN's shared EventBus (Redis pub/sub via @rtmn/shared).
 * Exposes a singleton EventBus that:
 *   - Publishes domain events (policy.created, policy.evaluated, etc.)
 *   - Extracts tenantId from req.tenant.companyId
 *   - Can be stubbed for testing via _setBusForTesting / _getBusForTesting
 *
 * The actual Redis EventBus lives in @rtmn/shared. This module:
 *   1. Provides a lazy singleton accessor (getBus)
 *   2. Wraps publish() with an envelope (type, payload, tenantId, service)
 *   3. Exports test-shim helpers (_setBusForTesting, _getBusForTesting)
 *
 * Used by: auditLog() in index.js (via async setImmediate hooks).
 */

import { EventBus } from '@rtmn/shared/lib/eventbus/index.js';

const SERVICE_NAME = process.env.SERVICE_NAME || 'policy-os';

/**
 * The singleton bus instance (null until first use).
 * @type {EventBus | object | null}
 */
let _bus = null;

/**
 * Returns the EventBus singleton. Creates it lazily on first call.
 * @returns {EventBus | object}
 */
export function getBus() {
  if (_bus === null) {
    _bus = new EventBus({ serviceName: SERVICE_NAME });
  }
  return _bus;
}

/**
 * Stub the bus for unit testing.
 * @param {object|null} bus
 */
export function _setBusForTesting(bus) {
  _bus = bus;
}

/**
 * Returns the stubbed bus (or null if not stubbed).
 * @returns {object|null}
 */
export function _getBusForTesting() {
  return _bus;
}

/**
 * Publish a domain event to the EventBus.
 *
 * @param {object} req        - Express request (used to extract tenantId)
 * @param {string} type       - Event type, e.g. 'policy.created', 'policy.evaluated'
 * @param {object} payload    - Event payload
 * @param {object} [opts]     - Additional options
 * @param {string} [opts.tenantId] - Override tenantId (extracted from req.tenant.companyId if absent)
 */
export async function emit(req, type, payload = {}, opts = {}) {
  const bus = getBus();

  // Extract tenantId from request (fall back to opts.tenantId or null)
  let tenantId = opts.tenantId ?? null;
  if (tenantId === null && req && req.tenant && req.tenant.companyId) {
    tenantId = req.tenant.companyId;
  }

  const envelope = {
    service: SERVICE_NAME,
    tenantId,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  try {
    await bus.publish(type, envelope);
  } catch (err) {
    // EventBus failures must not crash the HTTP request.
    // Log and continue.
    console.error(`[policy-os] event emit failed: ${type}`, err.message);
  }
}

/**
 * Gracefully shut down the EventBus (close Redis connection, etc.).
 * Called by the graceful shutdown handler in index.js.
 */
export async function shutdown() {
  try {
    const bus = _bus;
    if (bus && typeof bus.quit === 'function') {
      await bus.quit();
    }
  } catch (err) {
    console.error('[policy-os] EventBus shutdown error:', err.message);
  } finally {
    _bus = null;
  }
}

export default { emit, getBus, shutdown };
