// ============================================================================
// SUTAR Marketplace - Analytics Service
// ============================================================================

import { storage, COLLECTIONS } from './storage';
import { serviceCatalog } from './serviceCatalog';
import { categoryService } from './categoryService';
import { orderService } from './orderService';
import { paymentService } from './paymentService';
import { subscriptionService } from './subscriptionService';
import { favoritesService } from './favoritesService';
import {
  MarketplaceAnalytics,
  CategoryAnalytics,
  ServiceAnalytics,
  RevenueByDay,
  OrdersByDay,
  SubscriptionsByPlan,
  ActivityItem,
  GrowthMetrics,
  Order,
  Payment,
  Subscription,
} from './types';

export interface AnalyticsParams {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}

export class AnalyticsService {
  private readonly CACHE_TTL = 60000; // 1 minute cache

  // Get full marketplace analytics
  public getMarketplaceAnalytics(params: AnalyticsParams = {}): MarketplaceAnalytics {
    const { startDate, endDate } = params;

    const services = storage.getAll<any>(COLLECTIONS.SERVICES);
    const activeServices = services.filter(s => s.status === 'active');

    const orders = this.filterByDateRange(
      storage.getAll<Order>(COLLECTIONS.ORDERS),
      startDate,
      endDate
    );

    const payments = this.filterByDateRange(
      storage.getAll<Payment>(COLLECTIONS.PAYMENTS),
      startDate,
      endDate
    );

    const subscriptions = this.filterByDateRange(
      storage.getAll<Subscription>(COLLECTIONS.SUBSCRIPTIONS),
      startDate,
      endDate
    );

    // Calculate metrics
    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const avgRating = activeServices.length > 0
      ? activeServices.reduce((sum, s) => sum + s.rating, 0) / activeServices.length
      : 0;

    const uniqueUsers = new Set([
      ...orders.map(o => o.userId),
      ...subscriptions.map(s => s.userId),
    ]).size;

    // Get top categories
    const topCategories = this.getCategoryAnalytics(activeServices, orders, 10);

    // Get top services
    const topServices = this.getServiceAnalytics(activeServices, orders, 10);

    // Get revenue by day
    const revenueByDay = this.getRevenueByDay(orders, startDate, endDate);

    // Get orders by day
    const ordersByDay = this.getOrdersByDay(orders, startDate, endDate);

    // Get subscriptions by plan
    const subscriptionsByPlan = this.getSubscriptionsByPlan(subscriptions);

    // Get recent activity
    const recentActivity = this.getRecentActivity(orders, payments, subscriptions);

    // Calculate growth metrics
    const growth = this.calculateGrowthMetrics(startDate, endDate);

    return {
      totalServices: services.length,
      activeServices: activeServices.length,
      totalRevenue,
      totalOrders: orders.length,
      totalUsers: uniqueUsers,
      averageRating: Math.round(avgRating * 10) / 10,
      topCategories,
      topServices,
      revenueByDay,
      ordersByDay,
      subscriptionsByPlan,
      recentActivity,
      growth,
    };
  }

