/**
 * SUTAR Decision Engine - PolicyEngine Unit Tests
 *
 * Covers:
 *   - Default policy registration for all 10 decision types
 *   - Rule evaluation by priority
 *   - All 8 ConditionOperator variants (eq/ne/gt/lt/gte/lte/in/contains)
 *   - AND vs OR condition logic
 *   - Default outcome fallback when no rule matches
 *   - Policy registration/replacement
 *   - Disabled-policy path
 */

import { describe, it, expect } from 'vitest';
import {
  PolicyEngine,
} from '../../src/services/policyEngine.js';
import {
  ConditionOperator,
  DecisionOutcome,
  DecisionType,
  type DecisionContext,
  type Policy,
  type PolicyRule,
} from '../../src/types/index.js';

const ctx = (overrides: Partial<DecisionContext> = {}): DecisionContext => ({
  decisionType: DecisionType.OFFER,
  ...overrides,
});

describe('PolicyEngine — default policy registration', () => {
  it('registers a policy for every DecisionType', () => {
    const engine = new PolicyEngine();
    const all = engine.getAllPolicies();
    expect(all).toHaveLength(Object.values(DecisionType).length);
    for (const type of Object.values(DecisionType)) {
      expect(engine.getPolicy(type)).toBeDefined();
    }
  });

  it('returns default policies that are enabled', () => {
    const engine = new PolicyEngine();
    const all = engine.getAllPolicies();
    for (const p of all) {
      expect(p.enabled).toBe(true);
    }
  });
});

describe('PolicyEngine — rule evaluation by priority', () => {
  it('evaluates highest-priority matching rule first (lowest priority number wins)', () => {
    const engine = new PolicyEngine();
    // VIP rule has priority 5, OFFER high-risk has priority 10.
    // VIP + high risk → VIP rule (priority 5) should win.
    const result = engine.evaluate(ctx({
      decisionType: DecisionType.OFFER,
      customerTier: 'vip',
      riskScore: 95,
    }));
    expect(result.rule?.id).toBe('rule-offer-vip-express');
    expect(result.outcome).toBe(DecisionOutcome.PROCEED);
  });

  it('falls through to lower-priority rule when higher-priority does not match', () => {
    const engine = new PolicyEngine();
    // No VIP, but riskScore >= 70 → rule-offer-high-risk (priority 10) → HOLD
    const result = engine.evaluate(ctx({
      decisionType: DecisionType.OFFER,
      riskScore: 80,
      accountAge: 365,
    }));
    expect(result.outcome).toBe(DecisionOutcome.HOLD);
    expect(result.rule?.id).toBe('rule-offer-high-risk');
  });

  it('returns default outcome when no rule matches', () => {
    const engine = new PolicyEngine();
    // NEXT_ACTION has zero rules and defaultOutcome PROCEED
    const result = engine.evaluate(ctx({
      decisionType: DecisionType.NEXT_ACTION,
    }));
    expect(result.outcome).toBe(DecisionOutcome.PROCEED);
    expect(result.rule).toBeUndefined();
    expect(result.reason).toMatch(/default/);
  });
});

