import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// ENUMS / TYPE DEFINITIONS
// ============================================

export enum StepType {
  FOLLOWUP = 'followup',
  REMINDER = 'reminder',
  APPOINTMENT = 'appointment',
  MEDICATION = 'medication',
  TASK = 'task',
  MEETING = 'meeting',
  PAYMENT = 'payment',
  DOCUMENT = 'document',
  CALL = 'call',
  EMAIL = 'email',
  REVIEW = 'review',
  CHECK_IN = 'check_in',
  DEADLINE = 'deadline',
  RENEWAL = 'renewal',
  FEEDBACK = 'feedback',
  ONBOARDING = 'onboarding',
  CUSTOM = 'custom'
}

export enum StepPriority {
  URGENT = 'urgent',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

export enum ReminderChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum ReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom'
}

// ============================================
// INTERFACES
// ============================================

export interface IStepSchedule {
  type: ReminderFrequency;
  time: string; // HH:mm format
  timezone: string;
  startDate?: Date;
  endDate?: Date;
  customDays?: number[]; // 0-6 for days of week
  customInterval?: number; // hours/days interval
  snoozeDuration?: number; // minutes
}

export interface IReminderChannel {
  channel: ReminderChannel;
  enabled: boolean;
  templateId?: string;
  lastNotifiedAt?: Date;
  notificationCount: number;
}

export interface IReminderSettings {
  channels: IReminderChannel[];
  leadTimeMinutes: number;
  repeatBefore?: number; // repeat reminder X minutes before
}

export interface ICompletionDetails {
  completedAt: Date;
  completedBy?: string;
  completionMethod: 'manual' | 'automated' | 'ai_suggested';
  notes?: string;
  attachments?: string[];
  feedback?: {
    rating?: number;
    comment?: string;
  };
}

export interface INextStep {
  stepId: string;
  customerId: string;
  tenantId: string;

  // Content
  title: string;
  description?: string;
  extractedFrom?: string; // conversation ID, issue ID, etc.
  rawExtractedText?: string;

  // Classification
  stepType: StepType;
  priority: StepPriority;
  status: StepStatus;

  // Scheduling
  dueDate?: Date;
  scheduledFor?: Date;
  schedule: IStepSchedule;

  // Reminders
  reminderSettings: IReminderSettings;
  nextReminderAt?: Date;
  lastReminderAt?: Date;

  // Metadata
  relatedEntityType?: string; // 'order', 'appointment', 'ticket', etc.
  relatedEntityId?: string;
  tags?: string[];
  category?: string;

  // AI Predictions
  predictedCompletionTime?: Date;
  completionConfidence?: number; // 0-1
  aiSuggestions?: string[];

  // Tracking
  completion?: ICompletionDetails;
  snoozeHistory?: Array<{
    snoozedAt: Date;
    originalDueDate: Date;
    newDueDate: Date;
    reason?: string;
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;

  // Source tracking
  sourceService: string; // which service created this step
  confidence: number; // extraction confidence 0-1
}

// ============================================
// MONGOOSE SCHEMA
// ============================================

const StepScheduleSchema = new Schema<IStepSchedule>(
  {
    type: {
      type: String,
      enum: Object.values(ReminderFrequency),
      required: true
    },
    time: { type: String, default: '09:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    startDate: { type: Date },
    endDate: { type: Date },
    customDays: [{ type: Number, min: 0, max: 6 }],
    customInterval: { type: Number },
    snoozeDuration: { type: Number, default: 15 } // 15 minutes default
  },
  { _id: false }
);

const ReminderChannelSchema = new Schema<IReminderChannel>(
  {
    channel: {
      type: String,
      enum: Object.values(ReminderChannel),
      required: true
    },
    enabled: { type: Boolean, default: true },
    templateId: { type: String },
    lastNotifiedAt: { type: Date },
    notificationCount: { type: Number, default: 0 }
  },
  { _id: false }
);

const ReminderSettingsSchema = new Schema<IReminderSettings>(
  {
    channels: [ReminderChannelSchema],
    leadTimeMinutes: { type: Number, default: 30 },
    repeatBefore: { type: Number }
  },
  { _id: false }
);

const SnoozeHistorySchema = new Schema(
  {
    snoozedAt: { type: Date, required: true },
    originalDueDate: { type: Date, required: true },
    newDueDate: { type: Date, required: true },
    reason: { type: String }
  },
  { _id: false }
);

const CompletionDetailsSchema = new Schema<ICompletionDetails>(
  {
    completedAt: { type: Date, required: true },
    completedBy: { type: String },
    completionMethod: {
      type: String,
      enum: ['manual', 'automated', 'ai_suggested'],
      required: true
    },
    notes: { type: String },
    attachments: [{ type: String }],
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String }
    }
  },
  { _id: false }
);

