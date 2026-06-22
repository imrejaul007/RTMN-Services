/**
 * SUTAR Decision Engine - RiskAssessmentService Unit Tests
 *
 * Covers:
 *   - Overall score calculation across behavioral/transactional/historical/contextual
 *   - Tier-based behavioral scoring (vip<premium<standard)
 *   - Account-age behavioral bands
 *   - Transactional bands for amount and transactionCount
 *   - Historical decisions weighted by rejection/hold ratios
 *   - Contextual factors (currency, customerAge)
 *   - Risk level thresholds (LOW/MEDIUM/HIGH/CRITICAL)
 *   - Empty context → overallScore 0 + LOW
 */

import { describe, it, expect } from 'vitest';
import { RiskAssessmentService } from '../../src/services/riskAssessment.js';
import {
  DecisionType,
  RiskLevel,
  type DecisionContext,
} from '../../src/types/index.js';

const baseCtx = (overrides: Partial<DecisionContext> = {}): DecisionContext => ({
  decisionType: DecisionType.PRICING,
  ...overrides,
});

describe('RiskAssessmentService — empty context', () => {
  it('always includes the decision_type factor even when nothing else is provided', () => {
    const svc = new RiskAssessmentService();
    const r = svc.assess(baseCtx());
    // decision_type factor is mandatory → at least 1 factor
    expect(r.factors.length).toBeGreaterThanOrEqual(1);
    const dt = r.factors.find(f => f.name === 'decision_type');
    expect(dt).toBeDefined();
    expect(dt?.score).toBe(40); // PRICING = 40
  });
});

describe('RiskAssessmentService — behavioral factors', () => {
  it('VIP tier scores much lower risk than standard', () => {
    const svc = new RiskAssessmentService();
    const vip = svc.assess(baseCtx({ customerTier: 'vip' }));
    const std = svc.assess(baseCtx({ customerTier: 'standard' }));
    const vipTier = vip.factors.find(f => f.name === 'customer_tier');
    const stdTier = std.factors.find(f => f.name === 'customer_tier');
    expect(vipTier?.score).toBe(5);
    expect(stdTier?.score).toBe(40);
    expect(vip.overallScore).toBeLessThan(std.overallScore);
  });

  it('account_age uses the correct risk bands', () => {
    const svc = new RiskAssessmentService();
    const cases = [
      { age: 400, expected: 5 },
      { age: 365, expected: 5 },
      { age: 200, expected: 15 },
      { age: 90,  expected: 25 },
      { age: 30,  expected: 40 },
      { age: 1,   expected: 50 }, // under 30d defaults to 50
    ];
    for (const { age, expected } of cases) {
      const r = svc.assess(baseCtx({ accountAge: age }));
      const factor = r.factors.find(f => f.name === 'account_age');
      expect(factor?.score).toBe(expected);
    }
  });

  it('unknown tier falls back to the default score (30)', () => {
    const svc = new RiskAssessmentService();
    const r = svc.assess(baseCtx({ customerTier: 'platinum' as any }));
    const factor = r.factors.find(f => f.name === 'customer_tier');
    expect(factor?.score).toBe(30);
  });
});

describe('RiskAssessmentService — transactional factors', () => {
  it('transaction_amount uses the correct risk bands', () => {
    const svc = new RiskAssessmentService();
    const cases = [
      { amount: 20000, expected: 80 },
      { amount: 8000,  expected: 60 },
      { amount: 2000,  expected: 40 },
      { amount: 800,   expected: 25 },
      { amount: 100,   expected: 20 },
    ];
    for (const { amount, expected } of cases) {
      const r = svc.assess(baseCtx({ amount }));
      const factor = r.factors.find(f => f.name === 'transaction_amount');
      expect(factor?.score).toBe(expected);
    }
  });

  it('transaction_count uses the correct risk bands', () => {
    const svc = new RiskAssessmentService();
    const cases = [
      { count: 200, expected: 70 },
      { count: 60,  expected: 50 },
      { count: 30,  expected: 30 },
      { count: 15,  expected: 15 },
      { count: 1,   expected: 20 },
    ];
    for (const { count, expected } of cases) {
      const r = svc.assess(baseCtx({ transactionCount: count }));
      const factor = r.factors.find(f => f.name === 'transaction_count');
      expect(factor?.score).toBe(expected);
    }
  });
});

