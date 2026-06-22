/**
 * HOJAI Performance Dashboard - Evaluation Engine Service
 *
 * Evaluates AI employee performance based on KPIs and generates evaluation scores.
 */

import { v4 as uuid } from 'uuid';
import { format } from 'date-fns';
import {
  EvaluationPeriod,
  DEFAULT_EVALUATION_WEIGHTS,
  EVALUATION_GRADES,
} from '../types/index.js';
import {
  Evaluation,
  EvaluationConfig,
  KPI,
  EmployeeProfile,
} from '../models/performanceModel.js';

export class EvaluationEngine {
  /**
   * Generate evaluation for an employee
   */
  async evaluateEmployee(
    employeeId: string,
    tenantId: string,
    periodType: EvaluationPeriod = 'monthly',
    evaluatorId: string = 'system',
    customWeights?: any
  ) {
    const period = format(new Date(), 'yyyy-MM');

    const kpi = await KPI.findOne({ employeeId, tenantId, period });

    if (!kpi) {
      throw new Error(`No KPI data found for employee ${employeeId} in period ${period}`);
    }

    const config = await this.getOrCreateConfig(tenantId, customWeights);
    const weights = config.weights;

    const qualityScore = this.calculateQualityScore(kpi);
    const productivityScore = this.calculateProductivityScore(kpi);
    const reliabilityScore = this.calculateReliabilityScore(kpi);
    const collaborationScore = this.calculateCollaborationScore(kpi);
    const growthScore = await this.calculateGrowthScore(kpi, tenantId);

    const overallScore = this.calculateOverallScore(
      { qualityScore, productivityScore, reliabilityScore, collaborationScore, growthScore },
      weights
    );

    const { percentileRank, tenantPercentileRank } = await this.calculatePercentileRanks(
      employeeId,
      tenantId,
      overallScore,
      period
    );

    const strengths = this.generateStrengths(kpi, qualityScore, productivityScore);
    const improvements = this.generateImprovements(kpi, qualityScore, reliabilityScore);
    const recommendations = this.generateRecommendations(overallScore, kpi);

    let evaluation = await Evaluation.findOne({
      employeeId,
      tenantId,
      period,
      periodType,
    });

    const now = new Date();

    if (evaluation) {
      evaluation.qualityScore = qualityScore;
      evaluation.productivityScore = productivityScore;
      evaluation.reliabilityScore = reliabilityScore;
      evaluation.collaborationScore = collaborationScore;
      evaluation.growthScore = growthScore;
      evaluation.overallScore = overallScore;
      evaluation.percentileRank = percentileRank;
      evaluation.tenantPercentileRank = tenantPercentileRank;
      evaluation.strengths = strengths;
      evaluation.improvements = improvements;
      evaluation.recommendations = recommendations;
      evaluation.status = 'completed';
      evaluation.completedAt = now;
      (evaluation as any).updatedAt = now;
    } else {
      const evaluationId = `eval_${uuid().slice(0, 12)}`;

      evaluation = new Evaluation({
        evaluationId,
        employeeId,
        tenantId,
        evaluatorId,
        period,
        periodType,
        qualityScore,
        productivityScore,
        reliabilityScore,
        collaborationScore,
        growthScore,
        overallScore,
        percentileRank,
        tenantPercentileRank,
        status: 'completed',
        strengths,
        improvements,
        recommendations,
        completedAt: now,
      });
    }

    await evaluation.save();
    return evaluation;
  }

  /**
   * Get evaluation for an employee
   */
  async getEvaluation(
    employeeId: string,
    tenantId: string,
    period?: string,
    periodType?: EvaluationPeriod
  ) {
    const query: any = { employeeId, tenantId };

    if (period) query.period = period;
    if (periodType) query.periodType = periodType;

    return Evaluation.findOne(query).sort({ createdAt: -1 });
  }

  /**
   * Get evaluation history
   */
  async getEvaluationHistory(
    employeeId: string,
    tenantId: string,
    limit: number = 12
  ) {
    return Evaluation.find({ employeeId, tenantId })
      .sort({ period: -1 })
      .limit(limit);
  }

