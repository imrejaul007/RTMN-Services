import { Subscription } from '../models/Subscription';
import { BillingCycle } from '../models/BillingCycle';
import { Usage } from '../models/Usage';
import { Plan } from '../models/Plan';
import { logger } from './logger';

export interface SubscriptionMetrics {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  expired: number;
  trial: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
}

export interface BillingMetrics {
  totalRevenue: number;
  pendingRevenue: number;
  failedRevenue: number;
  refundedRevenue: number;
  averageBillingAmount: number;
  paymentSuccessRate: number;
  collectionRate: number;
}

export interface UsageMetrics {
  totalUsage: number;
  averageUsage: number;
  overLimitCount: number;
  byType: Record<string, { total: number; average: number; subscriptions: number }>;
}

export interface TenantAnalytics {
  tenantId: string;
  subscriptionMetrics: SubscriptionMetrics;
  billingMetrics: BillingMetrics;
  usageMetrics: UsageMetrics;
  topPlans: Array<{ planId: string; name: string; count: number; revenue: number }>;
  generatedAt: Date;
}

export interface PlanConversion {
  fromPlan: string;
  toPlan: string;
  count: number;
  percentage: number;
}

class SubscriptionAnalyticsService {
  /**
   * Get subscription metrics for a tenant
   */
  async getSubscriptionMetrics(tenantId: string): Promise<SubscriptionMetrics> {
    try {
      const subscriptions = await Subscription.find({ tenantId });
      const now = new Date();

      const metrics: SubscriptionMetrics = {
        total: subscriptions.length,
        active: 0,
        paused: 0,
        cancelled: 0,
        expired: 0,
        trial: 0,
        mrr: 0,
        arr: 0,
        churnRate: 0
      };

      for (const sub of subscriptions) {
        switch (sub.status) {
          case 'active':
            metrics.active++;
            metrics.mrr += this.calculateMRR(sub.plan.price, sub.plan.interval);
            break;
          case 'paused':
            metrics.paused++;
            break;
          case 'cancelled':
            metrics.cancelled++;
            break;
          case 'expired':
            metrics.expired++;
            break;
          case 'trial':
            metrics.trial++;
            break;
        }
      }

      metrics.arr = metrics.mrr * 12;

      // Calculate churn rate (cancelled / total in last 30 days)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const recentCancellations = subscriptions.filter(
        sub => sub.status === 'cancelled' && sub.cancelledAt && sub.cancelledAt >= thirtyDaysAgo
      );
      const startOfPeriod = Math.max(subscriptions.length - recentCancellations.length, 1);
      metrics.churnRate = (recentCancellations.length / startOfPeriod) * 100;

      return metrics;
    } catch (error) {
      logger.error('Failed to get subscription metrics', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get billing metrics for a tenant
   */
  async getBillingMetrics(tenantId: string): Promise<BillingMetrics> {
    try {
      const billings = await BillingCycle.find({ tenantId });

      let totalRevenue = 0;
      let pendingRevenue = 0;
      let failedRevenue = 0;
      let refundedRevenue = 0;
      let completedCount = 0;

      for (const billing of billings) {
        switch (billing.status) {
          case 'completed':
            totalRevenue += billing.amount;
            completedCount++;
            break;
          case 'pending':
            pendingRevenue += billing.amount;
            break;
          case 'failed':
            failedRevenue += billing.amount;
            break;
          case 'refunded':
            refundedRevenue += billing.refundAmount || billing.amount;
            break;
        }
      }

      const totalBillingCount = billings.length;

      return {
        totalRevenue,
        pendingRevenue,
        failedRevenue,
        refundedRevenue,
        averageBillingAmount: completedCount > 0 ? totalRevenue / completedCount : 0,
        paymentSuccessRate: totalBillingCount > 0 ? (completedCount / totalBillingCount) * 100 : 0,
        collectionRate: (totalRevenue + pendingRevenue) > 0
          ? (totalRevenue / (totalRevenue + pendingRevenue + failedRevenue)) * 100
          : 0
      };
    } catch (error) {
      logger.error('Failed to get billing metrics', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get usage metrics for a tenant
   */
  async getUsageMetrics(tenantId: string): Promise<UsageMetrics> {
    try {
      const usages = await Usage.find({ tenantId });

      let totalUsage = 0;
      const byType: Record<string, { total: number; average: number; subscriptions: Set<string> }> = {};

      for (const usage of usages) {
        totalUsage += usage.value;

        if (!byType[usage.type]) {
          byType[usage.type] = { total: 0, average: 0, subscriptions: new Set() };
        }
        byType[usage.type].total += usage.value;
        byType[usage.type].subscriptions.add(usage.subscriptionId);
      }

      // Calculate averages and convert Sets to counts
      const resultByType: Record<string, { total: number; average: number; subscriptions: number }> = {};
      for (const [type, data] of Object.entries(byType)) {
        resultByType[type] = {
          total: data.total,
          average: data.subscriptions.size > 0 ? data.total / data.subscriptions.size : 0,
          subscriptions: data.subscriptions.size
        };
      }

      // Count over limit
      const overLimitCount = usages.filter(u => u.value > (u as any).limit).length;

      return {
        totalUsage,
        averageUsage: usages.length > 0 ? totalUsage / usages.length : 0,
        overLimitCount,
        byType: resultByType
      };
    } catch (error) {
      logger.error('Failed to get usage metrics', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get complete analytics for a tenant
   */
  async getTenantAnalytics(tenantId: string): Promise<TenantAnalytics> {
    try {
      const [subscriptionMetrics, billingMetrics, usageMetrics] = await Promise.all([
        this.getSubscriptionMetrics(tenantId),
        this.getBillingMetrics(tenantId),
        this.getUsageMetrics(tenantId)
      ]);

      // Get top plans by revenue
      const plans = await Plan.find({ tenantId, isActive: true });
      const subscriptions = await Subscription.find({ tenantId, status: 'active' });

      const planRevenue: Record<string, number> = {};
      for (const sub of subscriptions) {
        const planName = sub.plan.name;
        if (!planRevenue[planName]) {
          planRevenue[planName] = 0;
        }
        planRevenue[planName] += sub.plan.price;
      }

      const topPlans = Object.entries(planRevenue)
        .map(([name, revenue]) => ({
          planId: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          count: subscriptions.filter(s => s.plan.name === name).length,
          revenue
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      return {
        tenantId,
        subscriptionMetrics,
        billingMetrics,
        usageMetrics,
        topPlans,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get tenant analytics', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get subscription trends over time
   */
  async getSubscriptionTrends(tenantId: string, days: number = 30): Promise<{
    dates: string[];
    active: number[];
    new: number[];
    cancelled: number[];
  }> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const subscriptions = await Subscription.find({
        tenantId,
        createdAt: { $gte: startDate }
      });

      const dateMap: Record<string, { active: Set<string>; new: Set<string>; cancelled: Set<string> }> = {};

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        dateMap[dateStr] = { active: new Set(), new: new Set(), cancelled: new Set() };
      }

      for (const sub of subscriptions) {
        const createdDate = sub.createdAt.toISOString().split('T')[0];
        if (dateMap[createdDate]) {
          dateMap[createdDate].new.add(sub.subscriptionId);
        }
        if (sub.status === 'active' || sub.status === 'trial') {
          dateMap[createdDate].active.add(sub.subscriptionId);
        }
        if (sub.status === 'cancelled' && sub.cancelledAt) {
          const cancelDate = sub.cancelledAt.toISOString().split('T')[0];
          if (dateMap[cancelDate]) {
            dateMap[cancelDate].cancelled.add(sub.subscriptionId);
          }
        }
      }

      const dates = Object.keys(dateMap).sort();
      return {
        dates,
        active: dates.map(d => dateMap[d].active.size),
        new: dates.map(d => dateMap[d].new.size),
        cancelled: dates.map(d => dateMap[d].cancelled.size)
      };
    } catch (error) {
      logger.error('Failed to get subscription trends', { tenantId, error });
      throw error;
    }
  }

  /**
   * Calculate MRR based on price and interval
   */
  private calculateMRR(price: number, interval: string): number {
    switch (interval) {
      case 'day': return price * 30;
      case 'week': return price * 4.33;
      case 'month': return price;
      case 'year': return price / 12;
      default: return price;
    }
  }

  /**
   * Get plan distribution
   */
  async getPlanDistribution(tenantId: string): Promise<Array<{
    planName: string;
    count: number;
    percentage: number;
    revenue: number;
  }>> {
    try {
      const subscriptions = await Subscription.find({
        tenantId,
        status: { $in: ['active', 'trial'] }
      });

      const planCounts: Record<string, { count: number; revenue: number }> = {};

      for (const sub of subscriptions) {
        const planName = sub.plan.name;
        if (!planCounts[planName]) {
          planCounts[planName] = { count: 0, revenue: 0 };
        }
        planCounts[planName].count++;
        planCounts[planName].revenue += sub.plan.price;
      }

      const totalSubscriptions = subscriptions.length;

      return Object.entries(planCounts)
        .map(([planName, data]) => ({
          planName,
          count: data.count,
          percentage: totalSubscriptions > 0 ? (data.count / totalSubscriptions) * 100 : 0,
          revenue: data.revenue
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Failed to get plan distribution', { tenantId, error });
      throw error;
    }
  }

  /**
   * Get customer lifetime value
   */
  async getCustomerLifetimeValue(customerId: string): Promise<{
    totalRevenue: number;
    subscriptionDuration: number;
    averageMonthlyValue: number;
    predictedLTV: number;
  }> {
    try {
      const subscriptions = await Subscription.find({ customerId });
      const billings = await BillingCycle.find({ customerId, status: 'completed' });

      let totalRevenue = 0;
      for (const billing of billings) {
        totalRevenue += billing.amount;
      }

      let minDate = new Date();
      let maxDate = new Date(0);

      for (const sub of subscriptions) {
        if (sub.startDate < minDate) minDate = sub.startDate;
        if (sub.endDate && sub.endDate > maxDate) maxDate = sub.endDate;
        if (sub.status !== 'cancelled' && sub.status !== 'expired') {
          maxDate = new Date(); // Active subscription
        }
      }

      const durationDays = (maxDate.getTime() - minDate.getTime()) / (24 * 60 * 60 * 1000);
      const durationMonths = durationDays / 30;
      const averageMonthlyValue = durationMonths > 0 ? totalRevenue / durationMonths : 0;

      // Simple LTV prediction: average monthly value * 24 months (industry standard)
      const predictedLTV = averageMonthlyValue * 24;

      return {
        totalRevenue,
        subscriptionDuration: Math.round(durationDays),
        averageMonthlyValue,
        predictedLTV
      };
    } catch (error) {
      logger.error('Failed to get customer LTV', { customerId, error });
      throw error;
    }
  }
}

export const subscriptionAnalytics = new SubscriptionAnalyticsService();