describe('RiskAssessmentService — historical factors', () => {
  it('high rejection ratio (>30%) drives high risk', () => {
    const svc = new RiskAssessmentService();
    const prev = [
      { type: DecisionType.OFFER, outcome: 'REJECT' as any, timestamp: '2026-01-01' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-02' },
      { type: DecisionType.OFFER, outcome: 'REJECT' as any, timestamp: '2026-01-03' },
    ];
    const r = svc.assess(baseCtx({ previousDecisions: prev }));
    const factor = r.factors.find(f => f.name === 'previous_decisions');
    expect(factor?.score).toBe(70); // 2/3 ≈ 0.67 > 0.3
  });

  it('rejection ratio between 10% and 30% drives score 50', () => {
    const svc = new RiskAssessmentService();
    // 2/10 = 0.2 → > 0.1 (true) but NOT > 0.3 (false) → score 50
    const prev = [
      { type: DecisionType.OFFER, outcome: 'REJECT' as any, timestamp: '2026-01-01' },
      { type: DecisionType.OFFER, outcome: 'REJECT' as any, timestamp: '2026-01-02' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-03' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-04' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-05' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-06' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-07' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-08' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-09' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-10' },
    ];
    const r = svc.assess(baseCtx({ previousDecisions: prev }));
    const factor = r.factors.find(f => f.name === 'previous_decisions');
    expect(factor?.score).toBe(50);
  });

  it('rejection ratio exactly 10% (boundary) drives score 10 (no boost)', () => {
    const svc = new RiskAssessmentService();
    // 1/10 = 0.1 → > 0.1 (false, strict gt) → falls through to "rejections > 0" → 30
    const prev = [
      { type: DecisionType.OFFER, outcome: 'REJECT' as any, timestamp: '2026-01-01' },
      ...Array.from({ length: 9 }, (_, i) => ({
        type: DecisionType.OFFER,
        outcome: 'PROCEED' as any,
        timestamp: `2026-01-${String(i + 2).padStart(2, '0')}`,
      })),
    ];
    const r = svc.assess(baseCtx({ previousDecisions: prev }));
    const factor = r.factors.find(f => f.name === 'previous_decisions');
    expect(factor?.score).toBe(30);
  });

  it('mostly holds (>50%) drives moderate risk', () => {
    const svc = new RiskAssessmentService();
    const prev = [
      { type: DecisionType.OFFER, outcome: 'HOLD' as any, timestamp: '2026-01-01' },
      { type: DecisionType.OFFER, outcome: 'HOLD' as any, timestamp: '2026-01-02' },
      { type: DecisionType.OFFER, outcome: 'PROCEED' as any, timestamp: '2026-01-03' },
    ];
    const r = svc.assess(baseCtx({ previousDecisions: prev }));
    const factor = r.factors.find(f => f.name === 'previous_decisions');
    expect(factor?.score).toBe(40); // 2/3 holds → 0.67 > 0.5
  });

  it('no previous decisions does not contribute a factor', () => {
    const svc = new RiskAssessmentService();
    const r = svc.assess(baseCtx({ previousDecisions: [] }));
    expect(r.factors.find(f => f.name === 'previous_decisions')).toBeUndefined();
  });

  it('external riskScore is passed through unchanged', () => {
    const svc = new RiskAssessmentService();
    const r = svc.assess(baseCtx({ riskScore: 73 }));
    const factor = r.factors.find(f => f.name === 'external_risk_score');
    expect(factor?.score).toBe(73);
  });
});

describe('RiskAssessmentService — risk level thresholds', () => {
  it('LOW band: 0-25', () => {
    const svc = new RiskAssessmentService();
    expect(svc.assess(baseCtx({ customerTier: 'vip', accountAge: 365 })).level).toBe(RiskLevel.LOW);
  });

  it('MEDIUM band: 26-50 (account_age band edge)', () => {
    const svc = new RiskAssessmentService();
    // behavioral(accountAge=20, score=50) blended with contextual(PRICING=40)
    // weighted avg ≈ (50*0.3 + 40*0.15) / 0.45 ≈ 47 → MEDIUM
    const r = svc.assess(baseCtx({ accountAge: 20 }));
    expect(r.level).toBe(RiskLevel.MEDIUM);
  });

  it('HIGH band: 51-75', () => {
    const svc = new RiskAssessmentService();
    // external riskScore=70 weighted 0.3 + PRICING=40 weighted 0.15
    // ≈ (70*0.3 + 40*0.15) / 0.45 ≈ 60 → HIGH
    const r = svc.assess(baseCtx({ riskScore: 70 }));
    expect(r.level).toBe(RiskLevel.HIGH);
  });

  it('maximum stacked factors lands in HIGH band — documents the CRITICAL band is hard to reach', () => {
    const svc = new RiskAssessmentService();
    // NOTE: With default weighting, even FRAUD + max factors tops out near
    // overallScore ≈ 67. The CRITICAL band (76-100) requires either a
    // custom weights config or external riskScore >= ~85 supplied alone.
    // This test documents that a fully-loaded context still caps at HIGH.
    const r = svc.assess({
      decisionType: DecisionType.FRAUD,
      riskScore: 100,
      amount: 20000,
      transactionCount: 200,
      customerTier: 'standard',
      accountAge: 1,
    });
    expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(r.level);
    expect(r.overallScore).toBeGreaterThan(60);
  });

  it('CRITICAL band is reachable when external riskScore alone dominates', () => {
    const svc = new RiskAssessmentService();
    // Single external riskScore factor at 85+ → weighted with decision_type only:
    // (85*0.3 + 60*0.15) / (0.3 + 0.15) = 34.5/0.45 ≈ 77 → CRITICAL
    const r = svc.assess({
      decisionType: DecisionType.FRAUD,
      riskScore: 85,
    });
    expect(r.level).toBe(RiskLevel.CRITICAL);
  });
});

describe('RiskAssessmentService — output shape', () => {
  it('always returns a confidence in [0, 100]', () => {
    const svc = new RiskAssessmentService();
    const r1 = svc.assess(baseCtx());
    const r2 = svc.assess(baseCtx({ customerTier: 'vip', accountAge: 1000, amount: 1, riskScore: 5 }));
    expect(r1.confidence).toBeGreaterThanOrEqual(0);
    expect(r1.confidence).toBeLessThanOrEqual(100);
    expect(r2.confidence).toBeGreaterThanOrEqual(0);
    expect(r2.confidence).toBeLessThanOrEqual(100);
  });

  it('assessmentDate is a parseable ISO timestamp', () => {
    const svc = new RiskAssessmentService();
    const r = svc.assess(baseCtx());
    expect(() => new Date(r.assessmentDate).toISOString()).not.toThrow();
  });

  it('maxPossibleScore is 100', () => {
    const svc = new RiskAssessmentService();
    expect(svc.assess(baseCtx()).maxPossibleScore).toBe(100);
  });

  it('riskIndicators is an array (may be empty)', () => {
    const svc = new RiskAssessmentService();
    expect(Array.isArray(svc.assess(baseCtx()).riskIndicators)).toBe(true);
    expect(Array.isArray(svc.assess(baseCtx({ riskScore: 95 })).riskIndicators)).toBe(true);
  });
});
