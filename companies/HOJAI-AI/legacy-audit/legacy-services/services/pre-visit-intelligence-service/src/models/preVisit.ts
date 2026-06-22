import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum VisitType {
  GENERAL_CHECKUP = 'general_checkup',
  FOLLOW_UP = 'follow_up',
  NEW_CONDITION = 'new_condition',
  CHRONIC_CARE = 'chronic_care',
  SPECIALIST_REFERRAL = 'specialist_referral',
  URGENT_CARE = 'urgent_care',
  TELEMEDICINE = 'telemedicine',
  ANNUAL_PHYSICAL = 'annual_physical',
  WELLNESS_VISIT = 'wellness_visit',
  PREOPERATIVE = 'preoperative',
  POSTOPERATIVE = 'postoperative',
  PEDIATRIC = 'pediatric',
  MENTAL_HEALTH = 'mental_health',
  DENTAL = 'dental',
  OPHTHALMOLOGY = 'ophthalmology',
  CARDIOLOGY = 'cardiology',
  DERMATOLOGY = 'dermatology',
  ORTHOPEDICS = 'orthopedics',
  ONCOLOGY = 'oncology',
  OTHER = 'other'
}

export enum QuestionCategory {
  SYMPTOMS = 'symptoms',
  MEDICATION = 'medication',
  TREATMENT = 'treatment',
  DIAGNOSIS = 'diagnosis',
  TEST_RESULTS = 'test_results',
  SIDE_EFFECTS = 'side_effects',
  LIFESTYLE = 'lifestyle',
  FAMILY_HISTORY = 'family_history',
  PREVENTION = 'prevention',
  FOLLOW_UP = 'follow_up',
  PROCEDURE = 'procedure',
  COST_INSURANCE = 'cost_insurance',
  ALTERNATIVE_TREATMENTS = 'alternative_treatments',
  QUALITY_OF_LIFE = 'quality_of_life',
  OTHER = 'other'
}

export enum QuestionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped'
}

export enum TaskCategory {
  DOCUMENTS = 'documents',
  MEDICATIONS = 'medications',
  QUESTIONS = 'questions',
  SYMPTOMS = 'symptoms',
  VITALS = 'vitals',
  TESTS = 'tests',
  INSURANCE = 'insurance',
  LOGISTICS = 'logistics',
  OTHER = 'other'
}

export enum SymptomSeverity {
  NONE = 0,
  MILD = 1,
  MODERATE = 2,
  SEVERE = 3,
  CRITICAL = 4
}

