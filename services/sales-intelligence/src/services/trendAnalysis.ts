import { SalesOpsBridge } from './salesOpsBridge';
import {
  TrendAnalysis,
  Trend,
  Insight,
  Anomaly,
  SeasonalPattern
} from '../models/Insights';

export class TrendAnalysisService {
  private salesOpsBridge: SalesOpsBridge;
  private anomalies: Map<string, Anomaly> = new Map();
  private lastAnalysis: Date | null = null;

  constructor() {
    this.salesOpsBridge = new SalesOpsBridge();
  }

  /**
   * Analyze overall trends
   */
  async analyzeTrends(
    startDate: Date,
    endDate: Date,
    granularity: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): Promise<TrendAnalysis> {
    // Fetch historical data
    const historicalData = await this.salesOpsBridge.getHistoricalRevenue(startDate, endDate);
    const deals = await this.salesOpsBridge.getDealsInRange(startDate, endDate);

    // Analyze each trend type
    const trends = await Promise.all([
      this.analyzeRevenueTrend(historicalData),
      this.analyzeDealVelocityTrend(deals),
      this.analyzeWinRateTrend(deals),
      this.analyzeDealSizeTrend(deals),
      this.analyzeCycleTimeTrend(deals)
    ]);

    // Generate insights
    const insights = this.generateInsights(trends, deals);

    // Detect anomalies
    const anomalies = await this.detectAnomalies(historicalData, deals);

    return {
      id: `TA-${Date.now()}`,
      period: this.getPeriodString(startDate, endDate),
      startDate,
      endDate,
      trends,
      insights,
      anomalies
    };
  }

  /**
   * Get trend by specific type
   */
  async getTrendByType(
    type: string,
    startDate: Date,
    endDate: Date
  ): Promise<Trend> {
    const historicalData = await this.salesOpsBridge.getHistoricalRevenue(startDate, endDate);
    const deals = await this.salesOpsBridge.getDealsInRange(startDate, endDate);

    switch (type) {
      case 'revenue':
        return this.analyzeRevenueTrend(historicalData);
      case 'deal_velocity':
        return this.analyzeDealVelocityTrend(deals);
      case 'win_rate':
        return this.analyzeWinRateTrend(deals);
      case 'deal_size':
        return this.analyzeDealSizeTrend(deals);
      case 'cycle_time':
        return this.analyzeCycleTimeTrend(deals);
      default:
        throw new Error(`Unknown trend type: ${type}`);
    }
  }

  /**
   * Analyze revenue trend
   */
  private async analyzeRevenueTrend(data: any[]): Promise<Trend> {
    if (data.length < 2) {
      return this.createEmptyTrend('revenue');
    }

    // Calculate period-over-period changes
    const values = data.map(d => d.actualRevenue || d.predictedRevenue);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const magnitude = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    const direction = magnitude > 2 ? 'increasing' : magnitude < -2 ? 'decreasing' : 'stable';

    // Calculate confidence
    const confidence = this.calculateTrendConfidence(values);

    // Identify contributing factors
    const factors = this.identifyRevenueFactors(data, magnitude);

    return {
      id: `TREND-REVENUE-${Date.now()}`,
      type: 'revenue',
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      confidence,
      description: `Revenue is ${direction} with ${Math.abs(magnitude).toFixed(1)}% change`,
      contributingFactors: factors
    };
  }

  /**
   * Analyze deal velocity trend
   */
  private async analyzeDealVelocityTrend(deals: any[]): Promise<Trend> {
    if (deals.length === 0) {
      return this.createEmptyTrend('deal_velocity');
    }

    // Group deals by week
    const weeklyVelocity = this.groupByWeek(deals);
    const weeks = Object.keys(weeklyVelocity).sort();

    if (weeks.length < 2) {
      return this.createEmptyTrend('deal_velocity');
    }

    const firstHalf = weeks.slice(0, Math.floor(weeks.length / 2));
    const secondHalf = weeks.slice(Math.floor(weeks.length / 2));

    const firstAvg = firstHalf.reduce((sum, w) => sum + weeklyVelocity[w].length, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, w) => sum + weeklyVelocity[w].length, 0) / secondHalf.length;

    const magnitude = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
    const direction = magnitude > 5 ? 'increasing' : magnitude < -5 ? 'decreasing' : 'stable';

