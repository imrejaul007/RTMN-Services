import {
  IMedicalHistory,
  IMedicalHistoryDocument,
  MedicalHistory,
  VisitType,
  MedicationList,
  MedicationListSchema,
  IMedication,
  VisitSummary,
  IVisitSummaryDocument,
  SymptomLog
} from '../models/preVisit';
import { logger } from '../utils/logger';

// ============================================================================
// VISIT TYPE RELEVANCE WEIGHTS
// ============================================================================

const HISTORY_RELEVANCE: Record<VisitType, {
  conditions: number;
  surgeries: number;
  allergies: number;
  familyHistory: number;
  immunizations: number;
  screenings: number;
}> = {
  [VisitType.GENERAL_CHECKUP]: {
    conditions: 0.8,
    surgeries: 0.5,
    allergies: 0.9,
    familyHistory: 0.7,
    immunizations: 0.8,
    screenings: 0.9
  },
  [VisitType.FOLLOW_UP]: {
    conditions: 1.0,
    surgeries: 0.7,
    allergies: 0.9,
    familyHistory: 0.3,
    immunizations: 0.3,
    screenings: 0.5
  },
  [VisitType.NEW_CONDITION]: {
    conditions: 0.9,
    surgeries: 0.6,
    allergies: 1.0,
    familyHistory: 0.8,
    immunizations: 0.2,
    screenings: 0.4
  },
  [VisitType.CHRONIC_CARE]: {
    conditions: 1.0,
    surgeries: 0.6,
    allergies: 0.9,
    familyHistory: 0.5,
    immunizations: 0.4,
    screenings: 0.8
  },
  [VisitType.SPECIALIST_REFERRAL]: {
    conditions: 1.0,
    surgeries: 0.7,
    allergies: 0.9,
    familyHistory: 0.6,
    immunizations: 0.2,
    screenings: 0.3
  },
  [VisitType.URGENT_CARE]: {
    conditions: 0.7,
    surgeries: 0.5,
    allergies: 1.0,
    familyHistory: 0.3,
    immunizations: 0.1,
    screenings: 0.1
  },
  [VisitType.TELEMEDICINE]: {
    conditions: 0.9,
    surgeries: 0.6,
    allergies: 0.9,
    familyHistory: 0.4,
    immunizations: 0.3,
    screenings: 0.5
  },
  [VisitType.ANNUAL_PHYSICAL]: {
    conditions: 0.8,
    surgeries: 0.5,
    allergies: 0.9,
    familyHistory: 0.9,
    immunizations: 1.0,
    screenings: 1.0
  },
  [VisitType.WELLNESS_VISIT]: {
    conditions: 0.6,
    surgeries: 0.4,
    allergies: 0.7,
    familyHistory: 0.8,
    immunizations: 0.9,
    screenings: 0.9
  },
  [VisitType.PREOPERATIVE]: {
    conditions: 1.0,
    surgeries: 0.9,
    allergies: 1.0,
    familyHistory: 0.5,
    immunizations: 0.8,
    screenings: 0.7
  },
  [VisitType.POSTOPERATIVE]: {
    conditions: 0.9,
    surgeries: 1.0,
    allergies: 0.9,
    familyHistory: 0.4,
    immunizations: 0.3,
    screenings: 0.3
  },
  [VisitType.PEDIATRIC]: {
    conditions: 0.8,
    surgeries: 0.6,
    allergies: 1.0,
    familyHistory: 0.8,
    immunizations: 1.0,
    screenings: 0.7
  },
  [VisitType.MENTAL_HEALTH]: {
    conditions: 0.9,
    surgeries: 0.4,
    allergies: 0.7,
    familyHistory: 0.9,
    immunizations: 0.2,
    screenings: 0.3
  },
  [VisitType.DENTAL]: {
    conditions: 0.6,
    surgeries: 0.5,
    allergies: 1.0,
    familyHistory: 0.4,
    immunizations: 0.2,
    screenings: 0.3
  },
  [VisitType.OPHTHALMOLOGY]: {
    conditions: 0.7,
    surgeries: 0.5,
    allergies: 0.6,
    familyHistory: 0.8,
    immunizations: 0.2,
    screenings: 0.3
  },
  [VisitType.CARDIOLOGY]: {
    conditions: 1.0,
    surgeries: 0.7,
    allergies: 0.9,
    familyHistory: 1.0,
    immunizations: 0.4,
    screenings: 0.9
  },
  [VisitType.DERMATOLOGY]: {
    conditions: 0.8,
    surgeries: 0.4,
    allergies: 0.9,
    familyHistory: 0.8,
    immunizations: 0.2,
    screenings: 0.2
  },
  [VisitType.ORTHOPEDICS]: {
    conditions: 0.9,
    surgeries: 0.8,
    allergies: 0.7,
    familyHistory: 0.7,
    immunizations: 0.2,
    screenings: 0.3
  },
  [VisitType.ONCOLOGY]: {
    conditions: 1.0,
    surgeries: 0.8,
    allergies: 0.9,
    familyHistory: 1.0,
    immunizations: 0.5,
    screenings: 1.0
  },
  [VisitType.OTHER]: {
    conditions: 0.7,
    surgeries: 0.5,
    allergies: 0.8,
    familyHistory: 0.5,
    immunizations: 0.4,
    screenings: 0.5
  }
};

