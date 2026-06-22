/**
 * Goal Subscriber for Agent Teaming (Phase A wiring)
 *
 * Subscribes to `goal.created` events on the event-bus. When a goal arrives
 * with a category that maps to a known mission template, agent-teaming:
 *   1. Picks a mission template based on goal.metrics.templateHint (set by
 *      mission-control) or goal.category as fallback
 *   2. Calls /api/teaming/missions to create a mission from that template
 *   3. The mission's DAG then runs SUTAR agents that call Nexha
 *
 * Categories → templates:
 *   commerce     → reduce-cost
 *   business     → recover-revenue
 *   operational  → optimize-inventory
 *   ai/product/personal → no mission (flow-orchestrator handles these)
 *
 * Goal.metrics.templateHint (if set by mission-control) takes precedence.
 */

const { v4: uuidv4 } = require('uuid');
const { createToken } = require('@rtmn/shared/auth');

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const SELF_URL = process.env.SELF_URL || `http://localhost:${process.env.PORT || 4853}`;
const ENABLED = process.env.GOAL_SUBSCRIBER_DISABLED !== 'true';

// Auth for the event-bus (same trick as flow-orchestrator/goal-subscriber):
// mint a base64 service token so we don't need INTERNAL_SERVICE_TOKEN set.
const INTERNAL_TOKEN = createToken({
  service: 'agent-teaming',
  scope: 'event-bus',
  role: 'system',
});

const CATEGORY_TO_TEMPLATE = {
  commerce: 'reduce-cost',
  business: 'recover-revenue',
  operational: 'optimize-inventory',
};

const subscriberState = {
  registered: false,
  subscriptionId: null,
  registeredAt: null,
  eventCount: 0,
  lastEventAt: null,
  lastError: null,
  recentEvents: [],
};

/** Authenticated fetch to event-bus with bearer token. */
async function ebFetch(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${INTERNAL_TOKEN}`,
    ...(opts.headers || {}),
  };
  return fetch(`${EVENT_BUS_URL}${path}`, { ...opts, headers });
}

async function registerGoalSubscriber() {
  if (!ENABLED) {
    console.log('[agent-teaming/goal-subscriber] DISABLED');
    return { disabled: true };
  }

  // Idempotent cleanup
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
    console.warn('[agent-teaming/goal-subscriber] pre-cleanup failed:', err.message);
  }

  try {
    const r = await ebFetch('/api/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        typePattern: 'goal.created',
        webhookUrl: `${SELF_URL}/api/_internal/goal-webhook`,
        retryPolicy: { maxAttempts: 3, backoffMs: 1000, backoffMultiplier: 2 },
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      subscriberState.lastError = `register failed: ${r.status}`;
      console.warn(`[agent-teaming/goal-subscriber] ${subscriberState.lastError}`);
      return { ok: false, status: r.status };
    }
    const sub = await r.json();
    subscriberState.registered = true;
    subscriberState.subscriptionId = sub.id;
    subscriberState.registeredAt = new Date().toISOString();
    subscriberState.lastError = null;
    console.log(`[agent-teaming/goal-subscriber] subscribed id=${sub.id}`);
    return { ok: true, subscriptionId: sub.id };
  } catch (err) {
    subscriberState.lastError = err.message;
    console.warn(`[agent-teaming/goal-subscriber] register failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

async function handleGoalEvent(event) {
  const goal = (event && event.payload) || {};
  const category = goal.category || 'business';
  const templateHint = (goal.metrics && goal.metrics.templateHint) || null;
  const templateName = templateHint || CATEGORY_TO_TEMPLATE[category];

  subscriberState.eventCount += 1;
  subscriberState.lastEventAt = new Date().toISOString();
  subscriberState.recentEvents.unshift({
    id: uuidv4(),
    goalId: goal.goalId,
    category,
    templateHint,
    templateName,
    receivedAt: subscriberState.lastEventAt,
  });
  if (subscriberState.recentEvents.length > 50) subscriberState.recentEvents.length = 50;

  // No matching template — skip (flow-orchestrator will handle it)
  if (!templateName) {
    return { skipped: true, reason: 'no-template-for-category', category };
  }

  // Create mission via our own /api/teaming/missions (auth as self)
  const missionResp = await fetch(`${SELF_URL}/api/teaming/missions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${INTERNAL_TOKEN}` },
    body: JSON.stringify({
      name: `goal-${goal.goalId || uuidv4()}`,
      template: templateName,
      params: {
        goalId: goal.goalId,
        goalTitle: goal.title,
        goalDescription: goal.description,
        priority: goal.priority,
        metrics: goal.metrics,
      },
      electionAlgo: 'skill-match',
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!missionResp.ok) {
    const err = `mission create failed: ${missionResp.status}`;
    subscriberState.lastError = err;
    throw new Error(err);
  }

  const mission = await missionResp.json();
  return { ok: true, missionId: mission.missionId || mission.id, templateName };
}

module.exports = {
  registerGoalSubscriber,
  handleGoalEvent,
  subscriberState,
};