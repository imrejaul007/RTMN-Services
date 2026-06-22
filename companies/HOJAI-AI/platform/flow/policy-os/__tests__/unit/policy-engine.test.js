/**
 * PolicyOS - Unit Tests for pure policy-engine functions
 *
 * These test the comparator + condition evaluator + path-getter logic
 * that powers /api/policies/evaluate. No HTTP, no server, no fixtures.
 *
 * Run: npx vitest run __tests__/unit/policy-engine.test.js
 */
import { describe, it, expect } from 'vitest';
import {
  compareValues,
  getPath,
  evaluateCondition,
  validatePolicyBody,
  isStr,
  isInt,
  isIsoDate,
} from '../../src/index.js';

describe('compareValues', () => {
  it('eq / neq', () => {
    expect(compareValues(5, 'eq', 5)).toBe(true);
    expect(compareValues(5, 'neq', 6)).toBe(true);
    expect(compareValues(5, 'equals', 5)).toBe(true);
    expect(compareValues(5, 'notEquals', 5)).toBe(false);
  });

  it('gt / gte / lt / lte — number only', () => {
    expect(compareValues(10, 'gt', 5)).toBe(true);
    expect(compareValues(5, 'gte', 5)).toBe(true);
    expect(compareValues(4, 'lt', 5)).toBe(true);
    expect(compareValues(5, 'lte', 5)).toBe(true);
    // String is NOT a number — must return false (no coercion)
    expect(compareValues('10', 'gt', 5)).toBe(false);
    expect(compareValues(null, 'lt', 5)).toBe(false);
  });

  it('in / notIn — expected must be array', () => {
    expect(compareValues('US', 'in', ['US', 'UK', 'DE'])).toBe(true);
    expect(compareValues('FR', 'in', ['US', 'UK', 'DE'])).toBe(false);
    expect(compareValues('FR', 'notIn', ['US', 'UK', 'DE'])).toBe(true);
    expect(compareValues('US', 'in', 'US')).toBe(false); // not an array
  });

  it('contains / notContains — actual must be array', () => {
    expect(compareValues(['a', 'b'], 'contains', 'a')).toBe(true);
    expect(compareValues(['a', 'b'], 'notContains', 'z')).toBe(true);
    expect(compareValues('not-an-array', 'contains', 'a')).toBe(false);
  });

  it('startsWith / endsWith — string only', () => {
    expect(compareValues('hello world', 'startsWith', 'hello')).toBe(true);
    expect(compareValues('hello world', 'endsWith', 'world')).toBe(true);
    expect(compareValues(123, 'startsWith', '1')).toBe(false);
  });

  it('exists / notExists / truthy / falsy', () => {
    expect(compareValues(0, 'exists', null)).toBe(true);
    expect(compareValues(null, 'notExists', null)).toBe(true);
    expect(compareValues(undefined, 'notExists', null)).toBe(true);
    expect(compareValues(1, 'truthy', null)).toBe(true);
    expect(compareValues(0, 'falsy', null)).toBe(true);
    expect(compareValues('non-empty', 'truthy', null)).toBe(true);
  });

  it('unknown operator returns false (fail-closed)', () => {
    expect(compareValues(1, 'unknownOp', 1)).toBe(false);
  });
});

