import winston from 'winston';
import {
  MetricCategory,
  Metric,
  MetricDataPoint,
  HealthScore,
  SLACompliance,
  FinancialMetrics,
  TeamPerformance,
  ProductPerformance,
  TimeRange,
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Metrics Service
// ============================================================================

export class MetricsService {
  private metricsCache: Map<string, { data: Metric; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 1 minute

  /**
   * Get cached metric or calculate fresh
   */
  private getCachedMetric(id: string, calculator: () => Metric): Metric {
    const cached = this.metricsCache.get(id);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const metric = calculator();
    this.metricsCache.set(id, { data: metric, timestamp: now });
    return metric;
  }

  /**
   * Get real-time metrics for a tenant
   */
  async getRealTimeMetrics(tenantId: string): Promise<Metric[]> {
    const metrics: Metric[] = [];

    // Generate real-time metrics for each category
    const categories = Object.values(MetricCategory);

    for (const category of categories) {
      const categoryMetrics = await this.getMetrics(tenantId, { category });
      metrics.push(...categoryMetrics);
    }

    return metrics;
  }

  /**
   * Get metrics by category
   */
  async getMetrics(tenantId: string, options?: {
    category?: string;
    period?: string;
  }): Promise<Metric[]> {
    const { category } = options || {};

    const metrics: Metric[] = [];

    if (!category || category === MetricCategory.FINANCIAL) {
      metrics.push(...this.getFinancialMetricsList(tenantId));
    }

    if (!category || category === MetricCategory.OPERATIONAL) {
      metrics.push(...this.getOperationalMetricsList(tenantId));
    }

    if (!category || category === MetricCategory.CUSTOMER) {
      metrics.push(...this.getCustomerMetricsList(tenantId));
    }

    if (!category || category === MetricCategory.EMPLOYEE) {
      metrics.push(...this.getEmployeeMetricsList(tenantId));
    }

    if (!category || category === MetricCategory.PRODUCT) {
      metrics.push(...this.getProductMetricsList(tenantId));
    }

    return metrics;
  }

  /**
   * Calculate overall health score
   */
  async calculateHealthScore(tenantId: string): Promise<HealthScore> {
    const components = [
      { name: 'Financial Health', score: 85, weight: 0.25 },
      { name: 'Customer Satisfaction', score: 88, weight: 0.20 },
      { name: 'Operational Efficiency', score: 82, weight: 0.20 },
      { name: ' Employee Engagement', score: 78, weight: 0.15 },
      { name: 'Product Quality', score: 90, weight: 0.10 },
      { name: 'Market Position', score: 84, weight: 0.10 },
    ];

    const overall = components.reduce(
      (sum, c) => sum + c.score * c.weight,
      0
    );

    return {
      overall: Math.round(overall * 10) / 10,
      components: components.map(c => ({
        ...c,
        trend: this.calculateTrend(c.score, c.score * 0.95),
      })),
      calculatedAt: new Date(),
      previousOverall: overall - 2.3,
    };
  }

  /**
   * Get financial metrics
   */
  async getFinancialMetrics(tenantId: string, options?: {
    period?: string;
  }): Promise<FinancialMetrics> {
    const period = this.parsePeriod(options?.period);

    return {
      revenue: {
        total: 2450000,
        growth: 15.3,
        target: 2500000,
        achieved: 98,
      },
      costs: {
        total: 1680000,
        breakdown: {
          personnel: 720000,
          operations: 450000,
          marketing: 280000,
          technology: 230000,
        },
        trend: 'stable',
      },
      profit: {
        gross: 980000,
        net: 620000,
        margin: 25.3,
      },
      cashFlow: {
        operating: 850000,
        investing: -320000,
        financing: -180000,
        net: 350000,
      },
      burnRate: 140000,
      runway: 18,
      period,
    };
  }

  /**
   * Get SLA compliance data
   */
  async getSLACompliance(tenantId: string): Promise<SLACompliance[]> {
    const slas: SLACompliance[] = [
      {
        id: 'sla-1',
        tenantId,
        slaName: 'API Response Time',
        target: 200,
        actual: 145,
        breached: false,
        incidents: 2,
        uptime: 99.95,
        latency: { p50: 45, p95: 120, p99: 180 },
        period: this.getDefaultPeriod(),
      },
      {
        id: 'sla-2',
        tenantId,
        slaName: 'Customer Support',
        target: 95,
        actual: 92,
        breached: true,
        incidents: 12,
        uptime: 99.2,
        latency: { p50: 15, p95: 45, p99: 90 },
        period: this.getDefaultPeriod(),
      },
      {
        id: 'sla-3',
        tenantId,
        slaName: 'System Availability',
        target: 99.9,
        actual: 99.97,
        breached: false,
        incidents: 1,
        uptime: 99.97,
        latency: { p50: 5, p95: 15, p99: 30 },
        period: this.getDefaultPeriod(),
      },
      {
        id: 'sla-4',
        tenantId,
        slaName: 'Data Processing',
        target: 99.5,
        actual: 99.8,
        breached: false,
        incidents: 0,
        uptime: 99.8,
        latency: { p50: 30, p95: 120, p99: 300 },
        period: this.getDefaultPeriod(),
      },
    ];

    return slas;
  }

  /**
   * Get team performance metrics
   */
  async getTeamPerformance(tenantId: string): Promise<TeamPerformance> {
    return {
      totalMembers: 127,
      averagePerformance: 82.5,
      topPerformers: [
        {
          id: 'tm-1',
          name: 'Sarah Chen',
          role: 'Engineering Lead',
          department: 'Engineering',
          email: 'sarah.chen@company.com',
          performanceScore: 96,
        },
        {
          id: 'tm-2',
          name: 'Marcus Johnson',
          role: 'Sales Director',
          department: 'Sales',
          email: 'marcus.j@company.com',
          performanceScore: 94,
        },
        {
          id: 'tm-3',
          name: 'Priya Patel',
          role: 'Product Manager',
          department: 'Product',
          email: 'priya.p@company.com',
          performanceScore: 93,
        },
      ],
      underperformers: [
        {
          id: 'tm-4',
          name: 'James Wilson',
          role: 'Account Manager',
          department: 'Sales',
          email: 'james.w@company.com',
          performanceScore: 62,
        },
      ],
      byDepartment: [
        { name: 'Engineering', count: 45, avgPerformance: 85.2 },
        { name: 'Sales', count: 28, avgPerformance: 79.8 },
        { name: 'Marketing', count: 18, avgPerformance: 83.1 },
        { name: 'Operations', count: 15, avgPerformance: 80.5 },
        { name: 'Product', count: 12, avgPerformance: 88.4 },
        { name: 'Support', count: 9, avgPerformance: 76.2 },
      ],
      trends: [
        { period: this.getPeriodDays(30), performance: 78.2 },
        { period: this.getPeriodDays(60), performance: 80.1 },
        { period: this.getPeriodDays(90), performance: 82.5 },
      ],
    };
  }

  /**
   * Get product performance metrics
   */
  async getProductPerformance(tenantId: string): Promise<ProductPerformance> {
    return {
      totalProducts: 24,
      topProducts: [
        {
          id: 'prod-1',
          name: 'Enterprise Suite',
          category: 'Software',
          revenue: 1250000,
          unitsSold: 125,
          margin: 68.5,
          growth: 22.4,
          rating: 4.8,
        },
        {
          id: 'prod-2',
          name: 'Analytics Pro',
          category: 'Software',
          revenue: 580000,
          unitsSold: 580,
          margin: 72.3,
          growth: 35.2,
          rating: 4.6,
        },
        {
          id: 'prod-3',
          name: 'Cloud Platform',
          category: 'Infrastructure',
          revenue: 420000,
          unitsSold: 84,
          margin: 65.8,
          growth: 45.8,
          rating: 4.7,
        },
      ],
      underperformers: [
        {
          id: 'prod-4',
          name: 'Mobile App',
          category: 'Software',
          revenue: 85000,
          unitsSold: 1700,
          margin: 45.2,
          growth: -5.3,
          rating: 3.9,
        },
      ],
      byCategory: [
        { name: 'Software', count: 12, revenue: 1950000, growth: 18.5 },
        { name: 'Infrastructure', count: 6, revenue: 680000, growth: 32.1 },
        { name: 'Services', count: 4, revenue: 320000, growth: 8.2 },
        { name: 'Hardware', count: 2, revenue: 150000, growth: -2.1 },
      ],
    };
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private getFinancialMetricsList(tenantId: string): Metric[] {
    return [
      this.createMetric(tenantId, 'revenue', 'Total Revenue', MetricCategory.FINANCIAL, 2450000, '$', 15.3),
      this.createMetric(tenantId, 'net-profit', 'Net Profit', MetricCategory.FINANCIAL, 620000, '$', 12.8),
      this.createMetric(tenantId, 'profit-margin', 'Profit Margin', MetricCategory.FINANCIAL, 25.3, '%', 2.1),
      this.createMetric(tenantId, 'burn-rate', 'Monthly Burn Rate', MetricCategory.FINANCIAL, 140000, '$', -5.2),
      this.createMetric(tenantId, 'runway', 'Cash Runway', MetricCategory.FINANCIAL, 18, 'months', 0),
    ];
  }

  private getOperationalMetricsList(tenantId: string): Metric[] {
    return [
      this.createMetric(tenantId, 'uptime', 'System Uptime', MetricCategory.OPERATIONAL, 99.95, '%', 0.02),
      this.createMetric(tenantId, 'response-time', 'Avg Response Time', MetricCategory.OPERATIONAL, 145, 'ms', -8.5),
      this.createMetric(tenantId, 'error-rate', 'Error Rate', MetricCategory.OPERATIONAL, 0.05, '%', -15.2),
      this.createMetric(tenantId, 'sla-compliance', 'SLA Compliance', MetricCategory.OPERATIONAL, 97.8, '%', 1.2),
      this.createMetric(tenantId, 'efficiency', 'Operational Efficiency', MetricCategory.OPERATIONAL, 82.5, '%', 4.3),
    ];
  }

  private getCustomerMetricsList(tenantId: string): Metric[] {
    return [
      this.createMetric(tenantId, 'nps', 'Net Promoter Score', MetricCategory.CUSTOMER, 72, '', 5.8),
      this.createMetric(tenantId, 'csat', 'Customer Satisfaction', MetricCategory.CUSTOMER, 88, '%', 2.1),
      this.createMetric(tenantId, 'churn-rate', 'Churn Rate', MetricCategory.CUSTOMER, 2.3, '%', -12.5),
      this.createMetric(tenantId, 'ltv', 'Customer LTV', MetricCategory.CUSTOMER, 12500, '$', 8.2),
      this.createMetric(tenantId, 'retention', 'Retention Rate', MetricCategory.CUSTOMER, 94.5, '%', 1.8),
    ];
  }

  private getEmployeeMetricsList(tenantId: string): Metric[] {
    return [
      this.createMetric(tenantId, 'engagement', 'Employee Engagement', MetricCategory.EMPLOYEE, 78, '%', 3.5),
      this.createMetric(tenantId, 'turnover', 'Turnover Rate', MetricCategory.EMPLOYEE, 8.2, '%', -2.1),
      this.createMetric(tenantId, 'productivity', 'Productivity Index', MetricCategory.EMPLOYEE, 115, '', 6.8),
      this.createMetric(tenantId, 'satisfaction', 'Job Satisfaction', MetricCategory.EMPLOYEE, 82, '%', 2.5),
    ];
  }

  private getProductMetricsList(tenantId: string): Metric[] {
    return [
      this.createMetric(tenantId, 'products-sold', 'Products Sold', MetricCategory.PRODUCT, 2450, '', 18.5),
      this.createMetric(tenantId, 'product-rating', 'Avg Product Rating', MetricCategory.PRODUCT, 4.6, '/5', 0.1),
      this.createMetric(tenantId, 'new-products', 'New Products', MetricCategory.PRODUCT, 5, '', 25),
      this.createMetric(tenantId, 'product-margin', 'Avg Product Margin', MetricCategory.PRODUCT, 65.2, '%', 3.8),
    ];
  }

  private createMetric(
    tenantId: string,
    name: string,
    displayName: string,
    category: MetricCategory,
    value: number,
    unit: string,
    changePercent: number
  ): Metric {
    const trend = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'stable';
    const previousValue = value / (1 + changePercent / 100);

    return {
      id: `${tenantId}-${name}`,
      tenantId,
      name: displayName,
      category,
      value,
      previousValue,
      unit,
      trend,
      changePercent: Math.round(changePercent * 10) / 10,
      calculatedAt: new Date(),
    };
  }

  private calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const change = ((current - previous) / previous) * 100;
    if (change > 1) return 'up';
    if (change < -1) return 'down';
    return 'stable';
  }

  private parsePeriod(period?: string): TimeRange {
    const days = this.parsePeriodDays(period);
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return { startDate, endDate, label: period || `${days}d` };
  }

  private parsePeriodDays(period?: string): number {
    if (!period) return 30;

    const match = period.match(/(\d+)([dwmy])?/);
    if (!match) return 30;

    const value = parseInt(match[1], 10);
    const unit = match[2] || 'd';

    switch (unit) {
      case 'w': return value * 7;
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return value;
    }
  }

  private getDefaultPeriod(): TimeRange {
    return this.parsePeriod('30d');
  }

  private getPeriodDays(days: number): TimeRange {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate, endDate };
  }
}
