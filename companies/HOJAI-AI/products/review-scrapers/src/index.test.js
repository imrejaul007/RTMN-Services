/**
 * Unit tests for Review Scrapers
 */
import { describe, it, expect } from 'vitest';

function normalizeRating(rating) {
  if (typeof rating === 'number') return Math.round(rating * 10) / 10;
  if (typeof rating === 'string') {
    const match = rating.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
}

function aggregateReviews(reviews) {
  if (!reviews.length) return { avg: 0, count: 0, distribution: {} };
  const sum = reviews.reduce((a, r) => a + normalizeRating(r.rating), 0);
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    const stars = Math.round(normalizeRating(r.rating));
    if (distribution[stars] !== undefined) distribution[stars]++;
  }
  return {
    avg: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
    distribution
  };
}

function sentimentScore(text) {
  const positive = ['great', 'excellent', 'good', 'love', 'amazing', 'best'];
  const negative = ['bad', 'terrible', 'poor', 'worst', 'hate', 'awful'];
  const lower = text.toLowerCase();
  let score = 0;
  for (const w of positive) if (lower.includes(w)) score++;
  for (const w of negative) if (lower.includes(w)) score--;
  return score;
}

describe('Review Scrapers', () => {
  it('should normalize numeric ratings', () => {
    expect(normalizeRating(4.5)).toBe(4.5);
    expect(normalizeRating('4.5 stars')).toBe(4.5);
    expect(normalizeRating('5')).toBe(5);
  });

  it('should handle invalid ratings', () => {
    expect(normalizeRating('no rating')).toBe(0);
    expect(normalizeRating(null)).toBe(0);
  });

  it('should aggregate review statistics', () => {
    const reviews = [
      { rating: 5 }, { rating: 4 }, { rating: 4 }, { rating: 3 }, { rating: 5 }
    ];
    const stats = aggregateReviews(reviews);
    expect(stats.avg).toBe(4.2);
    expect(stats.count).toBe(5);
    expect(stats.distribution[5]).toBe(2);
    expect(stats.distribution[4]).toBe(2);
  });

  it('should calculate sentiment', () => {
    expect(sentimentScore('Great product!')).toBe(1);
    expect(sentimentScore('Terrible experience, bad service')).toBe(-2);
    expect(sentimentScore('It was okay')).toBe(0);
  });

  it('should handle mixed sentiment', () => {
    expect(sentimentScore('Great product but bad packaging')).toBe(0);
  });
});