  /**
   * Calculate quality score from KPI
   */
  private calculateQualityScore(kpi: any): number {
    const components = [
      { value: 100 - kpi.errorRate * 100, weight: 0.35 },
      { value: kpi.customerSatisfaction, weight: 0.40 },
      { value: kpi.qualityScore, weight: 0.25 },
    ];

    return Math.round(
      components.reduce((sum, c) => sum + c.value * c.weight, 0)
    );
  }

  /**
   * Calculate productivity score from KPI
   */
  private calculateProductivityScore(kpi: any): number {
    const tasksScore = Math.min(100, (kpi.tasksCompleted / 100) * 100);
    const throughputScore = Math.min(100, kpi.throughputPerHour * 10);
    const revenueScore = Math.min(100, (kpi.revenueGenerated / 10000) * 100);

    const components = [
      { value: tasksScore, weight: 0.40 },
      { value: throughputScore, weight: 0.30 },
      { value: revenueScore, weight: 0.30 },
    ];

    return Math.round(
      components.reduce((sum, c) => sum + c.value * c.weight, 0)
    );
  }

  /**
   * Calculate reliability score from KPI
   */
  private calculateReliabilityScore(kpi: any): number {
    const completionRate = kpi.totalTasksAttempted > 0
      ? (kpi.tasksCompleted / kpi.totalTasksAttempted) * 100
      : 0;

    const errorPenalty = (1 - kpi.errorRate) * 100;
    const escalationPenalty = (1 - kpi.escalationRate) * 100;

    const components = [
      { value: completionRate, weight: 0.40 },
      { value: errorPenalty, weight: 0.35 },
      { value: escalationPenalty, weight: 0.25 },
    ];

    return Math.round(
      components.reduce((sum, c) => sum + c.value * c.weight, 0)
    );
  }

  /**
   * Calculate collaboration score from KPI
   */
  private calculateCollaborationScore(kpi: any): number {
    const peerRatingScore = kpi.peerRating || 0;
    const teamContributionScore = kpi.teamContributionScore || 0;

    const components = [
      { value: peerRatingScore, weight: 0.50 },
      { value: teamContributionScore, weight: 0.50 },
    ];

    return Math.round(
      components.reduce((sum, c) => sum + c.value * c.weight, 0)
    );
  }

  /**
   * Calculate growth score (improvement over time)
   */
  private async calculateGrowthScore(kpi: any, tenantId: string): Promise<number> {
    const currentPeriod = kpi.period;
    const prevPeriodDate = new Date(currentPeriod + '-01');
    prevPeriodDate.setMonth(prevPeriodDate.getMonth() - 1);
    const prevPeriod = format(prevPeriodDate, 'yyyy-MM');

    const prevKpi = await KPI.findOne({ employeeId: kpi.employeeId, tenantId, period: prevPeriod });

    if (!prevKpi) {
      return 70;
    }

    const qualityChange = kpi.qualityScore - prevKpi.qualityScore;
    const satisfactionChange = kpi.customerSatisfaction - prevKpi.customerSatisfaction;
    const taskChange = kpi.tasksCompleted - prevKpi.tasksCompleted;

    const qualityGrowth = Math.max(-50, Math.min(50, qualityChange));
    const satisfactionGrowth = Math.max(-50, Math.min(50, satisfactionChange));
    const productivityGrowth = prevKpi.tasksCompleted > 0
      ? Math.max(-50, Math.min(50, (taskChange / prevKpi.tasksCompleted) * 50))
      : 0;

    const components = [
      { value: 50 + qualityGrowth, weight: 0.35 },
      { value: 50 + satisfactionGrowth, weight: 0.30 },
      { value: 50 + productivityGrowth, weight: 0.35 },
    ];

    return Math.round(
      Math.max(0, Math.min(100,
        components.reduce((sum, c) => sum + c.value * c.weight, 0)
      ))
    );
  }

