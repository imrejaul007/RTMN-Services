import mongoose, { Document, Schema, Model } from 'mongoose';

// ============================================================================
// ENUMS & TYPES
// ============================================================================

export enum CarePlanStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

export enum GoalType {
  SHORT_TERM = 'short_term',
  LONG_TERM = 'long_term',
  MAINTENANCE = 'maintenance',
  PREVENTIVE = 'preventive',
  REHABILITATION = 'rehabilitation',
}

export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_TRACK = 'on_track',
  AT_RISK = 'at_risk',
  ACHIEVED = 'achieved',
  PARTIALLY_ACHIEVED = 'partially_achieved',
  NOT_ACHIEVED = 'not_achieved',
}

export enum InterventionType {
  MEDICATION = 'medication',
  THERAPY = 'therapy',
  LIFESTYLE = 'lifestyle',
  EDUCATION = 'education',
  MONITORING = 'monitoring',
  REFERRAL = 'referral',
  PROCEDURE = 'procedure',
  SUPPORT = 'support',
}

export enum NoteType {
  GENERAL = 'general',
  CLINICAL = 'clinical',
  PROGRESS = 'progress',
  CONCERN = 'concern',
  COMMUNICATION = 'communication',
  ASSESSMENT = 'assessment',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

export interface IProgressUpdate {
  value: number;
  note?: string;
  updatedBy: string;
  updatedAt: Date;
}

export interface IMilestone {
  title: string;
  targetDate: Date;
  completed: boolean;
  completedAt?: Date;
  note?: string;
}

export interface IMeasurement {
  metric: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  lastUpdated: Date;
}

export interface IResource {
  type: string;
  description: string;
  url?: string;
  cost?: number;
}

// ============================================================================
// CARE GOAL SCHEMA
// ============================================================================

export interface ICareGoal {
  _id?: mongoose.Types.ObjectId;
  goalId: string;
  type: GoalType;
  description: string;
  status: GoalStatus;
  priority: Priority;
  targetDate: Date;
  startDate: Date;
  completionPercentage: number;
  progressHistory: IProgressUpdate[];
  milestones: IMilestone[];
  measurements: IMeasurement[];
  barriers: string[];
  facilitators: string[];
  notes: string;
  achievedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CareGoalSchema = new Schema<ICareGoal>(
  {
    goalId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(GoalType),
      required: true,
    },
    description: { type: String, required: true, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(GoalStatus),
      default: GoalStatus.NOT_STARTED,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
    },
    targetDate: { type: Date, required: true },
    startDate: { type: Date, required: true },
    completionPercentage: { type: Number, default: 0, min: 0, max: 100 },
    progressHistory: [
      {
        value: { type: Number, required: true },
        note: { type: String },
        updatedBy: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    milestones: [
      {
        title: { type: String, required: true },
        targetDate: { type: Date, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        note: { type: String },
      },
    ],
    measurements: [
      {
        metric: { type: String, required: true },
        currentValue: { type: Number, default: 0 },
        targetValue: { type: Number, required: true },
        unit: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
    barriers: [{ type: String }],
    facilitators: [{ type: String }],
    notes: { type: String, maxlength: 2000 },
    achievedDate: { type: Date },
  },
  { timestamps: true }
);

// ============================================================================
// CARE INTERVENTION SCHEMA
// ============================================================================

export interface ICareIntervention {
  _id?: mongoose.Types.ObjectId;
  interventionId: string;
  type: InterventionType;
  description: string;
  frequency: string;
  duration: string;
  assignedTo: string;
  assignedToRole?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  resources: IResource[];
  instructions: string;
  expectedOutcome: string;
  actualOutcome?: string;
  notes: string;
  reminders?: {
    enabled: boolean;
    frequency: string;
    times: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

const CareInterventionSchema = new Schema<ICareIntervention>(
  {
    interventionId: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: Object.values(InterventionType),
      required: true,
    },
    description: { type: String, required: true, maxlength: 1000 },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    assignedTo: { type: String, required: true },
    assignedToRole: { type: String },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    resources: [
      {
        type: { type: String, required: true },
        description: { type: String, required: true },
        url: { type: String },
        cost: { type: Number },
      },
    ],
    instructions: { type: String, maxlength: 2000 },
    expectedOutcome: { type: String, maxlength: 1000 },
    actualOutcome: { type: String, maxlength: 1000 },
    notes: { type: String, maxlength: 2000 },
    reminders: {
      enabled: { type: Boolean, default: false },
      frequency: { type: String },
      times: [{ type: String }],
    },
  },
  { timestamps: true }
);

// ============================================================================
// CARE REVIEW SCHEMA
// ============================================================================

export interface ICareReview {
  _id?: mongoose.Types.ObjectId;
  reviewId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  date: Date;
  type: 'scheduled' | 'unscheduled' | 'milestone' | 'discharge';
  notes: string;
  outcome: 'improving' | 'stable' | 'declining' | 'achieved';
  goalStatuses: {
    goalId: string;
    previousStatus: GoalStatus;
    currentStatus: GoalStatus;
    changeNote?: string;
  }[];
  interventionStatuses: {
    interventionId: string;
    previousStatus: string;
    currentStatus: string;
    changeNote?: string;
  }[];
  recommendations: string[];
  nextReviewDate?: Date;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CareReviewSchema = new Schema<ICareReview>(
  {
    reviewId: { type: String, required: true, unique: true },
    reviewerId: { type: String, required: true },
    reviewerName: { type: String, required: true },
    reviewerRole: { type: String, required: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['scheduled', 'unscheduled', 'milestone', 'discharge'],
      default: 'scheduled',
    },
    notes: { type: String, maxlength: 5000 },
    outcome: {
      type: String,
      enum: ['improving', 'stable', 'declining', 'achieved'],
      required: true,
    },
    goalStatuses: [
      {
        goalId: { type: String, required: true },
        previousStatus: { type: String, required: true },
        currentStatus: { type: String, required: true },
        changeNote: { type: String },
      },
    ],
    interventionStatuses: [
      {
        interventionId: { type: String, required: true },
        previousStatus: { type: String, required: true },
        currentStatus: { type: String, required: true },
        changeNote: { type: String },
      },
    ],
    recommendations: [{ type: String }],
    nextReviewDate: { type: Date },
    attachments: [{ type: String }],
  },
  { timestamps: true }
);

// ============================================================================
// CARE NOTE SCHEMA
// ============================================================================

export interface ICareNote {
  _id?: mongoose.Types.ObjectId;
  noteId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  type: NoteType;
  isPrivate: boolean;
  attachments: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  relatedGoalIds: string[];
  relatedInterventionIds: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CareNoteSchema = new Schema<ICareNote>(
  {
    noteId: { type: String, required: true, unique: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    content: { type: String, required: true, maxlength: 10000 },
    type: {
      type: String,
      enum: Object.values(NoteType),
      default: NoteType.GENERAL,
    },
    isPrivate: { type: Boolean, default: false },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
      },
    ],
    relatedGoalIds: [{ type: String }],
    relatedInterventionIds: [{ type: String }],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// ============================================================================
// CARE PLAN SCHEMA (MAIN)
// ============================================================================

export interface ICarePlan extends Document {
  _id?: mongoose.Types.ObjectId;
  planId: string;
  patientId: string;
  patientName: string;
  title: string;
  description: string;
  status: CarePlanStatus;
  priority: Priority;
  category: string;
  startDate: Date;
  endDate: Date;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
  createdBy: string;
  updatedBy?: string;
  goals: ICareGoal[];
  interventions: ICareIntervention[];
  reviews: ICareReview[];
  notes: ICareNote[];
  riskFactors: string[];
  allergies: string[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    startDate: Date;
    endDate?: Date;
  }[];
  vitals: {
    metric: string;
    lastValue: number;
    unit: string;
    lastUpdated: Date;
  }[];
  consent: {
    obtained: boolean;
    obtainedDate?: Date;
    obtainedBy?: string;
    expiresAt?: Date;
  };
  tags: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CarePlanSchema = new Schema<ICarePlan>(
  {
    planId: { type: String, required: true, unique: true },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    status: {
      type: String,
      enum: Object.values(CarePlanStatus),
      default: CarePlanStatus.DRAFT,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(Priority),
      default: Priority.MEDIUM,
    },
    category: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    lastReviewDate: { type: Date },
    nextReviewDate: { type: Date },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    goals: [CareGoalSchema],
    interventions: [CareInterventionSchema],
    reviews: [CareReviewSchema],
    notes: [CareNoteSchema],
    riskFactors: [{ type: String }],
    allergies: [{ type: String }],
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, required: true },
        frequency: { type: String, required: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date },
      },
    ],
    vitals: [
      {
        metric: { type: String, required: true },
        lastValue: { type: Number, required: true },
        unit: { type: String, required: true },
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
    consent: {
      obtained: { type: Boolean, default: false },
      obtainedDate: { type: Date },
      obtainedBy: { type: String },
      expiresAt: { type: Date },
    },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ============================================================================
// INDEXES
// ============================================================================

CarePlanSchema.index({ patientId: 1, status: 1 });
CarePlanSchema.index({ 'goals.goalId': 1 });
CarePlanSchema.index({ 'interventions.interventionId': 1 });
CarePlanSchema.index({ 'reviews.reviewId': 1 });
CarePlanSchema.index({ 'notes.noteId': 1 });
CarePlanSchema.index({ nextReviewDate: 1 });
CarePlanSchema.index({ endDate: 1 });
CarePlanSchema.index({ tags: 1 });
CarePlanSchema.index({ createdAt: -1 });

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const CarePlan: Model<ICarePlan> = mongoose.model<ICarePlan>(
  'CarePlan',
  CarePlanSchema
);

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================

export {
  CareGoalSchema,
  CareInterventionSchema,
  CareReviewSchema,
  CareNoteSchema,
};

export default CarePlan;
