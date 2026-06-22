import {
  ReputationScore,
  ReputationComponents,
  RatingDistribution,
  RecencyScore,
  EngagementScore,
  SentimentSummary,
  TrustScoreResult,
  EntityType,
  WeightedScoringConfig,
  Review,
} from '../types/index.js';
import { trustEngineClient } from './trustEngineClient.js';
import { reviewStore } from './reviewService.js';
import { sentimentService } from './sentimentService.js';
import { historyService } from './historyService.js';

const DEFAULT_WEIGHTED_CONFIG: WeightedScoringConfig = {
  recencyWeight: 0.2,
  verifiedWeight: 0.25,
  engagementWeight: 0.15,
  trustWeight: 0.25,
  volumeThreshold: 50,
};

export class ReputationService {
  private weightedConfig: WeightedScoringConfig;

  constructor(config?: Partial<WeightedScoringConfig>) {
    this.weightedConfig = { ...DEFAULT_WEIGHTED_CONFIG, ...config };
  }

  async calculateReputation(entityId: string, entityType: EntityType = 'user'): Promise<ReputationScore> {
    const reviews = reviewStore.getReviewsByEntity(entityId);
    const now = new Date();

    const components = await this.calculateComponents(entityId, reviews);
    const overall = this.calculateOverallScore(components);
    const weighted = this.calculateWeightedScore(overall, reviews.length, components);

    const reputation: ReputationScore = {
      entityId,
      entityType,
      overall: Math.round(overall * 100) / 100,
      weighted: Math.round(weighted * 100) / 100,
      components,
      confidence: this.calculateConfidence(reviews.length, components),
      totalReviews: reviews.length,
      verifiedReviews: reviews.filter(r => r.verified).length,
      lastUpdated: now.toISOString(),
    };

    // Track historical data
    await historyService.recordMetric(entityId, 'reputation', reputation.overall);
    await historyService.recordMetric(entityId, 'rating', components.averageRating);

    return reputation;
  }

