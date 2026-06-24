/**
 * Phase 14.4 — Retry Planner unit tests
 * Covers: isTransientError, computeBackoff, decideRetry, recordOutcome, circuit breaker logic.
 */
const TEST_DATA_DIR = '/tmp/retry-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.RETRY_PLANNER_DATA_DIR = TEST_DATA_DIR;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  decideRetry,
  computeBackoff,
  isTransientError,
  recordOutcome,
  recordSuccess,
  recordFailure,
  breakerAllows,
  breakerState,
} = require('../../src/index');

// ---------------------- isTransientError ----------------------

test('isTransientError: 5xx status -> transient', () => {
  assert.equal(isTransientError({ status: 500 }), true);
  assert.equal(isTransientError({ status: 502 }), true);
  assert.equal(isTransientError({ status: 503 }), true);
});

test('isTransientError: 429 / 408 -> transient', () => {
  assert.equal(isTransientError({ status: 429 }), true);
  assert.equal(isTransientError({ status: 408 }), true);
});

test('isTransientError: 4xx (non-429/408) -> not transient', () => {
  assert.equal(isTransientError({ status: 400 }), false);
  assert.equal(isTransientError({ status: 401 }), false);
  assert.equal(isTransientError({ status: 404 }), false);
});

test('isTransientError: string with timeout/network keyword -> transient', () => {
  assert.equal(isTransientError('ETIMEDOUT'), true);
  assert.equal(isTransientError('ECONNRESET'), true);
  assert.equal(isTransientError('network error'), true);
  assert.equal(isTransientError('timeout exceeded'), true);
  assert.equal(isTransientError('HTTP 503'), true);
});

test('isTransientError: permanent error string -> not transient', () => {
  assert.equal(isTransientError('validation failed'), false);
  assert.equal(isTransientError('not authorized'), false);
});

// ---------------------- computeBackoff ----------------------

test('computeBackoff: attempt 1 -> base ± jitter', () => {
  const d = computeBackoff(1, { baseMs: 1000, jitter: 0 });
  assert.equal(d, 1000);
});

test('computeBackoff: doubles each attempt', () => {
  const d1 = computeBackoff(1, { baseMs: 100, jitter: 0 });
  const d2 = computeBackoff(2, { baseMs: 100, jitter: 0 });
  const d3 = computeBackoff(3, { baseMs: 100, jitter: 0 });
  assert.equal(d1, 100);
  assert.equal(d2, 200);
  assert.equal(d3, 400);
});

test('computeBackoff: caps at maxDelayMs', () => {
  const d = computeBackoff(20, { baseMs: 1000, maxDelayMs: 5000, jitter: 0 });
  assert.equal(d, 5000);
});

test('computeBackoff: jitter stays within ±25% by default', () => {
  // attempt 3, base 1000ms → exp = 4000ms, jitter ±25% → 3000-5000
  for (let i = 0; i < 100; i++) {
    const d = computeBackoff(3, { baseMs: 1000, jitter: 0.25 });
    assert.ok(d >= 3000 && d <= 5000, `jittered backoff ${d} out of range`);
  }
});

test('computeBackoff: returns non-negative even with high jitter', () => {
  const d = computeBackoff(1, { baseMs: 1, jitter: 0.99 });
  assert.ok(d >= 0);
});

// ---------------------- decideRetry ----------------------

test('decideRetry: transient error + attempt < max -> retry with delayMs', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 503 },
    attempt: 1,
    options: { maxAttempts: 5 },
  });
  assert.equal(r.action, 'retry');
  assert.ok(typeof r.delayMs === 'number' && r.delayMs >= 0);
  assert.equal(r.attempt, 1);
});

test('decideRetry: permanent 400 error -> fail immediately', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 400 },
    attempt: 1,
    options: { maxAttempts: 5 },
  });
  assert.equal(r.action, 'fail');
  assert.equal(r.reason, 'permanent-error');
});

