/**
 * Fall Risk Assessment Service - Morse Fall Scale
 *
 * The Morse Fall Scale (MFS) is a rapid and simple method of identifying patients
 * at risk for falls. It is used by healthcare providers to assess fall risk upon
 * admission and periodically throughout hospitalization.
 *
 * Six variables are assessed:
 * - History of falls
 * - Secondary diagnosis
 * - Ambulatory aid
 * - IV/Heparin lock
 * - Gait
 * - Mental status
 *
 * Total score ranges from 0 to 125.
 *
 * Risk Levels:
 * - No Risk: 0-24
 * - Low Risk: 25-50
 * - High Risk: >50
 */

import { RiskLevel, InterpretationLevel } from '../models/assessment';

export interface MorseInput {
  historyOfFalls: boolean; // 0 or 25
  secondaryDiagnosis: boolean; // 0 or 15
  ambulatoryAid: 'none' | 'crutches' | 'cane' | 'walker' | 'wheelchair'; // 0, 15, 15, 15, 30
  ivHeparinLock: boolean; // 0 or 20
  gait: 'normal' | 'weak' | 'impaired'; // 0, 10, 20
  mentalStatus: 'oriented' | 'forgets' | 'confused'; // 0, 15, 15
}

export interface MorseResult {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
  breakdown: {
    historyOfFalls: { score: number; maxScore: number; label: string };
    secondaryDiagnosis: { score: number; maxScore: number; label: string };
    ambulatoryAid: { score: number; maxScore: number; label: string };
    ivHeparinLock: { score: number; maxScore: number; label: string };
    gait: { score: number; maxScore: number; label: string };
    mentalStatus: { score: number; maxScore: number; label: string };
  };
  recommendations: string[];
  reassessmentInterval: number;
}

class FallRiskAssessment {
  // Risk thresholds
  private readonly THRESHOLDS = {
    NO_RISK: 24,
    LOW_RISK: 50
  };

  // Score mappings
  private readonly SCORES = {
    HISTORY_OF_FALLS: {
      no: 0,
      yes: 25
    },
    SECONDARY_DIAGNOSIS: {
      no: 0,
      yes: 15
    },
    AMBULATORY_AID: {
      none: 0,
      crutches: 15,
      cane: 15,
      walker: 15,
      wheelchair: 30
    },
    IV_HEPARIN_LOCK: {
      no: 0,
      yes: 20
    },
    GAIT: {
      normal: 0,
      weak: 10,
      impaired: 20
    },
    MENTAL_STATUS: {
      oriented: 0,
      forgets: 15,
      confused: 15
    }
  };

  /**
   * Calculate Morse Fall Scale score from input
   */
  calculateMorse(input: MorseInput): MorseResult {
    const breakdown = {
      historyOfFalls: {
        score: input.historyOfFalls ? this.SCORES.HISTORY_OF_FALLS.yes : this.SCORES.HISTORY_OF_FALLS.no,
        maxScore: 25,
        label: input.historyOfFalls ? 'Yes - Falls within 3 months' : 'No recent falls'
      },
      secondaryDiagnosis: {
        score: input.secondaryDiagnosis ? this.SCORES.SECONDARY_DIAGNOSIS.yes : this.SCORES.SECONDARY_DIAGNOSIS.no,
        maxScore: 15,
        label: input.secondaryDiagnosis ? 'Yes - Multiple diagnoses' : 'No secondary diagnosis'
      },
      ambulatoryAid: {
        score: this.SCORES.AMBULATORY_AID[input.ambulatoryAid],
        maxScore: 30,
        label: this.getAmbulationAidLabel(input.ambulatoryAid)
      },
      ivHeparinLock: {
        score: input.ivHeparinLock ? this.SCORES.IV_HEPARIN_LOCK.yes : this.SCORES.IV_HEPARIN_LOCK.no,
        maxScore: 20,
        label: input.ivHeparinLock ? 'Yes - IV/Heparin lock present' : 'No IV access'
      },
      gait: {
        score: this.SCORES.GAIT[input.gait],
        maxScore: 20,
        label: this.getGaitLabel(input.gait)
      },
      mentalStatus: {
        score: this.SCORES.MENTAL_STATUS[input.mentalStatus],
        maxScore: 15,
        label: this.getMentalStatusLabel(input.mentalStatus)
      }
    };

    const totalScore =
      breakdown.historyOfFalls.score +
      breakdown.secondaryDiagnosis.score +
      breakdown.ambulatoryAid.score +
      breakdown.ivHeparinLock.score +
      breakdown.gait.score +
      breakdown.mentalStatus.score;

    const interpretation = this.interpretMorse(totalScore);

    return {
      totalScore,
      maxScore: 125,
      riskLevel: interpretation.riskLevel,
      interpretation: interpretation.interpretation,
      interpretationLevel: interpretation.level,
      breakdown,
      recommendations: this.getMorseRecommendations(interpretation.riskLevel, breakdown),
      reassessmentInterval: this.getReassessmentInterval(interpretation.riskLevel)
    };
  }