describe('getPath', () => {
  it('top-level', () => {
    expect(getPath({ a: 1 }, 'a')).toBe(1);
  });
  it('nested', () => {
    expect(getPath({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });
  it('null-safe', () => {
    expect(getPath(null, 'a')).toBeUndefined();
    expect(getPath(undefined, 'a')).toBeUndefined();
    expect(getPath({ a: null }, 'a.b')).toBeUndefined();
  });
  it('missing key', () => {
    expect(getPath({ a: 1 }, 'b')).toBeUndefined();
    expect(getPath({ a: { b: 1 } }, 'a.c')).toBeUndefined();
  });
});

describe('evaluateCondition', () => {
  it('null/empty condition is trivially true', () => {
    expect(evaluateCondition(null, {})).toBe(true);
    expect(evaluateCondition(undefined, {})).toBe(true);
  });

  it('context.* path equality', () => {
    const ctx = { country: 'US', amount: 1500 };
    expect(evaluateCondition({ 'context.country': 'US' }, ctx)).toBe(true);
    expect(evaluateCondition({ 'context.country': 'UK' }, ctx)).toBe(false);
  });

  it('operator objects on context.*', () => {
    const ctx = { country: 'US', amount: 1500 };
    expect(evaluateCondition({ 'context.amount': { gt: 1000 } }, ctx)).toBe(true);
    expect(evaluateCondition({ 'context.amount': { lt: 100 } }, ctx)).toBe(false);
    expect(evaluateCondition(
      { 'context.country': { in: ['US', 'UK'] } },
      ctx
    )).toBe(true);
  });

  it('user.* path', () => {
    const ctx = { user: { id: 'u1', role: 'admin', trustScore: 80 } };
    expect(evaluateCondition({ 'user.role': 'admin' }, ctx)).toBe(true);
    expect(evaluateCondition({ 'user.trustScore': { gte: 50 } }, ctx)).toBe(true);
    expect(evaluateCondition({ 'user.trustScore': { lt: 50 } }, ctx)).toBe(false);
  });

  it('multiple conditions are AND-ed', () => {
    const ctx = { country: 'US', amount: 1500 };
    const cond = {
      'context.country': { in: ['US', 'UK'] },
      'context.amount': { gt: 1000 },
    };
    expect(evaluateCondition(cond, ctx)).toBe(true);
    // Fail one
    expect(evaluateCondition({ ...cond, 'context.amount': { gt: 5000 } }, ctx)).toBe(false);
  });

  it('arbitrary key falls back to context lookup', () => {
    const ctx = { action: 'payment.process', amount: 100 };
    expect(evaluateCondition({ action: 'payment.process' }, ctx)).toBe(true);
    expect(evaluateCondition({ action: 'wrong' }, ctx)).toBe(false);
  });
});

describe('validatePolicyBody', () => {
  it('rejects missing name', () => {
    const r = validatePolicyBody({ id: 'p1', category: 'security', effect: 'allow' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/name/);
  });

  it('rejects missing category', () => {
    const r = validatePolicyBody({ id: 'p1', name: 'X', effect: 'allow' });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/category/);
  });

  it('rejects invalid category', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'X', category: 'invalid-cat', effect: 'allow',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/category/);
  });

  it('accepts minimal valid policy (id, name, category, effect)', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'Allow US', category: 'security', effect: 'allow',
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('accepts full policy with rules + approvals', () => {
    const r = validatePolicyBody({
      id: 'p1',
      name: 'High-value US payment',
      category: 'commerce',
      effect: 'allow',
      rules: [{
        id: 'r1',
        if: { 'context.amount': { gt: 1000 } },
        then: { reason: 'high-value' },
      }],
      approvals: { strategy: 'single', requiredApprovers: ['cfo'] },
    });
    expect(r.ok).toBe(true);
  });

  it('rejects name over 200 chars', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'x'.repeat(201), category: 'security', effect: 'allow',
    });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid status enum', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'X', category: 'security', effect: 'allow', status: 'bogus',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/status/);
  });

  it('rejects rules array with malformed rule', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'X', category: 'security', effect: 'allow',
      rules: [{ /* no .if */ }],
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/rules\[0\]/);
  });

  it('rejects effectiveFrom > effectiveUntil', () => {
    const r = validatePolicyBody({
      id: 'p1', name: 'X', category: 'security', effect: 'allow',
      effectiveFrom: '2026-12-01T00:00:00.000Z',
      effectiveUntil: '2026-01-01T00:00:00.000Z',
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/effectiveFrom must be <= effectiveUntil/);
  });

  it('partial=true allows missing name/category for PATCH-style updates', () => {
    const r = validatePolicyBody({ id: 'p1', priority: 50 }, { partial: true });
    expect(r.ok).toBe(true);
  });
});

describe('isStr / isInt / isIsoDate', () => {
  it('isStr', () => {
    expect(isStr('hello')).toBe(true);
    expect(isStr('')).toBe(false);
    expect(isStr(123)).toBe(false);
    expect(isStr('x'.repeat(201))).toBe(false);
  });
  it('isInt', () => {
    expect(isInt(5)).toBe(true);
    expect(isInt(0)).toBe(true);
    expect(isInt(-3)).toBe(true);
    expect(isInt(1.5)).toBe(false);
    expect(isInt('5')).toBe(false);
    expect(isInt(null)).toBe(false);
  });
  it('isIsoDate', () => {
    // isIsoDate requires round-trip equality — bare date "2026-06-22" is not
    // equal to "2026-06-22T00:00:00.000Z" so it returns false. Use full ISO-8601.
    expect(isIsoDate('2026-06-22T10:00:00.000Z')).toBe(true);
    expect(isIsoDate('2026-06-22T10:00:00Z')).toBe(false); // not exact round-trip
    expect(isIsoDate('not-a-date')).toBe(false);
    expect(isIsoDate(12345)).toBe(false);
    expect(isIsoDate('2026-06-22')).toBe(false); // bare date, not full ISO
  });
});
