/**
 * SUTAR Decision Engine - Zod Validators Unit Tests
 *
 * Validators are the security-critical input gate for the decision API.
 * Tests cover happy paths + every failure case (length, type, enum, range,
 * missing required fields, partial inputs).
 */

import { describe, it, expect } from 'vitest';
import {
  RankableOptionSchema,
  RankRequestSchema,
  RankingWeightsSchema,
} from '../../src/validators/ranking.js';
import {
  ConditionSchema,
  PolicyRuleSchema,
  DecisionContextSchema,
  DecisionRequestSchema,
  ScenarioVariationSchema,
  SimulationRequestSchema,
  HealthCheckQuerySchema,
  StatsQuerySchema,
} from '../../src/validators/simulation.js';

// ============================================================================
// ranking.ts validators
// ============================================================================

describe('RankableOptionSchema', () => {
  it('accepts a minimal option with just id + name', () => {
    const r = RankableOptionSchema.parse({ id: 'a', name: 'A' });
    expect(r.id).toBe('a');
    expect(r.name).toBe('A');
  });

  it('accepts all 4 ranking dimensions', () => {
    const r = RankableOptionSchema.parse({
      id: 'a', name: 'A', cost: 10, time: 5, risk: 20, trust: 80,
    });
    expect(r.cost).toBe(10);
  });

  it('rejects empty id', () => {
    expect(() => RankableOptionSchema.parse({ id: '', name: 'A' })).toThrow();
  });

  it('rejects id over 100 chars', () => {
    expect(() => RankableOptionSchema.parse({ id: 'x'.repeat(101), name: 'A' })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: '' })).toThrow();
  });

  it('rejects name over 200 chars', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'x'.repeat(201) })).toThrow();
  });

  it('rejects negative cost', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'A', cost: -1 })).toThrow();
  });

  it('rejects negative time', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'A', time: -1 })).toThrow();
  });

  it('rejects risk over 100', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'A', risk: 101 })).toThrow();
  });

  it('rejects trust over 100', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'A', trust: 101 })).toThrow();
  });

  it('rejects risk under 0', () => {
    expect(() => RankableOptionSchema.parse({ id: 'a', name: 'A', risk: -1 })).toThrow();
  });

  it('accepts risk at boundaries 0 and 100', () => {
    expect(RankableOptionSchema.parse({ id: 'a', name: 'A', risk: 0 }).risk).toBe(0);
    expect(RankableOptionSchema.parse({ id: 'a', name: 'A', risk: 100 }).risk).toBe(100);
  });

  it('accepts metadata as a record', () => {
    const r = RankableOptionSchema.parse({ id: 'a', name: 'A', metadata: { src: 'manual', n: 1 } });
    expect(r.metadata).toEqual({ src: 'manual', n: 1 });
  });
});

describe('RankingWeightsSchema', () => {
  it('accepts undefined', () => {
    expect(RankingWeightsSchema.parse(undefined)).toBeUndefined();
  });

  it('accepts all four dimensions in range', () => {
    const r = RankingWeightsSchema.parse({ cost: 0.3, time: 0.2, risk: 0.3, trust: 0.2 });
    expect(r.cost).toBe(0.3);
  });

  it('rejects weight over 1', () => {
    expect(() => RankingWeightsSchema.parse({ cost: 1.1 })).toThrow();
  });

  it('rejects negative weight', () => {
    expect(() => RankingWeightsSchema.parse({ cost: -0.1 })).toThrow();
  });

  it('accepts boundary 0 and 1', () => {
    expect(RankingWeightsSchema.parse({ cost: 0 })?.cost).toBe(0);
    expect(RankingWeightsSchema.parse({ cost: 1 })?.cost).toBe(1);
  });
});

