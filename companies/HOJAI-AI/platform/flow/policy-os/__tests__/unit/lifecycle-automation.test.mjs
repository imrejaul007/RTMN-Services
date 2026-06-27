/**
 * PolicyOS — Lifecycle Automation tests (Phase 9)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { TRIGGER_TYPES, ACTION_TYPES, APPROVAL_STATUS, triggerAutomationRule } from '../../src/routes/lifecycle-automation.js';

describe('TRIGGER_TYPES', () => {
  it('has all expected triggers', () => {
    assert.strictEqual(TRIGGER_TYPES.POLICY_CREATED, 'policy_created');
    assert.strictEqual(TRIGGER_TYPES.POLICY_UPDATED, 'policy_updated');
    assert.strictEqual(TRIGGER_TYPES.POLICY_DELETED, 'policy_deleted');
    assert.strictEqual(TRIGGER_TYPES.EVALUATION_RESULT, 'evaluation_result');
    assert.strictEqual(TRIGGER_TYPES.SCHEDULE, 'schedule');
    assert.strictEqual(TRIGGER_TYPES.MANUAL, 'manual');
    assert.strictEqual(TRIGGER_TYPES.WEBHOOK, 'webhook');
    assert.strictEqual(TRIGGER_TYPES.TRUST_CHANGE, 'trust_change');
    assert.strictEqual(TRIGGER_TYPES.VIOLATION_DETECTED, 'violation_detected');
  });
});

describe('ACTION_TYPES', () => {
  it('has all expected actions', () => {
    assert.strictEqual(ACTION_TYPES.APPROVE, 'approve');
    assert.strictEqual(ACTION_TYPES.REJECT, 'reject');
    assert.strictEqual(ACTION_TYPES.NOTIFY, 'notify');
    assert.strictEqual(ACTION_TYPES.ESCALATE, 'escalate');
    assert.strictEqual(ACTION_TYPES.LOG, 'log');
    assert.strictEqual(ACTION_TYPES.BLOCK, 'block');
    assert.strictEqual(ACTION_TYPES.AUDIT, 'audit');
    assert.strictEqual(ACTION_TYPES.COMPOSE, 'compose');
  });
});

describe('APPROVAL_STATUS', () => {
  it('has all expected statuses', () => {
    assert.strictEqual(APPROVAL_STATUS.PENDING, 'pending');
    assert.strictEqual(APPROVAL_STATUS.APPROVED, 'approved');
    assert.strictEqual(APPROVAL_STATUS.REJECTED, 'rejected');
    assert.strictEqual(APPROVAL_STATUS.EXPIRED, 'expired');
  });
});

describe('triggerAutomationRule', () => {
  it('returns not found for unknown rule', () => {
    const result = triggerAutomationRule('nonexistent', {});
    assert.strictEqual(result.success, false);
    assert.ok(result.reason.includes('not found'));
  });
});