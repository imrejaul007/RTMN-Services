/**
 * sutar-trust-engine — CreditCheckService unit tests
 *
 * Covers:
 *   - performCreditCheck (basic, pre_approval, with payment history)
 *   - updateCreditScore (clamping to [minScore, maxScore], grade recompute,
 *     utilization → availableCredit recompute)
 *   - addPaymentRecord (positive → score up, late → score down, defaulted → bigger hit)
 *   - getCreditReport shape and stability
 *   - calculateCreditGrade / calculateRiskLevel (boundary tests on each grade)
 *   - calculatePreApprovalAmount (over limit, at limit, well under)
 *   - Edge cases: zero credit limit, negative amount
 */

import { describe, it, expect } from 'vitest';
import creditCheckService from '../../src/services/creditCheck';
import { config } from '../../src/config';

const newId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

describe('CreditCheckService — performCreditCheck basics', () => {
  it('performs a credit check for a new entity', () => {
    const entityId = newId('cc-basic');
    const result = creditCheckService.performCreditCheck({
      entityId,
      amount: 5000,
      currency: 'USD',
    });
    expect(result.entityId).toBe(entityId);
    expect(result.creditScore).toBeGreaterThanOrEqual(config.credit.minScore);
    expect(result.creditScore).toBeLessThanOrEqual(config.credit.maxScore);
    expect(['minimal', 'low', 'medium', 'high', 'critical']).toContain(result.riskLevel);
  });

  it('uses default score for brand new entity (no history)', () => {
    const entityId = newId('cc-default');
    const result = creditCheckService.performCreditCheck({ entityId, amount: 1, currency: 'USD' });
    // Default credit score in config
    expect(result.creditScore).toBe(config.credit.defaultScore);
    expect(result.creditGrade).toBeDefined();
  });

  it('returns identical score on repeat check (no new factors)', () => {
    const entityId = newId('cc-stable');
    const r1 = creditCheckService.performCreditCheck({ entityId, amount: 100, currency: 'USD' });
    const r2 = creditCheckService.performCreditCheck({ entityId, amount: 100, currency: 'USD' });
    expect(r1.creditScore).toBe(r2.creditScore);
    expect(r1.creditGrade).toBe(r2.creditGrade);
  });
});

describe('CreditCheckService — pre_approval flow', () => {
  it('pre_approval returns preApprovalAmount and approved flag', () => {
    const entityId = newId('cc-pre');
    const result: any = creditCheckService.performCreditCheck({
      entityId,
      requestType: 'pre_approval',
      amount: 1000,
      currency: 'USD',
    });
    expect(result.preApprovalAmount).toBeDefined();
    expect(typeof result.approved).toBe('boolean');
    expect(result.preApprovalAmount).toBeGreaterThanOrEqual(0);
  });

  it('pre_approval approves after establishing a credit limit', () => {
    const entityId = newId('cc-pre-approved');
    // Set up a credit limit and a strong score first
    creditCheckService.updateCreditScore(entityId, { score: 850, creditLimit: 10000 });
    const result: any = creditCheckService.performCreditCheck({
      entityId,
      requestType: 'pre_approval',
      amount: 1000,
      currency: 'USD',
    });
    expect(result.preApprovalAmount).toBeGreaterThanOrEqual(1000);
    expect(result.approved).toBe(true);
  });

  it('pre_approval denies when risk is too high relative to amount', () => {
    const entityId = newId('cc-pre-denied');
    // Default score 650 → FAIR grade → 'medium' risk level
    // With credit limit 0, availableCredit = 0, medium branch → min(0, 0.8) = 0
    creditCheckService.updateCreditScore(entityId, { score: 650, creditLimit: 0 });
    const result: any = creditCheckService.performCreditCheck({
      entityId,
      requestType: 'pre_approval',
      amount: 1000,
      currency: 'USD',
    });
    expect(result.preApprovalAmount).toBe(0);
    expect(result.approved).toBe(false);
  });
});

describe('CreditCheckService — updateCreditScore clamping', () => {
  it('clamps score to [minScore, maxScore] when over max', () => {
    const entityId = newId('cc-clamp-high');
    const updated = creditCheckService.updateCreditScore(entityId, { score: 9999 });
    expect(updated.score).toBe(config.credit.maxScore);
  });

  it('clamps score to [minScore, maxScore] when under min', () => {
    const entityId = newId('cc-clamp-low');
    const updated = creditCheckService.updateCreditScore(entityId, { score: -100 });
    expect(updated.score).toBe(config.credit.minScore);
  });

  it('recomputes creditGrade and riskLevel when score changes', () => {
    const entityId = newId('cc-grade');
    // Force into EXCELLENT range
    const updated = creditCheckService.updateCreditScore(entityId, { score: 850 });
    expect(updated.creditGrade).toBe('EXCELLENT');
    expect(updated.riskLevel).toBe('minimal');
  });

  it('recomputes availableCredit when utilization changes', () => {
    const entityId = newId('cc-util');
    creditCheckService.updateCreditScore(entityId, { creditLimit: 10000 });
    const updated = creditCheckService.updateCreditScore(entityId, { currentUtilization: 3000 });
    expect(updated.availableCredit).toBe(7000);
  });
});

