/**
 * ACP (Agent Commerce Protocol) v0.1.0 — JavaScript SDK.
 *
 * Reference: ../../../specs/ACP.md
 *
 * Provides:
 *   - sign(body, secret)              — produce X-ACP-Signature header value
 *   - verify(body, sig, secret)       — timing-safe signature verification
 *   - send(envelope, opts)            — POST an envelope to another agent with signing
 *   - build(type, payload, opts)      — build a well-formed envelope
 *   - validateTransition(from, to)    — check that a transition is allowed
 */

import { randomUUID } from 'node:crypto';
import { signBody } from './sign.js';
import { verifySignature } from './verify.js';

export { signBody, verifySignature };

// Allowed transitions per ACP v0.1.0 §5
const ALLOWED_TRANSITIONS = {
  QUERY:    ['QUOTE', 'REJECT'],
  QUOTE:    ['COUNTER', 'ACCEPT', 'REJECT'],
  COUNTER:  ['COUNTER', 'ACCEPT', 'REJECT'],
  ACCEPT:   ['ORDER', 'REJECT'],
  REJECT:   [],                            // terminal
  ORDER:    ['TRACK', 'DISPUTE'],
  TRACK:    ['TRACK', 'DISPUTE'],
  DISPUTE:  ['RESOLVE', 'ESCALATE'],
  RESOLVE:  [],                            // terminal
  ESCALATE: [],                            // terminal
};

/**
 * Build a well-formed ACP envelope.
 *
 * @param {object} opts
 * @param {string} opts.type           — message type (QUERY, QUOTE, ...)
 * @param {object} opts.from           — { agentId, tenantId }
 * @param {object} opts.to             — { agentId, tenantId }
 * @param {object} opts.payload        — type-specific payload
 * @param {string} [opts.threadId]     — existing thread (omit for new conversation)
 * @param {string} [opts.inReplyTo]    — messageId of the message being replied to
 * @returns {object} the envelope (no messageId yet — added by send())
 */
export function build({ type, from, to, payload, threadId, inReplyTo }) {
  if (!type || !ALLOWED_TRANSITIONS[type]) {
    throw new Error(`ACP: unknown message type: ${type}`);
  }
  if (!from?.agentId || !from?.tenantId) throw new Error('ACP: from.agentId and from.tenantId required');
  if (!to?.agentId || !to?.tenantId)     throw new Error('ACP: to.agentId and to.tenantId required');
  if (!payload || typeof payload !== 'object') throw new Error('ACP: payload must be an object');

  const envelope = {
    messageId: randomUUID(),
    type,
    from,
    to,
    payload,
    occurredAt: new Date().toISOString(),
  };
  if (threadId) envelope.threadId = threadId;
  if (inReplyTo) envelope.inReplyTo = inReplyTo;
  return envelope;
}

/**
 * Check whether transitioning from one type to another is allowed.
 */
export function validateTransition(from, to) {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Send an envelope to another agent over HTTPS.
 *
 * @param {object} envelope     — output of build()
 * @param {object} opts
 * @param {string} opts.endpoint — agent's base URL (e.g. "https://merchant.example.com")
 * @param {string} opts.secret   — shared HMAC secret
 * @param {object} [opts.fetcher] — injectable fetch (for tests); defaults to global fetch
 * @returns {Promise<object>}    — the response body (parsed JSON)
 */
export async function send(envelope, { endpoint, secret, fetcher } = {}) {
  if (!endpoint) throw new Error('ACP: endpoint required');
  if (!secret)   throw new Error('ACP: secret required');

  const body = JSON.stringify(envelope);
  const signature = signBody(body, secret);
  const f = fetcher || globalThis.fetch;

  const url = `${endpoint.replace(/\/$/, '')}/acp/v1/messages`;
  const res = await f(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ACP-Agent-Id': envelope.from.agentId,
      'X-ACP-Message-Id': envelope.messageId,
      'X-ACP-Timestamp': envelope.occurredAt,
      'X-ACP-Signature': signature,
      ...(envelope.inReplyTo ? { 'X-ACP-In-Reply-To': envelope.inReplyTo } : {}),
    },
    body,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const err = new Error(`ACP: HTTP ${res.status} — ${errBody?.error?.code || 'unknown'}: ${errBody?.error?.message || ''}`);
    err.status = res.status;
    err.code = errBody?.error?.code;
    throw err;
  }
  return await res.json().catch(() => ({}));
}
