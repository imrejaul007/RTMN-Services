import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Assessment Type Enum
 * Standard healthcare assessment types used in clinical settings
 */
export enum AssessmentType {
  MUST = 'MUST',
  Braden = 'Braden',
  WATERLOW = 'WATERLOW',
  Morse_Fall = 'Morse_Fall',
  Barthel_Index = 'Barthel_Index',
  MMSE = 'MMSE',
  PHQ9 = 'PHQ9',
  GAD7 = 'GAD7',
  General = 'general'
}

/**
 * Assessment Status Enum
 * Tracks the lifecycle of an assessment
 */
export enum AssessmentStatus {
  Draft = 'draft',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Flagged = 'flagged'
}

/**
 * Risk Level Enum
 * Standardized risk categorization
 */
export enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  VeryHigh = 'very_high',
  NoRisk = 'no_risk',
  Unknown = 'unknown'
}

/**
 * Interpretation Level Enum
 * Clinical interpretation of scores
 */
export enum InterpretationLevel {
  Normal = 'normal',
  Mild = 'mild',
  Moderate = 'moderate',
  Severe = 'severe',
  Critical = 'critical'
}

/**
 * Assessment Score Schema
 * Contains the calculated score and its clinical interpretation
 */
export interface IAssessmentScore {
  score: number;
  maxScore: number;
  level: RiskLevel;
  interpretation: string;
  interpretationLevel: InterpretationLevel;
}

const AssessmentScoreSchema = new Schema<IAssessmentScore>(
  {
    score: {
      type: Number,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    level: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true
    },
    interpretation: {
      type: String,
      required: true
    },
    interpretationLevel: {
      type: String,
      enum: Object.values(InterpretationLevel),
      required: true
    }
  },
  { _id: false }
);

/**
 * Assessment Response Schema
 * Individual question response within an assessment
 */
export interface IAssessmentResponse {
  questionId: string;
  questionText: string;
  answer: mongoose.Types.Mixed;
  score: number;
  maxQuestionScore: number;
  notes?: string;
}

