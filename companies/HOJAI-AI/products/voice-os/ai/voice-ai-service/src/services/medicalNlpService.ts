// Medical NLP Service - Extract medical entities from text

import { v4 as uuidv4 } from 'uuid';
import {
  MedicalExtractionResponse,
  MedicalExtractionRequest,
  VisitSummary,
  VisitSummaryRequest,
  MedicationEntity,
  DiagnosisEntity,
  SymptomEntity,
} from '../models/medical.js';
import { logger } from '../utils/logger.js';

export class MedicalNlpService {
  /**
   * Extract medical entities from text
   */
  async extractMedicalEntities(params: MedicalExtractionRequest): Promise<MedicalExtractionResponse> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      logger.info(`Extracting medical entities`, { requestId, textLength: params.text.length });

      const result = await this.performExtraction(params);

      result.id = requestId;
      result.processedAt = new Date().toISOString();

      logger.info(`Medical extraction completed`, {
        requestId,
        processingTimeMs: Date.now() - startTime,
        entityCounts: {
          medications: result.entities.medications.length,
          diagnoses: result.entities.diagnoses.length,
          symptoms: result.entities.symptoms.length,
        },
      });

      return result;
    } catch (error) {
      logger.error(`Medical extraction failed`, error);
      throw error;
    }
  }

  /**
   * Generate visit summary from transcript
   */
  async generateVisitSummary(params: VisitSummaryRequest): Promise<VisitSummary> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      logger.info(`Generating visit summary`, { requestId, profileId: params.profileId });

      // Extract medical entities first
      const extraction = await this.extractMedicalEntities({
        text: params.transcript,
        profileId: params.profileId,
        extractAll: true,
      });

      // Generate summary from extraction
      const summary = await this.createSummary(params, extraction);

      summary.id = requestId;
      summary.generatedAt = new Date().toISOString();
      summary.processingTimeMs = Date.now() - startTime;

      logger.info(`Visit summary generated`, {
        requestId,
        processingTimeMs: summary.processingTimeMs,
        diagnosesCount: summary.diagnoses.length,
        medicationsCount: summary.medications.length,
      });

      return summary;
    } catch (error) {
      logger.error(`Visit summary generation failed`, error);
      throw error;
    }
  }

  /**
   * Perform actual entity extraction
   */
  private async performExtraction(params: MedicalExtractionRequest): Promise<MedicalExtractionResponse> {
    const { text, profileId } = params;
    const lowerText = text.toLowerCase();

    // Common medical patterns for extraction
    const medicationPatterns = [
      /(?:take|started on|prescribed|on|using)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mcg|units?))/gi,
      /(?:mg|mcg|g|ml)\s+(\d+(?:\.\d+)?)/gi,
    ];

    const diagnosisPatterns = [
      /(?:diagnosed with|diagnosis|has|diagnosed|condition is|suffering from)\s+([A-Za-z\s]+?)(?:\.|,|$)/gi,
      /(?:blood pressure|diabetes|hypertension|diabetic|anxiety|depression|asthma|arthritis)/gi,
    ];

    const symptomPatterns = [
      /(?:having|experiencing|suffering from|complaining of|feeling|experiencing)\s+([A-Za-z\s]+?)(?:\.|,|$)/gi,
      /(?:headache|pain|fatigue|nausea|dizziness|insomnia|constipation|diarrhea)/gi,
    ];

    // Extract medications
    const medications: MedicationEntity[] = [];
    const medicationNames = [
      'metformin', 'lisinopril', 'atorvastatin', 'amlodipine', 'metoprolol',
      'omeprazole', 'losartan', 'gabapentin', 'hydrochlorothiazide', 'sertraline',
      'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'dolo',
      'telmisartan', 'rosuvastatin', 'pantoprazole', 'alpha keto', 'shelcal',
    ];

    medicationNames.forEach((med) => {
      if (lowerText.includes(med)) {
        medications.push({
          name: med.charAt(0).toUpperCase() + med.slice(1),
          isCurrent: true,
          isNew: lowerText.includes('started') || lowerText.includes('new'),
        });
      }
    });

    // Extract diagnoses
    const diagnoses: DiagnosisEntity[] = [];
    const diagnosisTerms: Record<string, string> = {
      'blood pressure': 'I10 - Essential Hypertension',
      'hypertension': 'I10 - Essential Hypertension',
      'diabetes': 'E11 - Type 2 Diabetes Mellitus',
      'diabetic': 'E11 - Type 2 Diabetes Mellitus',
      'anxiety': 'F41.1 - Generalized Anxiety Disorder',
      'depression': 'F32 - Major Depressive Disorder',
      'asthma': 'J45 - Asthma',
      'headache': 'R51 - Headache',
      'migraine': 'G43 - Migraine',
    };

    Object.entries(diagnosisTerms).forEach(([term, diagnosis]) => {
      if (lowerText.includes(term)) {
        const icdCode = diagnosis.split(' - ')[0];
        const name = diagnosis.split(' - ')[1];
        diagnoses.push({
          condition: name,
          icdCode,
          status: 'active',
          mentionedIn: 'Consultation',
        });
      }
    });

    // Extract symptoms
    const symptoms: SymptomEntity[] = [];
    const symptomTerms = [
      { term: 'headache', severity: 'moderate' },
      { term: 'severe headache', severity: 'severe' },
      { term: 'fatigue', severity: 'mild' },
      { term: 'tiredness', severity: 'mild' },
      { term: 'nausea', severity: 'moderate' },
      { term: 'dizziness', severity: 'moderate' },
      { term: 'pain', severity: 'moderate' },
      { term: 'chest pain', severity: 'severe' },
      { term: 'shortness of breath', severity: 'severe' },
      { term: 'insomnia', severity: 'mild' },
    ];

    symptomTerms.forEach(({ term, severity }) => {
      if (lowerText.includes(term)) {
        symptoms.push({
          symptom: term.charAt(0).toUpperCase() + term.slice(1),
          severity: severity as 'mild' | 'moderate' | 'severe',
        });
      }
    });

    // Generate summary
    const summary = this.generateExtractionSummary(medications, diagnoses, symptoms);

    return {
      id: uuidv4(),
      text: params.text,
      entities: {
        medications,
        diagnoses,
        symptoms,
        procedures: [],
        allergies: this.extractAllergies(lowerText),
        vitals: this.extractVitals(text),
        labResults: [],
        followUps: this.extractFollowUps(text),
        referrals: this.extractReferrals(text),
      },
      summary,
      confidence: 0.85,
      processedAt: new Date().toISOString(),
    };
  }

  private extractAllergies(text: string): { allergen: string; reaction?: string; severity?: 'mild' | 'moderate' | 'severe' }[] {
    const allergies: { allergen: string; reaction?: string; severity?: 'mild' | 'moderate' | 'severe' }[] = [];
    const allergyTerms = ['penicillin', 'aspirin', 'ibuprofen', 'sulfa', 'latex', 'peanut'];

    allergyTerms.forEach((allergen) => {
      if (text.includes(`allergic to ${allergen}`) || text.includes(`allergy to ${allergen}`)) {
        allergies.push({
          allergen: allergen.charAt(0).toUpperCase() + allergen.slice(1),
          severity: text.includes('severe') ? 'severe' : 'moderate',
        });
      }
    });

    return allergies;
  }

  private extractVitals(text: string): { type: string; value: string; unit?: string; context?: string }[] {
    const vitals: { type: string; value: string; unit?: string; context?: string }[] = [];

    // Blood pressure
    const bpMatch = text.match(/(\d{2,3})\s*[\/]\s*(\d{2,3})/);
    if (bpMatch) {
      vitals.push({
        type: 'Blood Pressure',
        value: `${bpMatch[1]}/${bpMatch[2]}`,
        unit: 'mmHg',
        context: parseInt(bpMatch[1]) > 140 ? 'Elevated' : 'Normal',
      });
    }

    // Heart rate
    const hrMatch = text.match(/(?:heart rate|pulse|hr)\s*:?\s*(\d{2,3})/i);
    if (hrMatch) {
      vitals.push({
        type: 'Heart Rate',
        value: hrMatch[1],
        unit: 'bpm',
      });
    }

    // Temperature
    const tempMatch = text.match(/(?:temperature|fever)\s*:?\s*(\d{2}(?:\.\d)?)/i);
    if (tempMatch) {
      vitals.push({
        type: 'Temperature',
        value: tempMatch[1],
        unit: '°F',
      });
    }

    return vitals;
  }

  private extractFollowUps(text: string): { description: string; type: string; urgency: string; timeframe?: string }[] {
    const followUps: { description: string; type: string; urgency: string; timeframe?: string }[] = [];

    if (text.includes('follow up') || text.includes('follow-up')) {
      followUps.push({
        description: 'Follow-up appointment',
        type: 'appointment',
        urgency: text.includes('urgent') ? 'urgent' : 'routine',
        timeframe: '2 weeks',
      });
    }

    if (text.includes('recheck') || text.includes('re-check')) {
      followUps.push({
        description: 'Recheck labs',
        type: 'test',
        urgency: 'routine',
      });
    }

    return followUps;
  }

  private extractReferrals(text: string): { toSpecialty: string; reason: string; urgency?: string }[] {
    const referrals: { toSpecialty: string; reason: string; urgency?: string }[] = [];

    const specialistTerms: Record<string, string> = {
      'cardiologist': 'Heart conditions',
      'endocrinologist': 'Hormone disorders',
      'neurologist': 'Nervous system',
      'dermatologist': 'Skin conditions',
      'orthopedic': 'Bone/joint issues',
    };

    Object.entries(specialistTerms).forEach(([specialist, reason]) => {
      if (text.includes(specialist)) {
        referrals.push({
          toSpecialty: specialist.charAt(0).toUpperCase() + specialist.slice(1),
          reason,
          urgency: text.includes('urgent') ? 'urgent' : 'routine',
        });
      }
    });

    return referrals;
  }

  private generateExtractionSummary(
    medications: MedicationEntity[],
    diagnoses: DiagnosisEntity[],
    symptoms: SymptomEntity[]
  ): string {
    const parts: string[] = [];

    if (diagnoses.length > 0) {
      parts.push(`Identified ${diagnoses.length} condition(s): ${diagnoses.map((d) => d.condition).join(', ')}`);
    }

    if (medications.length > 0) {
      parts.push(`Discussed ${medications.length} medication(s): ${medications.map((m) => m.name).join(', ')}`);
    }

    if (symptoms.length > 0) {
      parts.push(`Patient reported ${symptoms.length} symptom(s): ${symptoms.map((s) => s.symptom).join(', ')}`);
    }

    return parts.join('. ') || 'No significant medical entities extracted from the conversation.';
  }

  private async createSummary(
    params: VisitSummaryRequest,
    extraction: MedicalExtractionResponse
  ): Promise<VisitSummary> {
    const { transcript, visitType, doctorName } = params;

    // Generate plain language summary
    const plainLanguageSummary = this.generatePlainSummary(extraction, visitType);

    // Extract key points
    const keyPoints = this.extractKeyPoints(extraction);

    // Determine complexity
    const complexity = this.determineComplexity(extraction);

    return {
      id: '', // Set by caller
      profileId: params.profileId,
      visitType,
      plainLanguageSummary,
      keyPoints,
      diagnoses: extraction.entities.diagnoses.map((d) => ({
        condition: d.condition,
        icdCode: d.icdCode,
        certainty: 'confirmed' as const,
        discussion: d.mentionedIn,
      })),
      medications: extraction.entities.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage || 'As prescribed',
        frequency: m.frequency || 'Daily',
        instructions: m.instructions || 'Take as directed',
        isNew: m.isNew,
        isChanged: false,
      })),
      instructions: this.extractInstructions(transcript),
      followUps: extraction.entities.followUps.map((f) => ({
        type: f.type as 'appointment' | 'test' | 'procedure' | 'review' | 'referral',
        description: f.description,
        urgency: f.urgency as 'routine' | 'soon' | 'urgent',
        timeframe: f.timeframe,
      })),
      questionsForNextVisit: this.suggestQuestions(extraction),
      redFlags: this.identifyRedFlags(extraction),
      warnings: this.identifyWarnings(extraction),
      allergiesMentioned: extraction.entities.allergies.map((a) => a.allergen),
      sentiment: this.analyzeSentiment(transcript),
      confidence: extraction.confidence,
      complexity,
      generatedAt: '',
      processingTimeMs: 0,
      model: 'hojai-medical-nlp-v1',
    };
  }

  private generatePlainSummary(extraction: MedicalExtractionResponse, visitType: string): string {
    const parts: string[] = [];

    if (extraction.entities.diagnoses.length > 0) {
      const conditions = extraction.entities.diagnoses.map((d) => d.condition).join(' and ');
      parts.push(`During this ${visitType}, ${conditions} was discussed.`);
    }

    if (extraction.entities.medications.length > 0) {
      const meds = extraction.entities.medications.map((m) => m.name).join(', ');
      parts.push(`Medication management included: ${meds}.`);
    }

    if (extraction.entities.symptoms.length > 0) {
      const symptoms = extraction.entities.symptoms.map((s) => s.symptom).join(', ');
      parts.push(`Patient reported symptoms of ${symptoms}.`);
    }

    return parts.join(' ') || 'A general health consultation was conducted.';
  }

  private extractKeyPoints(extraction: MedicalExtractionResponse): string[] {
    const points: string[] = [];

    extraction.entities.diagnoses.forEach((d) => {
      points.push(`${d.condition} - ${d.status}`);
    });

    extraction.entities.medications.forEach((m) => {
      const status = m.isNew ? 'Newly prescribed' : 'Current medication';
      points.push(`${m.name} - ${status}`);
    });

    if (extraction.entities.vitals.length > 0) {
      extraction.entities.vitals.forEach((v) => {
        points.push(`${v.type}: ${v.value} ${v.unit || ''} (${v.context || 'measured'})`);
      });
    }

    return points.slice(0, 10); // Limit to 10 key points
  }

  private extractInstructions(text: string): string[] {
    const instructions: string[] = [];
    const instructionPatterns = [
      /take (?:one|two|\d+)\s+\w+\s+(?:tablet|capsule|ml)/gi,
      /take with (?:food|water|meal)/gi,
      /avoid\s+[A-Za-z\s]+/gi,
      /reduce\s+[A-Za-z\s]+/gi,
      /increase\s+[A-Za-z\s]+/gi,
      /rest\s+for\s+\d+\s+days?/gi,
      /follow\s+up\s+in\s+\d+\s+days?/gi,
    ];

    instructionPatterns.forEach((pattern) => {
      const matches = text.match(pattern);
      if (matches) {
        instructions.push(...matches.map((m) => m.charAt(0).toUpperCase() + m.slice(1)));
      }
    });

    return [...new Set(instructions)]; // Remove duplicates
  }

  private suggestQuestions(extraction: MedicalExtractionResponse): string[] {
    const questions: string[] = [];

    if (extraction.entities.medications.length > 0) {
      questions.push('What are the side effects of my new medication?');
      questions.push('How long should I take this medication?');
    }

    if (extraction.entities.diagnoses.length > 0) {
      questions.push('Are there any lifestyle changes I should make?');
      questions.push('When should I expect to see improvement?');
    }

    if (extraction.entities.symptoms.length > 0) {
      questions.push('What should I do if my symptoms worsen?');
      questions.push('Are there warning signs I should watch for?');
    }

    questions.push('What follow-up tests or appointments do I need?');

    return questions.slice(0, 5);
  }

  private identifyRedFlags(extraction: MedicalExtractionResponse): string[] {
    const redFlags: string[] = [];

    // Check for severe symptoms
    const severeSymptoms = extraction.entities.symptoms.filter((s) => s.severity === 'severe');
    if (severeSymptoms.length > 0) {
      redFlags.push(`Severe symptoms reported: ${severeSymptoms.map((s) => s.symptom).join(', ')}`);
    }

    // Check for critical vitals
    extraction.entities.vitals.forEach((v) => {
      if (v.type === 'Blood Pressure') {
        const [systolic] = v.value.split('/').map(Number);
        if (systolic > 180 || systolic < 90) {
          redFlags.push(`Critical blood pressure: ${v.value}`);
        }
      }
    });

    // Check for emergency referrals
    if (extraction.entities.referrals.some((r) => r.urgency === 'urgent')) {
      redFlags.push('Urgent referral recommended');
    }

    return redFlags;
  }

  private identifyWarnings(extraction: MedicalExtractionResponse): string[] {
    const warnings: string[] = [];

    // Check for allergies
    if (extraction.entities.allergies.length > 0) {
      warnings.push(`Allergies: ${extraction.entities.allergies.map((a) => a.allergen).join(', ')}`);
    }

    // Check for new medications
    const newMeds = extraction.entities.medications.filter((m) => m.isNew);
    if (newMeds.length > 0) {
      warnings.push('New medications prescribed - monitor for side effects');
    }

    return warnings;
  }

  private determineComplexity(extraction: MedicalExtractionResponse): 'simple' | 'moderate' | 'complex' {
    const count =
      extraction.entities.diagnoses.length +
      extraction.entities.medications.length +
      extraction.entities.procedures.length +
      extraction.entities.referrals.length;

    if (count <= 2) return 'simple';
    if (count <= 5) return 'moderate';
    return 'complex';
  }

  private analyzeSentiment(text: string): number {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['good', 'better', 'improved', 'stable', 'normal', 'resolved'];
    const negativeWords = ['worse', 'severe', 'painful', 'concern', 'worry', 'emergency'];

    let score = 0;
    const lowerText = text.toLowerCase();

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score += 0.2;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score -= 0.2;
    });

    return Math.max(-1, Math.min(1, score));
  }
}

export const medicalNlpService = new MedicalNlpService();
