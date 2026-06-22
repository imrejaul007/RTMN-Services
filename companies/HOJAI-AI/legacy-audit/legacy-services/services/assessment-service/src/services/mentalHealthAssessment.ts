/**
 * Mental Health Assessment Service
 *
 * Provides scoring and interpretation for standardized mental health assessments:
 * - PHQ-9: Patient Health Questionnaire for Depression
 * - GAD-7: Generalized Anxiety Disorder 7-item scale
 * - Additional mental health screening tools
 *
 * These tools are validated screening instruments and should be used as part of
 * a comprehensive clinical assessment.
 */

import { RiskLevel, InterpretationLevel } from '../models/assessment';

export interface MentalHealthResponse {
  questionId: string;
  answer: number; // 0-3 for PHQ-9/GAD-7
}

export interface PHQ9Result {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
  severity: 'none' | 'minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe';
  questionScores: number[];
  recommendations: string[];
  followUpActions: string[];
  suicidality: {
    present: boolean;
    score: number;
    action: string;
  };
}

export interface GAD7Result {
  totalScore: number;
  maxScore: number;
  riskLevel: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  questionScores: number[];
  recommendations: string[];
  followUpActions: string[];
}

class MentalHealthAssessment {
  // PHQ-9 thresholds (total score 0-27)
  private readonly PHQ9_THRESHOLDS = {
    NONE: 4,
    MILD: 9,
    MODERATE: 14,
    MODERATELY_SEVERE: 19,
    SEVERE: 27
  };

  // GAD-7 thresholds (total score 0-21)
  private readonly GAD7_THRESHOLDS = {
    NONE: 4,
    MILD: 9,
    MODERATE: 14,
    SEVERE: 21
  };

  // Question text for PHQ-9
  private readonly PHQ9_QUESTIONS = [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
    'Trouble falling or staying asleep, or sleeping too much',
    'Feeling tired or having little energy',
    'Poor appetite or overeating',
    'Feeling bad about yourself - or that you are a failure or have let yourself or your family down',
    'Trouble concentrating on things, such as reading the newspaper or watching television',
    'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual',
    'Thoughts that you would be better off dead or of hurting yourself in some way'
  ];

  // Question text for GAD-7
  private readonly GAD7_QUESTIONS = [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
    'Worrying too much about different things',
    'Trouble relaxing',
    'Being so restless that it is hard to sit still',
    'Becoming easily annoyed or irritable',
    'Feeling afraid as if something awful might happen'
  ];

  /**
   * Calculate PHQ-9 score from responses
   * Responses should be an array of 9 numbers (0-3 each)
   */
  calculatePHQ9(responses: number[]): PHQ9Result {
    // Validate responses
    if (responses.length !== 9) {
      throw new Error('PHQ-9 requires exactly 9 responses');
    }

    for (let i = 0; i < responses.length; i++) {
      if (responses[i] < 0 || responses[i] > 3) {
        throw new Error(`PHQ-9 response ${i + 1} must be between 0 and 3, got ${responses[i]}`);
      }
    }

    const totalScore = responses.reduce((sum, r) => sum + r, 0);
    const interpretation = this.getPHQ9Interpretation(totalScore);
    const suicidality = this.evaluateSuicidality(responses[8]);

    return {
      totalScore,
      maxScore: 27,
      riskLevel: interpretation.riskLevel,
      interpretation: interpretation.interpretation,
      interpretationLevel: interpretation.level,
      severity: interpretation.severity,
      questionScores: responses,
      recommendations: this.getPHQ9Recommendations(interpretation.severity, suicidality.present),
      followUpActions: this.getPHQ9FollowUp(interpretation.severity, suicidality),
      suicidality
    };
  }

  /**
   * Calculate PHQ-9 score from response objects
   */
  calculatePHQ9FromResponses(responses: MentalHealthResponse[]): PHQ9Result {
    const scores = responses.map(r => r.answer);
    return this.calculatePHQ9(scores);
  }

