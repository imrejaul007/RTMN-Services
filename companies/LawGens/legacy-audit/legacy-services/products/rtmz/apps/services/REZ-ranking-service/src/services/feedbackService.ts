import { v4 as uuidv4 } from 'uuid';
import { Feedback, IFeedback } from '../models/Feedback';
import { experimentService } from './experimentService';
import { rankingService } from './rankingService';
import logger from '../utils/logger';

const log = logger.child({ service: 'FeedbackService' });

export interface FeedbackInput {
  userId: string;
  itemId: string;
  itemType: string;
  eventType: 'impression' | 'click' | 'view' | 'conversion' | 'purchase' | 'dismiss';
  experimentId?: string;
  variantId?: string;
  position?: number;
  score?: number;
  context?: {
    location?: string;
    device?: string;
    timeOfDay?: string;
    sessionId?: string;
    referrer?: string;
  };
  metadata?: {
    duration?: number;
    scrollDepth?: number;
    revenue?: number;
    quantity?: number;
    rating?: number;
  };
}

export interface FeedbackStats {
  totalImpressions: number;
  totalClicks: number;
  totalViews: number;
  totalConversions: number;
  totalPurchases: number;
  ctr: number;
  conversionRate: number;
  avgPosition: number;
}

export class FeedbackService {
  async logFeedback(input: FeedbackInput): Promise<IFeedback> {
    const feedbackId = `fb_${uuidv4().substring(0, 12)}`;

    const feedback = new Feedback({
      feedbackId,
      userId: input.userId,
      itemId: input.itemId,
      itemType: input.itemType,
      eventType: input.eventType,
      experimentId: input.experimentId,
      variantId: input.variantId,
      position: input.position ?? 0,
      score: input.score,
      context: input.context || {},
      metadata: input.metadata || {},
      timestamp: new Date()
    });

    await feedback.save();

    // Update experiment metrics if applicable
    if (input.experimentId && input.variantId) {
      await this.updateExperimentMetrics(input);
    }

    // Update item features for learning
    if (input.eventType === 'click' || input.eventType === 'conversion' || input.eventType === 'purchase') {
      await this.updateItemFeatures(input);
    }

    log.info('Feedback logged', {
      feedbackId,
      userId: input.userId,
      itemId: input.itemId,
      eventType: input.eventType,
      experimentId: input.experimentId
    });

    return feedback;
  }

  private async updateExperimentMetrics(input: FeedbackInput): Promise<void> {
    if (!input.experimentId || !input.variantId) return;

    try {
      switch (input.eventType) {
        case 'impression':
          await experimentService.recordImpression(
            input.experimentId,
            input.variantId,
            input.userId
          );
          break;
        case 'click':
          await experimentService.recordClick(
            input.experimentId,
            input.variantId,
            input.userId,
            input.itemId
          );
          break;
        case 'conversion':
        case 'purchase':
          await experimentService.recordConversion(
            input.experimentId,
            input.variantId,
            input.metadata?.revenue
          );
          break;
      }
    } catch (error) {
      log.error('Failed to update experiment metrics', { error, input });
    }
  }

  private async updateItemFeatures(input: FeedbackInput): Promise<void> {
    // This would integrate with featureService to update item features
    // based on user interactions for continuous learning
    try {
      // Increment click/purchase counts in feature store
      log.debug('Item features update triggered', { itemId: input.itemId });
      // Implementation would call featureService.updateFeatures()
    } catch (error) {
      log.error('Failed to update item features', { error, itemId: input.itemId });
    }
  }

  async logBatchFeedback(inputs: FeedbackInput[]): Promise<IFeedback[]> {
    const feedbackDocs = inputs.map(input => ({
      feedbackId: `fb_${uuidv4().substring(0, 12)}`,
      userId: input.userId,
      itemId: input.itemId,
      itemType: input.itemType,
      eventType: input.eventType,
      experimentId: input.experimentId,
      variantId: input.variantId,
      position: input.position ?? 0,
      score: input.score,
      context: input.context || {},
      metadata: input.metadata || {},
      timestamp: new Date()
    }));

    const results = await Feedback.insertMany(feedbackDocs, { ordered: false });

    // Update experiment metrics for all applicable feedback
    for (const input of inputs) {
      if (input.experimentId && input.variantId) {
        await this.updateExperimentMetrics(input);
      }
    }

    log.info('Batch feedback logged', { count: results.length });
    return results;
  }

