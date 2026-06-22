import mongoose, { Document, Schema, Model } from 'mongoose';

// Enums
export enum IssuePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum IssueStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed'
}

export enum IssueCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  PRODUCT = 'product',
  SHIPPING = 'shipping',
  REFUND = 'refund',
  COMPLAINT = 'complaint',
  GENERAL = 'general',
  COMPLIANCE = 'compliance',
  SECURITY = 'security'
}

export enum ResolutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum EscalationLevel {
  NONE = 'none',
  L1_AGENT = 'l1_agent',
  L2_SPECIALIST = 'l2_specialist',
  L3_EXPERT = 'l3_expert',
  MANAGEMENT = 'management',
  LEGAL = 'legal'
}

export enum StepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed'
}

export enum StepType {
  AGENT_ACTION = 'agent_action',
  CUSTOMER_ACTION = 'customer_action',
  SYSTEM_ACTION = 'system_action',
  WAIT = 'wait',
  CONDITION = 'condition',
  ESCALATION = 'escalation'
}

export enum TemplateCategory {
  COMMON = 'common',
  TECHNICAL = 'technical',
  BILLING = 'billing',
  COMPLIANCE = 'compliance',
  EMERGENCY = 'emergency',
  VIP = 'vip'
}

// Interfaces
export interface IActionItem {
  id: string;
  title: string;
  description: string;
  type: 'agent' | 'customer';
  assignee: string;
  dueDate?: Date;
  priority: IssuePriority;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: Date;
  completedBy?: string;
}

export interface IAgentAction {
  id: string;
  action: string;
  description: string;
  instructions: string;
  tools?: string[];
  expectedOutcome: string;
  estimatedTime: number; // in minutes
  preRequisites?: string[];
}

export interface ICustomerAction {
  id: string;
  action: string;
  description: string;
  instructions: string[];
  expectedTime: number; // in minutes
  canSkip: boolean;
}

export interface IResolutionStep {
  stepNumber: number;
  type: StepType;
  title: string;
  description: string;
  agentAction?: IAgentAction;
  customerAction?: ICustomerAction;
  conditions?: string[];
  estimatedTime: number;
  status: StepStatus;
  completedAt?: Date;
  completedBy?: string;
  notes?: string;
  order: number;
}

export interface ISuccessCriteria {
  description: string;
  type: 'functional' | 'measurable' | 'verifiable';
  targetValue?: string;
  currentValue?: string;
  isMet: boolean;
}

