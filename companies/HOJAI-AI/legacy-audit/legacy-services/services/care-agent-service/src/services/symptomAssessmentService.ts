import { z } from 'zod';
import { logger } from '../utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum UrgencyLevel {
  EMERGENCY = 'emergency',
  URGENT = 'urgent',
  ROUTINE = 'routine',
}

export enum SymptomCategory {
  CARDIOVASCULAR = 'cardiovascular',
  RESPIRATORY = 'respiratory',
  NEUROLOGICAL = 'neurological',
  GASTROINTESTINAL = 'gastrointestinal',
  MUSCULOSKELETAL = 'musculoskeletal',
  DERMATOLOGICAL = 'dermatological',
  MENTAL_HEALTH = 'mental_health',
  GENERAL = 'general',
  PAIN = 'pain',
  FEVER = 'fever',
}

export interface SymptomAssessmentResult {
  urgencyLevel: UrgencyLevel;
  category: SymptomCategory;
  possibleConditions: PossibleCondition[];
  recommendations: string[];
  redFlags: string[];
  questions: string[];
  disclaimer: string;
}

export interface PossibleCondition {
  name: string;
  probability: 'high' | 'medium' | 'low';
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
}

export interface SymptomInput {
  symptoms: string[];
  duration?: string;
  severity?: 'mild' | 'moderate' | 'severe';
  additionalContext?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const SymptomInputSchema = z.object({
  symptoms: z.array(z.string()).min(1, 'At least one symptom is required'),
  duration: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  additionalContext: z.string().optional(),
  age: z.number().min(0).max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

// ============================================================================
// Symptom Assessment Service
// ============================================================================

export class SymptomAssessmentService {
  private static readonly EMERGENCY_KEYWORDS = [
    'chest pain', 'difficulty breathing', 'shortness of breath', 'cannot breathe',
    'unconscious', 'unresponsive', 'seizure', 'stroke', 'severe bleeding',
    'head injury', 'confusion', 'slurred speech', 'numbness', 'tingling',
    'severe allergic reaction', 'anaphylaxis', 'suicide', 'overdose',
    'cardiac arrest', 'heart attack', 'stroke symptoms', 'fainting',
    'severe head pain', 'worst headache of my life', 'vision loss',
    'inability to move', 'paralysis', 'coughing blood', 'blood in stool',
    'severe burns', 'electrocution', 'drowning',
  ];

  private static readonly URGENT_KEYWORDS = [
    'high fever', 'persistent fever', 'fever for days', 'infection',
    'severe pain', 'moderate pain', 'worsening symptoms', 'new symptoms',
    'blood in urine', 'blood in vomit', 'severe vomiting', 'dehydration',
    'allergic reaction', 'rash spreading', 'difficulty swallowing',
    'ear pain', 'throat pain', 'sinus pressure', 'congestion',
    'back pain severe', 'neck stiffness', 'joint swelling', 'injury',
    'anxiety attack', 'panic attack', 'depression worsening',
  ];

  private static readonly SYMPTOM_CATEGORIES: Record<string, SymptomCategory> = {
    'chest pain': SymptomCategory.CARDIOVASCULAR,
    'palpitations': SymptomCategory.CARDIOVASCULAR,
    'heart racing': SymptomCategory.CARDIOVASCULAR,
    'shortness of breath': SymptomCategory.RESPIRATORY,
    'cough': SymptomCategory.RESPIRATORY,
    'wheezing': SymptomCategory.RESPIRATORY,
    'headache': SymptomCategory.NEUROLOGICAL,
    'dizziness': SymptomCategory.NEUROLOGICAL,
    'nausea': SymptomCategory.GASTROINTESTINAL,
    'vomiting': SymptomCategory.GASTROINTESTINAL,
    'diarrhea': SymptomCategory.GASTROINTESTINAL,
    'stomach pain': SymptomCategory.GASTROINTESTINAL,
    'back pain': SymptomCategory.MUSCULOSKELETAL,
    'joint pain': SymptomCategory.MUSCULOSKELETAL,
    'muscle pain': SymptomCategory.MUSCULOSKELETAL,
    'rash': SymptomCategory.DERMATOLOGICAL,
    'skin irritation': SymptomCategory.DERMATOLOGICAL,
    'anxiety': SymptomCategory.MENTAL_HEALTH,
    'depression': SymptomCategory.MENTAL_HEALTH,
    'stress': SymptomCategory.MENTAL_HEALTH,
    'fever': SymptomCategory.FEVER,
    'tiredness': SymptomCategory.GENERAL,
    'fatigue': SymptomCategory.GENERAL,
    'body ache': SymptomCategory.GENERAL,
  };

  /**
   * Assess symptoms and determine urgency level
   */
  async assessSymptoms(input: SymptomInput): Promise<SymptomAssessmentResult> {
    const endOperation = logger.startOperation('SymptomAssessment', {
      symptoms: input.symptoms.join(', '),
    });

    try {
      // Validate input
      const validatedInput = SymptomInputSchema.parse(input);

      // Determine urgency level
      const urgencyLevel = this.determineUrgencyLevel(validatedInput.symptoms);

      // Determine category
      const category = this.determinePrimaryCategory(validatedInput.symptoms);

      // Generate possible conditions
      const possibleConditions = this.generatePossibleConditions(
        validatedInput.symptoms,
        category,
        urgencyLevel
      );

      // Generate recommendations based on urgency
      const recommendations = this.generateRecommendations(
        urgencyLevel,
        category,
        validatedInput
      );

      // Generate red flags
      const redFlags = this.generateRedFlags(urgencyLevel, validatedInput.symptoms);

      // Generate follow-up questions
      const questions = this.generateFollowUpQuestions(
        urgencyLevel,
        category,
        validatedInput
      );

      const result: SymptomAssessmentResult = {
        urgencyLevel,
        category,
        possibleConditions,
        recommendations,
        redFlags,
        questions,
        disclaimer: this.getDisclaimer(),
      };

      logger.info('Symptom assessment completed', {
        urgencyLevel,
        category,
        conditionCount: possibleConditions.length,
      });

      endOperation();
      return result;
    } catch (error) {
      logger.error('Symptom assessment failed', error);
      throw error;
    }
  }

  /**
   * Determine urgency level based on symptoms
   */
  private determineUrgencyLevel(symptoms: string[]): UrgencyLevel {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());

    // Check for emergency keywords
    for (const symptom of lowerSymptoms) {
      for (const emergencyKeyword of SymptomAssessmentService.EMERGENCY_KEYWORDS) {
        if (symptom.includes(emergencyKeyword)) {
          return UrgencyLevel.EMERGENCY;
        }
      }
    }

    // Check for urgent keywords
    for (const symptom of lowerSymptoms) {
      for (const urgentKeyword of SymptomAssessmentService.URGENT_KEYWORDS) {
        if (symptom.includes(urgentKeyword)) {
          return UrgencyLevel.URGENT;
        }
      }
    }

    return UrgencyLevel.ROUTINE;
  }

  /**
   * Determine the primary symptom category
   */
  private determinePrimaryCategory(symptoms: string[]): SymptomCategory {
    const categoryCount: Record<SymptomCategory, number> = {
      [SymptomCategory.CARDIOVASCULAR]: 0,
      [SymptomCategory.RESPIRATORY]: 0,
      [SymptomCategory.NEUROLOGICAL]: 0,
      [SymptomCategory.GASTROINTESTINAL]: 0,
      [SymptomCategory.MUSCULOSKELETAL]: 0,
      [SymptomCategory.DERMATOLOGICAL]: 0,
      [SymptomCategory.MENTAL_HEALTH]: 0,
      [SymptomCategory.GENERAL]: 0,
      [SymptomCategory.PAIN]: 0,
      [SymptomCategory.FEVER]: 0,
    };

    for (const symptom of symptoms) {
      const lowerSymptom = symptom.toLowerCase();
      for (const [keyword, category] of Object.entries(
        SymptomAssessmentService.SYMPTOM_CATEGORIES
      )) {
        if (lowerSymptom.includes(keyword)) {
          categoryCount[category]++;
        }
      }
    }

    // Find the most common category
    let maxCount = 0;
    let primaryCategory = SymptomCategory.GENERAL;

    for (const [category, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        primaryCategory = category as SymptomCategory;
      }
    }

    return primaryCategory;
  }

  /**
   * Generate possible conditions based on symptoms
   */
  private generatePossibleConditions(
    symptoms: string[],
    category: SymptomCategory,
    urgency: UrgencyLevel
  ): PossibleCondition[] {
    const conditions: PossibleCondition[] = [];
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());

    // Cardiovascular conditions
    if (
      category === SymptomCategory.CARDIOVASCULAR ||
      lowerSymptoms.some(s => s.includes('chest') || s.includes('heart'))
    ) {
      conditions.push(
        {
          name: 'Hypertension (High Blood Pressure)',
          probability: 'medium',
          description: 'Elevated blood pressure that may require monitoring',
          severity: urgency === UrgencyLevel.EMERGENCY ? 'severe' : 'moderate',
        },
        {
          name: 'Angina',
          probability: 'low',
          description: 'Chest pain caused by reduced blood flow to the heart',
          severity: 'moderate',
        }
      );
    }

    // Respiratory conditions
    if (
      category === SymptomCategory.RESPIRATORY ||
      lowerSymptoms.some(s => s.includes('breath') || s.includes('cough'))
    ) {
      conditions.push(
        {
          name: 'Upper Respiratory Infection',
          probability: 'high',
          description: 'Common cold or viral infection affecting the airways',
          severity: 'mild',
        },
        {
          name: 'Bronchitis',
          probability: 'medium',
          description: 'Inflammation of the bronchial tubes',
          severity: 'mild',
        }
      );
    }

    // Neurological conditions
    if (
      category === SymptomCategory.NEUROLOGICAL ||
      lowerSymptoms.some(s => s.includes('head') || s.includes('dizzy'))
    ) {
      conditions.push(
        {
          name: 'Tension Headache',
          probability: 'high',
          description: 'Common headache caused by stress or muscle tension',
          severity: 'mild',
        },
        {
          name: 'Migraine',
          probability: 'medium',
          description: 'Recurring headache often accompanied by nausea and light sensitivity',
          severity: 'moderate',
        }
      );
    }

    // Gastrointestinal conditions
    if (
      category === SymptomCategory.GASTROINTESTINAL ||
      lowerSymptoms.some(s => s.includes('stomach') || s.includes('nausea'))
    ) {
      conditions.push(
        {
          name: 'Gastritis',
          probability: 'medium',
          description: 'Inflammation of the stomach lining',
          severity: 'mild',
        },
        {
          name: 'Food Intolerance',
          probability: 'medium',
          description: 'Difficulty digesting certain foods',
          severity: 'mild',
        }
      );
    }

    // Fever
    if (category === SymptomCategory.FEVER || lowerSymptoms.some(s => s.includes('fever'))) {
      conditions.push(
        {
          name: 'Viral Infection',
          probability: 'high',
          description: 'Common viral illness that typically resolves with rest and hydration',
          severity: 'mild',
        },
        {
          name: 'Bacterial Infection',
          probability: 'medium',
          description: 'May require antibiotics - consult a doctor for diagnosis',
          severity: urgency === UrgencyLevel.URGENT ? 'moderate' : 'mild',
        }
      );
    }

    // Mental health
    if (
      category === SymptomCategory.MENTAL_HEALTH ||
      lowerSymptoms.some(s => s.includes('anxiety') || s.includes('stress'))
    ) {
      conditions.push(
        {
          name: 'Generalized Anxiety Disorder',
          probability: 'medium',
          description: 'Persistent feeling of anxiety affecting daily life',
          severity: 'moderate',
        },
        {
          name: 'Stress-Related Symptoms',
          probability: 'high',
          description: 'Physical symptoms caused by stress',
          severity: 'mild',
        }
      );
    }

    // General symptoms
    if (conditions.length === 0) {
      conditions.push({
        name: 'Non-Specific Illness',
        probability: 'medium',
        description: 'Symptoms that may resolve with rest and self-care',
        severity: 'mild',
      });
    }

    // Sort by probability
    const probabilityOrder = { high: 0, medium: 1, low: 2 };
    conditions.sort((a, b) => probabilityOrder[a.probability] - probabilityOrder[b.probability]);

    return conditions;
  }

  /**
   * Generate recommendations based on urgency and category
   */
  private generateRecommendations(
    urgency: UrgencyLevel,
    category: SymptomCategory,
    input: SymptomInput
  ): string[] {
    const recommendations: string[] = [];

    switch (urgency) {
      case UrgencyLevel.EMERGENCY:
        recommendations.push(
          'Call emergency services (112/911) or go to the nearest emergency room immediately',
          'Do not drive yourself to the hospital - call for an ambulance if possible',
          'If unconscious, check for breathing and pulse until help arrives',
          'Have someone stay with you until emergency services arrive'
        );
        break;

      case UrgencyLevel.URGENT:
        recommendations.push(
          'Schedule an appointment with your doctor within 24-48 hours',
          'Visit an urgent care center if you cannot see your doctor soon',
          'Monitor your symptoms closely and seek emergency care if they worsen',
          'Keep a record of your symptoms, including when they started and any patterns'
        );
        break;

      case UrgencyLevel.ROUTINE:
        recommendations.push(
          'Schedule a routine appointment with your primary care physician',
          'Rest and stay hydrated',
          'Monitor your symptoms for the next few days',
          'Note any changes in your condition to discuss with your doctor'
        );
        break;
    }

    // Add category-specific recommendations
    switch (category) {
      case SymptomCategory.CARDIOVASCULAR:
        recommendations.push(
          'Avoid caffeine, alcohol, and tobacco',
          'Monitor your blood pressure at home if available',
          'Avoid strenuous physical activity until evaluated'
        );
        break;
      case SymptomCategory.RESPIRATORY:
        recommendations.push(
          'Stay in a well-ventilated area',
          'Use a humidifier if available',
          'Avoid smoke and pollutants',
          'Stay hydrated to thin mucus'
        );
        break;
      case SymptomCategory.GASTROINTESTINAL:
        recommendations.push(
          'Eat light, bland foods (BRAT diet: bananas, rice, applesauce, toast)',
          'Avoid dairy, caffeine, and fatty foods',
          'Small, frequent meals may be easier to tolerate',
          'Rehydrate with electrolyte solutions if vomiting or diarrhea occurs'
        );
        break;
      case SymptomCategory.MENTAL_HEALTH:
        recommendations.push(
          'Practice deep breathing and relaxation techniques',
          'Maintain a regular sleep schedule',
          'Consider talking to a mental health professional',
          'Connect with supportive friends or family'
        );
        break;
      case SymptomCategory.FEVER:
        recommendations.push(
          'Take acetaminophen or ibuprofen as directed for fever',
          'Apply cool compresses to the forehead',
          'Take a lukewarm bath if fever is high',
          'Rest in a comfortable, cool environment'
        );
        break;
    }

    return recommendations;
  }

  /**
   * Generate red flags based on symptoms
   */
  private generateRedFlags(urgency: UrgencyLevel, symptoms: string[]): string[] {
    const redFlags: string[] = [];
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());

    if (urgency === UrgencyLevel.EMERGENCY) {
      redFlags.push(
        'Life-threatening symptoms detected',
        'Immediate medical attention required',
        'Do not delay seeking care'
      );
    }

    // Check for specific red flag combinations
    if (lowerSymptoms.some(s => s.includes('chest pain')) && lowerSymptoms.some(s => s.includes('shortness of breath'))) {
      redFlags.push('Chest pain combined with breathing difficulty may indicate cardiac emergency');
    }

    if (lowerSymptoms.some(s => s.includes('headache')) && lowerSymptoms.some(s => s.includes('stiff neck'))) {
      redFlags.push('Headache with stiff neck may indicate meningitis - seek immediate care');
    }

    if (lowerSymptoms.some(s => s.includes('confusion')) || lowerSymptoms.some(s => s.includes('disorientation'))) {
      redFlags.push('Mental confusion requires immediate evaluation');
    }

    return redFlags;
  }

