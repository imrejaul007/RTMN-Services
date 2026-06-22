import {
  ITask,
  IVisitContext,
  TaskCategory,
  TaskStatus,
  QuestionPriority,
  VisitType,
  VisitPreparation,
  PreparationTask,
  IVisitPreparationDocument,
  IPreparationTaskDocument,
  IVisitPreparation
} from '../models/preVisit';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { questionGeneratorService } from './questionGeneratorService';
import { symptomAnalyzerService } from './symptomAnalyzerService';
import { historyService } from './historyService';
import { vitalsService } from './vitalsService';

// ============================================================================
// CHECKLIST TEMPLATES BY VISIT TYPE
// ============================================================================

const CHECKLIST_TEMPLATES: Record<VisitType, {
  category: TaskCategory;
  title: string;
  description: string;
  priority: QuestionPriority;
  estimatedTime: number;
  instructions: string;
  resources?: string[];
}[]> = {
  [VisitType.GENERAL_CHECKUP]: [
    { category: TaskCategory.DOCUMENTS, title: 'Bring ID and insurance card', description: 'Valid photo ID and insurance card', priority: QuestionPriority.HIGH, estimatedTime: 5, instructions: 'Check that your insurance is still active and you know your policy number' },
    { category: TaskCategory.DOCUMENTS, title: 'Gather previous test results', description: 'Any recent lab work or imaging results', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Request records from other providers if needed' },
    { category: TaskCategory.MEDICATIONS, title: 'List current medications', description: 'Complete list including over-the-counter meds', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Include dosage and frequency for each medication' },
    { category: TaskCategory.SYMPTOMS, title: 'Note any symptoms', description: 'Write down any new or worsening symptoms', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Include duration, severity, and any triggers' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare questions for doctor', description: 'List of questions to ask during visit', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Prioritize your most important questions' },
    { category: TaskCategory.VITALS, title: 'Check weight at home', description: 'Record current weight if possible', priority: QuestionPriority.LOW, estimatedTime: 2, instructions: 'Use same scale at same time of day as previous measurements' }
  ],
  [VisitType.FOLLOW_UP]: [
    { category: TaskCategory.DOCUMENTS, title: 'Bring previous visit summary', description: 'Notes from your last visit', priority: QuestionPriority.HIGH, estimatedTime: 5, instructions: 'Review what was discussed and any action items' },
    { category: TaskCategory.MEDICATIONS, title: 'Review medication changes', description: 'Note any changes since last visit', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Include any new medications or stopped medications' },
    { category: TaskCategory.SYMPTOMS, title: 'Track symptom changes', description: 'How have symptoms changed since last visit?', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Use a symptom tracker to document frequency and severity' },
    { category: TaskCategory.TESTS, title: 'Complete pending tests', description: 'Any tests ordered at last visit', priority: QuestionPriority.HIGH, estimatedTime: 60, instructions: 'Schedule and complete any ordered lab work or imaging' },
    { category: TaskCategory.QUESTIONS, title: 'Review action items from last visit', description: 'Check off completed tasks', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Bring list of completed and pending items' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare follow-up questions', description: 'Questions about treatment progress', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Ask about expected timeline for improvement' }
  ],
  [VisitType.NEW_CONDITION]: [
    { category: TaskCategory.DOCUMENTS, title: 'Document symptom history', description: 'When symptoms started and how they progressed', priority: QuestionPriority.CRITICAL, estimatedTime: 20, instructions: 'Include timeline, triggers, and what makes it better or worse' },
    { category: TaskCategory.DOCUMENTS, title: 'Gather relevant medical records', description: 'Previous related visits and tests', priority: QuestionPriority.HIGH, estimatedTime: 30, instructions: 'Request records from other healthcare providers' },
    { category: TaskCategory.MEDICATIONS, title: 'List all current medications', description: 'Including supplements and OTC drugs', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Some medications can cause or affect symptoms' },
    { category: TaskCategory.SYMPTOMS, title: 'Prepare detailed symptom description', description: 'Be ready to describe symptoms precisely', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Use the OLDCARTS format: Onset, Location, Duration, Character, Aggravating, Relieving, Timing, Severity' },
    { category: TaskCategory.QUESTIONS, title: 'Research your condition', description: 'Basic information about potential causes', priority: QuestionPriority.MEDIUM, estimatedTime: 30, instructions: 'Bring educated questions but be open to the doctor assessment' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare questions about diagnosis', description: 'Understanding your condition', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Ask what tests will confirm the diagnosis' },
    { category: TaskCategory.LOGISTICS, title: 'Plan for potential tests', description: 'May need blood work or imaging', priority: QuestionPriority.MEDIUM, estimatedTime: 5, instructions: 'Fast if blood work is likely; wear comfortable clothes' }
  ],
  [VisitType.CHRONIC_CARE]: [
    { category: TaskCategory.DOCUMENTS, title: 'Track symptoms for 1-2 weeks', description: 'Daily symptom diary before visit', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Record symptoms, triggers, and impact on daily life' },
    { category: TaskCategory.TESTS, title: 'Complete routine monitoring tests', description: 'Scheduled labs and screenings', priority: QuestionPriority.HIGH, estimatedTime: 60, instructions: 'Stay on schedule with recommended monitoring' },
    { category: TaskCategory.MEDICATIONS, title: 'Medication reconciliation', description: 'Review all current medications with pharmacist', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Identify any issues with taking medications as prescribed' },
    { category: TaskCategory.SYMPTOMS, title: 'Note any complications', description: 'Watch for signs of worsening', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Know the warning signs that require urgent care' },
    { category: TaskCategory.LIFESTYLE, title: 'Review lifestyle factors', description: 'Diet, exercise, sleep, stress', priority: QuestionPriority.MEDIUM, estimatedTime: 20, instructions: 'Be ready to discuss what is working and what is not' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare questions about long-term management', description: 'Treatment goals and expectations', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Discuss quality of life goals with your doctor' }
  ],
  [VisitType.SPECIALIST_REFERRAL]: [
    { category: TaskCategory.DOCUMENTS, title: 'Gather referral letter', description: 'From your primary care doctor', priority: QuestionPriority.HIGH, estimatedTime: 5, instructions: 'Ensure referral includes relevant information' },
    { category: TaskCategory.DOCUMENTS, title: 'Compile medical history', description: 'Complete relevant medical records', priority: QuestionPriority.HIGH, estimatedTime: 30, instructions: 'Include diagnoses, treatments, and test results' },
    { category: TaskCategory.TESTS, title: 'Bring imaging/records', description: 'CDs or reports from previous imaging', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Request copies of any relevant imaging studies' },
    { category: TaskCategory.MEDICATIONS, title: 'Medication list for specialist', description: 'Full list including why you take each', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Specialists often adjust medications - full list helps coordination' },
    { category: TaskCategory.QUESTIONS, title: 'Research the specialist', description: 'Understand their area of expertise', priority: QuestionPriority.LOW, estimatedTime: 15, instructions: 'Know what conditions they specialize in' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare specific questions', description: 'Questions for the specialist', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Specialists can go deep - have specific questions ready' }
  ],
  [VisitType.URGENT_CARE]: [
    { category: TaskCategory.DOCUMENTS, title: 'Bring ID and insurance', description: 'Photo ID and insurance card', priority: QuestionPriority.HIGH, estimatedTime: 2, instructions: 'Urgent care may need verification' },
    { category: TaskCategory.MEDICATIONS, title: 'List current medications', description: 'Critical for safe treatment', priority: QuestionPriority.HIGH, estimatedTime: 5, instructions: 'Include any supplements or OTC meds' },
    { category: TaskCategory.ALLERGIES, title: 'Know your allergies', description: 'Medications you are allergic to', priority: QuestionPriority.CRITICAL, estimatedTime: 2, instructions: 'Be very clear about allergy reactions' },
    { category: TaskCategory.SYMPTOMS, title: 'Describe symptoms clearly', description: 'When they started, how severe', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Be specific about timing and severity' }
  ],
  [VisitType.TELEMEDICINE]: [
    { category: TaskCategory.TECHNICAL, title: 'Test your connection', description: 'Internet speed and video quality', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Use a device with stable internet connection' },
    { category: TaskCategory.TECHNICAL, title: 'Prepare your environment', description: 'Quiet, private, well-lit space', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Find a place where you can speak freely' },
    { category: TaskCategory.DOCUMENTS, title: 'Have records ready on screen', description: 'Medications, symptoms, questions', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Have everything visible so you can reference it easily' },
    { category: TaskCategory.SYMPTOMS, title: 'Prepare symptom descriptions', description: 'Be ready to describe clearly', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'The doctor cannot examine you - be thorough in description' },
    { category: TaskCategory.QUESTIONS, title: 'Write down questions', description: 'Have list ready', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Easy to forget things when talking through a screen' },
    { category: TaskCategory.FOLLOWUP, title: 'Know follow-up options', description: 'What to do if this needs in-person visit', priority: QuestionPriority.MEDIUM, estimatedTime: 5, instructions: 'Telemedicine may need to be followed up in person' }
  ],
  [VisitType.ANNUAL_PHYSICAL]: [
    { category: TaskCategory.DOCUMENTS, title: 'Update medical history', description: 'Any changes since last year', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Include new diagnoses, surgeries, medications' },
    { category: TaskCategory.DOCUMENTS, title: 'Review family history', description: 'Any new conditions in family', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Family history affects screening recommendations' },
    { category: TaskCategory.SCREENING, title: 'Schedule recommended screenings', description: 'Age-appropriate cancer screenings', priority: QuestionPriority.HIGH, estimatedTime: 30, instructions: 'Know which screenings are due for your age and risk' },
    { category: TaskCategory.VACCINATION, title: 'Check vaccination status', description: 'Flu, COVID, and other vaccines', priority: QuestionPriority.MEDIUM, estimatedTime: 5, instructions: 'Review what vaccines you are due for' },
    { category: TaskCategory.LIFESTYLE, title: 'Prepare lifestyle discussion', description: 'Diet, exercise, alcohol, smoking', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Be ready to discuss honestly - non-judgmental conversation' },
    { category: TaskCategory.GOALS, title: 'Set health goals', description: 'What you want to achieve this year', priority: QuestionPriority.LOW, estimatedTime: 10, instructions: 'Physicals are a good time to set health goals' }
  ],
  [VisitType.WELLNESS_VISIT]: [
    { category: TaskCategory.LIFESTYLE, title: 'Reflect on wellness areas', description: 'Physical, mental, emotional, social', priority: QuestionPriority.MEDIUM, estimatedTime: 20, instructions: 'Consider which areas you want to focus on' },
    { category: TaskCategory.GOALS, title: 'Identify wellness goals', description: 'Specific, achievable health goals', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Think about what wellness means to you' },
    { category: TaskCategory.PREVENTION, title: 'Review preventive care', description: 'Screenings and vaccinations', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Wellness includes staying current on prevention' },
    { category: TaskCategory.STRESS, title: 'Assess stress levels', description: 'Work, life, mental health', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Be ready to discuss stress and coping' }
  ],
  [VisitType.PREOPERATIVE]: [
    { category: TaskCategory.DOCUMENTS, title: 'Review consent forms', description: 'Understand the procedure', priority: QuestionPriority.HIGH, estimatedTime: 30, instructions: 'Read all paperwork carefully before signing' },
    { category: TaskCategory.MEDICATIONS, title: 'Review medication instructions', description: 'What to stop before surgery', priority: QuestionPriority.CRITICAL, estimatedTime: 20, instructions: 'Blood thinners, supplements, and some meds may need to stop' },
    { category: TaskCategory.ALLERGIES, title: 'Confirm allergy list', description: 'Make sure all allergies are documented', priority: QuestionPriority.CRITICAL, estimatedTime: 5, instructions: 'Especially medication allergies' },
    { category: TaskCategory.TESTS, title: 'Complete pre-op tests', description: 'Labs, EKG, imaging as ordered', priority: QuestionPriority.HIGH, estimatedTime: 60, instructions: 'Schedule and complete all pre-operative testing' },
    { category: TaskCategory.LOGISTICS, title: 'Arrange transportation', description: 'Someone to drive you home', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Anesthesia requires someone to take you home' },
    { category: TaskCategory.LOGISTICS, title: 'Plan post-op care', description: 'Who will help you at home', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Arrange for help with daily activities' },
    { category: TaskCategory.FASTING, title: 'Review fasting instructions', description: 'When to stop eating/drinking', priority: QuestionPriority.CRITICAL, estimatedTime: 5, instructions: 'Follow fasting instructions exactly' }
  ],
  [VisitType.POSTOPERATIVE]: [
    { category: TaskCategory.WOUND, title: 'Review wound care instructions', description: 'How to care for surgical site', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Keep area clean and dry; know signs of infection' },
    { category: TaskCategory.MEDICATIONS, title: 'Get prescriptions filled', description: 'Pain meds and antibiotics', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Fill prescriptions before you need them' },
    { category: TaskCategory.SYMPTOMS, title: 'Know warning signs', description: 'When to call doctor or go to ER', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Fever, increasing pain, drainage, redness - know when to seek care' },
    { category: TaskCategory.ACTIVITY, title: 'Review activity restrictions', description: 'What you can and cannot do', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Lifting, driving, exercise restrictions' },
    { category: TaskCategory.FOLLOWUP, title: 'Schedule follow-up appointment', description: 'Post-op check with surgeon', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Know when your follow-up is scheduled' }
  ],
  [VisitType.PEDIATRIC]: [
    { category: TaskCategory.DOCUMENTS, title: 'Bring vaccination records', description: 'School/daycare may need updates', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Request records if needed from school or previous providers' },
    { category: TaskCategory.GROWTH, title: 'Track growth at home', description: 'Height and weight since last visit', priority: QuestionPriority.MEDIUM, estimatedTime: 5, instructions: 'Note any concerns about growth patterns' },
    { category: TaskCategory.DEVELOPMENT, title: 'Note developmental milestones', description: 'Age-appropriate skills', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Know what milestones are expected for age' },
    { category: TaskCategory.SYMPTOMS, title: 'Prepare child for visit', description: 'Explain what will happen', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Help reduce anxiety about doctor visit' },
    { category: TaskCategory.QUESTIONS, title: 'Write questions about child', description: 'Specific concerns about child health', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Include behavior, sleep, eating concerns' }
  ],
  [VisitType.MENTAL_HEALTH]: [
    { category: TaskCategory.SYMPTOMS, title: 'Track mood patterns', description: 'How have you been feeling?', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Track mood, sleep, appetite, energy levels' },
    { category: TaskCategory.SAFETY, title: 'Complete safety assessment', description: 'Review any safety concerns', priority: QuestionPriority.CRITICAL, estimatedTime: 10, instructions: 'Be honest about any thoughts of harm' },
    { category: TaskCategory.MEDICATIONS, title: 'Review medication effects', description: 'How are current meds working?', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Track any side effects or changes' },
    { category: TaskCategory.THERAPY, title: 'Prepare therapy updates', description: 'What has therapy been like?', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Note what is working and what is not' },
    { category: TaskCategory.GOALS, title: 'Set mental health goals', description: 'What do you want to work on?', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Work with provider on realistic goals' }
  ],
  [VisitType.DENTAL]: [
    { category: TaskCategory.QUESTIONS, title: 'Note dental concerns', description: 'Pain, sensitivity, cosmetic concerns', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Make list of what you want to discuss' },
    { category: TaskCategory.HYGIENE, title: 'Review oral hygiene routine', description: 'Brushing, flossing, mouthwash', priority: QuestionPriority.MEDIUM, estimatedTime: 5, instructions: 'Be ready to discuss your routine honestly' },
    { category: TaskCategory.HISTORY, title: 'Note dental history', description: 'Previous procedures, issues', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Previous dental work affects current care' },
    { category: TaskCategory.INSURANCE, title: 'Check dental insurance', description: 'What is covered', priority: QuestionPriority.LOW, estimatedTime: 10, instructions: 'Know your coverage for procedures' }
  ],
  [VisitType.OPHTHALMOLOGY]: [
    { category: TaskCategory.VISION, title: 'Document vision changes', description: 'Any changes in vision since last visit', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Note when changes started and what is affected' },
    { category: TaskCategory.SYMPTOMS, title: 'Note eye symptoms', description: 'Pain, redness, dryness, floaters', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Be ready to describe symptoms precisely' },
    { category: TaskCategory.MEDICATIONS, title: 'List eye medications', description: 'Eye drops and any related meds', priority: QuestionPriority.HIGH, estimatedTime: 5, instructions: 'Bring all eye medications to visit' },
    { category: TaskCategory.FAMILY, title: 'Review family eye history', description: 'Glaucoma, macular degeneration in family', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Family history affects risk assessment' }
  ],
  [VisitType.CARDIOLOGY]: [
    { category: TaskCategory.SYMPTOMS, title: 'Track cardiac symptoms', description: 'Chest pain, shortness of breath, palpitations', priority: QuestionPriority.CRITICAL, estimatedTime: 20, instructions: 'Record frequency, duration, triggers, and severity' },
    { category: TaskCategory.VITALS, title: 'Monitor blood pressure at home', description: 'Regular BP readings', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Keep log of home readings to share' },
    { category: TaskCategory.ACTIVITY, title: 'Note exercise tolerance', description: 'What you can do without symptoms', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Track activity level and any symptoms with exertion' },
    { category: TaskCategory.TESTS, title: 'Complete cardiac tests', description: 'EKG, stress test, echo as ordered', priority: QuestionPriority.HIGH, estimatedTime: 60, instructions: 'Schedule and complete all cardiac testing' },
    { category: TaskCategory.MEDICATIONS, title: 'Review heart medications', description: 'Blood pressure, cholesterol, blood thinners', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Note any side effects or adherence issues' }
  ],
  [VisitType.DERMATOLOGY]: [
    { category: TaskCategory.SYMPTOMS, title: 'Document skin condition', description: 'Take photos, note changes', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Track size, color, shape changes over time' },
    { category: TaskCategory.HISTORY, title: 'Note triggers', description: 'What makes it better or worse', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Foods, products, activities that affect skin' },
    { category: TaskCategory.TREATMENT, title: 'List treatments tried', description: 'Creams, medications, home remedies', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'What has and has not worked' },
    { category: TaskCategory.FAMILY, title: 'Check family history', description: 'Skin conditions in family', priority: QuestionPriority.LOW, estimatedTime: 5, instructions: 'Some skin conditions are hereditary' }
  ],
  [VisitType.ORTHOPEDICS]: [
    { category: TaskCategory.SYMPTOMS, title: 'Document pain patterns', description: 'Location, severity, what makes it worse', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Use pain scale and note triggers' },
    { category: TaskCategory.ACTIVITY, title: 'Track functional limitations', description: 'What can you no longer do?', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Impact on daily activities and quality of life' },
    { category: TaskCategory.HISTORY, title: 'Review injury history', description: 'Previous injuries to the area', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Past injuries affect current condition' },
    { category: TaskCategory.IMAGING, title: 'Gather imaging results', description: 'X-rays, MRIs, CT scans', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Bring copies of all imaging to visit' }
  ],
  [VisitType.ONCOLOGY]: [
    { category: TaskCategory.SYMPTOMS, title: 'Track treatment side effects', description: 'How treatment is affecting you', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Record all side effects - they can be managed' },
    { category: TaskCategory.NUTRITION, title: 'Monitor nutrition status', description: 'Appetite, weight changes', priority: QuestionPriority.HIGH, estimatedTime: 10, instructions: 'Nutrition supports treatment tolerance' },
    { category: TaskCategory.SUPPORT, title: 'Assess support needs', description: 'Physical, emotional, logistical help', priority: QuestionPriority.MEDIUM, estimatedTime: 15, instructions: 'Know what support you need and have' },
    { category: TaskCategory.QUESTIONS, title: 'Prepare questions about treatment plan', description: 'Next steps, timeline, side effects', priority: QuestionPriority.HIGH, estimatedTime: 20, instructions: 'Write down questions about treatment' },
    { category: TaskCategory.TESTS, title: 'Complete scheduled tests', description: 'Scans, labs as ordered', priority: QuestionPriority.HIGH, estimatedTime: 60, instructions: 'Stay on schedule with all monitoring' }
  ],
  [VisitType.OTHER]: [
    { category: TaskCategory.QUESTIONS, title: 'Prepare your concerns', description: 'Write down what you want to discuss', priority: QuestionPriority.HIGH, estimatedTime: 15, instructions: 'Prioritize your most important concerns' },
    { category: TaskCategory.DOCUMENTS, title: 'Gather relevant records', description: 'Any related medical documents', priority: QuestionPriority.MEDIUM, estimatedTime: 20, instructions: 'Bring anything relevant to your visit' },
    { category: TaskCategory.MEDICATIONS, title: 'List current medications', description: 'Full medication list', priority: QuestionPriority.MEDIUM, estimatedTime: 10, instructions: 'Include all prescriptions and supplements' }
  ]
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class PreparationService {
  /**
   * Create a complete preparation plan for a doctor visit
   */
  async createPreparation(visitId: string, patientId: string): Promise<IVisitPreparationDocument> {
    logger.info('Creating visit preparation', { visitId, patientId });

    try {
      // Check if preparation already exists
      const existingPrep = await VisitPreparation.findOne({ visitId });
      if (existingPrep) {
        logger.info('Preparation already exists, returning existing', { visitId });
        return existingPrep;
      }

      // Gather all necessary data
      const visitContext = await this.gatherVisitContext(patientId, visitId);
      const questions = await questionGeneratorService.generateQuestions(visitContext);
      const checklist = await this.generateChecklist(visitId);
      const medicationsToReview = await this.gatherMedicationsToReview(patientId);
      const relevantHistory = await historyService.gatherRelevantHistory(patientId, visitContext.visitType);
      const vitalsSummary = await vitalsService.prepareVitalsSummary(patientId);
      const symptomSummary = await symptomAnalyzerService.prepareSymptomSummary(patientId);

      // Calculate preparation progress
      const preparationProgress = {
        questionsReviewed: 0,
        questionsTotal: questions.length,
        tasksCompleted: 0,
        tasksTotal: checklist.length,
        documentsPrepared: 0,
        documentsTotal: this.countRequiredDocuments(visitContext.visitType)
      };

      const preparation: IVisitPreparation = {
        visitId,
        patientId,
        visitContext,
        questions,
        checklist,
        medicationsToReview,
        relevantHistory,
        vitalsSummary,
        symptomSummary,
        preparationProgress,
        generatedAt: new Date(),
        lastUpdated: new Date()
      };

      const visitPreparation = new VisitPreparation(preparation);
      await visitPreparation.save();

      // Save individual tasks
      await this.saveTasks(checklist, patientId, visitId);

      logger.info('Visit preparation created successfully', { visitId, questionCount: questions.length, taskCount: checklist.length });

      return visitPreparation;
    } catch (error) {
      logger.error('Error creating visit preparation', { error, visitId, patientId });
      throw error;
    }
  }

  /**
   * Generate checklist for a visit
   */
  async generateChecklist(visitId: string): Promise<ITask[]> {
    logger.info('Generating checklist', { visitId });

    try {
      const prep = await VisitPreparation.findOne({ visitId });
      if (!prep) {
        throw new Error('Visit preparation not found');
      }

      const templates = CHECKLIST_TEMPLATES[prep.visitContext.visitType] || CHECKLIST_TEMPLATES[VisitType.OTHER];
      const baseTasks = templates.map(template => this.createTaskFromTemplate(template));

      // Add dynamic tasks based on patient's specific situation
      const dynamicTasks = await this.generateDynamicTasks(prep);

      return [...baseTasks, ...dynamicTasks];
    } catch (error) {
      logger.error('Error generating checklist', { error, visitId });
      throw error;
    }
  }

  /**
   * Generate task list for a patient
   */
  async generateTaskList(patientId: string, visitType: VisitType): Promise<ITask[]> {
    logger.info('Generating task list', { patientId, visitType });

    try {
      const templates = CHECKLIST_TEMPLATES[visitType] || CHECKLIST_TEMPLATES[VisitType.OTHER];
      return templates.map(template => this.createTaskFromTemplate(template));
    } catch (error) {
      logger.error('Error generating task list', { error, patientId });
      throw error;
    }
  }

  /**
   * Create task from template
   */
  private createTaskFromTemplate(template: typeof CHECKLIST_TEMPLATES[VisitType][0]): ITask {
    return {
      id: uuidv4(),
      title: template.title,
      description: template.description,
      category: template.category,
      status: TaskStatus.PENDING,
      priority: template.priority,
      estimatedTime: template.estimatedTime,
      instructions: template.instructions,
      resources: template.resources,
      reminders: []
    };
  }

  /**
   * Generate dynamic tasks based on patient data
   */
  private async generateDynamicTasks(prep: IVisitPreparationDocument): Promise<ITask[]> {
    const dynamicTasks: ITask[] = [];

    // Add tasks for recent test results
    if (prep.symptomSummary?.newSymptoms?.length) {
      dynamicTasks.push({
        id: uuidv4(),
        title: 'Prepare symptom description for new symptoms',
        description: `Describe: ${prep.symptomSummary.newSymptoms.join(', ')}`,
        category: TaskCategory.SYMPTOMS,
        status: TaskStatus.PENDING,
        priority: QuestionPriority.HIGH,
        estimatedTime: 15,
        instructions: 'Be ready to describe onset, location, duration, and severity for each new symptom'
      });
    }

    // Add tasks for worsening symptoms
    if (prep.symptomSummary?.worseningSymptoms?.length) {
      dynamicTasks.push({
        id: uuidv4(),
        title: 'Track worsening symptoms closely',
        description: `Monitor: ${prep.symptomSummary.worseningSymptoms.join(', ')}`,
        category: TaskCategory.SYMPTOMS,
        status: TaskStatus.PENDING,
        priority: QuestionPriority.CRITICAL,
        estimatedTime: 10,
        instructions: 'Track frequency and severity to report to doctor'
      });
    }

    // Add tasks for medication review
    if (prep.medicationsToReview?.length > 3) {
      dynamicTasks.push({
        id: uuidv4(),
        title: 'Organize medication list by priority',
        description: 'Prepare medications by what you most want to discuss',
        category: TaskCategory.MEDICATIONS,
        status: TaskStatus.PENDING,
        priority: QuestionPriority.MEDIUM,
        estimatedTime: 15,
        instructions: 'Prioritize medications with side effects or concerns'
      });
    }

    // Add tasks for conditions needing monitoring
    for (const condition of prep.relevantHistory.conditions.slice(0, 3)) {
      dynamicTasks.push({
        id: uuidv4(),
        title: `Review ${condition} management`,
        description: `Prepare updates on ${condition}`,
        category: TaskCategory.OTHER,
        status: TaskStatus.PENDING,
        priority: QuestionPriority.MEDIUM,
        estimatedTime: 10,
        instructions: `Note how ${condition} has been affecting you since last visit`
      });
    }

    return dynamicTasks;
  }

  /**
   * Track preparation progress
   */
  async trackPreparationProgress(prepId: string): Promise<{
    questionsReviewed: number;
    questionsTotal: number;
    tasksCompleted: number;
    tasksTotal: number;
    documentsPrepared: number;
    documentsTotal: number;
    overallProgress: number;
  }> {
    const prep = await VisitPreparation.findOne({ visitId: prepId });
    if (!prep) {
      throw new Error('Preparation not found');
    }

    const tasks = await PreparationTask.find({ visitId: prepId });
    const questionsReviewed = prep.questions.filter(q => q.isAnswered).length;
    const tasksCompleted = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;

    const progress = {
      questionsReviewed,
      questionsTotal: prep.questions.length,
      tasksCompleted,
      tasksTotal: tasks.length,
      documentsPrepared: prep.preparationProgress.documentsPrepared,
      documentsTotal: prep.preparationProgress.documentsTotal,
      overallProgress: this.calculateOverallProgress(
        questionsReviewed,
        prep.questions.length,
        tasksCompleted,
        tasks.length,
        prep.preparationProgress.documentsPrepared,
        prep.preparationProgress.documentsTotal
      )
    };

    // Update the preparation document
    await VisitPreparation.updateOne(
      { visitId: prepId },
      {
        $set: {
          'preparationProgress.questionsReviewed': questionsReviewed,
          'preparationProgress.tasksCompleted': tasksCompleted,
          lastUpdated: new Date()
        }
      }
    );

    return progress;
  }

  /**
   * Calculate overall preparation progress
   */
  private calculateOverallProgress(
    questionsReviewed: number,
    questionsTotal: number,
    tasksCompleted: number,
    tasksTotal: number,
    documentsPrepared: number,
    documentsTotal: number
  ): number {
    const weights = {
      questions: 0.25,
      tasks: 0.50,
      documents: 0.25
    };

    const questionsProgress = questionsTotal > 0 ? questionsReviewed / questionsTotal : 1;
    const tasksProgress = tasksTotal > 0 ? tasksCompleted / tasksTotal : 1;
    const documentsProgress = documentsTotal > 0 ? documentsPrepared / documentsTotal : 1;

    return Math.round(
      (questionsProgress * weights.questions +
        tasksProgress * weights.tasks +
        documentsProgress * weights.documents) * 100
    );
  }

  /**
   * Remind about unfinished tasks
   */
  async remindUnfinishedTasks(patientId: string): Promise<{
    tasks: IPreparationTaskDocument[];
    overdueTasks: IPreparationTaskDocument[];
    upcomingTasks: IPreparationTaskDocument[];
  }> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all pending tasks for the patient
    const pendingTasks = await PreparationTask.find({
      patientId,
      status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] }
    }).sort({ priority: 1, dueDate: 1 });

    const overdueTasks = pendingTasks.filter(task =>
      task.dueDate && task.dueDate < now
    );

    const upcomingTasks = pendingTasks.filter(task =>
      task.dueDate &&
      task.dueDate >= now &&
      task.dueDate <= threeDaysFromNow
    );

    return {
      tasks: pendingTasks,
      overdueTasks,
      upcomingTasks
    };
  }

  /**
   * Get checklist for a preparation
   */
  async getChecklist(prepId: string): Promise<{
    preparation: IVisitPreparationDocument;
    tasks: IPreparationTaskDocument[];
    progress: ReturnType<typeof this.trackPreparationProgress> extends Promise<infer T> ? T : never;
  }> {
    const preparation = await VisitPreparation.findOne({ visitId: prepId });
    if (!preparation) {
      throw new Error('Preparation not found');
    }

    const tasks = await PreparationTask.find({ visitId: prepId });
    const progress = await this.trackPreparationProgress(prepId);

    return { preparation, tasks, progress };
  }

  /**
   * Mark task as complete
   */
  async markTaskComplete(taskId: string): Promise<IPreparationTaskDocument> {
    const task = await PreparationTask.findOne({ taskId });
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = TaskStatus.COMPLETED;
    task.completedAt = new Date();
    await task.save();

    // Update preparation progress
    await this.trackPreparationProgress(task.visitId || '');

    logger.info('Task marked complete', { taskId, visitId: task.visitId });

    return task;
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<IPreparationTaskDocument> {
    const task = await PreparationTask.findOne({ taskId });
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = status;
    if (status === TaskStatus.COMPLETED) {
      task.completedAt = new Date();
    }
    await task.save();

    // Update preparation progress
    if (task.visitId) {
      await this.trackPreparationProgress(task.visitId);
    }

    logger.info('Task status updated', { taskId, status });

    return task;
  }

  /**
   * Add reminder to task
   */
  async addTaskReminder(taskId: string, reminderTime: Date): Promise<IPreparationTaskDocument> {
    const task = await PreparationTask.findOne({ taskId });
    if (!task) {
      throw new Error('Task not found');
    }

    task.reminders.push({
      time: reminderTime,
      sent: false
    });
    await task.save();

    logger.info('Reminder added to task', { taskId, reminderTime });

    return task;
  }

  /**
   * Gather visit context from various sources
   */
  private async gatherVisitContext(patientId: string, visitId: string): Promise<IVisitContext> {
    // This would integrate with other services to gather context
    // For now, return a basic context
    return {
      patientId,
      visitType: VisitType.OTHER,
      chiefComplaint: undefined,
      scheduledDate: undefined,
      symptoms: [],
      isFollowUp: false,
      previousVisitId: undefined,
      conditions: [],
      medications: [],
      additionalNotes: undefined
    };
  }

  /**
   * Gather medications that need review
   */
  private async gatherMedicationsToReview(patientId: string) {
    const { MedicationList } = await import('../models/preVisit');
    const medList = await MedicationList.findOne({ patientId });
    return medList?.medications || [];
  }

  /**
   * Count required documents for visit type
   */
  private countRequiredDocuments(visitType: VisitType): number {
    const templates = CHECKLIST_TEMPLATES[visitType] || [];
    return templates.filter(t => t.category === TaskCategory.DOCUMENTS).length;
  }

  /**
   * Save tasks to database
   */
  private async saveTasks(tasks: ITask[], patientId: string, visitId: string): Promise<void> {
    for (const task of tasks) {
      const preparationTask = new PreparationTask({
        ...task,
        patientId,
        visitId,
        reminders: task.reminders || []
      });
      await preparationTask.save();
    }
  }

  /**
   * Get preparation by visit ID
   */
  async getPreparation(visitId: string): Promise<IVisitPreparationDocument | null> {
    return VisitPreparation.findOne({ visitId });
  }

  /**
   * Update preparation
   */
  async updatePreparation(visitId: string, updates: Partial<IVisitPreparation>): Promise<IVisitPreparationDocument | null> {
    return VisitPreparation.findOneAndUpdate(
      { visitId },
      { $set: { ...updates, lastUpdated: new Date() } },
      { new: true }
    );
  }

  /**
   * Get reminders for patient
   */
  async getReminders(patientId: string): Promise<IPreparationTaskDocument[]> {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return PreparationTask.find({
      patientId,
      status: TaskStatus.PENDING,
      'reminders.time': {
        $gte: now,
        $lte: tomorrow
      }
    }).sort({ 'reminders.time': 1 });
  }

  /**
   * Send task reminders (to be called by scheduler)
   */
  async sendTaskReminders(): Promise<number> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const tasksWithPendingReminders = await PreparationTask.find({
      status: TaskStatus.PENDING,
      'reminders.sent': false,
      'reminders.time': {
        $gte: fiveMinutesAgo,
        $lte: now
      }
    });

    let sentCount = 0;
    for (const task of tasksWithPendingReminders) {
      // Mark reminder as sent
      for (const reminder of task.reminders) {
        if (!reminder.sent && reminder.time <= now) {
          reminder.sent = true;
          sentCount++;
          logger.info('Task reminder sent', {
            taskId: task.taskId,
            reminderTime: reminder.time
          });
        }
      }
      await task.save();
    }

    return sentCount;
  }
}

// Export singleton instance
export const preparationService = new PreparationService();