describe('PolicyEngine — condition operators', () => {
  it('EQ matches equal values only', () => {
    const engine = new PolicyEngine();
    const vipRule: PolicyRule = {
      id: 't1', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.PROCEED, priority: 1, reason: 't',
      conditions: [{ field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' }],
    };
    expect(engine.evaluateRule(vipRule, ctx({ customerTier: 'vip' }))).toBe(true);
    expect(engine.evaluateRule(vipRule, ctx({ customerTier: 'premium' }))).toBe(false);
  });

  it('NE matches not-equal', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 't2', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.REJECT, priority: 1, reason: 't',
      conditions: [{ field: 'customerTier', operator: ConditionOperator.NE, value: 'vip' }],
    };
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'standard' }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip' }))).toBe(false);
  });

  it('GT/LT/GTE/LTE are number-only and type-safe', () => {
    const engine = new PolicyEngine();
    const make = (op: ConditionOperator, val: number): PolicyRule => ({
      id: 't', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.HOLD, priority: 1, reason: 't',
      conditions: [{ field: 'amount', operator: op, value: val }],
    });

    expect(engine.evaluateRule(make(ConditionOperator.GT, 100),  ctx({ amount: 101 }))).toBe(true);
    expect(engine.evaluateRule(make(ConditionOperator.GT, 100),  ctx({ amount: 100 }))).toBe(false);
    expect(engine.evaluateRule(make(ConditionOperator.LT, 100),  ctx({ amount: 99 }))).toBe(true);
    expect(engine.evaluateRule(make(ConditionOperator.LT, 100),  ctx({ amount: 100 }))).toBe(false);
    expect(engine.evaluateRule(make(ConditionOperator.GTE, 100), ctx({ amount: 100 }))).toBe(true);
    expect(engine.evaluateRule(make(ConditionOperator.LTE, 100), ctx({ amount: 100 }))).toBe(true);

    // Non-numeric value should not crash and should return false
    expect(engine.evaluateRule(make(ConditionOperator.GT, 100), ctx({ amount: 'large' as any }))).toBe(false);
  });

  it('IN matches any element of an array', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 't', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.PROCEED, priority: 1, reason: 't',
      conditions: [{ field: 'customerTier', operator: ConditionOperator.IN, value: ['premium', 'vip'] }],
    };
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip' }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'premium' }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'standard' }))).toBe(false);
  });

  it('IN returns false if value is not an array', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 't', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.PROCEED, priority: 1, reason: 't',
      conditions: [{ field: 'customerTier', operator: ConditionOperator.IN, value: 'vip' as any }],
    };
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip' }))).toBe(false);
  });

  it('CONTAINS works on string substrings and arrays', () => {
    const engine = new PolicyEngine();
    const strRule: PolicyRule = {
      id: 's', name: 's', conditionLogic: 'AND',
      outcome: DecisionOutcome.HOLD, priority: 1, reason: 's',
      conditions: [{ field: 'sessionId', operator: ConditionOperator.CONTAINS, value: 'vpn' }],
    };
    expect(engine.evaluateRule(strRule, ctx({ sessionId: 'user-vpn-tok' }))).toBe(true);
    expect(engine.evaluateRule(strRule, ctx({ sessionId: 'user-mob-tok' }))).toBe(false);

    const arrRule: PolicyRule = {
      id: 'a', name: 'a', conditionLogic: 'AND',
      outcome: DecisionOutcome.HOLD, priority: 1, reason: 'a',
      conditions: [{ field: 'tags', operator: ConditionOperator.CONTAINS, value: 'flagged' }],
    };
    expect(engine.evaluateRule(arrRule, ctx({ tags: ['flagged', 'new'] } as any))).toBe(true);
    expect(engine.evaluateRule(arrRule, ctx({ tags: ['clean'] } as any))).toBe(false);
  });

  it('returns false when field is missing on the context', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 't', name: 't', conditionLogic: 'AND',
      outcome: DecisionOutcome.PROCEED, priority: 1, reason: 't',
      conditions: [{ field: 'riskScore', operator: ConditionOperator.GTE, value: 50 }],
    };
    expect(engine.evaluateRule(rule, ctx({}))).toBe(false);
    expect(engine.evaluateRule(rule, ctx({ riskScore: null as any }))).toBe(false);
  });
});

describe('PolicyEngine — AND vs OR condition logic', () => {
  it('AND requires all conditions to match', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 'and', name: 'and', conditionLogic: 'AND',
      outcome: DecisionOutcome.HOLD, priority: 1, reason: 'and',
      conditions: [
        { field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' },
        { field: 'amount',       operator: ConditionOperator.LT, value: 50000 },
      ],
    };
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip', amount: 10000 }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip', amount: 90000 }))).toBe(false);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'standard', amount: 10000 }))).toBe(false);
  });

  it('OR requires at least one condition to match', () => {
    const engine = new PolicyEngine();
    const rule: PolicyRule = {
      id: 'or', name: 'or', conditionLogic: 'OR',
      outcome: DecisionOutcome.HOLD, priority: 1, reason: 'or',
      conditions: [
        { field: 'customerTier', operator: ConditionOperator.EQ, value: 'vip' },
        { field: 'riskScore',    operator: ConditionOperator.GTE, value: 80 },
      ],
    };
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'vip', riskScore: 0 }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'standard', riskScore: 90 }))).toBe(true);
    expect(engine.evaluateRule(rule, ctx({ customerTier: 'standard', riskScore: 0 }))).toBe(false);
  });
});

