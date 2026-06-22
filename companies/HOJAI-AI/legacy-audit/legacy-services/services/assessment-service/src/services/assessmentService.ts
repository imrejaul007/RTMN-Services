import { v4 as uuidv4 } from 'uuid';
import {
  Assessment,
  AssessmentHistory,
  AssessmentAuditLog,
  AssessmentTemplate,
  IAssessment,
  IAssessmentScore,
  IAssessmentResponse,
  AssessmentType,
  AssessmentStatus,
  RiskLevel,
  InterpretationLevel,
  IThresholdConfig
} from '../models/assessment';
import { logger } from '../utils/logger';
import { mustService } from './mustService';
import { bradenService } from './bradenService';
import { fallRiskAssessment } from './fallRiskAssessment';
import { mentalHealthAssessment } from './mentalHealthAssessment';

export interface CreateAssessmentInput {
  patientId: string;
  type: AssessmentType;
  assessorId: string;
  assessorName?: string;
  department?: string;
  facilityId?: string;
  responses: {
    questionId: string;
    answer: unknown;
    notes?: string;
  }[];
  diagnosisCodes?: string[];
  medications?: string[];
  comorbidities?: string[];
  notes?: string;
  date?: Date;
}

export interface AssessmentResult {
  assessment: IAssessment;
  history: IAssessmentHistory;
  recommendations: string[];
  requiresFollowUp: boolean;
  followUpDate?: Date;
}

export interface ScoreTrend {
  type: AssessmentType;
  patientId: string;
  dataPoints: {
    date: Date;
    score: number;
    maxScore: number;
    riskLevel: RiskLevel;
    assessmentId: string;
  }[];
  trend: 'improving' | 'stable' | 'declining' | 'fluctuating';
  averageScore: number;
  minScore: number;
  maxScore: number;
  scoreRange: number;
  changeFromBaseline: number;
  changeFromLast: number;
  assessmentsCount: number;
}