const AssessmentResponseSchema = new Schema<IAssessmentResponse>(
  {
    questionId: {
      type: String,
      required: true
    },
    questionText: {
      type: String,
      required: true
    },
    answer: {
      type: Schema.Types.Mixed,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    maxQuestionScore: {
      type: Number,
      required: true
    },
    notes: {
      type: String
    }
  },
  { _id: false }
);

/**
 * Main Assessment Schema
 * Represents a completed or in-progress healthcare assessment
 */
export interface IAssessment extends Document {
  // Core identification
  assessmentId: string;
  patientId: string;
  type: AssessmentType;
  status: AssessmentStatus;

  // Assessment metadata
  date: Date;
  completedDate?: Date;
  assessorId: string;
  assessorName?: string;
  department?: string;
  facilityId?: string;

  // Clinical data
  score: IAssessmentScore;
  responses: IAssessmentResponse[];

  // Risk management
  riskLevel: RiskLevel;
  previousRiskLevel?: RiskLevel;
  riskChange?: number;

  // Care planning
  recommendations: string[];
  carePlanId?: string;
  followUpDate?: Date;
  reassessmentFrequency?: number; // in days

  // Additional context
  diagnosisCodes?: string[];
  medications?: string[];
  comorbidities?: string[];
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema = new Schema<IAssessment>(
  {
    assessmentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(AssessmentType),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(AssessmentStatus),
      default: AssessmentStatus.Draft,
      index: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    completedDate: {
      type: Date
    },
    assessorId: {
      type: String,
      required: true,
      index: true
    },
    assessorName: {
      type: String
    },
    department: {
      type: String
    },
    facilityId: {
      type: String,
      index: true
    },
    score: {
      type: AssessmentScoreSchema,
      required: true
    },
    responses: {
      type: [AssessmentResponseSchema],
      default: []
    },
    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true
    },
    previousRiskLevel: {
      type: String,
      enum: Object.values(RiskLevel)
    },
    riskChange: {
      type: Number
    },
    recommendations: {
      type: [String],
      default: []
    },
    carePlanId: {
      type: String,
      index: true
    },
    followUpDate: {
      type: Date
    },
    reassessmentFrequency: {
      type: Number
    },
    diagnosisCodes: {
      type: [String],
      default: []
    },
    medications: {
      type: [String],
      default: []
    },
    comorbidities: {
      type: [String],
      default: []
    },
    notes: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound indexes for common queries
AssessmentSchema.index({ patientId: 1, type: 1, date: -1 });
AssessmentSchema.index({ patientId: 1, date: -1 });
AssessmentSchema.index({ assessorId: 1, date: -1 });
AssessmentSchema.index({ facilityId: 1, type: 1, date: -1 });
AssessmentSchema.index({ status: 1, riskLevel: 1 });

export const Assessment: Model<IAssessment> = mongoose.model<IAssessment>(
  'Assessment',
  AssessmentSchema
);

/**
 * Assessment Template Schema
 * Pre-defined templates for each assessment type
 */
export interface IAssessmentTemplate extends Document {
  templateId: string;
  type: AssessmentType;
  name: string;
  description: string;
  version: string;
  isActive: boolean;

  // Questions
  questions: ITemplateQuestion[];

  // Scoring configuration
  scoring: IScoringConfig;

  // Thresholds for risk levels
  thresholds: IThresholdConfig;

  // Metadata
  category: string;
  specialty?: string;
  applicableSpecialties?: string[];
  estimatedDuration: number; // in minutes
  requiredTraining?: string;

  // Validation
  requiredFields: string[];
  optionalFields: string[];

  // References
  source?: string; // Original source of the assessment tool
  lastValidated?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface ITemplateQuestion {
  questionId: string;
  questionText: string;
  helpText?: string;
  category?: string;
  order: number;

  // Answer configuration
  questionType: 'single' | 'multiple' | 'scale' | 'numeric' | 'text';
  options?: IQuestionOption[];
  minValue?: number;
  maxValue?: number;
  unit?: string;

  // Scoring
  scoringType: 'direct' | 'lookup' | 'formula';
  scoringValues?: Record<string, number>;
  formula?: string;

  // Conditional logic
  conditionalOn?: {
    questionId: string;
    condition: string;
    value: string | number;
  };
  skipIf?: {
    questionId: string;
    condition: string;
    value: string | number;
  };

  required: boolean;
}

export interface IQuestionOption {
  value: string | number;
  label: string;
  score: number;
  requiresFollowUp?: boolean;
  followUpQuestionId?: string;
}

export interface IScoringConfig {
  method: 'sum' | 'weighted' | 'formula';
  weights?: Record<string, number>;
  formula?: string;
  reverseScoring?: Record<string, boolean>;
}

export interface IThresholdConfig {
  low: number;
  medium?: number;
  high?: number;
  veryHigh?: number;
  customThresholds?: Record<string, { min: number; max: number }>;
}

const TemplateQuestionSchema = new Schema<ITemplateQuestion>(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, required: true },
    helpText: { type: String },
    category: { type: String },
    order: { type: Number, required: true },
    questionType: {
      type: String,
      enum: ['single', 'multiple', 'scale', 'numeric', 'text'],
      required: true
    },
    options: {
      type: [
        {
          value: { type: Schema.Types.Mixed, required: true },
          label: { type: String, required: true },
          score: { type: Number, required: true },
          requiresFollowUp: { type: Boolean },
          followUpQuestionId: { type: String }
        }
      ]
    },
    minValue: { type: Number },
    maxValue: { type: Number },
    unit: { type: String },
    scoringType: {
      type: String,
      enum: ['direct', 'lookup', 'formula'],
      default: 'lookup'
    },
    scoringValues: { type: Schema.Types.Mixed },
    formula: { type: String },
    conditionalOn: { type: Schema.Types.Mixed },
    skipIf: { type: Schema.Types.Mixed },
    required: { type: Boolean, default: true }
  },
  { _id: false }
);

const AssessmentTemplateSchema = new Schema<IAssessmentTemplate>(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(AssessmentType),
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    version: {
      type: String,
      required: true,
      default: '1.0.0'
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    questions: {
      type: [TemplateQuestionSchema],
      required: true
    },
    scoring: {
      type: {
        method: {
          type: String,
          enum: ['sum', 'weighted', 'formula'],
          required: true
        },
        weights: { type: Schema.Types.Mixed },
        formula: { type: String },
        reverseScoring: { type: Schema.Types.Mixed }
      },
      required: true
    },
    thresholds: {
      type: {
        low: { type: Number, required: true },
        medium: { type: Number },
        high: { type: Number },
        veryHigh: { type: Number },
        customThresholds: { type: Schema.Types.Mixed }
      },
      required: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    specialty: { type: String },
    applicableSpecialties: { type: [String], default: [] },
    estimatedDuration: {
      type: Number,
      default: 15 // minutes
    },
    requiredTraining: { type: String },
    requiredFields: {
      type: [String],
      default: ['patientId', 'assessorId', 'date', 'responses']
    },
    optionalFields: {
      type: [String],
      default: ['notes', 'department', 'facilityId']
    },
    source: { type: String },
    lastValidated: { type: Date }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

AssessmentTemplateSchema.index({ type: 1, version: 1 });
AssessmentTemplateSchema.index({ category: 1, isActive: 1 });
AssessmentTemplateSchema.index({ applicableSpecialties: 1 });

export const AssessmentTemplate: Model<IAssessmentTemplate> = mongoose.model<IAssessmentTemplate>(
  'AssessmentTemplate',
  AssessmentTemplateSchema
);

/**
 * Assessment History Schema
 * Lightweight historical record for quick trend analysis
 */
export interface IAssessmentHistory extends Document {
  patientId: string;
  type: AssessmentType;
  assessmentId: string;

  // Key metrics for quick retrieval
  date: Date;
  score: number;
  maxScore: number;
  riskLevel: RiskLevel;

  // Change tracking
  scoreChange?: number;
  riskLevelChanged: boolean;
  previousAssessmentId?: string;

  // Quick flags
  flagged: boolean;
  flagReason?: string;

  createdAt: Date;
}

const AssessmentHistorySchema = new Schema<IAssessmentHistory>(
  {
    patientId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(AssessmentType),
      required: true,
      index: true
    },
    assessmentId: {
      type: String,
      required: true,
      unique: true
    },
    date: {
      type: Date,
      required: true,
      index: true
    },
    score: {
      type: Number,
      required: true
    },
    maxScore: {
      type: Number,
      required: true
    },
    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true
    },
    scoreChange: {
      type: Number
    },
    riskLevelChanged: {
      type: Boolean,
      default: false
    },
    previousAssessmentId: {
      type: String
    },
    flagged: {
      type: Boolean,
      default: false,
      index: true
    },
    flagReason: {
      type: String
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Compound indexes for efficient history queries
AssessmentHistorySchema.index({ patientId: 1, type: 1, date: -1 });
AssessmentHistorySchema.index({ patientId: 1, date: -1 });
AssessmentHistorySchema.index({ flagged: 1, type: 1 });

export const AssessmentHistory: Model<IAssessmentHistory> = mongoose.model<IAssessmentHistory>(
  'AssessmentHistory',
  AssessmentHistorySchema
);

/**
 * Assessment Audit Log Schema
 * Tracks all changes to assessments for compliance
 */
export interface IAssessmentAuditLog extends Document {
  auditId: string;
  assessmentId: string;
  patientId: string;

  action: 'created' | 'updated' | 'completed' | 'cancelled' | 'flagged' | 'viewed';
  performedBy: string;
  performedByName?: string;

  changes?: {
    field: string;
    oldValue: mongoose.Types.Mixed;
    newValue: mongoose.Types.Mixed;
  }[];

  metadata?: Record<string, mongoose.Types.Mixed>;

  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

const AssessmentAuditLogSchema = new Schema<IAssessmentAuditLog>(
  {
    auditId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    assessmentId: {
      type: String,
      required: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ['created', 'updated', 'completed', 'cancelled', 'flagged', 'viewed'],
      required: true
    },
    performedBy: {
      type: String,
      required: true
    },
    performedByName: { type: String },
    changes: {
      type: [
        {
          field: { type: String, required: true },
          oldValue: { type: Schema.Types.Mixed },
          newValue: { type: Schema.Types.Mixed }
        }
      ],
      default: undefined
    },
    metadata: { type: Schema.Types.Mixed },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    ipAddress: { type: String },
    userAgent: { type: String }
  },
  {
    timestamps: false
  }
);

AssessmentAuditLogSchema.index({ assessmentId: 1, timestamp: -1 });
AssessmentAuditLogSchema.index({ patientId: 1, timestamp: -1 });
AssessmentAuditLogSchema.index({ performedBy: 1, timestamp: -1 });

export const AssessmentAuditLog: Model<IAssessmentAuditLog> = mongoose.model<IAssessmentAuditLog>(
  'AssessmentAuditLog',
  AssessmentAuditLogSchema
);

// Export all models
export const models = {
  Assessment,
  AssessmentTemplate,
  AssessmentHistory,
  AssessmentAuditLog
};

export default models;
