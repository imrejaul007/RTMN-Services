import OpenAI from 'openai';
import {
  IQuestion,
  IVisitContext,
  VisitType,
  QuestionCategory,
  QuestionPriority,
  ISymptom,
  PreVisitQuestion,
  IPreVisitQuestionDocument
} from '../models/preVisit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

// ============================================================================
// QUESTION TEMPLATES BY VISIT TYPE
// ============================================================================

const QUESTION_TEMPLATES: Record<VisitType, { category: QuestionCategory; question: string; priority: QuestionPriority; reasoning: string }[]> = {
  [VisitType.GENERAL_CHECKUP]: [
    { category: QuestionCategory.SYMPTOMS, question: 'How have you been feeling overall since your last visit?', priority: QuestionPriority.MEDIUM, reasoning: 'General checkups require understanding overall well-being' },
    { category: QuestionCategory.MEDICATION, question: 'Are you taking all your medications as prescribed?', priority: QuestionPriority.HIGH, reasoning: 'Medication adherence is critical for treatment success' },
    { category: QuestionCategory.LIFESTYLE, question: 'Have you made any changes to your diet or exercise routine?', priority: QuestionPriority.MEDIUM, reasoning: 'Lifestyle changes impact health outcomes' },
    { category: QuestionCategory.PREVENTION, question: 'Are there any preventive screenings you are due for?', priority: QuestionPriority.LOW, reasoning: 'Preventive care is important for early detection' },
    { category: QuestionCategory.QUALITY_OF_LIFE, question: 'Do you have any concerns about your sleep, energy levels, or mood?', priority: QuestionPriority.MEDIUM, reasoning: 'Quality of life indicators reveal underlying issues' }
  ],
  [VisitType.FOLLOW_UP]: [
    { category: QuestionCategory.SYMPTOMS, question: 'How have your symptoms changed since your last visit?', priority: QuestionPriority.CRITICAL, reasoning: 'Symptom tracking is essential for follow-up evaluation' },
    { category: QuestionCategory.TREATMENT, question: 'Is the current treatment plan working for you?', priority: QuestionPriority.HIGH, reasoning: 'Treatment effectiveness must be evaluated' },
    { category: QuestionCategory.SIDE_EFFECTS, question: 'Are you experiencing any side effects from medications?', priority: QuestionPriority.HIGH, reasoning: 'Side effects may require treatment adjustment' },
    { category: QuestionCategory.FOLLOW_UP, question: 'What is the expected timeline for improvement?', priority: QuestionPriority.MEDIUM, reasoning: 'Setting expectations helps with patient compliance' },
    { category: QuestionCategory.SYMPTOMS, question: 'Are there any new symptoms you have noticed?', priority: QuestionPriority.HIGH, reasoning: 'New symptoms may indicate progression or complications' }
  ],
  [VisitType.NEW_CONDITION]: [
    { category: QuestionCategory.SYMPTOMS, question: 'When did you first notice these symptoms?', priority: QuestionPriority.CRITICAL, reasoning: 'Onset timing is critical for diagnosis' },
    { category: QuestionCategory.SYMPTOMS, question: 'What makes the symptoms better or worse?', priority: QuestionPriority.HIGH, reasoning: 'Identifying triggers helps with diagnosis and management' },
    { category: QuestionCategory.DIAGNOSIS, question: 'What are the possible causes of my symptoms?', priority: QuestionPriority.HIGH, reasoning: 'Understanding potential causes reduces anxiety' },
    { category: QuestionCategory.TEST_RESULTS, question: 'What tests will be needed to determine the cause?', priority: QuestionPriority.MEDIUM, reasoning: 'Patients should understand the diagnostic process' },
    { category: QuestionCategory.TREATMENT, question: 'What treatment options are available?', priority: QuestionPriority.HIGH, reasoning: 'Treatment options help with shared decision making' },
    { category: QuestionCategory.PREVENTION, question: 'How can I prevent this condition from worsening?', priority: QuestionPriority.MEDIUM, reasoning: 'Prevention strategies are important for management' }
  ],
  [VisitType.CHRONIC_CARE]: [
    { category: QuestionCategory.MEDICATION, question: 'Are you experiencing any issues with your current medications?', priority: QuestionPriority.HIGH, reasoning: 'Chronic conditions require medication optimization' },
    { category: QuestionCategory.SYMPTOMS, question: 'How well are your symptoms being controlled?', priority: QuestionPriority.HIGH, reasoning: 'Symptom control is the goal of chronic care' },
    { category: QuestionCategory.LIFESTYLE, question: 'How are you managing lifestyle factors that affect your condition?', priority: QuestionPriority.MEDIUM, reasoning: 'Lifestyle management is crucial for chronic conditions' },
    { category: QuestionCategory.TEST_RESULTS, question: 'What do my recent lab results show about my condition?', priority: QuestionPriority.MEDIUM, reasoning: 'Understanding test results helps with self-management' },
    { category: QuestionCategory.FOLLOW_UP, question: 'When should I schedule my next follow-up?', priority: QuestionPriority.LOW, reasoning: 'Regular monitoring is essential for chronic care' },
    { category: QuestionCategory.COMPLICATIONS, question: 'Should I be watching for any complications?', priority: QuestionPriority.HIGH, reasoning: 'Early complication detection prevents serious outcomes' }
  ],
  [VisitType.SPECIALIST_REFERRAL]: [
    { category: QuestionCategory.DIAGNOSIS, question: 'Why am I being referred to a specialist?', priority: QuestionPriority.HIGH, reasoning: 'Patients should understand the reason for referral' },
    { category: QuestionCategory.TEST_RESULTS, question: 'What information will the specialist need from me?', priority: QuestionPriority.MEDIUM, reasoning: 'Being prepared helps the specialist provide better care' },
    { category: QuestionCategory.PROCEDURE, question: 'Will the specialist perform any procedures?', priority: QuestionPriority.MEDIUM, reasoning: 'Patients should know what to expect' },
    { category: QuestionCategory.FOLLOW_UP, question: 'Will I continue seeing my primary care doctor as well?', priority: QuestionPriority.LOW, reasoning: 'Clarifying care coordination is important' }
  ],
  [VisitType.URGENT_CARE]: [
    { category: QuestionCategory.SYMPTOMS, question: 'How severe is your current symptom or condition?', priority: QuestionPriority.CRITICAL, reasoning: 'Severity determines urgency of care' },
    { category: QuestionCategory.SYMPTOMS, question: 'How long have you been experiencing these symptoms?', priority: QuestionPriority.HIGH, reasoning: 'Duration helps determine cause and treatment' },
    { category: QuestionCategory.MEDICATION, question: 'Are you currently taking any medications?', priority: QuestionPriority.HIGH, reasoning: 'Medications may interact with treatment' },
    { category: QuestionCategory.ALLERGIES, question: 'Do you have any allergies to medications?', priority: QuestionPriority.CRITICAL, reasoning: 'Allergies must be known for safe treatment' }
  ],
  [VisitType.TELEMEDICINE]: [
    { category: QuestionCategory.SYMPTOMS, question: 'Can you clearly describe the symptoms you want to discuss?', priority: QuestionPriority.CRITICAL, reasoning: 'Clear communication is essential for telemedicine' },
    { category: QuestionCategory.TECHNICAL, question: 'Are you in a quiet, private space for this consultation?', priority: QuestionPriority.MEDIUM, reasoning: 'Privacy and quiet are needed for effective consultation' },
    { category: QuestionCategory.FOLLOW_UP, question: 'Do you need a physical examination that cannot be done virtually?', priority: QuestionPriority.HIGH, reasoning: 'Some conditions require in-person evaluation' },
    { category: QuestionCategory.DOCUMENTATION, question: 'Do you have your recent symptoms, medications, and questions ready?', priority: QuestionPriority.MEDIUM, reasoning: 'Being prepared maximizes telemedicine efficiency' }
  ],
  [VisitType.ANNUAL_PHYSICAL]: [
    { category: QuestionCategory.PREVENTION, question: 'Are you up to date on recommended vaccinations?', priority: QuestionPriority.MEDIUM, reasoning: 'Vaccinations prevent serious diseases' },
    { category: QuestionCategory.SCREENING, question: 'What screenings are recommended for your age and risk factors?', priority: QuestionPriority.MEDIUM, reasoning: 'Screenings detect diseases early' },
    { category: QuestionCategory.LIFESTYLE, question: 'How is your overall lifestyle affecting your health?', priority: QuestionPriority.MEDIUM, reasoning: 'Lifestyle factors impact long-term health' },
    { category: QuestionCategory.FAMILY_HISTORY, question: 'Has there been any change in your family health history?', priority: QuestionPriority.MEDIUM, reasoning: 'Family history affects risk assessment' },
    { category: QuestionCategory.GOALS, question: 'Do you have any health goals you want to discuss?', priority: QuestionPriority.LOW, reasoning: 'Goal-setting promotes engagement in health' }
  ],
  [VisitType.WELLNESS_VISIT]: [
    { category: QuestionCategory.PREVENTION, question: 'What wellness topics would you like to discuss?', priority: QuestionPriority.LOW, reasoning: 'Wellness visits focus on prevention and education' },
    { category: QuestionCategory.LIFESTYLE, question: 'How can you improve your nutrition and fitness?', priority: QuestionPriority.MEDIUM, reasoning: 'Lifestyle optimization is key to wellness' },
    { category: QuestionCategory.MENTAL_HEALTH, question: 'How is your mental and emotional well-being?', priority: QuestionPriority.MEDIUM, reasoning: 'Mental health is part of overall wellness' },
    { category: QuestionCategory.Stress, question: 'What stress management techniques work for you?', priority: QuestionPriority.LOW, reasoning: 'Stress affects overall health' }
  ],
  [VisitType.PREOPERATIVE]: [
    { category: QuestionCategory.PROCEDURE, question: 'What exactly will be done during the surgery?', priority: QuestionPriority.HIGH, reasoning: 'Patients should understand their procedure' },
    { category: QuestionCategory.RISKS, question: 'What are the risks and complications of this surgery?', priority: QuestionPriority.HIGH, reasoning: 'Informed consent requires understanding risks' },
    { category: QuestionCategory.RECOVERY, question: 'What will recovery look like and how long will it take?', priority: QuestionPriority.HIGH, reasoning: 'Recovery planning is essential' },
    { category: QuestionCategory.MEDICATION, question: 'Should I stop taking any medications before surgery?', priority: QuestionPriority.CRITICAL, reasoning: 'Some medications affect surgery safety' },
    { category: QuestionCategory.ALLERGIES, question: 'Do you have any allergies the surgical team should know about?', priority: QuestionPriority.CRITICAL, reasoning: 'Allergies affect anesthesia and medications' },
    { category: QuestionCategory.FOLLOW_UP, question: 'What is the plan for post-operative care?', priority: QuestionPriority.MEDIUM, reasoning: 'Post-op planning reduces anxiety' }
  ],
  [VisitType.POSTOPERATIVE]: [
    { category: QuestionCategory.RECOVERY, question: 'How is your recovery progressing?', priority: QuestionPriority.CRITICAL, reasoning: 'Recovery monitoring is essential' },
    { category: QuestionCategory.SYMPTOMS, question: 'Are you experiencing any unexpected pain or symptoms?', priority: QuestionPriority.HIGH, reasoning: 'Post-op symptoms may indicate complications' },
    { category: QuestionCategory.WOUND_CARE, question: 'Do you have questions about wound care?', priority: QuestionPriority.HIGH, reasoning: 'Proper wound care prevents infections' },
    { category: QuestionCategory.ACTIVITY, question: 'What activities are safe for you to do now?', priority: QuestionPriority.MEDIUM, reasoning: 'Activity restrictions prevent complications' },
    { category: QuestionCategory.FOLLOW_UP, question: 'When should you resume normal activities?', priority: QuestionPriority.MEDIUM, reasoning: 'Activity resumption should be gradual' }
  ],
  [VisitType.PEDIATRIC]: [
    { category: QuestionCategory.GROWTH, question: 'How has your child grown since the last visit?', priority: QuestionPriority.HIGH, reasoning: 'Growth monitoring is essential for children' },
    { category: QuestionCategory.DEVELOPMENT, question: 'Are there any developmental milestones you are concerned about?', priority: QuestionPriority.HIGH, reasoning: 'Development screening detects delays' },
    { category: QuestionCategory.VACCINATION, question: 'Is your child up to date on vaccinations?', priority: QuestionPriority.HIGH, reasoning: 'Vaccinations protect children from diseases' },
    { category: QuestionCategory.BEHAVIOR, question: 'Do you have any concerns about behavior or school?', priority: QuestionPriority.MEDIUM, reasoning: 'Behavioral issues may indicate problems' }
  ],
  [VisitType.MENTAL_HEALTH]: [
    { category: QuestionCategory.MENTAL_HEALTH, question: 'How has your mood been since your last visit?', priority: QuestionPriority.CRITICAL, reasoning: 'Mood tracking is essential for mental health care' },
    { category: QuestionCategory.MEDICATION, question: 'Are you taking your mental health medications as prescribed?', priority: QuestionPriority.HIGH, reasoning: 'Medication adherence affects treatment outcomes' },
    { category: QuestionCategory.SIDE_EFFECTS, question: 'Are you experiencing any side effects from medications?', priority: QuestionPriority.HIGH, reasoning: 'Side effects may need medication adjustment' },
    { category: QuestionCategory.SAFETY, question: 'Do you have any thoughts of harming yourself or others?', priority: QuestionPriority.CRITICAL, reasoning: 'Safety assessment is critical in mental health' },
    { category: QuestionCategory.THERAPY, question: 'How is therapy or counseling going?', priority: QuestionPriority.MEDIUM, reasoning: 'Therapy progress affects overall treatment' },
    { category: QuestionCategory.STRESS, question: 'What stressors are you currently facing?', priority: QuestionPriority.MEDIUM, reasoning: 'Stress affects mental health' }
  ],
  [VisitType.DENTAL]: [
    { category: QuestionCategory.SYMPTOMS, question: 'Are you experiencing any pain or sensitivity?', priority: QuestionPriority.HIGH, reasoning: 'Pain helps identify dental issues' },
    { category: QuestionCategory.HYGIENE, question: 'How is your dental hygiene routine?', priority: QuestionPriority.MEDIUM, reasoning: 'Hygiene affects dental health' },
    { category: QuestionCategory.HISTORY, question: 'Have you had any dental problems since your last visit?', priority: QuestionPriority.MEDIUM, reasoning: 'Recent issues may need attention' },
    { category: QuestionCategory.ANXIETY, question: 'Do you have any dental anxiety we should know about?', priority: QuestionPriority.LOW, reasoning: 'Anxiety affects treatment approach' }
  ],
  [VisitType.OPHTHALMOLOGY]: [
    { category: QuestionCategory.VISION, question: 'Have you noticed any changes in your vision?', priority: QuestionPriority.HIGH, reasoning: 'Vision changes may indicate problems' },
    { category: QuestionCategory.SYMPTOMS, question: 'Are you experiencing any eye pain, redness, or irritation?', priority: QuestionPriority.HIGH, reasoning: 'Eye symptoms require attention' },
    { category: QuestionCategory.HISTORY, question: 'Do you have any family history of eye disease?', priority: QuestionPriority.MEDIUM, reasoning: 'Family history affects risk' },
    { category: QuestionCategory.MEDICATION, question: 'Are you using any eye drops or medications?', priority: QuestionPriority.MEDIUM, reasoning: 'Medications may affect eye health' }
  ],
  [VisitType.CARDIOLOGY]: [
    { category: QuestionCategory.SYMPTOMS, question: 'Are you experiencing any chest pain, shortness of breath, or palpitations?', priority: QuestionPriority.CRITICAL, reasoning: 'Cardiac symptoms require immediate attention' },
    { category: QuestionCategory.ACTIVITY, question: 'Has your exercise tolerance changed?', priority: QuestionPriority.HIGH, reasoning: 'Exercise tolerance indicates cardiac function' },
    { category: QuestionCategory.MEDICATION, question: 'Are you taking your heart medications as prescribed?', priority: QuestionPriority.HIGH, reasoning: 'Medication adherence is critical for heart health' },
    { category: QuestionCategory.SYMPTOMS, question: 'Have you noticed any swelling in your feet or ankles?', priority: QuestionPriority.HIGH, reasoning: 'Swelling may indicate heart failure' },
    { category: QuestionCategory.LIFESTYLE, question: 'How is your diet and exercise routine?', priority: QuestionPriority.MEDIUM, reasoning: 'Lifestyle affects cardiac health' }
  ],
  [VisitType.DERMATOLOGY]: [
    { category: QuestionCategory.SYMPTOMS, question: 'Can you describe the skin condition you want evaluated?', priority: QuestionPriority.HIGH, reasoning: 'Accurate description helps diagnosis' },
    { category: QuestionCategory.HISTORY, question: 'How long have you had this skin issue?', priority: QuestionPriority.HIGH, reasoning: 'Duration helps determine cause' },
    { category: QuestionCategory.TRIGGERS, question: 'Have you noticed any triggers for this skin condition?', priority: QuestionPriority.MEDIUM, reasoning: 'Triggers help with management' },
    { category: QuestionCategory.TREATMENT, question: 'What treatments have you tried?', priority: QuestionPriority.MEDIUM, reasoning: 'Prior treatments guide next steps' },
    { category: QuestionCategory.HISTORY, question: 'Is there any family history of skin conditions?', priority: QuestionPriority.LOW, reasoning: 'Family history affects risk' }
  ],
  [VisitType.ORTHOPEDICS]: [
    { category: QuestionCategory.PAIN, question: 'Can you describe the location and intensity of your pain?', priority: QuestionPriority.CRITICAL, reasoning: 'Pain characteristics guide diagnosis' },
    { category: QuestionCategory.SYMPTOMS, question: 'Is there any swelling, stiffness, or limited range of motion?', priority: QuestionPriority.HIGH, reasoning: 'Physical symptoms indicate problem severity' },
    { category: QuestionCategory.ACTIVITY, question: 'What activities make the pain worse or better?', priority: QuestionPriority.HIGH, reasoning: 'Activity affects help with management' },
    { category: QuestionCategory.HISTORY, question: 'Have you had any injuries to this area before?', priority: QuestionPriority.MEDIUM, reasoning: 'Prior injuries affect current condition' },
    { category: QuestionCategory.FUNCTION, question: 'How does this affect your daily activities?', priority: QuestionPriority.MEDIUM, reasoning: 'Functional impact guides treatment' }
  ],
  [VisitType.ONCOLOGY]: [
    { category: QuestionCategory.SYMPTOMS, question: 'How have you been feeling since your last treatment?', priority: QuestionPriority.CRITICAL, reasoning: 'Post-treatment monitoring is essential' },
    { category: QuestionCategory.SIDE_EFFECTS, question: 'Are you experiencing any side effects from treatment?', priority: QuestionPriority.HIGH, reasoning: 'Side effects may need management' },
    { category: QuestionCategory.NUTRITION, question: 'How is your appetite and nutrition?', priority: QuestionPriority.HIGH, reasoning: 'Nutrition affects treatment tolerance' },
    { category: QuestionCategory.MENTAL_HEALTH, question: 'How are you coping emotionally?', priority: QuestionPriority.MEDIUM, reasoning: 'Emotional support is important in oncology' },
    { category: QuestionCategory.FOLLOW_UP, question: 'What are the next steps in your treatment plan?', priority: QuestionPriority.HIGH, reasoning: 'Understanding the plan reduces anxiety' }
  ],
  [VisitType.OTHER]: [
    { category: QuestionCategory.SYMPTOMS, question: 'What specific concerns would you like to discuss today?', priority: QuestionPriority.HIGH, reasoning: 'Patient concerns should guide the visit' },
    { category: QuestionCategory.QUESTIONS, question: 'Do you have any questions about your health or treatment?', priority: QuestionPriority.MEDIUM, reasoning: 'Patients should feel free to ask questions' }
  ]
};