class AssessmentService {
  /**
   * Create a new assessment
   */
  async createAssessment(input: CreateAssessmentInput): Promise<AssessmentResult> {
    const { v4: uuid } = { v4: uuidv4 };
    const assessmentId = `ASM-${uuid()}`;
    const date = input.date || new Date();

    // Get the template for scoring
    const template = await AssessmentTemplate.findOne({
      type: input.type,
      isActive: true
    });

    if (!template) {
      throw new Error(`No active template found for assessment type: ${input.type}`);
    }

    // Get previous assessment for comparison
    const previousAssessment = await this.getLatestAssessment(input.patientId, input.type);

    // Calculate score and interpret
    const { score, responses } = await this.calculateScore(input.responses, template);
    const interpretation = this.interpretScore(score, input.type);

    // Get recommendations based on assessment type
    const recommendations = await this.getRecommendations(input.type, interpretation.riskLevel, input.patientId);

    // Calculate risk change
    let riskChange: number | undefined;
    let previousRiskLevel: RiskLevel | undefined;
    if (previousAssessment) {
      previousRiskLevel = previousAssessment.riskLevel as RiskLevel;
      riskChange = this.calculateRiskChange(previousAssessment.score.score, score.score, input.type);
    }

    // Determine follow-up requirements
    const followUpDate = this.calculateFollowUpDate(input.type, interpretation.riskLevel);

    // Create the assessment
    const assessment = new Assessment({
      assessmentId,
      patientId: input.patientId,
      type: input.type,
      status: AssessmentStatus.Completed,
      date,
      completedDate: date,
      assessorId: input.assessorId,
      assessorName: input.assessorName,
      department: input.department,
      facilityId: input.facilityId,
      score: {
        score: interpretation.score,
        maxScore: interpretation.maxScore,
        level: interpretation.riskLevel,
        interpretation: interpretation.interpretation,
        interpretationLevel: interpretation.level
      },
      responses,
      riskLevel: interpretation.riskLevel,
      previousRiskLevel,
      riskChange,
      recommendations,
      followUpDate,
      reassessmentFrequency: this.getReassessmentFrequency(input.type, interpretation.riskLevel),
      diagnosisCodes: input.diagnosisCodes,
      medications: input.medications,
      comorbidities: input.comorbidities,
      notes: input.notes
    });

    await assessment.save();

    // Create history record
    const history = await this.createHistoryRecord(
      assessment,
      previousAssessment?.assessmentId
    );

    // Create audit log
    await this.createAuditLog(
      assessment.assessmentId,
      assessment.patientId,
      'created',
      input.assessorId,
      input.assessorName
    );

    logger.info(`Assessment created: ${assessmentId} for patient ${input.patientId}`, {
      type: input.type,
      score: interpretation.score,
      riskLevel: interpretation.riskLevel
    });

    return {
      assessment,
      history,
      recommendations,
      requiresFollowUp: interpretation.riskLevel === RiskLevel.High ||
        interpretation.riskLevel === RiskLevel.VeryHigh ||
        interpretation.level === InterpretationLevel.Severe ||
        interpretation.level === InterpretationLevel.Critical,
      followUpDate
    };
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(assessmentId: string): Promise<IAssessment | null> {
    const assessment = await Assessment.findOne({ assessmentId }).lean();

    if (assessment) {
      await this.createAuditLog(
        assessmentId,
        assessment.patientId,
        'viewed',
        'system',
        'System'
      );
    }

    return assessment as IAssessment | null;
  }

  /**
   * Get assessment history for a patient
   */
  async getAssessmentHistory(
    patientId: string,
    type?: AssessmentType,
    limit: number = 50,
    skip: number = 0
  ): Promise<IAssessment[]> {
    const query: Record<string, unknown> = { patientId };

    if (type) {
      query.type = type;
    }

    const assessments = await Assessment.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return assessments as IAssessment[];
  }

  /**
   * Get latest assessment for a patient
   */
  async getLatestAssessment(
    patientId: string,
    type: AssessmentType
  ): Promise<IAssessment | null> {
    const assessment = await Assessment.findOne({
      patientId,
      type,
      status: AssessmentStatus.Completed
    })
      .sort({ date: -1 })
      .lean();

    return assessment as IAssessment | null;
  }

  /**
   * Calculate score from responses using template
   */
  async calculateScore(
    responses: CreateAssessmentInput['responses'],
    template: InstanceType<typeof AssessmentTemplate>
  ): Promise<{ score: number; responses: IAssessmentResponse[]; maxScore: number }> {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const processedResponses: IAssessmentResponse[] = [];

    for (const response of responses) {
      const question = template.questions.find(
        (q) => q.questionId === response.questionId
      );

      if (!question) {
        logger.warn(`Question not found: ${response.questionId}`);
        continue;
      }

      let questionScore = 0;
      let maxQuestionScore = 0;

      switch (question.questionType) {
        case 'single':
          if (question.options && response.answer !== undefined) {
            const selectedOption = question.options.find(
              (opt) => opt.value === response.answer
            );
            if (selectedOption) {
              questionScore = selectedOption.score;
            }
            maxQuestionScore = Math.max(...question.options.map((opt) => opt.score));
          }
          break;

        case 'multiple':
          if (question.options && Array.isArray(response.answer)) {
            for (const selectedValue of response.answer) {
              const selectedOption = question.options.find(
                (opt) => opt.value === selectedValue
              );
              if (selectedOption) {
                questionScore += selectedOption.score;
              }
            }
            maxQuestionScore = question.options.reduce(
              (sum, opt) => sum + opt.score,
              0
            );
          }
          break;

        case 'scale':
        case 'numeric':
          if (typeof response.answer === 'number') {
            const value = response.answer;
            if (question.options) {
              // Find the closest matching option
              const closestOption = question.options.reduce((prev, curr) => {
                return Math.abs((curr.value as number) - value) <
                  Math.abs((prev.value as number) - value)
                  ? curr
                  : prev;
              });
              questionScore = closestOption.score;
              maxQuestionScore = Math.max(...question.options.map((opt) => opt.score));
            } else {
              // Direct value within range
              questionScore = Math.min(
                Math.max(value, question.minValue || 0),
                question.maxValue || 100
              );
              maxQuestionScore = question.maxValue || 100;
            }
          }
          break;

        case 'text':
          // Text responses don't contribute to score
          questionScore = 0;
          maxQuestionScore = 0;
          break;
      }

      totalScore += questionScore;
      maxPossibleScore += maxQuestionScore;

      processedResponses.push({
        questionId: response.questionId,
        questionText: question.questionText,
        answer: response.answer,
        score: questionScore,
        maxQuestionScore,
        notes: response.notes
      });
    }

    return {
      score: totalScore,
      responses: processedResponses,
      maxScore: maxPossibleScore
    };
  }

  /**
   * Interpret score based on assessment type and thresholds
   */
  interpretScore(
    score: number,
    type: AssessmentType
  ): {
    score: number;
    maxScore: number;
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
  } {
    const thresholds = this.getThresholdsForType(type);

    switch (type) {
      case AssessmentType.MUST:
        return this.mustService.interpretMUST(score);
      case AssessmentType.Braden:
        return this.bradenService.interpretBraden(score);
      case AssessmentType.Morse_Fall:
        return this.fallRiskAssessment.interpretMorse(score);
      case AssessmentType.PHQ9:
        return this.mentalHealthAssessment.getPHQ9Interpretation(score);
      case AssessmentType.GAD7:
        return this.mentalHealthAssessment.getGAD7Interpretation(score);
      default:
        return this.interpretGenericScore(score, thresholds);
    }
  }

  /**
   * Get assessment trends for a patient
   */
  async getAssessmentTrends(
    patientId: string,
    type: AssessmentType,
    days: number = 90
  ): Promise<ScoreTrend> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const assessments = await Assessment.find({
      patientId,
      type,
      status: AssessmentStatus.Completed,
      date: { $gte: startDate }
    })
      .sort({ date: 1 })
      .lean();

    if (assessments.length === 0) {
      throw new Error(`No assessments found for patient ${patientId} of type ${type}`);
    }

    const dataPoints = assessments.map((a) => ({
      date: a.date,
      score: a.score.score,
      maxScore: a.score.maxScore,
      riskLevel: a.riskLevel as RiskLevel,
      assessmentId: a.assessmentId
    }));

    const scores = dataPoints.map((dp) => dp.score);
    const baselineScore = scores[0];
    const lastScore = scores[scores.length - 1];

    return {
      type,
      patientId,
      dataPoints,
      trend: this.calculateTrend(scores),
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      scoreRange: Math.max(...scores) - Math.min(...scores),
      changeFromBaseline: lastScore - baselineScore,
      changeFromLast: scores.length > 1 ? scores[scores.length - 1] - scores[scores.length - 2] : 0,
      assessmentsCount: assessments.length
    };
  }

