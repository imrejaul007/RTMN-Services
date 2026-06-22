/**
 * Shared event-publisher for TwinOS services.
 *
 * Publishes domain events to the RTMN event-bus so other services
 * (MemoryOS, CorpID, analytics, etc.) can react to twin changes.
 *
 * Design choices:
 *   - Non-blocking: failures are logged but never thrown to the caller
 *   - Fire-and-forget for the common case; configurable timeout
 *   - Uses node's built-in fetch (no extra deps)
 *   - All events are typed by convention: `<service>.<twin-type>.<action>`
 *     e.g., "organization.organization.created", "wallet.transaction.completed"
 *   - The `source` field identifies the publishing service
 *
 * Usage:
 *   import { publish } from '@rtmn/twinos-shared/src/event-publisher.js';
 *   await publish('organization.organization.created', orgRecord);
 *   // or fire-and-forget:
 *   publish('wallet.transaction.completed', txn).catch(err => logger.warn(err));
 */

const DEFAULT_EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.EVENT_PUBLISH_TIMEOUT_MS || '2000', 10);
const DEFAULT_SOURCE = process.env.SERVICE_NAME || 'unknown-twin-service';

// Domain events are system-level signals, not user actions. They need to
// authenticate to event-bus (4510) / MemoryOS (4703) / twin-memory-bridge
// (4704) which all use @rtmn/shared/auth's createAuthMiddleware. That
// middleware accepts three formats:
//   1. X-Internal-Token matching INTERNAL_SERVICE_TOKEN env var
//   2. X-API-Key from the in-memory apiKeys map
//   3. Authorization: Bearer <base64-JSON token> via verifyToken (base64)
// Real JWTs are rejected because the shared auth lib does base64 decoding,
// not JWT signature verification. So we mint a base64-JSON token here.
const SERVICE_TOKEN = process.env.PLATFORM_TOKEN || null;
function getServiceToken() {
  if (SERVICE_TOKEN) return SERVICE_TOKEN;
  try {
    const payload = {
      sub: process.env.SERVICE_NAME || 'twin-service',
      role: 'service',
      source: 'event-publisher',
      iat: Date.now(),
      exp: Date.now() + 5 * 60 * 1000,
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  } catch (err) {
    console.warn(`[event-publisher] failed to mint service token: ${err.message}`);
    return null;
  }
}

/**
 * Publish a domain event to the event-bus.
 *
 * @param {string} type - Event type (e.g., "organization.created")
 * @param {object} [payload] - Event payload (will be JSON-serialized)
 * @param {object} [options]
 * @param {string} [options.source] - Source service name (default: SERVICE_NAME env)
 * @param {object} [options.headers] - Additional metadata
 * @param {string} [options.eventBusUrl] - Override event-bus URL
 * @param {number} [options.timeoutMs] - Request timeout
 * @param {string} [options.token] - JWT token for auth (optional in dev)
 * @returns {Promise<{ok: boolean, status?: number, error?: string}>}
 */
export async function publish(type, payload = {}, options = {}) {
  const eventBusUrl = options.eventBusUrl || DEFAULT_EVENT_BUS_URL;
  const source = options.source || DEFAULT_SOURCE;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    } else {
      // Auto-mint a service-level JWT when JWT_SECRET is configured.
      // This is required because event-bus (4510), MemoryOS (4703), and
      // twin-memory-bridge (4704) all require auth on write paths.
      const serviceToken = getServiceToken();
      if (serviceToken) {
        headers['Authorization'] = `Bearer ${serviceToken}`;
      }
    }

    const body = JSON.stringify({
      type,
      source,
      payload,
      schema_version: '1.0',
    });

    const res = await fetch(`${eventBusUrl}/api/events`, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(
        `[event-publisher] publish failed: type=${type} status=${res.status} body=${errText.slice(0, 200)}`
      );
      return { ok: false, status: res.status, error: errText };
    }

    return { ok: true, status: res.status };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`[event-publisher] publish timeout: type=${type} timeoutMs=${timeoutMs}`);
      return { ok: false, error: 'timeout' };
    }
    console.warn(`[event-publisher] publish error: type=${type} message=${err.message}`);
    return { ok: false, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fire-and-forget wrapper around publish().
 * Logs but never throws. Use this in hot paths where the caller
 * should not be blocked by event delivery.
 *
 * @param {string} type
 * @param {object} [payload]
 * @param {object} [options]
 */
export function publishAsync(type, payload, options) {
  publish(type, payload, options).catch((err) => {
    console.warn(`[event-publisher] uncaught error: type=${type} message=${err.message}`);
  });
}
