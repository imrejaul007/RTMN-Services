// ============================================================================
// SUTAR Network Learning - Trend Detection Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Trend,
  TrendDirection,
  TrendForecast,
  LearningData,
  Pattern
} from './types';

interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

interface TrendAnalysis {
  trendId: string;
  direction: TrendDirection;
  slope: number;
  intercept: number;
  rSquared: number;
  confidence: number;
  predictionInterval: { lower: number; upper: number };
}

interface SeasonalityAnalysis {
  period: number;
  amplitude: number;
  phase: number;
  strength: number;
}

class TrendDetectionService {
  private trends: Map<string, Trend> = new Map();
  private timeSeriesData: Map<string, TimeSeriesPoint[]> = new Map();
  private historicalData: LearningData[] = [];

  // Add data point to time series
  addDataPoint(metric: string, value: number, timestamp?: string, metadata?: Record<string, any>): void {
    if (!this.timeSeriesData.has(metric)) {
      this.timeSeriesData.set(metric, []);
    }

    this.timeSeriesData.get(metric)!.push({
      timestamp: timestamp || new Date().toISOString(),
      value,
      metadata
    });

    this.detectAndUpdateTrend(metric);
  }

  // Add learning data for trend analysis
  addLearningData(data: LearningData): void {
    this.historicalData.push(data);

    this.addDataPoint('success_rate', data.outcome === 'success' ? 1 : 0);
    this.addDataPoint('reward', data.reward || 0);

    if (data.metadata?.value !== undefined) {
      this.addDataPoint('custom_metric', data.metadata.value);
    }
  }

  // Detect and update trend for a metric
  private detectAndUpdateTrend(metric: string): void {
    const points = this.timeSeriesData.get(metric) || [];
    if (points.length < 5) return;

    const analysis = this.performTrendAnalysis(points);
    const trend = this.createOrUpdateTrend(metric, analysis, points);

    this.trends.set(metric, trend);
  }

  // Perform linear regression trend analysis
  private performTrendAnalysis(points: TimeSeriesPoint[]): TrendAnalysis {
    const n = points.length;
    const xValues = points.map((_, i) => i);
    const yValues = points.map(p => p.value);

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    let ssTotal = 0;
    let ssResidual = 0;

    points.forEach((p, i) => {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(p.value - yMean, 2);
      ssResidual += Math.pow(p.value - predicted, 2);
    });

    const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    const residuals = points.map((p, i) => p.value - (slope * i + intercept));
    const residualVariance = residuals.reduce((sum, r) => sum + r * r, 0) / (n - 2);
    const predictionInterval = 1.96 * Math.sqrt(residualVariance);

    return {
      trendId: `trend-${uuidv4()}`,
      direction: slope > 0.05 ? 'up' : slope < -0.05 ? 'down' : 'stable',
      slope,
      intercept,
      rSquared,
      confidence: Math.min(1, n / 30),
      predictionInterval: {
        lower: intercept - predictionInterval,
        upper: intercept + predictionInterval
      }
    };
  }

  // Create or update trend
  private createOrUpdateTrend(metric: string, analysis: TrendAnalysis, points: TimeSeriesPoint[]): Trend {
    const existingTrend = this.trends.get(metric);

    const velocity = existingTrend
      ? (analysis.slope - this.calculateSlope(existingTrend.direction)) / 1
      : analysis.slope;

    const forecast = this.generateForecast(analysis, 7);

    const trend: Trend = {
      id: existingTrend?.id || `trend-${uuidv4()}`,
      name: metric,
      direction: analysis.direction,
      strength: Math.abs(analysis.slope) * 10,
      velocity,
      startDate: points[0].timestamp,
      lastUpdated: new Date().toISOString(),
      dataPoints: points.length,
      forecast,
      relatedPatterns: this.findRelatedPatterns(metric),
      description: this.generateTrendDescription(metric, analysis)
    };

    return trend;
  }

  // Calculate slope from direction
  private calculateSlope(direction: TrendDirection): number {
    switch (direction) {
      case 'up': return 0.1;
      case 'down': return -0.1;
      default: return 0;
    }
  }

  // Generate forecast
  private generateForecast(analysis: TrendAnalysis, horizon: number): TrendForecast {
    const futureX = analysis.confidence * 30 + horizon;
    const predictedValue = analysis.slope * futureX + analysis.intercept;

    return {
      predictedValue,
      confidenceInterval: {
        lower: predictedValue - analysis.predictionInterval.lower * 2,
        upper: predictedValue + analysis.predictionInterval.upper * 2
      },
      horizon,
      model: 'linear_regression'
    };
  }