  /**
   * Calculate overall score using weights
   */
  private calculateOverallScore(
    scores: {
      qualityScore: number;
      productivityScore: number;
      reliabilityScore: number;
      collaborationScore: number;
      growthScore: number;
    },
    weights: any
  ): number {
    const components = [
      { value: scores.qualityScore, weight: weights.quality },
      { value: scores.productivityScore, weight: weights.productivity },
      { value: scores.reliabilityScore, weight: weights.reliability },
      { value: scores.collaborationScore, weight: weights.collaboration },
      { value: scores.growthScore, weight: weights.growth },
    ];

    return Math.round(
      components.reduce((sum, c) => sum + c.value * c.weight, 0)
    );
  }

  /**
   * Calculate percentile rankings
   */
  private async calculatePercentileRanks(
    employeeId: string,
    tenantId: string,
    overallScore: number,
    period: string
  ): Promise<{ percentileRank: number; tenantPercentileRank: number }> {
    const allEvaluations = await Evaluation.find({ tenantId, period });

    if (allEvaluations.length === 0) {
      return { percentileRank: 0.5, tenantPercentileRank: 0.5 };
    }

    const sortedScores = allEvaluations.map((e) => e.overallScore).sort((a, b) => a - b);
    const rank = sortedScores.filter((s) => s < overallScore).length;
    const tenantPercentileRank = rank / allEvaluations.length;

    return { percentileRank: tenantPercentileRank, tenantPercentileRank };
  }

  /**
   * Generate strengths feedback
   */
  private generateStrengths(kpi: any, qualityScore: number, productivityScore: number): string[] {
    const strengths: string[] = [];

    if (qualityScore >= 85) {
      strengths.push('Exceptional quality of work with minimal errors');
    }

    if (productivityScore >= 85) {
      strengths.push('Outstanding productivity and task completion rate');
    }

    if (kpi.customerSatisfaction >= 90) {
      strengths.push('Excellent customer satisfaction ratings');
    }

    if (kpi.escalationRate <= 0.05) {
      strengths.push('Strong problem-solving skills with low escalation rate');
    }

    if (kpi.revenueGenerated >= 10000) {
      strengths.push('Significant revenue contribution to the team');
    }

    if (kpi.peerRating >= 85) {
      strengths.push('Highly valued team member with excellent collaboration');
    }

    if (kpi.utilizationRate >= 0.95) {
      strengths.push('Excellent time utilization and resource management');
    }

    return strengths.length > 0 ? strengths : ['Consistent performer meeting expectations'];
  }

