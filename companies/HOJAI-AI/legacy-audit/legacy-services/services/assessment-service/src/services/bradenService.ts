/**
 * Braden Scale Service - Pressure Ulcer Risk Assessment
 *
 * The Braden Scale is a tool used to assess the risk of pressure ulcer development.
 * It evaluates six factors on a scale of 1-4 or 1-3 (friction/shear):
 * - Sensory perception
 * - Moisture
 * - Activity
 * - Mobility
 * - Nutrition
 * - Friction and shear
 *
 * Total score ranges from 6 (highest risk) to 23 (lowest risk).
 *
 * Risk Levels:
 * - Very High Risk: 9 or less
 * - High Risk: 10-12
 * - Moderate Risk: 13-14
 * - Low Risk: 15-18
 * - No Risk: 19-23
 */

import { RiskLevel, InterpretationLevel } from '../models/assessment';

export interface BradenInput {
  sensoryPerception: number; // 1-4
  moisture: number; // 1-4
  activity: number; // 1-4
  mobility: number; // 1-4
  nutrition: number; // 1-4
  frictionShear: number; // 1-3
}

export interface BradenSubscale {
  name: string;
  score: number;
  maxScore: number;
  interpretation: string;
  clinicalNotes: string[];
}

export interface BradenResult {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
  subscales: BradenSubscale[];
  recommendations: string[];
  reassessmentInterval: number; // in days
}

class BradenService {
  // Risk thresholds (lower score = higher risk)
  private readonly THRESHOLDS = {
    NO_RISK: 19,
    LOW_RISK: 15,
    MODERATE_RISK: 13,
    HIGH_RISK: 9
  };

  // Subscale configurations
  private readonly SUBSCALES = {
    SENSORY: {
      name: 'Sensory Perception',
      descriptions: {
        1: 'Completely limited - Unresponsive to painful stimuli due to diminished consciousness',
        2: 'Very limited - Responds only to painful stimuli, cannot communicate discomfort',
        3: 'Slightly limited - Responds to verbal commands but cannot always communicate discomfort',
        4: 'No impairment - Responds to verbal commands, no sensory deficit'
      }
    },
    MOISTURE: {
      name: 'Moisture',
      descriptions: {
        1: 'Constantly moist - Skin is kept moist almost constantly by perspiration, urine, etc.',
        2: 'Very moist - Skin is often, but not always, moist',
        3: 'Occasionally moist - Skin is occasionally moist, requiring extra linen changes',
        4: 'Rarely moist - Skin is usually dry, routine changes are adequate'
      }
    },
    ACTIVITY: {
      name: 'Activity',
      descriptions: {
        1: 'Bedfast - Confined to bed',
        2: 'Chairfast - Ability to walk severely limited or nonexistent',
        3: 'Walks occasionally - Walks occasionally during day but very short distances',
        4: 'Walks frequently - Walks outside room at least twice daily'
      }
    },
    MOBILITY: {
      name: 'Mobility',
      descriptions: {
        1: 'Completely immobile - Does not make even slight changes in body/extremity position',
        2: 'Very limited - Makes slight occasional changes in body/extremity position',
        3: 'Slightly limited - Makes frequent though slight changes in body/extremity position',
        4: 'No limitations - Makes major and frequent changes in body/extremity position'
      }
    },
    NUTRITION: {
      name: 'Nutrition',
      descriptions: {
        1: 'Very poor - Never eats complete meal, rarely takes more than 1/3 of food offered',
        2: 'Probably inadequate - Rarely eats complete meal, generally takes only 1/2 of food offered',
        3: 'Adequate - Takes more than half of most meals, eats 4 servings of protein daily',
        4: 'Excellent - Takes every meal, never refuses a meal, usually eats between meals'
      }
    },
    FRICTION: {
      name: 'Friction and Shear',
      descriptions: {
        1: 'Problem - Requires maximum assistance to move, spasticity, contractures, or agitation',
        2: 'Potential problem - Moves with difficulty, requires moderate assistance',
        3: 'No apparent problem - Moves in bed independently, has sufficient muscle strength'
      }
    }
  };

