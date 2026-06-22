// Visit Summary Types

export interface VisitSummaryRequest {
  transcript: string;
  profileId: string;
  visitType: 'consultation' | 'follow_up' | 'emergency' | 'teleconsult';
  doctorName?: string;
  hospitalName?: string;
  specialty?: string;
  visitDate: string;
  context?: {
    previousVisits?: string[];
    currentMedications?: string[];
    allergies?: string[];
  };
}

export interface VisitSummary {
  id: string;
  profileId: string;
  visitId?: string;

  // Summary content
  plainLanguageSummary: string;
  keyPoints: string[];

  // Extracted data
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  instructions: string[];
  followUps: ExtractedFollowUp[];
  questionsForNextVisit: string[];

  // Flags
  redFlags: string[];
  warnings: string[];
  allergiesMentioned: string[];

  // Sentiment & confidence
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  complexity: 'simple' | 'moderate' | 'complex';

  // Metadata
  generatedAt: string;
  processingTimeMs: number;
  model: string;
}

export interface ExtractedDiagnosis {
  condition: string;
  icdCode?: string;
  certainty: 'confirmed' | 'suspected' | 'rule_out';
  discussion: string;
}

export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  duration?: string;
  instructions: string;
  isNew: boolean;
  isChanged: boolean;
  isStopped?: boolean;
}

export interface ExtractedFollowUp {
  type: 'appointment' | 'test' | 'procedure' | 'review' | 'referral';
  description: string;
  urgency: 'routine' | 'soon' | 'urgent';
  timeframe?: string;
  specificDate?: string;
}

// Medical entity extraction
export interface MedicalExtractionRequest {
  text: string;
  profileId?: string;
  extractAll: boolean;
  categories?: ('medications' | 'diagnoses' | 'symptoms' | 'procedures' | 'allergies' | 'vitals')[];
}

export interface MedicalExtractionResponse {
  id: string;
  text: string;
  entities: {
    medications: MedicationEntity[];
    diagnoses: DiagnosisEntity[];
    symptoms: SymptomEntity[];
    procedures: ProcedureEntity[];
    allergies: AllergyEntity[];
    vitals: VitalEntity[];
    labResults: LabResultEntity[];
    followUps: FollowUpEntity[];
    referrals: ReferralEntity[];
  };
  summary: string;
  confidence: number;
  processedAt: string;
}

export interface MedicationEntity {
  name: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
  isCurrent: boolean;
  isNew: boolean;
}

export interface DiagnosisEntity {
  condition: string;
  icdCode?: string;
  status: 'active' | 'resolved' | 'chronic';
  mentionedIn: string;
}

export interface SymptomEntity {
  symptom: string;
  severity?: 'mild' | 'moderate' | 'severe';
  duration?: string;
  location?: string;
  factors?: string[];
}

export interface ProcedureEntity {
  name: string;
  bodyPart?: string;
  date?: string;
  result?: string;
}

export interface AllergyEntity {
  allergen: string;
  reaction?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export interface VitalEntity {
  type: string;
  value: string;
  unit?: string;
  context?: string;
  normalRange?: string;
}

export interface LabResultEntity {
  testName: string;
  value?: string;
  unit?: string;
  result?: 'normal' | 'abnormal' | 'critical';
  referenceRange?: string;
}

export interface FollowUpEntity {
  description: string;
  type: string;
  urgency: string;
  timeframe?: string;
}

export interface ReferralEntity {
  toSpecialty: string;
  reason: string;
  urgency?: string;
}