const NextStepSchema = new Schema<INextStep>(
  {
    stepId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },

    // Content
    title: {
      type: String,
      required: true,
      maxlength: 500
    },
    description: { type: String, maxlength: 2000 },
    extractedFrom: { type: String },
    rawExtractedText: { type: String, maxlength: 5000 },

    // Classification
    stepType: {
      type: String,
      enum: Object.values(StepType),
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(StepPriority),
      required: true,
      default: StepPriority.MEDIUM,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(StepStatus),
      required: true,
      default: StepStatus.PENDING,
      index: true
    },

    // Scheduling
    dueDate: { type: Date, index: true },
    scheduledFor: { type: Date, index: true },
    schedule: {
      type: StepScheduleSchema,
      required: true,
      default: () => ({
        type: ReminderFrequency.ONCE,
        time: '09:00',
        timezone: 'Asia/Kolkata'
      })
    },

    // Reminders
    reminderSettings: {
      type: ReminderSettingsSchema,
      default: () => ({
        channels: [
          { channel: ReminderChannel.WHATSAPP, enabled: true },
          { channel: ReminderChannel.PUSH, enabled: true }
        ],
        leadTimeMinutes: 30
      })
    },
    nextReminderAt: { type: Date, index: true },
    lastReminderAt: { type: Date },

    // Metadata
    relatedEntityType: { type: String, index: true },
    relatedEntityId: { type: String },
    tags: [{ type: String }],
    category: { type: String },

    // AI Predictions
    predictedCompletionTime: { type: Date },
    completionConfidence: { type: Number, min: 0, max: 1 },
    aiSuggestions: [{ type: String }],

    // Tracking
    completion: { type: CompletionDetailsSchema },
    snoozeHistory: [SnoozeHistorySchema],

    // Source
    sourceService: { type: String, required: true },
    confidence: { type: Number, min: 0, max: 1, default: 0.8 }
  },
  {
    timestamps: true,
    collection: 'next_steps'
  }
);

// ============================================
// INDEXES
// ============================================

NextStepSchema.index({ customerId: 1, status: 1 });
NextStepSchema.index({ customerId: 1, dueDate: 1 });
NextStepSchema.index({ customerId: 1, nextReminderAt: 1 });
NextStepSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
NextStepSchema.index({ nextReminderAt: 1, status: 1 }, { sparse: true });
NextStepSchema.index({ status: 1, dueDate: 1 });

// TTL index to auto-delete completed steps after 90 days
NextStepSchema.index(
  { completedAt: 1 },
  { expireAfterSeconds: 7776000, partialFilterExpression: { completedAt: { $exists: true } } }
);

// ============================================
// METHODS
// ============================================

NextStepSchema.methods.markOverdue = async function (): Promise<void> {
  if (this.status === StepStatus.PENDING && this.dueDate && new Date() > this.dueDate) {
    this.status = StepStatus.OVERDUE;
    await this.save();
  }
};

NextStepSchema.methods.canSnooze = function (): boolean {
  return [StepStatus.PENDING, StepStatus.OVERDUE].includes(this.status as StepStatus);
};

NextStepSchema.methods.canComplete = function (): boolean {
  return [StepStatus.PENDING, StepStatus.IN_PROGRESS, StepStatus.OVERDUE].includes(this.status as StepStatus);
};

// ============================================
// STATICS
// ============================================