  /**
   * Calculate Braden Scale score from responses
   */
  calculateBraden(input: BradenInput): BradenResult {
    // Validate input ranges
    this.validateBradenInput(input);

    const totalScore = this.sumSubscaleScores(input);
    const interpretation = this.interpretBraden(totalScore);
    const subscales = this.getSubscales(input);
    const recommendations = this.getBradenRecommendations(interpretation.riskLevel);

    return {
      totalScore,
      maxScore: 23, // 4+4+4+4+4+3
      riskLevel: interpretation.riskLevel,
      interpretation: interpretation.interpretation,
      interpretationLevel: interpretation.level,
      subscales,
      recommendations,
      reassessmentInterval: this.getReassessmentInterval(interpretation.riskLevel)
    };
  }

  /**
   * Validate Braden input values
   */
  private validateBradenInput(input: BradenInput): void {
    const ranges: Record<string, [number, number]> = {
      sensoryPerception: [1, 4],
      moisture: [1, 4],
      activity: [1, 4],
      mobility: [1, 4],
      nutrition: [1, 4],
      frictionShear: [1, 3]
    };

    for (const [field, [min, max]] of Object.entries(ranges)) {
      const value = input[field as keyof BradenInput];
      if (value < min || value > max) {
        throw new Error(
          `${field} must be between ${min} and ${max}, got ${value}`
        );
      }
    }
  }

  /**
   * Sum all subscale scores
   */
  private sumSubscaleScores(input: BradenInput): number {
    return (
      input.sensoryPerception +
      input.moisture +
      input.activity +
      input.mobility +
      input.nutrition +
      input.frictionShear
    );
  }

  /**
   * Get detailed subscale information
   */
  private getSubscales(input: BradenInput): BradenSubscale[] {
    return [
      {
        name: this.SUBSCALES.SENSORY.name,
        score: input.sensoryPerception,
        maxScore: 4,
        interpretation: this.getSubscaleInterpretation('sensoryPerception', input.sensoryPerception),
        clinicalNotes: this.getSubscaleClinicalNotes('sensoryPerception', input.sensoryPerception)
      },
      {
        name: this.SUBSCALES.MOISTURE.name,
        score: input.moisture,
        maxScore: 4,
        interpretation: this.getSubscaleInterpretation('moisture', input.moisture),
        clinicalNotes: this.getSubscaleClinicalNotes('moisture', input.moisture)
      },
      {
        name: this.SUBSCALES.ACTIVITY.name,
        score: input.activity,
        maxScore: 4,
        interpretation: this.getSubscaleInterpretation('activity', input.activity),
        clinicalNotes: this.getSubscaleClinicalNotes('activity', input.activity)
      },
      {
        name: this.SUBSCALES.MOBILITY.name,
        score: input.mobility,
        maxScore: 4,
        interpretation: this.getSubscaleInterpretation('mobility', input.mobility),
        clinicalNotes: this.getSubscaleClinicalNotes('mobility', input.mobility)
      },
      {
        name: this.SUBSCALES.NUTRITION.name,
        score: input.nutrition,
        maxScore: 4,
        interpretation: this.getSubscaleInterpretation('nutrition', input.nutrition),
        clinicalNotes: this.getSubscaleClinicalNotes('nutrition', input.nutrition)
      },
      {
        name: this.SUBSCALES.FRICTION.name,
        score: input.frictionShear,
        maxScore: 3,
        interpretation: this.getSubscaleInterpretation('frictionShear', input.frictionShear),
        clinicalNotes: this.getSubscaleClinicalNotes('frictionShear', input.frictionShear)
      }
    ];
  }

  /**
   * Get interpretation for a subscale score
   */
  private getSubscaleInterpretation(
    subscale: keyof typeof this.SUBSCALES,
    score: number
  ): string {
    const descriptions = this.SUBSCALES[subscale]?.descriptions;
    return descriptions?.[score as keyof typeof descriptions] || 'Unknown';
  }

