import {
  WoundAssessment,
  PressureUlcerRisk,
  IWoundAssessment,
  IWoundRiskFactors,
  IBradenFactors,
  RiskLevel,
  WoundStage
} from '../models/risk';
import { logger } from '../utils/logger';

interface WoundAssessmentInput {
  woundId: string;
  location: string;
  stage: WoundStage;
  size?: {
    length: number;
    width: number;
    depth: number;
  };
  riskFactors: IWoundRiskFactors;
  infectionRisk?: 'none' | 'low' | 'moderate' | 'high' | 'critical';
  exudate?: {
    type: 'none' | 'serous' | 'sanguineous' | 'seropurulent' | 'purulent';
    amount: 'none' | 'light' | 'moderate' | 'heavy';
  };
  tissueViability?: {
    granulation: number;
    slough: number;
    necrosis: number;
  };
  surroundingSkin?: {
    temperature: 'normal' | 'warm' | 'hot' | 'cool';
    color: string;
    edema: 'none' | 'mild' | 'moderate' | 'severe';
    integrity: 'intact' | 'macerated' | 'denuded';
  };
  pain?: {
    level: number;
    constant?: boolean;
    throbbing?: boolean;
  };
  odor?: boolean;
  photos?: string[];
  assessedBy?: string;
}

interface PressureUlcerAssessmentInput {
  factors: IBradenFactors;
  assessedBy?: string;
}

interface WoundDeteriorationResult {
  woundId: string;
  patientId: string;
  deteriorated: boolean;
  trend: 'improving' | 'stable' | 'worsening';
  changes: {
    sizeIncreased: boolean;
    depthIncreased: boolean;
    stageProgressed: boolean;
    infectionRiskIncreased: boolean;
    tissueDeathIncreased: boolean;
    exudateIncreased: boolean;
  };
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  recommendations: string[];
}

interface BradenScoreBreakdown {
  totalScore: number;
  sensoryPerceptionScore: number;
  moistureScore: number;
  activityScore: number;
  mobilityScore: number;
  nutritionScore: number;
  frictionShearScore: number;
}

export class WoundRiskService {
  /**
   * Assess wound risk for a patient
   */
  async assessWoundRisk(patientId: string, input: WoundAssessmentInput): Promise<IWoundAssessment> {
    logger.info(`Assessing wound risk for patient ${patientId}, wound ${input.woundId}`);

    // Calculate infection risk if not provided
    const infectionRisk = input.infectionRisk || this.calculateInfectionRisk(input);

    // Calculate assessment score
    const score = this.calculateWoundScore(input);

    // Detect deterioration compared to previous assessment
    const previousAssessment = await this.getPreviousAssessment(patientId, input.woundId);
    const deterioration = previousAssessment
      ? this.detectWoundDeterioration(input.woundId)
      : null;

    // Generate recommendations
    const recommendations = this.recommendWoundCare(
      this.determineWoundRiskLevel(score),
      input.stage,
      infectionRisk
    );

    // Calculate next assessment date
    const nextAssessmentDue = this.calculateNextAssessmentDate(input.stage, score);

    const assessment = new WoundAssessment({
      patientId,
      woundId: input.woundId,
      location: input.location,
      stage: input.stage,
      size: input.size ? {
        ...input.size,
        area: input.size.length * input.size.width
      } : undefined,
      riskFactors: input.riskFactors,
      infectionRisk,
      exudate: input.exudate || { type: 'none', amount: 'none' },
      tissueViability: input.tissueViability || { granulation: 0, slough: 0, necrosis: 0 },
      surroundingSkin: input.surroundingSkin || {
        temperature: 'normal',
        color: 'normal',
        edema: 'none',
        integrity: 'intact'
      },
      pain: input.pain || { level: 0, constant: false, throbbing: false },
      odor: input.odor || false,
      assessmentScore: score,
      recommendations,
      photos: input.photos,
      assessedBy: input.assessedBy,
      assessmentDate: new Date(),
      nextAssessmentDue,
      alertSent: false,
      deteriorationDetected: deterioration?.deteriorated || false,
      deteriorationTrend: deterioration?.trend
    });

    await assessment.save();

    logger.info(
      `Wound assessment completed for patient ${patientId}, wound ${input.woundId}. ` +
      `Score: ${score}, Stage: ${input.stage}, Deterioration: ${deterioration?.deteriorated || false}`
    );

    return assessment;
  }

