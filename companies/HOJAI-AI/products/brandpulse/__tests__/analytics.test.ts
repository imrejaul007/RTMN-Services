/**
 * BrandPulse Analytics Service Tests
 */

import { describe, it, expect } from 'vitest';

// Mock analytics calculations
const calculateRatingDistribution = (reviews: { rating: number }[]) => {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const review of reviews) {
    if (review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating as keyof typeof distribution]++;
      total += review.rating;
    }
  }

  const count = Object.values(distribution).reduce((a, b) => a + b, 0);
  const average = count > 0 ? total / count : 0;

  return { distribution, average, median: average }; // Simplified median
};

const calculateSentimentStats = (reviews: { sentiment: { label: string } }[]) => {
  let positive = 0;
  let neutral = 0;
  let negative = 0;

  for (const review of reviews) {
    if (review.sentiment.label === 'positive') positive++;
    else if (review.sentiment.label === 'negative') negative++;
    else neutral++;
  }

  const total = reviews.length || 1;
  return {
    positivePercent: (positive / total) * 100,
    neutralPercent: (neutral / total) * 100,
    negativePercent: (negative / total) * 100
  };
};

describe('Rating Distribution', () => {
  it('should calculate correct distribution', () => {
    const reviews = [
      { rating: 5 }, { rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 3 },
      { rating: 2 }, { rating: 1 }
    ];

    const result = calculateRatingDistribution(reviews);

    expect(result.distribution[5]).toBe(2);
    expect(result.distribution[4]).toBe(2);
    expect(result.distribution[3]).toBe(1);
    expect(result.distribution[2]).toBe(1);
    expect(result.distribution[1]).toBe(1);
  });

  it('should calculate correct average', () => {
    const reviews = [
      { rating: 5 }, { rating: 4 }, { rating: 3 }
    ];

    const result = calculateRatingDistribution(reviews);

    expect(result.average).toBe(4); // (5+4+3)/3 = 4
  });

  it('should handle empty reviews', () => {
    const result = calculateRatingDistribution([]);

    expect(result.average).toBe(0);
    expect(result.distribution[1]).toBe(0);
  });

  it('should ignore invalid ratings', () => {
    const reviews = [
      { rating: 5 }, { rating: 0 }, { rating: 6 }, { rating: 3 }
    ];

    const result = calculateRatingDistribution(reviews);

    expect(result.distribution[5]).toBe(1);
    expect(result.distribution[3]).toBe(1);
  });
});

describe('Sentiment Statistics', () => {
  it('should calculate correct percentages', () => {
    const reviews = [
      { sentiment: { label: 'positive' } },
      { sentiment: { label: 'positive' } },
      { sentiment: { label: 'neutral' } },
      { sentiment: { label: 'negative' } }
    ];

    const result = calculateSentimentStats(reviews);

    expect(result.positivePercent).toBe(50); // 2/4
    expect(result.neutralPercent).toBe(25);   // 1/4
    expect(result.negativePercent).toBe(25);  // 1/4
  });

  it('should handle empty reviews', () => {
    const result = calculateSentimentStats([]);

    expect(result.positivePercent).toBe(0);
    expect(result.neutralPercent).toBe(0);
    expect(result.negativePercent).toBe(0);
  });

  it('should handle all positive reviews', () => {
    const reviews = [
      { sentiment: { label: 'positive' } },
      { sentiment: { label: 'positive' } }
    ];

    const result = calculateSentimentStats(reviews);

    expect(result.positivePercent).toBe(100);
    expect(result.negativePercent).toBe(0);
  });
});

describe('Alert Generation', () => {
  const shouldGenerateAlert = (review: { rating: number; sentiment: { score: number; confidence: number } }) => {
    // Low rating alert
    if (review.rating <= 2) {
      return { type: 'low_rating', severity: review.rating === 1 ? 'critical' : 'high' };
    }

    // Negative review alert
    if (review.sentiment.score < -0.1 && review.sentiment.confidence > 0.7) {
      return { type: 'negative_review', severity: 'medium' };
    }

    return null;
  };

  it('should generate critical alert for 1-star rating', () => {
    const alert = shouldGenerateAlert({
      rating: 1,
      sentiment: { score: -0.8, confidence: 0.9 }
    });

    expect(alert?.type).toBe('low_rating');
    expect(alert?.severity).toBe('critical');
  });

  it('should generate high alert for 2-star rating', () => {
    const alert = shouldGenerateAlert({
      rating: 2,
      sentiment: { score: -0.5, confidence: 0.8 }
    });

    expect(alert?.type).toBe('low_rating');
    expect(alert?.severity).toBe('high');
  });

  it('should generate medium alert for negative sentiment', () => {
    const alert = shouldGenerateAlert({
      rating: 3,
      sentiment: { score: -0.3, confidence: 0.8 }
    });

    expect(alert?.type).toBe('negative_review');
    expect(alert?.severity).toBe('medium');
  });

  it('should not generate alert for positive review', () => {
    const alert = shouldGenerateAlert({
      rating: 4,
      sentiment: { score: 0.6, confidence: 0.9 }
    });

    expect(alert).toBeNull();
  });
});
