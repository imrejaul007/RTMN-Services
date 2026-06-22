/**
 * Trend Analysis Service
 *
 * Analyzes historical assessment data to identify trends, predict decline,
 * and recommend reassessment timing for healthcare assessments.
 */

import {
  Assessment,
  AssessmentHistory,
  AssessmentType,
  RiskLevel,
  IAssessment
} from '../models/assessment';
import { logger } from '../utils/logger';

export interface TrendDataPoint {
  date: Date;
  score: number;
  maxScore: number;
  riskLevel: RiskLevel;
  assessmentId: string;
}

export interface TrendAnalysis {
  patientId: string;
  assessmentType: AssessmentType;
  dataPoints: TrendDataPoint[];
  period: {
    start: Date;
    end: Date;
    days: number;
  };
  statistics: {
    count: number;
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
    range: number;
    trend: 'improving' | 'stable' | 'declining' | 'fluctuating';
    slope: number; // points per day
    changeFromBaseline: number;
    percentChangeFromBaseline: number;
    changeFromLast: number;
  };
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
    noRisk: number;
  };
  alerts: TrendAlert[];
  recommendations: string[];
}

export interface TrendAlert {
  type: 'warning' | 'critical' | 'info';
  message: string;
  details?: string;
  generatedAt: Date;
}

export interface DeclinePrediction {
  patientId: string;
  assessmentType: AssessmentType;
  predictionDate: Date;
  predictedDecline: boolean;
  confidence: number; // 0-1
  predictedDeclineDate?: Date;
  riskFactors: string[];
  timeToHighRisk?: number; // days
  recommendations: string[];
}

export interface ReassessmentRecommendation {
  patientId: string;
  assessmentType: AssessmentType;
  recommendedDate: Date;
  urgency: 'routine' | 'soon' | 'urgent';
  reason: string;
  previousAssessmentDate: Date;
  daysSinceLastAssessment: number;
  riskLevel: RiskLevel;
}

class TrendAnalysisService {
  // Configuration
  private readonly MIN_DATA_POINTS = 3;
  private readonly DECLINE_LOOKBACK_DAYS = 30;
  private readonly SIGNIFICANT_CHANGE_THRESHOLD = 0.15; // 15% change

  /**
   * Analyze score trends for a patient
   */
  async analyzeScoreTrends(
    patientId: string,
    assessmentType: AssessmentType,
    options?: {
      startDate?: Date;
      endDate?: Date;
      days?: number;
    }
  ): Promise<TrendAnalysis> {
    const endDate = options?.endDate || new Date();
    const startDate = options?.startDate || new Date(endDate.getTime() - (options?.days || 90) * 24 * 60 * 60 * 1000);

    // Fetch assessments
    const assessments = await Assessment.find({
      patientId,
      type: assessmentType,
      status: 'completed',
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: 1 })
      .lean();

    if (assessments.length < this.MIN_DATA_POINTS) {
      throw new Error(
        `Insufficient data for trend analysis. Need at least ${this.MIN_DATA_POINTS} assessments, found ${assessments.length}`
      );
    }

    const dataPoints: TrendDataPoint[] = assessments.map((a) => ({
      date: a.date,
      score: a.score.score,
      maxScore: a.score.maxScore,
      riskLevel: a.riskLevel as RiskLevel,
      assessmentId: a.assessmentId
    }));

    const statistics = this.calculateStatistics(dataPoints);
    const riskDistribution = this.calculateRiskDistribution(dataPoints);
    const alerts = this.generateAlerts(dataPoints, statistics, assessmentType);
    const recommendations = this.generateRecommendations(statistics, riskDistribution, assessmentType);

    return {
      patientId,
      assessmentType,
      dataPoints,
      period: {
        start: startDate,
        end: endDate,
        days: Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      },
      statistics,
      riskDistribution,
      alerts,
      recommendations
    };
  }

  /**
   * Predict patient decline based on historical data
   */
  async predictDecline(
    patientId: string,
    assessmentType: AssessmentType
  ): Promise<DeclinePrediction> {
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - this.DECLINE_LOOKBACK_DAYS);

