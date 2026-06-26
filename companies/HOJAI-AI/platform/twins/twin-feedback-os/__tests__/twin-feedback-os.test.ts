import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

// Mock feedback types
const FEEDBACK_TYPES = {
  approve: { description: 'Twin was correct', impact: 'increases_confidence', requiresCorrection: false },
  reject: { description: 'Twin was wrong', impact: 'decreases_confidence', requiresCorrection: false },
  correct: { description: 'Here is the correct answer', impact: 'updates_pattern', requiresCorrection: true },
  explain: { description: 'Here is why I am doing it this way', impact: 'adds_context', requiresCorrection: false },
  suggest: { description: 'Try this alternative approach', impact: 'adds_option', requiresCorrection: false },
};

describe('Twin Feedback OS', () => {
  describe('Feedback Types', () => {
    it('should have all required feedback types', () => {
      expect(FEEDBACK_TYPES.approve).toBeDefined();
      expect(FEEDBACK_TYPES.reject).toBeDefined();
      expect(FEEDBACK_TYPES.correct).toBeDefined();
      expect(FEEDBACK_TYPES.explain).toBeDefined();
      expect(FEEDBACK_TYPES.suggest).toBeDefined();
    });

    it('should correctly identify which types require correction', () => {
      expect(FEEDBACK_TYPES.approve.requiresCorrection).toBe(false);
      expect(FEEDBACK_TYPES.reject.requiresCorrection).toBe(false);
      expect(FEEDBACK_TYPES.correct.requiresCorrection).toBe(true);
      expect(FEEDBACK_TYPES.explain.requiresCorrection).toBe(false);
      expect(FEEDBACK_TYPES.suggest.requiresCorrection).toBe(false);
    });
  });

  describe('Confidence Calculation', () => {
    const calculateNewConfidence = (current: number, feedbackType: string): number => {
      const adjustments: Record<string, number> = {
        approve: 5, reject: -10, correct: 0, explain: 2, suggest: 1,
      };
      const adjustment = adjustments[feedbackType] || 0;
      return Math.max(0, Math.min(100, current + adjustment));
    };

    it('should increase confidence on approve', () => {
      const result = calculateNewConfidence(70, 'approve');
      expect(result).toBe(75);
    });

    it('should decrease confidence on reject', () => {
      const result = calculateNewConfidence(70, 'reject');
      expect(result).toBe(60);
    });

    it('should not change confidence on correct', () => {
      const result = calculateNewConfidence(70, 'correct');
      expect(result).toBe(70);
    });

    it('should increase confidence slightly on explain', () => {
      const result = calculateNewConfidence(70, 'explain');
      expect(result).toBe(72);
    });

    it('should increase confidence slightly on suggest', () => {
      const result = calculateNewConfidence(70, 'suggest');
      expect(result).toBe(71);
    });

    it('should not exceed 100', () => {
      const result = calculateNewConfidence(98, 'approve');
      expect(result).toBe(100);
    });

    it('should not go below 0', () => {
      const result = calculateNewConfidence(5, 'reject');
      expect(result).toBe(0);
    });
  });

  describe('Pattern Storage', () => {
    let correctionPatterns: Map<string, any>;

    beforeEach(() => {
      correctionPatterns = new Map();
    });

    it('should store correction patterns', () => {
      const employeeId = uuidv4();
      const key = `${employeeId}:negotiation`;
      const pattern = {
        capability: 'negotiation',
        trigger: 'client_objection',
        correctResponse: 'acknowledge_and_redirect',
        reason: 'Build rapport first',
        frequency: 1,
        lastUpdated: new Date().toISOString(),
      };

      correctionPatterns.set(key, pattern);
      expect(correctionPatterns.get(key)).toEqual(pattern);
    });

    it('should update pattern frequency on repeated corrections', () => {
      const employeeId = uuidv4();
      const key = `${employeeId}:negotiation`;
      const pattern = { capability: 'negotiation', frequency: 1, lastUpdated: new Date().toISOString() };

      correctionPatterns.set(key, pattern);
      const existing = correctionPatterns.get(key);
      existing.frequency += 1;

      expect(existing.frequency).toBe(2);
    });
  });

  describe('Feedback Validation', () => {
    it('should require employeeId, capability, and feedbackType', () => {
      const validFeedback = { employeeId: '123', capability: 'email', feedbackType: 'approve' };
      expect(validFeedback.employeeId).toBeDefined();
      expect(validFeedback.capability).toBeDefined();
      expect(validFeedback.feedbackType).toBeDefined();
    });

    it('should reject invalid feedback types', () => {
      const invalidType = 'invalid_type';
      expect(FEEDBACK_TYPES[invalidType as keyof typeof FEEDBACK_TYPES]).toBeUndefined();
    });

    it('should require correction for correct feedback type', () => {
      const feedback = { feedbackType: 'correct' };
      expect(FEEDBACK_TYPES[feedback.feedbackType as keyof typeof FEEDBACK_TYPES].requiresCorrection).toBe(true);
    });
  });

  describe('RLHF Training Data', () => {
    it('should format correct feedback as preferred output', () => {
      const feedback = {
        feedbackType: 'correct',
        twinAction: { description: 'Send discount email', value: '10%' },
        correction: { value: '15%', reason: 'Better conversion' },
      };

      const trainingExample = {
        instruction: feedback.twinAction.description,
        output_preferred: feedback.correction.value,
        output_rejected: null,
        metadata: { reason: feedback.correction.reason },
      };

      expect(trainingExample.output_preferred).toBe('15%');
      expect(trainingExample.output_rejected).toBeNull();
    });

    it('should format reject feedback with rejected output', () => {
      const feedback = {
        feedbackType: 'reject',
        twinAction: { description: 'Send discount email', value: '10%' },
        correction: { reason: 'Too low' },
      };

      const trainingExample = {
        instruction: feedback.twinAction.description,
        output_preferred: null,
        output_rejected: feedback.twinAction.value,
        metadata: { reason: feedback.correction.reason },
      };

      expect(trainingExample.output_preferred).toBeNull();
      expect(trainingExample.output_rejected).toBe('10%');
    });
  });
});
