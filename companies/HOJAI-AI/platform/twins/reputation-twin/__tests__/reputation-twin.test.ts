import { describe, it, expect } from 'vitest';

// Reputation Twin Constants
const REVIEW_TYPES = ['performance', 'peer', 'customer', '360'];
const BADGE_TIERS = ['bronze', 'silver', 'gold', 'platinum'];
const TRUST_DIMENSIONS = ['reliability', 'competence', 'communication', 'collaboration', 'consistency'];

describe('Reputation Twin', () => {
  describe('Review Types', () => {
    it('should have all review types', () => {
      expect(REVIEW_TYPES).toContain('performance');
      expect(REVIEW_TYPES).toContain('peer');
      expect(REVIEW_TYPES).toContain('customer');
      expect(REVIEW_TYPES).toContain('360');
    });

    it('should have 4 review types', () => {
      expect(REVIEW_TYPES).toHaveLength(4);
    });
  });

  describe('Badge Tiers', () => {
    it('should have all badge tiers', () => {
      expect(BADGE_TIERS).toContain('bronze');
      expect(BADGE_TIERS).toContain('silver');
      expect(BADGE_TIERS).toContain('gold');
      expect(BADGE_TIERS).toContain('platinum');
    });

    it('should have 4 badge tiers', () => {
      expect(BADGE_TIERS).toHaveLength(4);
    });
  });

  describe('Trust Dimensions', () => {
    it('should have all trust dimensions', () => {
      expect(TRUST_DIMENSIONS).toContain('reliability');
      expect(TRUST_DIMENSIONS).toContain('competence');
      expect(TRUST_DIMENSIONS).toContain('communication');
      expect(TRUST_DIMENSIONS).toContain('collaboration');
      expect(TRUST_DIMENSIONS).toContain('consistency');
    });

    it('should have 5 trust dimensions', () => {
      expect(TRUST_DIMENSIONS).toHaveLength(5);
    });
  });

  describe('Review Validation', () => {
    const validateReview = (review: {
      reviewerId?: string;
      type?: string;
      rating?: number;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!review.reviewerId) errors.push('reviewerId is required');
      if (!review.type) errors.push('type is required');
      if (review.type && !REVIEW_TYPES.includes(review.type)) {
        errors.push(`Invalid review type: ${review.type}`);
      }
      if (review.rating !== undefined && (review.rating < 1 || review.rating > 5)) {
        errors.push('rating must be between 1 and 5');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct review', () => {
      const result = validateReview({
        reviewerId: 'user123',
        type: 'peer',
        rating: 4
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require reviewerId', () => {
      const result = validateReview({ type: 'peer', rating: 4 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('reviewerId is required');
    });

    it('should require type', () => {
      const result = validateReview({ reviewerId: 'user123', rating: 4 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('type is required');
    });

    it('should reject invalid type', () => {
      const result = validateReview({ reviewerId: 'user123', type: 'invalid', rating: 4 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid review type: invalid');
    });

    it('should reject invalid rating', () => {
      const result = validateReview({ reviewerId: 'user123', type: 'peer', rating: 6 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rating must be between 1 and 5');
    });
  });

  describe('Trust Score Calculation', () => {
    const calculateTrustScore = (
      avgRating: number,
      reviewCount: number,
      peerRating: number,
      performanceRating: number
    ): { overall: number; reliability: number; competence: number; consistency: number } => {
      const overall = avgRating * 20;
      const reliability = peerRating > 0 ? peerRating * 20 : 70;
      const competence = performanceRating > 0 ? performanceRating * 20 : 70;
      const consistency = Math.min(100, reviewCount * 10);

      return { overall, reliability, competence, consistency };
    };

    it('should calculate high overall trust for high rating', () => {
      const score = calculateTrustScore(4.5, 20, 4.5, 4.5);
      expect(score.overall).toBe(90);
    });

    it('should use default values when no peer/performance reviews', () => {
      const score = calculateTrustScore(3, 5, 0, 0);
      expect(score.reliability).toBe(70);
      expect(score.competence).toBe(70);
    });

    it('should cap consistency at 100', () => {
      const score = calculateTrustScore(4, 15, 4, 4);
      expect(score.consistency).toBe(100);
    });
  });

  describe('Percentile Calculation', () => {
    const calculatePercentile = (rating: number): number => {
      return Math.round((rating / 5) * 100);
    };

    it('should calculate correct percentile', () => {
      expect(calculatePercentile(5)).toBe(100);
      expect(calculatePercentile(4)).toBe(80);
      expect(calculatePercentile(3)).toBe(60);
      expect(calculatePercentile(1)).toBe(20);
    });

    it('should handle decimal ratings', () => {
      expect(calculatePercentile(4.5)).toBe(90);
    });
  });

  describe('Badge Tier Determination', () => {
    const getTier = (badges: Array<{ tier: string }>): string => {
      if (badges.some(b => b.tier === 'platinum')) return 'platinum';
      if (badges.some(b => b.tier === 'gold')) return 'gold';
      if (badges.some(b => b.tier === 'silver')) return 'silver';
      return 'bronze';
    };

    it('should return platinum for platinum badges', () => {
      expect(getTier([{ tier: 'bronze' }, { tier: 'platinum' }])).toBe('platinum');
    });

    it('should return gold for gold badges (no platinum)', () => {
      expect(getTier([{ tier: 'gold' }, { tier: 'silver' }])).toBe('gold');
    });

    it('should return silver for silver badges (no gold)', () => {
      expect(getTier([{ tier: 'silver' }])).toBe('silver');
    });

    it('should return bronze by default', () => {
      expect(getTier([])).toBe('bronze');
      expect(getTier([{ tier: 'bronze' }])).toBe('bronze');
    });
  });

  describe('Review Aggregation', () => {
    const aggregateReviews = (reviews: Array<{ rating: number; type: string }>): {
      avgRating: number;
      byType: Record<string, number[]>;
      totalCount: number;
    } => {
      const byType: Record<string, number[]> = {};
      reviews.forEach(r => {
        if (!byType[r.type]) byType[r.type] = [];
        byType[r.type].push(r.rating);
      });

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      return { avgRating, byType, totalCount: reviews.length };
    };

    it('should aggregate reviews correctly', () => {
      const reviews = [
        { rating: 5, type: 'peer' },
        { rating: 4, type: 'peer' },
        { rating: 4, type: 'performance' },
        { rating: 3, type: 'customer' }
      ];
      const result = aggregateReviews(reviews);
      expect(result.avgRating).toBe(4);
      expect(result.totalCount).toBe(4);
      expect(result.byType['peer']).toEqual([5, 4]);
      expect(result.byType['performance']).toEqual([4]);
    });

    it('should handle empty reviews', () => {
      const result = aggregateReviews([]);
      expect(result.avgRating).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('Badge Award Logic', () => {
    const shouldAwardBadge = (
      badgeType: string,
      currentBadges: Array<{ name: string }>,
      criteria: { minReviews?: number; minRating?: number; daysActive?: number }
    ): { award: boolean; reason: string } => {
      const alreadyHas = currentBadges.some(b => b.name === badgeType);

      if (alreadyHas) {
        return { award: false, reason: 'Already earned' };
      }

      if (criteria.minReviews !== undefined && criteria.minReviews > 0) {
        return { award: false, reason: 'Criteria not met' };
      }

      return { award: true, reason: 'Criteria met' };
    };

    it('should not award duplicate badges', () => {
      const result = shouldAwardBadge('Rising Star', [{ name: 'Rising Star' }], {});
      expect(result.award).toBe(false);
      expect(result.reason).toBe('Already earned');
    });
  });

  describe('Rating Distribution', () => {
    const getRatingDistribution = (reviews: Array<{ rating: number }>): Record<number, number> => {
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach(r => {
        if (distribution[r.rating] !== undefined) {
          distribution[r.rating]++;
        }
      });
      return distribution;
    };

    it('should calculate correct distribution', () => {
      const reviews = [
        { rating: 5 }, { rating: 5 }, { rating: 4 },
        { rating: 3 }, { rating: 2 }, { rating: 1 }
      ];
      const dist = getRatingDistribution(reviews);
      expect(dist[5]).toBe(2);
      expect(dist[4]).toBe(1);
      expect(dist[3]).toBe(1);
      expect(dist[2]).toBe(1);
      expect(dist[1]).toBe(1);
    });

    it('should handle empty reviews', () => {
      const dist = getRatingDistribution([]);
      expect(dist[5]).toBe(0);
    });
  });

  describe('Review Recency Weight', () => {
    const calculateWeightedRating = (reviews: Array<{ rating: number; createdAt: string }>): number => {
      const now = Date.now();
      const weights = reviews.map(r => {
        const age = (now - new Date(r.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        return { rating: r.rating, weight: Math.max(0.5, 1 - age / 365) };
      });

      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
      const weightedSum = weights.reduce((sum, w) => sum + w.rating * w.weight, 0);

      return totalWeight > 0 ? weightedSum / totalWeight : 0;
    };

    it('should weight recent reviews more heavily', () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const oldDate = new Date(now.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString();

      const reviews = [
        { rating: 5, createdAt: recentDate },
        { rating: 3, createdAt: oldDate }
      ];

      const weighted = calculateWeightedRating(reviews);
      expect(weighted).toBeGreaterThan(3.5);
      expect(weighted).toBeLessThan(5);
    });
  });

  describe('Strengths/Improvements Analysis', () => {
    const analyzeFeedback = (reviews: Array<{ strengths: string[]; improvements: string[] }>): {
      commonStrengths: string[];
      commonImprovements: string[];
    } => {
      const strengthCounts = new Map<string, number>();
      const improvementCounts = new Map<string, number>();

      reviews.forEach(r => {
        r.strengths.forEach(s => {
          strengthCounts.set(s, (strengthCounts.get(s) || 0) + 1);
        });
        r.improvements.forEach(i => {
          improvementCounts.set(i, (improvementCounts.get(i) || 0) + 1);
        });
      });

      const commonStrengths = Array.from(strengthCounts.entries())
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

      const commonImprovements = Array.from(improvementCounts.entries())
        .filter(([_, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([i]) => i);

      return { commonStrengths, commonImprovements };
    };

    it('should identify recurring strengths', () => {
      const reviews = [
        { strengths: ['communication', 'teamwork'], improvements: [] },
        { strengths: ['communication', 'leadership'], improvements: [] },
        { strengths: ['creativity'], improvements: [] }
      ];
      const result = analyzeFeedback(reviews);
      expect(result.commonStrengths).toContain('communication');
      expect(result.commonStrengths).not.toContain('creativity');
    });
  });
});