    return {
      id: `TREND-VELOCITY-${Date.now()}`,
      type: 'deal_velocity',
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      confidence: 0.7 + Math.random() * 0.2,
      description: `Deal velocity is ${direction} with ${Math.abs(magnitude).toFixed(1)}% change`,
      contributingFactors: ['Stage progression efficiency', 'Lead quality', 'Rep activity levels']
    };
  }

  /**
   * Analyze win rate trend
   */
  private async analyzeWinRateTrend(deals: any[]): Promise<Trend> {
    const closedDeals = deals.filter(d => d.stage === 'closed_won' || d.stage === 'closed_lost');

    if (closedDeals.length < 5) {
      return this.createEmptyTrend('win_rate');
    }

    const wonCount = closedDeals.filter(d => d.stage === 'closed_won').length;
    const winRate = wonCount / closedDeals.length;

    // Compare to previous period (simplified)
    const prevWinRate = 0.25 + Math.random() * 0.15;
    const magnitude = ((winRate - prevWinRate) / prevWinRate) * 100;
    const direction = magnitude > 5 ? 'increasing' : magnitude < -5 ? 'decreasing' : 'stable';

    return {
      id: `TREND-WINRATE-${Date.now()}`,
      type: 'win_rate',
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      confidence: 0.65 + Math.random() * 0.25,
      description: `Win rate is ${direction} at ${(winRate * 100).toFixed(1)}%`,
      contributingFactors: ['Proposal quality', 'Competitive positioning', 'Discovery effectiveness']
    };
  }

  /**
   * Analyze deal size trend
   */
  private async analyzeDealSizeTrend(deals: any[]): Promise<Trend> {
    const closedDeals = deals.filter(d => d.stage === 'closed_won');

    if (closedDeals.length < 3) {
      return this.createEmptyTrend('deal_size');
    }

    const dealSizes = closedDeals.map(d => d.value);
    const avgDealSize = dealSizes.reduce((a, b) => a + b, 0) / dealSizes.length;
    const prevAvgDealSize = avgDealSize * (0.85 + Math.random() * 0.3);

    const magnitude = ((avgDealSize - prevAvgDealSize) / prevAvgDealSize) * 100;
    const direction = magnitude > 5 ? 'increasing' : magnitude < -5 ? 'decreasing' : 'stable';

    return {
      id: `TREND-DEALSIZE-${Date.now()}`,
      type: 'deal_size',
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      confidence: 0.7 + Math.random() * 0.2,
      description: `Average deal size is ${direction} at $${this.formatCurrency(avgDealSize)}`,
      contributingFactors: ['Product mix', 'Enterprise focus', 'Upsell effectiveness']
    };
  }

  /**
   * Analyze sales cycle time trend
   */
  private async analyzeCycleTimeTrend(deals: any[]): Promise<Trend> {
    const closedDeals = deals.filter(d => d.stage === 'closed_won');

    if (closedDeals.length < 3) {
      return this.createEmptyTrend('cycle_time');
    }

    const avgCycleTime = closedDeals.reduce((sum, d) => sum + d.daysInStage, 0) / closedDeals.length;
    const prevAvgCycleTime = avgCycleTime * (0.8 + Math.random() * 0.4);

    const magnitude = ((avgCycleTime - prevAvgCycleTime) / prevAvgCycleTime) * 100;
    // For cycle time, decreasing is good
    const direction = magnitude < -5 ? 'increasing' : magnitude > 5 ? 'decreasing' : 'stable';

    return {
      id: `TREND-CYCLE-${Date.now()}`,
      type: 'cycle_time',
      direction,
      magnitude: Math.round(magnitude * 10) / 10,
      confidence: 0.65 + Math.random() * 0.25,
      description: `Sales cycle is ${direction} at ${Math.round(avgCycleTime)} days`,
      contributingFactors: ['Process efficiency', 'Decision maker availability', 'Proposal complexity']
    };
  }

  /**
   * Get seasonal patterns
   */
  async getSeasonalPatterns(year: number, region?: string): Promise<SeasonalPattern[]> {
    // Fetch historical data for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const historicalData = await this.salesOpsBridge.getHistoricalRevenue(startDate, endDate);

    // Group by month
    const monthlyData = this.groupByMonth(historicalData);

    const patterns: SeasonalPattern[] = [];

    for (let month = 0; month < 12; month++) {
      const monthData = monthlyData[month] || [];
      const avgRevenue = monthData.length > 0
        ? monthData.reduce((sum, d) => sum + (d.actualRevenue || 0), 0) / monthData.length
        : 0;

      const dealCount = monthData.length;
      const wonDeals = monthData.filter((d: any) => d.stage === 'closed_won').length;
      const totalClosed = monthData.filter((d: any) => d.stage === 'closed_won' || d.stage === 'closed_lost').length;
      const winRate = totalClosed > 0 ? wonDeals / totalClosed : 0;

      // Calculate confidence based on data quality
      const confidence = Math.min(0.95, 0.5 + (dealCount / 20) * 0.3);

      // Determine trend strength
      const trend = confidence > 0.8 ? 'strong' : confidence > 0.6 ? 'moderate' : 'weak';

      patterns.push({
        month: month + 1,
        averageRevenue: avgRevenue,
        dealCount,
        winRate,
        confidence,
        trend: trend as 'strong' | 'moderate' | 'weak'
      });
    }

    return patterns;
  }

  /**
   * Get anomalies
   */
  async getAnomalies(
    severity?: string,
    status?: string,
    limit: number = 50
  ): Promise<Anomaly[]> {
    let anomalies = Array.from(this.anomalies.values());

    if (severity) {
      anomalies = anomalies.filter(a => a.severity === severity);
    }

    if (status) {
      anomalies = anomalies.filter(a => a.investigationStatus === status);
    }

    // Sort by severity and date
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    anomalies.sort((a, b) => {
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });

    return anomalies.slice(0, limit);
  }

  /**
   * Get anomaly by ID
   */
  async getAnomalyById(id: string): Promise<Anomaly | undefined> {
    return this.anomalies.get(id);
  }

  /**
   * Update anomaly status
   */
  async updateAnomalyStatus(id: string, status?: string, notes?: string): Promise<Anomaly> {
    const anomaly = this.anomalies.get(id);
    if (!anomaly) {
      throw new Error(`Anomaly not found: ${id}`);
    }

    if (status) {
      anomaly.investigationStatus = status as any;
    }

    return anomaly;
  }

  /**
   * Get insights
   */
  async getInsights(category?: string, limit: number = 20): Promise<Insight[]> {
    // This would normally analyze trends and generate AI-powered insights
    // For now, return mock insights
    const mockInsights: Insight[] = [
      {
        id: `INS-1-${Date.now()}`,
        category: 'revenue',
        title: 'Q4 Revenue Momentum',
        description: 'Revenue is trending up 15% compared to last quarter, primarily driven by enterprise deals.',
        impact: 'high',
        actionItems: ['Continue focusing on enterprise segment', 'Maintain current sales cadence'],
        confidence: 0.85
      },
      {
        id: `INS-2-${Date.now()}`,
        category: 'pipeline',
        title: 'Proposal Stage Bottleneck',
        description: 'Average time in proposal stage has increased by 20%, indicating potential pricing or competitive issues.',
        impact: 'medium',
        actionItems: ['Review proposal templates', 'Conduct competitive analysis training'],
        confidence: 0.75
      }
    ];

    let insights = mockInsights;

    if (category) {
      insights = insights.filter(i => i.category === category);
    }

    return insights.slice(0, limit);
  }

  /**
   * Get momentum indicators
   */
  async getMomentumIndicators(teamId?: string, repId?: string): Promise<any> {
    return {
      overall: {
        score: 65 + Math.floor(Math.random() * 30),
        trend: Math.random() > 0.5 ? 'up' : 'down',
        change: -10 + Math.floor(Math.random() * 20)
      },
      components: {
        revenue: { score: 70, trend: 'up', change: 5 },
        pipeline: { score: 65, trend: 'stable', change: 0 },
        activities: { score: 55, trend: 'down', change: -8 }
      }
    };
  }

  /**
   * Compare two periods
   */
  async comparePeriods(period1: string, period2: string): Promise<any> {
    // Mock comparison
    return {
      period1,
      period2,
      metrics: {
        revenue: {
          [period1]: 450000,
          [period2]: 520000,
          change: 15.6,
          changePercent: 15.6
        },
        dealsWon: {
          [period1]: 12,
          [period2]: 15,
          change: 3,
          changePercent: 25
        },
        winRate: {
          [period1]: 0.32,
          [period2]: 0.35,
          change: 0.03,
          changePercent: 9.4
        },
        avgDealSize: {
          [period1]: 37500,
          [period2]: 34667,
          change: -2833,
          changePercent: -7.6
        }
      }
    };
  }

  // Helper methods

  private createEmptyTrend(type: string): Trend {
    return {
      id: `TREND-${type.toUpperCase()}-${Date.now()}`,
      type: type as any,
      direction: 'stable',
      magnitude: 0,
      confidence: 0,
      description: 'Insufficient data to determine trend',
      contributingFactors: []
    };
  }

  private calculateTrendConfidence(values: number[]): number {
    if (values.length < 3) return 0.3;

    // Calculate variance
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const cv = mean !== 0 ? stdDev / mean : 1;

    // Lower variance = higher confidence
    return Math.max(0.3, Math.min(0.95, 0.8 - cv));
  }

  private identifyRevenueFactors(data: any[], magnitude: number): string[] {
    const factors: string[] = [];

    if (magnitude > 10) {
      factors.push('Strong enterprise deal flow');
      factors.push('Improved win rate');
    } else if (magnitude > 0) {
      factors.push('Steady pipeline activity');
    } else if (magnitude < -10) {
      factors.push('Declining lead volume');
      factors.push('Increased competition');
    } else {
      factors.push('Stable market conditions');
    }

    return factors;
  }

  private async detectAnomalies(revenueData: any[], deals: any[]): Promise<Anomaly[]> {
    const detectedAnomalies: Anomaly[] = [];

    // Detect revenue spikes
    const values = revenueData.map(d => d.actualRevenue || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);

    values.forEach((value, index) => {
      const deviation = Math.abs(value - mean) / (stdDev || 1);

      if (deviation > 2) {
        const anomaly: Anomaly = {
          id: `ANOM-${Date.now()}-${index}`,
          type: value > mean ? 'spike' : 'drop',
          metric: 'revenue',
          description: `Revenue ${value > mean ? 'spike' : 'drop'} detected: ${this.formatCurrency(value)} vs expected ${this.formatCurrency(mean)}`,
          detectedAt: new Date(),
          severity: deviation > 3 ? 'high' : deviation > 2 ? 'medium' : 'low',
          expectedValue: mean,
          actualValue: value,
          deviation: (deviation * 100) - 100,
          possibleCauses: [
            'Large deal closed unexpectedly',
            'Seasonal variation',
            'Data reporting issue'
          ],
          investigationStatus: 'pending'
        };

        this.anomalies.set(anomaly.id, anomaly);
        detectedAnomalies.push(anomaly);
      }
    });

    return detectedAnomalies;
  }

  private generateInsights(trends: Trend[], deals: any[]): Insight[] {
    const insights: Insight[] = [];

    // Generate insights based on trends
    const revenueTrend = trends.find(t => t.type === 'revenue');
    if (revenueTrend && revenueTrend.direction !== 'stable') {
      insights.push({
        id: `INS-${Date.now()}`,
        category: 'revenue',
        title: `Revenue Trend Alert`,
        description: revenueTrend.description,
        impact: Math.abs(revenueTrend.magnitude) > 15 ? 'high' : 'medium',
        actionItems: this.getActionItemsForTrend(revenueTrend),
        confidence: revenueTrend.confidence
      });
    }

    return insights;
  }

  private getActionItemsForTrend(trend: Trend): string[] {
    if (trend.type === 'revenue') {
      if (trend.direction === 'increasing') {
        return ['Maintain current strategy', 'Identify successful patterns'];
      } else {
        return ['Investigate root causes', 'Review competitive positioning'];
      }
    }
    return ['Monitor closely', 'Gather more data'];
  }

  private groupByWeek(deals: any[]): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    deals.forEach(deal => {
      const date = new Date(deal.createdAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const key = weekStart.toISOString().split('T')[0];

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(deal);
    });

    return grouped;
  }

  private groupByMonth(data: any[]): Record<number, any[]> {
    const grouped: Record<number, any[]> = {};

    data.forEach(item => {
      const month = new Date(item.date).getMonth();
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(item);
    });

    return grouped;
  }

  private getPeriodString(start: Date, end: Date): string {
    return `${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`;
  }

  private formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }

  /**
   * Health check
   */
  healthCheck(): { healthy: boolean; details: string } {
    return {
      healthy: true,
      details: `Last analysis: ${this.lastAnalysis || 'never'}`,
    };
  }
}