  /**
   * Interpret PHQ-9 score
   */
  getPHQ9Interpretation(score: number): {
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
    severity: PHQ9Result['severity'];
  } {
    if (score <= this.PHQ9_THRESHOLDS.NONE) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Minimal or no depression. Continue routine monitoring.',
        level: InterpretationLevel.Normal,
        severity: score === 0 ? 'none' : 'minimal'
      };
    } else if (score <= this.PHQ9_THRESHOLDS.MILD) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Mild depression. Watchful waiting, repeat PHQ-9 at follow-up.',
        level: InterpretationLevel.Mild,
        severity: 'mild'
      };
    } else if (score <= this.PHQ9_THRESHOLDS.MODERATE) {
      return {
        riskLevel: RiskLevel.Medium,
        interpretation: 'Moderate depression. Consider counseling, follow-up, and possibly pharmacotherapy.',
        level: InterpretationLevel.Moderate,
        severity: 'moderate'
      };
    } else if (score <= this.PHQ9_THRESHOLDS.MODERATELY_SEVERE) {
      return {
        riskLevel: RiskLevel.High,
        interpretation: 'Moderately severe depression. Active treatment with pharmacotherapy and/or psychotherapy recommended.',
        level: InterpretationLevel.Severe,
        severity: 'moderately_severe'
      };
    } else {
      return {
        riskLevel: RiskLevel.VeryHigh,
        interpretation: 'Severe depression. Immediate initiation of pharmacotherapy and expedited referral to mental health specialist.',
        level: InterpretationLevel.Critical,
        severity: 'severe'
      };
    }
  }

  /**
   * Evaluate suicidality based on question 9 score
   */
  private evaluateSuicidality(question9Score: number): PHQ9Result['suicidality'] {
    const present = question9Score >= 1;

    let action: string;
    if (question9Score === 0) {
      action = 'No current suicidality. Continue routine monitoring.';
    } else if (question9Score === 1) {
      action = 'Low risk. Ask about suicidal thoughts, ensure safety plan in place.';
    } else if (question9Score === 2) {
      action = 'Moderate risk. Consider psychiatric consultation, ensure safety plan, close follow-up.';
    } else {
      action = 'High risk. Immediate psychiatric evaluation, consider hospitalization, constant observation.';
    }

    return {
      present,
      score: question9Score,
      action
    };
  }

  /**
   * Get PHQ-9 recommendations based on severity
   */
  getPHQ9Recommendations(severity: PHQ9Result['severity'], hasSuicidalThoughts: boolean): string[] {
    const baseRecs: Record<string, string[]> = {
      none: [
        'No depression treatment indicated',
        'Maintain healthy lifestyle habits',
        'Reassess if symptoms emerge'
      ],
      minimal: [
        'Reassurance and encouragement',
        'Promote healthy sleep, nutrition, and exercise',
        'Monitor for worsening',
        'Consider psychoeducation about depression'
      ],
      mild: [
        'Develop wellness action plan',
        'Encourage regular exercise and social activities',
        'Consider brief counseling (e.g., behavioral activation)',
        'Follow-up in 2 weeks to reassess',
        'Consider referral to counseling services'
      ],
      moderate: [
        'Develop a depression treatment plan',
        'Consider psychotherapy referral (CBT, interpersonal therapy)',
        'Discuss pharmacotherapy options with patient',
        'Address any psychosocial stressors',
        'Follow-up within 2 weeks',
        'Consider referral to mental health services'
      ],
      moderately_severe: [
        'Active treatment required',
        'Psychotherapy (CBT, interpersonal) recommended',
        'Pharmacotherapy strongly recommended',
        'Consider combined treatment (medication + therapy)',
        'Referral to mental health specialist',
        'Weekly or bi-weekly follow-up',
        'Monitor for functional impairment'
      ],
      severe: [
        'Immediate mental health intervention required',
        'Psychiatric evaluation for treatment planning',
        'Pharmacotherapy is indicated',
        'Intensive psychotherapy',
        'Consider combined treatment',
        'Evaluate need for crisis services or hospitalization',
        'Frequent monitoring (weekly or more often)',
        'Involve family/support system in treatment'
      ]
    };

    let recommendations = [...(baseRecs[severity] || baseRecs.none)];

    if (hasSuicidalThoughts) {
      recommendations.unshift('SAFETY CONCERN: Assess safety and develop safety plan');
      recommendations.push('Ensure access to crisis support resources');
    }

    return recommendations;
  }

  /**
   * Get PHQ-9 follow-up actions
   */
  private getPHQ9FollowUp(
    severity: PHQ9Result['severity'],
    suicidality: PHQ9Result['suicidality']
  ): string[] {
    const actions: string[] = [];

    switch (severity) {
      case 'none':
      case 'minimal':
        actions.push('Reassess in 4-6 weeks or if symptoms worsen');
        break;
      case 'mild':
        actions.push('Reassess in 2 weeks');
        actions.push('Consider referral to counseling');
        break;
      case 'moderate':
        actions.push('Reassess in 2 weeks');
        actions.push('Schedule follow-up appointment');
        actions.push('Consider referral to mental health services');
        break;
      case 'moderately_severe':
        actions.push('Refer to mental health professional within 2 weeks');
        actions.push('Schedule close follow-up');
        actions.push('Develop crisis safety plan');
        break;
      case 'severe':
        actions.push('Urgent mental health referral (within 24-48 hours)');
        actions.push('Consider psychiatric emergency services');
        actions.push('Establish crisis safety plan');
        actions.push('Frequent monitoring required');
        break;
    }

    if (suicidality.present) {
      if (suicidality.score >= 2) {
        actions.unshift('IMMEDIATE ACTION: Psychiatric evaluation required');
        actions.unshift('Consider crisis intervention services');
      } else {
        actions.unshift('Assess safety and develop safety plan');
      }
    }

    return actions;
  }

  /**
   * Calculate GAD-7 score from responses
   * Responses should be an array of 7 numbers (0-3 each)
   */
  calculateGAD7(responses: number[]): GAD7Result {
    // Validate responses
    if (responses.length !== 7) {
      throw new Error('GAD-7 requires exactly 7 responses');
    }

    for (let i = 0; i < responses.length; i++) {
      if (responses[i] < 0 || responses[i] > 3) {
        throw new Error(`GAD-7 response ${i + 1} must be between 0 and 3, got ${responses[i]}`);
      }
    }

    const totalScore = responses.reduce((sum, r) => sum + r, 0);
    const interpretation = this.getGAD7Interpretation(totalScore);

    return {
      totalScore,
      maxScore: 21,
      riskLevel: interpretation.riskLevel,
      interpretation: interpretation.interpretation,
      interpretationLevel: interpretation.level,
      severity: interpretation.severity,
      questionScores: responses,
      recommendations: this.getGAD7Recommendations(interpretation.severity),
      followUpActions: this.getGAD7FollowUp(interpretation.severity)
    };
  }

  /**
   * Calculate GAD-7 score from response objects
   */
  calculateGAD7FromResponses(responses: MentalHealthResponse[]): GAD7Result {
    const scores = responses.map(r => r.answer);
    return this.calculateGAD7(scores);
  }

  /**
   * Interpret GAD-7 score
   */
  getGAD7Interpretation(score: number): {
    riskLevel: RiskLevel;
    interpretation: string;
    level: InterpretationLevel;
    severity: GAD7Result['severity'];
  } {
    if (score <= this.GAD7_THRESHOLDS.NONE) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Minimal or no anxiety. Continue routine monitoring.',
        level: InterpretationLevel.Normal,
        severity: 'none'
      };
    } else if (score <= this.GAD7_THRESHOLDS.MILD) {
      return {
        riskLevel: RiskLevel.Low,
        interpretation: 'Mild anxiety. Watchful waiting, consider counseling.',
        level: InterpretationLevel.Mild,
        severity: 'mild'
      };
    } else if (score <= this.GAD7_THRESHOLDS.MODERATE) {
      return {
        riskLevel: RiskLevel.Medium,
        interpretation: 'Moderate anxiety. Consider treatment options including therapy and/or medication.',
        level: InterpretationLevel.Moderate,
        severity: 'moderate'
      };
    } else {
      return {
        riskLevel: RiskLevel.High,
        interpretation: 'Severe anxiety. Active treatment recommended, consider specialist referral.',
        level: InterpretationLevel.Severe,
        severity: 'severe'
      };
    }
  }

  /**
   * Get GAD-7 recommendations based on severity
   */
  getGAD7Recommendations(severity: GAD7Result['severity']): string[] {
    const recommendations: Record<string, string[]> = {
      none: [
        'No anxiety treatment indicated',
        'Maintain healthy coping strategies',
        'Reassess if symptoms emerge'
      ],
      mild: [
        'Psychoeducation about anxiety',
        'Introduce relaxation techniques (deep breathing, progressive muscle relaxation)',
        'Encourage regular physical exercise',
        'Consider brief counseling if symptoms persist',
        'Reassess in 4 weeks'
      ],
      moderate: [
        'Develop anxiety management plan',
        'Consider cognitive-behavioral therapy (CBT)',
        'Discuss medication options if appropriate',
        'Teach grounding and mindfulness techniques',
        'Limit caffeine and alcohol intake',
        'Referral to anxiety management program',
        'Follow-up in 2 weeks'
      ],
      severe: [
        'Active treatment required',
        'Psychotherapy (CBT) strongly recommended',
        'Consider pharmacotherapy',
        'Refer to mental health specialist',
        'Develop coping strategies for panic symptoms',
        'Regular follow-up monitoring',
        'Address functional impairment',
        'Consider crisis resources if acute distress'
      ]
    };

    return recommendations[severity] || recommendations.none;
  }

  /**
   * Get GAD-7 follow-up actions
   */
  private getGAD7FollowUp(severity: GAD7Result['severity']): string[] {
    const actions: string[] = [];

    switch (severity) {
      case 'none':
        actions.push('Reassess in 6-8 weeks if needed');
        break;
      case 'mild':
        actions.push('Reassess in 4 weeks');
        actions.push('Provide anxiety management resources');
        break;
      case 'moderate':
        actions.push('Follow-up in 2 weeks');
        actions.push('Consider therapy referral');
        actions.push('Develop self-help anxiety strategies');
        break;
      case 'severe':
        actions.push('Refer to mental health specialist');
        actions.push('Develop crisis plan');
        actions.push('Consider psychiatric consultation');
        actions.push('Frequent monitoring required');
        break;
    }

    return actions;
  }

  /**
   * Get PHQ-9 question text
   */
  getPHQ9Questions(): string[] {
    return [...this.PHQ9_QUESTIONS];
  }

  /**
   * Get GAD-7 question text
   */
  getGAD7Questions(): string[] {
    return [...this.GAD7_QUESTIONS];
  }

  /**
   * Validate PHQ-9 responses
   */
  validatePHQ9Responses(responses: number[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (responses.length !== 9) {
      errors.push(`Expected 9 responses, got ${responses.length}`);
    }

    for (let i = 0; i < responses.length; i++) {
      if (typeof responses[i] !== 'number' || isNaN(responses[i])) {
        errors.push(`Response ${i + 1} must be a number`);
      } else if (responses[i] < 0 || responses[i] > 3) {
        errors.push(`Response ${i + 1} must be between 0 and 3, got ${responses[i]}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate GAD-7 responses
   */
  validateGAD7Responses(responses: number[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (responses.length !== 7) {
      errors.push(`Expected 7 responses, got ${responses.length}`);
    }

    for (let i = 0; i < responses.length; i++) {
      if (typeof responses[i] !== 'number' || isNaN(responses[i])) {
        errors.push(`Response ${i + 1} must be a number`);
      } else if (responses[i] < 0 || responses[i] > 3) {
        errors.push(`Response ${i + 1} must be between 0 and 3, got ${responses[i]}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Combined screening for both depression and anxiety
   */
  combinedScreening(phq9Responses: number[], gad7Responses: number[]): {
    phq9: PHQ9Result;
    gad7: GAD7Result;
    overallRecommendation: string;
    referralNeeded: boolean;
  } {
    const phq9Result = this.calculatePHQ9(phq9Responses);
    const gad7Result = this.calculateGAD7(gad7Responses);

    const referralNeeded =
      phq9Result.severity === 'moderately_severe' ||
      phq9Result.severity === 'severe' ||
      phq9Result.suicidality.present ||
      gad7Result.severity === 'severe';

    let overallRecommendation: string;
    if (referralNeeded) {
      overallRecommendation = 'Mental health referral recommended. Consider psychiatric consultation.';
    } else if (phq9Result.severity === 'moderate' || gad7Result.severity === 'moderate') {
      overallRecommendation = 'Consider counseling and/or medication. Close monitoring recommended.';
    } else {
      overallRecommendation = 'Continue monitoring. Encourage self-help strategies and healthy lifestyle.';
    }

    return {
      phq9: phq9Result,
      gad7: gad7Result,
      overallRecommendation,
      referralNeeded
    };
  }
}

export const mentalHealthAssessment = new MentalHealthAssessment();
export default mentalHealthAssessment;