  /**
   * Get ambulatory aid label
   */
  private getAmbulationAidLabel(aid: MorseInput['ambulatoryAid']): string {
    const labels: Record<string, string> = {
      none: 'No aid - Walks without assistance',
      crutches: 'Crutches',
      cane: 'Cane',
      walker: 'Walker',
      wheelchair: 'Wheelchair/Bed rest'
    };
    return labels[aid];
  }

  /**
   * Get gait label
   */
  private getGaitLabel(gait: MorseInput['gait']): string {
    const labels: Record<string, string> = {
      normal: 'Normal - Walks with head erect, arms swinging freely, steps continuous',
      weak: 'Weak - Walks with short steps, may drag feet, head bowed',
      impaired: 'Impaired - Steps are uncertain, shuffling, toes catch on floor,不平衡'
    };
    return labels[gait];
  }

  /**
   * Get mental status label
   */
  private getMentalStatusLabel(status: MorseInput['mentalStatus']): string {
    const labels: Record<string, string> = {
      oriented: 'Oriented - Knows own abilities, ambulatory, can remember safety precautions',
      forgets: 'Forgets limitations - Remembers own abilities but forgets to use mobility aids',
      confused: 'Confused/Impaired - Forgets to ask for help, does not know own limitations'
    };
    return labels[status];
  }

