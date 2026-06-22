import {
  ISymptom,
  ISymptomLog,
  SymptomSeverity,
  SymptomDuration,
  SymptomLog,
  ISymptomLogDocument
} from '../models/preVisit';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// SEVERITY THRESHOLDS
// ============================================================================

const SEVERITY_THRESHOLDS = {
  pain: { mild: 1, moderate: 2, severe: 3, critical: 4 },
  fatigue: { mild: 1, moderate: 2, severe: 3, critical: 4 },
  nausea: { mild: 1, moderate: 2, severe: 3, critical: 4 },
  headache: { mild: 1, moderate: 2, severe: 3, critical: 4 },
  breathing: { mild: 1, moderate: 2, severe: 3, critical: 4 },
  default: { mild: 1, moderate: 2, severe: 3, critical: 4 }
};

// ============================================================================
// SYMPTOM PATTERNS
// ============================================================================

interface SymptomPattern {
  symptom: string;
  frequency: number;
  averageSeverity: number;
  trend: 'worsening' | 'stable' | 'improving';
  lastOccurrence: Date;
  totalDays: number;
}

interface SymptomTrend {
  symptom: string;
  currentSeverity: number;
  previousSeverity: number;
  change: number;
  changePercentage: number;
  trend: 'worsening' | 'improving' | 'stable';
  concern: boolean;
  reason: string;
}

interface SymptomSummary {
  currentSymptoms: ISymptom[];
  worseningSymptoms: string[];
  improvingSymptoms: string[];
  newSymptoms: string[];
  stableSymptoms: string[];
  criticalSymptoms: string[];
  severityScore: number;
  severityLevel: 'low' | 'moderate' | 'high' | 'critical';
  recommendations: string[];
  overallTrend: 'worsening' | 'stable' | 'improving';
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class SymptomAnalyzerService {
  /**
   * Log symptoms for a patient
   */
  async logSymptoms(
    patientId: string,
    symptoms: ISymptom[],
    options?: {
      visitId?: string;
      preOrPostVisit?: 'pre' | 'post';
      notes?: string;
      weatherFactors?: ISymptomLog['weatherFactors'];
      activityFactors?: ISymptomLog['activityFactors'];
    }
  ): Promise<ISymptomLogDocument> {
    logger.info('Logging symptoms', {
      patientId,
      symptomCount: symptoms.length,
      visitId: options?.visitId
    });

    try {
      // Calculate total and overall severity
      const totalSeverity = this.calculateTotalSeverity(symptoms);
      const overallSeverity = this.calculateOverallSeverity(symptoms);

      const symptomLog = new SymptomLog({
        patientId,
        visitId: options?.visitId,
        symptoms,
        totalSeverity,
        overallSeverity,
        loggedAt: new Date(),
        preOrPostVisit: options?.preOrPostVisit || 'pre',
        notes: options?.notes,
        weatherFactors: options?.weatherFactors,
        activityFactors: options?.activityFactors
      });

      await symptomLog.save();

      logger.info('Symptoms logged successfully', {
        patientId,
        logId: symptomLog._id,
        totalSeverity,
        overallSeverity
      });

      return symptomLog;
    } catch (error) {
      logger.error('Error logging symptoms', { error, patientId });
      throw error;
    }
  }

  /**
   * Calculate total severity from all symptoms
   */
  calculateTotalSeverity(symptoms: ISymptom[]): number {
    return symptoms.reduce((total, symptom) => total + symptom.severity, 0);
  }

  /**
   * Calculate overall severity (worst symptom)
   */
  calculateOverallSeverity(symptoms: ISymptom[]): SymptomSeverity {
    if (symptoms.length === 0) return SymptomSeverity.NONE;

    const maxSeverity = Math.max(...symptoms.map(s => s.severity));
    return Math.min(maxSeverity, SymptomSeverity.CRITICAL) as SymptomSeverity;
  }

  /**
   * Analyze symptom patterns over time
   */
  async analyzeSymptomPatterns(patientId: string, days: number = 30): Promise<{
    patterns: SymptomPattern[];
    summary: string;
    recommendations: string[];
  }> {
    logger.info('Analyzing symptom patterns', { patientId, days });

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const symptomLogs = await SymptomLog.find({
        patientId,
        loggedAt: { $gte: startDate }
      }).sort({ loggedAt: 1 });

      if (symptomLogs.length === 0) {
        return {
          patterns: [],
          summary: 'No symptom data available for the specified period.',
          recommendations: ['Start logging your symptoms regularly to track patterns']
        };
      }

      // Extract all symptoms with timestamps
      const symptomOccurrences: Map<string, { severity: number; date: Date }[]> = new Map();

      for (const log of symptomLogs) {
        for (const symptom of log.symptoms) {
          const normalizedName = symptom.name.toLowerCase().trim();

          if (!symptomOccurrences.has(normalizedName)) {
            symptomOccurrences.set(normalizedName, []);
          }

          symptomOccurrences.get(normalizedName)!.push({
            severity: symptom.severity,
            date: log.loggedAt
          });
        }
      }

      // Calculate patterns for each symptom
      const patterns: SymptomPattern[] = [];

      for (const [symptomName, occurrences] of symptomOccurrences) {
        const frequency = occurrences.length;
        const averageSeverity = occurrences.reduce((sum, o) => sum + o.severity, 0) / occurrences.length;

        // Calculate trend
        const trend = this.calculateTrend(occurrences.map(o => o.severity));

        // Calculate total days with symptom
        const dates = occurrences.map(o => o.date.toISOString().split('T')[0]);
        const uniqueDates = new Set(dates);
        const totalDays = uniqueDates.size;

        patterns.push({
          symptom: symptomName,
          frequency,
          averageSeverity,
          trend,
          lastOccurrence: occurrences[occurrences.length - 1].date,
          totalDays
        });
      }

      // Sort by frequency and severity
      patterns.sort((a, b) => {
        const severityDiff = b.averageSeverity - a.averageSeverity;
        if (severityDiff !== 0) return severityDiff;
        return b.frequency - a.frequency;
      });

      // Generate summary and recommendations
      const summary = this.generatePatternSummary(patterns);
      const recommendations = this.generatePatternRecommendations(patterns);

      logger.info('Symptom patterns analyzed', {
        patientId,
        patternCount: patterns.length,
        mostFrequent: patterns[0]?.symptom
      });

      return { patterns, summary, recommendations };
    } catch (error) {
      logger.error('Error analyzing symptom patterns', { error, patientId });
      throw error;
    }
  }

