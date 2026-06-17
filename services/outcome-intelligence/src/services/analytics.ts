import { Outcome } from '../models/Outcome';
import { Metric } from '../models/Metric';
import { OutcomeAnalytics, ReportFilters, AggregatedMetrics, OutcomeRecord } from '../types';
import { OutcomeCalculator } from './calculator';

export class AnalyticsService {
  /**
   * Get comprehensive analytics for a tenant
   */
  static async getAnalytics(tenantId: string, startDate?: Date, endDate?: Date): Promise<OutcomeAnalytics> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate || new Date();

    const outcomes = await Outcome.find({
      tenantId,
      timestamp: { $gte: start, $lte: end }
    });

    if (outcomes.length === 0) {
      return {
        revenueSavedPerTicket: 0,
        customerRetentionRate: 0,
        churnPreventionRate: 0,
        upsellConversionRate: 0,
        referralRate: 0,
        riskDetectionRate: 0,
        averageResolutionTime: 0,
        csatImprovement: 0,
        netPromoterScoreImprovement: 0,
        roiPercentage: 0
      };
    }

    const revenueImpact = OutcomeCalculator.calculateRevenueImpact(outcomes);
    const customerImpact = OutcomeCalculator.calculateCustomerImpact(outcomes);
    const businessImpact = OutcomeCalculator.calculateBusinessImpact(outcomes);
    const resolutionMetrics = OutcomeCalculator.calculateResolutionMetrics(outcomes);

    // Calculate NPS improvement
    const outcomesWithNps = outcomes.filter(
      o => o.customerImpact.npsBefore !== undefined && o.customerImpact.npsAfter !== undefined
    );
    const avgNpsImprovement = outcomesWithNps.length > 0
      ? outcomesWithNps.reduce(
          (sum, o) => sum + ((o.customerImpact.npsAfter || 0) - (o.customerImpact.npsBefore || 0)),
          0
        ) / outcomesWithNps.length
      : 0;

    // Calculate ROI
    const totalBenefit = revenueImpact.totalSaved + revenueImpact.totalProtected + businessImpact.upsellAmount;
    const totalCost = revenueImpact.totalCost;
    const roiPercentage = totalCost > 0 ? ((totalBenefit - totalCost) / totalCost) * 100 : 0;

