/**
 * hooksService — subscription CRUD + event fan-out + delivery with HMAC signing.
 *
 * Subscriptions register a URL + secret for a list of event types.
 * When an event is emitted, all matching active subscriptions get a
 * delivery record created, signed with the subscription's secret,
 * and attempted. Failures retry with exponential backoff.
 */

import crypto from 'node:crypto';
import { HookSubscription, HOOK_EVENT_TYPES } from '../models/HookSubscription.js';
import { HookDelivery, HOOK_DELIVERY_STATUS } from '../models/HookDelivery.js';

export class NotFoundError extends Error {
  constructor(message) { super(message); this.name = 'NotFoundError'; this.statusCode = 404; }
}
export class ValidationError extends Error {
  constructor(message) { super(message); this.name = 'ValidationError'; this.statusCode = 400; }
}
export class StateTransitionError extends Error {
  constructor({ from, to }) {
    super(`cannot transition subscription ${from} → ${to}`);
    this.name = 'StateTransitionError';
    this.from = from; this.to = to; this.statusCode = 422;
  }
}

const SUBSCRIPTION_TRANSITIONS = {
  ACTIVE: new Set(['DISABLED', 'DELETED']),
  DISABLED: new Set(['ACTIVE', 'DELETED']),
  DELETED: new Set(),
};

function genSubId() { return 'sub_' + crypto.randomBytes(8).toString('hex'); }
function genDeliveryId() { return 'dlv_' + crypto.randomBytes(8).toString('hex'); }
function genEventId() { return 'evt_' + crypto.randomBytes(8).toString('hex'); }
function genSecret() { return 'whsec_' + crypto.randomBytes(24).toString('hex'); }

const RETRY_SCHEDULE_MS = [
  60 * 1000,        // 1 minute
  5 * 60 * 1000,    // 5 minutes
  30 * 60 * 1000,   // 30 minutes
  2 * 60 * 60 * 1000,  // 2 hours
  12 * 60 * 60 * 1000, // 12 hours
  24 * 60 * 60 * 1000, // 24 hours
];

export function signPayload(secret, body) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  return 'sha256=' + hmac.digest('hex');
}

export function verifySignature(secret, body, signature) {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = signPayload(secret, body);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function getRetryDelay(attempt) {
  if (attempt < 0) return RETRY_SCHEDULE_MS[0];
  if (attempt >= RETRY_SCHEDULE_MS.length) return null; // no more retries
  return RETRY_SCHEDULE_MS[attempt];
}

export function getMaxAttempts() { return RETRY_SCHEDULE_MS.length; }

function assertSubTransition(from, to) {
  const allowed = SUBSCRIPTION_TRANSITIONS[from] || new Set();
  if (!allowed.has(to)) {
    throw new StateTransitionError({ from, to });
  }
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function createSubscription({
  tenantId,
  url,
  eventTypes,
  description = '',
  metadata = {},
}) {
  if (!tenantId) throw new ValidationError('tenantId required');
  if (!url) throw new ValidationError('url required');
  if (!isValidUrl(url)) throw new ValidationError('url must be a valid http(s) URL');
  if (!Array.isArray(eventTypes) || eventTypes.length === 0) {
    throw new ValidationError('eventTypes must be a non-empty array');
  }
  for (const t of eventTypes) {
    if (!HOOK_EVENT_TYPES.includes(t)) {
      throw new ValidationError(`unknown eventType: ${t}`);
    }
  }

  const subscriptionId = genSubId();
  const secret = genSecret();
  const sub = await HookSubscription.create({
    subscriptionId,
    tenantId,
    url,
    secret,
    eventTypes,
    description,
    metadata,
    status: 'ACTIVE',
  });
  const obj = sub.toObject();
  // Return plaintext secret only on create
  return obj;
}

export async function getSubscription(subscriptionId, { tenantId, allowInternal = false } = {}) {
  const sub = await HookSubscription.findOne({ subscriptionId }).lean();
  if (!sub) throw new NotFoundError(`subscription ${subscriptionId} not found`);
  if (!allowInternal && sub.tenantId !== tenantId) {
    throw new NotFoundError(`subscription ${subscriptionId} not found`);
  }
  return sub;
}

export async function listSubscriptions({
  tenantId,
  status,
  eventType,
  limit = 50,
  skip = 0,
}) {
  const q = {};
  if (tenantId) q.tenantId = tenantId;
  if (status) q.status = status;
  if (eventType) q.eventTypes = { $in: [eventType, '*'] };
  const items = await HookSubscription.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 200))
    .lean();
  const total = await HookSubscription.countDocuments(q);
  return { items, total, limit, skip };
}

