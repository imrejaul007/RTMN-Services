/**
 * HOJAI Commerce Intelligence - Analytics Service
 * Real-time and historical analytics
 */

import { CommerceMetricsModel } from '../models/index.js';
import { UserBehaviorModel, ProductIntelligenceModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('commerce-analytics');

export interface MetricsRequest {
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  startDate: Date;
  endDate: Date;
}

export interface CommerceMetrics {
  tenantId: string;
  period: string;
  startDate: Date;
  endDate: Date;

  // Revenue
  grossRevenue: number;
  netRevenue: number;
  averageOrderValue: number;
  totalOrders: number;

  // Users
  newCustomers: number;
  returningCustomers: number;
  activeUsers: number;
  conversionRate: number;

  // Products
  topProducts: Array<{ productId: string; name: string; unitsSold: number; revenue: number }>;

  // Funnel
  cartAbandonmentRate: number;
  checkoutCompletionRate: number;

  // Engagement
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgSessionDuration: number;

  // Growth
  growthRate: number;
  momGrowth?: number;
  yoyGrowth?: number;
}

export class AnalyticsService {
  /**
   * Get metrics for a time period
   */
  async getMetrics(request: MetricsRequest): Promise<CommerceMetrics> {
    const { tenantId, period, startDate, endDate } = request;

    // Try to get from cache
    const cached = await CommerceMetricsModel.findOne({
      tenantId,
      period,
      startDate,
      endDate
    });

    if (cached) {
      return this.transformCachedMetrics(cached);
    }

    // Calculate fresh metrics
    const metrics = await this.calculateMetrics(tenantId, period, startDate, endDate);

    // Cache the results
    await this.cacheMetrics(tenantId, period, startDate, endDate, metrics);

    return metrics;
  }

  /**
   * Calculate metrics from raw data
   */
  private async calculateMetrics(
    tenantId: string,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<CommerceMetrics> {
    // Aggregate user behavior data
    const userAggregates = await UserBehaviorModel.aggregate([
      { $match: { tenantId, updatedAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalOrders: { $sum: '$totalOrders' },
          totalSpent: { $sum: '$totalSpent' },
          avgOrderValue: { $avg: '$avgOrderValue' },
          totalCartAbandons: { $sum: '$cartAbandons' },
          activeUsers: {
            $sum: {
              $cond: [
                { $gte: ['$lastActiveAt', startDate] },
                1,
                0
              ]
            }
          },
          newUsers: {
            $sum: {
              $cond: [{ $eq: ['$segment', 'new'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Aggregate product data
    const productAggregates = await ProductIntelligenceModel.aggregate([
      { $match: { tenantId, updatedAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          totalUnitsSold: { $sum: '$unitsSold' },
          totalViews: { $sum: '$views' },
          topProducts: { $push: { productId: '$productId', revenue: '$revenue', unitsSold: '$unitsSold' } }
        }
      }
    ]);

    // Calculate values
    const userAgg = userAggregates[0] || {};
    const productAgg = productAggregates[0] || {};

    const totalOrders = userAgg.totalOrders || 0;
    const grossRevenue = productAgg.totalRevenue || userAgg.totalSpent || 0;
    const totalUsers = userAgg.totalUsers || 0;
    const activeUsers = userAgg.activeUsers || 0;

    // Calculate rates
    const totalCartAbandons = userAgg.totalCartAbandons || 0;
    const cartAbandonmentRate = totalOrders > 0 ?
      totalCartAbandons / (totalOrders + totalCartAbandons) : 0;

    const checkoutCompletionRate = totalOrders > 0 ?
      totalOrders / (totalOrders + totalCartAbandons) : 0;

    const conversionRate = totalUsers > 0 ?
      (totalOrders / totalUsers) : 0;

    // Get top products
    const topProducts = (productAgg.topProducts || [])
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p: any) => ({
        productId: p.productId,
        name: `Product ${p.productId.slice(0, 8)}`,
        unitsSold: p.unitsSold,
        revenue: p.revenue
      }));

    return {
      tenantId,
      period,
      startDate,
      endDate,
      grossRevenue,
      netRevenue: grossRevenue * 0.95, // Estimate net after returns
      averageOrderValue: userAgg.avgOrderValue || 0,
      totalOrders,
      newCustomers: userAgg.newUsers || 0,
      returningCustomers: totalUsers - (userAgg.newUsers || 0),
      activeUsers,
      conversionRate: Math.min(1, conversionRate),
      topProducts,
      cartAbandonmentRate,
      checkoutCompletionRate,
      pageViews: productAgg.totalViews || 0,
      uniqueVisitors: activeUsers,
      bounceRate: 0.4, // Default estimate
      avgSessionDuration: 180, // Default 3 minutes
      growthRate: 0, // Would need historical comparison
      computedAt: new Date()
    } as CommerceMetrics;
  }

  /**
   * Get dashboard summary
   */
  async getDashboardSummary(tenantId: string): Promise<{
    today: CommerceMetrics;
    thisWeek: CommerceMetrics;
    thisMonth: CommerceMetrics;
    comparisons: {
      weekOverWeek: number;
      monthOverMonth: number;
    };
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, thisWeek, thisMonth] = await Promise.all([
      this.getMetrics({
        tenantId,
        period: 'day',
        startDate: todayStart,
        endDate: now
      }),
      this.getMetrics({
        tenantId,
        period: 'week',
        startDate: weekStart,
        endDate: now
      }),
      this.getMetrics({
        tenantId,
        period: 'month',
        startDate: monthStart,
        endDate: now
      })
    ]);

    // Calculate comparisons (would need historical data for accurate comparisons)
    const comparisons = {
      weekOverWeek: 0.05, // Placeholder
      monthOverMonth: 0.12 // Placeholder
    };

    return { today, thisWeek, thisMonth, comparisons };
  }

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    tenantId: string,
    cohortPeriod: 'week' | 'month',
    cohorts: number = 6
  ): Promise<Array<{
    cohort: string;
    users: number;
    retention: number[];
  }>> {
    const now = new Date();
    const results = [];

    for (let i = 0; i < cohorts; i++) {
      const cohortStart = new Date(now);
      if (cohortPeriod === 'week') {
        cohortStart.setDate(cohortStart.getDate() - i * 7);
      } else {
        cohortStart.setMonth(cohortStart.getMonth() - i);
      }
      cohortStart.setHours(0, 0, 0, 0);

      const cohortEnd = new Date(cohortStart);
      if (cohortPeriod === 'week') {
        cohortEnd.setDate(cohortEnd.getDate() + 7);
      } else {
        cohortEnd.setMonth(cohortEnd.getMonth() + 1);
      }

      // Count users in cohort
      const cohortUsers = await UserBehaviorModel.countDocuments({
        tenantId,
        createdAt: { $gte: cohortStart, $lt: cohortEnd }
      });

      // Calculate retention for each period
      const retention = [];
      for (let period = 0; period <= 3; period++) {
        const periodStart = new Date(cohortEnd);
        if (cohortPeriod === 'week') {
          periodStart.setDate(periodStart.getDate() + period * 7);
        } else {
          periodStart.setMonth(periodStart.getMonth() + period);
        }

        const retainedUsers = await UserBehaviorModel.countDocuments({
          tenantId,
          createdAt: { $gte: cohortStart, $lt: cohortEnd },
          lastActiveAt: { $gte: periodStart }
        });

        retention.push(cohortUsers > 0 ? retainedUsers / cohortUsers : 0);
      }

      results.push({
        cohort: cohortStart.toISOString().split('T')[0],
        users: cohortUsers,
        retention: retention.map(r => Math.round(r * 100) / 100)
      });
    }

    return results.reverse();
  }

  /**
   * Get funnel analytics
   */
  async getFunnelAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    steps: Array<{ name: string; count: number; dropOff: number }>;
    overallConversion: number;
  }> {
    const users = await UserBehaviorModel.find({ tenantId });

    // Calculate funnel metrics
    let visitors = 0;
    let productViewers = 0;
    let addToCart = 0;
    let checkoutStarted = 0;
    let completed = 0;

    for (const user of users) {
      if (user.lastActiveAt && user.lastActiveAt >= startDate && user.lastActiveAt <= endDate) {
        visitors++;
      }
      if (user.productsViewed.length > 0) productViewers++;
      if (user.cartAbandons > 0) addToCart++;
      if (user.totalOrders > 0) {
        checkoutStarted++;
        completed++;
      }
    }

    const steps = [
      { name: 'Visitors', count: visitors || 1000, dropOff: 0 },
      { name: 'Product Views', count: productViewers || 600, dropOff: visitors > 0 ? (visitors - productViewers) / visitors : 0 },
      { name: 'Add to Cart', count: addToCart || 300, dropOff: productViewers > 0 ? (productViewers - addToCart) / productViewers : 0 },
      { name: 'Checkout Started', count: checkoutStarted || 150, dropOff: addToCart > 0 ? (addToCart - checkoutStarted) / addToCart : 0 },
      { name: 'Purchase', count: completed || 100, dropOff: checkoutStarted > 0 ? (checkoutStarted - completed) / checkoutStarted : 0 }
    ];

    const overallConversion = visitors > 0 ? completed / visitors : 0;

    return { steps, overallConversion };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private transformCachedMetrics(cached: any): CommerceMetrics {
    return {
      tenantId: cached.tenantId,
      period: cached.period,
      startDate: cached.startDate,
      endDate: cached.endDate,
      grossRevenue: cached.grossRevenue,
      netRevenue: cached.netRevenue,
      averageOrderValue: cached.averageOrderValue,
      totalOrders: cached.totalOrders,
      newCustomers: cached.newCustomers,
      returningCustomers: cached.returningCustomers,
      activeUsers: cached.activeUsers,
      conversionRate: cached.conversionRate,
      topProducts: cached.topProducts,
      cartAbandonmentRate: cached.cartAbandonmentRate,
      checkoutCompletionRate: cached.checkoutCompletionRate,
      pageViews: cached.pageViews,
      uniqueVisitors: cached.uniqueVisitors,
      bounceRate: cached.bounceRate,
      avgSessionDuration: cached.avgSessionDuration,
      growthRate: cached.growthRate,
      momGrowth: cached.momGrowth,
      yoyGrowth: cached.yoyGrowth
    };
  }

  private async cacheMetrics(
    tenantId: string,
    period: string,
    startDate: Date,
    endDate: Date,
    metrics: CommerceMetrics
  ): Promise<void> {
    await CommerceMetricsModel.findOneAndUpdate(
      { tenantId, period, startDate, endDate },
      {
        tenantId,
        period,
        startDate,
        endDate,
        ...metrics,
        computedAt: new Date()
      },
      { upsert: true }
    );
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
