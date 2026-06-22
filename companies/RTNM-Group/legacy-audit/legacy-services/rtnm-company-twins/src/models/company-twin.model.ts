import mongoose, { Document, Schema, Model } from 'mongoose';

// ============================================
// INTERFACES
// ============================================

export interface IBudget {
  total: number;
  allocated: number;
  remaining: number;
  currency: string;
  fiscalYear: string;
  categories: {
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
  }[];
  lastUpdated: Date;
}

export interface IPolicy {
  policyId: string;
  name: string;
  description: string;
  rules: {
    ruleId: string;
    condition: string;
    action: string;
    priority: number;
  }[];
  status: 'active' | 'inactive' | 'draft';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAIAgent {
  agentId: string;
  name: string;
  type: 'ceo' | 'cfo' | 'cto' | 'coo' | 'cmo' | 'custom';
  capabilities: string[];
  model: string;
  status: 'active' | 'inactive' | 'training';
  permissions: string[];
  restrictions: string[];
  performanceMetrics?: {
    tasksCompleted: number;
    successRate: number;
    avgResponseTime: number;
  };
}

export interface ITrustRules {
  trustLevel: 'minimal' | 'standard' | 'high' | 'maximum';
  verificationRequired: boolean;
  transactionLimits: {
    daily: number;
    monthly: number;
    perTransaction: number;
  };
  requiredApprovals: number;
  autoApproval: boolean;
  kycRequired: boolean;
  complianceLevel: 'basic' | 'standard' | 'enhanced' | 'strict';
}

export interface IRevenueModel {
  type: 'subscription' | 'transaction' | 'subscription_transaction' | 'usage';
  pricing: {
    basePrice: number;
    currency: string;
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
  };
  revenueShare?: {
    percentage: number;
    partner: string;
  };
}

export interface ICostStructure {
  fixed: number;
  variable: number;
  total: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}

export interface IMargins {
  gross: number;
  net: number;
  operating: number;
  target: {
    gross: number;
    net: number;
    operating: number;
  };
}

export interface IGrowthTargets {
  revenue: {
    monthly: number;
    quarterly: number;
    yearly: number;
  };
  customers: {
    new: number;
    retained: number;
    churnRate: number;
  };
  market: {
    shareTarget: number;
    geographicExpansion: string[];
  };
}

export interface ICompanyTwin {
  twinId: string;
  corpId: string;
  name: string;
  type: 'startup' | 'smb' | 'midmarket' | 'enterprise' | 'corporate';
  revenueModel: IRevenueModel;
  costStructure: ICostStructure;
  margins: IMargins;
  growthTargets: IGrowthTargets;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  aiAgent: IAIAgent;
  budget: IBudget;
  policies: IPolicy[];
  trustRules: ITrustRules;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanyTwinDocument extends ICompanyTwin, Document {
  _id: mongoose.Types.ObjectId;
}

// ============================================
// SCHEMAS
// ============================================

const BudgetSchema = new Schema<IBudget>(
  {
    total: { type: Number, required: true, min: 0 },
    allocated: { type: Number, required: true, min: 0 },
    remaining: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'INR' },
    fiscalYear: { type: String, required: true },
    categories: [
      {
        category: { type: String, required: true },
        allocated: { type: Number, required: true, min: 0 },
        spent: { type: Number, required: true, min: 0 },
        remaining: { type: Number, required: true, min: 0 },
      },
    ],
    lastUpdated: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PolicyRuleSchema = new Schema(
  {
    ruleId: { type: String, required: true },
    condition: { type: String, required: true },
    action: { type: String, required: true },
    priority: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const PolicySchema = new Schema<IPolicy>(
  {
    policyId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    rules: [PolicyRuleSchema],
    status: { type: String, enum: ['active', 'inactive', 'draft'], default: 'draft' },
  },
  { _id: false }
);

const AIAgentPerformanceSchema = new Schema(
  {
    tasksCompleted: { type: Number, default: 0 },
    successRate: { type: Number, default: 0, min: 0, max: 100 },
    avgResponseTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const AIAgentSchema = new Schema<IAIAgent>(
  {
    agentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['ceo', 'cfo', 'cto', 'coo', 'cmo', 'custom'],
      required: true,
    },
    capabilities: [{ type: String }],
    model: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive', 'training'], default: 'training' },
    permissions: [{ type: String }],
    restrictions: [{ type: String }],
    performanceMetrics: AIAgentPerformanceSchema,
  },
  { _id: false }
);

const TrustRulesSchema = new Schema<ITrustRules>(
  {
    trustLevel: {
      type: String,
      enum: ['minimal', 'standard', 'high', 'maximum'],
      default: 'standard',
    },
    verificationRequired: { type: Boolean, default: true },
    transactionLimits: {
      daily: { type: Number, required: true, min: 0 },
      monthly: { type: Number, required: true, min: 0 },
      perTransaction: { type: Number, required: true, min: 0 },
    },
    requiredApprovals: { type: Number, default: 1, min: 0 },
    autoApproval: { type: Boolean, default: false },
    kycRequired: { type: Boolean, default: true },
    complianceLevel: {
      type: String,
      enum: ['basic', 'standard', 'enhanced', 'strict'],
      default: 'standard',
    },
  },
  { _id: false }
);

const RevenueModelSchema = new Schema<IRevenueModel>(
  {
    type: {
      type: String,
      enum: ['subscription', 'transaction', 'subscription_transaction', 'usage'],
      required: true,
    },
    pricing: {
      basePrice: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'INR' },
      billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], required: true },
    },
    revenueShare: {
      percentage: { type: Number, min: 0, max: 100 },
      partner: { type: String },
    },
  },
  { _id: false }
);

const CostBreakdownSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    percentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const CostStructureSchema = new Schema<ICostStructure>(
  {
    fixed: { type: Number, required: true, min: 0 },
    variable: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    breakdown: [CostBreakdownSchema],
  },
  { _id: false }
);

const MarginsSchema = new Schema<IMargins>(
  {
    gross: { type: Number, required: true },
    net: { type: Number, required: true },
    operating: { type: Number, required: true },
    target: {
      gross: { type: Number, required: true },
      net: { type: Number, required: true },
      operating: { type: Number, required: true },
    },
  },
  { _id: false }
);

const GrowthTargetsSchema = new Schema<IGrowthTargets>(
  {
    revenue: {
      monthly: { type: Number, required: true, min: 0 },
      quarterly: { type: Number, required: true, min: 0 },
      yearly: { type: Number, required: true, min: 0 },
    },
    customers: {
      new: { type: Number, required: true, min: 0 },
      retained: { type: Number, required: true, min: 0 },
      churnRate: { type: Number, required: true, min: 0, max: 100 },
    },
    market: {
      shareTarget: { type: Number, required: true, min: 0, max: 100 },
      geographicExpansion: [{ type: String }],
    },
  },
  { _id: false }
);

// ============================================
// MAIN COMPANY TWIN SCHEMA
// ============================================

const CompanyTwinSchema = new Schema<ICompanyTwinDocument>(
  {
    twinId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['startup', 'smb', 'midmarket', 'enterprise', 'corporate'],
      required: true,
    },
    revenueModel: {
      type: RevenueModelSchema,
      required: true,
    },
    costStructure: {
      type: CostStructureSchema,
      required: true,
    },
    margins: {
      type: MarginsSchema,
      required: true,
    },
    growthTargets: {
      type: GrowthTargetsSchema,
      required: true,
    },
    riskTolerance: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate',
    },
    aiAgent: {
      type: AIAgentSchema,
      required: true,
    },
    budget: {
      type: BudgetSchema,
      required: true,
    },
    policies: [PolicySchema],
    trustRules: {
      type: TrustRulesSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending'],
      default: 'pending',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

// ============================================
// INDEXES
// ============================================

CompanyTwinSchema.index({ status: 1, createdAt: -1 });
CompanyTwinSchema.index({ 'budget.fiscalYear': 1 });
CompanyTwinSchema.index({ 'aiAgent.status': 1 });
CompanyTwinSchema.index({ 'trustRules.trustLevel': 1 });

// ============================================
// MODEL
// ============================================

export const CompanyTwin: Model<ICompanyTwinDocument> = mongoose.model<ICompanyTwinDocument>(
  'CompanyTwin',
  CompanyTwinSchema
);

// ============================================
// HELPER FUNCTIONS
// ============================================

export function createDefaultBudget(fiscalYear: string): IBudget {
  const currentYear = fiscalYear || new Date().getFullYear().toString();
  return {
    total: 0,
    allocated: 0,
    remaining: 0,
    currency: 'INR',
    fiscalYear: currentYear,
    categories: [],
    lastUpdated: new Date(),
  };
}

export function createDefaultTrustRules(): ITrustRules {
  return {
    trustLevel: 'standard',
    verificationRequired: true,
    transactionLimits: {
      daily: 100000,
      monthly: 1000000,
      perTransaction: 50000,
    },
    requiredApprovals: 1,
    autoApproval: false,
    kycRequired: true,
    complianceLevel: 'standard',
  };
}

export function createDefaultAIAgent(name: string, type: IAIAgent['type']): IAIAgent {
  return {
    agentId: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name,
    type: type,
    capabilities: [],
    model: 'gpt-4',
    status: 'training',
    permissions: [],
    restrictions: [],
    performanceMetrics: {
      tasksCompleted: 0,
      successRate: 0,
      avgResponseTime: 0,
    },
  };
}

export function createDefaultMargins(): IMargins {
  return {
    gross: 0,
    net: 0,
    operating: 0,
    target: {
      gross: 30,
      net: 10,
      operating: 15,
    },
  };
}

export function createDefaultGrowthTargets(): IGrowthTargets {
  return {
    revenue: {
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    },
    customers: {
      new: 0,
      retained: 0,
      churnRate: 0,
    },
    market: {
      shareTarget: 0,
      geographicExpansion: [],
    },
  };
}
