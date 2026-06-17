import { refundStore, RefundRequest, RefundStatus, RefundChannel } from '../models/Refund';
import { logger } from '../utils/logger';

interface DashboardSummary {
  totalRefunds: number;
  pendingRefunds: number;
  completedRefunds: number;
  failedRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  autoApproveRate: number;
  averageProcessingTime: number;
  topChannels: Array<{ channel: RefundChannel; count: number }>;
  recentRefunds: RefundRequest[];
}

interface TrendData {
  date: string;
  count: number;
  amount: number;
}

interface CustomerSummary {
  totalRefunds: number;
  totalAmount: number;
  refundRate: number;
  averageAmount: number;
  lastRefundDate: string | null;
}

interface RiskIndicator {
  metric: string;
  value: number;
  threshold: number;
  status: 'normal' | 'warning' | 'critical';
}

export class Analytics {
  private cache: Map<string, { data: unknown; expiry: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): DashboardSummary {
    const cached = this.getCached('dashboard_summary');
    if (cached) return cached as DashboardSummary;

    const allRefunds = refundStore.findAll();
    const stats = refundStore.getStats();

    // Calculate metrics
    const completedRefunds = allRefunds.filter(r => r.status === 'completed');
    const totalRefundAmount = completedRefunds.reduce((sum, r) => sum + r.refundAmount, 0);
    const averageRefundAmount = completedRefunds.length > 0
      ? totalRefundAmount / completedRefunds.length
      : 0;

    const autoApprovedCount = allRefunds.filter(r => r.autoApproved).length;
    const autoApproveRate = allRefunds.length > 0
      ? (autoApprovedCount / allRefunds.length) * 100
      : 0;

    // Average processing time (for completed refunds)
    const processingTimes = completedRefunds
      .filter(r => r.processedAt && r.completedAt)
      .map(r => new Date(r.completedAt!).getTime() - new Date(r.processedAt!).getTime());

    const averageProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    // Top channels
    const channelCounts: Record<string, number> = {};
    allRefunds.forEach(r => {
      channelCounts[r.channel] = (channelCounts[r.channel] || 0) + 1;
    });

    const topChannels = Object.entries(channelCounts)
      .map(([channel, count]) => ({ channel: channel as RefundChannel, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Recent refunds
    const recentRefunds = allRefunds
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const summary: DashboardSummary = {
      totalRefunds: stats.total,
      pendingRefunds: stats.byStatus.pending,
      completedRefunds: stats.byStatus.completed,
      failedRefunds: stats.byStatus.failed,
      totalRefundAmount,
      averageRefundAmount,
      autoApproveRate,
      averageProcessingTime,
      topChannels,
      recentRefunds
    };

    this.setCached('dashboard_summary', summary);
    return summary;
  }

  /**
   * Get refund trends over time
   */
  getRefundTrends(period: string, groupBy: string): TrendData[] {
    const cacheKey = `trends_${period}_${groupBy}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached as TrendData[];

    const allRefunds = refundStore.findAll();
    const now = new Date();

    let startDate: Date;
    let intervalMs: number;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalMs = 24 * 60 * 60 * 1000;
    }

    const trends: TrendData[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= now) {
      const nextDate = new Date(currentDate.getTime() + intervalMs);

      const periodRefunds = allRefunds.filter(r => {
        const created = new Date(r.createdAt);
        return created >= currentDate && created < nextDate;
      });

      trends.push({
        date: currentDate.toISOString(),
        count: periodRefunds.length,
        amount: periodRefunds.reduce((sum, r) => sum + r.refundAmount, 0)
      });

      currentDate = nextDate;
    }

    this.setCached(cacheKey, trends);
    return trends;
  }

  /**
   * Get top refund reasons
   */
  getTopRefundReasons(): Array<{ reason: string; count: number; amount: number }> {
    const allRefunds = refundStore.findAll();
    const reasonStats: Record<string, { count: number; amount: number }> = {};

    allRefunds.forEach(r => {
      if (!reasonStats[r.reason]) {
        reasonStats[r.reason] = { count: 0, amount: 0 };
      }
      reasonStats[r.reason].count++;
      reasonStats[r.reason].amount += r.refundAmount;
    });

    return Object.entries(reasonStats)
      .map(([reason, stats]) => ({ reason, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Get customer refund summary
   */
  getCustomerRefundSummary(customerId: string): CustomerSummary {
    const refunds = refundStore.findAll({ customerId });

    if (refunds.length === 0) {
      return {
        totalRefunds: 0,
        totalAmount: 0,
        refundRate: 0,
        averageAmount: 0,
        lastRefundDate: null
      };
    }

    const completedRefunds = refunds.filter(r => r.status === 'completed');
    const totalAmount = completedRefunds.reduce((sum, r) => sum + r.refundAmount, 0);

    return {
      totalRefunds: refunds.length,
      totalAmount,
      refundRate: refunds.length / 30, // Simplified rate
      averageAmount: completedRefunds.length > 0
        ? totalAmount / completedRefunds.length
        : 0,
      lastRefundDate: refunds[0]?.createdAt?.toISOString() || null
    };
  }

  /**
   * Get risk indicators
   */
  getRiskIndicators(): RiskIndicator[] {
    const allRefunds = refundStore.findAll();
    const indicators: RiskIndicator[] = [];

    // High refund rate customers
    const customerCounts: Record<string, number> = {};
    allRefunds.forEach(r => {
      customerCounts[r.customerId] = (customerCounts[r.customerId] || 0) + 1;
    });

    const highRefundCustomers = Object.values(customerCounts).filter(c => c > 5).length;
    indicators.push({
      metric: 'High Refund Rate Customers',
      value: highRefundCustomers,
      threshold: 10,
      status: highRefundCustomers > 10 ? 'critical' : highRefundCustomers > 5 ? 'warning' : 'normal'
    });

    // Failed refund rate
    const failedCount = allRefunds.filter(r => r.status === 'failed').length;
    const failedRate = allRefunds.length > 0 ? (failedCount / allRefunds.length) * 100 : 0;
    indicators.push({
      metric: 'Failed Refund Rate',
      value: failedRate,
      threshold: 5,
      status: failedRate > 10 ? 'critical' : failedRate > 5 ? 'warning' : 'normal'
    });

    // Large refund concentration
    const largeRefunds = allRefunds.filter(r => r.refundAmount > 1000).length;
    const largeRefundRatio = allRefunds.length > 0 ? (largeRefunds / allRefunds.length) * 100 : 0;
    indicators.push({
      metric: 'Large Refund Concentration',
      value: largeRefundRatio,
      threshold: 20,
      status: largeRefundRatio > 30 ? 'critical' : largeRefundRatio > 20 ? 'warning' : 'normal'
    });

    // Suspicious timing (refunds within 24 hours of purchase)
    const suspiciousRefunds = allRefunds.filter(r => {
      const hoursSincePurchase = (Date.now() - new Date(r.createdAt).getTime()) / (1000 * 60 * 60);
      return hoursSincePurchase < 24 && r.refundAmount > 500;
    }).length;

    indicators.push({
      metric: 'Same-Day Large Refunds',
      value: suspiciousRefunds,
      threshold: 5,
      status: suspiciousRefunds > 10 ? 'critical' : suspiciousRefunds > 5 ? 'warning' : 'normal'
    });

    return indicators;
  }

  /**
   * Get channel-specific metrics
   */
  getChannelMetrics(): Record<RefundChannel, {
    count: number;
    totalAmount: number;
    averageAmount: number;
    autoApproveRate: number;
    failureRate: number;
  }> {
    const allRefunds = refundStore.findAll();
    const channels: RefundChannel[] = ['order', 'payment', 'subscription', 'wallet', 'loyalty'];

    const metrics: Record<string, {
      count: number;
      totalAmount: number;
      autoApproved: number;
      failed: number;
    }> = {};

    channels.forEach(ch => {
      metrics[ch] = { count: 0, totalAmount: 0, autoApproved: 0, failed: 0 };
    });

    allRefunds.forEach(r => {
      if (metrics[r.channel]) {
        metrics[r.channel].count++;
        metrics[r.channel].totalAmount += r.refundAmount;
        if (r.autoApproved) metrics[r.channel].autoApproved++;
        if (r.status === 'failed') metrics[r.channel].failed++;
      }
    });

    const result: Record<string, {
      count: number;
      totalAmount: number;
      averageAmount: number;
      autoApproveRate: number;
      failureRate: number;
    }> = {};

    Object.entries(metrics).forEach(([channel, data]) => {
      result[channel] = {
        count: data.count,
        totalAmount: data.totalAmount,
        averageAmount: data.count > 0 ? data.totalAmount / data.count : 0,
        autoApproveRate: data.count > 0 ? (data.autoApproved / data.count) * 100 : 0,
        failureRate: data.count > 0 ? (data.failed / data.count) * 100 : 0
      };
    });

    return result as Record<RefundChannel, {
      count: number;
      totalAmount: number;
      averageAmount: number;
      autoApproveRate: number;
      failureRate: number;
    }>;
  }

  // Cache helpers
  private getCached(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  private setCached(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.CACHE_TTL
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const analytics = new Analytics();
