/**
 * Flow Orchestrator - Unit Tests for evaluateExpr / evaluateValue
 *
 * These test the pure expression evaluator that powers step.if and step.when
 * conditions. No HTTP, no server, no fixtures.
 *
 * Run: NODE_ENV=test npx vitest run __tests__/unit/
 */
import { describe, it, expect } from 'vitest';
import { evaluateExpr, evaluateValue, stepHandlers } from '../../src/index.js';

describe('evaluateValue', () => {
  it('booleans', () => {
    expect(evaluateValue('true', {})).toBe(true);
    expect(evaluateValue('false', {})).toBe(false);
  });
  it('null', () => {
    expect(evaluateValue('null', {})).toBe(null);
  });
  it('quoted strings', () => {
    expect(evaluateValue('"hello"', {})).toBe('hello');
    expect(evaluateValue("'world'", {})).toBe('world');
  });
  it('numbers', () => {
    expect(evaluateValue('42', {})).toBe(42);
    expect(evaluateValue('-3.14', {})).toBe(-3.14);
    expect(evaluateValue('0', {})).toBe(0);
  });
  it('ctx dotted path', () => {
    expect(evaluateValue('ctx.user.name', { user: { name: 'alice' } })).toBe('alice');
    expect(evaluateValue('ctx.country', { country: 'US' })).toBe('US');
    expect(evaluateValue('ctx.missing', {})).toBeUndefined();
  });
  it('nested ctx path', () => {
    expect(evaluateValue('ctx.user.trustScore', { user: { trustScore: 80 } })).toBe(80);
  });
});

describe('evaluateExpr — equality', () => {
  it('=== string', () => {
    expect(evaluateExpr('ctx.country === "US"', { country: 'US' })).toBe(true);
    expect(evaluateExpr('ctx.country === "UK"', { country: 'US' })).toBe(false);
  });
  it('== (loose)', () => {
    expect(evaluateExpr('ctx.x == 5', { x: 5 })).toBe(true);
  });
  it('!== / != ', () => {
    expect(evaluateExpr('ctx.country !== "US"', { country: 'UK' })).toBe(true);
    expect(evaluateExpr('ctx.country !== "US"', { country: 'US' })).toBe(false);
    expect(evaluateExpr('ctx.x != 5', { x: 6 })).toBe(true);
  });
});

describe('evaluateExpr — boolean composition', () => {
  it('AND', () => {
    expect(evaluateExpr('ctx.a && ctx.b', { a: true, b: true })).toBe(true);
    expect(evaluateExpr('ctx.a && ctx.b', { a: true, b: false })).toBe(false);
  });
  it('OR', () => {
    expect(evaluateExpr('ctx.a || ctx.b', { a: false, b: true })).toBe(true);
    expect(evaluateExpr('ctx.a || ctx.b', { a: false, b: false })).toBe(false);
  });
});

describe('evaluateExpr — comparisons', () => {
  it('greater than', () => {
    expect(evaluateExpr('ctx.amount > 1000', { amount: 1500 })).toBe(true);
    expect(evaluateExpr('ctx.amount > 1000', { amount: 500 })).toBe(false);
  });
  it('less than', () => {
    expect(evaluateExpr('ctx.amount < 1000', { amount: 500 })).toBe(true);
  });
  it('>= and <=', () => {
    expect(evaluateExpr('ctx.x >= 5', { x: 5 })).toBe(true);
    expect(evaluateExpr('ctx.x <= 5', { x: 5 })).toBe(true);
    expect(evaluateExpr('ctx.x >= 6', { x: 5 })).toBe(false);
  });
});

describe('evaluateExpr — truthiness', () => {
  it('truthy ctx path', () => {
    expect(evaluateExpr('ctx.user', { user: { id: 1 } })).toBeTruthy();
    expect(evaluateExpr('ctx.user', { user: null })).toBeFalsy();
  });
});

describe('stepHandlers registry', () => {
  it('exposes a stepHandlers object', () => {
    expect(typeof stepHandlers).toBe('object');
    expect(Object.keys(stepHandlers).length).toBeGreaterThan(0);
  });
  it('has the canonical foundation steps', () => {
    // These are the 5 foundation step types documented in CLAUDE.md
    expect(typeof stepHandlers['twin.resolve']).toBe('function');
    expect(typeof stepHandlers['memory.read']).toBe('function');
    expect(typeof stepHandlers['skill.execute']).toBe('function');
    expect(typeof stepHandlers['policy.check']).toBe('function');
    expect(typeof stepHandlers['intelligence.call']).toBe('function');
  });
});