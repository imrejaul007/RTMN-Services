import { v4 as uuidv4 } from 'uuid';
import { CrowdProfile, CrowdPattern, PatternType, PatternMetrics } from '../models/CrowdProfile';

export interface PatternDetectionResult {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  deviation: number;
  confidence: number;
}

export class PatternDetector {
  private anomalyThreshold: number;
  private minSampleSize: number;
  private logger: any;

  constructor(logger: any) {
    this.anomalyThreshold = parseFloat(process.env.ANOMALY_THRESHOLD || '2.5');
    this.minSampleSize = parseInt(process.env.MIN_SAMPLE_SIZE || '10');
    this.logger = logger;
  }

  /**
   * Detect if a crowd profile is anomalous compared to historical data
   */
  detectAnomaly(
    profile: CrowdProfile,
    historicalProfiles: CrowdProfile[]
  ): PatternDetectionResult {
    const locationProfiles = historicalProfiles.filter(
      p => p.locationId === profile.locationId
    );

    if (locationProfiles.length < this.minSampleSize) {
      return {
        isAnomaly: false,
        severity: 'low',
        message: 'Insufficient historical data for anomaly detection',
        deviation: 0,
        confidence: 0
      };
    }

    // Calculate statistics
    const densities = locationProfiles.map(p => p.density);
    const mean = this.calculateMean(densities);
    const stdDev = this.calculateStdDev(densities, mean);

    if (stdDev === 0) {
      return {
        isAnomaly: false,
        severity: 'low',
        message: 'No variance in historical data',
        deviation: 0,
        confidence: 0
      };
    }

    // Calculate z-score
    const zScore = Math.abs((profile.density - mean) / stdDev);
    const deviation = zScore;

    // Determine if anomalous
    const isAnomaly = zScore > this.anomalyThreshold;

    if (isAnomaly) {
      let severity: 'low' | 'medium' | 'high' | 'critical';
      let message: string;

      if (zScore > 4) {
        severity = 'critical';
        message = `Critical anomaly detected: density ${profile.density.toFixed(2)} is ${zScore.toFixed(1)} std deviations from mean (${mean.toFixed(2)})`;
      } else if (zScore > 3) {
        severity = 'high';
        message = `High anomaly detected: density ${profile.density.toFixed(2)} significantly deviates from expected range`;
      } else if (zScore > this.anomalyThreshold) {
        severity = 'medium';
        message = `Medium anomaly detected: density ${profile.density.toFixed(2)} exceeds threshold`;
      } else {
        severity = 'low';
        message = `Minor anomaly detected: density ${profile.density.toFixed(2)} slightly above normal`;
      }

      this.logger?.info(`Anomaly detected: ${message}`);

      return {
        isAnomaly: true,
        severity,
        message,
        deviation: zScore,
        confidence: Math.min(zScore / 4, 1) // Normalize to 0-1
      };
    }

    return {
      isAnomaly: false,
      severity: 'low',
      message: 'Density within normal range',
      deviation: zScore,
      confidence: 1 - (zScore / this.anomalyThreshold)
    };
  }

  /**
   * Detect specific pattern type in crowd data
   */
  detectSpecificPattern(
    profiles: CrowdProfile[],
    type: PatternType,
    locationId: string
  ): CrowdPattern | null {
    if (profiles.length < 5) {
      return null;
    }

    // Sort by timestamp
    const sorted = [...profiles].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );

    const densities = sorted.map(p => p.density);
    const metrics = this.calculatePatternMetrics(densities, sorted);

    let patternDetected = false;
    let confidence = 0;

    switch (type) {
      case 'rush_hour':
        patternDetected = this.detectRushHour(densities);
        confidence = this.calculateRushHourConfidence(densities);
        break;

      case 'quiet_period':
        patternDetected = this.detectQuietPeriod(densities);
        confidence = this.calculateQuietPeriodConfidence(densities);
        break;

      case 'gradual_increase':
        patternDetected = this.detectGradualIncrease(densities);
        confidence = this.calculateTrendConfidence(densities, 'increase');
        break;

      case 'sudden_spike':
        patternDetected = this.detectSuddenSpike(densities);
        confidence = this.calculateSpikeConfidence(densities);
        break;

      case 'gradual_decrease':
        patternDetected = this.detectGradualDecrease(densities);
        confidence = this.calculateTrendConfidence(densities, 'decrease');
        break;

      case 'periodic':
        patternDetected = this.detectPeriodic(densities);
        confidence = this.calculatePeriodicConfidence(densities);
        break;

      case 'weekend_surge':
        patternDetected = this.detectWeekendSurge(sorted);
        confidence = this.calculateWeekendConfidence(sorted);
        break;

      case 'event_burst':
        patternDetected = this.detectEventBurst(densities);
        confidence = this.calculateEventConfidence(densities);
        break;
    }

    if (patternDetected && confidence > 0.6) {
      return {
        id: uuidv4(),
        type,
        locationId,
        startTime: sorted[0].timestamp,
        endTime: sorted[sorted.length - 1].timestamp,
        confidence,
        metrics,
        detectedAt: new Date()
      };
    }