  /**
   * Get clinical notes for a subscale score
   */
  private getSubscaleClinicalNotes(subscale: keyof typeof this.SUBSCALES, score: number): string[] {
    const notes: Record<string, Record<number, string[]>> = {
      sensoryPerception: {
        1: [
          'Use pain assessment tools to detect discomfort',
          'Check for nonverbal signs of pain (grimacing, guarding)',
          'Reposition patient every 2 hours minimum'
        ],
        2: [
          'Check for pain during routine care activities',
          'Use nonverbal pain assessment scales',
          'Document comfort interventions'
        ],
        3: [
          'Encourage patient to report any discomfort',
          'Use pain scales that patient can understand'
        ],
        4: []
      },
      moisture: {
        1: [
          'Change linens immediately when soiled',
          'Use barrier creams or ointments',
          'Consider absorbent pads or mattress overlays',
          'Assess skin integrity every shift'
        ],
        2: [
          'Increase frequency of skin checks',
          'Use moisture-wicking dressings',
          'Apply barrier products as needed'
        ],
        3: [
          'Continue routine skin care',
          'Monitor for early signs of moisture-related damage'
        ],
        4: []
      },
      activity: {
        1: [
          'Turn and reposition every 2 hours',
          'Use pressure-relieving mattress',
          'Encourage range of motion exercises',
          'Consider tilt-in-space wheelchair if applicable'
        ],
        2: [
          'Assist with transfers as needed',
          'Encourage periods of standing if tolerated',
          'Use pressure-redistributing cushion'
        ],
        3: [
          'Encourage ambulation as tolerated',
          'Assist with walking to bathroom',
          'Monitor for fatigue during activity'
        ],
        4: []
      },
      mobility: {
        1: [
          'Complete dependence on staff for repositioning',
          'Use lift sheet for all position changes',
          'Implement 2-hour turning schedule',
          'Consider prone positioning if safe'
        ],
        2: [
          'Encourage small position changes when able',
          'Assist with repositioning every 2 hours',
          'Provide pillows for support'
        ],
        3: [
          'Encourage patient to shift weight independently',
          'Provide heel elevation devices',
          'Support during repositioning'
        ],
        4: []
      },
      nutrition: {
        1: [
          'Refer to dietitian for nutritional assessment',
          'Consider nutritional supplements',
          'Monitor intake and output',
          'Weigh patient weekly'
        ],
        2: [
          'Encourage high-protein snacks between meals',
          'Offer nutritional supplements between meals',
          'Document food intake'
        ],
        3: [
          'Continue current dietary plan',
          'Ensure adequate protein intake',
          'Monitor weight trends'
        ],
        4: []
      },
      frictionShear: {
        1: [
          'Use lift sheet for all repositioning',
          'Keep head of bed at or below 30 degrees',
          'Use sliding boards for transfers',
          'Apply protective dressings to bony prominences'
        ],
        2: [
          'Use lift sheet for repositioning',
          'Apply booties to protect heels',
          'Use trapeze bar if able'
        ],
        3: []
      }
    };

    return notes[subscale]?.[score] || [];
  }