describe('PolicyEngine — policy override and replacement', () => {
  it('registerPolicy replaces an existing policy', () => {
    const engine = new PolicyEngine();
    const customPolicy: Policy = {
      id: 'custom-offer', name: 'Custom Offer', decisionType: DecisionType.OFFER,
      enabled: true, defaultOutcome: DecisionOutcome.REJECT, description: 'test',
      rules: [{
        id: 'r1', name: 'always-reject', conditionLogic: 'AND',
        outcome: DecisionOutcome.REJECT, priority: 1, reason: 'replaced',
        conditions: [{ field: 'amount', operator: ConditionOperator.GT, value: 0 }],
      }],
    };
    engine.registerPolicy(customPolicy);
    const result = engine.evaluate(ctx({ decisionType: DecisionType.OFFER, amount: 1 }));
    expect(result.outcome).toBe(DecisionOutcome.REJECT);
    expect(result.policy.id).toBe('custom-offer');
  });

  it('disabled policy falls through to a synthetic default with low confidence', () => {
    const engine = new PolicyEngine();
    const disabled: Policy = {
      id: 'd', name: 'd', decisionType: DecisionType.NEXT_ACTION,
      enabled: false, defaultOutcome: DecisionOutcome.HOLD, description: '',
      rules: [],
    };
    engine.registerPolicy(disabled);
    const result = engine.evaluate(ctx({ decisionType: DecisionType.NEXT_ACTION }));
    expect(result.outcome).toBe(DecisionOutcome.PROCEED); // synthetic default is PROCEED
    expect(result.confidence).toBe(0.5);
  });

  it('unknown decision type returns synthetic default', () => {
    const engine = new PolicyEngine();
    const result = engine.evaluate(ctx({ decisionType: 'BOGUS' as DecisionType }));
    expect(result.outcome).toBe(DecisionOutcome.PROCEED);
    expect(result.reason).toMatch(/No policy/);
  });
});

describe('PolicyEngine — domain-specific default behaviors', () => {
  it('FRAUD at critical risk (>=85) is REJECTed', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({ decisionType: DecisionType.FRAUD, riskScore: 90 }));
    expect(r.outcome).toBe(DecisionOutcome.REJECT);
    expect(r.rule?.id).toBe('rule-fraud-critical');
  });

  it('FRAUD at high risk (>=60, <85) is HOLD', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({ decisionType: DecisionType.FRAUD, riskScore: 70 }));
    expect(r.outcome).toBe(DecisionOutcome.HOLD);
    expect(r.rule?.id).toBe('rule-fraud-high');
  });

  it('CASHBACK on account <90d is REJECTed regardless of amount', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({ decisionType: DecisionType.CASHBACK, accountAge: 10, amount: 100 }));
    expect(r.outcome).toBe(DecisionOutcome.REJECT);
    expect(r.rule?.id).toBe('rule-cashback-new-account');
  });

  it('CASHBACK high amount on mature account is HOLD', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({ decisionType: DecisionType.CASHBACK, accountAge: 365, amount: 9999 }));
    expect(r.outcome).toBe(DecisionOutcome.HOLD);
    expect(r.rule?.id).toBe('rule-cashback-high-amount');
  });

  it('APPROVAL VIP + amount <50000 auto-PROCEEDs (higher priority than amount-only rule)', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({
      decisionType: DecisionType.APPROVAL,
      customerTier: 'vip',
      amount: 20000,
    }));
    expect(r.outcome).toBe(DecisionOutcome.PROCEED);
    expect(r.rule?.id).toBe('rule-approval-vip-auto');
  });

  it('APPROVAL high amount (>=10000) on standard tier → HOLD', () => {
    const engine = new PolicyEngine();
    const r = engine.evaluate(ctx({
      decisionType: DecisionType.APPROVAL,
      customerTier: 'standard',
      amount: 50000,
    }));
    expect(r.outcome).toBe(DecisionOutcome.HOLD);
    expect(r.rule?.id).toBe('rule-approval-high-amount');
  });
});