  /**
   * Get thresholds configuration for each assessment type
   */
  private getThresholdsForType(type: AssessmentType): IThresholdConfig {
    const defaultThresholds: Record<AssessmentType, IThresholdConfig> = {
      [AssessmentType.MUST]: { low: 1, medium: 2, high: 2 },
      [AssessmentType.Braden]: { low: 15, medium: 13, high: 9, veryHigh: 6 },
      [AssessmentType.WATERLOW]: { low: 10, medium: 15, high: 20 },
      [AssessmentType.Morse_Fall]: { low: 25, medium: 45, high: 45 },
      [AssessmentType.Barthel_Index]: { low: 60, medium: 40, high: 20 },
      [AssessmentType.MMSE]: { low: 24, medium: 18, high: 12 },
      [AssessmentType.PHQ9]: { low: 5, medium: 10, high: 15, veryHigh: 20 },
      [AssessmentType.GAD7]: { low: 5, medium: 10, high: 15 },
      [AssessmentType.General]: { low: 50, medium: 70, high: 85 }
    };

    return defaultThresholds[type] || defaultThresholds[AssessmentType.General];
  }

  /**
   * Generic score interpretation
   */
  private interpretGenericScore(
    score: number,
    thresholds: IThresholdConfig
  ): {
    score: number;
    maxScore: number;
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
  } {
    const maxScore = 100;
    let riskLevel: RiskLevel;
    let interpretation: string;
    let level: InterpretationLevel;

    if (score <= (thresholds.low || 0)) {
      riskLevel = RiskLevel.Low;
      interpretation = 'Low risk. Continue routine monitoring.';
      level = InterpretationLevel.Normal;
    } else if (score <= (thresholds.medium || thresholds.low || 0) + 10) {
      riskLevel = RiskLevel.Medium;
      interpretation = 'Medium risk. Consider additional monitoring.';
      level = InterpretationLevel.Mild;
    } else if (score <= (thresholds.high || thresholds.medium || thresholds.low || 0) + 10) {
      riskLevel = RiskLevel.High;
      interpretation = 'High risk. Immediate intervention recommended.';
      level = InterpretationLevel.Moderate;
    } else {
      riskLevel = RiskLevel.VeryHigh;
      interpretation = 'Very high risk. Urgent intervention required.';
      level = InterpretationLevel.Severe;
    }

    return { score, maxScore, riskLevel, interpretation, level };
  }

