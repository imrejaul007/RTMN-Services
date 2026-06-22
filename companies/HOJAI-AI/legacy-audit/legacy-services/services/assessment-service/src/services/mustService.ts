/**
 * MUST Service - Malnutrition Universal Screening Tool
 *
 * MUST is a five-step screening tool for adults in hospitals, community and care homes.
 * It identifies adults who are malnourished or at risk of malnutrition.
 *
 * Score Interpretation:
 * - 0: Low risk - Routine clinical care
 * - 1: Medium risk - Observe and document dietary intake for 3 days
 * - 2+: High risk - Refer to dietitian/nutritional team
 */

import { RiskLevel, InterpretationLevel } from '../models/assessment';

export interface MUSTInput {
  bmi: number;
  weightLoss: number; // Percentage of weight lost
  acuteDiseaseEffect: boolean;
}

export interface MUSTResult {
  score: number;
  maxScore: number;
  riskLevel: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
  breakdown: {
    bmiScore: number;
    weightLossScore: number;
    acuteDiseaseScore: number;
  };
  recommendations: string[];
}

class MustService {
  // BMI thresholds (kg/m²)
  private readonly BMI_THRESHOLDS = {
    GREATER_THAN_20: 20,
    BETWEEN_18_5_AND_20: 18.5,
    LESS_THAN_18_5: 18.5
  };

  // Weight loss thresholds (%)
  private readonly WEIGHT_LOSS_THRESHOLDS = {
    LESS_THAN_5: 5,
    BETWEEN_5_AND_10: 10,
    GREATER_THAN_10: 10
  };

  /**
   * Calculate MUST score from input parameters
   */
  calculateMUST(input: MUSTInput): MUSTResult {
    const bmiScore = this.calculateBMIScore(input.bmi);
    const weightLossScore = this.calculateWeightLossScore(input.weightLoss);
    const acuteDiseaseScore = this.calculateAcuteDiseaseScore(input.acuteDiseaseEffect);

    const totalScore = bmiScore + weightLossScore + acuteDiseaseScore;

    const interpretation = this.interpretMUST(totalScore);

    return {
      score: totalScore,
      maxScore: 6, // Max: BMI(2) + Weight Loss(2) + Acute Disease(2)
      riskLevel: interpretation.riskLevel,
      interpretation: interpretation.interpretation,
      interpretationLevel: interpretation.level,
      breakdown: {
        bmiScore,
        weightLossScore,
        acuteDiseaseScore
      },
      recommendations: this.getMUSTRecommendations(interpretation.riskLevel)
    };
  }

  /**
   * Calculate BMI score component
   * - 0 points: BMI > 20 kg/m²
   * - 1 point: BMI 18.5-20 kg/m²
   * - 2 points: BMI < 18.5 kg/m²
   */
  calculateBMIScore(bmi: number): number {
    if (bmi > this.BMI_THRESHOLDS.GREATER_THAN_20) {
      return 0;
    } else if (bmi >= this.BMI_THRESHOLDS.BETWEEN_18_5_AND_20) {
      return 1;
    } else {
      return 2;
    }
  }

  /**
   * Calculate weight loss score component
   * - 0 points: Weight loss < 5%
   * - 1 point: Weight loss 5-10%
   * - 2 points: Weight loss > 10%
   */
  calculateWeightLossScore(weightLossPercent: number): number {
    if (weightLossPercent < this.WEIGHT_LOSS_THRESHOLDS.LESS_THAN_5) {
      return 0;
    } else if (weightLossPercent <= this.WEIGHT_LOSS_THRESHOLDS.BETWEEN_5_AND_10) {
      return 1;
    } else {
      return 2;
    }
  }

  /**
   * Calculate acute disease effect score
   * - 0 points: No acute disease effect
   * - 2 points: Acute disease effect present (no nutritional intake for >5 days)
   */
  calculateAcuteDiseaseScore(hasAcuteDiseaseEffect: boolean): number {
    return hasAcuteDiseaseEffect ? 2 : 0;
  }