  /**
   * Assess pressure ulcer risk using Braden Scale
   */
  async assessPressureUlcerRisk(patientId: string, input: PressureUlcerAssessmentInput): Promise<PressureUlcerRisk> {
    logger.info(`Assessing pressure ulcer risk for patient ${patientId}`);

    // Calculate Braden score
    const bradenScore = this.calculateBradenScore(input.factors);
    const scoreBreakdown = this.calculateBradenScoreBreakdown(input.factors);

    // Determine risk level
    const riskLevel = this.determineBradenRiskLevel(bradenScore);

    // Identify risk zones
    const riskZones = this.identifyRiskZones(input.factors);

    // Generate recommendations
    const recommendations = this.recommendPressureUlcerCare(riskLevel, input.factors);

    // Calculate next assessment date
    const nextAssessmentDue = this.calculateBradenNextAssessmentDate(riskLevel);

    const assessment = new PressureUlcerRisk({
      patientId,
      bradenScore,
      riskLevel,
      factors: input.factors,
      riskZones,
      recommendations,
      repositioningSchedule: this.getRepositioningSchedule(riskLevel),
      supportSurface: this.getSupportSurface(riskLevel),
      skinInspectionFrequency: this.getSkinInspectionFrequency(riskLevel),
      assessedBy: input.assessedBy,
      assessmentDate: new Date(),
      nextAssessmentDue,
      alertSent: false
    });

    await assessment.save();

    logger.info(
      `Pressure ulcer risk assessment completed for patient ${patientId}. ` +
      `Braden Score: ${bradenScore}, Risk Level: ${riskLevel}`
    );

    return assessment;
  }

  /**
   * Calculate Braden Scale score (6-23, lower = higher risk)
   */
  calculateBradenScore(factors: IBradenFactors): number {
    return (
      factors.sensoryPerception +
      factors.moisture +
      factors.activity +
      factors.mobility +
      factors.nutrition +
      factors.frictionShear
    );
  }

  /**
   * Calculate detailed Braden score breakdown
   */
  calculateBradenScoreBreakdown(factors: IBradenFactors): BradenScoreBreakdown {
    return {
      totalScore: this.calculateBradenScore(factors),
      sensoryPerceptionScore: factors.sensoryPerception,
      moistureScore: factors.moisture,
      activityScore: factors.activity,
      mobilityScore: factors.mobility,
      nutritionScore: factors.nutrition,
      frictionShearScore: factors.frictionShear
    };
  }

