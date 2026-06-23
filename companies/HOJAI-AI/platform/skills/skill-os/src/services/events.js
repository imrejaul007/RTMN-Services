/**
 * Skill OS — Event Bus helper (ADR-0009 Phase 2).
 *
 * Singleton wrapper around @rtmn/shared/event-bus with skill-os-specific
 * defaults and tenant-aware publish helper.
 *
 * Emitted event topics (consumed by TwinOS bridge, agent-orchestration,
 * AI intelligence, billing, audit):
 *
 *   skill.registered              → new skill created
 *   skill.invoked                 → successful execution
 *   skill.failed                  → execution errored
 *   skill.version_published       → new version of existing skill
 *   skill.unregistered            → skill deleted
 *   skill.recommendation_requested → discovery search
 *   asset.installed               → asset installed into a tenant
 *   asset.uninstalled             → asset removed from a tenant
 *   asset.deprecated              → asset marked deprecated
 *   asset.certified               → asset certification level changed
 *   billing.transaction           → billing event recorded
 *   audit.event                   → governance event recorded
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
