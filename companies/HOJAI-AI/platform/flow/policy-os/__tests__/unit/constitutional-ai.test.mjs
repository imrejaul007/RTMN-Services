/**
 * PolicyOS — Constitutional AI tests (Phase 8)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CONSTITUTION_STATUS, REVIEW_STATUS, HARM_CATEGORIES } from '../../src/routes/constitutional-ai.js';

describe('CONSTITUTION_STATUS', () => {
  it('has all expected statuses', () => {
    assert.strictEqual(CONSTITUTION_STATUS.DRAFT, 'draft');
    assert.strictEqual(CONSTITUTION_STATUS.REVIEW, 'review');
    assert.strictEqual(CONSTITUTION_STATUS.ACTIVE, 'active');
    assert.strictEqual(CONSTITUTION_STATUS.SUSPENDED, 'suspended');
    assert.strictEqual(CONSTITUTION_STATUS.ARCHIVED, 'archived');
  });
});

describe('REVIEW_STATUS', () => {
  it('has all expected statuses', () => {
    assert.strictEqual(REVIEW_STATUS.PENDING, 'pending');
    assert.strictEqual(REVIEW_STATUS.APPROVED, 'approved');
    assert.strictEqual(REVIEW_STATUS.REJECTED, 'rejected');
    assert.strictEqual(REVIEW_STATUS.REVISION_REQUESTED, 'revision_requested');
  });
});

describe('HARM_CATEGORIES', () => {
  it('has violence category', () => {
    assert.strictEqual(HARM_CATEGORIES.VIOLENCE.id, 'violence');
    assert.strictEqual(HARM_CATEGORIES.VIOLENCE.severity, 'critical');
  });

  it('has hate speech category', () => {
    assert.strictEqual(HARM_CATEGORIES.HATE_SPEECH.id, 'hate_speech');
    assert.strictEqual(HARM_CATEGORIES.HATE_SPEECH.severity, 'critical');
  });

  it('has self-harm category', () => {
    assert.strictEqual(HARM_CATEGORIES.SELF_HARM.id, 'self_harm');
    assert.strictEqual(HARM_CATEGORIES.SELF_HARM.severity, 'critical');
  });

  it('has illegal category', () => {
    assert.strictEqual(HARM_CATEGORIES.ILLEGAL.id, 'illegal');
    assert.strictEqual(HARM_CATEGORIES.ILLEGAL.severity, 'critical');
  });

  it('has privacy category', () => {
    assert.strictEqual(HARM_CATEGORIES.PRIVACY.id, 'privacy');
    assert.strictEqual(HARM_CATEGORIES.PRIVACY.severity, 'high');
  });

  it('has manipulation category', () => {
    assert.strictEqual(HARM_CATEGORIES.MANIPULATION.id, 'manipulation');
  });

  it('has misinformation category', () => {
    assert.strictEqual(HARM_CATEGORIES.MISINFORMATION.id, 'misinformation');
    assert.strictEqual(HARM_CATEGORIES.MISINFORMATION.severity, 'medium');
  });

  it('has 10 harm categories', () => {
    assert.strictEqual(Object.keys(HARM_CATEGORIES).length, 10);
  });

  it('each category has id, name, severity, description', () => {
    for (const [key, cat] of Object.entries(HARM_CATEGORIES)) {
      assert.ok(cat.id, `${key} has id`);
      assert.ok(cat.name, `${key} has name`);
      assert.ok(cat.severity, `${key} has severity`);
      assert.ok(cat.description, `${key} has description`);
    }
  });
});