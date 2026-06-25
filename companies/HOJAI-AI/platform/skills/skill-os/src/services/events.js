/**
 * Skill OS Event Bus — wraps @rtmn/shared/event-bus with skill-specific helpers.
 *
 * Provides:
 *   emit(httpreq, eventType, payload) — logs + publishes to Redis stream
 *   getBus()                        — raw Redis pub/sub client (read-only)
 *   shutdown()                      — disconnect gracefully
 *
 * Falls back to a no-op when Redis is unreachable.
 */
import { publishAsync, subscribe, unsubscribe, getClient } from '@rtmn/shared/event-bus/index.js';

const SERVICE_NAME = 'skill-os';

/**
 * Emit an event.  Incoming `req` is used only for tenantId extraction.
 * @param {import('express').Request|object|null} req
 * @param {string} eventType   e.g. 'skill.registered'
 * @param {object} payload
 */
export function emit(req, eventType, payload = {}) {
  const tenantId = req?.tenantId ?? req?.params?.tenantId ?? null;
  publishAsync(`${SERVICE_NAME}.${eventType}`, payload, {
    source: SERVICE_NAME,
    tenantId,
  }).catch((err) => {
    console.warn(`[events] publish failed: ${eventType}`, err?.message);
  });
}

/** Returns the underlying Redis client for advanced use. */
export function getBus() {
  return getClient();
}

/** Gracefully shut down Redis connections. */
export async function shutdown() {
  try {
    await unsubscribe();
  } catch (_) {
    // ignore
  }
}
