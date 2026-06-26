/**
 * PolicyOS — Event Bus Service
 *
 * Provides a stub EventBus for PolicyOS. The @rtmn/shared package does not yet
 * export lib/eventbus, so this module implements a compatible stub that:
 *   - Logs events to console in dev/test mode
 *   - Can be stubbed for unit testing via _setBusForTesting / _getBusForTesting
 *   - Matches the expected EventBus interface (publish, subscribe, connect, quit)
 *
 * Envelope format (matches @rtmn/shared EventBus):
 *   bus.publish(type, payload, { tenantId, service })
 *   → stored as { type, payload, opts: { tenantId, service } }
 *
 * TODO: When @rtmn/shared adds lib/eventbus export, replace StubEventBus
 * with: import { EventBus } from '@rtmn/shared/lib/eventbus';
 */

const SERVICE_NAME = process.env.SERVICE_NAME || 'policy-os';

/**
 * Stub EventBus matching the @rtmn/shared EventBus interface.
 * Used for testing and as fallback until Redis EventBus is available.
 */
class StubEventBus {
  constructor(opts = {}) {
    this.serviceName = opts.serviceName || SERVICE_NAME;
    this.calls = [];
  }

  /** Matches @rtmn/shared publish(type, payload, opts) signature */
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

let _bus = null;

export function getBus() {
  if (_bus === null) {
    _bus = new StubEventBus({ serviceName: SERVICE_NAME });
  }
  return _bus;
}

export function _setBusForTesting(bus) {
  _bus = bus;
}

export function _getBusForTesting() {
  return _bus;
}

/**
 * Publish a domain event to the EventBus.
 *
 * @param {object} req     - Express request (used to extract tenantId)
 * @param {string} type    - Event type, e.g. 'policy.created'
 * @param {object} payload - Event payload (the actual event data)
 * @param {object} [opts]  - Options (tenantId extracted from req if absent)
 */
export async function emit(req, type, payload = {}, opts = {}) {
  const bus = getBus();

  // Resolve tenantId: explicit opts > req.tenant.companyId > null
  const tenantId = opts.tenantId ?? (req && req.tenant && req.tenant.companyId) ?? null;
  const service = opts.service || SERVICE_NAME;

  await bus.publish(type, payload, { tenantId, service });
}

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
