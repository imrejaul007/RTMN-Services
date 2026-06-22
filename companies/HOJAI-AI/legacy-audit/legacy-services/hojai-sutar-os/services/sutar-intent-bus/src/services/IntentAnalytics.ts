// ============================================================================
// Intent Analytics Service - Usage patterns
// ============================================================================

import { Intent, IntentCategory, IntentStatus } from '../index';

export interface AnalyticsTimeRange {
  startDate: string;
  endDate: string;
  granularity: 'hour' | 'day' | 'week' | 'month';
}

export interface IntentMetrics {
  totalIntents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  averageConfidence: number;
  successRate: number;
  averageProcessingTime: number;
}

export interface CategoryMetrics {
  category: IntentCategory;
  count: number;
  percentage: number;
  averageConfidence: number;
  successRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  weekOverWeekChange: number;
}

export interface UserMetrics {
  userId: string;
  totalIntents: number;
  categoryDistribution: Record<string, number>;
  averageSessionLength: number;
  conversionRate: number;
  lastActiveAt: string;
  userSegment: 'new' | 'active' | 'power' | 'churned';
}

export interface SessionMetrics {
  sessionId: string;
  intentCount: number;
  categories: IntentCategory[];
  startTime: string;
  endTime: string;
  duration: number;
  completionRate: number;
  bounceRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  percentageChange?: number;
}

export interface FunnelAnalysis {
  stage: string;
  count: number;
  dropoffRate: number;
  conversionRate: number;
}

export interface HeatmapData {
  dayOfWeek: number;
  hourOfDay: number;
  value: number;
}

export interface PredictionModel {
  predictedVolume: number;
  confidence: number;
  factors: string[];
  recommendation: string;
}

export class IntentAnalytics {
  private intents: Map<string, Intent>;
  private metricsCache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number;

  constructor() {
    this.intents = new Map();
    this.metricsCache = new Map();
    this.cacheTTL = 60000; // 1 minute cache
  }

  /**
   * Track an intent for analytics
   */
  trackIntent(intent: Intent): void {
    this.intents.set(intent.id, intent);
    this.invalidateCache();
  }

  /**
   * Get overall metrics
   */
  getMetrics(timeRange?: AnalyticsTimeRange): IntentMetrics {
    const filteredIntents = this.filterByTimeRange(timeRange);
    const totalIntents = filteredIntents.length;

    if (totalIntents === 0) {
      return {
        totalIntents: 0,
        uniqueUsers: 0,
        uniqueSessions: 0,
        averageConfidence: 0,
        successRate: 0,
        averageProcessingTime: 0
      };
    }

    const uniqueUsers = new Set(filteredIntents.map(i => i.userId).filter(Boolean)).size;
    const uniqueSessions = new Set(filteredIntents.map(i => i.sessionId).filter(Boolean)).size;
    const averageConfidence = filteredIntents.reduce((sum, i) => sum + i.confidence, 0) / totalIntents;
    const successCount = filteredIntents.filter(i => i.status === 'completed').length;
    const successRate = successCount / totalIntents;

    return {
      totalIntents,
      uniqueUsers,
      uniqueSessions,
      averageConfidence,
      successRate,
      averageProcessingTime: this.calculateAverageProcessingTime(filteredIntents)
    };
  }

  /**
   * Get metrics by category
   */
  getCategoryMetrics(timeRange?: AnalyticsTimeRange): CategoryMetrics[] {
    const filteredIntents = this.filterByTimeRange(timeRange);
    const categories = [...new Set(filteredIntents.map(i => i.category))];

    return categories.map(category => {
      const categoryIntents = filteredIntents.filter(i => i.category === category);
      const count = categoryIntents.length;
      const percentage = (count / filteredIntents.length) * 100;
      const averageConfidence = categoryIntents.reduce((sum, i) => sum + i.confidence, 0) / count;
      const successCount = categoryIntents.filter(i => i.status === 'completed').length;
      const successRate = successCount / count;
      const trend = this.calculateTrend(category, timeRange);
      const weekOverWeekChange = this.calculateWeekOverWeekChange(category, timeRange);

      return {
        category,
        count,
        percentage,
        averageConfidence,
        successRate,
        trend,
        weekOverWeekChange
      };
    }).sort((a, b) => b.count - a.count);
  }

