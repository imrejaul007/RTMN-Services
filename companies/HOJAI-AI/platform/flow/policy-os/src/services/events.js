/**
 * PolicyOS — Event Bus Service
 *
 * Phase 0.3: Replaced stub EventBus with the real @rtmn/shared EventBus
 * (Redis Streams pub/sub). The shared EventBus provides:
 *   - Persistent event streams (Redis Streams with MAXLEN ~ 10,000)
 *   - Pattern-based subscriptions (psubscribe on 'policy.*', 'approval.*', etc.)
 *   - Automatic reconnection on Redis failure
 *   - Offline fallback when REDIS_URL is unset (publish logs warning, resolves)
 *
 * This module wraps the shared EventBus to:
 *   1. Match PolicyOS's existing emit(req, type, payload, opts) signature
 *   2. Inject serviceName from SERVICE_NAME env
 *   3. Provide test helpers for unit test isolation
 *
 * Envelope written to Redis Stream:
 *   {
 *     eventId:      '<uuidv4>',
 *     type:         'policy.evaluated',
 *     source:       'policy-os',
 *     schemaVersion:'1.0',
 *     emittedAt:    '2026-06-27T12:00:00.000Z',
 *     tenantId:     't-1' | null,
 *     payload:      { ... },
 *     headers:      { ... }
 *   }
 */

import { EventBus } from '@rtmn/shared/event-bus';

const SERVICE_NAME = process.env.SERVICE_NAME || 'policy-os';

let _bus = null;
let _useStub = false;

/**
 * Lazily create the shared EventBus. Called on first emit or connect.
 * @param {object} [opts]
 * @param {string} [opts.url] - Redis URL. Defaults to REDIS_URL env var.
 * @param {boolean} [opts.forceStub] - Force stub mode (for tests without Redis).
 */
function createBus(opts = {}) {
  if (_useStub || opts.forceStub) {
    return new StubEventBus({ serviceName: SERVICE_NAME });
  }
  return new EventBus({
    serviceName: SERVICE_NAME,
    url: opts.url || process.env.REDIS_URL,
    // Use 'policy-os' as the stream prefix so all policy events share one stream
    // across the RTMN ecosystem
    streamPrefix: 'policy-os:',
    maxLen: 10000,
    schemaVersion: '1.0',
  });
}

export function getBus() {
  if (_bus === null) {
    _bus = createBus();
  }
  return _bus;
}

/**
 * Stub EventBus matching the EventBus interface.
 * Used when Redis is unavailable or in test mode without a Redis instance.
 */
class StubEventBus {
  constructor(opts = {}) {
    this.serviceName = opts.serviceName || SERVICE_NAME;
    this.calls = [];
  }

  async publish(type, payload, opts = {}) {
    this.calls.push({ type, payload, opts });
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[eventbus:${this.serviceName}] ${type}`, JSON.stringify(payload).slice(0, 200));
    }
  }

  async publishAsync(type, payload, opts) {
    return this.publish(type, payload, opts);
  }

  async subscribe() {
    return {};
  }

  async connect() {}

  async quit() {}
}

// =================================================================
// Public API
// =================================================================

/**
 * Publish a domain event to the EventBus.
 *
 * @param {object} [req]     - Express request (used to extract tenantId)
 * @param {string} type      - Event type, e.g. 'policy.evaluated', 'approval.created'
 * @param {object} [payload] - Event payload (the actual event data)
 * @param {object} [opts]    - Options (tenantId extracted from req if absent)
 */
export async function emit(req, type, payload = {}, opts = {}) {
  const bus = getBus();

  // Resolve tenantId: explicit opts > req.tenant.companyId > null
  const tenantId = opts.tenantId ?? (req && req.tenant && req.tenant.companyId) ?? null;
  const service = opts.service || SERVICE_NAME;

  // The shared EventBus handles envelope construction internally
  // (eventId, source, schemaVersion, emittedAt, etc.)
  await bus.publishAsync(type, payload, { tenantId, service });
}

/**
 * Connect to the EventBus (opens Redis connection if using real bus).
 * Call this at server startup if you need subscription readiness.
 */
export async function connect() {
  const bus = getBus();
  if (typeof bus.connect === 'function') {
    await bus.connect();
  }
}

/**
 * Subscribe to policy OS domain events.
 *
 * @param {string[]} patterns - Event patterns, e.g. ['policy.*', 'approval.*']
 * @param {Function} handler  - Async handler called for each matching event
 */
export async function subscribe(patterns, handler) {
  const bus = getBus();
  return bus.subscribe(patterns, handler);
}

/**
 * Gracefully shut down the EventBus (close Redis connection).
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

// =================================================================
// Test helpers — replace bus with a test double for unit testing
// =================================================================

/**
 * Replace the singleton bus with a test double.
 * Call in beforeEach to ensure test isolation.
 * @param {object} bus
 */
export function _setBusForTesting(bus) {
  _bus = bus;
}

/**
 * Return the current bus instance (null if not yet created).
 * @returns {object|null}
 */
export function _getBusForTesting() {
  return _bus;
}

/**
 * Force stub mode (no Redis connection). Call before any emit in tests.
 */
export function _useStubMode() {
  _useStub = true;
  _bus = null;
}

/**
 * Reset stub mode and clear the bus. Call in afterEach.
 */
export function _resetBusMode() {
  _useStub = false;
  _bus = null;
}

export default { emit, getBus, connect, subscribe, shutdown };