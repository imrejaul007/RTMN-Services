/**
 * SADA OS — Event Bus helper (ADR-0009 Phase 2).
 */

import { EventBus } from '@rtmn/shared/event-bus';
import type { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    tenant?: { companyId?: string | null; source?: string } | null;
  }
}

let _bus: EventBus | null = null;

function getBus(): EventBus {
  if (_bus) return _bus;
  _bus = new EventBus({
    serviceName: process.env.SERVICE_NAME || 'sada-os',
  });
  _bus.connect().catch((err) => {
    // eslint-disable-next-line no-console
    console.warn(`[sada-os events] connect failed: ${err.message}`);
  });
  return _bus;
}

export function emit(
  req: Request | null | undefined,
  type: string,
  payload: Record<string, unknown> = {}
): void {
  const tenantId = (req && req.tenant && req.tenant.companyId) || null;
  getBus().publishAsync(type, payload, { tenantId });
}

export async function shutdown(): Promise<void> {
  if (_bus) {
    try { await _bus.quit(); } catch (_) { /* ignore */ }
    _bus = null;
  }
}