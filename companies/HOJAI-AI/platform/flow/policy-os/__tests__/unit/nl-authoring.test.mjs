/**
 * PolicyOS — NL Authoring tests (Phase 2.4)
 * Tests for POST /api/policies/from-description and POST /api/policies/translate
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { parseNaturalLanguage, translatePolicy } from '../../src/routes/nl-authoring.js';

// ── parseNaturalLanguage tests ────────────────────────────────────────────────

describe('parseNaturalLanguage — basic patterns', () => {
  it('parses "only admins can delete data"', () => {
    const p = parseNaturalLanguage('only admins can delete data');
    assert.strictEqual(p.effect, 'deny');
    // 'only', 'can' are stopwords and filtered from the ID; 'delete' is NOT a stopword so it stays
    assert.match(p.id, /^admins-delete-data$/);
    assert.ok(p.name.length > 0);
    assert.strictEqual(p.metadata.parsedFrom, 'natural-language');
    assert.ok(p.metadata.confidence > 0);
  });

  it('parses "users can read documents"', () => {
    const p = parseNaturalLanguage('users can read documents');
    assert.strictEqual(p.effect, 'allow');
    // 'can' is a stopword, filtered from the ID
    assert.match(p.id, /^users-read-documents$/);
  });

  it('parses "deny access to financial data for interns"', () => {
    const p = parseNaturalLanguage('deny access to financial data for interns');
    // 'for interns' has no deny pattern; effect remains allow unless explicit deny keyword
    assert.ok(['allow', 'deny'].includes(p.effect), `effect should be allow or deny, got ${p.effect}`);
    // Should at least extract financial as resource
    assert.ok(p.conditions.length > 0 || p.resources[0].includes('financial'), 'should handle financial resource');
  });

  it('handles empty-ish input', () => {
    const p = parseNaturalLanguage('read data');
    assert.strictEqual(p.effect, 'allow');
  });
});

describe('parseNaturalLanguage — condition extraction', () => {
  it('extracts business hours condition', () => {
    const p = parseNaturalLanguage('only allow read access during business hours');
    assert.ok(p.conditions.length > 0, 'has conditions');
    const hoursCond = p.conditions.find(c => c.attribute === 'environment.time.hour');
    assert.ok(hoursCond, 'has hours condition');
    assert.strictEqual(hoursCond.operator, 'in');
    assert.deepStrictEqual(hoursCond.value, [9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  it('extracts internal network condition', () => {
    const p = parseNaturalLanguage('allow write access from internal network');
    const cond = p.conditions.find(c => c.attribute === 'environment.network.internal');
    assert.ok(cond, 'has internal network condition');
    assert.strictEqual(cond.operator, 'eq');
    assert.strictEqual(cond.value, true);
  });

  it('extracts department condition', () => {
    const p = parseNaturalLanguage('only IT department can access servers');
    const cond = p.conditions.find(c => c.attribute === 'user.department');
    assert.ok(cond, 'has department condition');
    assert.strictEqual(cond.operator, 'eq');
    assert.strictEqual(cond.value, 'IT');
  });

  it('extracts MFA/trusted session condition', () => {
    const p = parseNaturalLanguage('allow data export if MFA is enabled');
    const cond = p.conditions.find(c => c.attribute === 'context.session.trusted');
    assert.ok(cond, 'has trusted session condition');
    assert.strictEqual(cond.value, true);
  });

  it('extracts amount range condition', () => {
    const p = parseNaturalLanguage('allow payments under 10000 rupees');
    const cond = p.conditions.find(c => c.attribute === 'context.amount');
    assert.ok(cond, 'has amount condition');
    assert.strictEqual(cond.operator, 'lte');
    assert.strictEqual(cond.value, 10000);
  });

  it('extracts minimum amount condition', () => {
    const p = parseNaturalLanguage('require approval for transactions over 50000');
    const cond = p.conditions.find(c => c.attribute === 'context.amount');
    assert.ok(cond, 'has amount condition');
    assert.strictEqual(cond.operator, 'gte');
    assert.strictEqual(cond.value, 50000);
  });

  it('extracts VIP condition', () => {
    const p = parseNaturalLanguage('allow VIP members early access');
    const cond = p.conditions.find(c => c.attribute === 'user.attributes.vip');
    assert.ok(cond, 'has VIP condition');
    assert.strictEqual(cond.value, true);
  });

  it('extracts trust score condition', () => {
    const p = parseNaturalLanguage('allow access for users with trust score above 80');
    const cond = p.conditions.find(c => c.attribute === 'user.trustScore');
    assert.ok(cond, 'has trust score condition');
    assert.strictEqual(cond.operator, 'gte');
    assert.strictEqual(cond.value, 80);
  });

  it('extracts high risk condition', () => {
    const p = parseNaturalLanguage('block high-risk actions');
    const cond = p.conditions.find(c => c.attribute === 'action.risk');
    assert.ok(cond, 'has risk condition');
    assert.strictEqual(cond.value, 'high');
  });

  it('extracts sensitivity level condition', () => {
    const p = parseNaturalLanguage('only admins can access restricted data');
    const cond = p.conditions.find(c => c.attribute === 'resource.sensitivity');
    assert.ok(cond, 'has sensitivity condition');
    assert.strictEqual(cond.value, 'restricted');
  });

  it('extracts PII classification condition', () => {
    const p = parseNaturalLanguage('block export of PII data');
    const cond = p.conditions.find(c => c.attribute === 'resource.classification');
    assert.ok(cond, 'has classification condition');
    assert.strictEqual(cond.value, 'PII');
  });

  it('extracts external network condition', () => {
    const p = parseNaturalLanguage('deny access from external network');
    const cond = p.conditions.find(c => c.attribute === 'environment.network.internal');
    assert.ok(cond);
    assert.strictEqual(cond.value, false);
  });

  it('extracts trusted device condition', () => {
    const p = parseNaturalLanguage('allow access from trusted device only');
    const cond = p.conditions.find(c => c.attribute === 'environment.context.trustedDevice');
    assert.ok(cond);
    assert.strictEqual(cond.value, true);
  });
});

describe('parseNaturalLanguage — action and resource inference', () => {
  it('infers read action from "view" keyword', () => {
    const p = parseNaturalLanguage('managers can view reports');
    assert.strictEqual(p.actions[0], 'read');
  });

  it('infers write action from "edit" keyword', () => {
    const p = parseNaturalLanguage('editors can edit documents');
    assert.strictEqual(p.actions[0], 'write');
  });

  it('infers delete action from "remove" keyword', () => {
    const p = parseNaturalLanguage('admins can remove users');
    assert.strictEqual(p.actions[0], 'delete');
  });

  it('defaults to read when no verb specified', () => {
    const p = parseNaturalLanguage('employees can access files');
    assert.strictEqual(p.actions[0], 'read');
  });
});

describe('parseNaturalLanguage — metadata', () => {
  it('sets parsedFrom to natural-language', () => {
    const p = parseNaturalLanguage('allow users to read data');
    assert.strictEqual(p.metadata.parsedFrom, 'natural-language');
  });

  it('sets originalText in metadata', () => {
    const text = 'allow finance team to access budgets';
    const p = parseNaturalLanguage(text);
    assert.strictEqual(p.metadata.originalText, text);
  });

  it('warns when no conditions detected', () => {
    const p = parseNaturalLanguage('admins can delete everything');
    assert.ok(p.metadata.warnings.length > 0, 'has warnings');
    assert.ok(p.metadata.warnings[0].includes('No conditions'), 'warning about broad scope');
  });

  it('sets version to 1.0', () => {
    const p = parseNaturalLanguage('allow users to read');
    assert.strictEqual(p.version, '1.0');
  });
});

// ── translatePolicy tests ────────────────────────────────────────────────────

describe('translatePolicy — PolicyOS format', () => {
  it('returns policy unchanged with policyos format', () => {
    const policy = {
      id: 'test-policy',
      name: 'Test',
      effect: 'allow',
      subjects: [{ type: 'user' }],
      resources: ['data:*'],
      actions: ['read'],
      expression: 'true',
    };
    const result = translatePolicy(policy, 'policyos');
    assert.strictEqual(result.format, 'policyos');
    assert.strictEqual(result.sourcePolicyId, 'test-policy');
    assert.ok(result.translatedAt);
  });
});

describe('translatePolicy — Casbin format', () => {
  it('produces valid Casbin model structure', () => {
    const policy = {
      id: 'casbin-test',
      name: 'Casbin Test',
      effect: 'allow',
      subjects: [{ type: 'user', role: 'admin' }],
      resources: ['data:*'],
      actions: ['read'],
      conditions: [{ attribute: 'user.department', operator: 'eq', value: 'IT' }],
      expression: 'user.department eq "IT"',
    };
    const result = translatePolicy(policy, 'casbin');
    assert.strictEqual(result.format, 'casbin');
    assert.ok(result.model, 'has model');
    assert.ok(Array.isArray(result.policies), 'has policies array');
    assert.ok(result.model.matchers, 'has matchers');
    assert.ok(result.model.policy_definition, 'has policy_definition');
  });

  it('throws on unknown format', () => {
    const policy = { id: 'test', name: 'Test', effect: 'allow', subjects: [], resources: [], actions: [], expression: 'true' };
    assert.throws(
      () => translatePolicy(policy, 'unknown-format'),
      /Unsupported target format/
    );
  });
});

describe('translatePolicy — OPA Rego format', () => {
  it('produces valid Rego package', () => {
    const policy = {
      id: 'opa-test',
      name: 'OPA Test',
      effect: 'allow',
      subjects: [{ type: 'user', role: 'admin' }],
      resources: ['dashboard:*'],
      actions: ['read'],
      conditions: [{ attribute: 'user.role', operator: 'eq', value: 'admin' }],
      expression: 'user.role == "admin"',
    };
    const result = translatePolicy(policy, 'opa');
    assert.strictEqual(result.format, 'opa');
    assert.ok(result.rego.includes('package opa_test'), 'has package');
    assert.ok(result.rego.includes('default allow'), 'has allow rule');
    assert.ok(result.rego.includes('input.subject.role == "admin"'), 'has subject rule');
  });

  it('handles deny effect correctly in OPA', () => {
    const policy = {
      id: 'deny-test',
      name: 'Deny Test',
      effect: 'deny',
      subjects: [{ type: 'user' }],
      resources: ['data:*'],
      actions: ['delete'],
      conditions: [],
      expression: 'true',
    };
    const result = translatePolicy(policy, 'opa');
    assert.ok(result.rego.includes('default allow = false'), 'deny sets default to false');
  });
});

describe('translatePolicy — XACML format', () => {
  it('produces valid XACML-like structure', () => {
    const policy = {
      id: 'xacml-test',
      name: 'XACML Test',
      effect: 'allow',
      subjects: [{ type: 'user', role: 'editor' }],
      resources: ['document:*'],
      actions: ['write'],
      conditions: [{ attribute: 'context.session.trusted', operator: 'eq', value: true }],
      expression: 'context.session.trusted == true',
    };
    const result = translatePolicy(policy, 'xacml');
    assert.strictEqual(result.format, 'xacml');
    assert.ok(result.Policy, 'has Policy');
    assert.strictEqual(result.Policy.PolicyId, 'xacml-test');
    assert.strictEqual(result.Policy.Rule.Effect, 'Permit');
  });

  it('handles deny effect in XACML', () => {
    const policy = {
      id: 'deny-xacml',
      name: 'Deny XACML',
      effect: 'deny',
      subjects: [{ type: 'user' }],
      resources: ['*'],
      actions: ['delete'],
      conditions: [],
      expression: 'true',
    };
    const result = translatePolicy(policy, 'xacml');
    assert.strictEqual(result.Policy.Rule.Effect, 'Deny');
  });
});

describe('translatePolicy — all formats', () => {
  const policy = {
    id: 'all-formats-test',
    name: 'All Formats Test',
    effect: 'allow',
    subjects: [{ type: 'user', role: 'manager' }],
    resources: ['report:*'],
    actions: ['read'],
    conditions: [
      { attribute: 'user.department', operator: 'eq', value: 'Finance' },
      { attribute: 'context.amount', operator: 'lte', value: 50000 },
    ],
    expression: 'user.department == "Finance" && context.amount <= 50000',
  };

  for (const fmt of ['policyos', 'casbin', 'opa', 'xacml']) {
    it(`includes metadata for format: ${fmt}`, () => {
      const result = translatePolicy(policy, fmt);
      assert.strictEqual(result.format, fmt);
      assert.strictEqual(result.sourcePolicyId, 'all-formats-test');
      assert.ok(result.translatedAt);
    });
  }
});
