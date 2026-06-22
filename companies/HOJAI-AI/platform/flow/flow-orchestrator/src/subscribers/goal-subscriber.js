/**
 * Goal Subscriber (Phase A wiring)
 *
 * Flow Orchestrator subscribes to `goal.created` events on the event-bus.
 * When a goal arrives:
 *   1. Map goal.category → flow template name
 *   2. Instantiate the template as a new plan (via /api/templates/:name/instantiate)
 *   3. Run the plan (via /api/executions) with the goal as context
 *
 * This is the chain:
 *   mission-control → goal-os → event-bus → flow-orchestrator (this) → agents
 *
 * Categories → templates:
 *   business     → decide-and-act
 *   commerce     → negotiate-and-execute
 *   operational  → answer-question
 *   ai           → simulate-then-recommend
 *   product      → answer-question
 *   personal     → personal-assistant
 *
 * Failure mode:
 *   If event-bus is down at startup, the subscriber logs a warning but the
 *   service still serves HTTP traffic. Manual replays are possible via
 *   `POST /api/_internal/replay-goal/:eventId`.
 */

import { v4 as uuidv4 } from 'uuid';
import { createToken } from '@rtmn/shared/auth';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SELF_URL = process.env.SELF_URL || `http://localhost:${process.env.PORT || 4244}`;
const SUBSCRIPTION_ID = process.env.GOAL_SUBSCRIPTION_ID || null;
const ENABLED = process.env.GOAL_SUBSCRIBER_DISABLED !== 'true';

// Build auth headers for the event-bus. The event-bus uses @rtmn/shared
// requireAuth which accepts three things:
//   1. Authorization: Bearer <base64-token>  ← we use this
//   2. X-API-Key: <key>
//   3. X-Internal-Token: <token>  (when INTERNAL_SERVICE_TOKEN env matches)
// We mint a base64 token via createToken so we don't need a shared secret.
const INTERNAL_TOKEN = createToken({
  service: 'flow-orchestrator',
  scope: 'event-bus',
  role: 'system',
});

// Map goal categories → flow templates (must match seedTemplates() in index.js)
export const GOAL_TO_TEMPLATE = {
  business: 'decide-and-act',
  commerce: 'negotiate-and-execute',
  operational: 'answer-question',
  ai: 'simulate-then-recommend',
  product: 'answer-question',
  personal: 'personal-assistant',
};

// Subscribed state (in-memory; survives process restart via PersistentMap ideally)
export const subscriberState = {
  registered: false,
  subscriptionId: null,
  registeredAt: null,
  eventCount: 0,
  lastEventAt: null,
  lastError: null,
  recentEvents: [], // last 50
};

/**
 * Authenticated fetch to the event-bus. Uses Bearer token (created at module
 * load). Accepts the same opts as fetch().
 */
async function ebFetch(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${INTERNAL_TOKEN}`,
    ...(opts.headers || {}),
  };
  return fetch(`${EVENT_BUS_URL}${path}`, { ...opts, headers });
}

/**
 * Register the goal.created subscription on the event-bus.
 * Idempotent — safe to call on every restart.
 */
export async function registerGoalSubscriber() {
  if (!ENABLED) {
    console.log('[flow-orchestrator/goal-subscriber] DISABLED (GOAL_SUBSCRIBER_DISABLED=true)');
    return { disabled: true };
  }

  // First, try to delete any prior subscription with the same webhook (idempotent)
  try {
    const subsResp = await ebFetch('/api/subscriptions');
    if (subsResp.ok) {
      const { subscriptions } = await subsResp.json();
      const dup = (subscriptions || []).find(
        (s) => s.webhookUrl === `${SELF_URL}/api/_internal/goal-webhook` && s.typePattern === 'goal.created',
      );
      if (dup) {
        await ebFetch(`/api/subscriptions/${dup.id}`, { method: 'DELETE' });
      }
    }
  } catch (err) {
    console.warn('[flow-orchestrator/goal-subscriber] pre-cleanup failed:', err.message);
  }

  const webhookUrl = `${SELF_URL}/api/_internal/goal-webhook`;
  const body = {
    typePattern: 'goal.created',
    webhookUrl,
    retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
    schemaVersion: null,
  };

  try {
    const r = await ebFetch('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      const text = await r.text();
      subscriberState.lastError = `register failed: status ${r.status} ${text}`;
      console.warn(`[flow-orchestrator/goal-subscriber] ${subscriberState.lastError}`);
      return { ok: false, status: r.status, error: text };
    }
    const sub = await r.json();
    subscriberState.registered = true;
    subscriberState.subscriptionId = sub.id;
    subscriberState.registeredAt = new Date().toISOString();
    subscriberState.lastError = null;
    console.log(`[flow-orchestrator/goal-subscriber] subscribed id=${sub.id} webhook=${webhookUrl}`);
    return { ok: true, subscriptionId: sub.id };
  } catch (err) {
    subscriberState.lastError = `register failed: ${err.message}`;
    console.warn(`[flow-orchestrator/goal-subscriber] ${subscriberState.lastError}`);
    return { ok: false, error: err.message };
  }
}

/**
 * Handle an incoming goal.created event.
 * 1. Pick the template based on goal.category
 * 2. Instantiate it as a plan
 * 3. Run the plan with the goal as context
 */
export async function handleGoalEvent(event) {
  const goal = (event && event.payload) || {};
  const category = goal.category || 'operational';
  const tplName = GOAL_TO_TEMPLATE[category] || 'answer-question';

  subscriberState.eventCount += 1;
  subscriberState.lastEventAt = new Date().toISOString();
  subscriberState.recentEvents.unshift({
    id: uuidv4(),
    goalId: goal.goalId,
    category,
    templateName: tplName,
    receivedAt: subscriberState.lastEventAt,
  });
  if (subscriberState.recentEvents.length > 50) subscriberState.recentEvents.length = 50;

  // 1. Instantiate the template (auth as self so the requireAuth'd route accepts us)
  const tplResp = await fetch(`${SELF_URL}/api/templates/${tplName}/instantiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_TOKEN}` },
    body: JSON.stringify({
      name: `goal-${goal.goalId || uuidv4()}`,
      description: `Auto-instantiated from goal: ${goal.title || ''}`,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!tplResp.ok) {
    const err = `template instantiate failed: ${tplResp.status}`;
    subscriberState.lastError = err;
    throw new Error(err);
  }
  const plan = await tplResp.json();

  // 2. Run the plan with the goal as context (async — fire-and-forget)
  const runResp = await fetch(`${SELF_URL}/api/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_TOKEN}` },
    body: JSON.stringify({
      planId: plan.id,
      twinId: null,
      context: { goal, triggeredBy: 'goal-subscriber' },
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!runResp.ok) {
    const err = `execution start failed: ${runResp.status}`;
    subscriberState.lastError = err;
    throw new Error(err);
  }

  return { ok: true, planId: plan.id, templateName: tplName, execution: await runResp.json() };
}

/**
 * Replay an event from event-bus by id (for debugging / missed events).
 */
export async function replayGoalEvent(eventId) {
  const r = await ebFetch(`/api/events/replay/${eventId}`, { method: 'POST' });
  return { ok: r.ok, status: r.status };
}