/**
 * SUTAR Negotiation Engine — Event Bus helper (ADR-0009 Phase 2).
 *
 * CommonJS variant — negotiation-engine does not declare "type": "module"
 * so we use require() and forward to the ESM EventBus via the .cjs facade.
 */

'use strict';

const { EventBus } = require('@rtmn/shared/event-bus');

let _bus = null;

function getBus() {
  if (_bus) return _bus;
  _bus = new EventBus({
    serviceName: process.env.SERVICE_NAME || 'sutar-negotiation-engine',
  });
  if (typeof _bus.connect === 'function') {
    _bus.connect().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(`[sutar-negotiation events] connect failed: ${err.message}`);
    });
  }
  return _bus;
}

function emit(req, type, payload) {
  payload = payload || {};
  const tenantId = (req && req.tenant && req.tenant.companyId) || null;
  const bus = getBus();
  if (typeof bus.publishAsync === 'function') {
    bus.publishAsync(type, payload, { tenantId });
  } else if (typeof bus.publish === 'function') {
    try {
      bus.publish(type, payload, { tenantId });
    } catch (_) { /* swallow */ }
  }
}

async function shutdown() {
  if (_bus) {
    try {
      if (typeof _bus.quit === 'function') await _bus.quit();
    } catch (_) { /* ignore */ }
    _bus = null;
  }
}

module.exports = { emit, shutdown };