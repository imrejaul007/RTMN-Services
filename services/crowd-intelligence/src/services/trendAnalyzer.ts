import { v4 as uuidv4 } from 'uuid';
import { CrowdInsight, TrendData } from '../models/CrowdProfile';

export interface TrendAnalysisResult {
  direction: 'up' | 'down' | 'stable';
  velocity: number;
  acceleration: number;
  predictedValue: number;
  confidence: number;
  volatility: number;
}

export interface AggregatedTrend {
  timestamp: Date;
  avgDensity: number;
  maxDensity: number;
  minDensity: number;
  count: number;
}

export class TrendAnalyzer {
  private trendInterval: number;
  private historyHours: number;
  private logger: any;

  constructor(logger: any) {
    this.trendInterval = parseInt(process.env.TREND_INTERVAL_MS || '300000'); // 5 minutes
    this.historyHours = parseInt(process.env.TREND_HISTORY_HOURS || '24');
    this.logger = logger;
  }

  /**
   * Analyze trends in crowd data
   */
  analyzeTrends(
    trends: Array<{ timestamp: Date; metrics: any }>
  ): TrendAnalysisResult {
    if (trends.length < 2) {
      return {
        direction: 'stable',
        velocity: 0,
        acceleration: 0,
        predictedValue: trends[0]?.metrics?.avgDensity || 0,
        confidence: 0,
        volatility: 0
      };
    }

    const densities = trends.map(t => t.metrics?.avgDensity || 0);
    const timestamps = trends.map(t => t.timestamp.getTime());

    // Calculate velocity (rate of change)
    const velocity = this.calculateVelocity(densities, timestamps);

    // Calculate acceleration (change in velocity)
    const acceleration = this.calculateAcceleration(densities, timestamps);

    // Calculate volatility (standard deviation of changes)
    const volatility = this.calculateVolatility(densities);

    // Determine direction
    let direction: 'up' | 'down' | 'stable';
    if (velocity > 0.01) {
      direction = 'up';
    } else if (velocity < -0.01) {
      direction = 'down';
    } else {
      direction = 'stable';
    }

    // Simple linear prediction
    const predictedValue = this.predictNextValue(densities, velocity);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(trends.length, volatility);

    return {
      direction,
      velocity,
      acceleration,
      predictedValue,
      confidence,
      volatility
    };
  }

  /**
   * Predict future trends
   */
  predictFutureTrends(
    trends: Array<{ timestamp: Date; metrics: any }>,
    horizonMinutes: number
  ): TrendData[] {
    const predictions: TrendData[] = [];
    const densities = trends.map(t => t.metrics?.avgDensity || 0);
    const velocity = this.calculateVelocity(densities, trends.map(t => t.timestamp.getTime()));

    const lastTimestamp = trends[trends.length - 1]?.timestamp || new Date();
    const intervals = Math.floor(horizonMinutes / 5); // 5-minute intervals

    for (let i = 1; i <= intervals; i++) {
      const futureTime = new Date(lastTimestamp.getTime() + i * 5 * 60 * 1000);
      const predictedDensity = densities[densities.length - 1] + velocity * i;

      predictions.push({
        timestamp: futureTime,
        direction: velocity > 0 ? 'up' : velocity < 0 ? 'down' : 'stable',
        velocity: Math.max(0, velocity * (1 - i * 0.05)), // Decay velocity over time
        confidence: Math.max(0, 1 - i * 0.05),
        predicted: {
          value: Math.min(1, Math.max(0, predictedDensity)),
          timestamp: futureTime
        }
      });
    }

    return predictions;
  }

