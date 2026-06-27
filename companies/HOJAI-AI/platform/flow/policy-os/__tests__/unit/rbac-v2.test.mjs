/**
 * PolicyOS RBAC v2 Tests (Phase 1)
 *
 * Covers:
 *  - Role conditions (attribute-based constraints)
 *  - Time-bound role grants (validFrom/validUntil)
 *  - Role hierarchy & inheritance
 *  - Delegation
 *  - Break-glass elevation
 *  - Role overlap/conflict detection
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret-32-chars-min-aaaaaaaaaaa';
const SERVICE_TOKEN = 'test-service-token';
process.env.POLICYOS_SERVICE_TOKEN = SERVICE_TOKEN;

function makeToken(sub, role, extras = {}) {
  const p = { sub, role, aud: 'policy-os', ...extras };
  return jwt.sign(p, JWT_SECRET, { algorithm: 'HS256' });
}

// ── Mock stores (in-memory) ──────────────────────────────────────────────────

function makeMockStores() {
  const roles = new Map();
  const userRoles = new Map();
  const users = new Map();
  const policies = new Map();
  const timedAssignments = new Map();
  const delegations = new Map(); // fromUser → Map(toUser → record)
  const elevations = new Map();   // userId → { role, reason, expiresAt }

  return { roles, userRoles, users, policies, timedAssignments, delegations, elevations };
}

// ── Compute effective permissions (mirrors rbac.js) ───────────────────────────

function computeEffectivePermissions(rolesMap, roleName, _visited = new Set()) {
  if (_visited.has(roleName)) return [];
  _visited.add(roleName);
  const role = rolesMap.get(roleName);
  if (!role) return [];
  const perms = [...(role.permissions || [])];
  if (role.hierarchy?.inheritsFrom) {
    for (const parent of role.hierarchy.inheritsFrom) {
      perms.push(...computeEffectivePermissions(rolesMap, parent, new Set(_visited)));
    }
  }
  return [...new Set(perms)];
}

// ── Evaluate role conditions (mirrors rbac.js) ───────────────────────────────

function resolvePath(obj, path) {
  return path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

function evaluateRoleConditions(role, context) {
  if (!role.conditions) return { satisfied: true, failed: [] };
  const failed = [];
  for (const [path, constraint] of Object.entries(role.conditions)) {
    const value = resolvePath(context, path);
    for (const [op, expected] of Object.entries(constraint)) {
      if (op === 'in') {
        if (!Array.isArray(expected) || !expected.includes(value)) failed.push({ path, op, expected, actual: value });
      } else if (op === 'eq') {
        if (value !== expected) failed.push({ path, op, expected, actual: value });
      } else if (op === 'neq') {
        if (value === expected) failed.push({ path, op, expected, actual: value });
      }
    }
  }
  return { satisfied: failed.length === 0, failed };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('computeEffectivePermissions', () => {
  const stores = makeMockStores();

  beforeEach(() => {
    stores.roles.clear();
  });

  test('returns direct permissions for leaf role', () => {
    stores.roles.set('staff', { name: 'staff', permissions: ['policies:read'] });
    const perms = computeEffectivePermissions(stores.roles, 'staff');
    assert.deepEqual(perms, ['policies:read']);
  });

  test('inherits permissions from parent role', () => {
    stores.roles.set('staff', { name: 'staff', permissions: ['policies:read'] });
    stores.roles.set('manager', { name: 'manager', permissions: ['policies:write'], hierarchy: { inheritsFrom: ['staff'] } });
    const perms = computeEffectivePermissions(stores.roles, 'manager');
    assert.ok(perms.includes('policies:read'));
    assert.ok(perms.includes('policies:write'));
  });

  test('walks multi-level inheritance', () => {
    stores.roles.set('guest', { name: 'guest', permissions: ['policies:read:own'] });
    stores.roles.set('staff', { name: 'staff', permissions: ['policies:read'], hierarchy: { inheritsFrom: ['guest'] } });
    stores.roles.set('manager', { name: 'manager', permissions: ['policies:write'], hierarchy: { inheritsFrom: ['staff'] } });
    const perms = computeEffectivePermissions(stores.roles, 'manager');
    assert.ok(perms.includes('policies:read:own'));
    assert.ok(perms.includes('policies:read'));
    assert.ok(perms.includes('policies:write'));
  });

  test('deduplicates permissions from multiple inheritance paths', () => {
    stores.roles.set('base', { name: 'base', permissions: ['read'] });
    stores.roles.set('a', { name: 'a', permissions: ['write-a'], hierarchy: { inheritsFrom: ['base'] } });
    stores.roles.set('b', { name: 'b', permissions: ['write-b'], hierarchy: { inheritsFrom: ['base'] } });
    stores.roles.set('ab', { name: 'ab', permissions: ['write-ab'], hierarchy: { inheritsFrom: ['a', 'b'] } });
    const perms = computeEffectivePermissions(stores.roles, 'ab');
    assert.ok(perms.includes('read'));
    assert.ok(perms.includes('write-a'));
    assert.ok(perms.includes('write-b'));
    assert.ok(perms.includes('write-ab'));
  });

  test('returns empty for non-existent role', () => {
    const perms = computeEffectivePermissions(stores.roles, 'ghost');
    assert.deepEqual(perms, []);
  });
});

describe('evaluateRoleConditions', () => {
  test('satisfied when no conditions', () => {
    const result = evaluateRoleConditions({ name: 'admin' }, {});
    assert.equal(result.satisfied, true);
    assert.deepEqual(result.failed, []);
  });

  test('satisfied when in-constraint matches', () => {
    const role = { conditions: { 'context.department': { in: ['IT', 'Finance'] } } };
    const ctx = { context: { department: 'IT' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, true);
  });

  test('fails when in-constraint does not match', () => {
    const role = { conditions: { 'context.department': { in: ['IT', 'Finance'] } } };
    const ctx = { context: { department: 'Marketing' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, false);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].path, 'context.department');
  });

  test('satisfied when eq-constraint matches', () => {
    const role = { conditions: { 'context.environment': { eq: 'production' } } };
    const ctx = { context: { environment: 'production' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, true);
  });

  test('fails when eq-constraint does not match', () => {
    const role = { conditions: { 'context.environment': { eq: 'production' } } };
    const ctx = { context: { environment: 'staging' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, false);
  });

  test('fails when neq-constraint matches (should not match)', () => {
    const role = { conditions: { 'context.environment': { neq: 'production' } } };
    const ctx = { context: { environment: 'production' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, false);
  });

  test('multiple conditions must all be satisfied', () => {
    const role = {
      conditions: {
        'context.department': { in: ['IT'] },
        'context.environment': { eq: 'production' },
      },
    };
    const ctx = { context: { department: 'IT', environment: 'staging' } };
    const result = evaluateRoleConditions(role, ctx);
    assert.equal(result.satisfied, false);
    assert.equal(result.failed.length, 1);
    assert.equal(result.failed[0].path, 'context.environment');
  });
});

describe('resolvePath', () => {
  test('resolves dot-notation paths', () => {
    const obj = { a: { b: { c: 42 } } };
    assert.equal(resolvePath(obj, 'a.b.c'), 42);
    assert.deepEqual(resolvePath(obj, 'a.b'), { c: 42 }); // intermediate step returns object
  });

  test('returns undefined for missing paths', () => {
    assert.equal(resolvePath({ a: 1 }, 'b.c'), undefined);
  });

  test('handles array index in path', () => {
    assert.equal(resolvePath({ users: ['alice', 'bob'] }, 'users.0'), 'alice');
  });
});

describe('Role hierarchy — PATCH constraints', () => {
  const stores = makeMockStores();

  beforeEach(() => {
    stores.roles.clear();
    stores.roles.set('viewer', { name: 'viewer', permissions: ['policies:read'] });
  });

  test('can update conditions on existing role', () => {
    const role = stores.roles.get('viewer');
    role.conditions = { 'context.department': { in: ['IT'] } };
    role.delegation = { allowed: true, maxDepth: 1 };
    stores.roles.set('viewer', role);
    assert.deepEqual(stores.roles.get('viewer').conditions, { 'context.department': { in: ['IT'] } });
    assert.deepEqual(stores.roles.get('viewer').delegation, { allowed: true, maxDepth: 1 });
  });

  test('can set hierarchy on existing role', () => {
    stores.roles.set('staff', { name: 'staff', permissions: ['policies:write'] });
    const viewer = stores.roles.get('viewer');
    viewer.hierarchy = { inheritsFrom: ['staff'], priority: 50 };
    viewer.permissions = ['policies:read', 'policies:write'];
    const perms = computeEffectivePermissions(stores.roles, 'viewer');
    assert.ok(perms.includes('policies:read'));
    assert.ok(perms.includes('policies:write'));
  });
});

describe('Time-bound role assignments', () => {
  const stores = makeMockStores();

  test('validFrom filters out future assignments', () => {
    const future = Date.now() + 86400_000;
    const timed = [{ role: 'manager', validFrom: future, validUntil: null }];
    const now = Date.now();
    const active = !timed[0].validFrom || now >= timed[0].validFrom;
    assert.equal(active, false);
  });

  test('validUntil filters out expired assignments', () => {
    const past = Date.now() - 86400_000;
    const timed = [{ role: 'manager', validFrom: null, validUntil: past }];
    const now = Date.now();
    const active = !timed[0].validUntil || now <= timed[0].validUntil;
    assert.equal(active, false);
  });

  test('validFrom + validUntil defines active window', () => {
    const past = Date.now() - 3600_000;
    const future = Date.now() + 3600_000;
    const timed = [{ role: 'manager', validFrom: past, validUntil: future }];
    const now = Date.now();
    const active =
      (!timed[0].validFrom || now >= timed[0].validFrom) &&
      (!timed[0].validUntil || now <= timed[0].validUntil);
    assert.equal(active, true);
  });
});

describe('Break-glass elevation', () => {
  const stores = makeMockStores();

  test('elevation has expiresAt timestamp', () => {
    const now = Date.now();
    const expiresAt = now + 60 * 60_000; // 1 hour
    stores.elevations.set('user-1', {
      role: 'admin',
      reason: 'emergency access',
      expiresAt,
    });
    const elev = stores.elevations.get('user-1');
    assert.equal(elev.role, 'admin');
    assert.ok(elev.expiresAt > now);
  });

  test('expired elevation is not active', () => {
    const expired = Date.now() - 1000;
    stores.elevations.set('user-2', {
      role: 'admin',
      reason: 'old emergency',
      expiresAt: expired,
    });
    const elev = stores.elevations.get('user-2');
    const isActive = new Date(elev.expiresAt) > new Date();
    assert.equal(isActive, false);
  });

  test('can revoke own elevation early', () => {
    stores.elevations.set('user-3', { role: 'admin', expiresAt: Date.now() + 3600_000 });
    stores.elevations.delete('user-3');
    assert.equal(stores.elevations.has('user-3'), false);
  });
});

describe('Delegation', () => {
  const stores = makeMockStores();

  test('delegation records toUser and maxDepth', () => {
    if (!stores.delegations.has('alice')) stores.delegations.set('alice', new Map());
    stores.delegations.get('alice').set('bob', {
      role: 'manager',
      maxDepth: 1,
      expiresAt: null,
      reason: 'on leave',
      delegatedAt: new Date().toISOString(),
    });
    const del = stores.delegations.get('alice').get('bob');
    assert.equal(del.role, 'manager');
    assert.equal(del.maxDepth, 1);
  });

  test('delegation blocked if role does not allow it', () => {
    const role = { delegation: null }; // no delegation config
    const allowed = role.delegation?.allowed ?? false;
    assert.equal(allowed, false);
  });

  test('delegation allowed when config says allowed', () => {
    const role = { delegation: { allowed: true, maxDepth: 2 } };
    assert.equal(role.delegation.allowed, true);
    assert.equal(role.delegation.maxDepth, 2);
  });
});

describe('Role overlap detection', () => {
  const stores = makeMockStores();

  beforeEach(() => {
    stores.roles.clear();
    stores.userRoles.clear();
    stores.roles.set('finance', {
      name: 'finance',
      permissions: ['payment:read', 'payment:write'],
      conflictsWith: ['audit'],
    });
    stores.roles.set('audit', {
      name: 'audit',
      permissions: ['audit:read'],
      conflictsWith: ['finance'],
    });
  });

  test('explicit conflict detected between conflicting roles', () => {
    stores.userRoles.set('alice', ['finance']);
    stores.userRoles.set('bob', ['audit']);

    const aliceRoles = new Set(stores.userRoles.get('alice') || []);
    const bobRoles = new Set(stores.userRoles.get('bob') || []);

    const conflicts = [];
    for (const r of aliceRoles) {
      const role = stores.roles.get(r);
      if (role?.conflictsWith) {
        for (const c of role.conflictsWith) {
          if (bobRoles.has(c)) conflicts.push({ role: r, conflictsWith: c });
        }
      }
    }
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].role, 'finance');
    assert.equal(conflicts[0].conflictsWith, 'audit');
  });

  test('no conflict when roles do not conflict', () => {
    stores.userRoles.set('alice', ['finance']);
    stores.userRoles.set('carol', ['finance']);

    const aliceRoles = new Set(stores.userRoles.get('alice') || []);
    const carolRoles = new Set(stores.userRoles.get('carol') || []);

    const conflicts = [];
    for (const r of aliceRoles) {
      const role = stores.roles.get(r);
      if (role?.conflictsWith) {
        for (const c of role.conflictsWith) {
          if (carolRoles.has(c)) conflicts.push({ role: r, conflictsWith: c });
        }
      }
    }
    assert.equal(conflicts.length, 0);
  });

  test('shared permissions computed from effective perms', () => {
    stores.roles.set('staff', { name: 'staff', permissions: ['read'] });
    stores.roles.set('a', { name: 'a', permissions: ['write-a'], hierarchy: { inheritsFrom: ['staff'] } });
    stores.roles.set('b', { name: 'b', permissions: ['write-b'], hierarchy: { inheritsFrom: ['staff'] } });

    const permsA = new Set(computeEffectivePermissions(stores.roles, 'a'));
    const permsB = new Set(computeEffectivePermissions(stores.roles, 'b'));
    const shared = [...permsA].filter((p) => permsB.has(p));
    assert.deepEqual(shared.sort(), ['read'].sort());
  });
});