    return null;
  }

  /**
   * Get summary of detected patterns
   */
  getPatternSummary(profiles: CrowdProfile[]): {
    dominantPattern: PatternType | null;
    averageDensity: number;
    peakDensity: number;
    peakTime: Date | null;
    patternTypes: Record<PatternType, boolean>;
  } {
    if (profiles.length === 0) {
      return {
        dominantPattern: null,
        averageDensity: 0,
        peakDensity: 0,
        peakTime: null,
        patternTypes: {
          rush_hour: false,
          quiet_period: false,
          gradual_increase: false,
          sudden_spike: false,
          gradual_decrease: false,
          periodic: false,
          weekend_surge: false,
          event_burst: false
        }
      };
    }

    const densities = profiles.map(p => p.density);
    const maxDensity = Math.max(...densities);
    const peakProfile = profiles.find(p => p.density === maxDensity);

    const patternTypes: Record<PatternType, boolean> = {
      rush_hour: this.detectRushHour(densities),
      quiet_period: this.detectQuietPeriod(densities),
      gradual_increase: this.detectGradualIncrease(densities),
      sudden_spike: this.detectSuddenSpike(densities),
      gradual_decrease: this.detectGradualDecrease(densities),
      periodic: this.detectPeriodic(densities),
      weekend_surge: this.detectWeekendSurge(profiles),
      event_burst: this.detectEventBurst(densities)
    };

    // Find dominant pattern
    const activePatterns = Object.entries(patternTypes)
      .filter(([, active]) => active)
      .map(([type]) => type);

    return {
      dominantPattern: activePatterns.length > 0 ? (activePatterns[0] as PatternType) : null,
      averageDensity: this.calculateMean(densities),
      peakDensity: maxDensity,
      peakTime: peakProfile?.timestamp || null,
      patternTypes
    };
  }

  /**
   * Analyze pattern characteristics
   */
  analyzePatternCharacteristics(
    profiles: CrowdProfile[],
    patternType?: string
  ): {
    characteristics: Record<string, number>;
    recommendations: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    if (profiles.length === 0) {
      return {
        characteristics: {},
        recommendations: [],
        riskLevel: 'low'
      };
    }

    const densities = profiles.map(p => p.density);
    const mean = this.calculateMean(densities);
    const variance = this.calculateVariance(densities, mean);
    const skewness = this.calculateSkewness(densities, mean, Math.sqrt(variance));

    const characteristics: Record<string, number> = {
      mean,
      variance,
      stdDev: Math.sqrt(variance),
      skewness,
      range: Math.max(...densities) - Math.min(...densities),
      stability: 1 - Math.sqrt(variance) // Higher is more stable
    };

    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (characteristics.stability < 0.5) {
      recommendations.push('High variability detected - consider stabilizing crowd flow');
      riskLevel = 'medium';
    }

    if (Math.abs(skewness) > 1) {
      recommendations.push('Skewed distribution - may indicate predictable patterns or issues');
      riskLevel = 'high';
    }

    if (mean > 0.8) {
      recommendations.push('High average density - consider crowd分流 measures');
      riskLevel = 'critical';
    }

    return { characteristics, recommendations, riskLevel };
  }

  // Private helper methods

  private calculateMean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private calculateVariance(values: number[], mean: number): number {
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private calculateStdDev(values: number[], mean: number): number {
    return Math.sqrt(this.calculateVariance(values, mean));
  }

  private calculateSkewness(values: number[], mean: number, stdDev: number): number {
    const n = values.length;
    const skewSum = values.reduce((sum, v) => sum + Math.pow((v - mean) / stdDev, 3), 0);
    return (n / ((n - 1) * (n - 2))) * skewSum;
  }

  private calculatePatternMetrics(
    densities: number[],
    profiles: CrowdProfile[]
  ): PatternMetrics {
    return {
      averageDensity: this.calculateMean(densities),
      peakDensity: Math.max(...densities),
      duration: profiles.length > 1
        ? (profiles[profiles.length - 1].timestamp.getTime() -
           profiles[0].timestamp.getTime()) / 60000
        : 0
    };
  }

  private detectRushHour(densities: number[]): boolean {
    if (densities.length < 10) return false;
    const mean = this.calculateMean(densities);
    const peakThreshold = mean * 1.5;
    const peakCount = densities.filter(d => d > peakThreshold).length;
    return peakCount >= densities.length * 0.2;
  }

  private calculateRushHourConfidence(densities: number[]): number {
    const mean = this.calculateMean(densities);
    const max = Math.max(...densities);
    if (max === 0) return 0;
    return Math.min((max - mean) / mean, 1);
  }

  private detectQuietPeriod(densities: number[]): boolean {
    if (densities.length < 10) return false;
    const mean = this.calculateMean(densities);
    const quietThreshold = mean * 0.3;
    const quietCount = densities.filter(d => d < quietThreshold).length;
    return quietCount >= densities.length * 0.3;
  }

  private calculateQuietPeriodConfidence(densities: number[]): number {
    const mean = this.calculateMean(densities);
    const min = Math.min(...densities);
    if (mean === 0) return 0;
    return Math.min(mean / (min + 0.1), 1);
  }

  private detectGradualIncrease(densities: number[]): boolean {
    if (densities.length < 5) return false;
    let increases = 0;
    for (let i = 1; i < densities.length; i++) {
      if (densities[i] > densities[i - 1]) {
        increases++;
      }
    }
    return increases >= densities.length * 0.6;
  }

  private detectGradualDecrease(densities: number[]): boolean {
    if (densities.length < 5) return false;
    let decreases = 0;
    for (let i = 1; i < densities.length; i++) {
      if (densities[i] < densities[i - 1]) {
        decreases++;
      }
    }
    return decreases >= densities.length * 0.6;
  }

  private detectSuddenSpike(densities: number[]): boolean {
    if (densities.length < 3) return false;
    const mean = this.calculateMean(densities);
    const stdDev = this.calculateStdDev(densities, mean);
    for (let i = 1; i < densities.length; i++) {
      const change = Math.abs(densities[i] - densities[i - 1]);
      if (stdDev > 0 && change > stdDev * 2) {
        return true;
      }
    }
    return false;
  }

  private calculateSpikeConfidence(densities: number[]): number {
    const mean = this.calculateMean(densities);
    const max = Math.max(...densities);
    const min = Math.min(...densities);
    const range = max - min;
    if (range === 0) return 0;
    return Math.min(range / mean, 1);
  }

  private detectPeriodic(densities: number[]): boolean {
    if (densities.length < 20) return false;
    // Simple autocorrelation check
    const mean = this.calculateMean(densities);
    const shifted = densities.slice(5);
    const original = densities.slice(0, -5);
    let correlation = 0;
    for (let i = 0; i < shifted.length; i++) {
      correlation += (shifted[i] - mean) * (original[i] - mean);
    }
    return correlation / densities.length > mean * 0.3;
  }

  private calculatePeriodicConfidence(densities: number[]): number {
    const mean = this.calculateMean(densities);
    const shifted = densities.slice(5);
    const original = densities.slice(0, -5);
    let correlation = 0;
    for (let i = 0; i < shifted.length; i++) {
      correlation += (shifted[i] - mean) * (original[i] - mean);
    }
    return Math.min(Math.abs(correlation / densities.length), 1);
  }

  private detectWeekendSurge(profiles: CrowdProfile[]): boolean {
    const weekendProfiles = profiles.filter(p => {
      const day = p.timestamp.getDay();
      return day === 0 || day === 6;
    });
    const weekdayProfiles = profiles.filter(p => {
      const day = p.timestamp.getDay();
      return day !== 0 && day !== 6;
    });

    if (weekendProfiles.length === 0 || weekdayProfiles.length === 0) {
      return false;
    }

    const weekendMean = this.calculateMean(weekendProfiles.map(p => p.density));
    const weekdayMean = this.calculateMean(weekdayProfiles.map(p => p.density));

    return weekendMean > weekdayMean * 1.3;
  }

  private calculateWeekendConfidence(profiles: CrowdProfile[]): number {
    const weekendProfiles = profiles.filter(p => {
      const day = p.timestamp.getDay();
      return day === 0 || day === 6;
    });
    const weekdayProfiles = profiles.filter(p => {
      const day = p.timestamp.getDay();
      return day !== 0 && day !== 6;
    });

    if (weekendProfiles.length === 0 || weekdayProfiles.length === 0) {
      return 0;
    }

    const weekendMean = this.calculateMean(weekendProfiles.map(p => p.density));
    const weekdayMean = this.calculateMean(weekdayProfiles.map(p => p.density));

    if (weekdayMean === 0) return 0;
    return Math.min((weekendMean - weekdayMean) / weekdayMean, 1);
  }

  private detectEventBurst(densities: number[]): boolean {
    if (densities.length < 10) return false;
    const mean = this.calculateMean(densities);
    const stdDev = this.calculateStdDev(densities, mean);
    const burstThreshold = mean + stdDev * 2;
    const burstCount = densities.filter(d => d > burstThreshold).length;
    return burstCount >= 3 && burstCount <= densities.length * 0.2;
  }

  private calculateEventConfidence(densities: number[]): number {
    const mean = this.calculateMean(densities);
    const max = Math.max(...densities);
    const eventProfiles = densities.filter(d => d > mean * 1.5);
    return eventProfiles.length / densities.length;
  }

  private calculateTrendConfidence(
    densities: number[],
    direction: 'increase' | 'decrease'
  ): number {
    if (densities.length < 2) return 0;

    const firstHalf = densities.slice(0, Math.floor(densities.length / 2));
    const secondHalf = densities.slice(Math.floor(densities.length / 2));

    const firstMean = this.calculateMean(firstHalf);
    const secondMean = this.calculateMean(secondHalf);

    if (direction === 'increase') {
      return Math.max(0, Math.min((secondMean - firstMean) / firstMean, 1));
    } else {
      return Math.max(0, Math.min((firstMean - secondMean) / firstMean, 1));
    }
  }
}