    // Get assessments for analysis
    const assessments = await Assessment.find({
      patientId,
      type: assessmentType,
      status: 'completed',
      date: { $gte: lookbackDate }
    })
      .sort({ date: 1 })
      .lean();

    const riskFactors: string[] = [];
    let confidence = 0.5;
    let predictedDecline = false;
    let predictedDeclineDate: Date | undefined;
    let timeToHighRisk: number | undefined;

    if (assessments.length < this.MIN_DATA_POINTS) {
      return {
        patientId,
        assessmentType,
        predictionDate: new Date(),
        predictedDecline: false,
        confidence: 0.3,
        riskFactors: ['Insufficient data for reliable prediction'],
        recommendations: ['Continue regular assessments to improve prediction accuracy']
      };
    }

    // Check for consistent decline
    const scores = assessments.map((a) => a.score.score);
    const { slope, trend } = this.calculateLinearRegression(scores);

    // Determine if scales are inverted (lower = worse)
    const isInvertedScale = this.isInvertedScaleType(assessmentType);

    // Analyze decline patterns
    if (isInvertedScale) {
      // For inverted scales (Braden, MMSE), negative slope = decline
      if (slope < -0.05) {
        predictedDecline = true;
        confidence = Math.min(0.9, 0.5 + Math.abs(slope) * 10);
        riskFactors.push(`Consistent decline trend detected (slope: ${slope.toFixed(3)})`);

        // Calculate time to high risk threshold
        const lastScore = scores[scores.length - 1];
        const highRiskThreshold = this.getHighRiskThreshold(assessmentType);
        timeToHighRisk = this.estimateDaysToThreshold(lastScore, slope, highRiskThreshold, isInvertedScale);
      }
    } else {
      // For normal scales (MUST, Morse, PHQ9, GAD7), positive slope = decline
      if (slope > 0.05) {
        predictedDecline = true;
        confidence = Math.min(0.9, 0.5 + Math.abs(slope) * 10);
        riskFactors.push(`Consistent worsening trend detected (slope: ${slope.toFixed(3)})`);

        const lastScore = scores[scores.length - 1];
        const highRiskThreshold = this.getHighRiskThreshold(assessmentType);
        timeToHighRisk = this.estimateDaysToThreshold(lastScore, slope, highRiskThreshold, isInvertedScale);
      }
    }

    // Check for recent significant change
    if (scores.length >= 2) {
      const recentChange = (scores[scores.length - 1] - scores[scores.length - 2]) / scores[scores.length - 2];
      if (Math.abs(recentChange) > this.SIGNIFICANT_CHANGE_THRESHOLD) {
        riskFactors.push(`Recent significant change detected: ${(recentChange * 100).toFixed(1)}%`);
        confidence = Math.min(0.9, confidence + 0.2);
      }
    }

    // Check for escalating risk levels
    const riskLevels = assessments.map((a) => a.riskLevel);
    const escalationPattern = this.detectEscalation(riskLevels);
    if (escalationPattern.escalating) {
      riskFactors.push('Risk level escalation pattern detected');
      confidence = Math.min(0.95, confidence + 0.2);
      predictedDecline = true;
    }

    // Check for volatility
    const volatility = this.calculateVolatility(scores);
    if (volatility > 0.2) {
      riskFactors.push(`High score volatility detected (CV: ${(volatility * 100).toFixed(1)}%)`);
    }

    // Calculate predicted decline date if decline is predicted
    if (predictedDecline && slope !== 0) {
      predictedDeclineDate = new Date();
      const daysToChange = Math.abs(10 / slope); // Time for 10-point change
      predictedDeclineDate.setDate(predictedDeclineDate.getDate() + Math.round(daysToChange));
    }

