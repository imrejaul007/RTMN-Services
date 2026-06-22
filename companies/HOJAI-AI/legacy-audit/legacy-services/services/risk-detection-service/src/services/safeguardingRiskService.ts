import {
  SafeguardingRisk,
  ISafeguardingRisk,
  ISafeguardingVulnerability,
  RiskLevel,
  SafeguardingConcernType
} from '../models/risk';
import { logger } from '../utils/logger';
import { alertService } from './alertService';

interface SafeguardingAssessmentInput {
  concernType: SafeguardingConcernType;
  vulnerabilities: ISafeguardingVulnerability[];
  riskIndicators: {
    isolation?: boolean;
    financialExploitation?: boolean;
    unexplainedInjuries?: boolean;
    caregiverStress?: boolean;
    missedAppointments?: boolean;
    medicationNonCompliance?: boolean;
    changesInBehavior?: boolean;
    poorHygiene?: boolean;
    inadequateNutrition?: boolean;
    housingConcerns?: boolean;
  };
  protectiveFactors?: string[];
  assessedBy?: string;
}

interface SafeguardingRiskResult {
  patientId: string;
  riskLevel: RiskLevel;
  concernType: SafeguardingConcernType;
  vulnerabilities: ISafeguardingVulnerability[];
  riskIndicators: ISafeguardingRisk['riskIndicators'];
  protectiveFactors: string[];
  immediateActions: string[];
  recommendations: string[];
  referralNeeded: boolean;
  urgentResponseRequired: boolean;
}

export class SafeguardingRiskService {
  /**
   * Assess safeguarding risk for a patient
   */
  async assessSafeguardingRisk(
    patientId: string,
    input: SafeguardingAssessmentInput
  ): Promise<SafeguardingRiskResult> {
    logger.info(`Assessing safeguarding risk for patient ${patientId}`);

    // Calculate risk level based on vulnerabilities and indicators
    const riskLevel = this.calculateRiskLevel(input.vulnerabilities, input.riskIndicators);

    // Generate immediate actions based on concern type and risk level
    const immediateActions = this.recommendSafeguardingActions(riskLevel, input.concernType, input.vulnerabilities);

    // Generate overall recommendations
    const recommendations = this.generateRecommendations(input, riskLevel);

    // Determine if referral is needed
    const referralNeeded = this.determineReferralNeed(riskLevel, input.concernType);

    // Determine if urgent response required
    const urgentResponseRequired = this.isUrgentResponseRequired(riskLevel, input.vulnerabilities);

    // Default protective factors if not provided
    const protectiveFactors = input.protectiveFactors || this.identifyProtectiveFactors(input);

    // Create the safeguarding risk record
    const safeguardingRisk = new SafeguardingRisk({
      patientId,
      concernType: input.concernType,
      riskLevel,
      vulnerabilities: input.vulnerabilities,
      riskIndicators: {
        isolation: input.riskIndicators.isolation || false,
        financialExploitation: input.riskIndicators.financialExploitation || false,
        unexplainedInjuries: input.riskIndicators.unexplainedInjuries || false,
        caregiverStress: input.riskIndicators.caregiverStress || false,
        missedAppointments: input.riskIndicators.missedAppointments || false,
        medicationNonCompliance: input.riskIndicators.medicationNonCompliance || false,
        changesInBehavior: input.riskIndicators.changesInBehavior || false,
        poorHygiene: input.riskIndicators.poorHygiene || false,
        inadequateNutrition: input.riskIndicators.inadequateNutrition || false,
        housingConcerns: input.riskIndicators.housingConcerns || false
      },
      protectiveFactors,
      immediateActions,
      referrals: [],
      flaggedForReview: false,
      alertSent: false
    });

    await safeguardingRisk.save();

    // Send alert if high risk
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      await alertService.sendRiskAlert(patientId, 'safeguarding', riskLevel, {
        concernType: input.concernType,
        riskLevel,
        vulnerabilities: input.vulnerabilities.filter(v => v.present),
        immediateActions,
        recommendations
      });
    }

    logger.info(
      `Safeguarding risk assessment completed for patient ${patientId}. ` +
      `Concern: ${input.concernType}, Risk Level: ${riskLevel}`
    );

