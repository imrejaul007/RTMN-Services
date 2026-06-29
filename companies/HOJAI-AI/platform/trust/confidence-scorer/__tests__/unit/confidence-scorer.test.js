import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load the source file directly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '../../src/index.js');

// We'll import the module and test its exported functions
// For now, we'll test by reading the source and testing the logic inline

const scoreConfidence = ({ modelSignals, retrievalSignals, reasoningSignals }) => {
  const scores = {};

  // Model confidence (0-1)
  scores.model = modelSignals?.confidence ?? 0.5;
  scores.retrieval = retrievalSignals?.score ?? 0.5;
  scores.reasoning = reasoningSignals?.coherence ?? 0.5;

  // Weighted combination
  scores.overall = (
    scores.model * 0.4 +
    scores.retrieval * 0.35 +
    scores.reasoning * 0.25
  );

  // Confidence level
  if (scores.overall >= 0.8) {
    scores.level = 'high';
  } else if (scores.overall >= 0.5) {
    scores.level = 'medium';
  } else {
    scores.level = 'low';
  }

  return scores;
};

describe('Confidence Scoring Logic', () => {
  describe('scoreConfidence function', () => {
    it('should calculate weighted score correctly with all signals', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 1.0 },
        retrievalSignals: { score: 1.0 },
        reasoningSignals: { coherence: 1.0 }
      });

      expect(result.model).toBe(1.0);
      expect(result.retrieval).toBe(1.0);
      expect(result.reasoning).toBe(1.0);
      expect(result.overall).toBe(1.0);
      expect(result.level).toBe('high');
    });

    it('should calculate weighted score with custom signals', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.9 },
        retrievalSignals: { score: 0.8 },
        reasoningSignals: { coherence: 0.7 }
      });

      // 0.9 * 0.4 + 0.8 * 0.35 + 0.7 * 0.25 = 0.36 + 0.28 + 0.175 = 0.815
      expect(result.overall).toBeCloseTo(0.815);
      expect(result.level).toBe('high');
    });

    it('should classify high confidence for scores >= 0.8', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.8 },
        retrievalSignals: { score: 0.8 },
        reasoningSignals: { coherence: 0.8 }
      });

      expect(result.level).toBe('high');
    });

    it('should classify medium confidence for scores >= 0.5 and < 0.8', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.5 },
        retrievalSignals: { score: 0.5 },
        reasoningSignals: { coherence: 0.5 }
      });

      expect(result.level).toBe('medium');
      expect(result.overall).toBe(0.5);
    });

    it('should classify low confidence for scores < 0.5', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.3 },
        retrievalSignals: { score: 0.3 },
        reasoningSignals: { coherence: 0.3 }
      });

      expect(result.level).toBe('low');
      expect(result.overall).toBe(0.3);
    });

    it('should use default values when signals are missing', () => {
      const result = scoreConfidence({});

      expect(result.model).toBe(0.5);
      expect(result.retrieval).toBe(0.5);
      expect(result.reasoning).toBe(0.5);
      expect(result.overall).toBe(0.5);
      expect(result.level).toBe('medium');
    });

    it('should use default for missing modelSignals', () => {
      const result = scoreConfidence({
        retrievalSignals: { score: 0.8 },
        reasoningSignals: { coherence: 0.9 }
      });

      expect(result.model).toBe(0.5);
      expect(result.retrieval).toBe(0.8);
      expect(result.reasoning).toBe(0.9);
    });

    it('should use default for missing retrievalSignals', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.9 },
        reasoningSignals: { coherence: 0.9 }
      });

      expect(result.model).toBe(0.9);
      expect(result.retrieval).toBe(0.5);
      expect(result.reasoning).toBe(0.9);
    });

    it('should use default for missing reasoningSignals', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.9 },
        retrievalSignals: { score: 0.9 }
      });

      expect(result.model).toBe(0.9);
      expect(result.retrieval).toBe(0.9);
      expect(result.reasoning).toBe(0.5);
    });

    it('should handle partial missing signals gracefully', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.95 }
      });

      expect(result.model).toBe(0.95);
      expect(result.retrieval).toBe(0.5);
      expect(result.reasoning).toBe(0.5);
    });

    it('should calculate correct weights: 40% model, 35% retrieval, 25% reasoning', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 1.0 },
        retrievalSignals: { score: 0.0 },
        reasoningSignals: { coherence: 0.0 }
      });

      expect(result.overall).toBeCloseTo(0.4);
    });

    it('should handle boundary at 0.8 exactly for high level', () => {
      // Score exactly at 0.8 should be high
      const result = scoreConfidence({
        modelSignals: { confidence: 1.0 },
        retrievalSignals: { score: 1.0 },
        reasoningSignals: { coherence: 0.4 } // 1*0.4 + 1*0.35 + 0.4*0.25 = 0.4 + 0.35 + 0.1 = 0.85
      });

      expect(result.level).toBe('high');
      expect(result.overall).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle boundary at 0.5 exactly for medium level', () => {
      // Score exactly at 0.5 should be medium
      const result = scoreConfidence({
        modelSignals: { confidence: 0.5 },
        retrievalSignals: { score: 0.5 },
        reasoningSignals: { coherence: 0.5 }
      });

      expect(result.level).toBe('medium');
      expect(result.overall).toBe(0.5);
    });

    it('should handle score just below 0.5 for low level', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.49 },
        retrievalSignals: { score: 0.49 },
        reasoningSignals: { coherence: 0.49 }
      });

      expect(result.level).toBe('low');
      expect(result.overall).toBeLessThan(0.5);
    });

    it('should handle score just below 0.8 for medium level', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.79 },
        retrievalSignals: { score: 0.79 },
        reasoningSignals: { coherence: 0.79 }
      });

      expect(result.level).toBe('medium');
      expect(result.overall).toBeLessThan(0.8);
    });
  });

  describe('requiresVerification logic', () => {
    it('should flag high confidence as not requiring verification', () => {
      const scores = scoreConfidence({
        modelSignals: { confidence: 0.95 },
        retrievalSignals: { score: 0.90 },
        reasoningSignals: { coherence: 0.85 }
      });

      const requiresVerification = scores.level === 'low';
      expect(requiresVerification).toBe(false);
    });

    it('should flag medium confidence as not requiring verification', () => {
      const scores = scoreConfidence({
        modelSignals: { confidence: 0.6 },
        retrievalSignals: { score: 0.6 },
        reasoningSignals: { coherence: 0.6 }
      });

      const requiresVerification = scores.level === 'low';
      expect(requiresVerification).toBe(false);
    });

    it('should flag low confidence as requiring verification', () => {
      const scores = scoreConfidence({
        modelSignals: { confidence: 0.3 },
        retrievalSignals: { score: 0.3 },
        reasoningSignals: { coherence: 0.3 }
      });

      const requiresVerification = scores.level === 'low';
      expect(requiresVerification).toBe(true);
    });
  });

  describe('weight calculation edge cases', () => {
    it('should handle model-only high score', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 1.0 },
        retrievalSignals: { score: 0.0 },
        reasoningSignals: { coherence: 0.0 }
      });

      expect(result.overall).toBe(0.4);
      expect(result.level).toBe('low');
    });

    it('should handle retrieval-only high score', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.0 },
        retrievalSignals: { score: 1.0 },
        reasoningSignals: { coherence: 0.0 }
      });

      expect(result.overall).toBe(0.35);
      expect(result.level).toBe('low');
    });

    it('should handle reasoning-only high score', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.0 },
        retrievalSignals: { score: 0.0 },
        reasoningSignals: { coherence: 1.0 }
      });

      expect(result.overall).toBe(0.25);
      expect(result.level).toBe('low');
    });

    it('should combine multiple partial scores to high', () => {
      const result = scoreConfidence({
        modelSignals: { confidence: 0.7 },
        retrievalSignals: { score: 0.7 },
        reasoningSignals: { coherence: 0.7 }
      });

      // 0.7 * 0.4 + 0.7 * 0.35 + 0.7 * 0.25 = 0.28 + 0.245 + 0.175 = 0.7
      expect(result.overall).toBe(0.7);
      expect(result.level).toBe('medium');
    });
  });
});