  /**
   * Generate improvement suggestions
   */
  private generateImprovements(kpi: any, qualityScore: number, reliabilityScore: number): string[] {
    const improvements: string[] = [];

    if (qualityScore < 70) {
      improvements.push('Focus on improving work quality and reducing errors');
    }

    if (reliabilityScore < 70) {
      improvements.push('Work on consistency and reducing escalations');
    }

    if (kpi.errorRate > 0.1) {
      improvements.push('Address technical errors - consider additional training');
    }

    if (kpi.escalationRate > 0.1) {
      improvements.push('Improve problem resolution skills to reduce escalations');
    }

    if (kpi.customerSatisfaction < 70) {
      improvements.push('Focus on customer interaction skills');
    }

    if (kpi.throughputPerHour < 5) {
      improvements.push('Work on improving task completion speed');
    }

    return improvements.length > 0 ? improvements : ['Continue current performance trajectory'];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(overallScore: number, kpi: any): string[] {
    const recommendations: string[] = [];

    if (overallScore >= 95) {
      recommendations.push('Consider for leadership or mentorship roles');
      recommendations.push('Eligible for top performance bonus');
    } else if (overallScore >= 85) {
      recommendations.push('Great candidate for additional responsibilities');
      recommendations.push('Consider for skill advancement training');
    } else if (overallScore >= 70) {
      recommendations.push('Continue professional development');
      recommendations.push('Target specific areas for improvement');
    } else if (overallScore >= 50) {
      recommendations.push('Schedule performance improvement discussion');
      recommendations.push('Provide targeted training and support');
    } else {
      recommendations.push('Immediate performance improvement plan required');
      recommendations.push('Consider role adjustment or additional training');
    }

    if (kpi.avgResponseTime > 5000) {
      recommendations.push('Focus on reducing response times');
    }

    if (kpi.errorRate > 0.15) {
      recommendations.push('Enroll in quality assurance training');
    }

    return recommendations;
  }

  /**
   * Get evaluation configuration
   */
  async getOrCreateConfig(tenantId: string, customWeights?: any) {
    let config = await EvaluationConfig.findOne({ tenantId });

    if (!config) {
      const configId = `eval_config_${uuid().slice(0, 10)}`;
      config = new EvaluationConfig({
        configId,
        tenantId,
        weights: customWeights || DEFAULT_EVALUATION_WEIGHTS,
      });
      await config.save();
    } else if (customWeights) {
      config.weights = customWeights;
      await config.save();
    }

    return config;
  }

  /**
   * Update evaluation configuration
   */
  async updateConfig(
    tenantId: string,
    updates: {
      weights?: any;
      thresholds?: any;
      autoEvaluation?: boolean;
      evaluationFrequency?: EvaluationPeriod;
    }
  ) {
    let config = await EvaluationConfig.findOne({ tenantId });

    if (!config) {
      const configId = `eval_config_${uuid().slice(0, 10)}`;
      config = new EvaluationConfig({
        configId,
        tenantId,
        ...updates,
      });
    } else {
      if (updates.weights) config.weights = updates.weights;
      if (updates.thresholds) config.thresholds = updates.thresholds;
      if (updates.autoEvaluation !== undefined) config.autoEvaluation = updates.autoEvaluation;
      if (updates.evaluationFrequency) config.evaluationFrequency = updates.evaluationFrequency;
    }

    await config.save();
    return config;
  }

  /**
   * Get evaluation grade
   */
  getEvaluationGrade(overallScore: number): {
    grade: string;
    label: string;
    color: string;
  } {
    for (const [key, grade] of Object.entries(EVALUATION_GRADES)) {
      if (overallScore >= grade.min) {
        return {
          grade: key,
          label: grade.label,
          color: grade.color,
        };
      }
    }

    return {
      grade: 'unsatisfactory',
      label: EVALUATION_GRADES.unsatisfactory.label,
      color: EVALUATION_GRADES.unsatisfactory.color,
    };
  }

  /**
   * Batch evaluate employees
   */
  async batchEvaluate(
    tenantId: string,
    employeeIds?: string[],
    periodType: EvaluationPeriod = 'monthly'
  ): Promise<{ total: number; successful: number; failed: number }> {
    const query: any = { tenantId, status: 'active' };
    if (employeeIds) {
      query.employeeId = { $in: employeeIds };
    }

    const employees = await EmployeeProfile.find(query);
    let successful = 0;
    let failed = 0;

    for (const employee of employees) {
      try {
        await this.evaluateEmployee(employee.employeeId, tenantId, periodType);
        successful++;
      } catch (error) {
        console.error(`Failed to evaluate ${employee.employeeId}:`, error);
        failed++;
      }
    }

    return { total: employees.length, successful, failed };
  }

  /**
   * Get evaluation statistics for tenant
   */
  async getEvaluationStats(tenantId: string, period?: string) {
    const periodLabel = period || format(new Date(), 'yyyy-MM');

    const stats = await Evaluation.aggregate([
      { $match: { tenantId, period: periodLabel, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalEvaluations: { $sum: 1 },
          avgOverallScore: { $avg: '$overallScore' },
          avgQualityScore: { $avg: '$qualityScore' },
          avgProductivityScore: { $avg: '$productivityScore' },
          avgReliabilityScore: { $avg: '$reliabilityScore' },
          avgCollaborationScore: { $avg: '$collaborationScore' },
          avgGrowthScore: { $avg: '$growthScore' },
          minOverallScore: { $min: '$overallScore' },
          maxOverallScore: { $max: '$overallScore' },
        },
      },
    ]);

    return stats[0] || null;
  }
}

export const evaluationEngine = new EvaluationEngine();
export default evaluationEngine;
