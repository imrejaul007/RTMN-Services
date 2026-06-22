/**
 * sutar-economy-os — Karma tier system unit tests
 */

import { describe, it, expect } from 'vitest';
import {
  KARMA_TIERS,
  KARMA_POINT_CONFIG,
  calculateTier,
  getTierInfo,
  getTierProgress,
  karmaService,
} from '../../src/services/karma.service.js';

describe('karma — tier configuration', () => {
  it('has 5 tiers (bronze, silver, gold, platinum, diamond)', () => {
    expect(Object.keys(KARMA_TIERS).sort()).toEqual(
      ['bronze', 'silver', 'gold', 'platinum', 'diamond'].sort()
    );
  });

  it('each tier has monotonically increasing minPoints', () => {
    const tiers = Object.values(KARMA_TIERS);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].minPoints).toBeGreaterThan(tiers[i - 1].minPoints);
    }
  });

  it('each tier has a multiplier >= 1.0', () => {
    for (const tier of Object.values(KARMA_TIERS)) {
      expect(tier.multiplier).toBeGreaterThanOrEqual(1.0);
    }
  });
});

describe('karma — point configuration', () => {
  it('has actions defined', () => {
    expect(Object.keys(KARMA_POINT_CONFIG).length).toBeGreaterThan(0);
  });

  it('positive actions (contract_signed, negotiation_completed, etc.) have positive basePoints', () => {
    const positiveActions: typeof KARMA_POINT_CONFIG[keyof typeof KARMA_POINT_CONFIG][] = [
      KARMA_POINT_CONFIG.contract_signed,
      KARMA_POINT_CONFIG.negotiation_completed,
      KARMA_POINT_CONFIG.decision_made,
      KARMA_POINT_CONFIG.referral,
      KARMA_POINT_CONFIG.contribution,
      KARMA_POINT_CONFIG.milestone,
      KARMA_POINT_CONFIG.streak,
      KARMA_POINT_CONFIG.bonus,
    ];
    for (const cfg of positiveActions) {
      expect(cfg.basePoints).toBeGreaterThan(0);
    }
  });

  it('penalty and refund actions have negative basePoints (deductions)', () => {
    expect(KARMA_POINT_CONFIG.penalty.basePoints).toBeLessThan(0);
    expect(KARMA_POINT_CONFIG.refund.basePoints).toBeLessThan(0);
  });
});

describe('karma — calculateTier', () => {
  it('returns bronze for 0 points', () => {
    expect(calculateTier(0)).toBe('bronze');
  });

  it('returns bronze for 999 (top of bronze)', () => {
    expect(calculateTier(999)).toBe('bronze');
  });

  it('returns silver for 1000', () => {
    expect(calculateTier(1000)).toBe('silver');
  });

  it('returns gold for 5000', () => {
    expect(calculateTier(5000)).toBe('gold');
  });

  it('returns platinum for 20000', () => {
    expect(calculateTier(20000)).toBe('platinum');
  });

  it('returns diamond for 50000', () => {
    expect(calculateTier(50000)).toBe('diamond');
  });

  it('handles very large numbers', () => {
    expect(calculateTier(1_000_000)).toBe('diamond');
  });
});

describe('karma — getTierInfo', () => {
  it('returns info for valid tier', () => {
    const info = getTierInfo('gold');
    expect(info.tier).toBe('gold');
    expect(info.minPoints).toBe(5000);
  });
});

describe('karma — getTierProgress', () => {
  it('returns 100% for max tier', () => {
    const p = getTierProgress(100_000);
    expect(p.nextTier).toBeNull();
    expect(p.progressPercent).toBe(100);
    expect(p.pointsToNextTier).toBeNull();
  });

  it('returns partial progress within a tier', () => {
    const p = getTierProgress(3000); // silver 1000-4999
    expect(p.currentTier).toBe('silver');
    expect(p.nextTier).toBe('gold');
    expect(p.pointsToNextTier).toBe(2000); // 5000 - 3000
    expect(p.progressPercent).toBeGreaterThan(0);
    expect(p.progressPercent).toBeLessThan(100);
  });

  it('returns 0% at start of bronze', () => {
    const p = getTierProgress(0);
    expect(p.currentTier).toBe('bronze');
    expect(p.progressPercent).toBe(0);
  });
});

describe('karma — KarmaService instance', () => {
  it('can earn points', async () => {
    const entityId = `test-entity-${Date.now()}`;
    const earned = await karmaService.earnKarma({
      entityId,
      entityType: 'user',
      action: 'contract_signed',
      reason: 'test',
    });
    expect(earned.points).toBeGreaterThan(0);
    expect(earned.entityId).toBe(entityId);
  });

  it('tracks balance after earn', async () => {
    const entityId = `test-entity-${Date.now()}-bal`;
    await karmaService.earnKarma({ entityId, entityType: 'user', action: 'contract_signed', reason: 'test' });
    const balance = await karmaService.getKarmaBalance(entityId);
    expect(balance).toBeDefined();
    expect(balance!.points).toBeGreaterThan(0);
  });

  it('can spend points', async () => {
    const entityId = `test-entity-${Date.now()}-spend`;
    await karmaService.earnKarma({ entityId, entityType: 'user', action: 'contract_signed', reason: 'test' });
    const bal = await karmaService.getKarmaBalance(entityId);
    const spendAmount = Math.min(50, Math.floor(bal!.points / 2));
    if (spendAmount > 0) {
      const spent = await karmaService.spendKarma({ entityId, points: spendAmount, reason: 'test' });
      expect(spent.points).toBe(-spendAmount);
    }
  });

  it('throws when spending more than balance', async () => {
    const entityId = `test-entity-${Date.now()}-over`;
    await karmaService.earnKarma({ entityId, entityType: 'user', action: 'contract_signed', reason: 'test' });
    await expect(
      karmaService.spendKarma({ entityId, points: 999_999, reason: 'test' })
    ).rejects.toThrow();
  });

  it('returns leaderboard', async () => {
    const lb = await karmaService.getLeaderboard(5);
    expect(Array.isArray(lb)).toBe(true);
    expect(lb.length).toBeLessThanOrEqual(5);
  });
});
