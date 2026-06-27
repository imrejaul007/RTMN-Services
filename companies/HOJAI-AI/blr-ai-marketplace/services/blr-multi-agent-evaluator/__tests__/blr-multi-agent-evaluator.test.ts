import { describe, it, expect } from 'vitest';

// BLR Multi-Agent Evaluator Constants
const EVALUATION_TYPES = ['capability', 'performance', 'reliability', 'cost'];
const SCORE_RANGES = { min: 0, max: 100 };

describe('BLR Multi-Agent Evaluator', () => {
  describe('Evaluation Types', () => {
    it('should have all evaluation types', () => {
      expect(EVALUATION_TYPES).toContain('capability');
      expect(EVALUATION_TYPES).toContain('performance');
      expect(EVALUATION_TYPES).toContain('reliability');
      expect(EVALUATION_TYPES).toContain('cost');
    });
  });

  describe('Score Validation', () => {
    const validateScore = (score: number): boolean => {
      return score >= SCORE_RANGES.min && score <= SCORE_RANGES.max;
    };

    it('should accept valid scores', () => {
      expect(validateScore(50)).toBe(true);
      expect(validateScore(0)).toBe(true);
      expect(validateScore(100)).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateScore(-1)).toBe(false);
      expect(validateScore(101)).toBe(false);
    });
  });

  describe('Agent Comparison', () => {
    const compareAgents = (agents: Array<{ id: string; scores: Record<string, number> }>) => {
      return [...agents].sort((a, b) => {
        const avgA = Object.values(a.scores).reduce((sum, s) => sum + s, 0) / Object.values(a.scores).length;
        const avgB = Object.values(b.scores).reduce((sum, s) => sum + s, 0) / Object.values(b.scores).length;
        return avgB - avgA;
      });
    };

    it('should rank agents by average score', () => {
      const agents = [
        { id: 'a1', scores: { capability: 80, performance: 70 } },
        { id: 'a2', scores: { capability: 90, performance: 85 } }
      ];
      const ranked = compareAgents(agents);
      expect(ranked[0].id).toBe('a2');
    });
  });

  describe('Weighted Scoring', () => {
    const calculateWeightedScore = (scores: Record<string, number>, weights: Record<string, number>): number => {
      let total = 0;
      let weightSum = 0;
      for (const [key, score] of Object.entries(scores)) {
        const weight = weights[key] || 1;
        total += score * weight;
        weightSum += weight;
      }
      return total / weightSum;
    };

    it('should calculate weighted average', () => {
      const scores = { quality: 80, speed: 60 };
      const weights = { quality: 2, speed: 1 };
      expect(calculateWeightedScore(scores, weights)).toBe(73.33);
    });
  });
});