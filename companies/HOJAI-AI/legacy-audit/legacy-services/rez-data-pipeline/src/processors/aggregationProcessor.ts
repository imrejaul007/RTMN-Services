/**
 * Aggregation Processor
 * Performs real-time aggregations on metrics
 */

export interface RevenueMetric {
  merchantId: string;
  period: 'hour' | 'day' | 'week' | 'month';
  periodStart: Date;
  periodEnd: Date;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
  completedOrders: number;
  cancelledOrders: number;
  refundAmount: number;
  bySource: {
    app: number;
    qr: number;
    aggregator: number;
  };
  byPaymentMethod?: {
    card: number;
    cash: number;
    wallet: number;
  };
}

export interface CustomerMetrics {
  merchantId: string;
  periodStart: Date;
  periodEnd: Date;
  uniqueCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  vipCustomers: number;
  cartAbandonmentRate: number;
  conversionRate: number;
  searchToOrderRate: number;
  averageSessionDuration: number;
  byDayOfWeek: Record<string, number>;
  byHourOfDay: Record<number, number>;
}

export interface DishMetrics {
  merchantId: string;
  periodStart: Date;
  periodEnd: Date;
  topItems: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    revenue: number;
  }>;
  categoryBreakdown: Record<string, { quantity: number; revenue: number }>;
  peakHours: Array<{
    hour: number;
    orderCount: number;
    revenue: number;
  }>;
  popularityTrend: Array<{
    date: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export class AggregationProcessor {
  private redisStorage: any; // Redis storage instance
  private aggregationWindowMs: number;

  constructor(options: { aggregationWindowMs?: number } = {}) {
    this.aggregationWindowMs = options.aggregationWindowMs ?? 60000; // 1 minute default
  }

  /**
   * Set Redis storage for real-time aggregations
   */
  setRedisStorage(storage: any): void {
    this.redisStorage = storage;
  }

  /**
   * Aggregate revenue metrics for a merchant
   */
  async aggregateRevenue(
    merchantId: string,
    period: 'hour' | 'day'
  ): Promise<RevenueMetric> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, period);
    const periodEnd = new Date();

    // In production, this would query Redis for real-time data
    // and MongoDB for historical data
    const metric: RevenueMetric = {
      merchantId,
      period,
      periodStart,
      periodEnd,
      totalRevenue: await this.getTotalRevenue(merchantId, periodStart, periodEnd),
      orderCount: await this.getOrderCount(merchantId, periodStart, periodEnd),
      averageOrderValue: 0, // Calculated below
      completedOrders: await this.getCompletedOrderCount(merchantId, periodStart, periodEnd),
      cancelledOrders: await this.getCancelledOrderCount(merchantId, periodStart, periodEnd),
      refundAmount: await this.getRefundAmount(merchantId, periodStart, periodEnd),
      bySource: {
        app: await this.getRevenueBySource(merchantId, periodStart, periodEnd, 'app'),
        qr: await this.getRevenueBySource(merchantId, periodStart, periodEnd, 'qr'),
        aggregator: await this.getRevenueBySource(merchantId, periodStart, periodEnd, 'aggregator')
      }
    };

    metric.averageOrderValue = metric.orderCount > 0
      ? metric.totalRevenue / metric.orderCount
      : 0;

    return metric;
  }

  /**
   * Aggregate customer metrics
   */
  async aggregateCustomerMetrics(merchantId: string): Promise<CustomerMetrics> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    const periodEnd = now;

    const byDayOfWeek = this.generateEmptyDayOfWeek();
    const byHourOfDay = this.generateEmptyHourOfDay();

    const metric: CustomerMetrics = {
      merchantId,
      periodStart,
      periodEnd,
      uniqueCustomers: await this.getUniqueCustomers(merchantId, periodStart, periodEnd),
      newCustomers: await this.getNewCustomers(merchantId, periodStart, periodEnd),
      returningCustomers: await this.getReturningCustomers(merchantId, periodStart, periodEnd),
      vipCustomers: await this.getVipCustomers(merchantId, periodStart, periodEnd),
      cartAbandonmentRate: await this.getCartAbandonmentRate(merchantId, periodStart, periodEnd),
      conversionRate: await this.getConversionRate(merchantId, periodStart, periodEnd),
      searchToOrderRate: await this.getSearchToOrderRate(merchantId, periodStart, periodEnd),
      averageSessionDuration: await this.getAverageSessionDuration(merchantId, periodStart, periodEnd),
      byDayOfWeek,
      byHourOfDay
    };

    return metric;
  }

  /**
   * Aggregate dish/item metrics
   */
  async aggregateDishMetrics(merchantId: string): Promise<DishMetrics> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const periodEnd = now;

    const metric: DishMetrics = {
      merchantId,
      periodStart,
      periodEnd,
      topItems: await this.getTopItems(merchantId, periodStart, periodEnd, 10),
      categoryBreakdown: await this.getCategoryBreakdown(merchantId, periodStart, periodEnd),
      peakHours: await this.getPeakHours(merchantId, periodStart, periodEnd),
      popularityTrend: await this.getPopularityTrend(merchantId, periodStart, periodEnd)
    };

    return metric;
  }

  /**
   * Get rolling window metrics
   */
  async getRollingMetrics(
    merchantId: string,
    windowMinutes: number
  ): Promise<{
    revenue: number;
    orders: number;
    customers: number;
    avgOrderValue: number;
  }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Simulated values - in production, query Redis
    return {
      revenue: Math.random() * 10000,
      orders: Math.floor(Math.random() * 100),
      customers: Math.floor(Math.random() * 50),
      avgOrderValue: Math.random() * 100
    };
  }

  /**
   * Compare metrics between two periods
   */
  async comparePeriods(
    merchantId: string,
    period: 'hour' | 'day',
    comparisonType: 'day' | 'week' | 'month'
  ): Promise<{
    current: RevenueMetric;
    previous: RevenueMetric;
    delta: {
      revenueChange: number;
      revenueChangePercent: number;
      orderCountChange: number;
      orderCountChangePercent: number;
    };
  }> {
    const current = await this.aggregateRevenue(merchantId, period);

    const previousPeriodStart = this.getPreviousPeriodStart(
      current.periodStart,
      comparisonType
    );
    const previousPeriodEnd = this.getPreviousPeriodEnd(
      current.periodEnd,
      comparisonType
    );

    const previous: RevenueMetric = {
      ...current,
      periodStart: previousPeriodStart,
      periodEnd: previousPeriodEnd,
      totalRevenue: current.totalRevenue * (0.8 + Math.random() * 0.4),
      orderCount: Math.floor(current.orderCount * (0.8 + Math.random() * 0.4))
    };
    previous.averageOrderValue = previous.orderCount > 0
      ? previous.totalRevenue / previous.orderCount
      : 0;

    return {
      current,
      previous,
      delta: {
        revenueChange: current.totalRevenue - previous.totalRevenue,
        revenueChangePercent: previous.totalRevenue > 0
          ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
          : 0,
        orderCountChange: current.orderCount - previous.orderCount,
        orderCountChangePercent: previous.orderCount > 0
          ? ((current.orderCount - previous.orderCount) / previous.orderCount) * 100
          : 0
      }
    };
  }

  // Private helper methods (simulated for demo)

  private getPeriodStart(date: Date, period: 'hour' | 'day'): Date {
    if (period === 'hour') {
      return new Date(date.getTime() - 60 * 60 * 1000);
    }
    return new Date(date.getTime() - 24 * 60 * 60 * 1000);
  }

  private getPreviousPeriodStart(currentStart: Date, comparisonType: 'day' | 'week' | 'month'): Date {
    const ms = comparisonType === 'day' ? 24 * 60 * 60 * 1000
      : comparisonType === 'week' ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    return new Date(currentStart.getTime() - ms);
  }

  private getPreviousPeriodEnd(currentEnd: Date, comparisonType: 'day' | 'week' | 'month'): Date {
    const ms = comparisonType === 'day' ? 24 * 60 * 60 * 1000
      : comparisonType === 'week' ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    return new Date(currentEnd.getTime() - ms);
  }

  private async getTotalRevenue(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.random() * 50000;
  }

  private async getOrderCount(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 500);
  }

  private async getCompletedOrderCount(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 450);
  }

  private async getCancelledOrderCount(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 50);
  }

  private async getRefundAmount(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.random() * 500;
  }

  private async getRevenueBySource(
    merchantId: string,
    start: Date,
    end: Date,
    source: 'app' | 'qr' | 'aggregator'
  ): Promise<number> {
    return Math.random() * 15000;
  }

  private async getUniqueCustomers(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 200);
  }

  private async getNewCustomers(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 50);
  }

  private async getReturningCustomers(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 150);
  }

  private async getVipCustomers(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 20);
  }

  private async getCartAbandonmentRate(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.random() * 0.5;
  }

  private async getConversionRate(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.random() * 0.3 + 0.1;
  }

  private async getSearchToOrderRate(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.random() * 0.2 + 0.05;
  }

  private async getAverageSessionDuration(merchantId: string, start: Date, end: Date): Promise<number> {
    return Math.floor(Math.random() * 600) + 60; // 1-11 minutes
  }

  private async getTopItems(
    merchantId: string,
    start: Date,
    end: Date,
    limit: number
  ): Promise<Array<{ itemId: string; itemName: string; quantity: number; revenue: number }>> {
    return Array.from({ length: limit }, (_, i) => ({
      itemId: `item_${i}`,
      itemName: `Popular Item ${i + 1}`,
      quantity: Math.floor(Math.random() * 100) + 10,
      revenue: Math.random() * 5000
    }));
  }

  private async getCategoryBreakdown(
    merchantId: string,
    start: Date,
    end: Date
  ): Promise<Record<string, { quantity: number; revenue: number }>> {
    return {
      'Appetizers': { quantity: Math.floor(Math.random() * 200), revenue: Math.random() * 3000 },
      'Main Course': { quantity: Math.floor(Math.random() * 300), revenue: Math.random() * 8000 },
      'Desserts': { quantity: Math.floor(Math.random() * 100), revenue: Math.random() * 1500 },
      'Beverages': { quantity: Math.floor(Math.random() * 400), revenue: Math.random() * 2000 }
    };
  }

  private async getPeakHours(
    merchantId: string,
    start: Date,
    end: Date
  ): Promise<Array<{ hour: number; orderCount: number; revenue: number }>> {
    return [11, 12, 13, 18, 19, 20].map(hour => ({
      hour,
      orderCount: Math.floor(Math.random() * 50) + 20,
      revenue: Math.random() * 3000
    }));
  }

  private async getPopularityTrend(
    merchantId: string,
    start: Date,
    end: Date
  ): Promise<Array<{ date: string; quantity: number; revenue: number }>> {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(end.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        quantity: Math.floor(Math.random() * 100) + 20,
        revenue: Math.random() * 5000 + 1000
      };
    });
  }

  private generateEmptyDayOfWeek(): Record<string, number> {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      .reduce((acc, day) => ({ ...acc, [day]: 0 }), {});
  }

  private generateEmptyHourOfDay(): Record<number, number> {
    return Array.from({ length: 24 }, (_, i) => i)
      .reduce((acc, hour) => ({ ...acc, [hour]: 0 }), {});
  }
}

export const aggregationProcessor = new AggregationProcessor();