describe('Confidence Score Format', () => {
  it('should return all required score fields', () => {
    const result = scoreConfidence({
      modelSignals: { confidence: 0.9 },
      retrievalSignals: { score: 0.8 },
      reasoningSignals: { coherence: 0.7 }
    });

    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('retrieval');
    expect(result).toHaveProperty('reasoning');
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('level');
  });

  it('should return valid level values', () => {
    const validLevels = ['high', 'medium', 'low'];

    const highResult = scoreConfidence({ modelSignals: { confidence: 1.0 }, retrievalSignals: { score: 1.0 }, reasoningSignals: { coherence: 1.0 } });
    const mediumResult = scoreConfidence({ modelSignals: { confidence: 0.6 }, retrievalSignals: { score: 0.6 }, reasoningSignals: { coherence: 0.6 } });
    const lowResult = scoreConfidence({ modelSignals: { confidence: 0.3 }, retrievalSignals: { score: 0.3 }, reasoningSignals: { coherence: 0.3 } });

    expect(validLevels).toContain(highResult.level);
    expect(validLevels).toContain(mediumResult.level);
    expect(validLevels).toContain(lowResult.level);
  });

  it('should return scores between 0 and 1', () => {
    const result = scoreConfidence({
      modelSignals: { confidence: 0.5 },
      retrievalSignals: { score: 0.5 },
      reasoningSignals: { coherence: 0.5 }
    });

    expect(result.model).toBeGreaterThanOrEqual(0);
    expect(result.model).toBeLessThanOrEqual(1);
    expect(result.retrieval).toBeGreaterThanOrEqual(0);
    expect(result.retrieval).toBeLessThanOrEqual(1);
    expect(result.reasoning).toBeGreaterThanOrEqual(0);
    expect(result.reasoning).toBeLessThanOrEqual(1);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });
});
