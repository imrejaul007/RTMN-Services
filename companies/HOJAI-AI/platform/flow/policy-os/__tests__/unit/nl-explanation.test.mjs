/**
 * PolicyOS — NL Explanation tests (Phase 2.5)
 * Tests for POST /api/policies/explain and GET /api/policies/explain/:decisionId
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatExplanation } from '../../src/routes/nl-explanation.js';

describe('formatExplanation — JSON format', () => {
  it('returns explanation as-is for json format', () => {
    const exp = { summary: 'Allowed', effect: 'allow', explanations: [], matchedPolicies: [] };
    const result = formatExplanation(exp, 'json');
    assert.deepStrictEqual(result, exp);
  });

  it('returns null for null input', () => {
    assert.strictEqual(formatExplanation(null, 'json'), null);
    assert.strictEqual(formatExplanation(undefined, 'json'), null);
  });
});

describe('formatExplanation — summary format', () => {
  it('returns only the summary text', () => {
    const exp = {
      summary: '✅ Allowed — the matching policy permits this action.',
      effect: 'allow',
      explanations: [],
      matchedPolicies: [],
    };
    const result = formatExplanation(exp, 'summary');
    assert.strictEqual(result, exp.summary);
  });

  it('returns deny summary', () => {
    const exp = {
      summary: '❌ Denied — no matching policy found.',
      effect: 'deny',
      explanations: [],
      matchedPolicies: [],
    };
    const result = formatExplanation(exp, 'summary');
    assert.strictEqual(result, exp.summary);
  });
});

describe('formatExplanation — bullet format', () => {
  it('produces bullet points', () => {
    const exp = {
      effect: 'allow',
      summary: '✅ ALLOWED',
      explanations: [{
        type: 'allow',
        policyId: 'p1',
        policyName: 'Admin Read',
        conditions: [
          { attribute: 'user.role', operator: 'eq', value: 'admin' },
          { attribute: 'context.amount', operator: 'lte', value: 50000 },
        ],
      }],
      matchedPolicies: [{ id: 'p1', name: 'Admin Read', effect: 'allow' }],
    };
    const result = formatExplanation(exp, 'bullet');
    assert.ok(result.includes('✅ ALLOW'), 'includes allow verdict');
    assert.ok(result.includes('Admin Read'), 'includes policy name');
    assert.ok(result.includes('user.role'), 'includes condition');
  });

  it('produces deny bullets', () => {
    const exp = {
      effect: 'deny',
      summary: '❌ DENIED',
      explanations: [{
        type: 'deny',
        policyId: 'p2',
        policyName: 'Block Delete',
        conditions: [],
      }],
      matchedPolicies: [{ id: 'p2', name: 'Block Delete', effect: 'deny' }],
    };
    const result = formatExplanation(exp, 'bullets');
    assert.ok(result.includes('❌ DENY'), 'includes deny verdict');
    assert.ok(result.includes('Block Delete'), 'includes policy name');
  });
});

describe('formatExplanation — detailed format', () => {
  it('produces markdown with verdict header', () => {
    const exp = {
      effect: 'allow',
      evaluatedAt: '2026-06-27T10:00:00.000Z',
      summary: '✅ ALLOWED',
      context: { user: { role: 'admin' }, action: 'read' },
      explanations: [{
        type: 'allow',
        policyId: 'test-policy',
        policyName: 'Test Policy',
        text: 'Policy: **Test Policy**',
        conditions: [{ attribute: 'user.role', operator: 'eq', value: 'admin' }],
      }],
      matchedPolicies: [{ id: 'test-policy', name: 'Test Policy', effect: 'allow' }],
    };
    const result = formatExplanation(exp, 'detailed');
    assert.ok(result.includes('# Policy Decision Explanation'), 'has header');
    assert.ok(result.includes('## Verdict: ✅ ALLOWED'), 'has verdict');
    assert.ok(result.includes('## Request Context'), 'has context section');
    assert.ok(result.includes('"role": "admin"'), 'has context JSON');
  });

  it('handles verbose format same as detailed', () => {
    const exp = {
      effect: 'deny',
      evaluatedAt: '2026-06-27T10:00:00.000Z',
      summary: '❌ DENIED',
      context: {},
      explanations: [],
      matchedPolicies: [],
    };
    const detailed = formatExplanation(exp, 'detailed');
    const verbose = formatExplanation(exp, 'verbose');
    assert.strictEqual(detailed, verbose);
  });
});

describe('formatExplanation — edge cases', () => {
  it('handles explanation with no matched policies (implicit deny)', () => {
    const exp = {
      effect: 'deny',
      summary: '❌ Denied — no matching policy found.',
      explanations: [{ type: 'implicit-deny', text: 'No policy explicitly allowed this request.', confidence: 1.0 }],
      matchedPolicies: [],
    };
    const summary = formatExplanation(exp, 'summary');
    assert.ok(summary.includes('no matching policy'));
  });

  it('includes conditions in bullet format', () => {
    const exp = {
      effect: 'allow',
      summary: 'Allowed',
      explanations: [{
        type: 'allow',
        policyId: 'multi-cond',
        policyName: 'Multi Condition',
        conditions: [
          { attribute: 'environment.time.hour', operator: 'in', value: [9, 10, 11] },
          { attribute: 'user.trustScore', operator: 'gte', value: 80 },
        ],
      }],
      matchedPolicies: [],
    };
    const result = formatExplanation(exp, 'bullets');
    assert.ok(result.includes('environment.time.hour'), 'includes hour condition');
    assert.ok(result.includes('user.trustScore'), 'includes trust score condition');
  });

  it('handles explanation without explanations array', () => {
    const exp = { effect: 'allow', summary: 'Allowed' };
    const result = formatExplanation(exp, 'summary');
    assert.strictEqual(result, 'Allowed');
  });

  it('returns explanation for unrecognized format', () => {
    const exp = { effect: 'allow', summary: 'Allowed' };
    const result = formatExplanation(exp, 'unknown');
    // Unknown format falls through to default (json)
    assert.deepStrictEqual(result, exp);
  });
});