export enum SymptomDuration {
  MINUTES = 'minutes',
  HOURS = 'hours',
  DAYS = 'days',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

export enum VitalType {
  BLOOD_PRESSURE = 'blood_pressure',
  HEART_RATE = 'heart_rate',
  TEMPERATURE = 'temperature',
  RESPIRATORY_RATE = 'respiratory_rate',
  OXYGEN_SATURATION = 'oxygen_saturation',
  WEIGHT = 'weight',
  HEIGHT = 'height',
  BMI = 'bmi',
  BLOOD_GLUCOSE = 'blood_glucose',
  CHOLESTEROL = 'cholesterol'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface ISymptom {
  name: string;
  description?: string;
  severity: SymptomSeverity;
  duration: SymptomDuration;
  durationValue: number;
  location?: string;
  triggers?: string[];
  alleviatingFactors?: string[];
  frequency?: 'constant' | 'intermittent' | 'occasional';
  associatedSymptoms?: string[];
  impactOnDailyLife?: number; // 1-10 scale
  notes?: string;
}

export interface IMedication {
  name: string;
  dosage: string;
  frequency: string;
  purpose?: string;
  prescribingDoctor?: string;
  startDate?: Date;
  endDate?: Date;
  sideEffects?: string[];
  isNew?: boolean;
  isDiscontinued?: boolean;
  notes?: string;
}

export interface IVital {
  type: VitalType;
  value: string | number;
  unit: string;
  recordedAt: Date;
  source?: 'home' | 'clinic' | 'hospital' | 'wearable';
  notes?: string;
}

export interface IQuestion {
  question: string;
  category: QuestionCategory;
  priority: QuestionPriority;
  reasoning: string;
  context?: string;
  followUpQuestions?: string[];
  expectedAnswerFormat?: string;
  isAnswered?: boolean;
  answer?: string;
  isPersonalized?: boolean;
  basedOnSymptom?: string;
  basedOnCondition?: string;
}

export interface ITask {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: QuestionPriority;
  dueDate?: Date;
  completedAt?: Date;
  estimatedTime?: number; // in minutes
  instructions?: string;
  resources?: string[];
  reminders?: {
    time: Date;
    sent: boolean;
  }[];
}

export interface IVisitContext {
  patientId: string;
  visitType: VisitType;
  doctorId?: string;
  specialty?: string;
  chiefComplaint?: string;
  scheduledDate?: Date;
  symptoms?: ISymptom[];
  isFollowUp?: boolean;
  previousVisitId?: string;
  conditions?: string[];
  medications?: IMedication[];
  additionalNotes?: string;
}

export interface ISymptomLog {
  patientId: string;
  visitId?: string;
  symptoms: ISymptom[];
  totalSeverity: number;
  overallSeverity: number;
  loggedAt: Date;
  preOrPostVisit: 'pre' | 'post';
  notes?: string;
  weatherFactors?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
  };
  activityFactors?: {
    exercise?: boolean;
    stress?: 'low' | 'medium' | 'high';
    sleep?: 'poor' | 'adequate' | 'good';
    diet?: 'poor' | 'fair' | 'good';
  };
}

export interface IVisitPreparation {
  visitId: string;
  patientId: string;
  visitContext: IVisitContext;
  questions: IQuestion[];
  checklist: ITask[];
  medicationsToReview: IMedication[];
  relevantHistory: {
    conditions: string[];
    surgeries: string[];
    allergies: string[];
    familyHistory: string[];
  };
  vitalsSummary?: {
    recent: IVital[];
    comparedToBaseline: {
      type: VitalType;
      current: string | number;
      baseline: string | number;
      change: number;
      concern: boolean;
    }[];
  };
  symptomSummary?: {
    currentSymptoms: ISymptom[];
    worseningSymptoms: string[];
    newSymptoms: string[];
    improvingSymptoms: string[];
  };
  preparationProgress: {
    questionsReviewed: number;
    questionsTotal: number;
    tasksCompleted: number;
    tasksTotal: number;
    documentsPrepared: number;
    documentsTotal: number;
  };
  generatedAt: Date;
  lastUpdated: Date;
}

export interface IVisitSummary {
  visitId: string;
  patientId: string;
  visitDate: Date;
  doctorId?: string;
  visitType: VisitType;
  keyPoints: {
    diagnosis: string[];
    treatment: string[];
    instructions: string[];
    warnings: string[];
  };
  actionItems: {
    id: string;
    task: string;
    dueDate?: Date;
    priority: QuestionPriority;
    category: TaskCategory;
    assignedTo?: 'patient' | 'doctor' | 'caregiver';
    status: TaskStatus;
  }[];
  followUp: {
    recommended: boolean;
    suggestedTimeframe?: string;
    purpose?: string;
  };
  prescriptions: {
    medication: string;
    dosage: string;
    instructions: string;
    duration?: string;
  }[];
  testOrders: {
    testName: string;
    reason: string;
    priority?: 'routine' | 'urgent';
    scheduled?: boolean;
  }[];
  referrals: {
    specialist: string;
    reason: string;
    urgency?: 'routine' | 'urgent';
  }[];
  sharedWith: {
    circleId: string;
    sharedAt: Date;
    permissions: 'view' | 'edit';
  }[];
  transcript?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicalHistory {
  patientId: string;
  conditions: {
    name: string;
    diagnosedDate?: Date;
    status: 'active' | 'resolved' | 'managed';
    severity?: 'mild' | 'moderate' | 'severe';
    notes?: string;
  }[];
  surgeries: {
    procedure: string;
    date: Date;
    hospital?: string;
    surgeon?: string;
    outcome?: string;
    notes?: string;
  }[];
  allergies: {
    allergen: string;
    reaction: string;
    severity: 'mild' | 'moderate' | 'severe' | 'life-threatening';
    diagnosedDate?: Date;
  }[];
  familyHistory: {
    condition: string;
    relation: string;
    ageOfOnset?: number;
    notes?: string;
  }[];
  immunizations: {
    vaccine: string;
    date: Date;
    nextDueDate?: Date;
    administeredBy?: string;
  }[];
  screenings: {
    test: string;
    date: Date;
    result: string;
    nextDueDate?: Date;
    facility?: string;
  }[];
  lastUpdated: Date;
}

export interface IVitalRecord {
  patientId: string;
  vitals: IVital[];
  baseline?: {
    type: VitalType;
    value: string | number;
    establishedAt: Date;
    source: string;
  }[];
  concerns: {
    type: VitalType;
    value: string | number;
    concernLevel: 'normal' | 'elevated' | 'high' | 'critical';
    message: string;
    detectedAt: Date;
    acknowledged: boolean;
  }[];
  lastUpdated: Date;
}

// ============================================================================
// MONGOOSE DOCUMENTS
// ============================================================================

// Pre-Visit Question Document
export interface IPreVisitQuestionDocument extends Document {
  visitId: string;
  patientId: string;
  questions: IQuestion[];
  priorities: {
    questionId: string;
    priority: QuestionPriority;
    score: number;
  }[];
  personalizedFor: {
    patientId: string;
    visitType: VisitType;
    generatedAt: Date;
  };
  generatedAt: Date;
  updatedAt: Date;
}

// Symptom Log Document
export interface ISymptomLogDocument extends Document {
  patientId: string;
  visitId?: string;
  symptoms: ISymptom[];
  totalSeverity: number;
  overallSeverity: number;
  loggedAt: Date;
  preOrPostVisit: 'pre' | 'post';
  notes?: string;
  weatherFactors?: ISymptomLog['weatherFactors'];
  activityFactors?: ISymptomLog['activityFactors'];
  createdAt: Date;
  updatedAt: Date;
}

// Medication List Document
export interface IMedicationListDocument extends Document {
  patientId: string;
  medications: IMedication[];
  visitId?: string;
  toDiscussWithDoctor: string[];
  newMedicationsStarted: string[];
  discontinuedMedications: string[];
  sideEffectsToReport: {
    medication: string;
    sideEffect: string;
    severity: SymptomSeverity;
  }[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Medical History Document
export interface IMedicalHistoryDocument extends Document {
  patientId: string;
  conditions: IMedicalHistory['conditions'];
  surgeries: IMedicalHistory['surgeries'];
  allergies: IMedicalHistory['allergies'];
  familyHistory: IMedicalHistory['familyHistory'];
  immunizations: IMedicalHistory['immunizations'];
  screenings: IMedicalHistory['screenings'];
  lastUpdated: Date;
}

// Vital Record Document
export interface IVitalRecordDocument extends Document {
  patientId: string;
  vitals: IVital[];
  baseline?: IVitalRecord['baseline'];
  concerns: IVitalRecord['concerns'];
  lastUpdated: Date;
}

// Visit Preparation Document
export interface IVisitPreparationDocument extends Document {
  visitId: string;
  patientId: string;
  visitContext: IVisitContext;
  questions: IQuestion[];
  checklist: ITask[];
  medicationsToReview: IMedication[];
  relevantHistory: IVisitPreparation['relevantHistory'];
  vitalsSummary?: IVisitPreparation['vitalsSummary'];
  symptomSummary?: IVisitPreparation['symptomSummary'];
  preparationProgress: IVisitPreparation['preparationProgress'];
  generatedAt: Date;
  lastUpdated: Date;
}

// Visit Summary Document
export interface IVisitSummaryDocument extends Document {
  visitId: string;
  patientId: string;
  visitDate: Date;
  doctorId?: string;
  visitType: VisitType;
  keyPoints: IVisitSummary['keyPoints'];
  actionItems: IVisitSummary['actionItems'];
  followUp: IVisitSummary['followUp'];
  prescriptions: IVisitSummary['prescriptions'];
  testOrders: IVisitSummary['testOrders'];
  referrals: IVisitSummary['referrals'];
  sharedWith: IVisitSummary['sharedWith'];
  transcript?: string;
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Preparation Task Document
export interface IPreparationTaskDocument extends Document {
  taskId: string;
  visitId?: string;
  patientId: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: QuestionPriority;
  dueDate?: Date;
  completedAt?: Date;
  estimatedTime?: number;
  instructions?: string;
  resources?: string[];
  reminders: IPreparationTaskDocument['reminders'];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MONGOOSE SCHEMAS
// ============================================================================

const SymptomSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  severity: { type: Number, required: true, min: 0, max: 4 },
  duration: { type: String, required: true },
  durationValue: { type: Number, required: true },
  location: { type: String },
  triggers: [{ type: String }],
  alleviatingFactors: [{ type: String }],
  frequency: { type: String },
  associatedSymptoms: [{ type: String }],
  impactOnDailyLife: { type: Number, min: 1, max: 10 },
  notes: { type: String }
}, { _id: false });

const MedicationSchema = new Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  purpose: { type: String },
  prescribingDoctor: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  sideEffects: [{ type: String }],
  isNew: { type: Boolean, default: false },
  isDiscontinued: { type: Boolean, default: false },
  notes: { type: String }
}, { _id: false });

const VitalSchema = new Schema({
  type: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  unit: { type: String, required: true },
  recordedAt: { type: Date, required: true },
  source: { type: String },
  notes: { type: String }
}, { _id: false });

const QuestionSchema = new Schema({
  question: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, required: true },
  reasoning: { type: String, required: true },
  context: { type: String },
  followUpQuestions: [{ type: String }],
  expectedAnswerFormat: { type: String },
  isAnswered: { type: Boolean, default: false },
  answer: { type: String },
  isPersonalized: { type: Boolean, default: false },
  basedOnSymptom: { type: String },
  basedOnCondition: { type: String }
}, { _id: false });

const TaskSchema = new Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, required: true },
  status: { type: String, required: true, default: 'pending' },
  priority: { type: String, required: true },
  dueDate: { type: Date },
  completedAt: { type: Date },
  estimatedTime: { type: Number },
  instructions: { type: String },
  resources: [{ type: String }],
  reminders: [{
    time: { type: Date },
    sent: { type: Boolean, default: false }
  }]
}, { _id: false });