describe('RankRequestSchema', () => {
  it('accepts 2 options minimum', () => {
    const r = RankRequestSchema.parse({
      options: [{ id: 'a', name: 'A', cost: 1 }, { id: 'b', name: 'B', cost: 2 }],
    });
    expect(r.options).toHaveLength(2);
  });

  it('rejects 1 option', () => {
    expect(() => RankRequestSchema.parse({
      options: [{ id: 'a', name: 'A', cost: 1 }],
    })).toThrow(/at least 2/);
  });

  it('rejects 0 options', () => {
    expect(() => RankRequestSchema.parse({ options: [] })).toThrow();
  });

  it('accepts custom weights', () => {
    const r = RankRequestSchema.parse({
      options: [{ id: 'a', name: 'A', cost: 1 }, { id: 'b', name: 'B', cost: 2 }],
      weights: { cost: 1 },
    });
    expect(r.weights?.cost).toBe(1);
  });

  it('passes through a valid 4-dim request with weights', () => {
    const r = RankRequestSchema.parse({
      options: [
        { id: 'a', name: 'A', cost: 10, time: 5, risk: 20, trust: 80 },
        { id: 'b', name: 'B', cost: 20, time: 10, risk: 30, trust: 70 },
      ],
      weights: { cost: 0.4, trust: 0.6 },
    });
    expect(r.options).toHaveLength(2);
  });
});

// ============================================================================
// simulation.ts validators
// ============================================================================

describe('ConditionSchema', () => {
  it('accepts a number condition with gt operator', () => {
    const r = ConditionSchema.parse({ field: 'amount', operator: 'gt', value: 100 });
    expect(r.value).toBe(100);
  });

  it('accepts a string condition with eq operator', () => {
    const r = ConditionSchema.parse({ field: 'customerTier', operator: 'eq', value: 'vip' });
    expect(r.value).toBe('vip');
  });

  it('accepts a boolean condition', () => {
    const r = ConditionSchema.parse({ field: 'isActive', operator: 'eq', value: true });
    expect(r.value).toBe(true);
  });

  it('accepts a string array condition with in operator', () => {
    const r = ConditionSchema.parse({ field: 'tag', operator: 'in', value: ['a', 'b'] });
    expect(r.value).toEqual(['a', 'b']);
  });

  it('rejects empty field', () => {
    expect(() => ConditionSchema.parse({ field: '', operator: 'gt', value: 1 })).toThrow();
  });

  it('rejects invalid operator', () => {
    expect(() => ConditionSchema.parse({ field: 'x', operator: 'between', value: 1 })).toThrow();
  });

  it('accepts all 8 valid operators', () => {
    for (const op of ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'contains']) {
      expect(() => ConditionSchema.parse({ field: 'x', operator: op, value: 1 })).not.toThrow();
    }
  });
});