    return {
      revenueSavedPerTicket: revenueImpact.avgPerTicket,
      customerRetentionRate: customerImpact.retentionRate,
      churnPreventionRate: customerImpact.churnPreventionRate,
      upsellConversionRate: businessImpact.upsellConversionRate,
      referralRate: outcomes.length > 0 ? (businessImpact.referralsCreated / outcomes.length) * 100 : 0,
      riskDetectionRate: outcomes.length > 0 ? (businessImpact.risksIdentified / outcomes.length) * 100 : 0,
      averageResolutionTime: resolutionMetrics.avgResolutionTime,
      csatImprovement: resolutionMetrics.avgCsatImprovement,
      netPromoterScoreImprovement: avgNpsImprovement,
      roiPercentage
    };
  }

  /**
   * Get trend analysis over time
   */
  static async getTrendAnalysis(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    periods: number = 6
  ): Promise<AggregatedMetrics[]> {
    const endDate = new Date();
    const results: AggregatedMetrics[] = [];

    for (let i = 0; i < periods; i++) {
      const metric = await this.getOrCreateMetric(tenantId, period, endDate, i);
      results.push(this.toAggregatedMetrics(metric));
    }

    return results.reverse();
  }

  /**
   * Get or create aggregated metric for a period
   */
  private static async getOrCreateMetric(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    endDate: Date,
    periodOffset: number
  ): Promise<Metric> {
    const date = new Date(endDate);

    switch (period) {
      case 'daily':
        date.setDate(date.getDate() - periodOffset);
        break;
      case 'weekly':
        date.setDate(date.getDate() - periodOffset * 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() - periodOffset);
        break;
    }

    const startDate = OutcomeCalculator.getPeriodStart(date, period);

    // Check for existing metric
    let metric = await Metric.findOne({
      tenantId,
      period,
      date: startDate
    });

    if (!metric) {
      metric = await OutcomeCalculator.aggregateMetrics(tenantId, period, startDate);
    }

    return metric;
  }

  /**
   * Generate report with filters
   */
  static async generateReport(filters: ReportFilters): Promise<{
    report: AggregatedMetrics;
    breakdown: Record<string, unknown>[];
  }> {
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate || new Date();

    const query: any = {
      tenantId: filters.tenantId,
      timestamp: { $gte: startDate, $lte: endDate }
    };

    if (filters.minRevenueSaved) {
      query['revenueImpact.saved'] = { $gte: filters.minRevenueSaved };
    }

    if (!filters.includeChurned) {
      query['customerImpact.churned'] = { $ne: true };
    }

    const outcomes = await Outcome.find(query);

    const revenueImpact = OutcomeCalculator.calculateRevenueImpact(outcomes);
    const customerImpact = OutcomeCalculator.calculateCustomerImpact(outcomes);
    const businessImpact = OutcomeCalculator.calculateBusinessImpact(outcomes);
    const resolutionMetrics = OutcomeCalculator.calculateResolutionMetrics(outcomes);

    const report: AggregatedMetrics = {
      tenantId: filters.tenantId,
      period: filters.period || 'daily',
      startDate,
      endDate,
      totals: {
        totalRevenueSaved: revenueImpact.totalSaved,
        totalRevenueProtected: revenueImpact.totalProtected,
        totalRevenueCost: revenueImpact.totalCost,
        totalCustomersRetained: customerImpact.retained,
        totalCustomersChurned: customerImpact.churned,
        totalUpsellsGenerated: businessImpact.upsellsGenerated,
        totalUpsellAmount: businessImpact.upsellAmount,
        totalReferralsCreated: businessImpact.referralsCreated,
        totalRisksIdentified: businessImpact.risksIdentified,
        totalOutcomesTracked: outcomes.length
      },
      averages: {
        avgCsatImprovement: resolutionMetrics.avgCsatImprovement,
        avgResolutionTime: resolutionMetrics.avgResolutionTime,
        avgRevenuePerTicket: revenueImpact.avgPerTicket
      },
      trends: {
        revenueSavedTrend: OutcomeCalculator.calculateTrend(outcomes, 'revenueImpact.saved'),
        retentionRate: customerImpact.retentionRate,
        upsellConversionRate: businessImpact.upsellConversionRate
      }
    };

    // Generate breakdown based on groupBy
    const breakdown = await this.generateBreakdown(outcomes, filters.groupBy || 'ticket');

    return { report, breakdown };
  }

  /**
   * Generate breakdown by specified grouping
   */
  private static async generateBreakdown(
    outcomes: any[],
    groupBy: 'ticket' | 'agent' | 'channel' | 'category'
  ): Promise<Record<string, unknown>[]> {
    const groups = new Map<string, any[]>();

    for (const outcome of outcomes) {
      let key: string;
      switch (groupBy) {
        case 'ticket':
          key = outcome.ticketId;
          break;
        case 'agent':
          key = outcome.metrics.agentId || 'unknown';
          break;
        case 'channel':
          key = (outcome.metadata?.channel as string) || 'unknown';
          break;
        case 'category':
          key = (outcome.metadata?.category as string) || 'unknown';
          break;
        default:
          key = outcome.ticketId;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(outcome);
    }

    const breakdown: Record<string, unknown>[] = [];

    for (const [key, groupOutcomes] of groups) {
      const revenueImpact = OutcomeCalculator.calculateRevenueImpact(groupOutcomes);
      const customerImpact = OutcomeCalculator.calculateCustomerImpact(groupOutcomes);
      const businessImpact = OutcomeCalculator.calculateBusinessImpact(groupOutcomes);

      breakdown.push({
        group: key,
        count: groupOutcomes.length,
        revenueSaved: revenueImpact.totalSaved + revenueImpact.totalProtected,
        revenueCost: revenueImpact.totalCost,
        customersRetained: customerImpact.retained,
        upsellsGenerated: businessImpact.upsellsGenerated,
        referralsCreated: businessImpact.referralsCreated,
        risksIdentified: businessImpact.risksIdentified
      });
    }

    return breakdown.sort((a, b) => (b.revenueSaved as number) - (a.revenueSaved as number));
  }

  /**
   * Convert metric document to AggregatedMetrics
   */
  private static toAggregatedMetrics(metric: any): AggregatedMetrics {
    return {
      tenantId: metric.tenantId,
      period: metric.period,
      startDate: metric.date,
      endDate: new Date(metric.date),
      totals: metric.totals,
      averages: metric.averages,
      trends: metric.trends
    };
  }
}