  // Get revenue analytics
  public getRevenueAnalytics(params: AnalyticsParams = {}): {
    totalRevenue: number;
    revenueByDay: RevenueByDay[];
    revenueByCategory: Record<string, number>;
    averageOrderValue: number;
    revenueGrowth: number;
    projectedMonthlyRevenue: number;
  } {
    const orders = this.filterByDateRange(
      storage.getAll<Order>(COLLECTIONS.ORDERS),
      params.startDate,
      params.endDate
    ).filter(o => o.status === 'completed');

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const revenueByDay = this.getRevenueByDay(orders, params.startDate, params.endDate);

    // Revenue by category
    const revenueByCategory: Record<string, number> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        const service = serviceCatalog.getService(item.serviceId);
        const category = service?.category || 'Unknown';
        revenueByCategory[category] = (revenueByCategory[category] || 0) + item.totalPrice;
      });
    });

    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate growth
    const growth = this.calculateRevenueGrowth(params.startDate, params.endDate);

    // Project monthly revenue (simple linear projection)
    const daysInPeriod = this.getDaysInPeriod(params.startDate, params.endDate);
    const projectedMonthlyRevenue = daysInPeriod > 0
      ? (totalRevenue / daysInPeriod) * 30
      : 0;

    return {
      totalRevenue,
      revenueByDay,
      revenueByCategory,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      revenueGrowth: growth,
      projectedMonthlyRevenue: Math.round(projectedMonthlyRevenue * 100) / 100,
    };
  }

  // Get order analytics
  public getOrderAnalytics(params: AnalyticsParams = {}): {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    refundRate: number;
    ordersByDay: OrdersByDay[];
    averageOrderValue: number;
    topServices: { serviceId: string; serviceName: string; orderCount: number }[];
  } {
    const orders = this.filterByDateRange(
      storage.getAll<Order>(COLLECTIONS.ORDERS),
      params.startDate,
      params.endDate
    );

    const completedOrders = orders.filter(o => o.status === 'completed');
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');

    const refundedOrders = orders.filter(o =>
      o.paymentStatus === 'refunded' || o.paymentStatus === 'partially_refunded'
    );

    const ordersByDay = this.getOrdersByDay(orders, params.startDate, params.endDate);

    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

    // Top services by order count
    const serviceCounts = new Map<string, { name: string; count: number }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = serviceCounts.get(item.serviceId) || { name: item.serviceName, count: 0 };
        serviceCounts.set(item.serviceId, { name: item.serviceName, count: existing.count + 1 });
      });
    });

    const topServices = Array.from(serviceCounts.entries())
      .map(([serviceId, data]) => ({
        serviceId,
        serviceName: data.name,
        orderCount: data.count,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    return {
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      refundRate: orders.length > 0 ? (refundedOrders.length / orders.length) * 100 : 0,
      ordersByDay,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      topServices,
    };
  }

  // Get user analytics
  public getUserAnalytics(params: AnalyticsParams = {}): {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    userOrders: { userId: string; orderCount: number; totalSpent: number }[];
    topCategories: { category: string; count: number }[];
    retentionRate: number;
  } {
    const orders = this.filterByDateRange(
      storage.getAll<Order>(COLLECTIONS.ORDERS),
      params.startDate,
      params.endDate
    ).filter(o => o.status === 'completed');

    const subscriptions = this.filterByDateRange(
      storage.getAll<Subscription>(COLLECTIONS.SUBSCRIPTIONS),
      params.startDate,
      params.endDate
    );

    const allUsers = new Set([
      ...orders.map(o => o.userId),
      ...subscriptions.map(s => s.userId),
    ]);

    // New users (first order in period)
    const newUsers = new Set<string>();
    orders.forEach(order => {
      const userOrders = storage.find<Order>(
        COLLECTIONS.ORDERS,
        o => o.userId === order.userId && o.status === 'completed'
      );
      if (userOrders.length > 0) {
        const firstOrder = userOrders.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )[0];
        if (firstOrder.id === order.id) {
          newUsers.add(order.userId);
        }
      }
    });

    // User spending stats
    const userStats = new Map<string, { orderCount: number; totalSpent: number }>();
    orders.forEach(order => {
      const existing = userStats.get(order.userId) || { orderCount: 0, totalSpent: 0 };
      userStats.set(order.userId, {
        orderCount: existing.orderCount + 1,
        totalSpent: existing.totalSpent + order.total,
      });
    });

    const userOrders = Array.from(userStats.entries())
      .map(([userId, stats]) => ({ userId, ...stats }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);

    // Top categories
    const categoryCounts = new Map<string, number>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const service = serviceCatalog.getService(item.serviceId);
        const category = service?.category || 'Unknown';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
    });

    const topCategories = Array.from(categoryCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Simple retention rate (users with multiple orders / total users)
    const repeatUsers = Array.from(userStats.values()).filter(s => s.orderCount > 1).length;
    const retentionRate = allUsers.size > 0 ? (repeatUsers / allUsers.size) * 100 : 0;

    return {
      totalUsers: allUsers.size,
      activeUsers: allUsers.size,
      newUsers: newUsers.size,
      userOrders,
      topCategories,
      retentionRate: Math.round(retentionRate * 100) / 100,
    };
  }

  // Get service-specific analytics
  public getServiceAnalytics(services: any[], orders: Order[], limit = 10): ServiceAnalytics[] {
    const serviceStats = new Map<string, ServiceAnalytics>();

    services.forEach(service => {
      serviceStats.set(service.id, {
        serviceId: service.id,
        serviceName: service.name,
        revenue: 0,
        orderCount: 0,
        viewCount: service.viewCount || 0,
        conversionRate: 0,
        averageRating: service.rating || 0,
      });
    });

    orders.forEach(order => {
      order.items.forEach(item => {
        const stats = serviceStats.get(item.serviceId);
        if (stats) {
          stats.revenue += item.totalPrice;
          stats.orderCount += 1;
        }
      });
    });

    // Calculate conversion rates
    serviceStats.forEach(stats => {
      if (stats.viewCount > 0) {
        stats.conversionRate = Math.round((stats.orderCount / stats.viewCount) * 10000) / 100;
      }
    });

    return Array.from(serviceStats.values())
      .filter(s => s.orderCount > 0 || s.viewCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // Get category analytics
  public getCategoryAnalytics(services: any[], orders: Order[], limit = 10): CategoryAnalytics[] {
    const categoryStats = new Map<string, CategoryAnalytics>();

    // Initialize from services
    services.forEach(service => {
      categoryStats.set(service.category, {
        categoryId: service.categoryId || service.category,
        categoryName: service.category,
        serviceCount: 0,
        revenue: 0,
        orderCount: 0,
        averageRating: 0,
      });
    });

    // Count services per category
    const categoryServiceCounts = new Map<string, number>();
    services.forEach(service => {
      categoryServiceCounts.set(
        service.category,
        (categoryServiceCounts.get(service.category) || 0) + 1
      );
    });

    // Process orders
    const categoryRatings = new Map<string, number[]>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const service = serviceCatalog.getService(item.serviceId);
        if (!service) return;

        const stats = categoryStats.get(service.category);
        if (stats) {
          stats.revenue += item.totalPrice;
          stats.orderCount += 1;

          if (!categoryRatings.has(service.category)) {
            categoryRatings.set(service.category, []);
          }
          categoryRatings.get(service.category)!.push(service.rating);
        }
      });
    });

    // Calculate average ratings
    categoryStats.forEach((stats, category) => {
      const ratings = categoryRatings.get(category) || [];
      stats.averageRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
      stats.serviceCount = categoryServiceCounts.get(category) || 0;
    });

    return Array.from(categoryStats.values())
      .filter(s => s.orderCount > 0 || s.serviceCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // Export analytics to CSV
  public exportToCSV(analytics: MarketplaceAnalytics): string {
    const lines: string[] = [];

    // Summary
    lines.push('Marketplace Analytics Summary');
    lines.push(`Total Services,${analytics.totalServices}`);
    lines.push(`Active Services,${analytics.activeServices}`);
    lines.push(`Total Revenue,${analytics.totalRevenue}`);
    lines.push(`Total Orders,${analytics.totalOrders}`);
    lines.push(`Total Users,${analytics.totalUsers}`);
    lines.push(`Average Rating,${analytics.averageRating}`);
    lines.push('');

    // Top Services
    lines.push('Top Services');
    lines.push('Service Name,Revenue,Orders,Views,Conversion Rate,Rating');
    analytics.topServices.forEach(s => {
      lines.push(`${s.serviceName},${s.revenue},${s.orderCount},${s.viewCount},${s.conversionRate}%,${s.averageRating}`);
    });
    lines.push('');

    // Top Categories
    lines.push('Top Categories');
    lines.push('Category Name,Service Count,Revenue,Orders,Average Rating');
    analytics.topCategories.forEach(c => {
      lines.push(`${c.categoryName},${c.serviceCount},${c.revenue},${c.orderCount},${c.averageRating}`);
    });

    return lines.join('\n');
  }

  // Private helper methods
  private filterByDateRange<T extends { createdAt: string }>(
    items: T[],
    startDate?: string,
    endDate?: string
  ): T[] {
    return items.filter(item => {
      const itemDate = new Date(item.createdAt);
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate)) return false;
      return true;
    });
  }

  private getRevenueByDay(orders: Order[], startDate?: string, endDate?: string): RevenueByDay[] {
    const dailyRevenue = new Map<string, { revenue: number; orders: number }>();

    orders.forEach(order => {
      const date = order.createdAt.split('T')[0];
      const existing = dailyRevenue.get(date) || { revenue: 0, orders: 0 };
      dailyRevenue.set(date, {
        revenue: existing.revenue + order.total,
        orders: existing.orders + 1,
      });
    });

    return Array.from(dailyRevenue.entries())
      .map(([date, data]) => ({
        date,
        revenue: Math.round(data.revenue * 100) / 100,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getOrdersByDay(orders: Order[], startDate?: string, endDate?: string): OrdersByDay[] {
    const dailyOrders = new Map<string, { orders: number; completed: number; cancelled: number }>();

    orders.forEach(order => {
      const date = order.createdAt.split('T')[0];
      const existing = dailyOrders.get(date) || { orders: 0, completed: 0, cancelled: 0 };
      dailyOrders.set(date, {
        orders: existing.orders + 1,
        completed: existing.completed + (order.status === 'completed' ? 1 : 0),
        cancelled: existing.cancelled + (order.status === 'cancelled' ? 1 : 0),
      });
    });

    return Array.from(dailyOrders.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        completed: data.completed,
        cancelled: data.cancelled,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getSubscriptionsByPlan(subscriptions: Subscription[]): SubscriptionsByPlan[] {
    const planStats = new Map<string, SubscriptionsByPlan>();

    subscriptions.forEach(sub => {
      const existing = planStats.get(sub.planId) || {
        planId: sub.planId,
        planName: sub.planName,
        activeCount: 0,
        trialCount: 0,
        cancelledCount: 0,
        revenue: 0,
      };

      switch (sub.status) {
        case 'active':
          existing.activeCount += 1;
          break;
        case 'trial':
          existing.trialCount += 1;
          break;
        case 'cancelled':
          existing.cancelledCount += 1;
          break;
      }

      planStats.set(sub.planId, existing);
    });

    return Array.from(planStats.values())
      .sort((a, b) => b.activeCount - a.activeCount);
  }

  private getRecentActivity(orders: Order[], payments: Payment[], subscriptions: Subscription[]): ActivityItem[] {
    const activities: ActivityItem[] = [];

    // Recent orders
    orders.slice(0, 5).forEach(order => {
      activities.push({
        id: order.id,
        type: 'order',
        description: `New order #${order.orderNumber}`,
        userId: order.userId,
        userName: order.userEmail,
        serviceId: order.items[0]?.serviceId,
        serviceName: order.items[0]?.serviceName,
        amount: order.total,
        createdAt: order.createdAt,
      });
    });

    // Recent payments
    payments.slice(0, 3).forEach(payment => {
      activities.push({
        id: payment.id,
        type: 'payment',
        description: `Payment of ${payment.amount} received`,
        userId: payment.userId,
        userName: payment.userId,
        amount: payment.amount,
        createdAt: payment.createdAt,
      });
    });

    // Recent subscriptions
    subscriptions.slice(0, 3).forEach(sub => {
      activities.push({
        id: sub.id,
        type: 'subscription',
        description: `New subscription: ${sub.planName}`,
        userId: sub.userId,
        userName: sub.userEmail,
        serviceId: sub.serviceId,
        serviceName: sub.serviceName,
        createdAt: sub.createdAt,
      });
    });

    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  private calculateGrowthMetrics(startDate?: string, endDate?: string): GrowthMetrics {
    // Compare current period with previous period
    const days = this.getDaysInPeriod(startDate, endDate) || 30;
    const previousStart = startDate
      ? new Date(new Date(startDate).getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const previousEnd = startDate || undefined;

    const currentAnalytics = this.getMarketplaceAnalytics({ startDate, endDate });
    const previousAnalytics = this.getMarketplaceAnalytics({
      startDate: previousStart,
      endDate: previousEnd,
    });

    return {
      revenueGrowth: this.calculatePercentageChange(
        previousAnalytics.totalRevenue,
        currentAnalytics.totalRevenue
      ),
      orderGrowth: this.calculatePercentageChange(
        previousAnalytics.totalOrders,
        currentAnalytics.totalOrders
      ),
      userGrowth: this.calculatePercentageChange(
        previousAnalytics.totalUsers,
        currentAnalytics.totalUsers
      ),
      serviceGrowth: this.calculatePercentageChange(
        previousAnalytics.activeServices,
        currentAnalytics.activeServices
      ),
    };
  }

  private calculateRevenueGrowth(startDate?: string, endDate?: string): number {
    const days = this.getDaysInPeriod(startDate, endDate) || 30;
    const previousStart = startDate
      ? new Date(new Date(startDate).getTime() - days * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    const previousEnd = startDate || undefined;

    const current = this.getRevenueAnalytics({ startDate, endDate });
    const previous = this.getRevenueAnalytics({ startDate: previousStart, endDate: previousEnd });

    return this.calculatePercentageChange(previous.totalRevenue, current.totalRevenue);
  }

  private calculatePercentageChange(oldValue: number, newValue: number): number {
    if (oldValue === 0) return newValue > 0 ? 100 : 0;
    return Math.round(((newValue - oldValue) / oldValue) * 10000) / 100;
  }

  private getDaysInPeriod(startDate?: string, endDate?: string): number {
    if (!startDate || !endDate) return 30;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();