/**
 * Tests for @rtmn/acp JS SDK.
 *
 * Usage: node --test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build, send, validateTransition, signBody, verifySignature } from '../src/index.js';

const FROM = { agentId: 'agt_consumer', tenantId: 't_consumer' };
const TO   = { agentId: 'agt_merchant', tenantId: 't_merchant' };

// ─────────────────────────────────────────────────────────────────
// build()
// ─────────────────────────────────────────────────────────────────

test('build() returns a valid envelope for a QUERY', () => {
  const env = build({
    type: 'QUERY',
    from: FROM,
    to: TO,
    payload: { productOrService: 'Pizza', quantity: 2 },
  });
  assert.equal(env.type, 'QUERY');
  assert.equal(env.from.agentId, 'agt_consumer');
  assert.equal(env.to.tenantId, 't_merchant');
  assert.equal(env.payload.productOrService, 'Pizza');
  assert.match(env.messageId, /^[0-9a-f-]{36}$/); // UUID shape
  assert.match(env.occurredAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(env.threadId, undefined);
  assert.equal(env.inReplyTo, undefined);
});

test('build() includes threadId and inReplyTo when provided', () => {
  const env = build({
    type: 'QUOTE',
    from: TO, to: FROM,
    payload: { quoteId: 'q1', totalCents: 1000 },
    threadId: 'thr_1',
    inReplyTo: 'msg_prev',
  });
  assert.equal(env.threadId, 'thr_1');
  assert.equal(env.inReplyTo, 'msg_prev');
});

test('build() rejects unknown type', () => {
  assert.throws(() => build({ type: 'BOGUS', from: FROM, to: TO, payload: {} }), /unknown message type/);
});

test('build() rejects missing from', () => {
  assert.throws(() => build({ type: 'QUERY', from: {}, to: TO, payload: {} }), /agentId/);
});

test('build() rejects missing to', () => {
  assert.throws(() => build({ type: 'QUERY', from: FROM, to: { agentId: 'a' }, payload: {} }), /tenantId/);
});

// ─────────────────────────────────────────────────────────────────
// validateTransition()
// ─────────────────────────────────────────────────────────────────

test('QUERY → QUOTE is allowed', () => {
  assert.equal(validateTransition('QUERY', 'QUOTE'), true);
});

test('QUERY → ORDER is forbidden', () => {
  assert.equal(validateTransition('QUERY', 'ORDER'), false);
});

test('REJECT is terminal (no outgoing transitions)', () => {
  assert.equal(validateTransition('REJECT', 'QUERY'), false);
  assert.equal(validateTransition('REJECT', 'QUOTE'), false);
});

test('ORDER → TRACK is allowed', () => {
  assert.equal(validateTransition('ORDER', 'TRACK'), true);
});

test('DISPUTE → ESCALATE is allowed', () => {
  assert.equal(validateTransition('DISPUTE', 'ESCALATE'), true);
});

// ─────────────────────────────────────────────────────────────────
// signBody / verifySignature
// ─────────────────────────────────────────────────────────────────

test('signBody produces sha256= prefix', () => {
  const sig = signBody({ hello: 'world' }, 'secret-123');
  assert.match(sig, /^sha256=[0-9a-f]{64}$/);
});

test('signBody is deterministic for the same body + secret', () => {
  const a = signBody({ a: 1 }, 's');
  const b = signBody({ a: 1 }, 's');
  assert.equal(a, b);
});

test('signBody differs for different secrets', () => {
  const a = signBody({ a: 1 }, 's1');
  const b = signBody({ a: 1 }, 's2');
  assert.notEqual(a, b);
});

test('verifySignature accepts a correct signature', () => {
  const body = { a: 1, b: 'two' };
  const sig = signBody(body, 'k');
  assert.equal(verifySignature(body, sig, 'k'), true);
});

test('verifySignature rejects a wrong signature', () => {
  assert.equal(verifySignature({ a: 1 }, 'sha256=' + 'a'.repeat(64), 'k'), false);
});

test('verifySignature rejects a non-sha256 prefix', () => {
  assert.equal(verifySignature({ a: 1 }, 'md5=abc', 'k'), false);
});

test('verifySignature rejects tampered signatures (same length, different bytes)', () => {
  const sig = signBody({ a: 1 }, 'k');
  // Flip a bit in the middle of the hex digest
  const tampered = sig.slice(0, 10) + (sig[10] === '0' ? '1' : '0') + sig.slice(11);
  assert.notEqual(tampered, sig);
  assert.equal(verifySignature({ a: 1 }, tampered, 'k'), false);
});

test('verifySignature rejects different-length signatures', () => {
  const sig = signBody({ a: 1 }, 'k');
  assert.equal(verifySignature({ a: 1 }, sig + 'extra', 'k'), false);
});

// ─────────────────────────────────────────────────────────────────
// send()
// ─────────────────────────────────────────────────────────────────

test('send() POSTs the envelope to /acp/v1/messages with signature header', async () => {
  let captured = null;
  const fetcher = async (url, init) => {
    captured = { url, init };
    return {
      ok: true,
      status: 200,
      json: async () => ({ received: true }),
    };
  };
  const env = build({ type: 'QUERY', from: FROM, to: TO, payload: { x: 1 } });
  const result = await send(env, { endpoint: 'https://merchant.example.com/', secret: 's3cr3t', fetcher });
  assert.equal(result.received, true);
  assert.equal(captured.url, 'https://merchant.example.com/acp/v1/messages');
  assert.equal(captured.init.method, 'POST');
  assert.equal(captured.init.headers['X-ACP-Agent-Id'], FROM.agentId);
  assert.equal(captured.init.headers['X-ACP-Message-Id'], env.messageId);
  assert.match(captured.init.headers['X-ACP-Signature'], /^sha256=[0-9a-f]{64}$/);
  // Body should be the exact envelope we sent.
  assert.equal(captured.init.body, JSON.stringify(env));
  // Verify the signature in the header is valid for the body + secret.
  assert.equal(verifySignature(JSON.parse(captured.init.body), captured.init.headers['X-ACP-Signature'], 's3cr3t'), true);
});

test('send() strips trailing slash from endpoint', async () => {
  let capturedUrl = null;
  const fetcher = async (url) => { capturedUrl = url; return { ok: true, status: 200, json: async () => ({}) }; };
  const env = build({ type: 'QUERY', from: FROM, to: TO, payload: {} });
  await send(env, { endpoint: 'https://x.example.com/', secret: 's', fetcher });
  assert.equal(capturedUrl, 'https://x.example.com/acp/v1/messages');
});

test('send() throws on HTTP error with code in err.code', async () => {
  const fetcher = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { code: 'FORBIDDEN_TRANSITION', message: 'bad' } }),
  });
  const env = build({ type: 'QUERY', from: FROM, to: TO, payload: {} });
  await assert.rejects(
    send(env, { endpoint: 'https://x', secret: 's', fetcher }),
    (err) => err.status === 403 && err.code === 'FORBIDDEN_TRANSITION'
  );
});

test('send() throws on missing endpoint', async () => {
  const env = build({ type: 'QUERY', from: FROM, to: TO, payload: {} });
  await assert.rejects(send(env, { secret: 's' }), /endpoint required/);
});

test('send() throws on missing secret', async () => {
  const env = build({ type: 'QUERY', from: FROM, to: TO, payload: {} });
  await assert.rejects(send(env, { endpoint: 'https://x' }), /secret required/);
});

// ─────────────────────────────────────────────────────────────────
// End-to-end conversation
// ─────────────────────────────────────────────────────────────────

test('end-to-end: QUERY → QUOTE → ACCEPT → ORDER flow validates transitions', () => {
  const t1 = build({ type: 'QUERY',    from: FROM, to: TO, payload: { q: 1 } });
  assert.equal(validateTransition(t1.type, 'QUOTE'), true);

  const t2 = build({ type: 'QUOTE',    from: TO, to: FROM, payload: { quoteId: 'q1' }, threadId: t1.messageId, inReplyTo: t1.messageId });
  assert.equal(validateTransition(t2.type, 'ACCEPT'), true);

  const t3 = build({ type: 'ACCEPT',   from: FROM, to: TO, payload: { acceptedQuoteId: 'q1' }, threadId: t1.messageId, inReplyTo: t2.messageId });
  assert.equal(validateTransition(t3.type, 'ORDER'), true);

  const t4 = build({ type: 'ORDER',    from: TO, to: FROM, payload: { orderId: 'o1' }, threadId: t1.messageId, inReplyTo: t3.messageId });
  assert.equal(validateTransition(t4.type, 'TRACK'), true);
  assert.equal(validateTransition(t4.type, 'DISPUTE'), true);

  // All four share a thread
  assert.equal(t1.messageId !== t2.messageId && t2.messageId !== t3.messageId && t3.messageId !== t4.messageId, true);
});
