import { Outcome, IOutcome } from '../models/Outcome';
import { Metric, IMetric } from '../models/Metric';
import { v4 as uuidv4 } from 'uuid';
import {
  TrackOutcomeRequest,
  OutcomeRecord,
  RevenueImpact,
  CustomerImpact,
  BusinessImpact,
  ResolutionMetrics
} from '../types';
import logger from '../utils/logger';

export class OutcomeCalculator {
  /**
   * Track a new outcome record
   */
  static async trackOutcome(
    tenantId: string,
    request: TrackOutcomeRequest
  ): Promise<OutcomeRecord> {
    const outcomeId = `OUT-${uuidv4().substring(0, 8).toUpperCase()}`;

    const outcome = new Outcome({
      outcomeId,
      tenantId,
      ticketId: request.ticketId,
      interactionId: request.interactionId,
      timestamp: new Date(),
      revenueImpact: request.revenueImpact,
      customerImpact: request.customerImpact,
      businessImpact: request.businessImpact,
      metrics: request.metrics,
      metadata: request.metadata,
      calculatedAt: new Date()
    });

    await outcome.save();
    logger.info(`Outcome tracked: ${outcomeId} for ticket ${request.ticketId}`);

    return this.toOutcomeRecord(outcome);
  }

  /**
   * Calculate revenue impact metrics
   */
  static calculateRevenueImpact(outcomes: IOutcome[]): {
    totalSaved: number;
    totalProtected: number;
    totalCost: number;
    netImpact: number;
    avgPerTicket: number;
  } {
    const totals = outcomes.reduce(
      (acc, outcome) => ({
        saved: acc.saved + (outcome.revenueImpact.saved || 0),
        protected: acc.protected + (outcome.revenueImpact.protected || 0),
        cost: acc.cost + (outcome.revenueImpact.cost || 0)
      }),
      { saved: 0, protected: 0, cost: 0 }
    );

    return {
      totalSaved: totals.saved,
      totalProtected: totals.protected,
      totalCost: totals.cost,
      netImpact: totals.saved + totals.protected - totals.cost,
      avgPerTicket: outcomes.length > 0 ? (totals.saved + totals.protected) / outcomes.length : 0
    };
  }

  /**
   * Calculate customer impact metrics
   */
  static calculateCustomerImpact(outcomes: IOutcome[]): {
    retained: number;
    churned: number;
    promoted: number;
    retentionRate: number;
    churnPreventionRate: number;
  } {
    const retained = outcomes.filter(o => o.customerImpact.retained).length;
    const churned = outcomes.filter(o => o.customerImpact.churned).length;
    const promoted = outcomes.filter(o => o.customerImpact.promoted).length;
    const atRisk = outcomes.filter(o => o.customerImpact.retained || o.customerImpact.churned).length;

    return {
      retained,
      churned,
      promoted,
      retentionRate: atRisk > 0 ? (retained / atRisk) * 100 : 0,
      churnPreventionRate: retained > 0 ? (retained / (retained + churned)) * 100 : 0
    };
  }

  /**
   * Calculate business impact metrics
   */
  static calculateBusinessImpact(outcomes: IOutcome[]): {
    upsellsGenerated: number;
    upsellAmount: number;
    referralsCreated: number;
    risksIdentified: number;
    upsellConversionRate: number;
  } {
    const upsells = outcomes.filter(o => o.businessImpact.upsell);
    const referrals = outcomes.filter(o => o.businessImpact.referral);
    const risks = outcomes.filter(o => o.businessImpact.riskIdentified);

    const upsellAmount = upsells.reduce(
      (sum, o) => sum + (o.businessImpact.upsellAmount || 0),
      0
    );

    return {
      upsellsGenerated: upsells.length,
      upsellAmount,
      referralsCreated: referrals.reduce(
        (sum, o) => sum + (o.businessImpact.referralCount || 0),
        0
      ),
      risksIdentified: risks.length,
      upsellConversionRate: outcomes.length > 0 ? (upsells.length / outcomes.length) * 100 : 0
    };
  }