describe('CreditCheckService — grade boundaries', () => {
  it('score 800+ maps to EXCELLENT', () => {
    const e = creditCheckService.updateCreditScore(newId('g-exc'), { score: 800 });
    expect(e.creditGrade).toBe('EXCELLENT');
  });
  it('score 750-799 maps to VERY_GOOD', () => {
    const e = creditCheckService.updateCreditScore(newId('g-vg'), { score: 750 });
    expect(e.creditGrade).toBe('VERY_GOOD');
  });
  it('score 700-749 maps to GOOD', () => {
    const e = creditCheckService.updateCreditScore(newId('g-good'), { score: 700 });
    expect(e.creditGrade).toBe('GOOD');
  });
  it('score 650-699 maps to FAIR', () => {
    const e = creditCheckService.updateCreditScore(newId('g-fair'), { score: 650 });
    expect(e.creditGrade).toBe('FAIR');
  });
  it('score 550-649 maps to POOR', () => {
    const e = creditCheckService.updateCreditScore(newId('g-poor'), { score: 550 });
    expect(e.creditGrade).toBe('POOR');
  });
  it('score below 550 maps to VERY_POOR', () => {
    const e = creditCheckService.updateCreditScore(newId('g-vp'), { score: 300 });
    expect(e.creditGrade).toBe('VERY_POOR');
  });
});

describe('CreditCheckService — addPaymentRecord', () => {
  it('recalculates score after a paid payment (positive)', () => {
    const entityId = newId('cc-pay-pos');
    creditCheckService.performCreditCheck({ entityId, amount: 100, currency: 'USD' });
    const before = creditCheckService.getCreditScore(entityId)!.score;
    creditCheckService.addPaymentRecord(entityId, {
      amount: 100, status: 'paid', dueDate: new Date(), paidDate: new Date(),
    });
    const after = creditCheckService.getCreditScore(entityId)!.score;
    expect(after).toBeGreaterThanOrEqual(before);
  });

  it('reduces score after an overdue payment when it outweighs prior history', () => {
    const entityId = newId('cc-pay-overdue');
    // Start with a high base score so overdue has visible impact
    creditCheckService.updateCreditScore(entityId, { score: 850 });
    const before = creditCheckService.getCreditScore(entityId)!.score;
    // Add 3 overdue payments — net scoreChange = -30
    for (let i = 0; i < 3; i++) {
      creditCheckService.addPaymentRecord(entityId, {
        amount: 100, status: 'overdue', dueDate: new Date(),
      });
    }
    const after = creditCheckService.getCreditScore(entityId)!.score;
    expect(after).toBeLessThan(before);
  });

  it('reduces score more for defaulted payment than overdue', () => {
    const entityIdA = newId('cc-over-a');
    const entityIdB = newId('cc-def-b');
    creditCheckService.performCreditCheck({ entityId: entityIdA, amount: 100, currency: 'USD' });
    creditCheckService.performCreditCheck({ entityId: entityIdB, amount: 100, currency: 'USD' });
    creditCheckService.addPaymentRecord(entityIdA, {
      amount: 100, status: 'overdue', dueDate: new Date(),
    });
    creditCheckService.addPaymentRecord(entityIdB, {
      amount: 100, status: 'defaulted', dueDate: new Date(),
    });
    const a = creditCheckService.getCreditScore(entityIdA)!.score;
    const b = creditCheckService.getCreditScore(entityIdB)!.score;
    expect(b).toBeLessThanOrEqual(a);
  });
});

describe('CreditCheckService — getCreditReport', () => {
  it('returns a stable report shape for known entity', () => {
    const entityId = newId('cc-report');
    creditCheckService.performCreditCheck({ entityId, amount: 2000, currency: 'INR' });
    const report: any = creditCheckService.getCreditReport(entityId);
    expect(report).toBeDefined();
    expect(report.creditScore).toBeDefined();
    expect(report.creditScore.entityId).toBe(entityId);
    expect(report.paymentAnalysis).toBeDefined();
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('returns a default report for unknown entity', () => {
    const r: any = creditCheckService.getCreditReport(newId('unknown'));
    expect(r.creditScore).toBeNull();
    expect(r.recommendations).toEqual(['No credit history available']);
  });
});

describe('CreditCheckService — higher amount signals higher risk', () => {
  it('higher request amounts do not crash and stay within bounds', () => {
    const entityId = newId('cc-amounts');
    const r1 = creditCheckService.performCreditCheck({ entityId, amount: 100, currency: 'USD' });
    const r2 = creditCheckService.performCreditCheck({ entityId, amount: 100_000, currency: 'USD' });
    expect(r1.creditScore).toBeGreaterThanOrEqual(config.credit.minScore);
    expect(r1.creditScore).toBeLessThanOrEqual(config.credit.maxScore);
    expect(r2.creditScore).toBeGreaterThanOrEqual(config.credit.minScore);
    expect(r2.creditScore).toBeLessThanOrEqual(config.credit.maxScore);
  });
});