export interface IIssueContext {
  customerId?: string;
  customerTier?: 'free' | 'basic' | 'premium' | 'enterprise';
  product?: string;
  previousIssues?: number;
  customerSatisfaction?: number;
  contractValue?: number;
  slaTier?: 'standard' | 'priority' | 'premium';
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IIssue {
  _id?: mongoose.Types.ObjectId;
  issueId: string;
  title: string;
  description: string;
  category: IssueCategory;
  priority: IssuePriority;
  status: IssueStatus;
  customerId: string;
  agentId?: string;
  context: IIssueContext;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface IResolutionPlan {
  _id?: mongoose.Types.ObjectId;
  planId: string;
  issueId: string;
  customerId: string;
  category: IssueCategory;
  priority: IssuePriority;
  steps: IResolutionStep[];
  actionItems: IActionItem[];
  successCriteria: ISuccessCriteria[];
  estimatedTotalTime: number; // in minutes
  actualTime?: number;
  status: ResolutionStatus;
  escalationLevel?: EscalationLevel;
  escalationReason?: string;
  assignedAgentId?: string;
  templateId?: string;
  confidence: number; // 0-1
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface IResolutionTemplate {
  _id?: mongoose.Types.ObjectId;
  templateId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  applicableCategories: IssueCategory[];
  applicablePriorities: IssuePriority[];
  steps: IResolutionStep[];
  successCriteria: ISuccessCriteria[];
  averageResolutionTime: number;
  successRate: number;
  usageCount: number;
  lastUsedAt?: Date;
  createdBy: string;
  isActive: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IResolutionHistory {
  _id?: mongoose.Types.ObjectId;
  historyId: string;
  planId: string;
  issueId: string;
  customerId: string;
  category: IssueCategory;
  priority: IssuePriority;
  resolution: {
    steps: IResolutionStep[];
    actionItems: IActionItem[];
    successCriteria: ISuccessCriteria[];
    totalTime: number;
    outcome: 'resolved' | 'escalated' | 'closed' | 'cancelled';
    customerFeedback?: {
      rating: number;
      comment?: string;
      resolvedAt: Date;
    };
  };
  lessonsLearned?: string[];
  createdAt: Date;
}

// Mongoose Documents
export interface IIssueDocument extends IIssue, Document {
  _id: mongoose.Types.ObjectId;
}

export interface IResolutionPlanDocument extends IResolutionPlan, Document {
  _id: mongoose.Types.ObjectId;
}

export interface IResolutionTemplateDocument extends IResolutionTemplate, Document {
  _id: mongoose.Types.ObjectId;
}

export interface IResolutionHistoryDocument extends IResolutionHistory, Document {
  _id: mongoose.Types.ObjectId;
}

// Schemas
const ActionItemSchema = new Schema<IActionItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['agent', 'customer'], required: true },
    assignee: { type: String, required: true },
    dueDate: { type: Date },
    priority: { type: String, enum: Object.values(IssuePriority), required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending'
    },
    completedAt: { type: Date },
    completedBy: { type: String }
  },
  { _id: false }
);

const AgentActionSchema = new Schema<IAgentAction>(
  {
    id: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    instructions: { type: String, required: true },
    tools: [{ type: String }],
    expectedOutcome: { type: String, required: true },
    estimatedTime: { type: Number, required: true },
    preRequisites: [{ type: String }]
  },
  { _id: false }
);

const CustomerActionSchema = new Schema<ICustomerAction>(
  {
    id: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, required: true },
    instructions: [{ type: String, required: true }],
    expectedTime: { type: Number, required: true },
    canSkip: { type: Boolean, default: false }
  },
  { _id: false }
);

const ResolutionStepSchema = new Schema<IResolutionStep>(
  {
    stepNumber: { type: Number, required: true },
    type: {
      type: String,
      enum: Object.values(StepType),
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    agentAction: { type: AgentActionSchema },
    customerAction: { type: CustomerActionSchema },
    conditions: [{ type: String }],
    estimatedTime: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(StepStatus),
      default: StepStatus.PENDING
    },
    completedAt: { type: Date },
    completedBy: { type: String },
    notes: { type: String },
    order: { type: Number, required: true }
  },
  { _id: false }
);

const SuccessCriteriaSchema = new Schema<ISuccessCriteria>(
  {
    description: { type: String, required: true },
    type: { type: String, enum: ['functional', 'measurable', 'verifiable'], required: true },
    targetValue: { type: String },
    currentValue: { type: String },
    isMet: { type: Boolean, default: false }
  },
  { _id: false }
);