NextStepSchema.statics.findByCustomer = function (
  customerId: string,
  filters?: {
    status?: StepStatus[];
    priority?: StepPriority[];
    stepType?: StepType[];
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    skip?: number;
  }
) {
  const query: Record<string, unknown> = { customerId };

  if (filters?.status?.length) query.status = { $in: filters.status };
  if (filters?.priority?.length) query.priority = { $in: filters.priority };
  if (filters?.stepType?.length) query.stepType = { $in: filters.stepType };
  if (filters?.fromDate || filters?.toDate) {
    query.dueDate = {};
    if (filters.fromDate) (query.dueDate as Record<string, Date>).$gte = filters.fromDate;
    if (filters.toDate) (query.dueDate as Record<string, Date>).$lte = filters.toDate;
  }

  return this.find(query)
    .sort({ dueDate: 1, priority: 1 })
    .limit(filters?.limit || 50)
    .skip(filters?.skip || 0);
};

NextStepSchema.statics.findUpcoming = function (customerId: string, hoursAhead = 24) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  return this.find({
    customerId,
    status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS] },
    nextReminderAt: { $gte: now, $lte: futureDate }
  }).sort({ nextReminderAt: 1 });
};

NextStepSchema.statics.findOverdue = function (customerId?: string) {
  const query: Record<string, unknown> = {
    status: { $in: [StepStatus.PENDING, StepStatus.OVERDUE] },
    dueDate: { $lt: new Date() }
  };
  if (customerId) query.customerId = customerId;

  return this.find(query).sort({ dueDate: 1 });
};

NextStepSchema.statics.getDueForReminder = function (batchSize = 100) {
  return this.find({
    status: { $in: [StepStatus.PENDING, StepStatus.IN_PROGRESS, StepStatus.OVERDUE] },
    nextReminderAt: { $lte: new Date() }
  })
    .limit(batchSize)
    .sort({ nextReminderAt: 1 });
};

// ============================================
// EXPORTS
// ============================================

export interface NextStepDocument extends Omit<INextStep, '_id'>, Document {}

export const NextStepModel = mongoose.model<NextStepDocument>('NextStep', NextStepSchema);

// ============================================
// PROACTIVE ALERT MODEL
// ============================================

export interface IProactiveAlert {
  alertId: string;
  customerId: string;
  stepId?: string;

  alertType: 'upcoming' | 'overdue' | 'predicted' | 'abandoned' | 'follow_up';
  title: string;
  message: string;

  channels: ReminderChannel[];
  sentAt?: Date;
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';

  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ProactiveAlertSchema = new Schema<IProactiveAlert>(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    customerId: { type: String, required: true, index: true },
    stepId: { type: String, index: true },
    alertType: {
      type: String,
      enum: ['upcoming', 'overdue', 'predicted', 'abandoned', 'follow_up'],
      required: true
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    channels: [{ type: String, enum: Object.values(ReminderChannel) }],
    sentAt: { type: Date },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
      default: 'pending'
    },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: false, collection: 'proactive_alerts' }
);

ProactiveAlertSchema.index({ customerId: 1, alertType: 1, createdAt: -1 });
ProactiveAlertSchema.index({ alertId: 1, deliveryStatus: 1 });

export interface ProactiveAlertDocument extends IProactiveAlert, Document {}

export const ProactiveAlertModel = mongoose.model<ProactiveAlertDocument>(
  'ProactiveAlert',
  ProactiveAlertSchema
);

// ============================================
// REMINDER DELIVERY LOG MODEL
// ============================================

export interface IReminderDeliveryLog {
  logId: string;
  stepId: string;
  customerId: string;
  channel: ReminderChannel;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  deliveredAt?: Date;
}

const ReminderDeliveryLogSchema = new Schema<IReminderDeliveryLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    stepId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: Object.values(ReminderChannel),
      required: true
    },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'failed', 'undelivered'],
      required: true
    },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed },
    deliveredAt: { type: Date }
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'reminder_delivery_logs' }
);

ReminderDeliveryLogSchema.index({ stepId: 1, channel: 1 });
ReminderDeliveryLogSchema.index({ customerId: 1, createdAt: -1 });
ReminderDeliveryLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

export interface ReminderDeliveryLogDocument extends IReminderDeliveryLog, Document {}

export const ReminderDeliveryLogModel = mongoose.model<ReminderDeliveryLogDocument>(
  'ReminderDeliveryLog',
  ReminderDeliveryLogSchema
);
