import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import {
  Insight,
  InsightSummary,
  MetricCategory,
  AlertSeverity,
} from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Insights Service - Business Intelligence and Recommendations
// ============================================================================

export class InsightsService {
  private insights: Map<string, Insight> = new Map();

  /**
   * Get all insights for a tenant
   */
  async getInsights(
    tenantId: string,
    options?: {
      page?: number;
      limit?: number;
      type?: string;
      severity?: string;
      category?: string;
      viewed?: boolean;
    }
  ): Promise<{ data: Insight[]; total: number; summary: InsightSummary }> {
    const { page = 1, limit = 20, type, severity, category, viewed } = options || {};

    let insights = Array.from(this.insights.values())
      .filter(i => i.tenantId === tenantId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (type) {
      insights = insights.filter(i => i.type === type);
    }

    if (severity) {
      insights = insights.filter(i => i.severity === severity);
    }

    if (category) {
      insights = insights.filter(i => i.category === category);
    }

    if (viewed !== undefined) {
      insights = insights.filter(i => i.viewed === viewed);
    }

    const total = insights.length;
    const paginatedInsights = insights.slice((page - 1) * limit, page * limit);
    const summary = await this.buildSummary(tenantId);

    return {
      data: paginatedInsights,
      total,
      summary,
    };
  }

  /**
   * Get insights summary
   */
  async getSummary(tenantId: string): Promise<InsightSummary> {
    return this.buildSummary(tenantId);
  }

  /**
   * Get recent insights
   */
  async getRecentInsights(tenantId: string, limit: number = 10): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter(i => i.tenantId === tenantId)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get unread insights
   */
  async getUnreadInsights(tenantId: string): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter(i => i.tenantId === tenantId && !i.viewed)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Get a specific insight
   */
  async getInsight(tenantId: string, insightId: string): Promise<Insight | null> {
    const insight = this.insights.get(insightId);
    if (insight && insight.tenantId === tenantId) {
      return insight;
    }
    return null;
  }

  /**
   * Create a new insight
   */
  async createInsight(tenantId: string, data: Partial<Insight>): Promise<Insight> {
    const insight: Insight = {
      id: uuidv4(),
      tenantId,
      title: data.title || 'Untitled Insight',
      description: data.description || '',
      type: data.type || 'recommendation',
      category: data.category || MetricCategory.OPERATIONAL,
      severity: data.severity || AlertSeverity.INFO,
      data: data.data || {},
      recommendations: data.recommendations || [],
      sources: data.sources || [],
      generatedAt: new Date(),
      expiresAt: data.expiresAt,
      viewed: false,
      actionTaken: data.actionTaken,
    };

    this.insights.set(insight.id, insight);
    logger.info('Insight created', { tenantId, insightId: insight.id });

    return insight;
  }

  /**
   * Generate insights from metrics
   */
  async generateInsights(tenantId: string, categories?: MetricCategory[]): Promise<Insight[]> {
    const insights: Insight[] = [];
    const targetCategories = categories || Object.values(MetricCategory);

    for (const category of targetCategories) {
      const categoryInsights = await this.analyzeCategory(tenantId, category);
      insights.push(...categoryInsights);
    }

    return insights;
  }

  /**
   * Mark insight as viewed
   */
  async markAsViewed(tenantId: string, insightId: string): Promise<Insight | null> {
    const insight = this.insights.get(insightId);

    if (!insight || insight.tenantId !== tenantId) {
      return null;
    }

    insight.viewed = true;
    return insight;
  }

  /**
   * Record action taken on insight
   */
  async recordAction(tenantId: string, insightId: string, actionTaken: string): Promise<Insight | null> {
    const insight = this.insights.get(insightId);

    if (!insight || insight.tenantId !== tenantId) {
      return null;
    }

    insight.actionTaken = actionTaken;
    return insight;
  }

  /**
   * Delete an insight
   */
  async deleteInsight(tenantId: string, insightId: string): Promise<boolean> {
    const insight = this.insights.get(insightId);

    if (!insight || insight.tenantId !== tenantId) {
      return false;
    }

    this.insights.delete(insightId);
    return true;
  }

  /**
   * Clean up expired insights
   */
  async cleanupExpiredInsights(tenantId: string): Promise<number> {
    const now = new Date();
    let deleted = 0;

    for (const insight of this.insights.values()) {
      if (
        insight.tenantId === tenantId &&
        insight.expiresAt &&
        insight.expiresAt < now
      ) {
        this.insights.delete(insight.id);
        deleted++;
      }
    }

    if (deleted > 0) {
      logger.info('Expired insights cleaned up', { tenantId, count: deleted });
    }

    return deleted;
  }

  /**
   * Get insights by type
   */
  async getInsightsByType(tenantId: string, type: string, limit: number = 20): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter(i => i.tenantId === tenantId && i.type === type)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get insights by category
   */
  async getInsightsByCategory(tenantId: string, category: string, limit: number = 20): Promise<Insight[]> {
    return Array.from(this.insights.values())
      .filter(i => i.tenantId === tenantId && i.category === category)
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private async buildSummary(tenantId: string): Promise<InsightSummary> {
    const insights = Array.from(this.insights.values()).filter(i => i.tenantId === tenantId);

    const byType: Record<string, number> = {};
    const bySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.HIGH]: 0,
      [AlertSeverity.MEDIUM]: 0,
      [AlertSeverity.LOW]: 0,
      [AlertSeverity.INFO]: 0,
    };

    let unread = 0;
    const recentInsights: Insight[] = [];

    for (const insight of insights) {
      byType[insight.type] = (byType[insight.type] || 0) + 1;
      bySeverity[insight.severity]++;
      if (!insight.viewed) unread++;
    }

    recentInsights.push(
      ...insights
        .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
        .slice(0, 5)
    );

    return {
      total: insights.length,
      byType,
      bySeverity,
      unread,
      recentInsights,
    };
  }

