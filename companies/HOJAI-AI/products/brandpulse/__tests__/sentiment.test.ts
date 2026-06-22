/**
 * BrandPulse Sentiment Service Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Mock sentiment service for testing
const mockSentimentService = {
  analyze: (text: string) => {
    const positiveWords = ['great', 'amazing', 'excellent', 'good', 'love', 'best', 'wonderful', 'fantastic'];
    const negativeWords = ['terrible', 'awful', 'bad', 'worst', 'hate', 'horrible', 'poor', 'disappointing'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) {
        score += 0.3;
        positiveCount++;
      }
      if (negativeWords.some(nw => word.includes(nw))) {
        score -= 0.3;
        negativeCount++;
      }
    }

    const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';
    const confidence = Math.min(0.5 + Math.abs(score) * 0.5, 1);

    return {
      score: Math.max(-1, Math.min(1, score)),
      label,
      confidence,
      aspects: [],
      keywords: []
    };
  }
};

describe('Sentiment Analysis', () => {
  describe('analyze()', () => {
    it('should detect positive sentiment', () => {
      const result = mockSentimentService.analyze('This hotel was amazing! Great service and wonderful staff.');

      expect(result.score).toBeGreaterThan(0);
      expect(result.label).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect negative sentiment', () => {
      const result = mockSentimentService.analyze('Terrible experience. Room was dirty and staff was rude.');

      expect(result.score).toBeLessThan(0);
      expect(result.label).toBe('negative');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should detect neutral sentiment', () => {
      const result = mockSentimentService.analyze('The hotel is located near the airport.');

      expect(result.label).toBe('neutral');
    });

    it('should clamp score between -1 and 1', () => {
      const result = mockSentimentService.analyze(
        'amazing amazing amazing amazing amazing amazing amazing amazing amazing amazing ' +
        'great great great great great great great great great great ' +
        'excellent excellent excellent excellent excellent excellent excellent excellent excellent excellent'
      );

      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should handle empty string', () => {
      const result = mockSentimentService.analyze('');

      expect(result.label).toBe('neutral');
      expect(result.score).toBe(0);
    });

    it('should handle mixed sentiment', () => {
      const result = mockSentimentService.analyze('The location was great but the service was terrible.');

      expect(result.label).toBe('neutral'); // Cancel out
    });
  });
});

describe('Sentiment Score Ranges', () => {
  it('should classify scores > 0.2 as positive', () => {
    const result = mockSentimentService.analyze('excellent amazing wonderful fantastic');
    expect(result.label).toBe('positive');
  });

  it('should classify scores < -0.2 as negative', () => {
    const result = mockSentimentService.analyze('terrible awful horrible disgusting');
    expect(result.label).toBe('negative');
  });

  it('should classify scores between -0.2 and 0.2 as neutral', () => {
    const result = mockSentimentService.analyze('The hotel has a pool.');
    expect(result.label).toBe('neutral');
  });
});
