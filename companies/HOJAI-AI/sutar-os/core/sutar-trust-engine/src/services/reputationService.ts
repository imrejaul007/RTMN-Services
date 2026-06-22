import logger from '../utils/logger';
import trustService from './trustService';
import { config } from '../config';
import {
  IReputation,
  IActivityEntry,
  ReputationResponse,
} from '../types';

// In-memory store for reputation data
const reputationStore = new Map<string, IReputation>();

export class ReputationService {
  /**
   * Get reputation for an entity
   */
  getReputation(entityId: string): ReputationResponse | null {
    const reputation = reputationStore.get(entityId);

    if (!reputation) {
      logger.warn(`Reputation not found for entity: ${entityId}`);
      return null;
    }

    return this.toResponse(reputation);
  }

  /**
   * Get or create reputation record
   */
  getOrCreateReputation(entityId: string): IReputation {
    let reputation = reputationStore.get(entityId);

    if (!reputation) {
      reputation = this.createDefaultReputation(entityId);
      reputationStore.set(entityId, reputation);
    }

    return reputation;
  }

  /**
   * Update reputation based on activity
   */
  updateReputation(
    entityId: string,
    activity: Omit<IActivityEntry, 'date' | 'scoreChange'>
  ): IReputation {
    const reputation = this.getOrCreateReputation(entityId);
    const previousRating = reputation.avgRating;

    // Calculate score change based on activity
    let scoreChange = 0;
    switch (activity.type) {
      case 'transaction':
        scoreChange = activity.impact === 'positive' ? 2 : activity.impact === 'negative' ? -3 : 0;
        reputation.totalReviews += activity.impact === 'neutral' ? 0 : 1;
        if (activity.impact === 'positive') reputation.positiveReviews++;
        if (activity.impact === 'negative') reputation.negativeReviews++;
        if (activity.impact === 'neutral') reputation.neutralReviews++;
        break;
      case 'review':
        scoreChange = activity.impact === 'positive' ? 3 : activity.impact === 'negative' ? -4 : 0;
        reputation.totalReviews++;
        if (activity.impact === 'positive') reputation.positiveReviews++;
        if (activity.impact === 'negative') reputation.negativeReviews++;
        break;
      case 'verification':
        scoreChange = activity.impact === 'positive' ? 5 : 0;
        break;
      case 'dispute':
        scoreChange = activity.impact === 'positive' ? 1 : -2;
        break;
      case 'payment':
        scoreChange = activity.impact === 'positive' ? 2 : activity.impact === 'negative' ? -3 : 0;
        break;
    }

    // Add activity to history
    const activityEntry: IActivityEntry = {
      ...activity,
      date: new Date(),
      scoreChange,
    };
    reputation.recentActivity.push(activityEntry);

    // Keep only recent activities
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.reputation.recentActivityDays);
    reputation.recentActivity = reputation.recentActivity.filter(
      a => a.date >= cutoffDate
    );

    // Recalculate average rating
    if (reputation.totalReviews > 0) {
      const totalRating = reputation.positiveReviews * 5 + reputation.neutralReviews * 3 + reputation.negativeReviews * 1;
      reputation.avgRating = totalRating / reputation.totalReviews;
    }

    reputation.lastUpdated = new Date();
    reputationStore.set(entityId, reputation);

    // Update trust score if rating changed significantly
    if (Math.abs(reputation.avgRating - previousRating) >= 0.5) {
      const trustScore = trustService.getTrustScore(entityId);
      if (trustScore) {
        const scoreDelta = Math.round((reputation.avgRating - previousRating) * 10);
        trustService.updateTrustScore(
          entityId,
          { fulfillmentScore: { score: Math.max(0, Math.min(100, trustScore.fulfillmentScore.score + scoreDelta)) } },
          `Reputation update: ${activity.type}`
        );
      }
    }

    logger.info(`Updated reputation for ${entityId}: avgRating=${reputation.avgRating.toFixed(2)}`);

