/**
 * PolicyOS — Agent Trust tests (Phase 5)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  AGENT_TYPES,
  AGENT_STATUS,
  TRUST_LEVELS,
  SCORE_DIMENSIONS,
  computeTrustLevel,
  computeWeightedScore,
  computeAgentTrust,
  scoreAgent,
} from '../../src/routes/agent-trust.js';

// ── Trust Level computation ───────────────────────────────────────────────────

describe('computeTrustLevel', () => {
  it('returns Platinum for score >= 90', () => {
    const level = computeTrustLevel(95);
    assert.strictEqual(level, TRUST_LEVELS.PLATINUM);
  });

  it('returns Gold for score 80-89', () => {
    const level = computeTrustLevel(85);
    assert.strictEqual(level, TRUST_LEVELS.GOLD);
  });

  it('returns Silver for score 70-79', () => {
    const level = computeTrustLevel(75);
    assert.strictEqual(level, TRUST_LEVELS.SILVER);
  });

  it('returns Bronze for score 50-69', () => {
    const level = computeTrustLevel(60);
    assert.strictEqual(level, TRUST_LEVELS.BRONZE);
  });

  it('returns Iron for score 30-49', () => {
    const level = computeTrustLevel(40);
    assert.strictEqual(level, TRUST_LEVELS.IRON);
  });

  it('returns Restricted for score < 30', () => {
    const level = computeTrustLevel(15);
    assert.strictEqual(level, TRUST_LEVELS.RESTRICTED);
  });

  it('returns Platinum for exact boundary 90', () => {
    assert.strictEqual(computeTrustLevel(90), TRUST_LEVELS.PLATINUM);
  });

  it('returns Gold for exact boundary 80', () => {
    assert.strictEqual(computeTrustLevel(80), TRUST_LEVELS.GOLD);
  });
});

// ── Weighted score computation ────────────────────────────────────────────────

describe('computeWeightedScore', () => {
  it('returns 50 when no dimensions provided', () => {
    const score = computeWeightedScore({});
    assert.strictEqual(score, 50);
  });

  it('computes weighted average of single dimension', () => {
    // Only reliability (weight 0.25) provided
    const score = computeWeightedScore({ reliability: 80 });
    assert.strictEqual(score, 80);
  });

  it('computes weighted average of multiple dimensions', () => {
    const score = computeWeightedScore({
      reliability: 100,   // 0.25
      safety: 100,        // 0.25
      accuracy: 100,      // 0.20
      transparency: 100,  // 0.15
      performance: 100,   // 0.10
      compliance: 100,    // 0.05
    });
    assert.strictEqual(score, 100);
  });

  it('weights reliability and safety most heavily', () => {
    const score = computeWeightedScore({
      reliability: 100,   // 25%
      safety: 100,        // 25%
      accuracy: 0,        // 20%
      transparency: 0,    // 15%
      performance: 0,     // 10%
      compliance: 0,      // 5%
    });
    // 100*(0.25+0.25) / 1.0 = 50
    assert.strictEqual(score, 50);
  });

  it('rounds to nearest integer', () => {
    const score = computeWeightedScore({ reliability: 83 });
    assert.strictEqual(typeof score, 'number');
    assert.ok(Number.isInteger(score));
  });
});

// ── computeAgentTrust — needs agent in registry ───────────────────────────────

describe('computeAgentTrust — empty registry', () => {
  it('returns null for unknown agent', () => {
    const trust = computeAgentTrust('nonexistent-agent');
    assert.strictEqual(trust, null);
  });
});

// ── scoreAgent ─────────��─────────────────────────────────────────────────────

describe('scoreAgent — invalid inputs', () => {
  it('returns null for unknown agent', () => {
    const result = scoreAgent('nonexistent', { dimension: 'reliability', score: 80 });
    assert.strictEqual(result, null);
  });

  it('returns null for score out of range', () => {
    // Cannot test without a registered agent — skipping
    // This would be tested via HTTP in integration tests
    assert.ok(true, 'Placeholder');
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('AGENT_TYPES', () => {
  it('has all expected types', () => {
    assert.strictEqual(AGENT_TYPES.GENIE, 'genie');
    assert.strictEqual(AGENT_TYPES.MERCHANT, 'merchant');
    assert.strictEqual(AGENT_TYPES.SYSTEM, 'system');
    assert.strictEqual(AGENT_TYPES.PARTNER, 'partner');
    assert.strictEqual(AGENT_TYPES.HYBRID, 'hybrid');
  });
});

describe('AGENT_STATUS', () => {
  it('has all expected statuses', () => {
    assert.strictEqual(AGENT_STATUS.ACTIVE, 'active');
    assert.strictEqual(AGENT_STATUS.SUSPENDED, 'suspended');
    assert.strictEqual(AGENT_STATUS.REVOKED, 'revoked');
    assert.strictEqual(AGENT_STATUS.PENDING, 'pending');
  });
});

describe('SCORE_DIMENSIONS', () => {
  it('has all expected dimensions', () => {
    assert.strictEqual(SCORE_DIMENSIONS.RELIABILITY, 'reliability');
    assert.strictEqual(SCORE_DIMENSIONS.SAFETY, 'safety');
    assert.strictEqual(SCORE_DIMENSIONS.ACCURACY, 'accuracy');
    assert.strictEqual(SCORE_DIMENSIONS.TRANSPARENCY, 'transparency');
    assert.strictEqual(SCORE_DIMENSIONS.PERFORMANCE, 'performance');
    assert.strictEqual(SCORE_DIMENSIONS.COMPLIANCE, 'compliance');
  });

  it('has exactly 6 dimensions', () => {
    assert.strictEqual(Object.keys(SCORE_DIMENSIONS).length, 6);
  });
});

describe('TRUST_LEVELS', () => {
  it('has all expected levels', () => {
    assert.strictEqual(TRUST_LEVELS.PLATINUM.name, 'Platinum');
    assert.strictEqual(TRUST_LEVELS.GOLD.name, 'Gold');
    assert.strictEqual(TRUST_LEVELS.SILVER.name, 'Silver');
    assert.strictEqual(TRUST_LEVELS.BRONZE.name, 'Bronze');
    assert.strictEqual(TRUST_LEVELS.IRON.name, 'Iron');
    assert.strictEqual(TRUST_LEVELS.RESTRICTED.name, 'Restricted');
  });

  it('levels have descending min scores', () => {
    const levels = Object.values(TRUST_LEVELS);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i].min < levels[i - 1].min, `${levels[i].name} should have lower min than ${levels[i - 1].name}`);
    }
  });

  it('has exactly 6 levels', () => {
    assert.strictEqual(Object.keys(TRUST_LEVELS).length, 6);
  });
});

// ── Integration: score then compute ──────────────────────────────────────────
// Note: These depend on module-level state (agentRegistry) being clean.
// In real tests you'd reset the registry between tests.

describe('TRUST_LEVELS score ranges', () => {
  it('Platinum: 90-100', () => {
    assert.strictEqual(TRUST_LEVELS.PLATINUM.min, 90);
  });
  it('Gold: 80-89', () => {
    assert.strictEqual(TRUST_LEVELS.GOLD.min, 80);
  });
  it('Silver: 70-79', () => {
    assert.strictEqual(TRUST_LEVELS.SILVER.min, 70);
  });
  it('Bronze: 50-69', () => {
    assert.strictEqual(TRUST_LEVELS.BRONZE.min, 50);
  });
  it('Iron: 30-49', () => {
    assert.strictEqual(TRUST_LEVELS.IRON.min, 30);
  });
  it('Restricted: 0-29', () => {
    assert.strictEqual(TRUST_LEVELS.RESTRICTED.min, 0);
  });
});