  /**
   * Interpret MUST score and return risk level and interpretation
   */
  interpretMUST(score: number): {
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
  } {
    // MUST scoring:
    // 0 = Low risk
    // 1 = Medium risk
    // 2+ = High risk

    if (score === 0) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Low risk - Routine clinical care. Document dietary intake.',
        level: InterpretationLevel.Normal
      };
    } else if (score === 1) {
      return {
        riskLevel: RiskLevel.Medium,
        interpretation: 'Medium risk - Observe for 3 days. Document dietary intake and weight.',
        level: InterpretationLevel.Mild
      };
    } else {
      return {
        riskLevel: RiskLevel.High,
        interpretation: 'High risk - Refer to dietitian/nutritional specialist. Develop nutrition care plan.',
        level: InterpretationLevel.Moderate
      };
    }
  }

  /**
   * Get recommendations based on MUST risk level
   */
  getMUSTRecommendations(riskLevel: RiskLevel): string[] {
    const recommendations: Record<RiskLevel, string[]> = {
      [RiskLevel.Low]: [
        'Continue routine clinical care',
        'Document nutritional intake',
        'Weigh patient monthly in community or weekly in hospital',
        'No immediate nutritional intervention required',
        'Provide patient with information about healthy eating'
      ],
      [RiskLevel.Medium]: [
        'Observe for 3 days',
        'Document dietary intake for all meals and snacks',
        'Weigh patient weekly',
        'Provide dietary advice and food first advice leaflet',
        'Consider oral nutritional supplements if dietary intake is inadequate',
        'Refer to dietitian if no improvement within 3 days'
      ],
      [RiskLevel.High]: [
        'Refer to dietitian/nutritional specialist immediately',
        'Develop individualized nutrition care plan',
        'Weigh patient weekly and monitor weight trends',
        'Monitor food intake and fluid balance',
        'Consider oral nutritional supplements (ONS) unless contraindicated',
        'Consider artificial nutrition support (enteral/parenteral) if ONS is insufficient',
        'Set goals for weight gain and nutritional intake',
        'Involve patient and family in care planning',
        'Review medication for appetite-related side effects'
      ],
      [RiskLevel.VeryHigh]: [
        'Urgent dietitian referral required',
        'Consider hospital admission for nutritional support',
        'Initiate nutritional intervention immediately',
        'Monitor closely for complications',
        'Multidisciplinary team involvement essential'
      ],
      [RiskLevel.NoRisk]: [
        'No nutritional risk identified',
        'Continue routine monitoring'
      ],
      [RiskLevel.Unknown]: [
        'Unable to complete assessment - insufficient data',
        'Gather missing measurements (height, weight)',
        'Reassess when data is available'
      ]
    };

    return recommendations[riskLevel] || recommendations[RiskLevel.Unknown];
  }

  /**
   * Calculate BMI from weight and height
   */
  calculateBMI(weightKg: number, heightM: number): number {
    if (heightM <= 0 || weightKg <= 0) {
      throw new Error('Invalid weight or height values');
    }
    return weightKg / (heightM * heightM);
  }

  /**
   * Validate MUST inputs
   */
  validateInput(input: Partial<MUSTInput>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (input.bmi !== undefined) {
      if (typeof input.bmi !== 'number' || isNaN(input.bmi)) {
        errors.push('BMI must be a valid number');
      } else if (input.bmi < 10 || input.bmi > 70) {
        errors.push('BMI value is outside expected range (10-70 kg/m²)');
      }
    }

    if (input.weightLoss !== undefined) {
      if (typeof input.weightLoss !== 'number' || isNaN(input.weightLoss)) {
        errors.push('Weight loss must be a valid number');
      } else if (input.weightLoss < 0 || input.weightLoss > 50) {
        errors.push('Weight loss percentage is outside expected range (0-50%)');
      }
    }

    if (input.acuteDiseaseEffect !== undefined) {
      if (typeof input.acuteDiseaseEffect !== 'boolean') {
        errors.push('Acute disease effect must be a boolean value');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get BMI category description
   */
  getBMICategory(bmi: number): string {
    if (bmi < 18.5) {
      return 'Underweight';
    } else if (bmi < 25) {
      return 'Normal weight';
    } else if (bmi < 30) {
      return 'Overweight';
    } else {
      return 'Obese';
    }
  }

  /**
   * Calculate ideal body weight (Devine formula)
   */
  calculateIdealBodyWeight(heightCm: number, gender: 'male' | 'female'): number {
    const heightInches = heightCm / 2.54;

    if (gender === 'male') {
      return 50 + 2.3 * (heightInches - 60);
    } else {
      return 45.5 + 2.3 * (heightInches - 60);
    }
  }

  /**
   * Calculate adjusted body weight for obese patients
   */
  calculateAdjustedBodyWeight(actualWeightKg: number, idealWeightKg: number): number {
    return idealWeightKg + 0.4 * (actualWeightKg - idealWeightKg);
  }
}

export const mustService = new MustService();
export default mustService;
