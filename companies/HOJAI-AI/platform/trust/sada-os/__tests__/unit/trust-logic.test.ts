/**
 * SADA Trust - unit tests for trust-logic pure functions.
 *
 * Tests the extracted helpers from modules/trustService.ts:
 *   - calculateTrustScore(history) — derives reliability/quality/compliance/overall
 *   - determineRiskLevel(score)     — maps overall score to LOW/MEDIUM/HIGH/CRITICAL
 *   - generateId(prefix)            — produces prefixed unique-ish IDs
 *
 * These don't need MongoDB or a running server — they are pure functions.
 */
import { describe, it, expect } from 'vitest';
import {
  calculateTrustScore,
  determineRiskLevel,
  generateId,
} from '../../src/modules/trustService';

describe('calculateTrustScore', () => {
  it('returns neutral 50/50/50/60-ish scores for empty history', () => {
    const r = calculateTrustScore({
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      disputedTransactions: 0,
    });
    // No history → successRate=0.5 → reliability=50, quality=100, compliance=100, overall weighted
    expect(r.reliability).toBe(50);
    expect(r.quality).toBe(100);
    expect(r.compliance).toBe(100);
    expect(r.overall).toBeGreaterThanOrEqual(60);
    expect(r.overall).toBeLessThanOrEqual(80);
  });

  it('rewards perfect success rate', () => {
    const r = calculateTrustScore({
      totalTransactions: 100,
      successfulTransactions: 100,
      failedTransactions: 0,
      disputedTransactions: 0,
    });
    expect(r.reliability).toBe(100);
    expect(r.quality).toBe(100);
    expect(r.compliance).toBe(100);
    // overall = reliability*0.35 + quality*0.25 + compliance*0.20 + 50*0.20
    //         = 35 + 25 + 20 + 10 = 90 (the 50 base score contributes 20%)
    expect(r.overall).toBe(90);
  });

  it('penalizes failures', () => {
    const r = calculateTrustScore({
      totalTransactions: 100,
      successfulTransactions: 50,
      failedTransactions: 50,
      disputedTransactions: 0,
    });
    // successRate=0.5 → reliability=50, failureRate=0.5 → compliance=round((1-0.5*3)*100)=-50 clamped to 0
    expect(r.reliability).toBe(50);
    expect(r.compliance).toBe(0);
  });

  it('heavily penalizes disputes', () => {
    const r = calculateTrustScore({
      totalTransactions: 100,
      successfulTransactions: 100,
      failedTransactions: 0,
      disputedTransactions: 20,
    });
    // disputeRate=0.2 → quality=round((1-0.2*5)*100)=0
    expect(r.quality).toBe(0);
    expect(r.reliability).toBe(100);
  });

  it('clamps all values to [0, 100]', () => {
    const r = calculateTrustScore({
      totalTransactions: 1000,
      successfulTransactions: 0,
      failedTransactions: 1000,
      disputedTransactions: 1000,
    });
    expect(r.reliability).toBeGreaterThanOrEqual(0);
    expect(r.reliability).toBeLessThanOrEqual(100);
    expect(r.quality).toBeGreaterThanOrEqual(0);
    expect(r.quality).toBeLessThanOrEqual(100);
    expect(r.compliance).toBeGreaterThanOrEqual(0);
    expect(r.compliance).toBeLessThanOrEqual(100);
    expect(r.overall).toBeGreaterThanOrEqual(0);
    expect(r.overall).toBeLessThanOrEqual(100);
  });
});

describe('determineRiskLevel', () => {
  it('maps scores to risk bands correctly', () => {
    expect(determineRiskLevel(100)).toBe('LOW');
    expect(determineRiskLevel(80)).toBe('LOW');
    expect(determineRiskLevel(79)).toBe('MEDIUM');
    expect(determineRiskLevel(60)).toBe('MEDIUM');
    expect(determineRiskLevel(59)).toBe('HIGH');
    expect(determineRiskLevel(40)).toBe('HIGH');
    expect(determineRiskLevel(39)).toBe('CRITICAL');
    expect(determineRiskLevel(0)).toBe('CRITICAL');
  });
});

describe('generateId', () => {
  it('produces a string with the requested prefix', () => {
    const id = generateId('TRUST');
    expect(id).toMatch(/^TRUST-[0-9A-F]{8}-/);
  });

  it('uses the default TR prefix', () => {
    const id = generateId();
    expect(id).toMatch(/^TR-[0-9A-F]{8}-/);
  });

  it('returns unique values across calls', () => {
    const ids = new Set();
    for (let i = 0; i < 50; i++) ids.add(generateId('TEST'));
    expect(ids.size).toBe(50);
  });
});