  /**
   * Calculate resolution metrics
   */
  static calculateResolutionMetrics(outcomes: IOutcome[]): {
    avgResolutionTime: number;
    avgCsatImprovement: number;
    avgFirstResponseTime?: number;
  } {
    if (outcomes.length === 0) {
      return { avgResolutionTime: 0, avgCsatImprovement: 0 };
    }

    const totalResolutionTime = outcomes.reduce(
      (sum, o) => sum + o.metrics.resolutionTimeMinutes,
      0
    );

    const outcomesWithCsat = outcomes.filter(
      o => o.metrics.csatBefore !== undefined && o.metrics.csatAfter !== undefined
    );

    const avgCsatImprovement = outcomesWithCsat.length > 0
      ? outcomesWithCsat.reduce(
          (sum, o) => sum + ((o.metrics.csatAfter || 0) - (o.metrics.csatBefore || 0)),
          0
        ) / outcomesWithCsat.length
      : 0;

    const outcomesWithFirstResponse = outcomes.filter(
      o => o.metrics.firstResponseTimeMinutes !== undefined
    );

    const avgFirstResponseTime = outcomesWithFirstResponse.length > 0
      ? outcomesWithFirstResponse.reduce(
          (sum, o) => sum + (o.metrics.firstResponseTimeMinutes || 0),
          0
        ) / outcomesWithFirstResponse.length
      : undefined;

    return {
      avgResolutionTime: totalResolutionTime / outcomes.length,
      avgCsatImprovement,
      avgFirstResponseTime
    };
  }

  /**
   * Aggregate metrics for a period
   */
  static async aggregateMetrics(
    tenantId: string,
    period: 'daily' | 'weekly' | 'monthly',
    date: Date
  ): Promise<IMetric> {
    const startDate = this.getPeriodStart(date, period);
    const endDate = this.getPeriodEnd(date, period);

    const outcomes = await Outcome.find({
      tenantId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const revenueImpact = this.calculateRevenueImpact(outcomes);
    const customerImpact = this.calculateCustomerImpact(outcomes);
    const businessImpact = this.calculateBusinessImpact(outcomes);
    const resolutionMetrics = this.calculateResolutionMetrics(outcomes);

    const metric = new Metric({
      tenantId,
      period,
      date: startDate,
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
        revenueSavedTrend: this.calculateTrend(outcomes, 'revenueImpact.saved'),
        retentionRate: customerImpact.retentionRate,
        upsellConversionRate: businessImpact.upsellConversionRate
      },
      calculatedAt: new Date()
    });

    await metric.save();
    logger.info(`Metrics aggregated for tenant ${tenantId}, period ${period}`);

    return metric;
  }

  /**
   * Get period start date
   */
  private static getPeriodStart(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        d.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        d.setDate(d.getDate() - d.getDay());
        d.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        break;
    }
    return d;
  }

  /**
   * Get period end date
   */
  private static getPeriodEnd(date: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
    const d = new Date(date);
    switch (period) {
      case 'daily':
        d.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        d.setDate(d.getDate() + (6 - d.getDay()));
        d.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        d.setDate(0);
        d.setHours(23, 59, 59, 999);
        break;
    }
    return d;
  }

  /**
   * Calculate trend for a metric
   */
  private static calculateTrend(outcomes: IOutcome[], field: string): number {
    if (outcomes.length < 2) return 0;

    const sorted = [...outcomes].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
    const mid = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const getValue = (outcome: IOutcome, path: string): number => {
      const parts = path.split('.');
      let value: any = outcome;
      for (const part of parts) {
        value = value?.[part];
      }
      return typeof value === 'number' ? value : 0;
    };

    const firstAvg = firstHalf.reduce((sum, o) => sum + getValue(o, field), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, o) => sum + getValue(o, field), 0) / secondHalf.length;

    if (firstAvg === 0) return 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  /**
   * Convert mongoose document to plain object
   */
  private static toOutcomeRecord(outcome: IOutcome): OutcomeRecord {
    return {
      outcomeId: outcome.outcomeId,
      tenantId: outcome.tenantId,
      ticketId: outcome.ticketId,
      interactionId: outcome.interactionId,
      timestamp: outcome.timestamp,
      revenueImpact: outcome.revenueImpact,
      customerImpact: outcome.customerImpact,
      businessImpact: outcome.businessImpact,
      metrics: outcome.metrics,
      metadata: outcome.metadata,
      calculatedAt: outcome.calculatedAt
    };
  }
}
