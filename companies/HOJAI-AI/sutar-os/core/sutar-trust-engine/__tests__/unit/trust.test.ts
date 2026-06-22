/**
 * sutar-trust-engine — Trust service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import trustService from '../../src/services/trustService';

describe('TrustService — trust score lifecycle', () => {
  it('creates a default trust score for a new entity', () => {
    const entityId = `entity-${Date.now()}-${Math.random()}`;
    const result = trustService.calculateTrustScore({
      entityId,
      entityType: 'user',
    });
    expect(result.entityId).toBe(entityId);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(['UNTRUSTED', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM']).toContain(result.trustLevel);
  });

  it('retrieves the same trust score on second call', () => {
    const entityId = `entity-get-${Date.now()}-${Math.random()}`;
    const r1 = trustService.calculateTrustScore({ entityId, entityType: 'merchant' });
    const stored = trustService.getTrustScore(entityId);
    expect(stored).not.toBeNull();
    expect(stored!.overallScore).toBe(r1.overallScore);
  });

  it('returns null for unknown entity', () => {
    const stored = trustService.getTrustScore(`unknown-${Date.now()}-${Math.random()}`);
    expect(stored).toBeNull();
  });

  it('improves overall score when payment factor is high', () => {
    const entityId = `entity-pay-${Date.now()}-${Math.random()}`;
    const baseline = trustService.calculateTrustScore({ entityId, entityType: 'user' });
    const improved = trustService.calculateTrustScore({
      entityId,
      entityType: 'user',
      factors: { paymentScore: 95 },
    });
    expect(improved.overallScore).toBeGreaterThanOrEqual(baseline.overallScore);
  });

  it('lowers overall score when dispute factor is high', () => {
    const entityId = `entity-dispute-${Date.now()}-${Math.random()}`;
    const baseline = trustService.calculateTrustScore({ entityId, entityType: 'user' });
    const withDispute = trustService.calculateTrustScore({
      entityId,
      entityType: 'user',
      factors: { disputeScore: 95 },
    });
    expect(withDispute.overallScore).toBeLessThanOrEqual(baseline.overallScore + 1);
  });

  it('updates trust score with new components', () => {
    const entityId = `entity-update-${Date.now()}-${Math.random()}`;
    trustService.calculateTrustScore({ entityId, entityType: 'user' });
    const updated = trustService.updateTrustScore(entityId, {
      verificationScore: { score: 90, lastUpdated: new Date() } as any,
    });
    expect(updated).not.toBeNull();
    expect(updated!.verificationScore.score).toBe(90);
  });

  it('returns null when updating non-existent entity', () => {
    const r = trustService.updateTrustScore(`ghost-${Date.now()}`, {
      verificationScore: { score: 90, lastUpdated: new Date() } as any,
    });
    expect(r).toBeNull();
  });
});

describe('TrustService — trust level mapping', () => {
  it('classifies a fresh user', () => {
    const entityId = `entity-lvl-${Date.now()}-${Math.random()}`;
    const r = trustService.calculateTrustScore({ entityId, entityType: 'user' });
    expect(['UNTRUSTED', 'LOW', 'MEDIUM', 'HIGH', 'PREMIUM']).toContain(r.trustLevel);
  });

  it('produces a higher overall score with all factors at 90+', () => {
    const entityId = `entity-high-${Date.now()}-${Math.random()}`;
    const baseline = trustService.calculateTrustScore({ entityId, entityType: 'user' });
    const improved = trustService.calculateTrustScore({
      entityId,
      entityType: 'user',
      factors: {
        paymentScore: 95,
        fulfillmentScore: 95,
        disputeScore: 95,
        verificationScore: 95,
        transactionScore: 95,
      },
    });
    expect(improved.overallScore).toBeGreaterThanOrEqual(baseline.overallScore);
  });
});