  /**
   * Calculate risk change between assessments
   */
  private calculateRiskChange(
    previousScore: number,
    currentScore: number,
    type: AssessmentType
  ): number {
    // For most scales, lower is worse (Braden, MMSE, Barthel)
    // For risk scales, higher is worse (MUST, Morse, PHQ9, GAD7)
    const invertedScales = [
      AssessmentType.Braden,
      AssessmentType.MMSE,
      AssessmentType.Barthel_Index
    ];

    if (invertedScales.includes(type)) {
      return previousScore - currentScore; // Positive = improvement
    }

    return currentScore - previousScore; // Positive = worsening
  }

  /**
   * Calculate follow-up date based on risk level
   */
  private calculateFollowUpDate(
    type: AssessmentType,
    riskLevel: RiskLevel
  ): Date | undefined {
    const followUpDays: Record<RiskLevel, number> = {
      [RiskLevel.Low]: 30,
      [RiskLevel.Medium]: 14,
      [RiskLevel.High]: 7,
      [RiskLevel.VeryHigh]: 1,
      [RiskLevel.NoRisk]: 90,
      [RiskLevel.Unknown]: 14
    };

    const days = followUpDays[riskLevel];
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + days);

    return followUpDate;
  }

  /**
   * Get reassessment frequency in days
   */
  private getReassessmentFrequency(
    type: AssessmentType,
    riskLevel: RiskLevel
  ): number {
    const baseFrequency: Record<AssessmentType, number> = {
      [AssessmentType.MUST]: 7,
      [AssessmentType.Braden]: 3,
      [AssessmentType.WATERLOW]: 7,
      [AssessmentType.Morse_Fall]: 7,
      [AssessmentType.Barthel_Index]: 14,
      [AssessmentType.MMSE]: 30,
      [AssessmentType.PHQ9]: 14,
      [AssessmentType.GAD7]: 14,
      [AssessmentType.General]: 30
    };

    const multiplier = riskLevel === RiskLevel.High || riskLevel === RiskLevel.VeryHigh ? 0.5 : 1;

    return Math.max(1, Math.round(baseFrequency[type] * multiplier));
  }

  /**
   * Calculate trend from score array
   */
  private calculateTrend(scores: number[]): 'improving' | 'stable' | 'declining' | 'fluctuating' {
    if (scores.length < 2) return 'stable';

    // Simple linear regression for trend
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean);
      denominator += (i - xMean) * (i - xMean);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Calculate variance for stability check
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - yMean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / yMean;

    // Determine trend
    if (Math.abs(slope) < 0.5 && coefficientOfVariation < 0.1) {
      return 'stable';
    }

    if (coefficientOfVariation > 0.2) {
      return 'fluctuating';
    }

    return slope > 0 ? 'improving' : 'declining';
  }

  /**
   * Get recommendations based on assessment type and risk level
   */
  private async getRecommendations(
    type: AssessmentType,
    riskLevel: RiskLevel,
    patientId: string
  ): Promise<string[]> {
    switch (type) {
      case AssessmentType.MUST:
        return mustService.getMUSTRecommendations(riskLevel);
      case AssessmentType.Braden:
        return bradenService.getBradenRecommendations(riskLevel);
      case AssessmentType.Morse_Fall:
        return fallRiskAssessment.getMorseRecommendations(riskLevel);
      case AssessmentType.PHQ9:
        return mentalHealthAssessment.getPHQ9Recommendations(riskLevel);
      case AssessmentType.GAD7:
        return mentalHealthAssessment.getGAD7Recommendations(riskLevel);
      default:
        return this.getGenericRecommendations(riskLevel);
    }
  }

  /**
   * Generic recommendations
   */
  private getGenericRecommendations(riskLevel: RiskLevel): string[] {
    const recommendations: Record<RiskLevel, string[]> = {
      [RiskLevel.Low]: [
        'Continue routine monitoring',
        'Maintain current care plan'
      ],
      [RiskLevel.Medium]: [
        'Increase monitoring frequency',
        'Review and adjust care plan as needed',
        'Consider specialist referral'
      ],
      [RiskLevel.High]: [
        'Immediate intervention required',
        'Consider escalation of care',
        'Frequent monitoring recommended',
        'Review with multidisciplinary team'
      ],
      [RiskLevel.VeryHigh]: [
        'Urgent intervention required',
        'Escalate to senior clinical staff',
        'Consider emergency response protocols',
        'Continuous monitoring necessary'
      ],
      [RiskLevel.NoRisk]: [
        'No intervention required',
        'Routine follow-up only'
      ],
      [RiskLevel.Unknown]: [
        'Unable to determine risk level',
        'Re-assessment recommended',
        'Consult with clinical specialist'
      ]
    };

    return recommendations[riskLevel] || recommendations[RiskLevel.Unknown];
  }

  /**
   * Create history record
   */
  private async createHistoryRecord(
    assessment: IAssessment,
    previousAssessmentId?: string
  ): Promise<AssessmentHistory> {
    const history = new AssessmentHistory({
      patientId: assessment.patientId,
      type: assessment.type,
      assessmentId: assessment.assessmentId,
      date: assessment.date,
      score: assessment.score.score,
      maxScore: assessment.score.maxScore,
      riskLevel: assessment.riskLevel,
      scoreChange: assessment.riskChange,
      riskLevelChanged: previousAssessmentId
        ? assessment.riskLevel !== assessment.previousRiskLevel
        : false,
      previousAssessmentId,
      flagged:
        assessment.riskLevel === RiskLevel.High ||
        assessment.riskLevel === RiskLevel.VeryHigh,
      flagReason:
        assessment.riskLevel === RiskLevel.High || assessment.riskLevel === RiskLevel.VeryHigh
          ? `High risk level detected: ${assessment.riskLevel}`
          : undefined
    });

    await history.save();
    return history;
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    assessmentId: string,
    patientId: string,
    action: 'created' | 'updated' | 'completed' | 'cancelled' | 'flagged' | 'viewed',
    performedBy: string,
    performedByName?: string
  ): Promise<void> {
    const auditLog = new AssessmentAuditLog({
      auditId: `AUD-${uuidv4()}`,
      assessmentId,
      patientId,
      action,
      performedBy,
      performedByName,
      timestamp: new Date()
    });

    await auditLog.save();
  }

  // Service dependencies
  private mustService = mustService;
  private bradenService = bradenService;
  private fallRiskAssessment = fallRiskAssessment;
  private mentalHealthAssessment = mentalHealthAssessment;
}

export const assessmentService = new AssessmentService();
export default assessmentService;