const IssueContextSchema = new Schema<IIssueContext>(
  {
    customerId: { type: String },
    customerTier: { type: String, enum: ['free', 'basic', 'premium', 'enterprise'] },
    product: { type: String },
    previousIssues: { type: Number, default: 0 },
    customerSatisfaction: { type: Number, min: 0, max: 5 },
    contractValue: { type: Number },
    slaTier: { type: String, enum: ['standard', 'priority', 'premium'] },
    tags: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

// Issue Schema
const IssueSchema = new Schema<IIssueDocument>(
  {
    issueId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(IssueCategory),
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(IssuePriority),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(IssueStatus),
      default: IssueStatus.OPEN,
      index: true
    },
    customerId: { type: String, required: true, index: true },
    agentId: { type: String, index: true },
    context: { type: IssueContextSchema, required: true },
    resolvedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'issues'
  }
);

// Resolution Plan Schema
const ResolutionPlanSchema = new Schema<IResolutionPlanDocument>(
  {
    planId: { type: String, required: true, unique: true, index: true },
    issueId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: Object.values(IssueCategory),
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(IssuePriority),
      required: true
    },
    steps: [ResolutionStepSchema],
    actionItems: [ActionItemSchema],
    successCriteria: [SuccessCriteriaSchema],
    estimatedTotalTime: { type: Number, required: true },
    actualTime: { type: Number },
    status: {
      type: String,
      enum: Object.values(ResolutionStatus),
      default: ResolutionStatus.PENDING,
      index: true
    },
    escalationLevel: {
      type: String,
      enum: Object.values(EscalationLevel)
    },
    escalationReason: { type: String },
    assignedAgentId: { type: String, index: true },
    templateId: { type: String },
    confidence: { type: Number, min: 0, max: 1, default: 0.5 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    completedAt: { type: Date }
  },
  {
    timestamps: true,
    collection: 'resolution_plans'
  }
);

// Resolution Template Schema
const ResolutionTemplateSchema = new Schema<IResolutionTemplateDocument>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: Object.values(TemplateCategory),
      required: true,
      index: true
    },
    applicableCategories: [
      {
        type: String,
        enum: Object.values(IssueCategory)
      }
    ],
    applicablePriorities: [
      {
        type: String,
        enum: Object.values(IssuePriority)
      }
    ],
    steps: [ResolutionStepSchema],
    successCriteria: [SuccessCriteriaSchema],
    averageResolutionTime: { type: Number, default: 0 },
    successRate: { type: Number, min: 0, max: 1, default: 0 },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    tags: [{ type: String }]
  },
  {
    timestamps: true,
    collection: 'resolution_templates'
  }
);

// Resolution History Schema
const CustomerFeedbackSchema = new Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    resolvedAt: { type: Date, required: true }
  },
  { _id: false }
);

const ResolutionHistorySchema = new Schema<IResolutionHistoryDocument>(
  {
    historyId: { type: String, required: true, unique: true, index: true },
    planId: { type: String, required: true, index: true },
    issueId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: Object.values(IssueCategory),
      required: true,
      index: true
    },
    priority: {
      type: String,
      enum: Object.values(IssuePriority),
      required: true
    },
    resolution: {
      steps: [ResolutionStepSchema],
      actionItems: [ActionItemSchema],
      successCriteria: [SuccessCriteriaSchema],
      totalTime: { type: Number, required: true },
      outcome: {
        type: String,
        enum: ['resolved', 'escalated', 'closed', 'cancelled'],
        required: true
      },
      customerFeedback: { type: CustomerFeedbackSchema }
    },
    lessonsLearned: [{ type: String }]
  },
  {
    timestamps: true,
    collection: 'resolution_history'
  }
);

// Compound Indexes
IssueSchema.index({ customerId: 1, createdAt: -1 });
ResolutionPlanSchema.index({ issueId: 1, status: 1 });
ResolutionPlanSchema.index({ assignedAgentId: 1, status: 1 });
ResolutionHistorySchema.index({ customerId: 1, createdAt: -1 });
ResolutionHistorySchema.index({ category: 1, priority: 1 });

// Model Exports
export const Issue: Model<IIssueDocument> = mongoose.model<IIssueDocument>('Issue', IssueSchema);
export const ResolutionPlan: Model<IResolutionPlanDocument> = mongoose.model<IResolutionPlanDocument>(
  'ResolutionPlan',
  ResolutionPlanSchema
);
export const ResolutionTemplate: Model<IResolutionTemplateDocument> = mongoose.model<IResolutionTemplateDocument>(
  'ResolutionTemplate',
  ResolutionTemplateSchema
);
export const ResolutionHistory: Model<IResolutionHistoryDocument> = mongoose.model<IResolutionHistoryDocument>(
  'ResolutionHistory',
  ResolutionHistorySchema
);

// Export all types
export type {
  IIssue,
  IResolutionPlan,
  IResolutionTemplate,
  IResolutionHistory,
  IActionItem,
  IAgentAction,
  ICustomerAction,
  IResolutionStep,
  ISuccessCriteria,
  IIssueContext,
  IIssueDocument,
  IResolutionPlanDocument,
  IResolutionTemplateDocument,
  IResolutionHistoryDocument
};
