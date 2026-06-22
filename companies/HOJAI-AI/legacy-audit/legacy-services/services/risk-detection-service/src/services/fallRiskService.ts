import {
  FallRiskAssessment,
  IFallRiskAssessment,
  IFallRiskFactors,
  RiskLevel
} from '../models/risk';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface FallRiskAssessmentInput {
  factors: IFallRiskFactors;
  mobility: {
    ambulationStatus: 'independent' | 'supervision' | 'limited' | 'dependent';
    distance: number;
    assistanceRequired: boolean;
  };
  medications: {
    anticoagulants: boolean;
    psychotropics: boolean;
    polypharmacy: boolean;
  };
  history: {
    fallsInPastYear: number;
    injuriousFalls: number;
    lastFallDate?: Date;
  };
  assessedBy?: string;
}

interface FallScoreBreakdown {
  totalScore: number;
  visionScore: number;
  balanceScore: number;
  strengthScore: number;
  medicationScore: number;
  historyScore: number;
  environmentScore: number;
  additionalScore: number;
}

interface FallIncidentInput {
  date: Date;
  location: string;
  severity: 'minor' | 'moderate' | 'severe';
  injuries?: string[];
  witnesses?: string[];
  immediateResponse?: string;
  contributingFactors?: string[];
  reportedBy?: string;
}

export class FallRiskService {
  /**
   * Assess fall risk for a patient
   */
  async assessFallRisk(patientId: string, input: FallRiskAssessmentInput): Promise<IFallRiskAssessment> {
    logger.info(`Assessing fall risk for patient ${patientId}`);

    // Calculate the fall score
    const scoreBreakdown = this.calculateFallScore(input.factors);
    const score = scoreBreakdown.totalScore;

    // Determine risk level
    const riskLevel = this.determineRiskLevel(score);

    // Generate recommendations based on risk level and factors
    const recommendations = this.recommendFallInterventions(riskLevel, input.factors);

    // Calculate next assessment date based on risk level
    const nextAssessmentDue = this.calculateNextAssessmentDate(riskLevel);

    // Create the assessment record
    const assessment = new FallRiskAssessment({
      patientId,
      score,
      riskLevel,
      factors: input.factors,
      mobility: input.mobility,
      medications: input.medications,
      history: input.history,
      recommendations,
      assessedBy: input.assessedBy,
      assessmentDate: new Date(),
      nextAssessmentDue,
      alertSent: false
    });

    await assessment.save();

    logger.info(`Fall risk assessment completed for patient ${patientId}. Score: ${score}, Level: ${riskLevel}`);

    // Track correlation with previous incidents
    await this.trackFallIncidents(patientId);

    return assessment;
  }

  /**
   * Calculate fall risk score based on factors
   * Score range: 0-100, higher = higher risk
   */
  calculateFallScore(factors: IFallRiskFactors): FallScoreBreakdown {
    let visionScore = 0;
    let balanceScore = 0;
    let strengthScore = 0;
    let medicationScore = 0;
    let historyScore = 0;
    let environmentScore = 0;
    let additionalScore = 0;

    // Vision score (0-15)
    if (factors.vision.impaired) {
      switch (factors.vision.severity) {
        case 'mild':
          visionScore = 5;
          break;
        case 'moderate':
          visionScore = 10;
          break;
        case 'severe':
          visionScore = 15;
          break;
      }
    }

    // Balance score (0-20)
    if (factors.balance.impaired) {
      switch (factors.balance.gait) {
        case 'steady':
          balanceScore = 5;
          break;
        case 'unsteady':
          balanceScore = 12;
          break;
        case 'abnormal':
          balanceScore = 20;
          break;
      }
    } else {
      balanceScore = 0;
    }

    // Strength score (0-15)
    switch (factors.strength.lowerExtremity) {
      case 'mild_weakness':
        strengthScore = 5;
        break;
      case 'moderate_weakness':
        strengthScore = 10;
        break;
      case 'severe_weakness':
        strengthScore = 15;
        break;
    }

    // Medication score (0-20)
    medicationScore += Math.min(factors.medications.highRiskMedications.length * 4, 12);
    if (factors.medications.sedatives) medicationScore += 4;
    if (factors.medications.antihypertensives) medicationScore += 2;
    if (factors.medications.analgesics) medicationScore += 2;
    medicationScore = Math.min(medicationScore, 20);

    // History score (0-20)
    if (factors.history.previousFalls > 0) {
      historyScore = Math.min(factors.history.previousFalls * 4, 12);
    }
    if (factors.history.recentFallWithin30Days) historyScore += 5;
    if (factors.history.fearOfFalling) historyScore += 3;

    // Environment score (0-10)
    if (factors.environment.poorLighting) environmentScore += 3;
    if (factors.environment.stairs) environmentScore += 2;
    if (!factors.environment.bathroomsafety) environmentScore += 3;
    if (factors.environment.rugsCarpet) environmentScore += 2;
    environmentScore = Math.min(environmentScore, 10);

    // Additional factors score (0-10)
    if (factors.additionalFactors) {
      if (factors.additionalFactors.ageOver65) additionalScore += 2;
      if (factors.additionalFactors.cognitiveImpairment) additionalScore += 3;
      if (factors.additionalFactors.orthostaticHypotension) additionalScore += 2;
      if (factors.additionalFactors.incontinence) additionalScore += 1;
      if (factors.additionalFactors.footwear === 'inappropriate') additionalScore += 2;
    }

    const totalScore = Math.min(
      visionScore + balanceScore + strengthScore + medicationScore +
      historyScore + environmentScore + additionalScore,
      100
    );

    return {
      totalScore,
      visionScore,
      balanceScore,
      strengthScore,
      medicationScore,
      historyScore,
      environmentScore,
      additionalScore
    };
  }