  /**
   * Aggregate trends by time interval
   */
  aggregateByInterval(
    trends: Array<{ timestamp: Date; metrics: any }>,
    interval: 'minute' | '5min' | '15min' | 'hour' | 'day'
  ): AggregatedTrend[] {
    const intervalMs = {
      minute: 60 * 1000,
      '5min': 5 * 60 * 1000,
      '15min': 15 * 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000
    }[interval];

    const buckets = new Map<number, number[]>();

    for (const trend of trends) {
      const bucketKey = Math.floor(trend.timestamp.getTime() / intervalMs) * intervalMs;
      const density = trend.metrics?.avgDensity || 0;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(density);
    }

    const aggregated: AggregatedTrend[] = [];

    for (const [timestamp, densities] of buckets) {
      aggregated.push({
        timestamp: new Date(timestamp),
        avgDensity: this.calculateMean(densities),
        maxDensity: Math.max(...densities),
        minDensity: Math.min(...densities),
        count: densities.length
      });
    }

    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Generate insights from trend data
   */
  generateInsights(
    trends: Array<{ timestamp: Date; metrics: any }>,
    locationId: string
  ): CrowdInsight[] {
    const insights: CrowdInsight[] = [];

    if (trends.length < 5) {
      return insights;
    }

    const analysis = this.analyzeTrends(trends);

    // Safety insights
    if (analysis.direction === 'up' && analysis.velocity > 0.05) {
      insights.push({
        id: `${locationId}-safety-${Date.now()}`,
        category: 'safety',
        title: 'Rising Crowd Density Detected',
        description: `Crowd density is increasing at a rate of ${(analysis.velocity * 100).toFixed(1)}% per measurement period. Consider preparing crowd control measures.`,
        metrics: {
          velocity: analysis.velocity,
          currentDensity: trends[trends.length - 1]?.metrics?.avgDensity || 0
        },
        recommendations: [
          'Increase monitoring frequency',
          'Prepare crowd分流 routes',
          'Alert staff to potential congestion'
        ],
        confidence: analysis.confidence,
        timestamp: new Date()
      });
    }

    // Efficiency insights
    const optimalDensity = 0.6;
    const currentDensity = trends[trends.length - 1]?.metrics?.avgDensity || 0;
    const efficiency = 1 - Math.abs(currentDensity - optimalDensity);

    if (efficiency < 0.5) {
      insights.push({
        id: `${locationId}-efficiency-${Date.now()}`,
        category: 'efficiency',
        title: 'Suboptimal Crowd Density',
        description: currentDensity > optimalDensity
          ? 'Current density is higher than optimal, reducing operational efficiency.'
          : 'Current density is lower than optimal, indicating underutilization.',
        metrics: {
          currentDensity,
          optimalDensity,
          efficiency
        },
        recommendations: currentDensity > optimalDensity
          ? ['Implement crowd分流', 'Add signage to distribute crowds']
          : ['Promote activity', 'Schedule events to attract visitors'],
        confidence: 1 - efficiency,
        timestamp: new Date()
      });
    }

    // Experience insights
    const peakZones = trends[trends.length - 1]?.metrics?.peakZones || [];
    if (peakZones.length > 0) {
      insights.push({
        id: `${locationId}-experience-${Date.now()}`,
        category: 'experience',
        title: 'High-Traffic Zones Identified',
        description: `The following zones have the highest crowd density: ${peakZones.join(', ')}. Consider adding wayfinding or staff.',
        metrics: {
          zoneCount: peakZones.length,
          zones: peakZones.length
        },
        recommendations: [
          `Add wayfinding to ${peakZones[0] || 'high-traffic zones'}`,
          'Consider temporary barriers to manage flow',
          'Position staff in identified peak zones'
        ],
        confidence: 0.8,
        timestamp: new Date()
      });
    }

    // Operational insights
    if (analysis.volatility > 0.2) {
      insights.push({
        id: `${locationId}-operational-${Date.now()}`,
        category: 'operational',
        title: 'High Crowd Volatility Detected',
        description: `Crowd density fluctuates significantly (volatility: ${(analysis.volatility * 100).toFixed(1)}%). This may require flexible staffing.`,
        metrics: {
          volatility: analysis.volatility,
          velocity: analysis.velocity,
          acceleration: analysis.acceleration
        },
        recommendations: [
          'Implement flexible staffing model',
          'Pre-position resources for rapid changes',
          'Set up automated alerts for density changes'
        ],
        confidence: analysis.confidence,
        timestamp: new Date()
      });
    }

    return insights;
  }

  // Private helper methods

  private calculateVelocity(densities: number[], timestamps: number[]): number {
    if (densities.length < 2) return 0;

    // Use linear regression to find slope
    const n = densities.length;
    const sumX = timestamps.reduce((sum, t) => sum + t, 0);
    const sumY = densities.reduce((sum, d) => sum + d, 0);
    const sumXY = timestamps.reduce((sum, t, i) => sum + t * densities[i], 0);
    const sumX2 = timestamps.reduce((sum, t) => sum + t * t, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope * 60000; // Normalize to per-minute change
  }

  private calculateAcceleration(densities: number[], timestamps: number[]): number {
    if (densities.length < 3) return 0;

    // Calculate velocity at different points
    const firstHalf = densities.slice(0, Math.floor(densities.length / 2));
    const secondHalf = densities.slice(Math.floor(densities.length / 2));

    const firstTimestamps = timestamps.slice(0, Math.floor(densities.length / 2));
    const secondTimestamps = timestamps.slice(Math.floor(densities.length / 2));

    const firstVelocity = this.calculateVelocity(firstHalf, firstTimestamps);
    const secondVelocity = this.calculateVelocity(secondHalf, secondTimestamps);

    return secondVelocity - firstVelocity;
  }

  private calculateVolatility(densities: number[]): number {
    if (densities.length < 2) return 0;

    const mean = this.calculateMean(densities);
    const variance = densities.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / densities.length;

    // Normalize by mean to get relative volatility
    return Math.sqrt(variance) / (mean || 1);
  }

  private predictNextValue(densities: number[], velocity: number): number {
    const lastValue = densities[densities.length - 1] || 0;
    return Math.min(1, Math.max(0, lastValue + velocity));
  }

  private calculateConfidence(dataPoints: number, volatility: number): number {
    // More data points = higher confidence
    // Lower volatility = higher confidence
    const dataConfidence = Math.min(dataPoints / 20, 1);
    const volatilityConfidence = 1 - Math.min(volatility, 1);
    return (dataConfidence + volatilityConfidence) / 2;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}