// PreVisit Question Schema
export const PreVisitQuestionSchema = new Schema<IPreVisitQuestionDocument>({
  visitId: { type: String, required: true, index: true },
  patientId: { type: String, required: true, index: true },
  questions: [QuestionSchema],
  priorities: [{
    questionId: { type: String },
    priority: { type: String },
    score: { type: Number }
  }],
  personalizedFor: {
    patientId: { type: String },
    visitType: { type: String },
    generatedAt: { type: Date }
  },
  generatedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Symptom Log Schema
export const SymptomLogSchema = new Schema<ISymptomLogDocument>({
  patientId: { type: String, required: true, index: true },
  visitId: { type: String, index: true },
  symptoms: [SymptomSchema],
  totalSeverity: { type: Number, required: true },
  overallSeverity: { type: Number, required: true },
  loggedAt: { type: Date, required: true, index: true },
  preOrPostVisit: { type: String, required: true, enum: ['pre', 'post'] },
  notes: { type: String },
  weatherFactors: {
    temperature: Number,
    humidity: Number,
    pressure: Number
  },
  activityFactors: {
    exercise: Boolean,
    stress: String,
    sleep: String,
    diet: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Medication List Schema
export const MedicationListSchema = new Schema<IMedicationListDocument>({
  patientId: { type: String, required: true, index: true },
  medications: [MedicationSchema],
  visitId: { type: String, index: true },
  toDiscussWithDoctor: [{ type: String }],
  newMedicationsStarted: [{ type: String }],
  discontinuedMedications: [{ type: String }],
  sideEffectsToReport: [{
    medication: { type: String },
    sideEffect: { type: String },
    severity: { type: Number }
  }],
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Medical History Schema
export const MedicalHistorySchema = new Schema<IMedicalHistoryDocument>({
  patientId: { type: String, required: true, unique: true, index: true },
  conditions: [{
    name: { type: String, required: true },
    diagnosedDate: Date,
    status: { type: String, enum: ['active', 'resolved', 'managed'] },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    notes: String
  }],
  surgeries: [{
    procedure: { type: String, required: true },
    date: { type: Date, required: true },
    hospital: String,
    surgeon: String,
    outcome: String,
    notes: String
  }],
  allergies: [{
    allergen: { type: String, required: true },
    reaction: { type: String, required: true },
    severity: { type: String, required: true, enum: ['mild', 'moderate', 'severe', 'life-threatening'] },
    diagnosedDate: Date
  }],
  familyHistory: [{
    condition: { type: String, required: true },
    relation: { type: String, required: true },
    ageOfOnset: Number,
    notes: String
  }],
  immunizations: [{
    vaccine: { type: String, required: true },
    date: { type: Date, required: true },
    nextDueDate: Date,
    administeredBy: String
  }],
  screenings: [{
    test: { type: String, required: true },
    date: { type: Date, required: true },
    result: { type: String, required: true },
    nextDueDate: Date,
    facility: String
  }],
  lastUpdated: { type: Date, default: Date.now }
});

// Vital Record Schema
export const VitalRecordSchema = new Schema<IVitalRecordDocument>({
  patientId: { type: String, required: true, unique: true, index: true },
  vitals: [VitalSchema],
  baseline: [{
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    establishedAt: { type: Date, required: true },
    source: { type: String, required: true }
  }],
  concerns: [{
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    concernLevel: { type: String, required: true, enum: ['normal', 'elevated', 'high', 'critical'] },
    message: { type: String, required: true },
    detectedAt: { type: Date, required: true },
    acknowledged: { type: Boolean, default: false }
  }],
  lastUpdated: { type: Date, default: Date.now }
});

// Visit Preparation Schema
export const VisitPreparationSchema = new Schema<IVisitPreparationDocument>({
  visitId: { type: String, required: true, unique: true, index: true },
  patientId: { type: String, required: true, index: true },
  visitContext: {
    patientId: { type: String, required: true },
    visitType: { type: String, required: true },
    doctorId: String,
    specialty: String,
    chiefComplaint: String,
    scheduledDate: Date,
    symptoms: [SymptomSchema],
    isFollowUp: Boolean,
    previousVisitId: String,
    conditions: [String],
    medications: [MedicationSchema],
    additionalNotes: String
  },
  questions: [QuestionSchema],
  checklist: [TaskSchema],
  medicationsToReview: [MedicationSchema],
  relevantHistory: {
    conditions: [String],
    surgeries: [String],
    allergies: [String],
    familyHistory: [String]
  },
  vitalsSummary: {
    recent: [VitalSchema],
    comparedToBaseline: [{
      type: { type: String },
      current: { type: Schema.Types.Mixed },
      baseline: { type: Schema.Types.Mixed },
      change: { type: Number },
      concern: { type: Boolean }
    }]
  },
  symptomSummary: {
    currentSymptoms: [SymptomSchema],
    worseningSymptoms: [String],
    newSymptoms: [String],
    improvingSymptoms: [String]
  },
  preparationProgress: {
    questionsReviewed: { type: Number, default: 0 },
    questionsTotal: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    tasksTotal: { type: Number, default: 0 },
    documentsPrepared: { type: Number, default: 0 },
    documentsTotal: { type: Number, default: 0 }
  },
  generatedAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

// Visit Summary Schema
export const VisitSummarySchema = new Schema<IVisitSummaryDocument>({
  visitId: { type: String, required: true, unique: true, index: true },
  patientId: { type: String, required: true, index: true },
  visitDate: { type: Date, required: true },
  doctorId: { type: String },
  visitType: { type: String, required: true },
  keyPoints: {
    diagnosis: [String],
    treatment: [String],
    instructions: [String],
    warnings: [String]
  },
  actionItems: [{
    id: { type: String },
    task: { type: String, required: true },
    dueDate: Date,
    priority: { type: String, required: true },
    category: { type: String, required: true },
    assignedTo: { type: String, enum: ['patient', 'doctor', 'caregiver'] },
    status: { type: String, required: true }
  }],
  followUp: {
    recommended: { type: Boolean, default: false },
    suggestedTimeframe: String,
    purpose: String
  },
  prescriptions: [{
    medication: { type: String, required: true },
    dosage: { type: String, required: true },
    instructions: { type: String, required: true },
    duration: String
  }],
  testOrders: [{
    testName: { type: String, required: true },
    reason: { type: String, required: true },
    priority: { type: String, enum: ['routine', 'urgent'] }
  }],
  referrals: [{
    specialist: { type: String, required: true },
    reason: { type: String, required: true },
    urgency: { type: String, enum: ['routine', 'urgent'] }
  }],
  sharedWith: [{
    circleId: { type: String, required: true },
    sharedAt: { type: Date, required: true },
    permissions: { type: String, enum: ['view', 'edit'], default: 'view' }
  }],
  transcript: { type: String },
  summary: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Preparation Task Schema
export const PreparationTaskSchema = new Schema<IPreparationTaskDocument>({
  taskId: { type: String, required: true, unique: true, index: true },
  visitId: { type: String, index: true },
  patientId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, required: true },
  status: { type: String, required: true, default: 'pending' },
  priority: { type: String, required: true },
  dueDate: Date,
  completedAt: Date,
  estimatedTime: Number,
  instructions: String,
  resources: [String],
  reminders: [{
    time: { type: Date },
    sent: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const PreVisitQuestion = mongoose.model<IPreVisitQuestionDocument>('PreVisitQuestion', PreVisitQuestionSchema);
export const SymptomLog = mongoose.model<ISymptomLogDocument>('SymptomLog', SymptomLogSchema);
export const MedicationList = mongoose.model<IMedicationListDocument>('MedicationList', MedicationListSchema);
export const MedicalHistory = mongoose.model<IMedicalHistoryDocument>('MedicalHistory', MedicalHistorySchema);
export const VitalRecord = mongoose.model<IVitalRecordDocument>('VitalRecord', VitalRecordSchema);
export const VisitPreparation = mongoose.model<IVisitPreparationDocument>('VisitPreparation', VisitPreparationSchema);
export const VisitSummary = mongoose.model<IVisitSummaryDocument>('VisitSummary', VisitSummarySchema);
export const PreparationTask = mongoose.model<IPreparationTaskDocument>('PreparationTask', PreparationTaskSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export {
  SymptomSchema,
  MedicationSchema,
  VitalSchema,
  QuestionSchema,
  TaskSchema
};