    return reputation;
  }

  /**
   * Add a review to reputation
   */
  addReview(
    entityId: string,
    review: {
      rating: number;
      isVerifiedPurchase: boolean;
      comment?: string;
    }
  ): IReputation {
    const { rating, isVerifiedPurchase, comment } = review;

    // Validate rating
    const validRating = Math.max(1, Math.min(5, rating));

    const activity: Omit<IActivityEntry, 'date' | 'scoreChange'> = {
      type: 'review',
      description: comment || `Rated ${validRating}/5 stars`,
      impact: validRating >= 4 ? 'positive' : validRating >= 3 ? 'neutral' : 'negative',
    };

    const reputation = this.updateReputation(entityId, activity);

    if (isVerifiedPurchase) {
      reputation.verifiedPurchases++;
    }

    reputationStore.set(entityId, reputation);

    return reputation;
  }

  /**
   * Record transaction activity
   */
  recordTransaction(
    entityId: string,
    transaction: {
      amount: number;
      successful: boolean;
      description: string;
    }
  ): IReputation {
    const activity: Omit<IActivityEntry, 'date' | 'scoreChange'> = {
      type: 'transaction',
      description: transaction.description || `Transaction: ${transaction.amount}`,
      impact: transaction.successful ? 'positive' : 'negative',
    };

    return this.updateReputation(entityId, activity);
  }

  /**
   * Record dispute resolution
   */
  recordDisputeResolution(
    entityId: string,
    resolution: {
      won: boolean;
      description: string;
    }
  ): IReputation {
    const activity: Omit<IActivityEntry, 'date' | 'scoreChange'> = {
      type: 'dispute',
      description: resolution.description || `Dispute ${resolution.won ? 'won' : 'lost'}`,
      impact: resolution.won ? 'positive' : 'negative',
    };

    return this.updateReputation(entityId, activity);
  }

  /**
   * Record payment activity
   */
  recordPayment(
    entityId: string,
    payment: {
      onTime: boolean;
      amount: number;
      description?: string;
    }
  ): IReputation {
    const activity: Omit<IActivityEntry, 'date' | 'scoreChange'> = {
      type: 'payment',
      description: payment.description || `Payment ${payment.onTime ? 'on time' : 'late'}: ${payment.amount}`,
      impact: payment.onTime ? 'positive' : 'negative',
    };

    return this.updateReputation(entityId, activity);
  }

  /**
   * Update response metrics
   */
  updateResponseMetrics(
    entityId: string,
    metrics: {
      responseRate: number;
      avgResponseTime: number;
    }
  ): IReputation {
    const reputation = this.getOrCreateReputation(entityId);

    reputation.responseRate = metrics.responseRate;
    reputation.avgResponseTime = metrics.avgResponseTime;
    reputation.lastUpdated = new Date();

    reputationStore.set(entityId, reputation);

    return reputation;
  }

  /**
   * Get reputation summary
   */
  getReputationSummary(entityId: string): {
    entityId: string;
    rating: number;
    reviews: number;
    level: 'excellent' | 'good' | 'average' | 'poor';
    badges: string[];
  } {
    const reputation = reputationStore.get(entityId);

    if (!reputation) {
      return {
        entityId,
        rating: config.reputation.defaultRating,
        reviews: 0,
        level: 'average',
        badges: [],
      };
    }

    let level: 'excellent' | 'good' | 'average' | 'poor';
    const badges: string[] = [];

    if (reputation.avgRating >= 4.5) {
      level = 'excellent';
      badges.push('top_rated');
    } else if (reputation.avgRating >= 4.0) {
      level = 'good';
      badges.push('highly_rated');
    } else if (reputation.avgRating >= 3.0) {
      level = 'average';
    } else {
      level = 'poor';
      badges.push('needs_improvement');
    }

    if (reputation.verifiedPurchases >= 10) {
      badges.push('verified_seller');
    }

    if (reputation.responseRate >= 90) {
      badges.push('quick_responder');
    }

    if (reputation.recentActivity.length >= 50) {
      badges.push('active_member');
    }

    return {
      entityId,
      rating: reputation.avgRating,
      reviews: reputation.totalReviews,
      level,
      badges,
    };
  }

  /**
   * Create default reputation record
   */
  private createDefaultReputation(entityId: string): IReputation {
    return {
      entityId,
      totalReviews: 0,
      avgRating: config.reputation.defaultRating,
      positiveReviews: 0,
      negativeReviews: 0,
      neutralReviews: 0,
      responseRate: 0,
      avgResponseTime: 0,
      verifiedPurchases: 0,
      recentActivity: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Convert to API response
   */
  private toResponse(reputation: IReputation): ReputationResponse {
    return {
      entityId: reputation.entityId,
      totalReviews: reputation.totalReviews,
      avgRating: Math.round(reputation.avgRating * 100) / 100,
      positiveReviews: reputation.positiveReviews,
      negativeReviews: reputation.negativeReviews,
      verifiedPurchases: reputation.verifiedPurchases,
      responseRate: reputation.responseRate,
      recentActivity: reputation.recentActivity.slice(-10),
      lastUpdated: reputation.lastUpdated,
    };
  }

  /**
   * Aggregate reputation across multiple entities (for business trust)
   */
  aggregateReputation(entityIds: string[]): IReputation {
    const aggregated: IReputation = {
      entityId: entityIds.join(','),
      totalReviews: 0,
      avgRating: 0,
      positiveReviews: 0,
      negativeReviews: 0,
      neutralReviews: 0,
      responseRate: 0,
      avgResponseTime: 0,
      verifiedPurchases: 0,
      recentActivity: [],
      lastUpdated: new Date(),
    };

    let totalRatingSum = 0;

    for (const entityId of entityIds) {
      const rep = reputationStore.get(entityId);
      if (rep) {
        aggregated.totalReviews += rep.totalReviews;
        aggregated.positiveReviews += rep.positiveReviews;
        aggregated.negativeReviews += rep.negativeReviews;
        aggregated.neutralReviews += rep.neutralReviews;
        aggregated.verifiedPurchases += rep.verifiedPurchases;
        totalRatingSum += rep.avgRating * rep.totalReviews;
      }
    }

    if (aggregated.totalReviews > 0) {
      aggregated.avgRating = totalRatingSum / aggregated.totalReviews;
    }

    return aggregated;
  }
}

export default new ReputationService();