// ============================================================================
// SYMPTOM-BASED QUESTIONS
// ============================================================================

const SYMPTOM_QUESTIONS: Record<string, { question: string; category: QuestionCategory; priority: QuestionPriority }[]> = {
  pain: [
    { question: 'Where exactly is the pain located?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'How would you rate the pain on a scale of 1-10?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'When did the pain start?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Does the pain radiate to other areas?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'What makes the pain better or worse?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM }
  ],
  fatigue: [
    { question: 'How long have you been feeling fatigued?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Does rest improve your fatigue?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'Is the fatigue affecting your daily activities?', category: QuestionCategory.QUALITY_OF_LIFE, priority: QuestionPriority.MEDIUM },
    { question: 'How is your sleep quality?', category: QuestionCategory.LIFESTYLE, priority: QuestionPriority.MEDIUM }
  ],
  fever: [
    { question: 'How high is your fever?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.CRITICAL },
    { question: 'How long have you had the fever?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Have you noticed any other symptoms with the fever?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Have you taken any fever-reducing medications?', category: QuestionCategory.MEDICATION, priority: QuestionPriority.MEDIUM }
  ],
  cough: [
    { question: 'Is the cough dry or productive (bringing up mucus)?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'How long have you been coughing?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Do you smoke or have exposure to irritants?', category: QuestionCategory.LIFESTYLE, priority: QuestionPriority.MEDIUM },
    { question: 'Is the cough worse at certain times of day?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.LOW }
  ],
  headache: [
    { question: 'Where is the headache located?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'How would you describe the headache (throbbing, pressure, sharp)?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'How long does the headache last?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'Do you have any associated symptoms (nausea, sensitivity to light)?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'Does anything specific trigger the headaches?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM }
  ],
  nausea: [
    { question: 'Are you experiencing vomiting as well?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Is the nausea related to meals?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'Have you eaten anything unusual recently?', category: QuestionCategory.LIFESTYLE, priority: QuestionPriority.LOW },
    { question: 'Are you taking any new medications?', category: QuestionCategory.MEDICATION, priority: QuestionPriority.MEDIUM }
  ],
  dizziness: [
    { question: 'Do you feel like the room is spinning or like you might faint?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.HIGH },
    { question: 'Does changing position make it worse?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.MEDIUM },
    { question: 'Have you had any recent head injury?', category: QuestionCategory.HISTORY, priority: QuestionPriority.HIGH },
    { question: 'Are you taking any blood pressure medications?', category: QuestionCategory.MEDICATION, priority: QuestionPriority.MEDIUM }
  ],
  breathing: [
    { question: 'Is the breathing difficulty at rest or with activity?', category: QuestionCategory.SYMPTOMS, priority: QuestionPriority.CRITICAL },
    { question: 'Do you have a history of asthma or COPD?', category: QuestionCategory.HISTORY, priority: QuestionPriority.HIGH },
    { question: 'Have you used your rescue inhaler if applicable?', category: QuestionCategory.MEDICATION, priority: QuestionPriority.MEDIUM }
  ]
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class QuestionGeneratorService {
  /**
   * Generate questions for a doctor visit based on context
   */
  async generateQuestions(visitContext: IVisitContext): Promise<IQuestion[]> {
    logger.info('Generating questions for visit', {
      patientId: visitContext.patientId,
      visitType: visitContext.visitType
    });

    try {
      const questions: IQuestion[] = [];

      // Get base questions for visit type
      const baseQuestions = this.getBaseQuestions(visitContext.visitType);
      questions.push(...baseQuestions);

      // Generate symptom-specific questions
      if (visitContext.symptoms && visitContext.symptoms.length > 0) {
        const symptomQuestions = this.generateFromSymptoms(visitContext.symptoms);
        questions.push(...symptomQuestions);
      }

      // Prioritize all questions
      const prioritizedQuestions = this.prioritizeQuestions(questions);

      logger.info('Generated questions successfully', {
        patientId: visitContext.patientId,
        questionCount: prioritizedQuestions.length
      });

      return prioritizedQuestions;
    } catch (error) {
      logger.error('Error generating questions', { error, visitContext });
      throw error;
    }
  }

  /**
   * Get base questions for a visit type
   */
  private getBaseQuestions(visitType: VisitType): IQuestion[] {
    const templates = QUESTION_TEMPLATES[visitType] || QUESTION_TEMPLATES[VisitType.OTHER];

    return templates.map((template, index) => ({
      question: template.question,
      category: template.category,
      priority: template.priority,
      reasoning: template.reasoning,
      context: `Base question for ${visitType} visits`,
      followUpQuestions: [],
      isPersonalized: false,
      expectedAnswerFormat: this.getExpectedAnswerFormat(template.category)
    }));
  }

  /**
   * Get expected answer format based on question category
   */
  private getExpectedAnswerFormat(category: QuestionCategory): string {
    const formats: Record<QuestionCategory, string> = {
      [QuestionCategory.SYMPTOMS]: 'Describe your symptoms in detail including timing, location, and severity',
      [QuestionCategory.MEDICATION]: 'List current medications with dosage and frequency',
      [QuestionCategory.TREATMENT]: 'Discuss treatment options, benefits, and risks',
      [QuestionCategory.DIAGNOSIS]: 'Explain the condition and what tests are needed',
      [QuestionCategory.TEST_RESULTS]: 'Review test results and their implications',
      [QuestionCategory.SIDE_EFFECTS]: 'Describe any side effects experienced',
      [QuestionCategory.LIFESTYLE]: 'Discuss lifestyle factors and their impact',
      [QuestionCategory.FAMILY_HISTORY]: 'Review family medical history',
      [QuestionCategory.PREVENTION]: 'Recommend preventive measures',
      [QuestionCategory.FOLLOW_UP]: 'Schedule follow-up appointments',
      [QuestionCategory.PROCEDURE]: 'Explain procedure details and preparation',
      [QuestionCategory.COST_INSURANCE]: 'Discuss costs and insurance coverage',
      [QuestionCategory.ALTERNATIVE_TREATMENTS]: 'Explore non-traditional options',
      [QuestionCategory.QUALITY_OF_LIFE]: 'Assess impact on daily life',
      [QuestionCategory.OTHER]: 'Provide relevant information'
    };
    return formats[category] || formats[QuestionCategory.OTHER];
  }

  /**
   * Prioritize questions based on importance and relevance
   */
  prioritizeQuestions(questions: IQuestion[]): IQuestion[] {
    const priorityScores: Record<QuestionPriority, number> = {
      [QuestionPriority.CRITICAL]: 100,
      [QuestionPriority.HIGH]: 75,
      [QuestionPriority.MEDIUM]: 50,
      [QuestionPriority.LOW]: 25
    };

    return questions.sort((a, b) => {
      const scoreDiff = priorityScores[b.priority] - priorityScores[a.priority];
      if (scoreDiff !== 0) return scoreDiff;
      return a.category.localeCompare(b.category);
    });
  }

  /**
   * Personalize questions for a specific patient
   */
  async personalizeQuestions(patientId: string, visitType: VisitType): Promise<IQuestion[]> {
    logger.info('Personalizing questions for patient', { patientId, visitType });

    try {
      // Fetch patient-specific data
      const patientData = await this.fetchPatientData(patientId);

      const questions: IQuestion[] = [];

      // Add personalized questions based on conditions
      if (patientData.conditions.length > 0) {
        const conditionQuestions = this.generateFromConditions(patientData.conditions);
        questions.push(...conditionQuestions);
      }

      // Add medication-specific questions
      if (patientData.medications.length > 0) {
        const medicationQuestions = this.generateFromMedications(patientData.medications);
        questions.push(...medicationQuestions);
      }

      // Add questions based on age and demographics
      if (patientData.age) {
        const ageQuestions = this.generateFromAge(patientData.age);
        questions.push(...ageQuestions);
      }

      // Prioritize personalized questions
      return this.prioritizeQuestions(questions);
    } catch (error) {
      logger.error('Error personalizing questions', { error, patientId });
      throw error;
    }
  }

  /**
   * Generate questions based on symptoms
   */
  generateFromSymptoms(symptoms: ISymptom[]): IQuestion[] {
    const questions: IQuestion[] = [];

    for (const symptom of symptoms) {
      const symptomLower = symptom.name.toLowerCase();

      // Find matching symptom templates
      for (const [key, templateQuestions] of Object.entries(SYMPTOM_QUESTIONS)) {
        if (symptomLower.includes(key) || key.includes(symptomLower)) {
          const baseQuestion = templateQuestions[0];
          questions.push({
            question: baseQuestion.question,
            category: baseQuestion.category,
            priority: this.adjustPriorityForSeverity(baseQuestion.priority, symptom.severity),
            reasoning: `Generated based on reported symptom: ${symptom.name}`,
            basedOnSymptom: symptom.name,
            isPersonalized: false,
            followUpQuestions: templateQuestions.slice(1).map(q => q.question)
          });
          break;
        }
      }

      // Add duration-specific question
      questions.push({
        question: `You mentioned this ${symptom.name} has lasted ${symptom.durationValue} ${symptom.duration}. How has this affected your daily activities?`,
        category: QuestionCategory.QUALITY_OF_LIFE,
        priority: this.adjustPriorityForSeverity(QuestionPriority.MEDIUM, symptom.severity),
        reasoning: 'Understanding impact helps prioritize treatment',
        basedOnSymptom: symptom.name,
        isPersonalized: false
      });
    }

    return questions;
  }

  /**
   * Adjust question priority based on symptom severity
   */
  private adjustPriorityForSeverity(basePriority: QuestionPriority, severity: number): QuestionPriority {
    if (severity >= 3) return QuestionPriority.CRITICAL;
    if (severity >= 2) return QuestionPriority.HIGH;
    return basePriority;
  }

  /**
   * Generate questions from patient history
   */
  async generateFromHistory(patientId: string, visitType: VisitType): Promise<IQuestion[]> {
    logger.info('Generating questions from history', { patientId, visitType });

    try {
      const questions: IQuestion[] = [];

      // Get patient's medical history
      const MedicalHistory = (await import('../models/preVisit')).MedicalHistory;
      const history = await MedicalHistory.findOne({ patientId });

      if (history) {
        // Questions based on active conditions
        const activeConditions = history.conditions.filter(c => c.status === 'active');
        if (activeConditions.length > 0) {
          questions.push({
            question: `You have ${activeConditions.length} active condition(s). How are these being managed?`,
            category: QuestionCategory.TREATMENT,
            priority: QuestionPriority.HIGH,
            reasoning: 'Active conditions require ongoing management',
            isPersonalized: true
          });
        }

        // Questions based on allergies
        if (history.allergies.length > 0) {
          questions.push({
            question: `With your known allergies (${history.allergies.map(a => a.allergen).join(', ')}), have you noticed any reactions?`,
            category: QuestionCategory.SYMPTOMS,
            priority: QuestionPriority.MEDIUM,
            reasoning: 'Allergy monitoring is important',
            isPersonalized: true
          });
        }

        // Questions based on family history
        if (history.familyHistory.length > 0) {
          questions.push({
            question: 'Has there been any new diagnoses in your family history we should discuss?',
            category: QuestionCategory.FAMILY_HISTORY,
            priority: QuestionPriority.LOW,
            reasoning: 'Family history affects risk assessment',
            isPersonalized: true
          });
        }
      }

      return this.prioritizeQuestions(questions);
    } catch (error) {
      logger.error('Error generating questions from history', { error, patientId });
      throw error;
    }
  }

  /**
   * Generate follow-up questions from previous visit
   */
  async getFollowUpQuestions(previousVisitId: string): Promise<IQuestion[]> {
    logger.info('Generating follow-up questions', { previousVisitId });

    try {
      const VisitSummary = (await import('../models/preVisit')).VisitSummary;
      const previousVisit = await VisitSummary.findOne({ visitId: previousVisitId });

      if (!previousVisit) {
        logger.warn('Previous visit not found', { previousVisitId });
        return [];
      }

      const questions: IQuestion[] = [];

      // Generate questions from unaddressed action items
      const unaddressedItems = previousVisit.actionItems.filter(
        item => item.status !== 'completed'
      );

      for (const item of unaddressedItems) {
        questions.push({
          question: `Follow up on: ${item.task}`,
          category: QuestionCategory.FOLLOW_UP,
          priority: item.priority,
          reasoning: 'Uncompleted action items from previous visit',
          context: `From visit ${previousVisitId}`,
          isPersonalized: true
        });
      }

      // Questions based on previous diagnosis
      for (const diagnosis of previousVisit.keyPoints.diagnosis) {
        questions.push({
          question: `Can you tell me how the ${diagnosis.toLowerCase()} has been since our last visit?`,
          category: QuestionCategory.SYMPTOMS,
          priority: QuestionPriority.HIGH,
          reasoning: 'Monitoring diagnosed conditions is important',
          basedOnCondition: diagnosis,
          isPersonalized: true
        });
      }

      // Questions based on prescribed treatments
      for (const prescription of previousVisit.prescriptions) {
        questions.push({
          question: `How is the ${prescription.medication} working for you? Are you experiencing any side effects?`,
          category: QuestionCategory.SIDE_EFFECTS,
          priority: QuestionPriority.HIGH,
          reasoning: 'Monitoring medication effects is essential',
          context: `Prescribed in previous visit`,
          isPersonalized: true
        });
      }

      // Follow-up from test orders
      if (previousVisit.testOrders.length > 0) {
        questions.push({
          question: 'Have you completed the tests that were ordered at your last visit? What were the results?',
          category: QuestionCategory.TEST_RESULTS,
          priority: QuestionPriority.HIGH,
          reasoning: 'Test results affect treatment decisions',
          isPersonalized: true
        });
      }

      // Follow-up recommendations
      if (previousVisit.followUp.recommended) {
        questions.push({
          question: `Let's discuss the follow-up plan: ${previousVisit.followUp.purpose || 'Review your progress'}`,
          category: QuestionCategory.FOLLOW_UP,
          priority: QuestionPriority.MEDIUM,
          reasoning: previousVisit.followUp.suggestedTimeframe
            ? `Suggested follow-up timeframe: ${previousVisit.followUp.suggestedTimeframe}`
            : 'Follow-up planning is important for continuity of care',
          isPersonalized: true
        });
      }

      return this.prioritizeQuestions(questions);
    } catch (error) {
      logger.error('Error generating follow-up questions', { error, previousVisitId });
      throw error;
    }
  }

  /**
   * Generate questions using AI for more advanced personalization
   */
  async generateWithAI(visitContext: IVisitContext): Promise<IQuestion[]> {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not available, using template-based generation');
      return this.generateQuestions(visitContext);
    }

    try {
      const prompt = this.buildAIPrompt(visitContext);

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a medical assistant helping patients prepare questions for their doctor visits.
            Generate relevant, specific questions based on the patient's situation.
            Prioritize questions by urgency and importance.
            Focus on questions that will help the patient get the most from their visit.
            Return questions in JSON format with: question, category, priority (critical/high/medium/low), and reasoning.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const parsed = JSON.parse(content);
      const questions: IQuestion[] = parsed.questions || parsed;

      return this.prioritizeQuestions(Array.isArray(questions) ? questions : [questions]);
    } catch (error) {
      logger.error('Error generating questions with AI', { error });
      // Fall back to template-based generation
      return this.generateQuestions(visitContext);
    }
  }

  /**
   * Build AI prompt for question generation
   */
  private buildAIPrompt(visitContext: IVisitContext): string {
    return `
    Generate questions for a doctor visit with the following context:

    Patient ID: ${visitContext.patientId}
    Visit Type: ${visitContext.visitType}
    ${visitContext.chiefComplaint ? `Chief Complaint: ${visitContext.chiefComplaint}` : ''}
    ${visitContext.specialty ? `Specialty: ${visitContext.specialty}` : ''}
    ${visitContext.conditions?.length ? `Active Conditions: ${visitContext.conditions.join(', ')}` : ''}
    ${visitContext.symptoms?.length ? `Current Symptoms: ${visitContext.symptoms.map(s => `${s.name} (${s.severity}/4)`).join(', ')}` : ''}
    ${visitContext.isFollowUp ? 'This is a follow-up visit' : 'This is a new visit'}
    ${visitContext.additionalNotes ? `Additional Notes: ${visitContext.additionalNotes}` : ''}

    Generate 5-10 specific, actionable questions that would be most helpful for this patient to ask their doctor.
    Consider the visit type, symptoms, conditions, and patient's history.
    `;
  }

  /**
   * Fetch patient-specific data
   */
  private async fetchPatientData(patientId: string): Promise<{
    conditions: string[];
    medications: { name: string; dosage: string }[];
    age?: number;
  }> {
    const MedicalHistory = (await import('../models/preVisit')).MedicalHistory;
    const MedicationList = (await import('../models/preVisit')).MedicationList;

    const [history, medications] = await Promise.all([
      MedicalHistory.findOne({ patientId }),
      MedicationList.findOne({ patientId })
    ]);

    return {
      conditions: history?.conditions.map(c => c.name) || [],
      medications: medications?.medications.map(m => ({ name: m.name, dosage: m.dosage })) || [],
      age: undefined // Would come from patient profile
    };
  }

  /**
   * Generate questions from conditions
   */
  private generateFromConditions(conditions: string[]): IQuestion[] {
    const questions: IQuestion[] = [];

    for (const condition of conditions) {
      questions.push({
        question: `How is your ${condition} being managed currently?`,
        category: QuestionCategory.TREATMENT,
        priority: QuestionPriority.HIGH,
        reasoning: `Active condition that requires monitoring`,
        basedOnCondition: condition,
        isPersonalized: true
      });
    }

    return questions;
  }

  /**
   * Generate questions from medications
   */
  private generateFromMedications(medications: { name: string; dosage: string }[]): IQuestion[] {
    const questions: IQuestion[] = [];

    questions.push({
      question: `You are taking ${medications.length} medication(s). Are you experiencing any issues with them?`,
      category: QuestionCategory.MEDICATION,
      priority: QuestionPriority.MEDIUM,
      reasoning: 'Medication review is important for safety and efficacy',
      isPersonalized: true
    });

    return questions;
  }

  /**
   * Generate questions based on age
   */
  private generateFromAge(age: number): IQuestion[] {
    const questions: IQuestion[] = [];

    if (age >= 50) {
      questions.push({
        question: 'Are you up to date on recommended cancer screenings for your age?',
        category: QuestionCategory.PREVENTION,
        priority: QuestionPriority.MEDIUM,
        reasoning: 'Age-appropriate screenings are important for early detection',
        isPersonalized: true
      });
    }

    if (age >= 65) {
      questions.push({
        question: 'Have you discussed vaccination status, including shingles and pneumonia vaccines?',
        category: QuestionCategory.PREVENTION,
        priority: QuestionPriority.MEDIUM,
        reasoning: 'Older adults need additional vaccinations',
        isPersonalized: true
      });
    }

    return questions;
  }

  /**
   * Save generated questions to database
   */
  async saveQuestions(
    visitId: string,
    patientId: string,
    questions: IQuestion[],
    visitType: VisitType
  ): Promise<IPreVisitQuestionDocument> {
    const priorities = questions.map((q, index) => ({
      questionId: `q_${index}`,
      priority: q.priority,
      score: this.calculatePriorityScore(q.priority)
    }));

    const preVisitQuestion = new PreVisitQuestion({
      visitId,
      patientId,
      questions,
      priorities,
      personalizedFor: {
        patientId,
        visitType,
        generatedAt: new Date()
      }
    });

    return preVisitQuestion.save();
  }

  /**
   * Calculate priority score for sorting
   */
  private calculatePriorityScore(priority: QuestionPriority): number {
    const scores: Record<QuestionPriority, number> = {
      [QuestionPriority.CRITICAL]: 100,
      [QuestionPriority.HIGH]: 75,
      [QuestionPriority.MEDIUM]: 50,
      [QuestionPriority.LOW]: 25
    };
    return scores[priority];
  }

  /**
   * Get questions for a specific visit
   */
  async getQuestionsForVisit(visitId: string): Promise<IPreVisitQuestionDocument | null> {
    return PreVisitQuestion.findOne({ visitId });
  }

  /**
   * Update question with answer
   */
  async updateQuestionAnswer(
    visitId: string,
    questionIndex: number,
    answer: string
  ): Promise<void> {
    await PreVisitQuestion.updateOne(
      { visitId },
      {
        $set: {
          [`questions.${questionIndex}.answer`]: answer,
          [`questions.${questionIndex}.isAnswered`]: true
        }
      }
    );
  }
}

// Export singleton instance
export const questionGeneratorService = new QuestionGeneratorService();