  /**
   * Interpret Morse score and return risk level
   */
  interpretMorse(score: number): {
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
  } {
    if (score <= this.THRESHOLDS.NO_RISK) {
      return {
        riskLevel: RiskLevel.NoRisk,
        interpretation: 'No risk - Standard fall precautions apply.',
        level: InterpretationLevel.Normal
      };
    } else if (score <= this.THRESHOLDS.LOW_RISK) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Low risk - Implement low-risk fall prevention measures.',
        level: InterpretationLevel.Mild
      };
    } else {
      return {
        riskLevel: RiskLevel.High,
        interpretation: 'High risk - Implement comprehensive fall prevention protocol.',
        level: InterpretationLevel.Moderate
      };
    }
  }

  /**
   * Get Morse Fall Scale recommendations based on risk level
   */
  getMorseRecommendations(riskLevel: RiskLevel, breakdown?: MorseResult['breakdown']): string[] {
    const recommendations: Record<RiskLevel, string[]> = {
      [RiskLevel.NoRisk]: [
        'Continue routine fall prevention practices',
        'Orient patient to environment',
        'Ensure call light is within reach',
        'Educate patient on fall prevention',
        'Reassess if patient condition changes'
      ],
      [RiskLevel.Low]: [
        'Apply yellow fall risk wristband',
        'Place yellow fall risk sign on patient door',
        'Ensure patient knows how to call for assistance',
        'Keep patient personal items within reach',
        'Secure bed in lowest position',
        'Keep bed side rails up when appropriate',
        'Ensure adequate lighting',
        'Remove obstacles from walking path',
        'Consider non-slip footwear',
        'Review medications for fall-risk-increasing drugs',
        'Involve family in fall prevention education'
      ],
      [RiskLevel.Medium]: [
        'All low-risk interventions PLUS:',
        'Conduct hourly rounds',
        'Assist with toileting every 2 hours',
        'Consider bed alarm or chair alarm',
        'Review and optimize medication regimen',
        'Physical therapy consultation for gait training',
        'Document fall risk status in care plan',
        'Huddle at each shift change regarding fall risk',
        'Ensure assistive devices are within reach'
      ],
      [RiskLevel.High]: [
        'All low-risk and medium-risk interventions PLUS:',
        'Place patient near nursing station for closer observation',
        'Consider 1:1 observation if available',
        'Use full bed exit alarm',
        'Apply hip protectors if appropriate',
        'Ensure toileting schedule is maintained',
        'Review pain management to minimize sedating medications',
        'Occupational therapy assessment for environmental modifications',
        'Physician notification of high fall risk',
        'Intensive patient and family education',
        'Document detailed circumstances of any fall'
      ],
      [RiskLevel.VeryHigh]: [
        'All high-risk interventions PLUS:',
        'Continuous observation may be required',
        'Consider bedrest with physician order',
        'Implement intensive monitoring protocol',
        'Multidisciplinary fall prevention team involvement',
        'Daily safety huddle regarding fall risk',
        'Environmental assessment of patient room',
        'Review need for protective restraints (last resort)',
        'Enhanced documentation requirements'
      ],
      [RiskLevel.Unknown]: [
        'Unable to complete fall risk assessment',
        'Implement standard fall precautions',
        'Gather missing assessment data',
        'Reassess when complete data is available'
      ]
    };

    // Add specific recommendations based on breakdown
    let specificRecs: string[] = [];

    if (breakdown) {
      if (breakdown.historyOfFalls.score > 0) {
        specificRecs.push('FALLS HISTORY: Review circumstances of previous falls');
      }
      if (breakdown.secondaryDiagnosis.score > 0) {
        specificRecs.push('SECONDARY DX: Review impact of comorbidities on fall risk');
      }
      if (breakdown.ambulatoryAid.score > 0) {
        specificRecs.push('AMBULATORY AID: Ensure proper use and fit of assistive device');
      }
      if (breakdown.ivHeparinLock.score > 0) {
        specificRecs.push('IV ACCESS: Ensure IV tubing is secured during ambulation');
      }
      if (breakdown.gait.score > 0) {
        specificRecs.push('GAIT: Physical therapy for gait training recommended');
      }
      if (breakdown.mentalStatus.score > 0) {
        specificRecs.push('MENTAL STATUS: Consider cognitive impairment interventions');
      }
    }

    return [...(recommendations[riskLevel] || recommendations[RiskLevel.Unknown]), ...specificRecs];
  }

  /**
   * Get recommendations specific to Morse Fall Scale
   */
  getRecommendations(riskLevel: RiskLevel): string[] {
    return this.getMorseRecommendations(riskLevel);
  }

  /**
   * Get reassessment interval based on risk level
   */
  private getReassessmentInterval(riskLevel: RiskLevel): number {
    const intervals: Record<RiskLevel, number> = {
      [RiskLevel.NoRisk]: 7,
      [RiskLevel.Low]: 3,
      [RiskLevel.Medium]: 1,
      [RiskLevel.High]: 1,
      [RiskLevel.VeryHigh]: 1,
      [RiskLevel.Unknown]: 1
    };

    return intervals[riskLevel];
  }

  /**
   * Convert responses to Morse input format
   */
  static fromResponses(responses: Record<string, unknown>): MorseInput {
    return {
      historyOfFalls: Boolean(responses.historyOfFalls),
      secondaryDiagnosis: Boolean(responses.secondaryDiagnosis),
      ambulatoryAid: (responses.ambulatoryAid as MorseInput['ambulatoryAid']) || 'none',
      ivHeparinLock: Boolean(responses.ivHeparinLock),
      gait: (responses.gait as MorseInput['gait']) || 'normal',
      mentalStatus: (responses.mentalStatus as MorseInput['mentalStatus']) || 'oriented'
    };
  }

  /**
   * Validate Morse input object
   */
  validateInput(input: Partial<MorseInput>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.historyOfFalls === undefined || typeof input.historyOfFalls !== 'boolean') {
      errors.push('History of falls is required and must be a boolean');
    }

    if (input.secondaryDiagnosis === undefined || typeof input.secondaryDiagnosis !== 'boolean') {
      errors.push('Secondary diagnosis is required and must be a boolean');
    }

    const validAmbulatoryAids: MorseInput['ambulatoryAid'][] = ['none', 'crutches', 'cane', 'walker', 'wheelchair'];
    if (!input.ambulatoryAid || !validAmbulatoryAids.includes(input.ambulatoryAid)) {
      errors.push(`Ambulatory aid must be one of: ${validAmbulatoryAids.join(', ')}`);
    }

    if (input.ivHeparinLock === undefined || typeof input.ivHeparinLock !== 'boolean') {
      errors.push('IV/Heparin lock status is required and must be a boolean');
    }

    const validGaits: MorseInput['gait'][] = ['normal', 'weak', 'impaired'];
    if (!input.gait || !validGaits.includes(input.gait)) {
      errors.push(`Gait must be one of: ${validGaits.join(', ')}`);
    }

    const validMentalStatuses: MorseInput['mentalStatus'][] = ['oriented', 'forgets', 'confused'];
    if (!input.mentalStatus || !validMentalStatuses.includes(input.mentalStatus)) {
      errors.push(`Mental status must be one of: ${validMentalStatuses.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get color code for risk level (for visual identification)
   */
  getRiskColor(riskLevel: RiskLevel): string {
    const colors: Record<RiskLevel, string> = {
      [RiskLevel.NoRisk]: '#228B22', // Forest green
      [RiskLevel.Low]: '#FFD700', // Yellow/Gold
      [RiskLevel.Medium]: '#FFA500', // Orange
      [RiskLevel.High]: '#FF4500', // Orange Red
      [RiskLevel.VeryHigh]: '#DC143C', // Crimson
      [RiskLevel.Unknown]: '#808080' // Gray
    };

    return colors[riskLevel];
  }
}

export const fallRiskAssessment = new FallRiskAssessment();
export default fallRiskAssessment;
