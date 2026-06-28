/**
 * SUTAR OS — Policy OS Tests
 */
import { describe, it, expect } from 'vitest';

describe('Policy OS — Condition Evaluation', () => {
  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
  }

  function evaluateCondition(condition, context) {
    const value = getNestedValue(context, condition.field);
    switch (condition.operator) {
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gt': return value > condition.value;
      case 'gte': return value >= condition.value;
      case 'lt': return value < condition.value;
      case 'lte': return value <= condition.value;
      case 'in': return Array.isArray(condition.value) && condition.value.includes(value);
      case 'contains': return String(value).includes(String(condition.value));
      case 'required': return value !== null && value !== undefined;
      default: return true;
    }
  }

  it('evaluates eq operator', () => {
    expect(evaluateCondition({ field: 'status', operator: 'eq', value: 'active' }, { status: 'active' })).toBe(true);
    expect(evaluateCondition({ field: 'status', operator: 'eq', value: 'active' }, { status: 'inactive' })).toBe(false);
  });

  it('evaluates ne operator', () => {
    expect(evaluateCondition({ field: 'role', operator: 'ne', value: 'guest' }, { role: 'admin' })).toBe(true);
    expect(evaluateCondition({ field: 'role', operator: 'ne', value: 'guest' }, { role: 'guest' })).toBe(false);
  });

  it('evaluates gt operator', () => {
    expect(evaluateCondition({ field: 'value', operator: 'gt', value: 1000 }, { value: 2000 })).toBe(true);
    expect(evaluateCondition({ field: 'value', operator: 'gt', value: 1000 }, { value: 500 })).toBe(false);
  });

  it('evaluates gte operator', () => {
    expect(evaluateCondition({ field: 'value', operator: 'gte', value: 1000 }, { value: 1000 })).toBe(true);
  });

  it('evaluates lt operator', () => {
    expect(evaluateCondition({ field: 'value', operator: 'lt', value: 1000 }, { value: 500 })).toBe(true);
    expect(evaluateCondition({ field: 'value', operator: 'lt', value: 1000 }, { value: 1000 })).toBe(false);
  });

  it('evaluates lte operator', () => {
    expect(evaluateCondition({ field: 'value', operator: 'lte', value: 1000 }, { value: 1000 })).toBe(true);
  });

  it('evaluates in operator', () => {
    expect(evaluateCondition({ field: 'status', operator: 'in', value: ['active', 'draft'] }, { status: 'active' })).toBe(true);
    expect(evaluateCondition({ field: 'status', operator: 'in', value: ['active', 'draft'] }, { status: 'archived' })).toBe(false);
  });

  it('evaluates contains operator', () => {
    expect(evaluateCondition({ field: 'name', operator: 'contains', value: 'admin' }, { name: 'Super Admin' })).toBe(true);
    expect(evaluateCondition({ field: 'name', operator: 'contains', value: 'admin' }, { name: 'User' })).toBe(false);
  });

  it('evaluates required operator', () => {
    expect(evaluateCondition({ field: 'email', operator: 'required' }, { email: 'a@b.com' })).toBe(true);
    expect(evaluateCondition({ field: 'email', operator: 'required' }, { email: null })).toBe(false);
    expect(evaluateCondition({ field: 'email', operator: 'required' }, {})).toBe(false);
  });

  it('handles nested field paths', () => {
    expect(evaluateCondition({ field: 'metadata.tier', operator: 'eq', value: 'premium' }, { metadata: { tier: 'premium' } })).toBe(true);
  });
});

describe('Policy OS — Rule Evaluation', () => {
  function evaluateRule(rule, context) {
    if (rule.type === 'threshold') {
      const value = context[rule.field] || 0;
      if (rule.operator === 'max' && value > rule.value) {
        return { result: rule.action || 'denied', reason: rule.field + ' exceeds limit' };
      }
      if (rule.operator === 'min' && value < rule.value) {
        return { result: rule.action || 'denied', reason: rule.field + ' below minimum' };
      }
    }
    if (rule.type === 'value_limit') {
      if (context.value > rule.value) {
        return { result: rule.action || 'require_approval', reason: 'Value exceeds limit', requiresApproval: true };
      }
    }
    if (rule.type === 'role_required') {
      const userRole = context.role || 'user';
      if (!rule.roles.includes(userRole)) {
        return { result: 'denied', reason: 'Role ' + userRole + ' not authorized' };
      }
    }
    return { result: 'allowed' };
  }

  it('denies when threshold exceeded', () => {
    const rule = { type: 'threshold', field: 'dealValue', operator: 'max', value: 50000, action: 'denied' };
    expect(evaluateRule(rule, { dealValue: 60000 }).result).toBe('denied');
    expect(evaluateRule(rule, { dealValue: 40000 }).result).toBe('allowed');
  });

  it('requires approval when value exceeds limit', () => {
    const rule = { type: 'value_limit', value: 100000 };
    expect(evaluateRule(rule, { value: 200000 }).result).toBe('require_approval');
    expect(evaluateRule(rule, { value: 50000 }).result).toBe('allowed');
  });

  it('denies unauthorized roles', () => {
    const rule = { type: 'role_required', roles: ['admin', 'manager'] };
    expect(evaluateRule(rule, { role: 'user' }).result).toBe('denied');
    expect(evaluateRule(rule, { role: 'admin' }).result).toBe('allowed');
    expect(evaluateRule(rule, { role: 'manager' }).result).toBe('allowed');
  });
});

describe('Policy OS — Scope Matching', () => {
  function matchesScope(scope, context) {
    const agents = scope.agents || ['*'];
    const tenants = scope.tenants || ['*'];
    const agentMatch = agents.includes('*') || agents.includes(context.agentId);
    const tenantMatch = tenants.includes('*') || tenants.includes(context.tenantId);
    return agentMatch && tenantMatch;
  }

  it('matches wildcard agent scope', () => {
    expect(matchesScope({ agents: ['*'] }, { agentId: 'any-agent' })).toBe(true);
  });

  it('matches specific agent', () => {
    expect(matchesScope({ agents: ['sales-agent', 'procurement-agent'] }, { agentId: 'sales-agent' })).toBe(true);
    expect(matchesScope({ agents: ['sales-agent', 'procurement-agent'] }, { agentId: 'unknown-agent' })).toBe(false);
  });

  it('matches wildcard tenant scope', () => {
    expect(matchesScope({ tenants: ['*'] }, { tenantId: 'any-tenant' })).toBe(true);
  });

  it('requires both agent and tenant match', () => {
    const scope = { agents: ['sales-agent'], tenants: ['tenant-1'] };
    expect(matchesScope(scope, { agentId: 'sales-agent', tenantId: 'tenant-1' })).toBe(true);
    expect(matchesScope(scope, { agentId: 'sales-agent', tenantId: 'tenant-2' })).toBe(false);
    expect(matchesScope(scope, { agentId: 'procurement-agent', tenantId: 'tenant-1' })).toBe(false);
  });
});