  /**
   * Get user-level metrics
   */
  getUserMetrics(userId: string, timeRange?: AnalyticsTimeRange): UserMetrics | null {
    let filteredIntents = Array.from(this.intents.values());

    if (timeRange) {
      filteredIntents = this.filterByTimeRange(timeRange);
    }

    const userIntents = filteredIntents.filter(i => i.userId === userId);

    if (userIntents.length === 0) return null;

    const categoryDistribution: Record<string, number> = {};
    userIntents.forEach(i => {
      categoryDistribution[i.category] = (categoryDistribution[i.category] || 0) + 1;
    });

    const sessionIds = [...new Set(userIntents.map(i => i.sessionId).filter(Boolean))];
    const averageSessionLength = this.calculateAverageSessionLength(userIntents);
    const successCount = userIntents.filter(i => i.status === 'completed').length;
    const conversionRate = successCount / userIntents.length;

    return {
      userId,
      totalIntents: userIntents.length,
      categoryDistribution,
      averageSessionLength,
      conversionRate,
      lastActiveAt: userIntents[0]?.updatedAt || '',
      userSegment: this.determineUserSegment(userIntents)
    };
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): SessionMetrics | null {
    const sessionIntents = Array.from(this.intents.values())
      .filter(i => i.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (sessionIntents.length === 0) return null;

    const categories = [...new Set(sessionIntents.map(i => i.category))];
    const startTime = sessionIntents[0].createdAt;
    const endTime = sessionIntents[sessionIntents.length - 1].updatedAt;
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    const successCount = sessionIntents.filter(i => i.status === 'completed').length;
    const completionRate = successCount / sessionIntents.length;
    const bounceRate = sessionIntents.length === 1 ? 1 : 0;

    return {
      sessionId,
      intentCount: sessionIntents.length,
      categories,
      startTime,
      endTime,
      duration,
      completionRate,
      bounceRate
    };
  }

  /**
   * Get trend data over time
   */
  getTrendData(metric: 'intents' | 'users' | 'sessions' | 'conversions', timeRange: AnalyticsTimeRange): TrendData[] {
    const filteredIntents = this.filterByTimeRange(timeRange);
    const dataByPeriod = this.groupByPeriod(filteredIntents, timeRange.granularity);

    const trendData: TrendData[] = [];
    let previousValue: number | undefined;

    dataByPeriod.forEach((intents, period) => {
      let value: number;
      switch (metric) {
        case 'intents':
          value = intents.length;
          break;
        case 'users':
          value = new Set(intents.map(i => i.userId).filter(Boolean)).size;
          break;
        case 'sessions':
          value = new Set(intents.map(i => i.sessionId).filter(Boolean)).size;
          break;
        case 'conversions':
          value = intents.filter(i => i.status === 'completed').length;
          break;
        default:
          value = intents.length;
      }

      const percentageChange = previousValue !== undefined
        ? ((value - previousValue) / previousValue) * 100
        : undefined;

      trendData.push({
        date: period,
        value,
        percentageChange
      });

      previousValue = value;
    });

    return trendData;
  }

  /**
   * Perform funnel analysis
   */
  getFunnelAnalysis(): FunnelAnalysis[] {
    const allIntents = Array.from(this.intents.values());
    const total = allIntents.length;

    const stages: FunnelAnalysis[] = [
      {
        stage: 'captured',
        count: allIntents.filter(i => i.status === 'captured' || i.status === 'processing').length,
        dropoffRate: 0,
        conversionRate: 1
      },
      {
        stage: 'classified',
        count: allIntents.filter(i => ['processing', 'routed'].includes(i.status)).length,
        dropoffRate: 0,
        conversionRate: 0
      },
      {
        stage: 'routed',
        count: allIntents.filter(i => i.status === 'routed').length,
        dropoffRate: 0,
        conversionRate: 0
      },
      {
        stage: 'completed',
        count: allIntents.filter(i => i.status === 'completed').length,
        dropoffRate: 0,
        conversionRate: 0
      }
    ];

    // Calculate dropoff and conversion rates
    for (let i = 1; i < stages.length; i++) {
      const previousCount = stages[i - 1].count;
      const currentCount = stages[i].count;
      stages[i].dropoffRate = previousCount > 0 ? ((previousCount - currentCount) / previousCount) * 100 : 0;
      stages[i].conversionRate = total > 0 ? (currentCount / total) * 100 : 0;
    }

    return stages;
  }

  /**
   * Get heatmap data
   */
  getHeatmapData(): HeatmapData[] {
    const heatmap: Map<string, number> = new Map();
    const allIntents = Array.from(this.intents.values());

    for (const intent of allIntents) {
      const date = new Date(intent.createdAt);
      const dayOfWeek = date.getDay();
      const hourOfDay = date.getHours();
      const key = `${dayOfWeek}-${hourOfDay}`;

      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }

    const data: HeatmapData[] = [];
    heatmap.forEach((value, key) => {
      const [dayOfWeek, hourOfDay] = key.split('-').map(Number);
      data.push({ dayOfWeek, hourOfDay, value });
    });

    return data;
  }

  /**
   * Predict intent volume
   */
  predictVolume(daysAhead: number = 7): PredictionModel {
    const recentIntents = this.getRecentIntents(30);
    const dailyAverage = recentIntents.length / 30;

    // Simple linear prediction with trend adjustment
    const trend = this.calculateOverallTrend();
    const predictedVolume = Math.round(dailyAverage * daysAhead * (1 + trend));

    // Calculate confidence based on data variance
    const variance = this.calculateVariance(recentIntents);
    const confidence = Math.max(0.5, 1 - (variance / dailyAverage));

    const factors = this.identifyKeyFactors(recentIntents);

    return {
      predictedVolume,
      confidence,
      factors,
      recommendation: this.generateRecommendation(predictedVolume, confidence)
    };
  }

  /**
   * Get top performing categories
   */
  getTopCategories(limit: number = 5): CategoryMetrics[] {
    return this.getCategoryMetrics()
      .sort((a, b) => b.successRate * b.count - a.successRate * a.count)
      .slice(0, limit);
  }

  /**
   * Get underperforming categories
   */
  getUnderperformingCategories(threshold: number = 0.5): CategoryMetrics[] {
    return this.getCategoryMetrics()
      .filter(m => m.successRate < threshold)
      .sort((a, b) => a.successRate - b.successRate);
  }

  /**
   * Get anomalies in intent patterns
   */
  getAnomalies(): Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> {
    const anomalies: Array<{ type: string; description: string; severity: 'low' | 'medium' | 'high' }> = [];
    const metrics = this.getMetrics();

    // Check for low success rate
    if (metrics.successRate < 0.7) {
      anomalies.push({
        type: 'low_success_rate',
        description: `Success rate is ${(metrics.successRate * 100).toFixed(1)}%, below target of 70%`,
        severity: metrics.successRate < 0.5 ? 'high' : 'medium'
      });
    }

    // Check for low confidence
    if (metrics.averageConfidence < 0.6) {
      anomalies.push({
        type: 'low_confidence',
        description: `Average confidence is ${(metrics.averageConfidence * 100).toFixed(1)}%, below target of 60%`,
        severity: 'medium'
      });
    }

    // Check for category imbalance
    const categoryMetrics = this.getCategoryMetrics();
    if (categoryMetrics.length > 0) {
      const maxCount = categoryMetrics[0].count;
      const minCount = categoryMetrics[categoryMetrics.length - 1].count;
      if (maxCount > minCount * 10) {
        anomalies.push({
          type: 'category_imbalance',
          description: `Significant imbalance between top and bottom categories`,
          severity: 'low'
        });
      }
    }

    return anomalies;
  }

  // Private helper methods

  private filterByTimeRange(timeRange?: AnalyticsTimeRange): Intent[] {
    let intents = Array.from(this.intents.values());

    if (timeRange) {
      const startDate = new Date(timeRange.startDate);
      const endDate = new Date(timeRange.endDate);
      intents = intents.filter(i => {
        const date = new Date(i.createdAt);
        return date >= startDate && date <= endDate;
      });
    }

    return intents;
  }

  private getRecentIntents(days: number): Intent[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Array.from(this.intents.values())
      .filter(i => new Date(i.createdAt) >= cutoffDate);
  }

  private calculateAverageProcessingTime(intents: Intent[]): number {
    // Simplified calculation
    return intents.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime();
      const updated = new Date(i.updatedAt).getTime();
      return sum + (updated - created);
    }, 0) / intents.length;
  }

  private calculateTrend(category: IntentCategory, timeRange?: AnalyticsTimeRange): 'increasing' | 'decreasing' | 'stable' {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = Array.from(this.intents.values()).filter(i =>
      i.category === category && new Date(i.createdAt) >= weekAgo
    ).length;

    const previousWeek = Array.from(this.intents.values()).filter(i =>
      i.category === category && new Date(i.createdAt) >= twoWeeksAgo && new Date(i.createdAt) < weekAgo
    ).length;

    if (currentWeek > previousWeek * 1.1) return 'increasing';
    if (currentWeek < previousWeek * 0.9) return 'decreasing';
    return 'stable';
  }

  private calculateWeekOverWeekChange(category: IntentCategory, timeRange?: AnalyticsTimeRange): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = Array.from(this.intents.values()).filter(i =>
      i.category === category && new Date(i.createdAt) >= weekAgo
    ).length;

    const previousWeek = Array.from(this.intents.values()).filter(i =>
      i.category === category && new Date(i.createdAt) >= twoWeeksAgo && new Date(i.createdAt) < weekAgo
    ).length;

    if (previousWeek === 0) return currentWeek > 0 ? 100 : 0;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  }

  private calculateAverageSessionLength(intents: Intent[]): number {
    const sessions = [...new Set(intents.map(i => i.sessionId).filter(Boolean))];
    if (sessions.length === 0) return 0;

    let totalDuration = 0;
    for (const sessionId of sessions) {
      const sessionIntents = intents.filter(i => i.sessionId === sessionId);
      if (sessionIntents.length > 0) {
        const start = new Date(sessionIntents[0].createdAt).getTime();
        const end = new Date(sessionIntents[sessionIntents.length - 1].updatedAt).getTime();
        totalDuration += end - start;
      }
    }

    return totalDuration / sessions.length;
  }

  private determineUserSegment(intents: Intent[]): 'new' | 'active' | 'power' | 'churned' {
    const totalIntents = intents.length;
    const lastActivity = intents[0]?.updatedAt;
    const daysSinceActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    if (daysSinceActivity > 30) return 'churned';
    if (totalIntents > 50) return 'power';
    if (totalIntents > 10) return 'active';
    return 'new';
  }

  private groupByPeriod(intents: Intent[], granularity: 'hour' | 'day' | 'week' | 'month'): Map<string, Intent[]> {
    const groups = new Map<string, Intent[]>();

    for (const intent of intents) {
      const date = new Date(intent.createdAt);
      let period: string;

      switch (granularity) {
        case 'hour':
          period = `${date.toISOString().slice(0, 13)}:00:00.000Z`;
          break;
        case 'day':
          period = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          period = date.toISOString().slice(0, 7);
          break;
        default:
          period = date.toISOString().slice(0, 10);
      }

      if (!groups.has(period)) {
        groups.set(period, []);
      }
      groups.get(period)!.push(intent);
    }

    return groups;
  }

  private calculateOverallTrend(): number {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = Array.from(this.intents.values()).filter(i =>
      new Date(i.createdAt) >= weekAgo
    ).length;

    const previousWeek = Array.from(this.intents.values()).filter(i =>
      new Date(i.createdAt) >= twoWeeksAgo && new Date(i.createdAt) < weekAgo
    ).length;

    if (previousWeek === 0) return 0;
    return (currentWeek - previousWeek) / previousWeek;
  }

  private calculateVariance(intents: Intent[]): number {
    if (intents.length === 0) return 0;

    const mean = intents.length / 30;
    const squaredDiffs = intents.map((_, i) => Math.pow(i / 30 - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / intents.length);
  }

  private identifyKeyFactors(intents: Intent[]): string[] {
    const factors: string[] = [];

    // Time-based factors
    const hours = intents.map(i => new Date(i.createdAt).getHours());
    const peakHour = this.mode(hours);
    if (peakHour !== undefined) {
      factors.push(`Peak activity at ${peakHour}:00`);
    }

    // Category factors
    const categories = intents.map(i => i.category);
    const topCategory = this.mode(categories);
    if (topCategory) {
      factors.push(`Most intents are ${topCategory}`);
    }

    // Confidence factors
    const avgConfidence = intents.reduce((sum, i) => sum + i.confidence, 0) / intents.length;
    if (avgConfidence > 0.8) {
      factors.push('High average confidence level');
    } else if (avgConfidence < 0.6) {
      factors.push('Low average confidence - consider improving classification');
    }

    return factors;
  }

  private generateRecommendation(volume: number, confidence: number): string {
    if (confidence < 0.6) {
      return 'Low prediction confidence - gather more data for better forecasts';
    }

    if (volume > 1000) {
      return 'High volume predicted - consider scaling service capacity';
    }

    if (volume < 100) {
      return 'Low volume predicted - optimize for cost efficiency';
    }

    return 'Volume is within normal range - maintain current capacity';
  }

  private mode<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined;

    const counts = new Map<T, number>();
    for (const item of arr) {
      counts.set(item, (counts.get(item) || 0) + 1);
    }

    let maxCount = 0;
    let modeItem: T | undefined;
    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        modeItem = item;
      }
    });

    return modeItem;
  }

  private invalidateCache(): void {
    this.metricsCache.clear();
  }
}

// Export singleton instance
export const intentAnalytics = new IntentAnalytics();
