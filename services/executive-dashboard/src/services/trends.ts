import winston from 'winston';
import { TrendData, TimeSeriesPoint } from '../types';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// ============================================================================
// Trends Service - Trend Analysis and Detection
// ============================================================================

export class TrendsService {
  /**
   * Analyze trends for a specific metric
   */
  async analyzeTrends(tenantId: string, options?: {
    metric?: string;
    period?: string;
  }): Promise<{
    metric: string;
    trend: TrendData;
    dataPoints: TimeSeriesPoint[];
    insights: string[];
  }[]> {
    const { metric, period } = options || {};
    const metrics = metric ? [metric] : this.getDefaultMetrics();

    const results = [];

    for (const m of metrics) {
      const dataPoints = await this.getMetricTimeSeries(tenantId, m, period);
      const trend = this.calculateTrend(dataPoints);
      const insights = this.generateTrendInsights(m, trend, dataPoints);

      results.push({
        metric: m,
        trend,
        dataPoints,
        insights,
      });
    }

    return results;
  }

  /**
   * Get trend for a specific metric
   */
  async getMetricTrend(tenantId: string, metric: string, period?: string): Promise<TrendData> {
    const dataPoints = await this.getMetricTimeSeries(tenantId, metric, period);
    return this.calculateTrend(dataPoints);
  }

  /**
   * Get time series data for a metric
   */
  async getMetricTimeSeries(
    tenantId: string,
    metric: string,
    period?: string
  ): Promise<TimeSeriesPoint[]> {
    const days = this.parsePeriodDays(period);
    const points: TimeSeriesPoint[] = [];

    // Generate realistic time series data
    const baseValues: Record<string, number> = {
      revenue: 75000,
      users: 1200,
      conversion: 3.5,
      churn: 2.1,
      nps: 68,
      engagement: 72,
      support_tickets: 45,
      response_time: 150,
    };

    const baseValue = baseValues[metric] || 100;
    const volatility = this.getVolatility(metric);

    let currentValue = baseValue;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      // Add some realistic variation
      const randomChange = (Math.random() - 0.5) * volatility * baseValue;
      const trendComponent = (days - i) * (baseValue * 0.001); // slight upward trend
      currentValue = baseValue + randomChange + trendComponent;

      // Ensure positive values
      currentValue = Math.max(0.1, currentValue);

      points.push({
        timestamp: new Date(date),
        value: Math.round(currentValue * 100) / 100,
      });
    }

