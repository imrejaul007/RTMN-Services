import { Router, Request, Response } from 'express';
import { Outcome } from '../models/Outcome';
import { Metric } from '../models/Metric';
import { OutcomeCalculator } from '../services/calculator';
import { DashboardData } from '../types';

const router = Router();

/**
 * GET /api/outcomes/dashboard
 * Get dashboard data for a tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { period = '30d' } = req.query;

    // Calculate date range based on period
    const endDate = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        startDate = new Date(new Date().getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all outcomes for the period
    const outcomes = await Outcome.find({
      tenantId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: -1 }).limit(10);

    // Calculate summary metrics
    const revenueImpact = OutcomeCalculator.calculateRevenueImpact(outcomes);
    const customerImpact = OutcomeCalculator.calculateCustomerImpact(outcomes);
    const businessImpact = OutcomeCalculator.calculateBusinessImpact(outcomes);
    const resolutionMetrics = OutcomeCalculator.calculateResolutionMetrics(outcomes);

    // Get previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = new Date(startDate.getTime() - 1);

    const previousOutcomes = await Outcome.find({
      tenantId,
      timestamp: { $gte: previousStartDate, $lte: previousEndDate }
    });

    const previousRevenueImpact = OutcomeCalculator.calculateRevenueImpact(previousOutcomes);
    const previousCustomerImpact = OutcomeCalculator.calculateCustomerImpact(previousOutcomes);

    // Get current period aggregated metrics
    const currentMetrics = await Metric.findOne({
      tenantId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    // Get previous period aggregated metrics
    const previousMetrics = await Metric.findOne({
      tenantId,
      date: { $gte: previousStartDate, $lte: previousEndDate }
    }).sort({ date: -1 });

    const dashboard: DashboardData = {
      tenantId,
      summary: {
        totalRevenueSaved: revenueImpact.totalSaved + revenueImpact.totalProtected,
        totalRevenueProtected: revenueImpact.totalProtected,
        customersRetained: customerImpact.retained,
        churnPrevented: customerImpact.retained,
        upsellsGenerated: businessImpact.upsellsGenerated,
        referralsCreated: businessImpact.referralsCreated,
        risksIdentified: businessImpact.risksIdentified
      },
      performance: {
        avgCsatImprovement: resolutionMetrics.avgCsatImprovement,
        avgResolutionTime: resolutionMetrics.avgResolutionTime,
        totalTicketsProcessed: outcomes.length
      },
      topOutcomes: outcomes.slice(0, 5).map(o => ({
        outcomeId: o.outcomeId,
        tenantId: o.tenantId,
        ticketId: o.ticketId,
        interactionId: o.interactionId,
        timestamp: o.timestamp,
        revenueImpact: o.revenueImpact,
        customerImpact: o.customerImpact,
        businessImpact: o.businessImpact,
        metrics: o.metrics,
        metadata: o.metadata,
        calculatedAt: o.calculatedAt
      })),
      periodOverPeriod: {
        current: currentMetrics ? {
          tenantId,
          period: 'daily',
          startDate,
          endDate,
          totals: currentMetrics.totals,
          averages: currentMetrics.averages,
          trends: currentMetrics.trends
        } : {
          tenantId,
          period: 'daily',
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
            revenueSavedTrend: 0,
            retentionRate: customerImpact.retentionRate,
            upsellConversionRate: businessImpact.upsellConversionRate
          }
        },
        previous: previousMetrics ? {
          tenantId,
          period: 'daily',
          startDate: previousStartDate,
          endDate: previousEndDate,
          totals: previousMetrics.totals,
          averages: previousMetrics.averages,
          trends: previousMetrics.trends
        } : undefined
      }
    };

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

/**
 * GET /api/outcomes/dashboard/summary
 * Get quick summary stats
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const outcomes = await Outcome.find({
      tenantId,
      timestamp: { $gte: startDate, $lte: endDate }
    });

    const revenueImpact = OutcomeCalculator.calculateRevenueImpact(outcomes);
    const customerImpact = OutcomeCalculator.calculateCustomerImpact(outcomes);
    const businessImpact = OutcomeCalculator.calculateBusinessImpact(outcomes);

    res.json({
      success: true,
      data: {
        period: '30d',
        totalOutcomes: outcomes.length,
        totalRevenueSaved: revenueImpact.totalSaved + revenueImpact.totalProtected,
        customersRetained: customerImpact.retained,
        churnPrevented: customerImpact.retained,
        upsellsGenerated: businessImpact.upsellsGenerated,
        referralsCreated: businessImpact.referralsCreated,
        risksIdentified: businessImpact.risksIdentified,
        roiPercentage: revenueImpact.totalCost > 0
          ? ((revenueImpact.totalSaved + revenueImpact.totalProtected - revenueImpact.totalCost) / revenueImpact.totalCost) * 100
          : 0
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

/**
 * GET /api/outcomes/dashboard/top
 * Get top performing outcomes
 */
router.get('/top', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'X-Tenant-ID header is required'
      });
    }

    const { limit = 10, sortBy = 'revenue' } = req.query;

    const outcomes = await Outcome.find({ tenantId })
      .sort({ timestamp: -1 })
      .limit(Number(limit) * 3); // Get more to filter

    // Sort based on criteria
    let sortedOutcomes;
    switch (sortBy) {
      case 'revenue':
        sortedOutcomes = outcomes.sort(
          (a, b) =>
            (b.revenueImpact.saved + b.revenueImpact.protected) -
            (a.revenueImpact.saved + a.revenueImpact.protected)
        );
        break;
      case 'retention':
        sortedOutcomes = outcomes
          .filter(o => o.customerImpact.retained)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        break;
      case 'upsell':
        sortedOutcomes = outcomes
          .filter(o => o.businessImpact.upsell)
          .sort((a, b) =>
            (b.businessImpact.upsellAmount || 0) - (a.businessImpact.upsellAmount || 0)
          );
        break;
      case 'risk':
        sortedOutcomes = outcomes
          .filter(o => o.businessImpact.riskIdentified)
          .sort((a, b) => {
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return (severityOrder[a.businessImpact.riskSeverity || 'low'] || 3) -
              (severityOrder[b.businessImpact.riskSeverity || 'low'] || 3);
          });
        break;
      default:
        sortedOutcomes = outcomes.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );
    }

    res.json({
      success: true,
      data: sortedOutcomes.slice(0, Number(limit)),
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching top outcomes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top outcomes'
    });
  }
});

export default router;
