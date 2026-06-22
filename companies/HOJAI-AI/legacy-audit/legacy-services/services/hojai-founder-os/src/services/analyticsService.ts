/**
 * HOJAI FounderOS - Analytics Service
 * Founder dashboard and analytics
 */

import { BusinessModelModel, GTMStrategyModel, FundraisingPlanModel, HiringPlanModel, MarketAnalysisModel, FounderBriefingModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';
import { businessModelService } from './businessModelService.js';
import { fundraisingService } from './fundraisingService.js';
import { hiringService } from './hiringService.js';

const logger = createLogger('analytics');

export class AnalyticsService {
  /**
   * Get comprehensive founder analytics
   */
  async getFounderAnalytics(tenantId: string): Promise<any> {
    const [
      businessModels,
      gtmStrategies,
      fundraisingPlans,
      hiringPlans,
      marketAnalyses,
      briefings
    ] = await Promise.all([
      BusinessModelModel.find({ tenantId }),
      GTMStrategyModel.find({ tenantId }),
      FundraisingPlanModel.find({ tenantId }),
      HiringPlanModel.find({ tenantId }),
      MarketAnalysisModel.find({ tenantId }),
      FounderBriefingModel.find({ tenantId }).sort({ date: -1 }).limit(10)
    ]);

    const fundraisingAnalytics = await fundraisingService.getAnalytics(tenantId);
    const hiringAnalytics = await hiringService.getAnalytics(tenantId);

    return {
      overview: {
        totalBusinessModels: businessModels.length,
        totalGTMStrategies: gtmStrategies.length,
        totalFundraisingPlans: fundraisingPlans.length,
        totalHiringPlans: hiringPlans.length,
        totalMarketAnalyses: marketAnalyses.length,
        totalBriefings: briefings.length
      },
      businessModel: {
        models: businessModels.map(m => ({
          id: m.id,
          name: m.name,
          completeness: this.calculateBusinessModelCompleteness(m.segments),
          createdAt: m.createdAt
        })),
        averageCompleteness: businessModels.length > 0
          ? Math.round(businessModels.reduce((sum, m) =>
            sum + this.calculateBusinessModelCompleteness(m.segments), 0) / businessModels.length)
          : 0
      },
      fundraising: fundraisingAnalytics,
      hiring: hiringAnalytics,
      recentActivity: {
        briefings: briefings.slice(0, 5).map(b => ({
          id: b.id,
          type: b.type,
          date: b.date,
          overview: b.content?.overview?.substring(0, 100)
        }))
      },
      recommendations: this.generateRecommendations(
        businessModels,
        gtmStrategies,
        fundraisingAnalytics,
        hiringAnalytics
      )
    };
  }

  /**
   * Get business model analytics
   */
  async getBusinessModelAnalytics(tenantId: string): Promise<any> {
    const models = await BusinessModelModel.find({ tenantId });

    const segmentAnalysis = {
      keyPartners: { avgCount: 0, maxCount: 0 },
      keyActivities: { avgCount: 0, maxCount: 0 },
      keyResources: { avgCount: 0, maxCount: 0 },
      valuePropositions: { avgCount: 0, maxCount: 0 },
      customerRelationships: { avgCount: 0, maxCount: 0 },
      channels: { avgCount: 0, maxCount: 0 },
      customerSegments: { avgCount: 0, maxCount: 0 },
      costStructure: { avgCount: 0, maxCount: 0 },
      revenueStreams: { avgCount: 0, maxCount: 0 }
    };

    for (const model of models) {
      const segments = model.segments || {};
      for (const [key, value] of Object.entries(segments)) {
        if (segmentAnalysis[key as keyof typeof segmentAnalysis]) {
          const arr = value as string[];
          segmentAnalysis[key as keyof typeof segmentAnalysis].avgCount += arr.length;
          segmentAnalysis[key as keyof typeof segmentAnalysis].maxCount = Math.max(
            segmentAnalysis[key as keyof typeof segmentAnalysis].maxCount,
            arr.length
          );
        }
      }
    }

    const count = models.length || 1;
    for (const key of Object.keys(segmentAnalysis)) {
      segmentAnalysis[key as keyof typeof segmentAnalysis].avgCount =
        Math.round(segmentAnalysis[key as keyof typeof segmentAnalysis].avgCount / count);
    }

    return {
      totalModels: models.length,
      segmentAnalysis,
      commonElements: this.findCommonElements(models),
      gaps: this.identifyBusinessModelGaps(models)
    };
  }

  /**
   * Get GTM analytics
   */
  async getGTMAnalytics(tenantId: string): Promise<any> {
    const strategies = await GTMStrategyModel.find({ tenantId });

    const channelsUsed: Record<string, number> = {};
    const segmentsTargeted: Record<string, number> = {};
    const milestonesByStatus = { pending: 0, in_progress: 0, completed: 0, delayed: 0 };

    for (const strategy of strategies) {
      const { channels = [], targetSegments = [], milestones = [] } = strategy.strategy || {};

      for (const channel of channels) {
        channelsUsed[channel] = (channelsUsed[channel] || 0) + 1;
      }
      for (const segment of targetSegments) {
        segmentsTargeted[segment] = (segmentsTargeted[segment] || 0) + 1;
      }
      for (const milestone of milestones) {
        milestonesByStatus[milestone.status as keyof typeof milestonesByStatus]++;
      }
    }

    return {
      totalStrategies: strategies.length,
      topChannels: Object.entries(channelsUsed)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([channel, count]) => ({ channel, count })),
      topSegments: Object.entries(segmentsTargeted)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([segment, count]) => ({ segment, count })),
      milestoneProgress: milestonesByStatus
    };
  }

  /**
   * Get timeline/milestone analytics
   */
  async getTimelineAnalytics(tenantId: string): Promise<any> {
    const [fundraisingPlans, gtmStrategies] = await Promise.all([
      FundraisingPlanModel.find({ tenantId }),
      GTMStrategyModel.find({ tenantId })
    ]);

    const upcomingMilestones: Array<{
      id: string;
      title: string;
      type: 'fundraising' | 'gtm';
      targetDate: Date;
      status: string;
      parentName: string;
    }> = [];

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    for (const plan of fundraisingPlans) {
      for (const milestone of plan.milestones || []) {
        if (milestone.targetDate && milestone.status !== 'completed') {
          const date = new Date(milestone.targetDate);
          if (date >= now && date <= threeMonthsFromNow) {
            upcomingMilestones.push({
              id: milestone.id,
              title: milestone.title,
              type: 'fundraising',
              targetDate: date,
              status: milestone.status,
              parentName: plan.name
            });
          }
        }
      }
    }

    for (const strategy of gtmStrategies) {
      for (const milestone of strategy.strategy?.milestones || []) {
        if (milestone.targetDate && milestone.status !== 'completed') {
          const date = new Date(milestone.targetDate);
          if (date >= now && date <= threeMonthsFromNow) {
            upcomingMilestones.push({
              id: milestone.id,
              title: milestone.title,
              type: 'gtm',
              targetDate: date,
              status: milestone.status,
              parentName: strategy.name
            });
          }
        }
      }
    }

    return {
      upcomingMilestones: upcomingMilestones.sort((a, b) =>
        a.targetDate.getTime() - b.targetDate.getTime()
      ),
      overdueMilestones: upcomingMilestones.filter(m =>
        new Date(m.targetDate) < now && m.status !== 'completed'
      )
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private calculateBusinessModelCompleteness(segments: any): number {
    const fields = [
      'keyPartners', 'keyActivities', 'keyResources', 'valuePropositions',
      'customerRelationships', 'channels', 'customerSegments',
      'costStructure', 'revenueStreams'
    ];

    let filledCount = 0;
    for (const field of fields) {
      const arr = segments?.[field];
      if (arr && arr.length > 0) filledCount++;
    }

    return Math.round((filledCount / fields.length) * 100);
  }

  private findCommonElements(models: any[]): Record<string, string[]> {
    const counts: Record<string, Record<string, number>> = {};

    for (const model of models) {
      const segments = model.segments || {};
      for (const [key, value] of Object.entries(segments)) {
        if (!counts[key]) counts[key] = {};
        for (const item of value as string[]) {
          counts[key][item] = (counts[key][item] || 0) + 1;
        }
      }
    }

    const common: Record<string, string[]> = {};
    const minOccurrences = Math.max(2, Math.floor(models.length / 2));

    for (const [key, items] of Object.entries(counts)) {
      common[key] = Object.entries(items)
        .filter(([, count]) => count >= minOccurrences)
        .map(([item]) => item);
    }

    return common;
  }

  private identifyBusinessModelGaps(models: any[]): string[] {
    const gaps: string[] = [];

    if (models.length === 0) {
      gaps.push('Create your first business model canvas');
      return gaps;
    }

    const emptySections: Record<string, number> = {};
    for (const model of models) {
      const segments = model.segments || {};
      const fields = [
        'keyPartners', 'keyActivities', 'keyResources', 'valuePropositions',
        'customerRelationships', 'channels', 'customerSegments',
        'costStructure', 'revenueStreams'
      ];

      for (const field of fields) {
        const arr = segments[field];
        if (!arr || arr.length === 0) {
          emptySections[field] = (emptySections[field] || 0) + 1;
        }
      }
    }

    for (const [section, count] of Object.entries(emptySections)) {
      if (count === models.length) {
        gaps.push(`${section.replace(/([A-Z])/g, ' $1').toLowerCase()} is empty across all models`);
      }
    }

    return gaps;
  }

  private generateRecommendations(
    businessModels: any[],
    gtmStrategies: any[],
    fundraising: any,
    hiring: any
  ): string[] {
    const recommendations: string[] = [];

    if (businessModels.length === 0) {
      recommendations.push('Create a business model canvas to define your business strategy');
    }

    if (gtmStrategies.length === 0 && businessModels.length > 0) {
      recommendations.push('Generate a GTM strategy from your business model');
    }

    if (fundraising.totalPlans === 0) {
      recommendations.push('Create a fundraising plan to track your capital raising');
    }

    if (fundraising.fillRate < 50 && fundraising.totalRaised > 0) {
      recommendations.push('Consider updating investor outreach strategy');
    }

    if (hiring.openRoles > 5) {
      recommendations.push('Prioritize critical hiring roles to maintain team efficiency');
    }

    if (hiring.totalRoles === 0) {
      recommendations.push('Create a hiring plan to scale your team');
    }

    if (recommendations.length === 0) {
      recommendations.push('All core founder tools are in place. Focus on execution.');
    }

    return recommendations;
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;