describe('PolicyRuleSchema', () => {
  const valid = {
    id: 'r1',
    name: 'rule 1',
    conditions: [{ field: 'amount', operator: 'gte' as const, value: 1000 }],
    conditionLogic: 'AND' as const,
    outcome: 'HOLD' as const,
    priority: 10,
    reason: 'requires review',
  };

  it('accepts a valid rule', () => {
    expect(() => PolicyRuleSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty conditions array', () => {
    expect(() => PolicyRuleSchema.parse({ ...valid, conditions: [] })).toThrow();
  });

  it('rejects negative priority', () => {
    expect(() => PolicyRuleSchema.parse({ ...valid, priority: -1 })).toThrow();
  });

  it('rejects non-integer priority', () => {
    expect(() => PolicyRuleSchema.parse({ ...valid, priority: 1.5 })).toThrow();
  });

  it('rejects unknown outcome', () => {
    expect(() => PolicyRuleSchema.parse({ ...valid, outcome: 'MAYBE' })).toThrow();
  });

  it('rejects unknown conditionLogic', () => {
    expect(() => PolicyRuleSchema.parse({ ...valid, conditionLogic: 'XOR' })).toThrow();
  });
});

describe('DecisionContextSchema', () => {
  it('accepts a minimal context (decisionType only)', () => {
    const r = DecisionContextSchema.parse({ decisionType: 'OFFER' });
    expect(r.decisionType).toBe('OFFER');
  });

  it('accepts all optional fields', () => {
    const r = DecisionContextSchema.parse({
      decisionType: 'OFFER',
      userId: 'u1',
      sessionId: 's1',
      amount: 100,
      currency: 'USD',
      customerTier: 'vip',
      customerAge: 30,
      accountAge: 365,
      transactionCount: 5,
      riskScore: 10,
      previousDecisions: [
        { type: 'OFFER', outcome: 'PROCEED', timestamp: '2026-01-01' },
      ],
      metadata: { src: 'test' },
    });
    expect(r.customerTier).toBe('vip');
    expect(r.previousDecisions).toHaveLength(1);
  });

  it('rejects unknown decisionType', () => {
    expect(() => DecisionContextSchema.parse({ decisionType: 'BOGUS' })).toThrow();
  });

  it('rejects unknown customerTier', () => {
    expect(() => DecisionContextSchema.parse({
      decisionType: 'OFFER',
      customerTier: 'platinum',
    })).toThrow();
  });

  it('rejects previousDecision with unknown outcome', () => {
    expect(() => DecisionContextSchema.parse({
      decisionType: 'OFFER',
      previousDecisions: [{ type: 'OFFER', outcome: 'MAYBE', timestamp: '2026-01-01' }],
    })).toThrow();
  });
});

describe('DecisionRequestSchema', () => {
  it('accepts a minimal request with skipRiskAssessment defaulting to false', () => {
    const r = DecisionRequestSchema.parse({ context: { decisionType: 'OFFER' } });
    expect(r.skipRiskAssessment).toBe(false);
  });

  it('accepts explicit skipRiskAssessment: true', () => {
    const r = DecisionRequestSchema.parse({
      context: { decisionType: 'OFFER' },
      skipRiskAssessment: true,
    });
    expect(r.skipRiskAssessment).toBe(true);
  });

  it('accepts overridePolicyId', () => {
    const r = DecisionRequestSchema.parse({
      context: { decisionType: 'OFFER' },
      overridePolicyId: 'custom-policy',
    });
    expect(r.overridePolicyId).toBe('custom-policy');
  });
});

describe('ScenarioVariationSchema', () => {
  it('accepts a partial context as modifications', () => {
    const r = ScenarioVariationSchema.parse({
      name: 'spike',
      modifications: { riskScore: 95 },
    });
    expect(r.modifications.riskScore).toBe(95);
  });

  it('rejects empty name', () => {
    expect(() => ScenarioVariationSchema.parse({
      name: '',
      modifications: { riskScore: 1 },
    })).toThrow();
  });
});

describe('SimulationRequestSchema', () => {
  const valid = {
    context: { decisionType: 'OFFER' },
    scenarioVariations: [
      { name: 'low risk', modifications: { riskScore: 5 } },
    ],
  };

  it('accepts a request with one variation', () => {
    expect(() => SimulationRequestSchema.parse(valid)).not.toThrow();
  });

  it('rejects empty scenarioVariations', () => {
    expect(() => SimulationRequestSchema.parse({ ...valid, scenarioVariations: [] })).toThrow();
  });

  it('accepts comparePolicies: true', () => {
    const r = SimulationRequestSchema.parse({ ...valid, comparePolicies: true });
    expect(r.comparePolicies).toBe(true);
  });

  it('defaults comparePolicies to false', () => {
    const r = SimulationRequestSchema.parse(valid);
    expect(r.comparePolicies).toBe(false);
  });
});

describe('HealthCheckQuerySchema', () => {
  it('accepts undefined detailed (defaults false)', () => {
    const r = HealthCheckQuerySchema.parse({});
    expect(r.detailed).toBe('false');
  });

  it('accepts detailed: true', () => {
    const r = HealthCheckQuerySchema.parse({ detailed: 'true' });
    expect(r.detailed).toBe('true');
  });

  it('rejects detailed: 1 (number)', () => {
    expect(() => HealthCheckQuerySchema.parse({ detailed: '1' })).toThrow();
  });
});

describe('StatsQuerySchema', () => {
  it('defaults reset to false', () => {
    const r = StatsQuerySchema.parse({});
    expect(r.reset).toBe('false');
  });

  it('accepts reset: true', () => {
    const r = StatsQuerySchema.parse({ reset: 'true' });
    expect(r.reset).toBe('true');
  });
});