    return points;
  }

  /**
   * Detect anomalies in time series data
   */
  async detectAnomalies(
    tenantId: string,
    metric: string,
    period?: string
  ): Promise<{
    anomalies: { timestamp: Date; value: number; expected: number; deviation: number }[];
    threshold: number;
  }> {
    const dataPoints = await this.getMetricTimeSeries(tenantId, metric, period);
    const { anomalies, threshold } = this.analyzeAnomalies(dataPoints);

    return { anomalies, threshold };
  }

  /**
   * Compare trends across different periods
   */
  async comparePeriods(
    tenantId: string,
    metric: string,
    period1?: string,
    period2?: string
  ): Promise<{
    current: TrendData;
    previous: TrendData;
    change: number;
    improvement: boolean;
  }> {
    const [currentPoints, previousPoints] = await Promise.all([
      this.getMetricTimeSeries(tenantId, metric, period1),
      this.getMetricTimeSeries(tenantId, metric, period2),
    ]);

    const current = this.calculateTrend(currentPoints);
    const previous = this.calculateTrend(previousPoints);
    const change = current.changePercent - previous.changePercent;

    return {
      current,
      previous,
      change: Math.round(change * 10) / 10,
      improvement: change > 0,
    };
  }

  /**
   * Get trend forecasts based on historical data
   */
  async getTrendForecast(
    tenantId: string,
    metric: string,
    horizon: number = 30
  ): Promise<TimeSeriesPoint[]> {
    const historicalData = await this.getMetricTimeSeries(tenantId, metric, '90d');
    const trend = this.calculateTrend(historicalData);

    const forecast: TimeSeriesPoint[] = [];
    const lastPoint = historicalData[historicalData.length - 1];
    const lastValue = lastPoint.value;
    const dailyChange = (lastValue * trend.changePercent) / 100 / 30;

    for (let i = 1; i <= horizon; i++) {
      const date = new Date(lastPoint.timestamp);
      date.setDate(date.getDate() + i);

      const value = lastValue + dailyChange * i;
      forecast.push({
        timestamp: date,
        value: Math.round(value * 100) / 100,
      });
    }

    return forecast;
  }

  // =========================================================================
  // Private Helper Methods
  // =========================================================================

  private calculateTrend(dataPoints: TimeSeriesPoint[]): TrendData {
    if (dataPoints.length < 2) {
      return {
        direction: 'stable',
        changePercent: 0,
        velocity: 0,
        confidence: 0,
      };
    }

    const firstValue = dataPoints[0].value;
    const lastValue = dataPoints[dataPoints.length - 1].value;
    const changePercent = ((lastValue - firstValue) / firstValue) * 100;

    // Calculate velocity (rate of change per day)
    const days = Math.max(1, dataPoints.length - 1);
    const velocity = changePercent / days;

    // Calculate confidence based on data consistency
    const variance = this.calculateVariance(dataPoints.map(p => p.value));
    const avgValue = dataPoints.reduce((sum, p) => sum + p.value, 0) / dataPoints.length;
    const coefficientOfVariation = Math.sqrt(variance) / avgValue;
    const confidence = Math.max(0, Math.min(100, 100 - coefficientOfVariation * 100));

    let direction: 'up' | 'down' | 'stable';
    if (changePercent > 2) {
      direction = 'up';
    } else if (changePercent < -2) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    return {
      direction,
      changePercent: Math.round(changePercent * 10) / 10,
      velocity: Math.round(velocity * 100) / 100,
      confidence: Math.round(confidence),
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private analyzeAnomalies(dataPoints: TimeSeriesPoint[]): {
    anomalies: { timestamp: Date; value: number; expected: number; deviation: number }[];
    threshold: number;
  } {
    const values = dataPoints.map(p => p.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(this.calculateVariance(values));

    // Use 2 standard deviations as threshold
    const threshold = 2 * stdDev;
    const anomalies = [];

    for (const point of dataPoints) {
      const deviation = Math.abs(point.value - mean);
      if (deviation > threshold) {
        anomalies.push({
          timestamp: point.timestamp,
          value: point.value,
          expected: mean,
          deviation: Math.round((deviation / mean) * 100 * 100) / 100,
        });
      }
    }

    return { anomalies, threshold };
  }

  private generateTrendInsights(
    metric: string,
    trend: TrendData,
    dataPoints: TimeSeriesPoint[]
  ): string[] {
    const insights: string[] = [];
    const metricLabels: Record<string, string> = {
      revenue: 'Revenue',
      users: 'Active Users',
      conversion: 'Conversion Rate',
      churn: 'Churn Rate',
      nps: 'Net Promoter Score',
      engagement: 'User Engagement',
      support_tickets: 'Support Tickets',
      response_time: 'Response Time',
    };

    const label = metricLabels[metric] || metric;

    if (trend.direction === 'up') {
      insights.push(`${label} is trending upward with ${trend.changePercent}% growth`);
      if (trend.confidence > 80) {
        insights.push(`High confidence (${trend.confidence}%) in the positive trend`);
      }
    } else if (trend.direction === 'down') {
      insights.push(`${label} is trending downward with ${Math.abs(trend.changePercent)}% decline`);
      if (trend.confidence > 80) {
        insights.push(`This decline shows consistent patterns across the period`);
      }
    } else {
      insights.push(`${label} remains stable with minimal change`);
    }

    // Detect acceleration/deceleration
    const recentChange = this.getRecentChange(dataPoints);
    if (Math.abs(recentChange - trend.changePercent) > 5) {
      if (recentChange > trend.changePercent) {
        insights.push(`Trend is accelerating in recent period`);
      } else {
        insights.push(`Trend is decelerating, may be stabilizing`);
      }
    }

    return insights;
  }

  private getRecentChange(dataPoints: TimeSeriesPoint[]): number {
    if (dataPoints.length < 7) return 0;

    const recent = dataPoints.slice(-7);
    const earlier = dataPoints.slice(-14, -7);

    const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, p) => sum + p.value, 0) / earlier.length;

    return ((recentAvg - earlierAvg) / earlierAvg) * 100;
  }

  private getVolatility(metric: string): number {
    const volatilityMap: Record<string, number> = {
      revenue: 0.05,
      users: 0.03,
      conversion: 0.08,
      churn: 0.10,
      nps: 0.05,
      engagement: 0.06,
      support_tickets: 0.15,
      response_time: 0.12,
    };
    return volatilityMap[metric] || 0.05;
  }

  private getDefaultMetrics(): string[] {
    return ['revenue', 'users', 'conversion', 'churn', 'nps'];
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
}