  async getFeedbackForUser(
    userId: string,
    options?: {
      itemType?: string;
      eventType?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IFeedback[]> {
    const query: any = { userId };

    if (options?.itemType) {
      query.itemType = options.itemType;
    }
    if (options?.eventType) {
      query.eventType = options.eventType;
    }
    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        query.timestamp.$lte = options.endDate;
      }
    }

    return Feedback.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100);
  }

  async getFeedbackForItem(
    itemId: string,
    options?: {
      eventType?: string;
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IFeedback[]> {
    const query: any = { itemId };

    if (options?.eventType) {
      query.eventType = options.eventType;
    }
    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        query.timestamp.$lte = options.endDate;
      }
    }

    return Feedback.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100);
  }

  async getStatsForItem(itemId: string): Promise<FeedbackStats> {
    const pipeline = [
      { $match: { itemId } },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          avgPosition: { $avg: '$position' }
        }
      }
    ];

    const results = await Feedback.aggregate(pipeline);

    const stats: FeedbackStats = {
      totalImpressions: 0,
      totalClicks: 0,
      totalViews: 0,
      totalConversions: 0,
      totalPurchases: 0,
      ctr: 0,
      conversionRate: 0,
      avgPosition: 0
    };

    let totalPositions = 0;
    let positionCount = 0;

    for (const result of results) {
      switch (result._id) {
        case 'impression':
          stats.totalImpressions = result.count;
          break;
        case 'click':
          stats.totalClicks = result.count;
          break;
        case 'view':
          stats.totalViews = result.count;
          break;
        case 'conversion':
          stats.totalConversions = result.count;
          break;
        case 'purchase':
          stats.totalPurchases = result.count;
          break;
      }
      totalPositions += result.avgPosition * result.count;
      positionCount += result.count;
    }

    if (stats.totalImpressions > 0) {
      stats.ctr = stats.totalClicks / stats.totalImpressions;
    }
    if (stats.totalClicks > 0) {
      stats.conversionRate = stats.totalConversions / stats.totalClicks;
    }
    if (positionCount > 0) {
      stats.avgPosition = totalPositions / positionCount;
    }

    return stats;
  }

  async getClickPositions(itemId: string): Promise<number[]> {
    const feedbacks = await Feedback.find({
      itemId,
      eventType: { $in: ['click', 'conversion'] }
    })
      .select('position timestamp')
      .sort({ timestamp: -1 })
      .limit(1000);

    return feedbacks.map(f => f.position);
  }

  async calculatePositionBias(): Promise<Map<string, number>> {
    // Calculate position bias for different positions
    // Items at lower positions (top of list) typically get more clicks
    // This helps normalize rankings across positions
    const pipeline: any[] = [
      {
        $match: {
          eventType: { $in: ['click', 'conversion'] }
        }
      },
      {
        $group: {
          _id: '$position',
          clicks: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 as const } }
    ];

    const results = await Feedback.aggregate(pipeline);

    const positionBias = new Map<string, number>();
    const totalClicks = results.reduce((sum, r) => sum + r.clicks, 0);

    for (const result of results) {
      // Higher positions should have higher expected click rates
      // Position 1 gets base clicks, position 10 gets fewer
      const expectedRate = 1 / (result._id + 1);
      const observedRate = result.clicks / totalClicks;
      const bias = observedRate / expectedRate;
      positionBias.set(String(result._id), bias);
    }

    return positionBias;
  }

  async getRecentActivity(
    options?: {
      limit?: number;
      eventTypes?: string[];
    }
  ): Promise<any[]> {
    const query: any = {};

    if (options?.eventTypes && options.eventTypes.length > 0) {
      query.eventType = { $in: options.eventTypes };
    }

    return Feedback.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .lean();
  }
}

export const feedbackService = new FeedbackService();