    return {
      patientId,
      assessmentType,
      predictionDate: new Date(),
      predictedDecline,
      confidence: Math.round(confidence * 100) / 100,
      predictedDeclineDate,
      riskFactors,
      timeToHighRisk,
      recommendations: this.generateDeclineRecommendations(predictedDecline, riskFactors, assessmentType)
    };
  }

  /**
   * Recommend when to reassess a patient
   */
  async recommendReassessment(
    patientId: string,
    assessmentType: AssessmentType
  ): Promise<ReassessmentRecommendation> {
    const latestAssessment = await Assessment.findOne({
      patientId,
      type: assessmentType,
      status: 'completed'
    })
      .sort({ date: -1 })
      .lean();

    if (!latestAssessment) {
      return {
        patientId,
        assessmentType,
        recommendedDate: new Date(),
        urgency: 'urgent',
        reason: 'No previous assessment found. Initial assessment required.',
        previousAssessmentDate: new Date(0),
        daysSinceLastAssessment: Infinity,
        riskLevel: RiskLevel.Unknown
      };
    }

    const daysSinceLastAssessment = Math.round(
      (Date.now() - latestAssessment.date.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Determine urgency based on risk level and time since last assessment
    const riskLevel = latestAssessment.riskLevel as RiskLevel;
    const recommendedDate = this.calculateRecommendedDate(latestAssessment.date, riskLevel, assessmentType);
    const urgency = this.determineUrgency(recommendedDate, daysSinceLastAssessment);

    return {
      patientId,
      assessmentType,
      recommendedDate,
      urgency,
      reason: this.generateReassessmentReason(riskLevel, daysSinceLastAssessment, assessmentType),
      previousAssessmentDate: latestAssessment.date,
      daysSinceLastAssessment,
      riskLevel
    };
  }

  /**
   * Get multi-assessment trends for a patient
   */
  async getPatientOverview(
    patientId: string,
    days: number = 90
  ): Promise<{
    assessments: TrendAnalysis[];
    overallRiskLevel: RiskLevel;
    criticalAlerts: TrendAlert[];
    reassessmentSchedule: ReassessmentRecommendation[];
  }> {
    const assessmentTypes = [
      AssessmentType.MUST,
      AssessmentType.Braden,
      AssessmentType.Morse_Fall,
      AssessmentType.PHQ9,
      AssessmentType.GAD7
    ];

    const assessments: TrendAnalysis[] = [];
    const criticalAlerts: TrendAlert[] = [];
    const reassessmentSchedule: ReassessmentRecommendation[] = [];

    for (const type of assessmentTypes) {
      try {
        const trend = await this.analyzeScoreTrends(patientId, type, { days });
        assessments.push(trend);
        criticalAlerts.push(...trend.alerts.filter((a) => a.type === 'critical'));

        const reassess = await this.recommendReassessment(patientId, type);
        reassessmentSchedule.push(reassess);
      } catch {
        // Skip types with insufficient data
      }
    }

    // Calculate overall risk level
    const latestRisks = assessments
      .map((a) => {
        const latest = a.dataPoints[a.dataPoints.length - 1];
        return latest?.riskLevel || RiskLevel.Unknown;
      })
      .filter((r) => r !== RiskLevel.Unknown);

    const overallRiskLevel = this.calculateOverallRisk(latestRisks);

    return {
      assessments,
      overallRiskLevel,
      criticalAlerts,
      reassessmentSchedule
    };
  }

  /**
   * Calculate statistics from data points
   */
  private calculateStatistics(dataPoints: TrendDataPoint[]): TrendAnalysis['statistics'] {
    const scores = dataPoints.map((dp) => dp.score);
    const n = scores.length;

    // Sort for median
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = n % 2 === 0
      ? (sortedScores[n / 2 - 1] + sortedScores[n / 2]) / 2
      : sortedScores[Math.floor(n / 2)];

    // Mean
    const mean = scores.reduce((a, b) => a + b, 0) / n;

    // Standard deviation
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Linear regression for trend
    const { slope, trend } = this.calculateLinearRegression(scores);

    // Changes
    const baselineScore = scores[0];
    const lastScore = scores[n - 1];
    const changeFromBaseline = lastScore - baselineScore;
    const percentChangeFromBaseline = baselineScore !== 0
      ? (changeFromBaseline / baselineScore) * 100
      : 0;
    const changeFromLast = n > 1 ? scores[n - 1] - scores[n - 2] : 0;

    return {
      count: n,
      mean: Math.round(mean * 100) / 100,
      median,
      stdDev: Math.round(stdDev * 100) / 100,
      min: Math.min(...scores),
      max: Math.max(...scores),
      range: Math.max(...scores) - Math.min(...scores),
      trend,
      slope: Math.round(slope * 1000) / 1000,
      changeFromBaseline: Math.round(changeFromBaseline * 100) / 100,
      percentChangeFromBaseline: Math.round(percentChangeFromBaseline * 100) / 100,
      changeFromLast: Math.round(changeFromLast * 100) / 100
    };
  }

  /**
   * Calculate linear regression
   */
  private calculateLinearRegression(scores: number[]): { slope: number; trend: TrendAnalysis['statistics']['trend'] } {
    const n = scores.length;
    if (n < 2) {
      return { slope: 0, trend: 'stable' };
    }

    // x = index, y = score
    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Calculate coefficient of variation for stability
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - yMean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / yMean;

    // Determine trend
    let trend: TrendAnalysis['statistics']['trend'];
    if (Math.abs(slope) < 0.5 && cv < 0.1) {
      trend = 'stable';
    } else if (cv > 0.2) {
      trend = 'fluctuating';
    } else {
      trend = slope > 0 ? (this.isInvertedScaleType(AssessmentType.General) ? 'declining' : 'improving')
        : (this.isInvertedScaleType(AssessmentType.General) ? 'improving' : 'declining');
    }

    return { slope, trend };
  }

  /**
   * Calculate risk distribution
   */
  private calculateRiskDistribution(dataPoints: TrendDataPoint[]): TrendAnalysis['riskDistribution'] {
    const distribution: TrendAnalysis['riskDistribution'] = {
      low: 0,
      medium: 0,
      high: 0,
      veryHigh: 0,
      noRisk: 0
    };

    for (const dp of dataPoints) {
      switch (dp.riskLevel) {
        case RiskLevel.Low:
          distribution.low++;
          break;
        case RiskLevel.Medium:
          distribution.medium++;
          break;
        case RiskLevel.High:
          distribution.high++;
          break;
        case RiskLevel.VeryHigh:
          distribution.veryHigh++;
          break;
        case RiskLevel.NoRisk:
          distribution.noRisk++;
          break;
      }
    }

    // Convert to percentages
    const total = dataPoints.length;
    return {
      low: Math.round((distribution.low / total) * 100),
      medium: Math.round((distribution.medium / total) * 100),
      high: Math.round((distribution.high / total) * 100),
      veryHigh: Math.round((distribution.veryHigh / total) * 100),
      noRisk: Math.round((distribution.noRisk / total) * 100)
    };
  }

  /**
   * Generate alerts based on trend analysis
   */
  private generateAlerts(
    dataPoints: TrendDataPoint[],
    statistics: TrendAnalysis['statistics'],
    assessmentType: AssessmentType
  ): TrendAlert[] {
    const alerts: TrendAlert[] = [];
    const latestRisk = dataPoints[dataPoints.length - 1]?.riskLevel;

    // High risk alert
    if (latestRisk === RiskLevel.High || latestRisk === RiskLevel.VeryHigh) {
      alerts.push({
        type: 'critical',
        message: `Current risk level is ${latestRisk}`,
        details: 'Immediate intervention recommended',
        generatedAt: new Date()
      });
    }

    // Declining trend alert
    if (statistics.trend === 'declining') {
      alerts.push({
        type: 'warning',
        message: 'Declining score trend detected',
        details: `Average decline rate: ${Math.abs(statistics.slope).toFixed(3)} points/day`,
        generatedAt: new Date()
      });
    }

    // Significant change alert
    if (Math.abs(statistics.percentChangeFromBaseline) > 20) {
      alerts.push({
        type: 'warning',
        message: `Significant change from baseline: ${statistics.percentChangeFromBaseline > 0 ? '+' : ''}${statistics.percentChangeFromBaseline.toFixed(1)}%`,
        details: `From ${dataPoints[0].score} to ${dataPoints[dataPoints.length - 1].score}`,
        generatedAt: new Date()
      });
    }

    // Volatility alert
    if (statistics.stdDev / statistics.mean > 0.2) {
      alerts.push({
        type: 'info',
        message: 'High score variability detected',
        details: `Standard deviation: ${statistics.stdDev}, Coefficient of variation: ${((statistics.stdDev / statistics.mean) * 100).toFixed(1)}%`,
        generatedAt: new Date()
      });
    }

    // Fluctuating trend alert
    if (statistics.trend === 'fluctuating') {
      alerts.push({
        type: 'warning',
        message: 'Unstable score pattern detected',
        details: 'Scores are fluctuating significantly, consider investigating causes',
        generatedAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    statistics: TrendAnalysis['statistics'],
    riskDistribution: TrendAnalysis['riskDistribution'],
    assessmentType: AssessmentType
  ): string[] {
    const recommendations: string[] = [];

    // Trend-based recommendations
    switch (statistics.trend) {
      case 'declining':
        recommendations.push('Review care plan for potential interventions');
        recommendations.push('Consider specialist referral if decline continues');
        break;
      case 'improving':
        recommendations.push('Continue current care plan');
        recommendations.push('Document factors contributing to improvement');
        break;
      case 'fluctuating':
        recommendations.push('Investigate causes of score variability');
        recommendations.push('Consider more frequent monitoring');
        break;
      case 'stable':
        recommendations.push('Maintain current monitoring schedule');
        break;
    }

    // Risk-based recommendations
    if (riskDistribution.high + riskDistribution.veryHigh > 30) {
      recommendations.push('High proportion of high-risk readings - consider escalation of care');
    }

    // Frequency recommendations
    if (statistics.trend === 'declining' || statistics.trend === 'fluctuating') {
      recommendations.push('Increase assessment frequency to weekly');
    } else {
      recommendations.push('Maintain regular assessment schedule');
    }

    return recommendations;
  }

  /**
   * Check if assessment type uses inverted scale
   */
  private isInvertedScaleType(type: AssessmentType): boolean {
    const invertedTypes = [
      AssessmentType.Braden,
      AssessmentType.MMSE,
      AssessmentType.Barthel_Index
    ];
    return invertedTypes.includes(type);
  }

  /**
   * Get high risk threshold for assessment type
   */
  private getHighRiskThreshold(type: AssessmentType): number {
    const thresholds: Record<string, number> = {
      [AssessmentType.MUST]: 2,
      [AssessmentType.Braden]: 9,
      [AssessmentType.Morse_Fall]: 50,
      [AssessmentType.PHQ9]: 15,
      [AssessmentType.GAD7]: 15,
      [AssessmentType.MMSE]: 18,
      [AssessmentType.Barthel_Index]: 40,
      [AssessmentType.WATERLOW]: 15,
      [AssessmentType.General]: 70
    };
    return thresholds[type] || 50;
  }

  /**
   * Estimate days to reach a threshold
   */
  private estimateDaysToThreshold(
    currentScore: number,
    slope: number,
    threshold: number,
    isInvertedScale: boolean
  ): number | undefined {
    if (slope === 0) return undefined;

    let daysToThreshold: number;
    if (isInvertedScale) {
      // For inverted scales, high score = good, low score = bad
      if (currentScore <= threshold) return 0; // Already at threshold
      daysToThreshold = (currentScore - threshold) / Math.abs(slope);
    } else {
      // For normal scales, high score = bad
      if (currentScore >= threshold) return 0; // Already at threshold
      daysToThreshold = (threshold - currentScore) / slope;
    }

    return Math.round(daysToThreshold);
  }

  /**
   * Detect escalation pattern in risk levels
   */
  private detectEscalation(riskLevels: RiskLevel[]): { escalating: boolean; levels: number[] } {
    const riskScores: Record<RiskLevel, number> = {
      [RiskLevel.NoRisk]: 0,
      [RiskLevel.Low]: 1,
      [RiskLevel.Unknown]: 1.5,
      [RiskLevel.Medium]: 2,
      [RiskLevel.High]: 3,
      [RiskLevel.VeryHigh]: 4
    };

    const scores = riskLevels.map((r) => riskScores[r]);
    const { slope } = this.calculateLinearRegression(scores);

    return {
      escalating: slope > 0.3,
      levels: scores
    };
  }

  /**
   * Calculate volatility (coefficient of variation)
   */
  private calculateVolatility(scores: number[]): number {
    if (scores.length < 2) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (mean === 0) return 0;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    return Math.sqrt(variance) / mean;
  }

  /**
   * Calculate recommended assessment date
   */
  private calculateRecommendedDate(
    lastDate: Date,
    riskLevel: RiskLevel,
    assessmentType: AssessmentType
  ): Date {
    const baseIntervals: Record<AssessmentType, number> = {
      [AssessmentType.MUST]: 30,
      [AssessmentType.Braden]: 7,
      [AssessmentType.WATERLOW]: 7,
      [AssessmentType.Morse_Fall]: 7,
      [AssessmentType.Barthel_Index]: 30,
      [AssessmentType.MMSE]: 30,
      [AssessmentType.PHQ9]: 14,
      [AssessmentType.GAD7]: 14,
      [AssessmentType.General]: 30
    };

    const multipliers: Record<RiskLevel, number> = {
      [RiskLevel.Low]: 1,
      [RiskLevel.Medium]: 0.5,
      [RiskLevel.High]: 0.25,
      [RiskLevel.VeryHigh]: 0.125,
      [RiskLevel.NoRisk]: 1.5,
      [RiskLevel.Unknown]: 0.5
    };

    const baseInterval = baseIntervals[assessmentType] || 30;
    const multiplier = multipliers[riskLevel] || 1;
    const intervalDays = Math.max(1, Math.round(baseInterval * multiplier));

    const recommendedDate = new Date(lastDate);
    recommendedDate.setDate(recommendedDate.getDate() + intervalDays);

    return recommendedDate;
  }

  /**
   * Determine reassessment urgency
   */
  private determineUrgency(
    recommendedDate: Date,
    daysSinceLastAssessment: number
  ): 'routine' | 'soon' | 'urgent' {
    const now = Date.now();
    const daysUntilRecommended = Math.round((recommendedDate.getTime() - now) / (24 * 60 * 60 * 1000));

    if (daysUntilRecommended <= 0 || daysSinceLastAssessment > 60) {
      return 'urgent';
    } else if (daysUntilRecommended <= 7) {
      return 'soon';
    } else {
      return 'routine';
    }
  }

  /**
   * Generate reassessment reason
   */
  private generateReassessmentReason(
    riskLevel: RiskLevel,
    daysSinceLastAssessment: number,
    assessmentType: AssessmentType
  ): string {
    const reasons: string[] = [];

    if (daysSinceLastAssessment > 30) {
      reasons.push(`Last assessment was ${daysSinceLastAssessment} days ago`);
    }

    if (riskLevel === RiskLevel.High || riskLevel === RiskLevel.VeryHigh) {
      reasons.push(`Current risk level is ${riskLevel}`);
    } else {
      reasons.push('Routine reassessment due');
    }

    return reasons.join('. ');
  }

  /**
   * Calculate overall risk from array of risks
   */
  private calculateOverallRisk(risks: RiskLevel[]): RiskLevel {
    if (risks.length === 0) return RiskLevel.Unknown;

    const riskOrder: RiskLevel[] = [
      RiskLevel.VeryHigh,
      RiskLevel.High,
      RiskLevel.Medium,
      RiskLevel.Low,
      RiskLevel.NoRisk,
      RiskLevel.Unknown
    ];

    // Return the highest risk level
    for (const level of riskOrder) {
      if (risks.includes(level)) {
        return level;
      }
    }

    return RiskLevel.Unknown;
  }

  /**
   * Generate decline recommendations
   */
  private generateDeclineRecommendations(
    predictedDecline: boolean,
    riskFactors: string[],
    assessmentType: AssessmentType
  ): string[] {
    if (!predictedDecline) {
      return [
        'Continue current monitoring schedule',
        'No immediate intervention required'
      ];
    }

    const recommendations: string[] = [
      'Review and adjust care plan based on decline prediction',
      'Consider increasing assessment frequency',
      'Investigate potential causes of decline',
      'Consult with appropriate specialist if decline continues'
    ];

    if (riskFactors.includes('Risk level escalation pattern detected')) {
      recommendations.push('URGENT: Implement escalation protocols for rising risk levels');
    }

    return recommendations;
  }
}

export const trendAnalysisService = new TrendAnalysisService();
export default trendAnalysisService;