  /**
   * Determine risk level from Braden score
   * Braden Scale interpretation:
   * 23 = No risk
   * 15-18 = At risk
   * 13-14 = Moderate risk
   * 10-12 = High risk
   * 6-9 = Very high risk
   */
  private determineBradenRiskLevel(score: number): RiskLevel {
    if (score >= 19) return RiskLevel.LOW;
    if (score >= 15) return RiskLevel.MODERATE;
    if (score >= 10) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Detect wound deterioration by comparing with previous assessment
   */
  async detectWoundDeterioration(woundId: string): Promise<WoundDeteriorationResult> {
    const assessments = await WoundAssessment.find({ woundId })
      .sort({ assessmentDate: -1 })
      .limit(2)
      .lean();

    if (assessments.length < 2) {
      return {
        woundId,
        patientId: assessments[0]?.patientId || '',
        deteriorated: false,
        trend: 'stable',
        changes: {
          sizeIncreased: false,
          depthIncreased: false,
          stageProgressed: false,
          infectionRiskIncreased: false,
          tissueDeathIncreased: false,
          exudateIncreased: false
        },
        severity: 'none',
        recommendations: []
      };
    }

    const [current, previous] = assessments;

    const changes = {
      sizeIncreased: false,
      depthIncreased: false,
      stageProgressed: false,
      infectionRiskIncreased: false,
      tissueDeathIncreased: false,
      exudateIncreased: false
    };

    // Check size changes
    if (current.size && previous.size) {
      const currentArea = current.size.length * current.size.width;
      const previousArea = previous.size.length * previous.size.width;
      changes.sizeIncreased = currentArea > previousArea * 1.1; // 10% increase threshold
      changes.depthIncreased = current.size.depth > previous.size.depth;
    }

    // Check stage progression
    const stageOrder = [
      WoundStage.STAGE_1,
      WoundStage.STAGE_2,
      WoundStage.STAGE_3,
      WoundStage.STAGE_4,
      WoundStage.UNSTAGEABLE,
      WoundStage.DEEP_TISSUE
    ];
    const currentStageIndex = stageOrder.indexOf(current.stage as WoundStage);
    const previousStageIndex = stageOrder.indexOf(previous.stage as WoundStage);
    changes.stageProgressed = currentStageIndex > previousStageIndex;

    // Check infection risk
    const infectionLevels = ['none', 'low', 'moderate', 'high', 'critical'];
    changes.infectionRiskIncreased =
      infectionLevels.indexOf(current.infectionRisk) >
      infectionLevels.indexOf(previous.infectionRisk);

    // Check tissue viability (increase in necrosis/slough)
    if (current.tissueViability && previous.tissueViability) {
      const currentDeath = current.tissueViability.necrosis + current.tissueViability.slough;
      const previousDeath = previous.tissueViability.necrosis + previous.tissueViability.slough;
      changes.tissueDeathIncreased = currentDeath > previousDeath + 10; // 10% increase
    }

    // Check exudate
    if (current.exudate && previous.exudate) {
      const exudateAmounts = ['none', 'light', 'moderate', 'heavy'];
      changes.exudateIncreased =
        exudateAmounts.indexOf(current.exudate.amount) >
        exudateAmounts.indexOf(previous.exudate.amount);
    }

    // Determine if deterioration occurred
    const deteriorated = Object.values(changes).some(Boolean);

    // Determine trend
    let trend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (!deteriorated && current.assessmentScore < previous.assessmentScore) {
      trend = 'improving';
    } else if (deteriorated) {
      trend = 'worsening';
    }

    // Calculate severity
    let severity: 'none' | 'mild' | 'moderate' | 'severe' = 'none';
    const deteriorationCount = Object.values(changes).filter(Boolean).length;
    if (deteriorationCount >= 4) severity = 'severe';
    else if (deteriorationCount >= 2) severity = 'moderate';
    else if (deteriorationCount >= 1) severity = 'mild';

    // Generate recommendations
    const recommendations = this.recommendDeteriorationResponse(changes, current);

    // Update the assessment with deterioration info
    if (deteriorated) {
      await WoundAssessment.findByIdAndUpdate(current._id, {
        deteriorationDetected: true,
        deteriorationTrend: trend
      });
    }

    return {
      woundId,
      patientId: current.patientId,
      deteriorated,
      trend,
      changes,
      severity,
      recommendations
    };
  }

  /**
   * Recommend wound care based on risk level
   */
  recommendWoundCare(
    riskLevel: RiskLevel,
    stage: WoundStage,
    infectionRisk: string
  ): string[] {
    const interventions: string[] = [];

    // Stage-specific care
    switch (stage) {
      case WoundStage.STAGE_1:
        interventions.push('Remove pressure from affected area');
        interventions.push('Keep skin clean and moisturized');
        interventions.push('Use barrier products');
        break;

      case WoundStage.STAGE_2:
        interventions.push('Cleanse wound with saline');
        interventions.push('Apply moisture-retentive dressing');
        interventions.push('Monitor for signs of infection');
        break;

      case WoundStage.STAGE_3:
        interventions.push('Sharp debridement if necrotic tissue present');
        interventions.push('Use absorptive dressings for exudate');
        interventions.push('Consider negative pressure therapy');
        interventions.push('Monitor for infection closely');
        break;

      case WoundStage.STAGE_4:
        interventions.push('Surgical consultation for deep tissue involvement');
        interventions.push('Consider negative pressure wound therapy');
        interventions.push('Evaluate for osteomyelitis');
        interventions.push('Potential surgical reconstruction needed');
        break;

      case WoundStage.UNSTAGEABLE:
        interventions.push('Remove eschar/slough to stage wound');
        interventions.push('Monitor for tunneling/sinus tracts');
        interventions.push('Consider advanced wound therapies');
        break;

      case WoundStage.DEEP_TISSUE:
        interventions.push('Do not apply pressure to affected area');
        interventions.push('Monitor for progression to full thickness');
        interventions.push('Consider surgical consultation');
        break;
    }

    // Risk level interventions
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.VERY_HIGH) {
      interventions.push('Increase wound assessment frequency to daily');
      interventions.push('Consider wound care specialist referral');
      interventions.push('Review nutritional status and supplement if needed');
    }

    // Infection risk interventions
    if (infectionRisk === 'moderate' || infectionRisk === 'high' || infectionRisk === 'critical') {
      interventions.push('Obtain wound culture');
      interventions.push('Consider empiric antibiotics');
      interventions.push('Increase monitoring for systemic signs');
    }
    if (infectionRisk === 'critical') {
      interventions.push('URGENT: Wound care specialist immediate consultation');
      interventions.push('Consider hospital admission');
      interventions.push('Broad-spectrum antibiotics may be indicated');
    }

    return [...new Set(interventions)];
  }