  private async calculateComponents(entityId: string, reviews: Review[]): Promise<ReputationComponents> {
    const averageRating = this.calculateAverageRating(reviews);
    const ratingDistribution = this.calculateRatingDistribution(reviews);
    const sentiment = await this.calculateSentimentSummary(entityId, reviews);
    const trustScore = await this.getTrustScore(entityId, averageRating, reviews.length, sentiment.score);
    const recency = this.calculateRecencyScore(reviews);
    const engagement = this.calculateEngagementScore(reviews);

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
      sentiment,
      trustScore,
      recency,
      engagement,
    };
  }

  private calculateAverageRating(reviews: Review[]): number {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  }

  private calculateRatingDistribution(reviews: Review[]): RatingDistribution {
    const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (reviews.length === 0) return distribution;

    reviews.forEach(review => {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        distribution[rating]++;
      }
    });

    return distribution;
  }

  private async calculateSentimentSummary(entityId: string, reviews: Review[]): Promise<SentimentSummary> {
    if (reviews.length === 0) {
      return {
        overall: 'neutral',
        score: 0,
        positiveRatio: 0,
        negativeRatio: 0,
        neutralRatio: 0,
        trend: 'stable',
        periodComparison: { current: 0, previous: 0, change: 0, changePercent: 0 },
      };
    }

    const sentiments = await Promise.all(
      reviews.map(r => sentimentService.analyzeSentiment(r.content))
    );

    const positiveCount = sentiments.filter(s => s.label === 'positive').length;
    const negativeCount = sentiments.filter(s => s.label === 'negative').length;
    const neutralCount = sentiments.filter(s => s.label === 'neutral').length;
    const totalScore = sentiments.reduce((acc, s) => acc + s.score, 0);

    const avgScore = totalScore / reviews.length;
    const positiveRatio = positiveCount / reviews.length;
    const negativeRatio = negativeCount / reviews.length;
    const neutralRatio = neutralCount / reviews.length;

    // Calculate trend based on recent vs older reviews
    const sortedReviews = [...reviews].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const midpoint = Math.floor(sortedReviews.length / 2);
    const recentReviews = sortedReviews.slice(0, midpoint);
    const olderReviews = sortedReviews.slice(midpoint);

    const recentSentiments = await Promise.all(
      recentReviews.map(r => sentimentService.analyzeSentiment(r.content))
    );
    const olderSentiments = await Promise.all(
      olderReviews.map(r => sentimentService.analyzeSentiment(r.content))
    );

    const recentAvg = recentSentiments.length > 0
      ? recentSentiments.reduce((acc, s) => acc + s.score, 0) / recentSentiments.length
      : 0;
    const olderAvg = olderSentiments.length > 0
      ? olderSentiments.reduce((acc, s) => acc + s.score, 0) / olderSentiments.length
      : 0;

    const change = recentAvg - olderAvg;
    const changePercent = olderAvg !== 0 ? (change / olderAvg) * 100 : 0;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (changePercent > 10) trend = 'improving';
    else if (changePercent < -10) trend = 'declining';

    return {
      overall: avgScore > 0.2 ? 'positive' : avgScore < -0.2 ? 'negative' : 'neutral',
      score: Math.round(avgScore * 100) / 100,
      positiveRatio: Math.round(positiveRatio * 100) / 100,
      negativeRatio: Math.round(negativeRatio * 100) / 100,
      neutralRatio: Math.round(neutralRatio * 100) / 100,
      trend,
      periodComparison: {
        current: Math.round(recentAvg * 100) / 100,
        previous: Math.round(olderAvg * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      },
    };
  }

  private async getTrustScore(
    entityId: string,
    averageRating: number,
    reviewCount: number,
    sentimentScore: number
  ): Promise<TrustScoreResult | null> {
    try {
      return await trustEngineClient.calculateTrustScore({
        entityId,
        entityType: 'user',
        reviewCount,
        averageRating,
        verifiedReviews: 0, // Will be calculated in the trust engine
        sentimentScore,
      });
    } catch (error) {
      console.error(`[ReputationService] Error getting trust score:`, error);
      return null;
    }
  }

  private calculateRecencyScore(reviews: Review[]): RecencyScore {
    if (reviews.length === 0) {
      return { score: 0, averageAge: 0, latestReview: new Date().toISOString() };
    }

    const now = new Date();
    const sortedReviews = [...reviews].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const latestReview = sortedReviews[0].createdAt;
    const agesInDays = reviews.map(r => {
      const reviewDate = new Date(r.createdAt);
      return (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
    });

    const averageAge = agesInDays.reduce((a, b) => a + b, 0) / agesInDays.length;

    // Score decreases as average age increases
    let score = 100;
    if (averageAge > 30) score = Math.max(0, 100 - (averageAge - 30) * 2);
    if (averageAge > 90) score = Math.max(0, 50 - (averageAge - 90));

    return {
      score: Math.round(score * 100) / 100,
      averageAge: Math.round(averageAge * 10) / 10,
      latestReview,
    };
  }

  private calculateEngagementScore(reviews: Review[]): EngagementScore {
    if (reviews.length === 0) {
      return { score: 0, totalHelpful: 0, totalNotHelpful: 0, responseRate: 0 };
    }

    const totalHelpful = reviews.reduce((acc, r) => acc + r.helpful, 0);
    const totalNotHelpful = reviews.reduce((acc, r) => acc + r.notHelpful, 0);

    // Engagement score based on helpful votes and review volume
    const engagementRatio = totalHelpful / Math.max(reviews.length, 1);
    let score = Math.min(engagementRatio * 10, 100);

    // Boost for higher review volume
    if (reviews.length > 10) score = Math.min(score + 10, 100);
    if (reviews.length > 50) score = Math.min(score + 15, 100);
    if (reviews.length > 100) score = Math.min(score + 20, 100);

    return {
      score: Math.round(score * 100) / 100,
      totalHelpful,
      totalNotHelpful,
      responseRate: 0, // Would be calculated if we tracked responses
    };
  }

  private calculateOverallScore(components: ReputationComponents): number {
    // Weighted average of all components
    const ratingWeight = 0.35;
    const sentimentWeight = 0.25;
    const trustWeight = 0.25;
    const recencyWeight = 0.1;
    const engagementWeight = 0.05;

    const ratingScore = components.averageRating * 20; // Convert 1-5 to 0-100
    const sentimentScore = (components.sentiment.score + 1) * 50; // Convert -1 to 1 to 0-100
    const trustScore = components.trustScore?.score ?? 50; // Default to 50 if no trust score
    const recencyScore = components.recency.score;
    const engagementScore = components.engagement.score;

    return (
      ratingScore * ratingWeight +
      sentimentScore * sentimentWeight +
      trustScore * trustWeight +
      recencyScore * recencyWeight +
      engagementScore * engagementWeight
    );
  }

  private calculateWeightedScore(baseScore: number, reviewCount: number, components: ReputationComponents): number {
    let weightedScore = baseScore;

    // Volume bonus
    if (reviewCount >= this.weightedConfig.volumeThreshold) {
      const volumeBonus = Math.min((reviewCount - this.weightedConfig.volumeThreshold) * 0.1, 20);
      weightedScore += volumeBonus;
    }

    // Verified reviews bonus
    const verifiedRatio = reviewCount > 0
      ? components.trustScore?.verified ? 1 : 0
      : 0;
    weightedScore += verifiedRatio * this.weightedConfig.verifiedWeight * 20;

    // Recency bonus
    weightedScore += (components.recency.score / 100) * this.weightedConfig.recencyWeight * 15;

    // Engagement bonus
    weightedScore += (components.engagement.score / 100) * this.weightedConfig.engagementWeight * 10;

    // Trust bonus
    if (components.trustScore) {
      weightedScore += (components.trustScore.score / 100) * this.weightedConfig.trustWeight * 25;
    }

    return Math.min(Math.max(weightedScore, 0), 100);
  }

  private calculateConfidence(reviewCount: number, components: ReputationComponents): number {
    let confidence = 0;

    // Volume factor (up to 40%)
    if (reviewCount >= 100) confidence += 40;
    else if (reviewCount >= 50) confidence += 30;
    else if (reviewCount >= 20) confidence += 20;
    else if (reviewCount >= 10) confidence += 10;
    else if (reviewCount >= 5) confidence += 5;

    // Distribution factor (up to 30%)
    const distribution = components.ratingDistribution;
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const ratingCounts = Object.entries(distribution)
        .filter(([_, count]) => count > 0)
        .map(([rating, count]) => ({ rating: parseInt(rating), count }));
      const maxRatingEntry = ratingCounts.reduce((max, curr) =>
        curr.count > max.count ? curr : max, ratingCounts[0]);
      const distributionConfidence = (maxRatingEntry.rating / 5) * 30;
      confidence += distributionConfidence;
    }

    // Recency factor (up to 15%)
    if (components.recency.score >= 80) confidence += 15;
    else if (components.recency.score >= 60) confidence += 10;
    else if (components.recency.score >= 40) confidence += 5;

    // Trust factor (up to 15%)
    if (components.trustScore) {
      confidence += components.trustScore.verified ? 15 : 7;
    }

    return Math.min(Math.round(confidence * 100) / 100, 100);
  }

  async getReputation(entityId: string, entityType: EntityType = 'user'): Promise<ReputationScore> {
    return this.calculateReputation(entityId, entityType);
  }
}

export const reputationService = new ReputationService();