// ============================================================================
// SPECIALTY CONDITION MAPPING
// ============================================================================

const SPECIALTY_CONDITIONS: Record<string, string[]> = {
  cardiology: ['heart disease', 'hypertension', 'arrhythmia', 'heart failure', 'coronary artery disease', 'valve disease', 'cardiomyopathy'],
  neurology: ['headache', 'migraine', 'epilepsy', 'stroke', 'multiple sclerosis', 'parkinson', 'alzheimer', 'neuropathy'],
  orthopedics: ['arthritis', 'fracture', 'osteoporosis', 'back pain', 'joint pain', 'sprain', 'tendonitis'],
  pulmonology: ['asthma', 'copd', 'pneumonia', 'lung disease', 'bronchitis', 'sleep apnea'],
  gastroenterology: ['acid reflux', 'ibs', 'crohn', 'colitis', 'hepatitis', 'gallstones', 'ulcer'],
  endocrinology: ['diabetes', 'thyroid', 'hormone', 'obesity', 'adrenal', 'metabolic'],
  dermatology: ['eczema', 'psoriasis', 'acne', 'rash', 'skin cancer', 'hives', 'dermatitis'],
  ophthalmology: ['glaucoma', 'cataract', 'macular degeneration', 'diabetic retinopathy', 'vision', 'eye'],
  oncology: ['cancer', 'tumor', 'chemotherapy', 'radiation', 'malignancy', 'carcinoma'],
  nephrology: ['kidney disease', 'renal failure', 'dialysis', 'kidney stone'],
  urology: ['prostate', 'bladder', 'urinary', 'kidney stone'],
  rheumatology: ['lupus', 'rheumatoid arthritis', 'fibromyalgia', 'autoimmune'],
  infectious_disease: ['infection', 'hiv', 'hepatitis', 'tuberculosis', 'lyme'],
  psychiatry: ['depression', 'anxiety', 'bipolar', 'schizophrenia', 'adhd', 'mental health'],
  pediatrics: ['child', 'infant', 'pediatric', 'developmental', 'vaccine'],
  general: ['general', 'checkup', 'routine', 'wellness']
};

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class HistoryService {
  /**
   * Gather relevant history for a visit
   */
  async gatherRelevantHistory(
    patientId: string,
    visitType: VisitType,
    specialty?: string
  ): Promise<{
    conditions: string[];
    surgeries: string[];
    allergies: string[];
    familyHistory: string[];
    immunizations: string[];
    recentScreenings: { test: string; date: Date; result: string }[];
    relevantConditions: { name: string; status: string; severity?: string; notes?: string }[];
    notes: string;
  }> {
    logger.info('Gathering relevant history', { patientId, visitType, specialty });

    try {
      const history = await this.getOrCreateHistory(patientId);
      const relevance = HISTORY_RELEVANCE[visitType] || HISTORY_RELEVANCE[VisitType.OTHER];

      // Get medications for additional context
      const medicationList = await MedicationList.findOne({ patientId });
      const currentMedications = medicationList?.medications || [];

      // Filter and sort conditions by relevance
      const conditions = this.filterConditions(history, visitType, specialty, relevance, currentMedications);

      // Filter surgeries by relevance
      const surgeries = this.filterSurgeries(history, relevance);

      // Get allergies (always important)
      const allergies = history.allergies.map(a => ({
        allergen: a.allergen,
        reaction: a.reaction,
        severity: a.severity
      }));

      // Filter family history by relevance
      const familyHistory = this.filterFamilyHistory(history, visitType, specialty, relevance);

      // Get immunizations by relevance
      const immunizations = this.filterImmunizations(history, relevance);

      // Get recent screenings
      const recentScreenings = history.screenings
        .filter(() => Math.random() < relevance.screenings)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(s => ({
          test: s.test,
          date: s.date,
          result: s.result
        }));

      // Generate summary notes
      const notes = this.generateHistorySummary(history, conditions, allergies, visitType);

      return {
        conditions: conditions.map(c => c.name),
        surgeries,
        allergies: allergies.map(a => `${a.allergen} (${a.reaction})`),
        familyHistory,
        immunizations,
        recentScreenings,
        relevantConditions: conditions,
        notes
      };
    } catch (error) {
      logger.error('Error gathering relevant history', { error, patientId });
      throw error;
    }
  }

  /**
   * Summarize past visits
   */
  async summarizePastVisits(
    patientId: string,
    limit: number = 5
  ): Promise<{
    visits: {
      visitId: string;
      visitDate: Date;
      visitType: string;
      keyPoints: string[];
      diagnosis: string[];
      treatments: string[];
      followUpNeeded: boolean;
    }[];
    summary: string;
  }> {
    logger.info('Summarizing past visits', { patientId, limit });

    try {
      const pastVisits = await VisitSummary.find({ patientId })
        .sort({ visitDate: -1 })
        .limit(limit);

      if (pastVisits.length === 0) {
        return {
          visits: [],
          summary: 'No previous visit records found.'
        };
      }

      const visits = pastVisits.map(visit => ({
        visitId: visit.visitId,
        visitDate: visit.visitDate,
        visitType: visit.visitType,
        keyPoints: [
          ...visit.keyPoints.diagnosis,
          ...visit.keyPoints.treatment.slice(0, 2)
        ],
        diagnosis: visit.keyPoints.diagnosis,
        treatments: visit.keyPoints.treatment,
        followUpNeeded: visit.followUp.recommended
      }));

      // Generate summary
      const summary = this.generateVisitSummaryText(visits);

      return { visits, summary };
    } catch (error) {
      logger.error('Error summarizing past visits', { error, patientId });
      throw error;
    }
  }

  /**
   * Get medication changes since last visit
   */
  async getMedicationChanges(patientId: string): Promise<{
    currentMedications: IMedication[];
    newMedications: IMedication[];
    discontinuedMedications: IMedication[];
    dosageChanges: { medication: string; oldDosage: string; newDosage: string }[];
    summary: string;
  }> {
    logger.info('Getting medication changes', { patientId });

    try {
      const medicationList = await MedicationList.findOne({ patientId });

      if (!medicationList) {
        return {
          currentMedications: [],
          newMedications: [],
          discontinuedMedications: [],
          dosageChanges: [],
          summary: 'No medication records found.'
        };
      }

      // Get last visit to compare
      const lastVisit = await VisitSummary.findOne({ patientId })
        .sort({ visitDate: -1 });

      let newMedications: IMedication[] = [];
      let discontinuedMedications: IMedication[] = [];
      let dosageChanges: { medication: string; oldDosage: string; newDosage: string }[] = [];

      if (lastVisit) {
        // For now, use the tracked new/discontinued medications
        newMedications = medicationList.newMedicationsStarted.map(name => ({
          name,
          dosage: '',
          frequency: ''
        })) as IMedication[];

        discontinuedMedications = medicationList.discontinuedMedications.map(name => ({
          name,
          dosage: '',
          frequency: ''
        })) as IMedication[];
      }

      // Generate summary
      let summary = `You are currently taking ${medicationList.medications.length} medication(s).`;

      if (newMedications.length > 0) {
        summary += ` ${newMedications.length} new medication(s) started: ${newMedications.map(m => m.name).join(', ')}.`;
      }

      if (discontinuedMedications.length > 0) {
        summary += ` ${discontinuedMedications.length} medication(s) stopped: ${discontinuedMedications.map(m => m.name).join(', ')}.`;
      }

      if (dosageChanges.length > 0) {
        summary += ` ${dosageChanges.length} dosage change(s): ${dosageChanges.map(c => `${c.medication} (${c.oldDosage} -> ${c.newDosage})`).join(', ')}.`;
      }

      return {
        currentMedications: medicationList.medications,
        newMedications,
        discontinuedMedications,
        dosageChanges,
        summary
      };
    } catch (error) {
      logger.error('Error getting medication changes', { error, patientId });
      throw error;
    }
  }

  /**
   * Get test results since a date
   */
  async getTestResults(
    patientId: string,
    since?: Date
  ): Promise<{
    testResults: {
      test: string;
      date: Date;
      result: string;
      nextDue?: Date;
    }[];
    pendingTests: string[];
    summary: string;
  }> {
    logger.info('Getting test results', { patientId, since });

    try {
      const history = await this.getOrCreateHistory(patientId);

      // Filter screenings since the date
      const sinceDate = since || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default: last year

      const testResults = history.screenings
        .filter(s => new Date(s.date) >= sinceDate)
        .map(s => ({
          test: s.test,
          date: s.date,
          result: s.result,
          nextDue: s.nextDueDate
        }));

      // Find pending tests (next due date in past)
      const pendingTests = history.screenings
        .filter(s => s.nextDueDate && new Date(s.nextDueDate) < new Date())
        .map(s => s.test);

      // Generate summary
      let summary = `${testResults.length} test result(s) found since ${sinceDate.toLocaleDateString()}.`;

      if (pendingTests.length > 0) {
        summary += ` ${pendingTests.length} test(s) may be overdue: ${pendingTests.join(', ')}.`;
      }

      return { testResults, pendingTests, summary };
    } catch (error) {
      logger.error('Error getting test results', { error, patientId });
      throw error;
    }
  }

  /**
   * Prepare formatted history for doctor
   */
  async prepareHistoryForDoctor(
    patientId: string,
    visitType: VisitType,
    specialty?: string
  ): Promise<{
    formattedHistory: {
      section: string;
      content: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }[];
    quickReference: {
      allergies: string[];
      currentMedications: string[];
      activeConditions: string[];
      recentSurgery?: string;
    };
    talkingPoints: string[];
    concerns: string[];
  }> {
    logger.info('Preparing history for doctor', { patientId, visitType, specialty });

    try {
      const relevantHistory = await this.gatherRelevantHistory(patientId, visitType, specialty);
      const medicationChanges = await this.getMedicationChanges(patientId);
      const pastVisits = await this.summarizePastVisits(patientId, 3);

      const formattedHistory: {
        section: string;
        content: string;
        priority: 'critical' | 'high' | 'medium' | 'low';
      }[] = [];

      // Allergies - always critical
      if (relevantHistory.allergies.length > 0) {
        formattedHistory.push({
          section: 'ALLERGIES',
          content: relevantHistory.allergies.join('; '),
          priority: 'critical'
        });
      }

      // Current medications
      if (medicationChanges.currentMedications.length > 0) {
        const medList = medicationChanges.currentMedications
          .map(m => `${m.name} ${m.dosage} ${m.frequency}`)
          .join(', ');
        formattedHistory.push({
          section: 'CURRENT MEDICATIONS',
          content: medList,
          priority: 'high'
        });
      }

      // Active conditions
      if (relevantHistory.relevantConditions.length > 0) {
        const activeConditions = relevantHistory.relevantConditions
          .filter(c => c.status === 'active' || c.status === 'managed')
          .map(c => `${c.name} (${c.status})${c.notes ? `: ${c.notes}` : ''}`)
          .join('; ');
        formattedHistory.push({
          section: 'ACTIVE CONDITIONS',
          content: activeConditions,
          priority: 'high'
        });
      }

      // Past surgeries
      if (relevantHistory.surgeries.length > 0) {
        formattedHistory.push({
          section: 'PAST SURGERIES',
          content: relevantHistory.surgeries.join('; '),
          priority: 'medium'
        });
      }

      // Family history
      if (relevantHistory.familyHistory.length > 0) {
        formattedHistory.push({
          section: 'FAMILY HISTORY',
          content: relevantHistory.familyHistory.join('; '),
          priority: 'medium'
        });
      }

      // Immunizations
      if (relevantHistory.immunizations.length > 0) {
        formattedHistory.push({
          section: 'RECENT IMMUNIZATIONS',
          content: relevantHistory.immunizations.join(', '),
          priority: 'low'
        });
      }

      // Recent screenings
      if (relevantHistory.recentScreenings.length > 0) {
        const screeningList = relevantHistory.recentScreenings
          .map(s => `${s.test} (${new Date(s.date).toLocaleDateString()}): ${s.result}`)
          .join('; ');
        formattedHistory.push({
          section: 'RECENT TEST RESULTS',
          content: screeningList,
          priority: 'medium'
        });
      }

      // Quick reference
      const quickReference = {
        allergies: relevantHistory.allergies,
        currentMedications: medicationChanges.currentMedications.map(m => `${m.name} ${m.dosage}`),
        activeConditions: relevantHistory.relevantConditions
          .filter(c => c.status === 'active' || c.status === 'managed')
          .map(c => c.name),
        recentSurgery: relevantHistory.surgeries[0]
      };

      // Generate talking points
      const talkingPoints: string[] = [];

      if (medicationChanges.newMedications.length > 0) {
        talkingPoints.push(`Started new medication(s): ${medicationChanges.newMedications.map(m => m.name).join(', ')}`);
      }

      if (medicationChanges.discontinuedMedications.length > 0) {
        talkingPoints.push(`Stopped medication(s): ${medicationChanges.discontinuedMedications.map(m => m.name).join(', ')}`);
      }

      if (relevantHistory.relevantConditions.some(c => c.status === 'active')) {
        const activeConditions = relevantHistory.relevantConditions
          .filter(c => c.status === 'active')
          .map(c => c.name);
        talkingPoints.push(`Currently managing active condition(s): ${activeConditions.join(', ')}`);
      }

      if (pastVisits.visits.length > 0) {
        const lastVisit = pastVisits.visits[0];
        if (lastVisit.diagnosis.length > 0) {
          talkingPoints.push(`Previous diagnosis from ${new Date(lastVisit.visitDate).toLocaleDateString()}: ${lastVisit.diagnosis.join(', ')}`);
        }
      }

      // Identify concerns
      const concerns: string[] = [];

      if (relevantHistory.allergies.some(a => a.toLowerCase().includes('severe') || a.toLowerCase().includes('life-threatening'))) {
        concerns.push('Severe allergy history - verify before treatment');
      }

      if (medicationChanges.discontinuedMedications.length > 0) {
        concerns.push('Recent medication changes - verify current regimen');
      }

      const overdueScreenings = (await this.getTestResults(patientId)).pendingTests;
      if (overdueScreenings.length > 0) {
        concerns.push(`${overdueScreenings.length} screening(s) may be overdue`);
      }

      return {
        formattedHistory,
        quickReference,
        talkingPoints,
        concerns
      };
    } catch (error) {
      logger.error('Error preparing history for doctor', { error, patientId });
      throw error;
    }
  }

  /**
   * Get or create patient history
   */
  async getOrCreateHistory(patientId: string): Promise<IMedicalHistoryDocument> {
    let history = await MedicalHistory.findOne({ patientId });

    if (!history) {
      history = new MedicalHistory({
        patientId,
        conditions: [],
        surgeries: [],
        allergies: [],
        familyHistory: [],
        immunizations: [],
        screenings: [],
        lastUpdated: new Date()
      });
      await history.save();
    }

    return history;
  }

  /**
   * Update patient history
   */
  async updateHistory(
    patientId: string,
    updates: Partial<IMedicalHistory>
  ): Promise<IMedicalHistoryDocument> {
    const history = await this.getOrCreateHistory(patientId);

    if (updates.conditions) {
      history.conditions = updates.conditions;
    }
    if (updates.surgeries) {
      history.surgeries = updates.surgeries;
    }
    if (updates.allergies) {
      history.allergies = updates.allergies;
    }
    if (updates.familyHistory) {
      history.familyHistory = updates.familyHistory;
    }
    if (updates.immunizations) {
      history.immunizations = updates.immunizations;
    }
    if (updates.screenings) {
      history.screenings = updates.screenings;
    }

    history.lastUpdated = new Date();
    await history.save();

    logger.info('Patient history updated', { patientId });

    return history;
  }

  /**
   * Filter conditions by relevance
   */
  private filterConditions(
    history: IMedicalHistoryDocument,
    visitType: VisitType,
    specialty: string | undefined,
    relevance: ReturnType<typeof HISTORY_RELEVANCE[keyof typeof HISTORY_RELEVANCE]>,
    currentMedications: IMedication[]
  ): { name: string; status: string; severity?: string; notes?: string }[] {
    let conditions = [...history.conditions];

    // Filter by specialty relevance
    if (specialty) {
      const specialtyConditions = SPECIALTY_CONDITIONS[specialty.toLowerCase()] || [];
      conditions = conditions.map(c => ({
        ...c,
        relevanceScore: specialtyConditions.some(sc =>
          c.name.toLowerCase().includes(sc.toLowerCase())
        ) ? 1.5 : 1
      })).filter(c => (c as typeof c & { relevanceScore: number }).relevanceScore > 0);
    }

    // Filter by visit type relevance
    conditions = conditions.filter(() => Math.random() < relevance.conditions);

    // Prioritize active and managed conditions
    conditions.sort((a, b) => {
      const statusOrder = { active: 0, managed: 1, resolved: 2 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 2) -
        (statusOrder[b.status as keyof typeof statusOrder] || 2);
      if (statusDiff !== 0) return statusDiff;
      return 0;
    });

    return conditions.slice(0, 15).map(c => ({
      name: c.name,
      status: c.status,
      severity: c.severity,
      notes: c.notes
    }));
  }

  /**
   * Filter surgeries by relevance
   */
  private filterSurgeries(
    history: IMedicalHistoryDocument,
    relevance: ReturnType<typeof HISTORY_RELEVANCE[keyof typeof HISTORY_RELEVANCE]>
  ): string[] {
    return history.surgeries
      .filter(() => Math.random() < relevance.surgeries)
      .map(s => `${s.procedure} (${new Date(s.date).getFullYear()})`)
      .slice(0, 5);
  }

  /**
   * Filter family history by relevance
   */
  private filterFamilyHistory(
    history: IMedicalHistoryDocument,
    visitType: VisitType,
    specialty: string | undefined,
    relevance: ReturnType<typeof HISTORY_RELEVANCE[keyof typeof HISTORY_RELEVANCE]>
  ): string[] {
    let familyHistory = history.familyHistory;

    // Filter by specialty relevance
    if (specialty) {
      const specialtyConditions = SPECIALTY_CONDITIONS[specialty.toLowerCase()] || [];
      familyHistory = familyHistory.filter(fh =>
        specialtyConditions.some(sc =>
          fh.condition.toLowerCase().includes(sc.toLowerCase())
        )
      );
    }

    // Filter by visit type relevance
    familyHistory = familyHistory.filter(() => Math.random() < relevance.familyHistory);

    return familyHistory
      .map(fh => `${fh.condition} (${fh.relation}${fh.ageOfOnset ? `, onset: ${fh.ageOfOnset}` : ''})`)
      .slice(0, 10);
  }

  /**
   * Filter immunizations by relevance
   */
  private filterImmunizations(
    history: IMedicalHistoryDocument,
    relevance: ReturnType<typeof HISTORY_RELEVANCE[keyof typeof HISTORY_RELEVANCE]>
  ): string[] {
    // Always include recent immunizations
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentImmunizations = history.immunizations.filter(i =>
      new Date(i.date) >= oneYearAgo
    );

    if (recentImmunizations.length > 0) {
      return recentImmunizations.map(i => `${i.vaccine} (${new Date(i.date).toLocaleDateString()})`);
    }

    // Otherwise, sample based on relevance
    return history.immunizations
      .filter(() => Math.random() < relevance.immunizations)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(i => `${i.vaccine} (${new Date(i.date).toLocaleDateString()})`);
  }

  /**
   * Generate history summary text
   */
  private generateHistorySummary(
    history: IMedicalHistoryDocument,
    conditions: { name: string; status: string }[],
    allergies: { allergen: string; reaction: string; severity: string }[],
    visitType: VisitType
  ): string {
    const parts: string[] = [];

    // Allergies summary
    if (allergies.length > 0) {
      const severeAllergies = allergies.filter(a =>
        a.severity === 'severe' || a.severity === 'life-threatening'
      );
      if (severeAllergies.length > 0) {
        parts.push(`ALLERGIES: ${severeAllergies.map(a => `${a.allergen} (${a.severity})`).join(', ')}`);
      }
    }

    // Conditions summary
    const activeConditions = conditions.filter(c => c.status === 'active');
    if (activeConditions.length > 0) {
      parts.push(`Active conditions: ${activeConditions.map(c => c.name).join(', ')}`);
    }

    // Surgery summary
    if (history.surgeries.length > 0) {
      const recentSurgery = history.surgeries
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      if (recentSurgery) {
        parts.push(`Recent surgery: ${recentSurgery.procedure} (${new Date(recentSurgery.date).getFullYear()})`);
      }
    }

    return parts.join('. ') || 'No significant history available.';
  }

  /**
   * Generate visit summary text
   */
  private generateVisitSummaryText(
    visits: {
      visitId: string;
      visitDate: Date;
      visitType: string;
      keyPoints: string[];
      diagnosis: string[];
      treatments: string[];
      followUpNeeded: boolean;
    }[]
  ): string {
    if (visits.length === 0) {
      return 'No previous visits on record.';
    }

    const parts: string[] = [];

    const lastVisit = visits[0];
    parts.push(`Last visit (${new Date(lastVisit.visitDate).toLocaleDateString()}): ${lastVisit.visitType}`);

    if (lastVisit.diagnosis.length > 0) {
      parts.push(`Diagnoses: ${lastVisit.diagnosis.join(', ')}`);
    }

    if (lastVisit.followUpNeeded) {
      parts.push('Follow-up recommended');
    }

    if (visits.length > 1) {
      parts.push(`${visits.length - 1} earlier visit(s) on record`);
    }

    return parts.join('. ');
  }

  /**
   * Get full patient history
   */
  async getFullHistory(patientId: string): Promise<IMedicalHistoryDocument> {
    return this.getOrCreateHistory(patientId);
  }

  /**
   * Add condition to history
   */
  async addCondition(
    patientId: string,
    condition: IMedicalHistory['conditions'][0]
  ): Promise<IMedicalHistoryDocument> {
    const history = await this.getOrCreateHistory(patientId);
    history.conditions.push(condition);
    history.lastUpdated = new Date();
    await history.save();

    logger.info('Condition added to history', { patientId, condition: condition.name });

    return history;
  }

  /**
   * Add allergy to history
   */
  async addAllergy(
    patientId: string,
    allergy: IMedicalHistory['allergies'][0]
  ): Promise<IMedicalHistoryDocument> {
    const history = await this.getOrCreateHistory(patientId);
    history.allergies.push(allergy);
    history.lastUpdated = new Date();
    await history.save();

    logger.info('Allergy added to history', { patientId, allergen: allergy.allergen });

    return history;
  }

  /**
   * Add surgery to history
   */
  async addSurgery(
    patientId: string,
    surgery: IMedicalHistory['surgeries'][0]
  ): Promise<IMedicalHistoryDocument> {
    const history = await this.getOrCreateHistory(patientId);
    history.surgeries.push(surgery);
    history.lastUpdated = new Date();
    await history.save();

    logger.info('Surgery added to history', { patientId, procedure: surgery.procedure });

    return history;
  }

  /**
   * Add immunization to history
   */
  async addImmunization(
    patientId: string,
    immunization: IMedicalHistory['immunizations'][0]
  ): Promise<IMedicalHistoryDocument> {
    const history = await this.getOrCreateHistory(patientId);
    history.immunizations.push(immunization);
    history.lastUpdated = new Date();
    await history.save();

    logger.info('Immunization added to history', { patientId, vaccine: immunization.vaccine });

    return history;
  }
}

// Export singleton instance
export const historyService = new HistoryService();