export async function updateSubscription(subscriptionId, patch, { tenantId, allowInternal = false } = {}) {
  const sub = await HookSubscription.findOne({ subscriptionId });
  if (!sub) throw new NotFoundError(`subscription ${subscriptionId} not found`);
  if (!allowInternal && sub.tenantId !== tenantId) {
    throw new NotFoundError(`subscription ${subscriptionId} not found`);
  }
  if (patch.url !== undefined) {
    if (!isValidUrl(patch.url)) throw new ValidationError('url must be a valid http(s) URL');
    sub.url = patch.url;
  }
  if (patch.eventTypes !== undefined) {
    if (!Array.isArray(patch.eventTypes) || patch.eventTypes.length === 0) {
      throw new ValidationError('eventTypes must be a non-empty array');
    }
    for (const t of patch.eventTypes) {
      if (!HOOK_EVENT_TYPES.includes(t)) throw new ValidationError(`unknown eventType: ${t}`);
    }
    sub.eventTypes = patch.eventTypes;
  }
  if (patch.description !== undefined) sub.description = patch.description;
  if (patch.metadata !== undefined) sub.metadata = patch.metadata;
  await sub.save();
  return sub.toObject();
}

export async function transitionSubscription(subscriptionId, toStatus, { tenantId, allowInternal = false } = {}) {
  const sub = await HookSubscription.findOne({ subscriptionId });
  if (!sub) throw new NotFoundError(`subscription ${subscriptionId} not found`);
  if (!allowInternal && sub.tenantId !== tenantId) {
    throw new NotFoundError(`subscription ${subscriptionId} not found`);
  }
  assertSubTransition(sub.status, toStatus);
  sub.status = toStatus;
  await sub.save();
  return sub.toObject();
}

export async function disableSubscription(subscriptionId, opts) {
  return transitionSubscription(subscriptionId, 'DISABLED', opts);
}

export async function enableSubscription(subscriptionId, opts) {
  return transitionSubscription(subscriptionId, 'ACTIVE', opts);
}

export async function deleteSubscription(subscriptionId, opts) {
  return transitionSubscription(subscriptionId, 'DELETED', opts);
}

export async function rotateSecret(subscriptionId, { tenantId, allowInternal = false } = {}) {
  const sub = await HookSubscription.findOne({ subscriptionId });
  if (!sub) throw new NotFoundError(`subscription ${subscriptionId} not found`);
  if (!allowInternal && sub.tenantId !== tenantId) {
    throw new NotFoundError(`subscription ${subscriptionId} not found`);
  }
  sub.secret = genSecret();
  await sub.save();
  return sub.toObject();
}

/**
 * Emit an event. Returns the list of delivery records created.
 * Does NOT actually POST — that's the worker's job. This just creates
 * pending deliveries and signs the payload.
 */
export async function emitEvent({ tenantId, eventType, payload, sourceService = 'unknown' }) {
  if (!tenantId) throw new ValidationError('tenantId required');
  if (!eventType) throw new ValidationError('eventType required');
  if (!HOOK_EVENT_TYPES.includes(eventType) && eventType !== '*') {
    throw new ValidationError(`unknown eventType: ${eventType}`);
  }
  const subs = await HookSubscription.find({
    tenantId,
    status: 'ACTIVE',
    $or: [{ eventTypes: eventType }, { eventTypes: '*' }],
  }).lean();

  const eventId = genEventId();
  const created = [];
  for (const sub of subs) {
    const body = JSON.stringify({
      id: eventId,
      type: eventType,
      tenantId,
      source: sourceService,
      createdAt: new Date().toISOString(),
      data: payload,
    });
    const signature = signPayload(sub.secret, body);
    const delivery = await HookDelivery.create({
      deliveryId: genDeliveryId(),
      subscriptionId: sub.subscriptionId,
      tenantId,
      eventId,
      eventType,
      url: sub.url,
      payload: { body, signature, eventId, eventType, tenantId, source: sourceService, data: payload },
      status: 'PENDING',
      attempt: 0,
      maxAttempts: getMaxAttempts(),
      nextAttemptAt: new Date(),
    });
    created.push(delivery.toObject());
  }
  return { eventId, eventType, tenantId, deliveries: created };
}

/**
 * Process pending deliveries: pick the next batch whose nextAttemptAt is due,
 * simulate a delivery attempt (no real network), record result, schedule next
 * retry if needed.
 *
 * Returns { processed, succeeded, failed, scheduledNext }.
 *
 * @param httpClient - function(url, { headers, body }) -> { status, body }
 *                     (default: a no-op simulator that always returns 200)
 */