    return {
      patientId,
      riskLevel,
      concernType: input.concernType,
      vulnerabilities: input.vulnerabilities,
      riskIndicators: safeguardingRisk.riskIndicators,
      protectiveFactors,
      immediateActions,
      recommendations,
      referralNeeded,
      urgentResponseRequired
    };
  }

  /**
   * Identify vulnerabilities for a patient
   */
  async identifyVulnerabilities(patientId: string): Promise<ISafeguardingVulnerability[]> {
    // Get previous assessments to identify patterns
    const previousAssessments = await SafeguardingRisk.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const vulnerabilities: ISafeguardingVulnerability[] = Object.values(SafeguardingConcernType).map(
      (category) => {
        const previous = previousAssessments.find(a => a.concernType === category);
        return {
          category,
          present: previous?.vulnerabilities.some(v => v.category === category && v.present) || false,
          severity: previous?.vulnerabilities.find(v => v.category === category)?.severity || 'low',
          evidence: previous?.vulnerabilities.find(v => v.category === category)?.evidence || [],
          reported: previous?.vulnerabilities.find(v => v.category === category)?.reported || false
        } as ISafeguardingVulnerability;
      }
    );

    return vulnerabilities;
  }

  /**
   * Recommend safeguarding actions based on risk level
   */
  recommendSafeguardingActions(
    riskLevel: RiskLevel,
    concernType: SafeguardingConcernType,
    vulnerabilities: ISafeguardingVulnerability[]
  ): string[] {
    const actions: string[] = [];

    // Universal actions for any safeguarding concern
    actions.push('Document all observations factually and contemporaneously');
    actions.push('Maintain confidentiality while ensuring information sharing is on a need-to-know basis');
    actions.push('Do not confront alleged perpetrator');
    actions.push('Preserve any potential evidence');

    switch (riskLevel) {
      case RiskLevel.LOW:
        actions.push('Continue routine monitoring');
        actions.push('Build rapport and trust with patient');
        break;

      case RiskLevel.MODERATE:
        actions.push('Increase monitoring frequency');
        actions.push('Discuss concerns with safeguarding lead');
        actions.push('Consider multi-agency information sharing');
        actions.push('Develop safety plan with patient');
        break;

      case RiskLevel.HIGH:
        actions.push('IMMEDIATE: Inform safeguarding lead and line manager');
        actions.push('Consider multi-agency risk assessment conference (MARAC) referral');
        actions.push('Develop comprehensive safety plan');
        actions.push('Coordinate with social services if applicable');
        actions.push('Consider capacity assessment if concerns about decision-making');
        break;

      case RiskLevel.VERY_HIGH:
        actions.push('URGENT: Immediate safeguarding lead notification');
        actions.push('Consider immediate referral to adult social care / local authority');
        actions.push('Call emergency services if immediate danger');
        actions.push('Do not leave patient alone if in immediate danger');
        actions.push('Consider emergency protection order if lacking capacity');
        actions.push('Coordinate urgent multi-agency response');
        break;
    }

    // Concern-specific actions
    switch (concernType) {
      case SafeguardingConcernType.PHYSICAL_ABUSE:
        if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
          actions.push('URGENT: Photograph injuries if patient consents');
          actions.push('Arrange medical examination if injuries present');
          actions.push('Consider police notification');
        }
        actions.push('Assess for patterns of injury');
        actions.push('Enquire about circumstances of injuries in non-leading manner');
        break;

      case SafeguardingConcernType.NEGLECT:
        actions.push('Assess basic needs: nutrition, hydration, medication, hygiene');
        actions.push('Evaluate capacity to care for self');
        actions.push('Consider care needs assessment');
        actions.push('Evaluate caregiver capability and stress levels');
        break;

      case SafeguardingConcernType.SELF_NEGLECT:
        actions.push('Assess mental capacity regarding self-care decisions');
        actions.push('Explore reasons for self-neglect (mental health, trauma, hoarding)');
        actions.push('Consider multi-disciplinary team approach');
        actions.push('Balance autonomy with duty of care');
        break;

      case SafeguardingConcernType.FINANCIAL_ABUSE:
        actions.push('Review financial records for unexplained transactions');
        actions.push('Assess understanding of financial decisions');
        actions.push('Consider Lasting Power of Attorney concerns');
        actions.push('Coordinate with financial institutions if appropriate');
        actions.push('Refer to Trading Standards if scams suspected');
        break;

      case SafeguardingConcernType.DOMESTIC_VIOLENCE:
        actions.push('Complete domestic violence risk assessment');
        actions.push('Enquire about children in household if applicable');
        actions.push('Consider MARAC referral for high-risk cases');
        actions.push('Provide information about domestic violence services');
        actions.push('Develop safe escape plan');
        break;

      case SafeguardingConcernType.EMOTIONAL_ABUSE:
        actions.push('Listen to and validate patient experiences');
        actions.push('Look for signs of controlling behavior');
        actions.push('Assess impact on mental health and wellbeing');
        actions.push('Consider psychological support referral');
        break;
    }

    return [...new Set(actions)];
  }

  /**
   * Flag patient for human review
   */
  async flagForReview(patientId: string, concern: string): Promise<void> {
    logger.info(`Flagging patient ${patientId} for safeguarding review. Concern: ${concern}`);

    // Find existing record or create new
    const existingRecord = await SafeguardingRisk.findOne({ patientId })
      .sort({ createdAt: -1 });

    if (existingRecord) {
      await SafeguardingRisk.findByIdAndUpdate(existingRecord._id, {
        flaggedForReview: true,
        reviewDate: new Date()
      });
    } else {
      const newRecord = new SafeguardingRisk({
        patientId,
        concernType: SafeguardingConcernType.SELF_NEGLECT, // Default
        riskLevel: RiskLevel.MODERATE,
        vulnerabilities: [],
        riskIndicators: {
          changesInBehavior: true
        },
        protectiveFactors: [],
        immediateActions: [`Manual review flagged: ${concern}`],
        flaggedForReview: true,
        reviewDate: new Date(),
        alertSent: false
      });
      await newRecord.save();
    }
  }

  /**
   * Calculate risk level based on vulnerabilities and indicators
   */
  private calculateRiskLevel(
    vulnerabilities: ISafeguardingVulnerability[],
    indicators: SafeguardingAssessmentInput['riskIndicators']
  ): RiskLevel {
    let riskScore = 0;

    // Score vulnerabilities
    vulnerabilities.forEach(v => {
      if (v.present) {
        switch (v.severity) {
          case 'high':
            riskScore += 4;
            break;
          case 'medium':
            riskScore += 2;
            break;
          case 'low':
            riskScore += 1;
            break;
        }
      }
    });

    // Score risk indicators
    if (indicators.isolation) riskScore += 2;
    if (indicators.unexplainedInjuries) riskScore += 3;
    if (indicators.caregiverStress) riskScore += 2;
    if (indicators.changesInBehavior) riskScore += 1;
    if (indicators.poorHygiene) riskScore += 1;
    if (indicators.inadequateNutrition) riskScore += 2;
    if (indicators.housingConcerns) riskScore += 1;
    if (indicators.missedAppointments) riskScore += 1;
    if (indicators.medicationNonCompliance) riskScore += 1;
    if (indicators.financialExploitation) riskScore += 3;

    // Determine risk level
    if (riskScore >= 10) return RiskLevel.VERY_HIGH;
    if (riskScore >= 6) return RiskLevel.HIGH;
    if (riskScore >= 3) return RiskLevel.MODERATE;
    return RiskLevel.LOW;
  }

  /**
   * Identify protective factors
   */
  private identifyProtectiveFactors(input: SafeguardingAssessmentInput): string[] {
    const factors: string[] = [];

    // Check if patient has good support network
    if (!input.riskIndicators.isolation) {
      factors.push('Has support network / social connections');
    }

    // Check if patient can advocate for themselves
    factors.push('Patient engagement with services');

    // Good physical health is protective
    if (!input.riskIndicators.poorHygiene && !input.riskIndicators.inadequateNutrition) {
      factors.push('Basic self-care needs being met');
    }

    return factors;
  }

  /**
   * Generate comprehensive recommendations
   */
  private generateRecommendations(
    input: SafeguardingAssessmentInput,
    riskLevel: RiskLevel
  ): string[] {
    const recommendations: string[] = [];

    // Universal recommendations
    recommendations.push('Maintain accurate records of all concerns');
    recommendations.push('Follow safeguarding policy and procedures');
    recommendations.push('Share information appropriately with other agencies');
    recommendations.push('Review and monitor regularly');

    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      recommendations.push('Consider Deprivation of Liberty Safeguards (DoLS) if applicable');
      recommendations.push('Involve independent advocacy services');
      recommendations.push('Consider mental capacity assessment');
    }

    return recommendations;
  }

  /**
   * Determine if referral is needed
   */
  private determineReferralNeed(
    riskLevel: RiskLevel,
    concernType: SafeguardingConcernType
  ): boolean {
    // High or very high risk always needs referral
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      return true;
    }

    // Certain concerns may need referral even at moderate level
    const alwaysReferConcerns = [
      SafeguardingConcernType.PHYSICAL_ABUSE,
      SafeguardingConcernType.SEXUAL_ABUSE,
      SafeguardingConcernType.MODERN_SLAVERY,
      SafeguardingConcernType.RADICALISATION
    ];

    if (alwaysReferConcerns.includes(concernType)) {
      return true;
    }

    return false;
  }

  /**
   * Determine if urgent response is required
   */
  private isUrgentResponseRequired(
    riskLevel: RiskLevel,
    vulnerabilities: ISafeguardingVulnerability[]
  ): boolean {
    // Very high risk is always urgent
    if (riskLevel === RiskLevel.VERY_HIGH) {
      return true;
    }

    // Check for critical vulnerabilities
    const hasCriticalVulnerability = vulnerabilities.some(
      v => v.present && v.severity === 'high' &&
      [SafeguardingConcernType.PHYSICAL_ABUSE, SafeguardingConcernType.SEXUAL_ABUSE].includes(v.category)
    );

    if (hasCriticalVulnerability) {
      return true;
    }

    return false;
  }

  /**
   * Get safeguarding risk history for a patient
   */
  async getSafeguardingHistory(patientId: string, limit = 10): Promise<ISafeguardingRisk[]> {
    return SafeguardingRisk.find({ patientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get latest safeguarding risk for a patient
   */
  async getLatestSafeguardingRisk(patientId: string): Promise<ISafeguardingRisk | null> {
    return SafeguardingRisk.findOne({ patientId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get all flagged safeguarding cases
   */
  async getFlaggedCases(): Promise<ISafeguardingRisk[]> {
    return SafeguardingRisk.find({
      flaggedForReview: true,
      reviewedBy: { $exists: false }
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Mark safeguarding case as reviewed
   */
  async markAsReviewed(safeguardingId: string, reviewedBy: string): Promise<void> {
    await SafeguardingRisk.findByIdAndUpdate(safeguardingId, {
      reviewedBy,
      reviewDate: new Date()
    });

    logger.info(`Safeguarding case ${safeguardingId} reviewed by ${reviewedBy}`);
  }

  /**
   * Add referral to safeguarding case
   */
  async addReferral(
    safeguardingId: string,
    referral: {
      type: string;
      agency: string;
      date: Date;
      outcome?: string;
    }
  ): Promise<void> {
    await SafeguardingRisk.findByIdAndUpdate(safeguardingId, {
      $push: {
        referrals: referral
      }
    });

    logger.info(`Referral added to safeguarding case ${safeguardingId}: ${referral.type} to ${referral.agency}`);
  }

  /**
   * Get patients with high safeguarding risk
   */
  async getHighRiskPatients(limit = 50): Promise<ISafeguardingRisk[]> {
    return SafeguardingRisk.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$patientId',
        latestRisk: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$latestRisk' } },
      { $match: { riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.VERY_HIGH] } } },
      { $sort: { createdAt: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Get safeguarding statistics
   */
  async getStatistics(): Promise<{
    totalCases: number;
    highRiskCases: number;
    byConcernType: Record<string, number>;
    byRiskLevel: Record<string, number>;
    flaggedForReview: number;
  }> {
    const totalCases = await SafeguardingRisk.countDocuments();
    const highRiskCases = await SafeguardingRisk.countDocuments({
      riskLevel: { $in: [RiskLevel.HIGH, RiskLevel.VERY_HIGH] }
    });
    const flaggedForReview = await SafeguardingRisk.countDocuments({
      flaggedForReview: true,
      reviewedBy: { $exists: false }
    });

    const byConcernType: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    const aggregations = await SafeguardingRisk.aggregate([
      {
        $facet: {
          concernType: [{ $group: { _id: '$concernType', count: { $sum: 1 } } }],
          riskLevel: [{ $group: { _id: '$riskLevel', count: { $sum: 1 } } }]
        }
      }
    ]);

    if (aggregations[0]) {
      aggregations[0].concernType.forEach((item: { _id: string; count: number }) => {
        byConcernType[item._id] = item.count;
      });
      aggregations[0].riskLevel.forEach((item: { _id: string; count: number }) => {
        byRiskLevel[item._id] = item.count;
      });
    }

    return {
      totalCases,
      highRiskCases,
      byConcernType,
      byRiskLevel,
      flaggedForReview
    };
  }
}

export const safeguardingRiskService = new SafeguardingRiskService();