  /**
   * Calculate symptom severity score (0-100)
   */
  calculateSymptomSeverity(symptoms: ISymptom[]): {
    score: number;
    level: 'low' | 'moderate' | 'high' | 'critical';
    factors: string[];
  } {
    if (symptoms.length === 0) {
      return { score: 0, level: 'low', factors: [] };
    }

    const factors: string[] = [];
    let score = 0;

    // Severity contribution (up to 40 points)
    const maxSeverity = Math.max(...symptoms.map(s => s.severity));
    const avgSeverity = symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length;
    score += Math.min(maxSeverity * 10, 40);

    // Number of symptoms (up to 20 points)
    const symptomCount = symptoms.length;
    score += Math.min(symptomCount * 4, 20);

    // Duration contribution (up to 20 points)
    const durationScores = symptoms.map(s => this.getDurationScore(s));
    const maxDurationScore = Math.max(...durationScores);
    score += Math.min(maxDurationScore, 20);

    // Frequency contribution (up to 10 points)
    const frequentSymptoms = symptoms.filter(s =>
      s.frequency === 'constant' || s.frequency === 'intermittent'
    );
    score += Math.min(frequentSymptoms.length * 5, 10);

    // Impact on daily life (up to 10 points)
    const highImpactSymptoms = symptoms.filter(s =>
      (s.impactOnDailyLife || 0) >= 7
    );
    score += Math.min(highImpactSymptoms.length * 5, 10);

    // Determine level
    let level: 'low' | 'moderate' | 'high' | 'critical';
    if (score <= 25) level = 'low';
    else if (score <= 50) level = 'moderate';
    else if (score <= 75) level = 'high';
    else level = 'critical';

    // Add contributing factors
    if (maxSeverity >= 3) factors.push('High severity symptoms present');
    if (symptomCount > 5) factors.push('Multiple concurrent symptoms');
    if (symptoms.some(s => s.severity === SymptomSeverity.CRITICAL)) {
      factors.push('Critical severity symptom detected');
    }

    return {
      score: Math.min(score, 100),
      level,
      factors
    };
  }