export async function processDeliveries({ batchSize = 50, httpClient } = {}) {
  const now = new Date();
  const due = await HookDelivery.find({
    status: { $in: ['PENDING', 'RETRYING'] },
    nextAttemptAt: { $lte: now },
  })
    .sort({ nextAttemptAt: 1 })
    .limit(batchSize)
    .lean();

  const client = httpClient || defaultHttpClient();
  let processed = 0, succeeded = 0, failed = 0, scheduledNext = 0;

  for (const d of due) {
    processed++;
    const { url, payload } = d;
    let response;
    try {
      response = await client(url, {
        headers: {
          'Content-Type': 'application/json',
          'X-Nexha-Signature': payload.signature,
          'X-Nexha-Event-Id': payload.eventId,
          'X-Nexha-Event-Type': payload.eventType,
          'X-Nexha-Attempt': String(d.attempt + 1),
        },
        body: payload.body,
      });
    } catch (err) {
      response = { status: 0, body: err.message };
    }

    const nextAttempt = d.attempt + 1;
    const isSuccess = response.status >= 200 && response.status < 300;
    const retryDelay = getRetryDelay(nextAttempt);
    const isLastAttempt = nextAttempt >= d.maxAttempts;

    const update = {
      attempt: nextAttempt,
      lastResponseStatus: response.status,
      lastResponseBody: typeof response.body === 'string' ? response.body.slice(0, 500) : JSON.stringify(response.body).slice(0, 500),
    };

    if (isSuccess) {
      update.status = 'SUCCESS';
      update.deliveredAt = new Date();
      succeeded++;
    } else if (isLastAttempt || retryDelay === null) {
      update.status = 'FAILED';
      update.lastError = `http ${response.status}`;
      update.failureReason = `max attempts (${d.maxAttempts}) exhausted`;
      failed++;
    } else {
      update.status = 'RETRYING';
      update.lastError = `http ${response.status}`;
      update.nextAttemptAt = new Date(Date.now() + retryDelay);
      scheduledNext++;
    }
    await HookDelivery.updateOne({ deliveryId: d.deliveryId }, { $set: update });

    // Update subscription stats
    if (isSuccess) {
      await HookSubscription.updateOne(
        { subscriptionId: d.subscriptionId },
        { $inc: { totalDeliveries: 1, successfulDeliveries: 1 }, $set: { lastTriggeredAt: new Date(), lastSuccessAt: new Date() } }
      );
    } else {
      await HookSubscription.updateOne(
        { subscriptionId: d.subscriptionId },
        { $inc: { totalDeliveries: 1, failedDeliveries: 1 }, $set: { lastTriggeredAt: new Date(), lastFailureAt: new Date() } }
      );
    }
  }

  return { processed, succeeded, failed, scheduledNext };
}

function defaultHttpClient() {
  // Test/dev default: never makes a real network call. Returns 200.
  return async () => ({ status: 200, body: 'ok' });
}

export async function getDelivery(deliveryId, { tenantId, allowInternal = false } = {}) {
  const d = await HookDelivery.findOne({ deliveryId }).lean();
  if (!d) throw new NotFoundError(`delivery ${deliveryId} not found`);
  if (!allowInternal && d.tenantId !== tenantId) {
    throw new NotFoundError(`delivery ${deliveryId} not found`);
  }
  return d;
}

export async function listDeliveries({
  tenantId,
  subscriptionId,
  eventId,
  eventType,
  status,
  limit = 50,
  skip = 0,
}) {
  const q = {};
  if (tenantId) q.tenantId = tenantId;
  if (subscriptionId) q.subscriptionId = subscriptionId;
  if (eventId) q.eventId = eventId;
  if (eventType) q.eventType = eventType;
  if (status) q.status = status;
  const items = await HookDelivery.find(q)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Math.min(limit, 200))
    .lean();
  const total = await HookDelivery.countDocuments(q);
  return { items, total, limit, skip };
}

export async function getStats(tenantId) {
  const subQ = tenantId ? { tenantId } : {};
  const subs = await HookSubscription.find(subQ).lean();
  const dlvQ = tenantId ? { tenantId } : {};
  const deliveries = await HookDelivery.find(dlvQ).lean();
  return {
    subscriptions: {
      total: subs.length,
      active: subs.filter(s => s.status === 'ACTIVE').length,
      disabled: subs.filter(s => s.status === 'DISABLED').length,
      deleted: subs.filter(s => s.status === 'DELETED').length,
    },
    deliveries: {
      total: deliveries.length,
      pending: deliveries.filter(d => d.status === 'PENDING').length,
      retrying: deliveries.filter(d => d.status === 'RETRYING').length,
      success: deliveries.filter(d => d.status === 'SUCCESS').length,
      failed: deliveries.filter(d => d.status === 'FAILED').length,
    },
    totalsByEventType: deliveries.reduce((acc, d) => {
      acc[d.eventType] = (acc[d.eventType] || 0) + 1;
      return acc;
    }, {}),
  };
}
