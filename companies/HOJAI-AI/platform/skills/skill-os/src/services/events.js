/**
 * Skill OS — Event Bus helper (ADR-0009 Phase 2).
 */

import { EventBus } from '@rtmn/shared/event-bus';

let _bus = null;

export function getBus() {
  if (_bus) return _bus;
  _bus = new EventBus({
    serviceName: process.env.SERVICE_NAME || 'skill-os',
  });
  _bus.connect().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn(`[skill-os events] connect failed: ${err.message}`);
  });
  return _bus;
}

export function emit(req, type, payload = {}) {
  const tenantId = (req && req.tenant && req.tenant.companyId) || null;
  getBus().publishAsync(type, payload, { tenantId });
}

export async function shutdown() {
  if (_bus) {
    try { await _bus.quit(); } catch (_) { /* ignore */ }
    _bus = null;
  }
}

export function _setBusForTesting(bus) { _bus = bus; }
export function _getBusForTesting() { return _bus; }