  /**
   * Generate follow-up questions based on symptoms
   */
  private generateFollowUpQuestions(
    urgency: UrgencyLevel,
    category: SymptomCategory,
    input: SymptomInput
  ): string[] {
    const questions: string[] = [];

    // Duration questions
    if (!input.duration) {
      questions.push('When did your symptoms first start?');
    }

    // Severity questions
    if (!input.severity) {
      questions.push('How would you rate the severity of your symptoms (mild, moderate, or severe)?');
    }

    // Category-specific questions
    switch (category) {
      case SymptomCategory.CARDIOVASCULAR:
        questions.push(
          'Have you experienced any chest pain? If yes, how long did it last?',
          'Do you have a history of heart disease or high blood pressure?',
          'Are you currently taking any heart medications?'
        );
        break;
      case SymptomCategory.RESPIRATORY:
        questions.push(
          'Do you have a cough? If yes, is it dry or producing mucus?',
          'Have you been in contact with anyone who is sick?',
          'Do you have any known respiratory conditions like asthma?'
        );
        break;
      case SymptomCategory.GASTROINTESTINAL:
        questions.push(
          'Have you noticed any changes in your bowel movements?',
          'What foods have you eaten in the last 24 hours?',
          'Have you traveled recently or been exposed to different water/food?'
        );
        break;
      case SymptomCategory.NEUROLOGICAL:
        questions.push(
          'Is the headache localized to one area or all over?',
          'Do bright lights make your symptoms worse?',
          'Have you experienced any vision changes?'
        );
        break;
    }

    // General questions
    questions.push(
      'Are you currently taking any medications or supplements?',
      'Do you have any known allergies?'
    );

    return [...new Set(questions)]; // Remove duplicates
  }

  /**
   * Get disclaimer text
   */
  private getDisclaimer(): string {
    return 'This assessment is for informational purposes only and does not constitute medical advice. ' +
      'Always consult with a qualified healthcare professional for proper diagnosis and treatment. ' +
      'In case of emergency, call your local emergency services immediately.';
  }
}

export const symptomAssessmentService = new SymptomAssessmentService();