  // Find patterns related to this trend
  private findRelatedPatterns(metric: string): string[] {
    return this.historicalData
      .filter(d => d.metadata?.metric === metric)
      .slice(0, 5)
      .map(d => d.id);
  }

  // Generate trend description
  private generateTrendDescription(metric: string, analysis: TrendAnalysis): string {
    const direction = analysis.direction === 'up' ? 'increasing' : analysis.direction === 'down' ? 'decreasing' : 'stable';
    const rate = Math.abs(analysis.slope * 100).toFixed(2);

    if (analysis.rSquared > 0.8) {
      return `${metric} is ${direction} at a rate of ${rate}% per period with high confidence (R²=${analysis.rSquared.toFixed(2)})`;
    } else if (analysis.rSquared > 0.5) {
      return `${metric} shows moderate ${direction} trend (R²=${analysis.rSquared.toFixed(2)})`;
    } else {
      return `${metric} has weak trend signal - more data needed (R²=${analysis.rSquared.toFixed(2)})`;
    }
  }

  // Detect seasonality
  detectSeasonality(metric: string, suspectedPeriod?: number): SeasonalityAnalysis | null {
    const points = this.timeSeriesData.get(metric) || [];
    if (points.length < suspectedPeriod! * 2) return null;

    const period = suspectedPeriod || this.detectPeriod(points);
    const values = points.map(p => p.value);
    const n = values.length;

    const mean = values.reduce((a, b) => a + b, 0) / n;
    const detrended = values.map((v, i) => v - (i * (values[n - 1] - values[0]) / n + values[0]));

    let sinSum = 0;
    let cosSum = 0;
    let sinSinSum = 0;
    let sinCosSum = 0;
    let cosCosSum = 0;

    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * i) / period;
      sinSum += detrended[i] * Math.sin(angle);
      cosSum += detrended[i] * Math.cos(angle);
      sinSinSum += Math.sin(angle) * Math.sin(angle);
      sinCosSum += Math.sin(angle) * Math.cos(angle);
      cosCosSum += Math.cos(angle) * Math.cos(angle);
    }

    const amplitude = 2 * Math.sqrt(Math.pow(sinSum / n, 2) + Math.pow(cosSum / n, 2));
    const phase = Math.atan2(sinSum, cosSum);

    const seasonalComponent = values.reduce((sum, v, i) => {
      const angle = (2 * Math.PI * i) / period;
      return sum + Math.pow(v - mean - amplitude * Math.sin(angle + phase), 2);
    }, 0);

    const totalVariance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    const strength = totalVariance > 0 ? 1 - seasonalComponent / totalVariance : 0;

    return { period, amplitude, phase, strength };
  }

  // Auto-detect period
  private detectPeriod(points: TimeSeriesPoint[]): number {
    const n = points.length;
    const values = points.map(p => p.value);

    let maxCorrelation = 0;
    let bestPeriod = 7;

    for (let period = 3; period <= Math.min(30, n / 2); period++) {
      let correlation = 0;
      let count = 0;

      for (let i = 0; i < n - period; i++) {
        correlation += (values[i] - values[0]) * (values[i + period] - values[0]);
        count++;
      }

      if (count > 0) {
        correlation /= count;
        if (correlation > maxCorrelation) {
          maxCorrelation = correlation;
          bestPeriod = period;
        }
      }
    }

    return bestPeriod;
  }

  // Get all trends
  getTrends(filters?: {
    direction?: TrendDirection;
    minStrength?: number;
    metric?: string;
  }): Trend[] {
    let result = Array.from(this.trends.values());

    if (filters?.direction) {
      result = result.filter(t => t.direction === filters.direction);
    }
    if (filters?.minStrength !== undefined) {
      result = result.filter(t => t.strength >= filters.minStrength!);
    }
    if (filters?.metric) {
      result = result.filter(t => t.name === filters.metric);
    }

    return result.sort((a, b) => b.strength - a.strength);
  }

  // Get trend by ID or name
  getTrend(idOrName: string): Trend | undefined {
    return this.trends.get(idOrName) || Array.from(this.trends.values()).find(t => t.name === idOrName);
  }

  // Get time series data
  getTimeSeriesData(metric: string, from?: string, to?: string): TimeSeriesPoint[] {
    let points = this.timeSeriesData.get(metric) || [];

    if (from) {
      points = points.filter(p => p.timestamp >= from);
    }
    if (to) {
      points = points.filter(p => p.timestamp <= to);
    }

    return points.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // Detect emerging trends
  detectEmergingTrends(): Trend[] {
    return Array.from(this.trends.values())
      .filter(t => {
        const points = this.timeSeriesData.get(t.name) || [];
        if (points.length < 10) return false;

        const recentPoints = points.slice(-5);
        const olderPoints = points.slice(-10, -5);

        const recentAvg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
        const olderAvg = olderPoints.reduce((sum, p) => sum + p.value, 0) / olderPoints.length;

        return Math.abs(recentAvg - olderAvg) / (olderAvg || 1) > 0.2;
      })
      .sort((a, b) => b.strength - a.strength);
  }

  // Detect trend changes
  detectTrendChanges(): { metric: string; change: 'reversal' | 'acceleration' | 'deceleration'; details: string }[] {
    const changes: { metric: string; change: 'reversal' | 'acceleration' | 'deceleration'; details: string }[] = [];

    this.trends.forEach((trend, metric) => {
      const points = this.timeSeriesData.get(metric) || [];
      if (points.length < 20) return;

      const recentSlope = this.calculateRecentSlope(points, 5);
      const olderSlope = this.calculateRecentSlope(points.slice(-10, -5), 5);

      if (trend.direction === 'up' && recentSlope < 0 && olderSlope > 0) {
        changes.push({ metric, change: 'reversal', details: 'Upward trend reversed to downward' });
      } else if (trend.direction === 'down' && recentSlope > 0 && olderSlope < 0) {
        changes.push({ metric, change: 'reversal', details: 'Downward trend reversed to upward' });
      } else if (Math.abs(recentSlope) > Math.abs(olderSlope) * 1.5) {
        changes.push({ metric, change: 'acceleration', details: 'Trend is accelerating' });
      } else if (Math.abs(recentSlope) < Math.abs(olderSlope) * 0.5 && Math.abs(olderSlope) > 0.1) {
        changes.push({ metric, change: 'deceleration', details: 'Trend is decelerating' });
      }
    });

    return changes;
  }

  // Calculate recent slope
  private calculateRecentSlope(points: TimeSeriesPoint[], window: number): number {
    if (points.length < 2) return 0;

    const recentPoints = points.slice(-window);
    const n = recentPoints.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    recentPoints.forEach((p, i) => {
      sumX += i;
      sumY += p.value;
      sumXY += i * p.value;
      sumX2 += i * i;
    });

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  // Forecast trend
  forecastTrend(metric: string, horizon: number): TrendForecast | null {
    const points = this.timeSeriesData.get(metric) || [];
    if (points.length < 10) return null;

    const analysis = this.performTrendAnalysis(points);
    return this.generateForecast(analysis, horizon);
  }

  // Get trend statistics
  getStatistics(): {
    totalTrends: number;
    increasingTrends: number;
    decreasingTrends: number;
    stableTrends: number;
    avgStrength: number;
    avgDataPoints: number;
  } {
    const trends = Array.from(this.trends.values());

    return {
      totalTrends: trends.length,
      increasingTrends: trends.filter(t => t.direction === 'up').length,
      decreasingTrends: trends.filter(t => t.direction === 'down').length,
      stableTrends: trends.filter(t => t.direction === 'stable').length,
      avgStrength: trends.length > 0 ? trends.reduce((sum, t) => sum + t.strength, 0) / trends.length : 0,
      avgDataPoints: trends.length > 0 ? trends.reduce((sum, t) => sum + t.dataPoints, 0) / trends.length : 0
    };
  }

  // Clear all data
  clearData(): void {
    this.trends.clear();
    this.timeSeriesData.clear();
    this.historicalData = [];
  }

  // Export trend data
  exportTrendData(): {
    trends: Trend[];
    timeSeries: Record<string, TimeSeriesPoint[]>;
  } {
    const timeSeries: Record<string, TimeSeriesPoint[]> = {};
    this.timeSeriesData.forEach((points, metric) => {
      timeSeries[metric] = points;
    });

    return {
      trends: Array.from(this.trends.values()),
      timeSeries
    };
  }
}

export const trendDetectionService = new TrendDetectionService();
export default trendDetectionService;
