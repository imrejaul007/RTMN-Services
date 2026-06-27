/**
 * PolicyOS — Twin Governance tests (Phase 7)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VERSION_STATES, evaluateTwinAccess } from '../../src/routes/twin-governance.js';

describe('VERSION_STATES', () => {
  it('has all expected states', () => {
    assert.strictEqual(VERSION_STATES.DRAFT, 'draft');
    assert.strictEqual(VERSION_STATES.PUBLISHED, 'published');
    assert.strictEqual(VERSION_STATES.ARCHIVED, 'archived');
    assert.strictEqual(VERSION_STATES.DELETED, 'deleted');
  });
});

describe('evaluateTwinAccess', () => {
  it('returns not found for unknown policy', () => {
    const result = evaluateTwinAccess('nonexistent', { subject: 'user:1', action: 'read', twinType: 'customer' });
    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason.includes('not found'));
  });
});