  /**
   * Calculate wound assessment score
   */
  private calculateWoundScore(input: WoundAssessmentInput): number {
    let score = 50; // Base score

    // Stage contribution (-10 to +10)
    switch (input.stage) {
      case WoundStage.STAGE_1:
        score -= 10;
        break;
      case WoundStage.STAGE_2:
        score -= 5;
        break;
      case WoundStage.STAGE_3:
        score += 5;
        break;
      case WoundStage.STAGE_4:
        score += 10;
        break;
      case WoundStage.UNSTAGEABLE:
        score += 8;
        break;
      case WoundStage.DEEP_TISSUE:
        score += 7;
        break;
    }

    // Size contribution
    if (input.size) {
      const area = input.size.length * input.size.width;
      if (area > 100) score += 15;
      else if (area > 50) score += 10;
      else if (area > 10) score += 5;

      if (input.size.depth > 1) score += 5;
    }

    // Risk factors contribution
    if (input.riskFactors.nutrition.status === 'poor') score += 10;
    if (input.riskFactors.nutrition.status === 'moderate') score += 5;
    if (input.riskFactors.mobility.level === 'immobile') score += 10;
    if (input.riskFactors.mobility.level === 'limited') score += 5;
    if (input.riskFactors.comorbidities.diabetes) score += 5;
    if (input.riskFactors.comorbidities.vascularDisease) score += 5;

    // Infection risk contribution
    switch (input.infectionRisk || 'none') {
      case 'critical':
        score += 20;
        break;
      case 'high':
        score += 15;
        break;
      case 'moderate':
        score += 10;
        break;
      case 'low':
        score += 5;
        break;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate infection risk based on wound characteristics
   */
  private calculateInfectionRisk(input: WoundAssessmentInput): 'none' | 'low' | 'moderate' | 'high' | 'critical' {
    let score = 0;

    // Odor indicates infection
    if (input.odor) score += 2;

    // Purulent exudate
    if (input.exudate?.type === 'purulent') score += 3;
    if (input.exudate?.type === 'seropurulent') score += 2;

    // Heavy exudate
    if (input.exudate?.amount === 'heavy') score += 2;

    // Tissue death
    if (input.tissueViability) {
      if (input.tissueViability.necrosis > 25) score += 3;
      if (input.tissueViability.necrosis > 50) score += 2;
    }

    // Surrounding skin changes
    if (input.surroundingSkin?.temperature === 'hot') score += 2;
    if (input.surroundingSkin?.temperature === 'warm') score += 1;
    if (input.surroundingSkin?.edema === 'severe') score += 2;
    if (input.surroundingSkin?.integrity === 'denuded') score += 2;

    // Comorbidities
    if (input.riskFactors.comorbidities.diabetes) score += 2;
    if (input.riskFactors.comorbidities.vascularDisease) score += 2;
    if (input.riskFactors.comorbidities.immunocompromised) score += 3;

    // Determine risk level
    if (score >= 10) return 'critical';
    if (score >= 7) return 'high';
    if (score >= 4) return 'moderate';
    if (score >= 1) return 'low';
    return 'none';
  }

  /**
   * Determine wound risk level from score
   */
  private determineWoundRiskLevel(score: number): RiskLevel {
    if (score < 25) return RiskLevel.LOW;
    if (score < 50) return RiskLevel.MODERATE;
    if (score < 75) return RiskLevel.HIGH;
    return RiskLevel.VERY_HIGH;
  }

  /**
   * Get previous assessment for comparison
   */
  private async getPreviousAssessment(patientId: string, woundId: string): Promise<IWoundAssessment | null> {
    return WoundAssessment.findOne({ patientId, woundId })
      .sort({ assessmentDate: -1 })
      .skip(1)
      .lean();
  }

  /**
   * Recommend response for wound deterioration
   */
  private recommendDeteriorationResponse(
    changes: WoundDeteriorationResult['changes'],
    assessment: IWoundAssessment
  ): string[] {
    const recommendations: string[] = [];

    if (changes.infectionRiskIncreased) {
      recommendations.push('URGENT: Wound infection suspected - initiate infection protocol');
      recommendations.push('Consider wound culture and sensitivity');
    }

    if (changes.stageProgressed) {
      recommendations.push('Stage progression detected - escalate care');
      recommendations.push('Wound care specialist consultation recommended');
    }

    if (changes.sizeIncreased) {
      recommendations.push('Wound enlargement detected - review current wound care regimen');
    }

    if (changes.tissueDeathIncreased) {
      recommendations.push('Increased necrotic tissue - consider debridement');
    }

    if (changes.exudateIncreased) {
      recommendations.push('Increased exudate - consider more absorptive dressing');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue current wound care regimen');
      recommendations.push('Monitor closely for further changes');
    }

    return recommendations;
  }

  /**
   * Identify pressure ulcer risk zones
   */
  private identifyRiskZones(factors: IBradenFactors): string[] {
    const zones: string[] = [];

    if (factors.activity === 1 || factors.mobility === 1) {
      zones.push('Sacrum', 'Heels', 'Hips', 'Shoulder blades', 'Back of head');
    } else if (factors.activity === 2 || factors.mobility === 2) {
      zones.push('Sacrum', 'Heels', 'Ischial tuberosities');
    } else if (factors.moisture === 1 || factors.moisture === 2) {
      zones.push('Perineal area', 'Under breasts', 'Skin folds');
    }

    if (factors.sensoryPerception === 1 || factors.sensoryPerception === 2) {
      zones.push('All pressure points require vigilance');
    }

    return zones.length > 0 ? zones : ['General pressure relief recommended'];
  }

  /**
   * Recommend pressure ulcer care based on risk level
   */
  private recommendPressureUlcerCare(riskLevel: RiskLevel, factors: IBradenFactors): string[] {
    const interventions: string[] = [];

    // Universal interventions
    interventions.push('Repositioning every 2 hours if bedfast');
    interventions.push('Use pillows or foam wedges to offload pressure');
    interventions.push('Keep skin clean and dry');
    interventions.push('Monitor skin daily for redness');

    switch (riskLevel) {
      case RiskLevel.LOW:
        interventions.push('Continue regular repositioning');
        interventions.push('Standard mattress acceptable');
        break;

      case RiskLevel.MODERATE:
        interventions.push('Pressure-redistribution mattress recommended');
        interventions.push('Repositioning every 2 hours');
        interventions.push('Skin inspection every shift');
        break;

      case RiskLevel.HIGH:
        interventions.push('Pressure-relieving/support surface mandatory');
        interventions.push('Repositioning every 2 hours during day, every 4 hours at night');
        interventions.push('Comprehensive skin inspection every shift');
        interventions.push('Nutritional assessment and supplementation');
        interventions.push('Consider OT/PT referral');
        break;

      case RiskLevel.VERY_HIGH:
        interventions.push('High-specification foam or alternating pressure mattress');
        interventions.push('Repositioning every 2 hours around the clock');
        interventions.push('Heel offloading devices');
        interventions.push('Comprehensive nutritional support');
        interventions.push('Wound care specialist involvement');
        interventions.push('Frequent reassessment (every 24-48 hours)');
        break;
    }

    // Factor-specific interventions
    if (factors.moisture === 1 || factors.moisture === 2) {
      interventions.push('Manage incontinence - use barrier creams');
      interventions.push('Keep skin clean and dry');
    }

    if (factors.nutrition === 1 || factors.nutrition === 2) {
      interventions.push('Dietitian referral for nutritional support');
      interventions.push('Ensure adequate protein intake (1.2-1.5g/kg/day)');
    }

    return [...new Set(interventions)];
  }

  /**
   * Get repositioning schedule based on risk level
   */
  private getRepositioningSchedule(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'Every 3-4 hours while in bed';
      case RiskLevel.MODERATE:
        return 'Every 2-3 hours while in bed';
      case RiskLevel.HIGH:
        return 'Every 2 hours during day, every 4 hours at night';
      case RiskLevel.VERY_HIGH:
        return 'Every 2 hours around the clock';
    }
  }

  /**
   * Get recommended support surface based on risk level
   */
  private getSupportSurface(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'Standard hospital mattress';
      case RiskLevel.MODERATE:
        return 'Pressure-redistribution foam mattress';
      case RiskLevel.HIGH:
        return 'Alternating pressure mattress or low-air-loss bed';
      case RiskLevel.VERY_HIGH:
        return 'Advanced therapy bed (low-air-loss, alternating pressure, or air-fluidized)';
    }
  }