  /**
   * Interpret Braden score and return risk level
   */
  interpretBraden(score: number): {
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
  } {
    if (score >= this.THRESHOLDS.NO_RISK) {
      return {
        riskLevel: RiskLevel.NoRisk,
        interpretation: 'No risk - Maintain current care plan and continue routine monitoring.',
        level: InterpretationLevel.Normal
      };
    } else if (score >= this.THRESHOLDS.LOW_RISK) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Low risk - Implement preventive skin care measures. Continue monitoring.',
        level: InterpretationLevel.Normal
      };
    } else if (score >= this.THRESHOLDS.MODERATE_RISK) {
      return {
        riskLevel: RiskLevel.Medium,
        interpretation: 'Moderate risk - Implement prevention protocol. Daily skin assessment required.',
        level: InterpretationLevel.Mild
      };
    } else if (score >= this.THRESHOLDS.HIGH_RISK) {
      return {
        riskLevel: RiskLevel.High,
        interpretation: 'High risk - Implement comprehensive prevention plan. Skin assessment every shift.',
        level: InterpretationLevel.Moderate
      };
    } else {
      return {
        riskLevel: RiskLevel.VeryHigh,
        interpretation: 'Very high risk - Urgent intervention required. Continuous monitoring necessary.',
        level: InterpretationLevel.Severe
      };
    }
  }

  /**
   * Get recommendations based on Braden risk level
   */
  getBradenRecommendations(riskLevel: RiskLevel): string[] {
    const recommendations: Record<RiskLevel, string[]> = {
      [RiskLevel.NoRisk]: [
        'Continue routine skin assessments',
        'Maintain good nutrition and hydration',
        'No additional pressure relief needed',
        'Reassess if condition changes'
      ],
      [RiskLevel.Low]: [
        'Inspect skin at least daily',
        'Keep skin clean and dry',
        'Maintain adequate nutrition and hydration',
        'Reposition every 4 hours if bedfast',
        'Use pressure-redistributing surface if available',
        'Document skin status each shift'
      ],
      [RiskLevel.Medium]: [
        'Inspect skin twice daily',
        'Reposition every 2-3 hours',
        'Use pressure-relieving mattress overlay',
        'Keep skin clean and dry',
        'Apply moisturizer to dry skin',
        'Ensure adequate protein intake (1.2-1.5g/kg/day)',
        'Consider nutritional supplements',
        'Document all findings'
      ],
      [RiskLevel.High]: [
        'Inspect skin every shift',
        'Reposition every 2 hours',
        'Use specialized pressure-relieving mattress',
        'Apply protective dressings to bony prominences',
        'Minimize shear and friction during repositioning',
        'Keep head of bed at or below 30 degrees',
        'Refer to wound care specialist',
        'Ensure protein intake of 1.5-2g/kg/day',
        'Consider nutritional supplementation',
        'Document and communicate findings each shift'
      ],
      [RiskLevel.VeryHigh]: [
        'Continuous skin monitoring',
        'Reposition every 1-2 hours',
        'Use advanced pressure-relieving mattress (low air loss or alternating pressure)',
        'Apply prophylactic dressings to high-risk areas',
        'Use lift sheet for all position changes',
        'Complete avoidance of shear and friction',
        'Urgent dietitian referral for nutritional support',
        'Protein intake of 1.5-2.5g/kg/day',
        'Consider enteral or parenteral nutrition if oral intake inadequate',
        'Daily wound care specialist consultation',
        'Implement turning schedule with documentation',
        'Family education on importance of repositioning'
      ],
      [RiskLevel.Unknown]: [
        'Unable to complete assessment',
        'Gather missing assessment data',
        'Use interim pressure-relief measures',
        'Reassess when data is available'
      ]
    };

    return recommendations[riskLevel] || recommendations[RiskLevel.Unknown];
  }

  /**
   * Get reassessment interval based on risk level
   */
  private getReassessmentInterval(riskLevel: RiskLevel): number {
    const intervals: Record<RiskLevel, number> = {
      [RiskLevel.NoRisk]: 7,
      [RiskLevel.Low]: 7,
      [RiskLevel.Medium]: 3,
      [RiskLevel.High]: 1,
      [RiskLevel.VeryHigh]: 1,
      [RiskLevel.Unknown]: 1
    };

    return intervals[riskLevel];
  }

  /**
   * Convert responses to Braden input format
   */
  static fromResponses(responses: Record<string, number>): BradenInput {
    return {
      sensoryPerception: responses.sensoryPerception || responses.sensory_perception || 0,
      moisture: responses.moisture || 0,
      activity: responses.activity || 0,
      mobility: responses.mobility || 0,
      nutrition: responses.nutrition || 0,
      frictionShear: responses.frictionShear || responses.friction_shear || responses.frictionAndShear || 0
    };
  }

  /**
   * Validate Braden input object
   */
  validateInput(input: Partial<BradenInput>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const fields: Array<{ name: keyof BradenInput; min: number; max: number; label: string }> = [
      { name: 'sensoryPerception', min: 1, max: 4, label: 'Sensory Perception' },
      { name: 'moisture', min: 1, max: 4, label: 'Moisture' },
      { name: 'activity', min: 1, max: 4, label: 'Activity' },
      { name: 'mobility', min: 1, max: 4, label: 'Mobility' },
      { name: 'nutrition', min: 1, max: 4, label: 'Nutrition' },
      { name: 'frictionShear', min: 1, max: 3, label: 'Friction and Shear' }
    ];

    for (const field of fields) {
      const value = input[field.name];
      if (value === undefined || value === null) {
        errors.push(`${field.label} is required`);
      } else if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${field.label} must be a valid number`);
      } else if (value < field.min || value > field.max) {
        errors.push(`${field.label} must be between ${field.min} and ${field.max}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

export const bradenService = new BradenService();
export default bradenService;