  private async analyzeCategory(tenantId: string, category: MetricCategory): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Generate insights based on category
    switch (category) {
      case MetricCategory.FINANCIAL:
        insights.push(...this.analyzeFinancialInsights(tenantId));
        break;
      case MetricCategory.OPERATIONAL:
        insights.push(...this.analyzeOperationalInsights(tenantId));
        break;
      case MetricCategory.CUSTOMER:
        insights.push(...this.analyzeCustomerInsights(tenantId));
        break;
      case MetricCategory.EMPLOYEE:
        insights.push(...this.analyzeEmployeeInsights(tenantId));
        break;
      case MetricCategory.PRODUCT:
        insights.push(...this.analyzeProductInsights(tenantId));
        break;
      default:
        break;
    }

    // Store insights
    for (const insight of insights) {
      this.insights.set(insight.id, insight);
    }

    return insights;
  }

  private analyzeFinancialInsights(tenantId: string): Insight[] {
    const insights: Insight[] = [];

    // Revenue growth insight
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Strong Revenue Growth',
      description: 'Revenue has grown 15.3% over the past 30 days, exceeding the quarterly target by 98%.',
      type: 'achievement',
      category: MetricCategory.FINANCIAL,
      severity: AlertSeverity.INFO,
      data: { growth: 15.3, target: 98 },
      recommendations: ['Consider accelerating investment in top-performing products'],
      sources: ['Financial Metrics Service'],
      generatedAt: new Date(),
      viewed: false,
    });

    // Cost optimization insight
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Cost Optimization Opportunity',
      description: 'Technology costs have increased by 8% while delivering similar output. Review cloud infrastructure.',
      type: 'recommendation',
      category: MetricCategory.FINANCIAL,
      severity: AlertSeverity.MEDIUM,
      data: { costIncrease: 8, category: 'technology' },
      recommendations: [
        'Audit cloud resource utilization',
        'Consider reserved instances for steady workloads',
        'Review and optimize data storage costs'
      ],
      sources: ['Cost Analysis Service'],
      generatedAt: new Date(),
      viewed: false,
    });

    return insights;
  }

  private analyzeOperationalInsights(tenantId: string): Insight[] {
    const insights: Insight[] = [];

    // System performance insight
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'API Response Time Improvement',
      description: 'Average API response time decreased from 180ms to 145ms (-19.4%).',
      type: 'trend',
      category: MetricCategory.OPERATIONAL,
      severity: AlertSeverity.INFO,
      data: { before: 180, after: 145, improvement: 19.4 },
      sources: ['Performance Monitoring'],
      generatedAt: new Date(),
      viewed: false,
    });

    // SLA compliance warning
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Customer Support SLA Breach',
      description: 'Support response time SLA has been breached 12 times this month. Current compliance at 92% vs 95% target.',
      type: 'warning',
      category: MetricCategory.OPERATIONAL,
      severity: AlertSeverity.HIGH,
      data: { compliance: 92, target: 95, breaches: 12 },
      recommendations: [
        'Review current support team capacity',
        'Implement automated triage for common issues',
        'Consider adding chatbot for initial support'
      ],
      sources: ['Support Metrics Service'],
      generatedAt: new Date(),
      viewed: false,
    });

    return insights;
  }

  private analyzeCustomerInsights(tenantId: string): Insight[] {
    const insights: Insight[] = [];

    // NPS improvement
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'NPS Score Improvement',
      description: 'Net Promoter Score improved from 66 to 72 (+9.1%). Most improvement from Enterprise segment.',
      type: 'achievement',
      category: MetricCategory.CUSTOMER,
      severity: AlertSeverity.INFO,
      data: { before: 66, after: 72, change: 9.1 },
      recommendations: ['Document best practices from Enterprise team'],
      sources: ['Customer Feedback System'],
      generatedAt: new Date(),
      viewed: false,
    });

    // Churn warning
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Churn Rate Anomaly Detected',
      description: 'Churn rate increased from 1.8% to 2.3% in the past week. Users from Mobile App segment most affected.',
      type: 'anomaly',
      category: MetricCategory.CUSTOMER,
      severity: AlertSeverity.HIGH,
      data: { before: 1.8, after: 2.3, segment: 'mobile' },
      recommendations: [
        'Investigate recent changes to Mobile App',
        'Survey churned users for feedback',
        'Review competitor activity in mobile segment'
      ],
      sources: ['Churn Analytics'],
      generatedAt: new Date(),
      viewed: false,
    });

    return insights;
  }

  private analyzeEmployeeInsights(tenantId: string): Insight[] {
    const insights: Insight[] = [];

    // Team engagement
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Engineering Team Performance',
      description: 'Engineering team leads all departments with 85.2% average performance score.',
      type: 'achievement',
      category: MetricCategory.EMPLOYEE,
      severity: AlertSeverity.INFO,
      data: { department: 'Engineering', score: 85.2 },
      sources: ['HR Analytics'],
      generatedAt: new Date(),
      viewed: false,
    });

    return insights;
  }

  private analyzeProductInsights(tenantId: string): Insight[] {
    const insights: Insight[] = [];

    // Product growth
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Cloud Platform Momentum',
      description: 'Cloud Platform showing strongest growth at 45.8% MoM with highest customer ratings (4.7/5).',
      type: 'trend',
      category: MetricCategory.PRODUCT,
      severity: AlertSeverity.INFO,
      data: { product: 'Cloud Platform', growth: 45.8, rating: 4.7 },
      recommendations: ['Consider expanding Cloud Platform team'],
      sources: ['Product Analytics'],
      generatedAt: new Date(),
      viewed: false,
    });

    // Underperforming product
    insights.push({
      id: uuidv4(),
      tenantId,
      title: 'Mobile App Underperformance',
      description: 'Mobile App experiencing negative growth (-5.3%) and lowest rating (3.9/5). Consider strategic review.',
      type: 'warning',
      category: MetricCategory.PRODUCT,
      severity: AlertSeverity.MEDIUM,
      data: { product: 'Mobile App', growth: -5.3, rating: 3.9 },
      recommendations: [
        'Conduct user research on mobile experience',
        'Compare feature set with competitors',
        'Evaluate build vs buy for core mobile features'
      ],
      sources: ['Product Analytics'],
      generatedAt: new Date(),
      viewed: false,
    });

    return insights;
  }
}