  /**
   * Get duration score for a symptom
   */
  private getDurationScore(symptom: ISymptom): number {
    const baseScore = symptom.durationValue;

    switch (symptom.duration) {
      case SymptomDuration.MINUTES:
        return Math.min(baseScore / 60, 2);
      case SymptomDuration.HOURS:
        return Math.min(baseScore / 24, 4);
      case SymptomDuration.DAYS:
        return Math.min(baseScore, 6);
      case SymptomDuration.WEEKS:
        return Math.min(baseScore * 3, 10);
      case SymptomDuration.MONTHS:
        return Math.min(baseScore * 4, 15);
      case SymptomDuration.YEARS:
        return Math.min(baseScore * 5, 20);
      default:
        return 5;
    }
  }

  /**
   * Prepare symptom summary for doctor
   */
  async prepareSymptomSummary(patientId: string): Promise<SymptomSummary> {
    logger.info('Preparing symptom summary', { patientId });

    try {
      // Get recent symptom logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentLogs = await SymptomLog.find({
        patientId,
        loggedAt: { $gte: thirtyDaysAgo }
      }).sort({ loggedAt: -1 });

      // Get previous period for comparison (30-60 days ago)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const thirtyDaysAgoCompare = new Date();
      thirtyDaysAgoCompare.setDate(thirtyDaysAgoCompare.getDate() - 30);