  /**
   * Determine risk level based on score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score < 20) return RiskLevel.LOW;
    if (score < 40) return RiskLevel.MODERATE;
    if (score < 60) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Get fall risk history for a patient
   */
  async getFallRiskHistory(patientId: string, limit = 10): Promise<IFallRiskAssessment[]> {
    return FallRiskAssessment.find({ patientId })
      .sort({ assessmentDate: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get latest fall risk assessment
   */
  async getLatestAssessment(patientId: string): Promise<IFallRiskAssessment | null> {
    return FallRiskAssessment.findOne({ patientId })
      .sort({ assessmentDate: -1 })
      .lean();
  }

  /**
   * Get fall risk trend over time
   */
  async getFallRiskTrend(patientId: string, days = 30): Promise<{
    date: Date;
    score: number;
    riskLevel: RiskLevel;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const assessments = await FallRiskAssessment.find({
      patientId,
      assessmentDate: { $gte: startDate }
    })
      .sort({ assessmentDate: 1 })
      .select('assessmentDate score riskLevel')
      .lean();

    return assessments.map(a => ({
      date: a.assessmentDate,
      score: a.score,
      riskLevel: a.riskLevel
    }));
  }

  /**
   * Recommend fall interventions based on risk level and factors
   */
  recommendFallInterventions(riskLevel: RiskLevel, factors?: IFallRiskFactors): string[] {
    const interventions: string[] = [];

    // Universal interventions for all patients
    interventions.push('Ensure clear pathways and adequate lighting');
    interventions.push('Remove or secure rugs and tripping hazards');
    interventions.push('Install grab bars in bathrooms');
    interventions.push('Review medication regimen');

    switch (riskLevel) {
      case RiskLevel.LOW:
        interventions.push('Encourage regular exercise to maintain strength');
        interventions.push('Annual vision screening');
        interventions.push('Wear non-slip footwear');
        break;

      case RiskLevel.MODERATE:
        interventions.push('Consider assistive device evaluation');
        interventions.push('Increase supervision during high-risk activities');
        interventions.push('Install night lights in hallways');
        interventions.push('Review blood pressure medications for orthostatic effects');
        interventions.push('Consider physical therapy referral');
        break;

      case RiskLevel.HIGH:
        interventions.push('PT/OT evaluation for mobility and home safety');
        interventions.push('Implement bed/chair alarms');
        interventions.push('Daily monitoring of orthostatic vitals');
        interventions.push('Medication review by pharmacist');
        interventions.push('Hip protector consideration');
        interventions.push('Frequent toileting schedule');
        break;

      case RiskLevel.VERY_HIGH:
        interventions.push('1:1 supervision or constant observation');
        interventions.push('Comprehensive medication review within 24 hours');
        interventions.push('Cardiology/neurology consultation as appropriate');
        interventions.push('Environmental modification assessment');
        interventions.push('Consider skilled nursing facility if home unsafe');
        interventions.push('Immediate PT/OT referral');
        interventions.push('Implement comprehensive fall prevention protocol');
        break;
    }

    // Factor-specific interventions
    if (factors) {
      if (factors.vision.impaired) {
        interventions.push('Eye specialist referral');
        interventions.push('Adequate lighting throughout home');
        interventions.push('Contrasting colors for edges and steps');
      }

      if (factors.balance.gait === 'abnormal' || factors.balance.gait === 'unsteady') {
        interventions.push('Gait and balance training');
        interventions.push('Appropriate assistive device (walker/cane)');
      }

      if (factors.history.previousFalls > 0) {
        interventions.push('Post-fall huddle and root cause analysis');
        interventions.push('Implement post-fall protocol');
      }

      if (factors.medications.sedatives || factors.medications.highRiskMedications.length > 0) {
        interventions.push('Review and potentially reduce high-risk medications');
        interventions.push('Time medications to minimize sedation risk');
      }

      if (factors.additionalFactors?.cognitiveImpairment) {
        interventions.push('Dementia-specific fall prevention strategies');
        interventions.push('Structured environment to reduce confusion');
      }
    }

    return [...new Set(interventions)]; // Remove duplicates
  }

  /**
   * Track fall incidents and update risk correlation
   */
  async trackFallIncidents(patientId: string): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAssessments = await FallRiskAssessment.find({
      patientId,
      assessmentDate: { $gte: thirtyDaysAgo }
    })
      .sort({ assessmentDate: -1 })
      .limit(5);

    if (recentAssessments.length > 1) {
      // Check for pattern - increasing scores may indicate rising risk
      const scores = recentAssessments.map(a => a.score);
      const latestScore = scores[0];
      const previousAvg = scores.slice(1).reduce((a, b) => a + b, 0) / (scores.length - 1);

      if (latestScore > previousAvg + 10) {
        logger.warn(`Patient ${patientId} shows increasing fall risk trend. Latest: ${latestScore}, Previous avg: ${previousAvg}`);
      }
    }
  }

  /**
   * Record a new fall incident
   */
  async recordFallIncident(patientId: string, incident: FallIncidentInput): Promise<void> {
    logger.info(`Recording fall incident for patient ${patientId}`);

    // Update the latest assessment with new fall history
    const latestAssessment = await FallRiskAssessment.findOne({ patientId })
      .sort({ assessmentDate: -1 });

    if (latestAssessment) {
      latestAssessment.history.fallsInPastYear += 1;
      if (incident.severity !== 'minor') {
        latestAssessment.history.injuriousFalls += 1;
      }
      latestAssessment.history.lastFallDate = incident.date;

      // Re-assess risk after fall
      const newScore = this.calculateFallScore(latestAssessment.factors);
      latestAssessment.score = newScore.totalScore;
      latestAssessment.riskLevel = this.determineRiskLevel(newScore.totalScore);
      latestAssessment.recommendations = this.recommendFallInterventions(latestAssessment.riskLevel, latestAssessment.factors);
      latestAssessment.alertSent = false;

      await latestAssessment.save();
    }

    // Schedule earlier reassessment after fall
    const earlierAssessment = this.assessFallRisk(patientId, {
      factors: latestAssessment?.factors || {
        vision: { impaired: false, severity: 'mild' },
        balance: { impaired: false, gait: 'normal' },
        strength: { lowerExtremity: 'normal', fatigueLevel: 'none' },
        medications: { highRiskMedications: [], totalMedications: 0, sedatives: false, antihypertensives: false, analgesics: false },
        history: { previousFalls: 1, recentFallWithin30Days: true, fearOfFalling: false, hipFracture: false },
        environment: { homeHazards: [], poorLighting: false, stairs: false, bathroomsafety: true, rugsCarpet: false }
      },
      mobility: latestAssessment?.mobility || {
        ambulationStatus: 'supervision',
        distance: 0,
        assistanceRequired: true
      },
      medications: latestAssessment?.medications || {
        anticoagulants: false,
        psychotropics: false,
        polypharmacy: false
      },
      history: latestAssessment?.history || {
        fallsInPastYear: 1,
        injuriousFalls: incident.severity !== 'minor' ? 1 : 0,
        lastFallDate: incident.date
      },
      assessedBy: incident.reportedBy
    });

    logger.info(`Post-fall reassessment scheduled for patient ${patientId}`);
  }

  /**
   * Get patients with high fall risk for dashboard
   */
  async getHighRiskPatients(limit = 50): Promise<IFallRiskAssessment[]> {
    return FallRiskAssessment.aggregate([
      { $sort: { assessmentDate: -1 } },
      { $group: {
        _id: '$patientId',
        latestAssessment: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$latestAssessment' } },
      { $match: { riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.VERY_HIGH] } } },
      { $sort: { score: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Calculate next assessment date based on risk level
   */
  private calculateNextAssessmentDate(riskLevel: RiskLevel): Date {
    const date = new Date();
    switch (riskLevel) {
      case RiskLevel.LOW:
        date.setDate(date.getDate() + 90); // Every 3 months
        break;
      case RiskLevel.MODERATE:
        date.setDate(date.getDate() + 30); // Monthly
        break;
      case RiskLevel.HIGH:
        date.setDate(date.getDate() + 14); // Every 2 weeks
        break;
      case RiskLevel.VERY_HIGH:
        date.setDate(date.getDate() + 7); // Weekly
        break;
    }
    return date;
  }

  /**
   * Get overdue assessments
   */
  async getOverdueAssessments(): Promise<IFallRiskAssessment[]> {
    const now = new Date();
    return FallRiskAssessment.find({
      nextAssessmentDue: { $lt: now },
      alertSent: false
    })
      .sort({ nextAssessmentDue: 1 })
      .limit(100);
  }

  /**
   * Mark assessment as alerted
   */
  async markAssessmentAlerted(assessmentId: string): Promise<void> {
    await FallRiskAssessment.findByIdAndUpdate(assessmentId, { alertSent: true });
  }
}

export const fallRiskService = new FallRiskService();