test('decideRetry: max attempts reached -> fail', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 500 },
    attempt: 5,
    options: { maxAttempts: 5 },
  });
  assert.equal(r.action, 'fail');
  assert.equal(r.reason, 'max-attempts-reached');
});

test('decideRetry: max attempts + alternatives -> fallback', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 500 },
    attempt: 5,
    options: {
      maxAttempts: 5,
      alternatives: [{ type: 'webhook', url: 'http://alt.example.com' }],
    },
  });
  assert.equal(r.action, 'fallback');
  assert.equal(r.handler.type, 'webhook');
});

test('decideRetry: permanent error + alternatives -> fallback', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 400 },
    attempt: 1,
    options: {
      maxAttempts: 5,
      alternatives: [{ type: 'echo' }],
    },
  });
  assert.equal(r.action, 'fallback');
  assert.equal(r.reason, 'permanent-error-fallback');
});

test('decideRetry: escalateAfter reached -> escalate', () => {
  const r = decideRetry({
    taskId: 't1',
    error: { status: 500 },
    attempt: 5,
    options: { maxAttempts: 5, escalateAfter: 5 },
  });
  assert.equal(r.action, 'escalate');
  assert.equal(r.reason, 'max-attempts-escalate');
});

// ---------------------- Circuit breaker ----------------------

test('breaker: starts closed', () => {
  recordSuccess('breaker-task-1'); // reset to closed
  assert.equal(breakerAllows('breaker-task-1'), true);
});

test('breaker: 3 failures opens the circuit', () => {
  const tid = 'breaker-task-2';
  recordSuccess(tid); // start clean
  recordFailure(tid, { failureThreshold: 3 });
  recordFailure(tid, { failureThreshold: 3 });
  assert.equal(breakerAllows(tid), true); // 2 failures, still closed
  recordFailure(tid, { failureThreshold: 3 });
  assert.equal(breakerAllows(tid), false); // open
});

test('breaker: open blocks retries → fail', () => {
  const tid = 'breaker-task-3';
  recordSuccess(tid);
  recordFailure(tid, { failureThreshold: 2 });
  recordFailure(tid, { failureThreshold: 2 });
  // Now open
  const r = decideRetry({
    taskId: tid,
    error: { status: 500 },
    attempt: 1,
    options: { maxAttempts: 5 },
  });
  assert.equal(r.action, 'fail');
  assert.equal(r.reason, 'circuit-open');
});

test('breaker: open + alternatives → fallback', () => {
  const tid = 'breaker-task-4';
  recordSuccess(tid);
  recordFailure(tid, { failureThreshold: 2 });
  recordFailure(tid, { failureThreshold: 2 });
  const r = decideRetry({
    taskId: tid,
    error: { status: 500 },
    attempt: 1,
    options: {
      maxAttempts: 5,
      alternatives: [{ type: 'webhook', url: 'http://backup' }],
    },
  });
  assert.equal(r.action, 'fallback');
  assert.equal(r.reason, 'circuit-open-switching-to-fallback');
});

test('breaker: cooldown elapses → half-open → allows trial', () => {
  const tid = 'breaker-task-5';
  recordSuccess(tid);
  recordFailure(tid, { failureThreshold: 2, cooldownMs: 50 });
  recordFailure(tid, { failureThreshold: 2, cooldownMs: 50 });
  assert.equal(breakerAllows(tid), false);
  return new Promise((resolve) => setTimeout(() => {
    assert.equal(breakerAllows(tid), true); // cooldown elapsed
    resolve();
  }, 100));
});

test('recordOutcome: success resets breaker', () => {
  const tid = 'breaker-task-6';
  recordSuccess(tid);
  recordFailure(tid, { failureThreshold: 2 });
  recordFailure(tid, { failureThreshold: 2 });
  recordOutcome(tid, 'success');
  const b = breakerState[tid];
  assert.equal(b.state, 'closed');
  assert.equal(b.failures, 0);
});

// ---------------------- Teardown ----------------------

test('teardown: clear breakers and remove data dir', () => {
  for (const k of Object.keys(breakerState)) delete breakerState[k];
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});