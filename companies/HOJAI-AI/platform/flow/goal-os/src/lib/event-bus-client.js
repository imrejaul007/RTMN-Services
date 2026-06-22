/**
 * Event-bus Client (Phase A wiring)
 *
 * A tiny HTTP client to publish events to the HOJAI event-bus@4510.
 * Used by goal-os to fire-and-forget `goal.created` events when a goal
 * is created. Subscribers (flow-orchestrator, agent-teaming, etc.)
 * pick them up and act on them.
 *
 * Design notes:
 *   - Fire-and-forget by design. Never block the originating request.
 *   - Errors are logged, never thrown.
 *   - 3s timeout so a slow event-bus doesn't slow down goal creation.
 *   - Best-effort: if event-bus is down, the goal still succeeds.
 */

import { createToken } from '@rtmn/shared/auth';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SOURCE = process.env.SERVICE_NAME || 'goal-os';

// Mint a service token for the event-bus (same trick as the subscribers).
// Event-bus POST /api/events requires requireAuth — accept Bearer / API key /
// X-Internal-Token. We use Bearer so we don't need a shared secret.
const INTERNAL_TOKEN = createToken({
  service: 'goal-os',
  scope: 'event-bus',
  role: 'system',
});

export const eventBusClient = {
  /**
   * Publish an event to the event-bus.
   * Returns { ok, status, error } — does NOT throw.
   */
  async publish(type, payload, headers = {}) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    try {
      const r = await fetch(`${EVENT_BUS_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INTERNAL_TOKEN}`,
          ...headers,
        },
        body: JSON.stringify({ type, source: SOURCE, payload }),
        signal: controller.signal,
      });
      if (!r.ok) {
        const text = await r.text();
        console.warn(`[goal-os/event-bus] publish failed type=${type} status=${r.status} body=${text.slice(0, 200)}`);
      }
      return { ok: r.ok, status: r.status };
    } catch (err) {
      // Best-effort: never throw, just log.
      console.warn(`[goal-os/event-bus] publish failed for type=${type}: ${err.message || err.name}`);
      return { ok: false, status: 0, error: err.message || err.name };
    } finally {
      clearTimeout(t);
    }
  },
};