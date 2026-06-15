// Metrics Aggregator - Aggregates execution metrics for strategy review
import { logger } from '../utils/logger';
import { boaClient } from './boaClient';
import { sutarClient } from './sutarClient';
import { syncService } from './syncService';
import { alignmentChecker } from './alignmentChecker';
import { feedbackService } from './feedbackService';

export interface StrategyMetrics {
  strategyId: string;
  objectiveCount: number;
  syncedCount: number;
  avgProgress: number;
  avgAlignment: number;
  feedbackCount: number;
  criticalFeedback: number;
  computedAt: Date;
}

export class MetricsAggregator {
  private cache: Map<string, StrategyMetrics> = new Map();
  private cacheTtlMs: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get comprehensive metrics for a strategy
   */
  async getStrategyMetrics(strategyId: string): Promise<StrategyMetrics> {
    const cached = this.cache.get(strategyId);
    if (cached && (Date.now() - cached.computedAt.getTime()) < this.cacheTtlMs) {
      return cached;
    }

    const boaObjectives = await boaClient.getAllObjectives({ strategyId });
    const syncs = syncService.getAllSyncs().filter(s => boaObjectives.some(o => o.id === s.boaObjectiveId));
    const alignmentRecord = await alignmentChecker.checkStrategyAlignment(strategyId);

    const feedbacks = Array.from(feedbackService.getUnprocessed())
      .concat(boaObjectives.flatMap(o => feedbackService.getForObjective(o.id)));

    const totalProgress = boaObjectives.reduce((s, o) => s + (o.progress || 0), 0);
    const avgProgress = boaObjectives.length > 0 ? totalProgress / boaObjectives.length : 0;

    const metrics: StrategyMetrics = {
      strategyId,
      objectiveCount: boaObjectives.length,
      syncedCount: syncs.filter(s => s.status === 'completed').length,
      avgProgress: Math.round(avgProgress),
      avgAlignment: alignmentRecord.alignmentScore,
      feedbackCount: feedbacks.length,
      criticalFeedback: feedbacks.filter(f => f.severity === 'critical').length,
      computedAt: new Date(),
    };

    this.cache.set(strategyId, metrics);
    return metrics;
  }

  /**
   * Invalidate cache
   */
  invalidateCache(strategyId?: string): void {
    if (strategyId) this.cache.delete(strategyId);
    else this.cache.clear();
  }

  /**
   * Get top-level dashboard
   */
  async getDashboard(): Promise<{ totalObjectives: number; synced: number; avgProgress: number; systemHealth: any }> {
    const boaObjectives = await boaClient.getAllObjectives();
    const syncs = syncService.getAllSyncs();
    const boaHealthy = await boaClient.isHealthy();
    const sutarHealthy = await sutarClient.isHealthy();

    const totalProgress = boaObjectives.reduce((s, o) => s + (o.progress || 0), 0);
    const avgProgress = boaObjectives.length > 0 ? totalProgress / boaObjectives.length : 0;

    return {
      totalObjectives: boaObjectives.length,
      synced: syncs.filter(s => s.status === 'completed').length,
      avgProgress: Math.round(avgProgress),
      systemHealth: {
        boaOS: boaHealthy ? 'healthy' : 'down',
        sutarGoalOS: sutarHealthy ? 'healthy' : 'down',
      },
    };
  }
}

export const metricsAggregator = new MetricsAggregator();
export default metricsAggregator;