  /**
   * Get skin inspection frequency based on risk level
   */
  private getSkinInspectionFrequency(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case RiskLevel.LOW:
        return 'Daily';
      case RiskLevel.MODERATE:
        return 'Every shift (12-hourly)';
      case RiskLevel.HIGH:
        return 'Every shift with documentation';
      case RiskLevel.VERY_HIGH:
        return 'Every 4-8 hours with detailed documentation';
    }
  }

  /**
   * Calculate next assessment date for wound
   */
  private calculateNextAssessmentDate(stage: WoundStage, score: number): Date {
    const date = new Date();

    switch (stage) {
      case WoundStage.STAGE_1:
        date.setDate(date.getDate() + 7);
        break;
      case WoundStage.STAGE_2:
        date.setDate(date.getDate() + 3);
        break;
      case WoundStage.STAGE_3:
      case WoundStage.STAGE_4:
        date.setDate(date.getDate() + 1); // Daily for advanced wounds
        break;
      default:
        date.setDate(date.getDate() + 2);
    }

    return date;
  }

  /**
   * Calculate next assessment date for Braden
   */
  private calculateBradenNextAssessmentDate(riskLevel: RiskLevel): Date {
    const date = new Date();

    switch (riskLevel) {
      case RiskLevel.LOW:
        date.setDate(date.getDate() + 90);
        break;
      case RiskLevel.MODERATE:
        date.setDate(date.getDate() + 7);
        break;
      case RiskLevel.HIGH:
        date.setDate(date.getDate() + 3);
        break;
      case RiskLevel.VERY_HIGH:
        date.setDate(date.getDate() + 1);
        break;
    }

    return date;
  }

  /**
   * Get wound assessments for a patient
   */
  async getPatientWounds(patientId: string): Promise<IWoundAssessment[]> {
    return WoundAssessment.find({ patientId })
      .sort({ assessmentDate: -1 })
      .lean();
  }

  /**
   * Get wound assessment by woundId
   */
  async getWoundById(woundId: string): Promise<IWoundAssessment | null> {
    return WoundAssessment.findOne({ woundId })
      .sort({ assessmentDate: -1 })
      .lean();
  }

  /**
   * Get wound history for tracking
   */
  async getWoundHistory(woundId: string, limit = 10): Promise<IWoundAssessment[]> {
    return WoundAssessment.find({ woundId })
      .sort({ assessmentDate: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get pressure ulcer risk history for patient
   */
  async getPressureUlcerHistory(patientId: string, limit = 10): Promise<PressureUlcerRisk[]> {
    return PressureUlcerRisk.find({ patientId })
      .sort({ assessmentDate: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get latest pressure ulcer assessment
   */
  async getLatestPressureUlcerAssessment(patientId: string): Promise<PressureUlcerRisk | null> {
    return PressureUlcerRisk.findOne({ patientId })
      .sort({ assessmentDate: -1 })
      .lean();
  }

  /**
   * Get patients with high wound risk
   */
  async getHighRiskWoundPatients(limit = 50): Promise<IWoundAssessment[]> {
    return WoundAssessment.aggregate([
      { $sort: { assessmentDate: -1 } },
      { $group: {
        _id: { patientId: '$patientId', woundId: '$woundId' },
        latestAssessment: { $first: '$$ROOT' }
      }},
      { $replaceRoot: { newRoot: '$latestAssessment' } },
      { $match: {
        $or: [
          { infectionRisk: { $in: ['high', 'critical'] } },
          { deteriorationDetected: true }
        ]
      }},
      { $sort: { assessmentScore: -1 } },
      { $limit: limit }
    ]);
  }

  /**
   * Mark assessment as alerted
   */
  async markAssessmentAlerted(assessmentId: string): Promise<void> {
    await WoundAssessment.findByIdAndUpdate(assessmentId, { alertSent: true });
  }

  /**
   * Get overdue wound assessments
   */
  async getOverdueWoundAssessments(): Promise<IWoundAssessment[]> {
    const now = new Date();
    return WoundAssessment.find({
      nextAssessmentDue: { $lt: now },
      alertSent: false
    })
      .sort({ nextAssessmentDue: 1 })
      .limit(100);
  }
}

export const woundRiskService = new WoundRiskService();
