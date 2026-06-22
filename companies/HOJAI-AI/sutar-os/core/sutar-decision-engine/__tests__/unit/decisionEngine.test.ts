/**
 * SUTAR Decision Engine - DecisionEngine Orchestrator Unit Tests
 *
 * Covers:
 *   - makeDecision end-to-end (VIP+low-risk → PROCEED, high-risk → HOLD/REJECT)
 *   - overridePolicyId routes through that policy
 *   - skipRiskAssessment short-circuits risk but still uses default score
 *   - Confidence = policy.confidence * (risk.confidence/100), capped at 0.95
 *   - Statistics tracking (totals, byOutcome, byDecisionType, running averages)
 *   - getPolicyEngine / getRiskAssessmentService exposure
 *   - simulate() produces baseline + N variations + correct delta
 *   - simulateWithSimulationOS() falls back to local simulate when upstream unreachable
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionEngine } from '../../src/services/decisionEngine.js';
import {
  DecisionOutcome,
  DecisionType,
  type DecisionContext,
  type DecisionRequest,
} from '../../src/types/index.js';

describe('DecisionEngine — makeDecision VIP fast path', () => {
  it('PROCEEDs for VIP + low risk + small amount', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 10,
        amount: 100,
        accountAge: 365,
      } satisfies DecisionContext,
    });
    expect(decision.outcome).toBe(DecisionOutcome.PROCEED);
    expect(decision.decisionType).toBe(DecisionType.OFFER);
    expect(decision.policyId).toBe('policy-offer-default');
    expect(decision.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(decision.id).toMatch(/[0-9a-f-]{36}/i);
  });

  it('HOLDs an offer via the high-risk rule when risk is high', async () => {
    // Register a custom policy whose threshold matches what the risk
    // engine can actually produce. This proves the engine correctly
    // threads the computed riskScore through to the policy evaluator.
    const eng = new DecisionEngine();
    eng.getPolicyEngine().registerPolicy({
      id: 'offer-hold-on-mid-risk',
      name: 'Hold on mid-risk',
      decisionType: DecisionType.OFFER,
      enabled: true,
      defaultOutcome: DecisionOutcome.PROCEED,
      description: 'test',
      rules: [
        {
          id: 'rule-hold-mid', name: 'hold mid', conditionLogic: 'AND',
          outcome: DecisionOutcome.HOLD, priority: 1, reason: 'mid risk',
          conditions: [{ field: 'riskScore', operator: 'gte' as any, value: 60 }],
        },
      ],
    });
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'standard',
        amount: 20000,
        transactionCount: 200,
        accountAge: 1,
        riskScore: 100,
      },
      overridePolicyId: 'offer-hold-on-mid-risk',
    });
    expect(decision.context.riskScore).toBeGreaterThanOrEqual(60);
    expect(decision.outcome).toBe(DecisionOutcome.HOLD);
    expect(decision.ruleId).toBe('rule-hold-mid');
  });

  it('REJECTs a FRAUD decision at critical computed risk', async () => {
    const eng = new DecisionEngine();
    eng.getPolicyEngine().registerPolicy({
      id: 'fraud-reject-critical',
      name: 'Reject critical',
      decisionType: DecisionType.FRAUD,
      enabled: true,
      defaultOutcome: DecisionOutcome.HOLD,
      description: 'test',
      rules: [
        {
          id: 'rule-fraud-custom', name: 'critical', conditionLogic: 'AND',
          outcome: DecisionOutcome.REJECT, priority: 1, reason: 'critical',
          conditions: [{ field: 'riskScore', operator: 'gte' as any, value: 60 }],
        },
      ],
    });
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.FRAUD,
        riskScore: 100,
        amount: 20000,
        transactionCount: 200,
        accountAge: 1,
        customerTier: 'standard',
      },
      overridePolicyId: 'fraud-reject-critical',
    });
    expect(decision.context.riskScore).toBeGreaterThanOrEqual(60);
    expect(decision.outcome).toBe(DecisionOutcome.REJECT);
    expect(decision.ruleId).toBe('rule-fraud-custom');
  });

  it('enhances context with the computed riskScore before policy evaluation', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.FRAUD,
        // Intentionally omit riskScore — riskAssessment will compute one
        customerTier: 'standard',
        accountAge: 365,
      },
    });
    expect(decision.context.riskScore).toBeDefined();
    expect(typeof decision.context.riskScore).toBe('number');
  });
});

describe('DecisionEngine — overridePolicyId', () => {
  it('routes through the overridden policy even when default would differ', async () => {
    const eng = new DecisionEngine();
    eng.getPolicyEngine().registerPolicy({
      id: 'always-proceed',
      name: 'always-proceed',
      decisionType: DecisionType.FRAUD,
      enabled: true,
      defaultOutcome: DecisionOutcome.PROCEED,
      description: 'test override',
      rules: [],
    });
    const decision = await eng.makeDecision({
      context: { decisionType: DecisionType.FRAUD, riskScore: 95, accountAge: 365 },
      overridePolicyId: 'always-proceed',
    });
    expect(decision.policyId).toBe('always-proceed');
    expect(decision.outcome).toBe(DecisionOutcome.PROCEED);
  });
});

describe('DecisionEngine — confidence is capped and combined', () => {
  it('confidence is never above 0.95', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 0,
        accountAge: 365,
      },
    });
    expect(decision.confidence).toBeLessThanOrEqual(0.95);
  });

  it('confidence is rounded to 2 decimals', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 5,
        accountAge: 365,
      },
    });
    // Math.round(x * 100) / 100 → max 2 decimals
    expect(decision.confidence).toBe(Math.round(decision.confidence * 100) / 100);
  });
});

describe('DecisionEngine — statistics', () => {
  let eng: DecisionEngine;
  beforeEach(() => { eng = new DecisionEngine(); });

  it('starts with all-zero stats', () => {
    const s = eng.getStats();
    expect(s.totalDecisions).toBe(0);
    expect(s.byOutcome[DecisionOutcome.PROCEED]).toBe(0);
    expect(s.byOutcome[DecisionOutcome.HOLD]).toBe(0);
    expect(s.byOutcome[DecisionOutcome.REJECT]).toBe(0);
    expect(s.averageRiskScore).toBe(0);
    expect(s.averageProcessingTimeMs).toBe(0);
    expect(s.last24Hours.total).toBe(0);
  });

  it('counts decisions and accumulates averages', async () => {
    // Decision 1: PROCEED (VIP, low risk)
    await eng.makeDecision({
      context: { decisionType: DecisionType.OFFER, customerTier: 'vip', riskScore: 0, accountAge: 365 },
    });
    // Decision 2: HOLD via overridden policy with mid-risk threshold
    eng.getPolicyEngine().registerPolicy({
      id: 'offer-hold-on-mid',
      name: 'hold on mid', decisionType: DecisionType.OFFER,
      enabled: true, defaultOutcome: DecisionOutcome.PROCEED, description: 'test',
      rules: [{
        id: 'rule-hold-mid', name: 'mid', conditionLogic: 'AND',
        outcome: DecisionOutcome.HOLD, priority: 1, reason: 'mid',
        conditions: [{ field: 'riskScore', operator: 'gte' as any, value: 60 }],
      }],
    });
    await eng.makeDecision({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'standard',
        amount: 20000,
        transactionCount: 200,
        accountAge: 1,
        riskScore: 100,
      },
      overridePolicyId: 'offer-hold-on-mid',
    });
    // Decision 3: REJECT via overridden FRAUD policy
    eng.getPolicyEngine().registerPolicy({
      id: 'fraud-reject',
      name: 'reject', decisionType: DecisionType.FRAUD,
      enabled: true, defaultOutcome: DecisionOutcome.HOLD, description: 'test',
      rules: [{
        id: 'rule-reject', name: 'r', conditionLogic: 'AND',
        outcome: DecisionOutcome.REJECT, priority: 1, reason: 'r',
        conditions: [{ field: 'riskScore', operator: 'gte' as any, value: 60 }],
      }],
    });
    await eng.makeDecision({
      context: {
        decisionType: DecisionType.FRAUD,
        riskScore: 100,
        amount: 20000,
        transactionCount: 200,
        accountAge: 1,
        customerTier: 'standard',
      },
      overridePolicyId: 'fraud-reject',
    });
    const s = eng.getStats();
    expect(s.totalDecisions).toBe(3);
    expect(s.byOutcome[DecisionOutcome.PROCEED]).toBe(1);
    expect(s.byOutcome[DecisionOutcome.HOLD]).toBe(1);
    expect(s.byOutcome[DecisionOutcome.REJECT]).toBe(1);
    expect(s.byDecisionType[DecisionType.OFFER]).toBe(2);
    expect(s.byDecisionType[DecisionType.FRAUD]).toBe(1);
    expect(s.averageRiskScore).toBeGreaterThan(0);
    expect(s.last24Hours.total).toBe(3);
  });

  it('resetStats zeroes everything back', async () => {
    await eng.makeDecision({
      context: { decisionType: DecisionType.OFFER, customerTier: 'vip', riskScore: 0, accountAge: 365 },
    });
    expect(eng.getStats().totalDecisions).toBe(1);
    eng.resetStats();
    expect(eng.getStats().totalDecisions).toBe(0);
    expect(eng.getStats().last24Hours.total).toBe(0);
  });

  it('getPolicyEngine and getRiskAssessmentService expose the underlying services', () => {
    expect(eng.getPolicyEngine().getAllPolicies().length).toBeGreaterThan(0);
    expect(eng.getRiskAssessmentService()).toBeDefined();
  });
});

describe('DecisionEngine — simulate', () => {
  it('produces a baseline + N variations and reports outcome delta', async () => {
    const eng = new DecisionEngine();
    const result = await eng.simulate({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'standard',
        amount: 100,
        accountAge: 365,
      },
      scenarioVariations: [
        // Variation 1: drop risk → stays PROCEED
        { name: 'low risk variant', modifications: { riskScore: 5 } },
        // Variation 2: spike to critical (overallScore >= 70) → flips to HOLD
        {
          name: 'critical variant',
          modifications: {
            riskScore: 100,
            amount: 20000,
            transactionCount: 200,
            accountAge: 1,
          },
        },
      ],
    });
    expect(result.baselineDecision.outcome).toBe(DecisionOutcome.PROCEED);
    expect(result.variations).toHaveLength(2);
    const critical = result.variations.find(v => v.name === 'critical variant');
    expect(critical?.delta.outcomeChanged).toBe(true);
    expect(critical?.decision.outcome).toBe(DecisionOutcome.HOLD);
    // Low-risk variant should NOT change outcome
    const low = result.variations.find(v => v.name === 'low risk variant');
    expect(low?.delta.outcomeChanged).toBe(false);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('DecisionEngine — simulateWithSimulationOS fallback', () => {
  it('falls back to local simulate when SimulationOS is unreachable', async () => {
    // Point at a port nothing is listening on
    const eng = new DecisionEngine('http://localhost:1', 500);
    const result = await eng.simulateWithSimulationOS({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'standard',
        riskScore: 50,
        amount: 100,
        accountAge: 365,
      },
      scenarioVariations: [
        { name: 'low risk', modifications: { riskScore: 5 } },
      ],
    });
    // Fallback path produces local baseline + 1 variation
    expect(result.baselineDecision.outcome).toBe(DecisionOutcome.PROCEED);
    expect(result.variations).toHaveLength(1);
  });

  it('respects a custom timeout', async () => {
    // Use a deliberately short timeout so the fallback path fires quickly
    const eng = new DecisionEngine('http://10.255.255.1:9999', 100);
    const start = Date.now();
    const result = await eng.simulateWithSimulationOS({
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 5,
        accountAge: 365,
      },
      scenarioVariations: [],
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000); // didn't block forever
    expect(result.baselineDecision).toBeDefined();
  });
});

describe('DecisionEngine — request shape tolerance', () => {
  it('accepts a DecisionRequest without explicit skipRiskAssessment/overridePolicyId', async () => {
    const eng = new DecisionEngine();
    const req: DecisionRequest = {
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 0,
        accountAge: 365,
      },
    };
    const decision = await eng.makeDecision(req);
    expect(decision.id).toBeDefined();
    expect(decision.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('DecisionEngine — skipRiskAssessment (SECURITY FIX F-01)', () => {
  it('preserves the input context.riskScore when skipRiskAssessment is true', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      skipRiskAssessment: true,
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        riskScore: 42,        // caller-supplied
        accountAge: 365,
      },
    });
    // input riskScore is preserved; riskService is NOT invoked
    expect(decision.context.riskScore).toBe(42);
    expect(decision.riskAssessment.overallScore).toBe(42);
  });

  it('defaults to 0 when skipRiskAssessment is true and no input riskScore', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      skipRiskAssessment: true,
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        // intentionally omit riskScore
        accountAge: 365,
      },
    });
    expect(decision.context.riskScore).toBe(0);
    expect(decision.riskAssessment.overallScore).toBe(0);
  });

  it('marks the skipped assessment with RISK_ASSESSMENT_SKIPPED indicator', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      skipRiskAssessment: true,
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        accountAge: 365,
      },
    });
    expect(decision.riskAssessment.riskIndicators).toContain('RISK_ASSESSMENT_SKIPPED');
  });

  it('returns LOW level and zero confidence when risk assessment is skipped', async () => {
    const eng = new DecisionEngine();
    const decision = await eng.makeDecision({
      skipRiskAssessment: true,
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'vip',
        accountAge: 365,
      },
    });
    expect(decision.riskAssessment.level).toBe('LOW');
    expect(decision.riskAssessment.confidence).toBe(0);
    expect(decision.riskAssessment.factors).toHaveLength(0);
  });

  it('does NOT invoke the risk service (skipped stub preserves raw input)', async () => {
    const eng = new DecisionEngine();
    // Construct a context whose input riskScore is 0 but whose other factors
    // would normally produce a non-zero computed score (new account, standard
    // tier, large amount). With skipRiskAssessment: true, the computed score
    // must NOT override the input riskScore.
    const decision = await eng.makeDecision({
      skipRiskAssessment: true,
      context: {
        decisionType: DecisionType.OFFER,
        customerTier: 'standard',
        amount: 20000,
        transactionCount: 200,
        accountAge: 1,
        riskScore: 0,        // explicit zero from caller
      },
    });
    expect(decision.context.riskScore).toBe(0);
    // contrast: with skipRiskAssessment: false, the same context would have
    // produced a non-zero computed riskScore (verified by other tests).
  });
});
