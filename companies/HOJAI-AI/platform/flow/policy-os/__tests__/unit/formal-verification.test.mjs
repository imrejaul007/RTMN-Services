/**
 * PolicyOS — Formal Verification Engine Tests (Phase P1)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  verifyPolicySet,
  verifyPolicy,
  detectConflicts,
  detectShadows,
  detectSubsumption,
  detectDeadPolicies,
  detectPrivilegeEscalation,
  detectCyclicRoleHierarchy,
  proveSafetyClaim,
  detectCoverageGaps,
  ISSUE_SEVERITY,
  ISSUE_TYPE,
} = await import('../../src/services/formal-verification.js');

// ── Helpers ─────────────────────────────────────────────────────────────

function makePolicy(overrides = {}) {
  return {
    id: 'test-pol',
    name: 'Test Policy',
    effect: 'allow',
    resources: ['documents:*'],
    actions: ['read'],
    conditions: [],
    status: 'published',
    priority: 50,
    version: '1.0',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── detectConflicts ────────────────────────────────────────────────────

describe('detectConflicts', () => {

  it('detects allow/deny conflict on same resource+action', () => {
    const policies = [
      makePolicy({ id: 'allow-read', effect: 'allow', resources: ['finance:*'], actions: ['read'] }),
      makePolicy({ id: 'deny-read', effect: 'deny', resources: ['finance:*'], actions: ['read'] }),
    ];
    const map = buildIndex(policies);
    const issues = detectConflicts(policies, map);
    assert.strictEqual(issues.length >= 1, true, `Expected conflict, got: ${issues.length}`);
    assert.strictEqual(issues[0].type, 'conflict');
    assert.strictEqual(issues[0].severity, 'error');
  });

  it('no conflict when only allow policies', () => {
    const policies = [
      makePolicy({ id: 'allow-1', effect: 'allow', resources: ['docs:*'], actions: ['read'] }),
      makePolicy({ id: 'allow-2', effect: 'allow', resources: ['docs:*'], actions: ['read'] }),
    ];
    const map = buildIndex(policies);
    const issues = detectConflicts(policies, map);
    assert.strictEqual(issues.length, 0);
  });

  it('no conflict when allow/deny on different resources', () => {
    const policies = [
      makePolicy({ id: 'allow', effect: 'allow', resources: ['finance:*'], actions: ['read'] }),
      makePolicy({ id: 'deny', effect: 'deny', resources: ['hr:*'], actions: ['read'] }),
    ];
    const map = buildIndex(policies);
    const issues = detectConflicts(policies, map);
    assert.strictEqual(issues.length, 0);
  });

  it('no conflict when allow/deny on different actions', () => {
    const policies = [
      makePolicy({ id: 'allow', effect: 'allow', resources: ['docs:*'], actions: ['read'] }),
      makePolicy({ id: 'deny', effect: 'deny', resources: ['docs:*'], actions: ['write'] }),
    ];
    const map = buildIndex(policies);
    const issues = detectConflicts(policies, map);
    assert.strictEqual(issues.length, 0);
  });

  it('wildcard deny conflicts with specific allow', () => {
    const policies = [
      makePolicy({ id: 'allow', effect: 'allow', resources: ['finance:report:*'], actions: ['read'] }),
      makePolicy({ id: 'deny', effect: 'deny', resources: ['finance:*'], actions: ['*'] }),
    ];
    const map = buildIndex(policies);
    const issues = detectConflicts(policies, map);
    assert.strictEqual(issues.length >= 1, true, `Expected conflict, got: ${issues.length}`);
  });
});

// ── detectDeadPolicies ────────────────────────────────────────────────

describe('detectDeadPolicies', () => {

  it('detects time range with impossible bounds', () => {
    const policy = makePolicy({
      id: 'dead-time',
      conditions: [{ field: 'time.hour', gte: 18, lte: 9 }],
    });
    const issues = detectDeadPolicies([policy]);
    assert.strictEqual(issues.length >= 1, true, `Expected dead policy, got: ${issues.length}`);
  });

  it('detects empty IN array', () => {
    const policy = makePolicy({
      id: 'dead-in',
      conditions: [{ field: 'department', operator: 'in', value: [] }],
    });
    const issues = detectDeadPolicies([policy]);
    assert.strictEqual(issues.length >= 1, true, `Expected dead policy, got: ${issues.length}`);
  });

  it('passes valid policy with no conditions', () => {
    const policy = makePolicy({ id: 'valid', conditions: [] });
    const issues = detectDeadPolicies([policy]);
    assert.strictEqual(issues.length, 0);
  });

  it('passes policy with valid time range', () => {
    const policy = makePolicy({
      id: 'valid-time',
      conditions: [{ field: 'time.hour', gte: 9, lte: 18 }],
    });
    const issues = detectDeadPolicies([policy]);
    assert.strictEqual(issues.length, 0);
  });
});

// ── detectPrivilegeEscalation ─────────────────────────────────────

describe('detectPrivilegeEscalation', () => {

  it('detects allow with fewer conditions than deny', () => {
    const policies = [
      makePolicy({
        id: 'allow-all',
        effect: 'allow',
        resources: ['payroll:*'],
        actions: ['read', 'write'],
        conditions: [],
      }),
      makePolicy({
        id: 'deny-restricted',
        effect: 'deny',
        resources: ['payroll:*'],
        actions: ['read'],
        conditions: [{ field: 'role', operator: 'eq', value: 'employee' }],
      }),
    ];
    const issues = detectPrivilegeEscalation(policies);
    assert.strictEqual(issues.length >= 1, true, `Expected escalation, got: ${issues.length}`);
    assert.strictEqual(issues[0].type, 'privilege_escalation');
  });

  it('no escalation when allow has more conditions than deny', () => {
    const policies = [
      makePolicy({
        id: 'allow-restricted',
        effect: 'allow',
        resources: ['payroll:*'],
        actions: ['read'],
        conditions: [{ field: 'role', operator: 'eq', value: 'manager' }],
      }),
      makePolicy({
        id: 'deny-all',
        effect: 'deny',
        resources: ['payroll:*'],
        actions: ['read'],
        conditions: [],
      }),
    ];
    const issues = detectPrivilegeEscalation(policies);
    // Allow with MORE conditions is more restrictive, so no escalation
    assert.strictEqual(issues.length, 0);
  });
});

// ── detectCyclicRoleHierarchy ────────────────────────────────────────

describe('detectCyclicRoleHierarchy', () => {

  it('detects direct cycle A→B→A', () => {
    const roles = new Map([
      ['admin', { name: 'admin', hierarchy: ['superadmin'] }],
      ['superadmin', { name: 'superadmin', hierarchy: ['admin'] }],
    ]);
    const issues = detectCyclicRoleHierarchy(roles);
    assert.strictEqual(issues.length >= 1, true, `Expected cycle, got: ${issues.length}`);
    assert.strictEqual(issues[0].type, 'circular_role_hierarchy');
  });

  it('detects indirect cycle A→B→C→A', () => {
    const roles = new Map([
      ['junior', { name: 'junior', hierarchy: ['senior'] }],
      ['senior', { name: 'senior', hierarchy: ['lead'] }],
      ['lead', { name: 'lead', hierarchy: ['junior'] }],
    ]);
    const issues = detectCyclicRoleHierarchy(roles);
    assert.strictEqual(issues.length >= 1, true);
  });

  it('passes valid non-cyclic hierarchy', () => {
    const roles = new Map([
      ['employee', { name: 'employee', hierarchy: [] }],
      ['manager', { name: 'manager', hierarchy: ['employee'] }],
      ['director', { name: 'director', hierarchy: ['manager'] }],
    ]);
    const issues = detectCyclicRoleHierarchy(roles);
    assert.strictEqual(issues.length, 0);
  });

  it('passes empty roles map', () => {
    const roles = new Map();
    const issues = detectCyclicRoleHierarchy(roles);
    assert.strictEqual(issues.length, 0);
  });
});

// ── proveSafetyClaim ────────────────────────────────────────────────

describe('proveSafetyClaim', () => {

  it('holds when sensitive resources have deny protection', () => {
    const policies = [
      makePolicy({
        id: 'allow-finance',
        effect: 'allow',
        resources: ['payroll:read:*'],
        actions: ['read'],
        conditions: [],
      }),
      makePolicy({
        id: 'deny-employee',
        effect: 'deny',
        resources: ['payroll:read:*'],
        actions: ['read'],
        conditions: [{ field: 'role', operator: 'eq', value: 'employee' }],
      }),
    ];

    const claim = {
      id: 'no-employee-payroll',
      description: 'Employees cannot read payroll',
      sensitiveResources: ['payroll:read:*'],
    };

    const result = proveSafetyClaim(claim, policies);
    assert.strictEqual(result.holds, true, `Expected holds, got: ${JSON.stringify(result)}`);
  });

  it('fails when sensitive resources lack deny protection', () => {
    const policies = [
      makePolicy({
        id: 'allow-all',
        effect: 'allow',
        resources: ['payroll:*'],
        actions: ['*'],
        conditions: [],
      }),
    ];

    const claim = {
      id: 'no-employee-payroll',
      description: 'Employees cannot read payroll',
      sensitiveResources: ['payroll:*'],
    };

    const result = proveSafetyClaim(claim, policies);
    assert.strictEqual(result.holds, false, `Expected violation, got: ${JSON.stringify(result)}`);
  });

  it('skips when no sensitive resources in claim', () => {
    const policies = [makePolicy({ id: 'allow', effect: 'allow' })];
    const claim = {
      id: 'generic',
      description: 'Generic claim',
      sensitiveResources: [],
    };
    const result = proveSafetyClaim(claim, policies);
    assert.strictEqual(result.holds, true);
  });
});

// ── verifyPolicySet (integration) ──────────────────────────────────

describe('verifyPolicySet', () => {

  it('returns ok=true for clean policy set', () => {
    const policies = [
      makePolicy({ id: 'allow-docs', effect: 'allow', resources: ['docs:*'], actions: ['read'] }),
      makePolicy({ id: 'allow-hr', effect: 'allow', resources: ['hr:*'], actions: ['read'] }),
      makePolicy({ id: 'deny-hr-write', effect: 'deny', resources: ['hr:*'], actions: ['write'] }),
    ];
    const roles = new Map([['viewer', { name: 'viewer', hierarchy: [] }]]);

    const result = verifyPolicySet({ policies, roles });
    assert.strictEqual(result.ok, true, `Expected ok, got errors: ${JSON.stringify(result.summary)}`);
    assert.strictEqual(result.issues.length >= 0, true);
  });

  it('returns ok=false when conflicts exist', () => {
    const policies = [
      makePolicy({ id: 'allow', effect: 'allow', resources: ['docs:*'], actions: ['read'] }),
      makePolicy({ id: 'deny', effect: 'deny', resources: ['docs:*'], actions: ['read'] }),
    ];
    const result = verifyPolicySet({ policies, roles: new Map() });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.summary.conflicts, 1);
  });

  it('returns summary with all counts', () => {
    const policies = [makePolicy({ id: 'test', effect: 'allow' })];
    const result = verifyPolicySet({ policies, roles: new Map() });
    assert.strictEqual(result.summary.total, 1);
    assert.ok(typeof result.summary.errors === 'number');
    assert.ok(typeof result.summary.warnings === 'number');
  });
});

// ── verifyPolicy (single policy) ────────────────────────────────────

describe('verifyPolicy', () => {

  it('passes clean policy', () => {
    const store = new Map([['existing', makePolicy({ id: 'existing', effect: 'allow' })]]);
    const newPol = makePolicy({ id: 'new', effect: 'allow', resources: ['docs:*'], actions: ['read'] });

    const result = verifyPolicy(newPol, { policies: store, roles: new Map() });
    assert.strictEqual(result.ok, true);
  });

  it('catches conflict with existing policy', () => {
    const store = new Map([
      ['existing', makePolicy({ id: 'existing', effect: 'deny', resources: ['docs:*'], actions: ['read'] })],
    ]);
    const newPol = makePolicy({ id: 'new', effect: 'allow', resources: ['docs:*'], actions: ['read'] });

    const result = verifyPolicy(newPol, { policies: store, roles: new Map() });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.issues.length >= 1, true);
  });
});

// ── Constants ───────────────────────────────────────────────────

describe('ISSUE_TYPE constants', () => {
  it('exports all expected issue types', () => {
    assert.strictEqual(typeof ISSUE_TYPE.CONFLICT, 'string');
    assert.strictEqual(typeof ISSUE_TYPE.DEAD_POLICY, 'string');
    assert.strictEqual(typeof ISSUE_TYPE.PRIVILEGE_ESCALATION, 'string');
    assert.strictEqual(typeof ISSUE_TYPE.SHADOW, 'string');
    assert.strictEqual(typeof ISSUE_TYPE.SUBSUMPTION, 'string');
    assert.strictEqual(typeof ISSUE_TYPE.CIRCULAR_ROLE_HIERARCHY, 'string');
  });

  it('exports all severity levels', () => {
    assert.strictEqual(ISSUE_SEVERITY.ERROR, 'error');
    assert.strictEqual(ISSUE_SEVERITY.WARNING, 'warning');
    assert.strictEqual(ISSUE_SEVERITY.INFO, 'info');
  });
});

// ── Helper: buildIndex (mirrors service internals) ──────────────────

function buildIndex(policies) {
  const map = new Map();
  for (const policy of policies) {
    if (policy.status === 'archived' || policy.status === 'retired') continue;
    const resources = Array.isArray(policy.resources) ? policy.resources : [policy.resources || '*'];
    const actions = Array.isArray(policy.actions) ? policy.actions : [policy.actions || '*'];
    const effect = policy.effect === 'deny' ? 'deny' : 'allow';

    for (const resource of resources) {
      if (!map.has(resource)) {
        map.set(resource, { allow: new Set(), deny: new Set(), policyIds: new Set() });
      }
      const entry = map.get(resource);
      for (const action of actions) {
        if (effect === 'allow') entry.allow.add(action);
        else entry.deny.add(action);
      }
      entry.policyIds.add(policy.id);
    }
  }
  return map;
}
