/**
 * HOJAI Merchant Intelligence - Dashboard Service
 */

import { BusinessMetricsModel, MerchantProfileModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('merchant-dashboard');

export interface DashboardSummary {
  merchantId: string;
  overview: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalCustomers: number;
  };
  today: {
    revenue: number;
    orders: number;
    customers: number;
  };
  thisWeek: {
    revenue: number;
    orders: number;
    customers: number;
    growth: number;
  };
  thisMonth: {
    revenue: number;
    orders: number;
    customers: number;
    growth: number;
  };
  alerts: {
    critical: number;
    warnings: number;
    info: number;
  };
  performance: {
    score: number;
    grade: string;
    trend: string;
  };
}

export class DashboardService {
  /**
   * Get merchant dashboard summary
   */
  async getDashboard(tenantId: string, merchantId: string): Promise<DashboardSummary> {
    // Get merchant profile
    const merchant = await MerchantProfileModel.findOne({ tenantId, merchantId });

    // Get time ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get metrics for different periods
    const [todayMetrics, weekMetrics, monthMetrics] = await Promise.all([
      this.getMetrics(tenantId, merchantId, 'day', todayStart, now),
      this.getMetrics(tenantId, merchantId, 'week', weekStart, now),
      this.getMetrics(tenantId, merchantId, 'month', monthStart, now)
    ]);

    // Get alert counts
    const alertCounts = await this.getAlertCounts(tenantId, merchantId);

    // Calculate performance score (simplified)
    const performance = this.calculatePerformanceScore(monthMetrics);

    return {
      merchantId,
      overview: {
        totalRevenue: merchant?.metrics.totalRevenue || monthMetrics.grossRevenue,
        totalOrders: merchant?.metrics.totalOrders || monthMetrics.totalOrders,
        avgOrderValue: merchant?.metrics.avgOrderValue || monthMetrics.averageOrderValue,
        totalCustomers: merchant?.metrics.totalCustomers || monthMetrics.totalCustomers
      },
      today: {
        revenue: todayMetrics.grossRevenue,
        orders: todayMetrics.totalOrders,
        customers: todayMetrics.newCustomers + todayMetrics.returningCustomers
      },
      thisWeek: {
        revenue: weekMetrics.grossRevenue,
        orders: weekMetrics.totalOrders,
        customers: weekMetrics.newCustomers + weekMetrics.returningCustomers,
        growth: weekMetrics.wowGrowth || 0
      },
      thisMonth: {
        revenue: monthMetrics.grossRevenue,
        orders: monthMetrics.totalOrders,
        customers: monthMetrics.newCustomers + monthMetrics.returningCustomers,
        growth: monthMetrics.momGrowth || 0
      },
      alerts: alertCounts,
      performance
    };
  }

  /**
   * Get metrics for a specific period
   */
  private async getMetrics(
    tenantId: string,
    merchantId: string,
    period: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    // Try to get from cached metrics
    const cached = await BusinessMetricsModel.findOne({
      tenantId,
      merchantId,
      period,
      startDate,
      endDate
    });

    if (cached) {
      return cached;
    }

    // Return default metrics
    return {
      grossRevenue: 0,
      netRevenue: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      newCustomers: 0,
      returningCustomers: 0,
      totalCustomers: 0,
      momGrowth: 0,
      wowGrowth: 0,
      conversionRate: 0
    };
  }

  /**
   * Get alert counts
   */
  private async getAlertCounts(tenantId: string, merchantId: string): Promise<{
    critical: number;
    warnings: number;
    info: number;
  }> {
    const { MerchantAlertModel } = await import('../models/index.js');

    const [critical, warnings, info] = await Promise.all([
      MerchantAlertModel.countDocuments({
        tenantId,
        merchantId,
        severity: 'critical',
        isActioned: false
      }),
      MerchantAlertModel.countDocuments({
        tenantId,
        merchantId,
        severity: 'warning',
        isActioned: false
      }),
      MerchantAlertModel.countDocuments({
        tenantId,
        merchantId,
        severity: 'info',
        isActioned: false
      })
    ]);

    return { critical, warnings, info };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: any): {
    score: number;
    grade: string;
    trend: string;
  } {
    // Simplified scoring based on metrics
    let score = 50;

    // Revenue factor
    if (metrics.grossRevenue > 100000) score += 15;
    else if (metrics.grossRevenue > 50000) score += 10;
    else if (metrics.grossRevenue > 10000) score += 5;

    // Growth factor
    if (metrics.momGrowth > 0.2) score += 15;
    else if (metrics.momGrowth > 0.1) score += 10;
    else if (metrics.momGrowth > 0) score += 5;

    // Order factor
    if (metrics.totalOrders > 1000) score += 10;
    else if (metrics.totalOrders > 500) score += 7;
    else if (metrics.totalOrders > 100) score += 5;

    // Retention factor
    if (metrics.customerRetentionRate > 0.8) score += 10;
    else if (metrics.customerRetentionRate > 0.5) score += 5;

    // Cap at 100
    score = Math.min(100, score);

    // Determine grade
    let grade: string;
    if (score >= 90) grade = 'A+';
    else if (score >= 80) grade = 'A';
    else if (score >= 70) grade = 'B+';
    else if (score >= 60) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 30) grade = 'D';
    else grade = 'F';

    // Determine trend (would need historical data for accuracy)
    const trend = score >= 70 ? 'improving' : score >= 50 ? 'stable' : 'declining';

    return { score, grade, trend };
  }

  /**
   * Get KPI trends
   */
  async getKPITrends(
    tenantId: string,
    merchantId: string,
    kpis: string[],
    days: number = 30
  ): Promise<Record<string, Array<{ date: string; value: number }>>> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const trends: Record<string, Array<{ date: string; value: number }>> = {};

    for (const kpi of kpis) {
      trends[kpi] = [];

      // Generate daily data points
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(d);
        dayEnd.setHours(23, 59, 59, 999);

        const metrics = await this.getMetrics(tenantId, merchantId, 'day', dayStart, dayEnd);

        let value = 0;
        switch (kpi) {
          case 'revenue':
            value = metrics.grossRevenue;
            break;
          case 'orders':
            value = metrics.totalOrders;
            break;
          case 'customers':
            value = metrics.newCustomers + metrics.returningCustomers;
            break;
          case 'aov':
            value = metrics.averageOrderValue;
            break;
          case 'conversion':
            value = metrics.conversionRate * 100;
            break;
        }

        trends[kpi].push({
          date: dayStart.toISOString().split('T')[0],
          value
        });
      }
    }

    return trends;
  }

  /**
   * Get merchant comparison
   */
  async compareMerchants(
    tenantId: string,
    merchantId: string,
    competitorIds: string[]
  ): Promise<Array<{
    merchantId: string;
    name: string;
    revenue: number;
    orders: number;
    customers: number;
    score: number;
  }>> {
    const merchants = await MerchantProfileModel.find({
      tenantId,
      merchantId: { $in: [merchantId, ...competitorIds] }
    });

    const results = [];

    for (const merchant of merchants) {
      const metrics = await this.getMetrics(
        tenantId,
        merchant.merchantId,
        'month',
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date()
      );

      results.push({
        merchantId: merchant.merchantId,
        name: merchant.name,
        revenue: metrics.grossRevenue,
        orders: metrics.totalOrders,
        customers: metrics.totalCustomers,
        score: merchant.metrics.avgRating
      });
    }

    // Sort by revenue
    return results.sort((a, b) => b.revenue - a.revenue);
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
