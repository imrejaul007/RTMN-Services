/**
 * Funnel Analyzer Service
 * Analyzes conversion funnels and identifies bottlenecks
 */

import { Touchpoint } from '../models/Touchpoint';
import { Funnel, FunnelDocument } from '../models/Funnel';
import { CustomerJourney } from '../models/Journey';
import {
  FunnelStage,
  FunnelAnalysis,
  FunnelStageResult,
  DropOffPoint,
  TimeStats,
  SegmentResult,
  DateRange,
  FunnelFilters,
  AnalyzeFunnelRequest
} from '../types';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class FunnelAnalyzer {
  /**
   * Analyze a funnel
   */
  async analyzeFunnel(request: AnalyzeFunnelRequest): Promise<FunnelAnalysis> {
    const tenantId = request.tenantId || 'public';
    const dateRange: DateRange = {
      start: new Date(request.dateRange.start),
      end: new Date(request.dateRange.end)
    };

    // Get funnel configuration
    let stages: FunnelStage[];
    let funnelId: string;

    if (request.funnelId) {
      const funnel = await Funnel.findByIdAndTenant(request.funnelId, tenantId);
      if (!funnel) {
        throw new Error(`Funnel ${request.funnelId} not found`);
      }
      stages = funnel.stages;
      funnelId = funnel.funnelId;
    } else if (request.funnel) {
      stages = request.funnel.map((s, i) => ({ ...s, order: i }));
      funnelId = uuidv4();
    } else {
      throw new Error('Either funnelId or funnel must be provided');
    }

    // Analyze each stage
    const stageResults: FunnelStageResult[] = [];
    const dropOffPoints: DropOffPoint[] = [];

    let previousStageCount = 0;
    let totalEntered = 0;
    let totalConverted = 0;
    const conversionTimes: number[] = [];
    const segmentResults: Record<string, { entered: number; converted: number }> = {};

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageName = stage.name;

      // Get touchpoints for this stage
      const stageTouchpoints = await this.getStageTouchpoints(
        tenantId,
        stageName,
        dateRange,
        request.filters
      );

      const entered = stageTouchpoints.length;

      if (i === 0) {
        totalEntered = entered;
      }

      // Calculate exited (those who didn't proceed to next stage)
      const nextStage = i < stages.length - 1 ? stages[i + 1] : null;
      let exited = 0;
      let converted = 0;

      if (nextStage) {
        const nextStageTouchpoints = await this.getStageTouchpoints(
          tenantId,
          nextStage.name,
          dateRange,
          request.filters
        );

        // Count people who went to next stage
        const proceededCustomers = new Set(
          nextStageTouchpoints.map(t => t.customerId)
        );
        exited = entered - proceededCustomers.size;

        // Drop-off analysis
        if (exited > 0) {
          const dropOffRate = exited / entered;
          const commonExits = await this.identifyCommonExitTouchpoints(
            tenantId,
            stageName,
            dateRange,
            request.filters
          );

          dropOffPoints.push({
            fromStage: stageName,
            toStage: nextStage.name,
            dropOffCount: exited,
            dropOffRate,
            commonExitTouchpoints: commonExits
          });
        }
      } else {
        // Last stage - count conversions
        converted = await this.countConversions(
          tenantId,
          stageName,
          dateRange,
          request.filters
        );
        totalConverted = converted;
        exited = entered - converted;

        // Calculate time to conversion for journeys
        const times = await this.calculateConversionTimes(
          tenantId,
          dateRange,
          request.filters
        );
        conversionTimes.push(...times);
      }

      // Calculate average time in stage
      const avgTime = await this.calculateAvgTimeInStage(
        tenantId,
        stageName,
        dateRange,
        request.filters
      );

      // Update segment results
      await this.updateSegmentResults(
        segmentResults,
        tenantId,
        stageName,
        dateRange,
        request.filters
      );

      const conversionRate = entered > 0 ? converted / entered : 0;
      const dropOffRate = entered > 0 ? exited / entered : 0;

      stageResults.push({
        stageName,
        order: stage.order,
        entered,
        exited,
        converted,
        conversionRate,
        avgTimeInStage: avgTime,
        dropOffRate
      });

      previousStageCount = entered;
    }

    // Calculate time statistics
    const timeStats = this.calculateTimeStats(conversionTimes);

    // Build segment breakdown
    const segmentBreakdown: SegmentResult[] = Object.entries(segmentResults).map(
      ([segmentName, data]) => ({
        segmentName,
        entered: data.entered,
        converted: data.converted,
        conversionRate: data.entered > 0 ? data.converted / data.entered : 0
      })
    );

    return {
      funnelId,
      tenantId,
      stages: stageResults,
      totalEntered,
      totalConverted,
      overallConversionRate: totalEntered > 0 ? totalConverted / totalEntered : 0,
      dropOffPoints,
      timeToConversion: timeStats,
      segmentBreakdown,
      dateRange,
      generatedAt: new Date()
    };
  }

  /**
   * Get touchpoints for a specific stage
   */
  private async getStageTouchpoints(
    tenantId: string,
    stageName: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<Array<{ customerId: string }>> {
    const match: Record<string, unknown> = {
      tenantId,
      timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    };

    // Map stage names to touchpoint types
    const stageTouchpointMap: Record<string, string[]> = {
      awareness: ['ad', 'social', 'website'],
      consideration: ['search', 'email', 'website', 'social'],
      intent: ['app', 'call', 'chat'],
      acquisition: ['signup', 'purchase'],
      purchase: ['purchase', 'delivery'],
      onboarding: ['signup', 'app'],
      activation: ['app', 'call', 'chat', 'delivery'],
      retention: ['support', 'review', 'repeat'],
      first_purchase: ['purchase'],
      repeat_purchase: ['repeat', 'purchase'],
      loyalty: ['repeat', 'review'],
      advocacy: ['referral', 'review']
    };

    const types = stageTouchpointMap[stageName] || [stageName];

    match.type = { $in: types };

    if (filters?.channels?.length) {
      match['source.channel'] = { $in: filters.channels };
    }

    if (filters?.campaigns?.length) {
      match['source.campaign'] = { $in: filters.campaigns };
    }

    const touchpoints = await Touchpoint.find(match)
      .select('customerId')
      .exec();

    // Deduplicate by customer
    const uniqueCustomers = new Set(touchpoints.map(t => t.customerId));
    return Array.from(uniqueCustomers).map(customerId => ({ customerId }));
  }

  /**
   * Identify common exit touchpoints
   */
  private async identifyCommonExitTouchpoints(
    tenantId: string,
    stageName: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<string[]> {
    const stageTouchpointMap: Record<string, string[]> = {
      awareness: ['ad', 'social', 'website'],
      consideration: ['search', 'email', 'website', 'social'],
      intent: ['app', 'call', 'chat'],
      acquisition: ['signup', 'purchase'],
      purchase: ['purchase', 'delivery']
    };

    const types = stageTouchpointMap[stageName] || [stageName];

    const result = await Touchpoint.aggregate([
      {
        $match: {
          tenantId,
          type: { $in: types },
          timestamp: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    return result.map(r => r._id);
  }

  /**
   * Count conversions for a stage
   */
  private async countConversions(
    tenantId: string,
    stageName: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<number> {
    const match: Record<string, unknown> = {
      tenantId,
      converted: true,
      timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    };

    if (filters?.channels?.length) {
      match['source.channel'] = { $in: filters.channels };
    }

    return Touchpoint.countDocuments(match).exec();
  }

  /**
   * Calculate average time spent in a stage
   */
  private async calculateAvgTimeInStage(
    tenantId: string,
    stageName: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<number> {
    const result = await Touchpoint.aggregate([
      {
        $match: {
          tenantId,
          timestamp: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: null,
          avgDuration: { $avg: '$duration' }
        }
      }
    ]);

    return result[0]?.avgDuration || 0;
  }

  /**
   * Calculate conversion times
   */
  private async calculateConversionTimes(
    tenantId: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<number[]> {
    const journeys = await CustomerJourney.find({
      tenantId,
      convertedAt: {
        $gte: dateRange.start,
        $lte: dateRange.end
      }
    }).exec();

    return journeys.map(j => {
      const diff = j.convertedAt!.getTime() - j.createdAt.getTime();
      return diff / 1000; // Convert to seconds
    });
  }

  /**
   * Update segment results
   */
  private async updateSegmentResults(
    segmentResults: Record<string, { entered: number; converted: number }>,
    tenantId: string,
    stageName: string,
    dateRange: DateRange,
    filters?: FunnelFilters
  ): Promise<void> {
    // Group by channel
    const channels = filters?.channels || ['all'];

    for (const channel of channels) {
      const segmentName = channel === 'all' ? 'all_traffic' : channel;

      if (!segmentResults[segmentName]) {
        segmentResults[segmentName] = { entered: 0, converted: 0 };
      }

      const touchpoints = await this.getStageTouchpoints(
        tenantId,
        stageName,
        dateRange,
        { channels: [channel] }
      );

      segmentResults[segmentName].entered += touchpoints.length;
    }
  }

  /**
   * Calculate time statistics
   */
  private calculateTimeStats(times: number[]): TimeStats {
    if (times.length === 0) {
      return {
        avgTimeToConvert: 0,
        medianTimeToConvert: 0,
        minTimeToConvert: 0,
        maxTimeToConvert: 0,
        distribution: {}
      };
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const avg = sum / sorted.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Create distribution buckets
    const buckets = ['<1h', '1-24h', '1-7d', '7-30d', '>30d'];
    const distribution: Record<string, number> = {};

    times.forEach(time => {
      const hours = time / 3600;
      const days = hours / 24;

      if (days < 1) distribution['<1h'] = (distribution['<1h'] || 0) + 1;
      else if (days < 1) distribution['1-24h'] = (distribution['1-24h'] || 0) + 1;
      else if (days < 7) distribution['1-7d'] = (distribution['1-7d'] || 0) + 1;
      else if (days < 30) distribution['7-30d'] = (distribution['7-30d'] || 0) + 1;
      else distribution['>30d'] = (distribution['>30d'] || 0) + 1;
    });

    return {
      avgTimeToConvert: avg,
      medianTimeToConvert: median,
      minTimeToConvert: sorted[0],
      maxTimeToConvert: sorted[sorted.length - 1],
      distribution
    };
  }

  /**
   * Get comparison between two date ranges
   */
  async comparePeriods(
    tenantId: string,
    funnelId: string,
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): Promise<{
    period1: FunnelAnalysis;
    period2: FunnelAnalysis;
    changes: {
      stage: string;
      conversionChange: number;
      volumeChange: number;
    }[];
  }> {
    const funnel = await Funnel.findByIdAndTenant(funnelId, tenantId);
    if (!funnel) {
      throw new Error(`Funnel ${funnelId} not found`);
    }

    const analysis1 = await this.analyzeFunnel({
      funnelId,
      dateRange: period1
    });

    const analysis2 = await this.analyzeFunnel({
      funnelId,
      dateRange: period2
    });

    // Calculate changes
    const changes = analysis1.stages.map((stage, i) => {
      const stage2 = analysis2.stages.find(s => s.stageName === stage.stageName);
      return {
        stage: stage.stageName,
        conversionChange: stage2
          ? (stage2.conversionRate - stage.conversionRate) * 100
          : 0,
        volumeChange: stage2 ? stage2.entered - stage.entered : 0
      };
    });

    return {
      period1: analysis1,
      period2: analysis2,
      changes
    };
  }
}

export const funnelAnalyzer = new FunnelAnalyzer();