      const previousLogs = await SymptomLog.find({
        patientId,
        loggedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgoCompare }
      });

      // Extract current symptoms
      const currentSymptoms = recentLogs.length > 0
        ? recentLogs[0].symptoms
        : [];

      // Calculate trends
      const trends = this.calculateSymptomTrends(recentLogs, previousLogs);

      // Separate symptoms by trend
      const worseningSymptoms = trends
        .filter(t => t.trend === 'worsening')
        .map(t => t.symptom);

      const improvingSymptoms = trends
        .filter(t => t.trend === 'improving')
        .map(t => t.symptom);

      const newSymptoms = this.identifyNewSymptoms(recentLogs, previousLogs);
      const stableSymptoms = trends
        .filter(t => t.trend === 'stable')
        .map(t => t.symptom);

      // Identify critical symptoms
      const criticalSymptoms = currentSymptoms
        .filter(s => s.severity >= SymptomSeverity.SEVERE)
        .map(s => s.name);

      // Calculate overall severity score
      const severityResult = this.calculateSymptomSeverity(currentSymptoms);

      // Generate recommendations
      const recommendations = this.generateSummaryRecommendations(
        worseningSymptoms,
        criticalSymptoms,
        currentSymptoms
      );

      // Determine overall trend
      const overallTrend = this.determineOverallTrend(trends);

      const summary: SymptomSummary = {
        currentSymptoms,
        worseningSymptoms,
        improvingSymptoms,
        newSymptoms,
        stableSymptoms,
        criticalSymptoms,
        severityScore: severityResult.score,
        severityLevel: severityResult.level,
        recommendations,
        overallTrend
      };

      logger.info('Symptom summary prepared', {
        patientId,
        currentSymptoms: currentSymptoms.length,
        worsening: worseningSymptoms.length,
        improving: improvingSymptoms.length
      });

      return summary;
    } catch (error) {
      logger.error('Error preparing symptom summary', { error, patientId });
      throw error;
    }
  }

  /**
   * Calculate symptom trends between two periods
   */
  private calculateSymptomTrends(
    recentLogs: ISymptomLogDocument[],
    previousLogs: ISymptomLogDocument[]
  ): SymptomTrend[] {
    const trends: SymptomTrend[] = [];

    // Get average severity for each symptom in each period
    const recentSymptoms = this.aggregateSymptoms(recentLogs);
    const previousSymptoms = this.aggregateSymptoms(previousLogs);

    // Compare symptoms
    const allSymptoms = new Set([...Object.keys(recentSymptoms), ...Object.keys(previousSymptoms)]);

    for (const symptom of allSymptoms) {
      const recent = recentSymptoms[symptom];
      const previous = previousSymptoms[symptom];

      if (!recent) continue;

      const currentSeverity = recent.averageSeverity;
      const previousSeverity = previous?.averageSeverity || 0;

      const change = currentSeverity - previousSeverity;
      const changePercentage = previousSeverity > 0
        ? ((change / previousSeverity) * 100)
        : (currentSeverity > 0 ? 100 : 0);

      let trend: 'worsening' | 'improving' | 'stable' = 'stable';
      let concern = false;
      let reason = '';

      if (change > 0.5) {
        trend = 'worsening';
        concern = change >= 1;
        reason = concern
          ? 'Significant increase in severity requires attention'
          : 'Moderate increase in symptom severity';
      } else if (change < -0.5) {
        trend = 'improving';
        reason = 'Symptom is improving';
      } else {
        reason = 'Symptom severity is stable';
      }

      trends.push({
        symptom,
        currentSeverity,
        previousSeverity,
        change,
        changePercentage,
        trend,
        concern,
        reason
      });
    }

    return trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }

  /**
   * Aggregate symptoms from multiple logs
   */
  private aggregateSymptoms(logs: ISymptomLogDocument[]): Record<string, {
    averageSeverity: number;
    count: number;
  }> {
    const aggregated: Record<string, { totalSeverity: number; count: number }> = {};

    for (const log of logs) {
      for (const symptom of log.symptoms) {
        const name = symptom.name.toLowerCase().trim();
        if (!aggregated[name]) {
          aggregated[name] = { totalSeverity: 0, count: 0 };
        }
        aggregated[name].totalSeverity += symptom.severity;
        aggregated[name].count++;
      }
    }

    const result: Record<string, { averageSeverity: number; count: number }> = {};
    for (const [name, data] of Object.entries(aggregated)) {
      result[name] = {
        averageSeverity: data.totalSeverity / data.count,
        count: data.count
      };
    }

    return result;
  }

  /**
   * Identify new symptoms (in recent but not in previous period)
   */
  private identifyNewSymptoms(
    recentLogs: ISymptomLogDocument[],
    previousLogs: ISymptomLogDocument[]
  ): string[] {
    const previousSymptoms = new Set(
      previousLogs.flatMap(log =>
        log.symptoms.map(s => s.name.toLowerCase().trim())
      )
    );

    const recentSymptoms = new Set(
      recentLogs.flatMap(log =>
        log.symptoms.map(s => s.name.toLowerCase().trim())
      )
    );

    const newSymptoms: string[] = [];
    for (const symptom of recentSymptoms) {
      if (!previousSymptoms.has(symptom)) {
        newSymptoms.push(symptom);
      }
    }

    return newSymptoms;
  }

  /**
   * Determine overall trend from individual trends
   */
  private determineOverallTrend(trends: SymptomTrend[]): 'worsening' | 'stable' | 'improving' {
    if (trends.length === 0) return 'stable';

    const worsening = trends.filter(t => t.trend === 'worsening').length;
    const improving = trends.filter(t => t.trend === 'improving').length;

    if (worsening > improving) return 'worsening';
    if (improving > worsening) return 'improving';
    return 'stable';
  }

  /**
   * Generate pattern summary text
   */
  private generatePatternSummary(patterns: SymptomPattern[]): string {
    if (patterns.length === 0) {
      return 'No symptoms have been logged in this period.';
    }

    const mostFrequent = patterns[0];
    const mostSevere = patterns.reduce((max, p) =>
      p.averageSeverity > max.averageSeverity ? p : max
    );

    const worseningSymptoms = patterns.filter(p => p.trend === 'worsening');
    const improvingSymptoms = patterns.filter(p => p.trend === 'improving');

    let summary = `You have tracked ${patterns.length} symptom(s) over this period. `;
    summary += `${mostFrequent.symptom} has been most frequent (${mostFrequent.frequency} occurrences). `;
    summary += `${mostSevere.symptom} has been most severe (avg: ${mostSevere.averageSeverity.toFixed(1)}/4). `;

    if (worseningSymptoms.length > 0) {
      summary += `${worseningSymptoms.length} symptom(s) are worsening: ${worseningSymptoms.map(s => s.symptom).join(', ')}. `;
    }

    if (improvingSymptoms.length > 0) {
      summary += `${improvingSymptoms.length} symptom(s) are improving: ${improvingSymptoms.map(s => s.symptom).join(', ')}.`;
    }

    return summary;
  }

  /**
   * Generate recommendations based on patterns
   */
  private generatePatternRecommendations(patterns: SymptomPattern[]): string[] {
    const recommendations: string[] = [];

    const worseningSymptoms = patterns.filter(p => p.trend === 'worsening');
    const severeSymptoms = patterns.filter(p => p.averageSeverity >= 3);

    if (worseningSymptoms.length > 0) {
      recommendations.push(
        `Consider discussing ${worseningSymptoms.map(s => s.symptom).join(', ')} with your doctor as these symptoms are worsening.`
      );
    }

    if (severeSymptoms.length > 0) {
      recommendations.push(
        `Your ${severeSymptoms.map(s => s.symptom).join(', ')} severity warrants close monitoring.`
      );
    }

    const frequentSymptoms = patterns.filter(p => p.frequency > 10);
    if (frequentSymptoms.length > 0) {
      recommendations.push(
        `High frequency of ${frequentSymptoms.map(s => s.symptom).join(', ')} may indicate need for treatment adjustment.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Your symptoms appear stable. Continue monitoring.');
    }

    return recommendations;
  }

  /**
   * Generate summary recommendations
   */
  private generateSummaryRecommendations(
    worseningSymptoms: string[],
    criticalSymptoms: string[],
    currentSymptoms: ISymptom[]
  ): string[] {
    const recommendations: string[] = [];

    if (criticalSymptoms.length > 0) {
      recommendations.push(
        `URGENT: Seek medical attention for ${criticalSymptoms.join(', ')}`
      );
    }

    if (worseningSymptoms.length > 0) {
      recommendations.push(
        `Discuss worsening symptoms (${worseningSymptoms.join(', ')}) with your doctor`
      );
    }

    const symptomsWithHighImpact = currentSymptoms.filter(
      s => (s.impactOnDailyLife || 0) >= 7
    );
    if (symptomsWithHighImpact.length > 0) {
      recommendations.push(
        `Consider discussing the impact of ${symptomsWithHighImpact.map(s => s.name).join(', ')} on your daily life`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring your symptoms as directed');
    }

    return recommendations;
  }

  /**
   * Detect worsening symptoms and alert
   */
  async detectWorseningSymptoms(patientId: string): Promise<{
    hasWorsening: boolean;
    alerts: {
      symptom: string;
      previousSeverity: number;
      currentSeverity: number;
      change: number;
      severity: 'warning' | 'urgent' | 'critical';
      message: string;
    }[];
  }> {
    logger.info('Detecting worsening symptoms', { patientId });

    try {
      // Get most recent logs
      const recentLogs = await SymptomLog.find({
        patientId
      }).sort({ loggedAt: -1 }).limit(2);

      if (recentLogs.length < 2) {
        return {
          hasWorsening: false,
          alerts: []
        };
      }

      const [currentLog, previousLog] = recentLogs;

      const alerts: {
        symptom: string;
        previousSeverity: number;
        currentSeverity: number;
        change: number;
        severity: 'warning' | 'urgent' | 'critical';
        message: string;
      }[] = [];

      for (const currentSymptom of currentLog.symptoms) {
        const normalizedName = currentSymptom.name.toLowerCase().trim();
        const previousSymptom = previousLog.symptoms.find(
          s => s.name.toLowerCase().trim() === normalizedName
        );

        if (!previousSymptom) continue;

        const change = currentSymptom.severity - previousSymptom.severity;

        if (change > 0) {
          let severity: 'warning' | 'urgent' | 'critical' = 'warning';
          let message = '';

          if (change >= 2 || currentSymptom.severity >= SymptomSeverity.CRITICAL) {
            severity = 'critical';
            message = `${currentSymptom.name} has worsened significantly. Consider seeking medical attention.`;
          } else if (change >= 1) {
            severity = 'urgent';
            message = `${currentSymptom.name} has worsened. Please discuss with your doctor.`;
          } else {
            message = `${currentSymptom.name} severity has increased slightly. Monitor closely.`;
          }

          alerts.push({
            symptom: currentSymptom.name,
            previousSeverity: previousSymptom.severity,
            currentSeverity: currentSymptom.severity,
            change,
            severity,
            message
          });
        }
      }

      logger.info('Worsening symptoms detected', {
        patientId,
        alertCount: alerts.length,
        hasWorsening: alerts.length > 0
      });

      return {
        hasWorsening: alerts.length > 0,
        alerts
      };
    } catch (error) {
      logger.error('Error detecting worsening symptoms', { error, patientId });
      throw error;
    }
  }

  /**
   * Get symptom history for a patient
   */
  async getSymptomHistory(
    patientId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      symptomName?: string;
    }
  ): Promise<ISymptomLogDocument[]> {
    const query: Record<string, unknown> = { patientId };

    if (options?.startDate || options?.endDate) {
      query.loggedAt = {};
      if (options.startDate) {
        (query.loggedAt as Record<string, Date>).$gte = options.startDate;
      }
      if (options.endDate) {
        (query.loggedAt as Record<string, Date>).$lte = options.endDate;
      }
    }

    if (options?.symptomName) {
      query['symptoms.name'] = { $regex: options.symptomName, $options: 'i' };
    }

    let queryBuilder = SymptomLog.find(query).sort({ loggedAt: -1 });

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder;
  }

  /**
   * Get current symptoms (most recent log)
   */
  async getCurrentSymptoms(patientId: string): Promise<ISymptom[]> {
    const latestLog = await SymptomLog.findOne({ patientId })
      .sort({ loggedAt: -1 });

    return latestLog?.symptoms || [];
  }

  /**
   * Calculate trend from severity values
   */
  private calculateTrend(severityValues: number[]): 'worsening' | 'stable' | 'improving' {
    if (severityValues.length < 2) return 'stable';

    const recent = severityValues.slice(-3);
    const earlier = severityValues.slice(0, Math.min(3, severityValues.length));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    const diff = recentAvg - earlierAvg;

    if (diff > 0.3) return 'worsening';
    if (diff < -0.3) return 'improving';
    return 'stable';
  }

  /**
   * Get symptom statistics
   */
  async getSymptomStatistics(patientId: string, days: number = 30): Promise<{
    totalLogs: number;
    totalSymptoms: number;
    averageSeverity: number;
    mostFrequentSymptoms: { name: string; count: number }[];
    symptomsByDay: { date: string; count: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await SymptomLog.find({
      patientId,
      loggedAt: { $gte: startDate }
    });

    // Count symptoms
    const symptomCounts: Record<string, number> = {};
    let totalSymptoms = 0;
    let totalSeverity = 0;
    const symptomsByDay: Record<string, number> = {};

    for (const log of logs) {
      const dateKey = log.loggedAt.toISOString().split('T')[0];
      symptomsByDay[dateKey] = (symptomsByDay[dateKey] || 0) + log.symptoms.length;

      for (const symptom of log.symptoms) {
        const name = symptom.name.toLowerCase().trim();
        symptomCounts[name] = (symptomCounts[name] || 0) + 1;
        totalSymptoms++;
        totalSeverity += symptom.severity;
      }
    }

    const mostFrequentSymptoms = Object.entries(symptomCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      totalSymptoms,
      averageSeverity: totalSymptoms > 0 ? totalSeverity / totalSymptoms : 0,
      mostFrequentSymptoms,
      symptomsByDay: Object.entries(symptomsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}

// Export singleton instance
export const symptomAnalyzerService = new SymptomAnalyzerService();
