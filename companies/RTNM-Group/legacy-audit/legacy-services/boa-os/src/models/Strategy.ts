import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// STRATEGIC GOAL MODEL
// ============================================

export interface IStrategicGoal extends Document {
  goalId: string;
  title: string;
  description: string;
  type: 'market_expansion' | 'revenue_growth' | 'cost_reduction' | 'operational_efficiency' | 'customer_acquisition' | 'partnership';
  status: 'draft' | 'approved' | 'in_progress' | 'achieved' | 'failed' | 'cancelled';

  // Planning
  planning: {
    quarter: string;  // e.g., "2026-Q2"
    fiscalYear: string;
    horizon: 'short' | 'medium' | 'long';  // <1 year, 1-3 years, 3+ years
    department: string;
    owner: string;
  };

  // Targets
  targets: {
    primary: {
      metric: string;
      currentValue: number;
      targetValue: number;
      unit: string;
      deadline: Date;
    };
    secondary: Array<{
      metric: string;
      currentValue: number;
      targetValue: number;
      unit: string;
    }>;
  };

  // Budget
  budget: {
    allocated: number;
    spent: number;
    currency: string;
    breakdown: Record<string, number>;
  };

  // Risks
  risks: Array<{
    id: string;
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;

  // Dependencies
  dependencies: {
    blockedBy: string[];
    blocks: string[];
  };

  // Execution (SUTAR)
  execution: {
    sutArGoalId?: string;
    status: 'not_started' | 'decomposed' | 'tracking' | 'completed';
    lastSync?: Date;
  };

  // Metrics
  metrics: {
    progress: number;
    lastUpdated: Date;
    healthScore: number;  // 0-100
  };

  // Audit
  createdBy: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    version: number;
    approvedBy?: string;
    approvedAt?: Date;
  };
}

const StrategicGoalSchema = new Schema<IStrategicGoal>({
  goalId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['market_expansion', 'revenue_growth', 'cost_reduction', 'operational_efficiency', 'customer_acquisition', 'partnership'],
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'approved', 'in_progress', 'achieved', 'failed', 'cancelled'],
    default: 'draft'
  },
  planning: {
    quarter: String,
    fiscalYear: String,
    horizon: { type: String, enum: ['short', 'medium', 'long'] },
    department: String,
    owner: String
  },
  targets: {
    primary: {
      metric: String,
      currentValue: Number,
      targetValue: Number,
      unit: String,
      deadline: Date
    },
    secondary: [{
      metric: String,
      currentValue: Number,
      targetValue: Number,
      unit: String
    }]
  },
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    breakdown: { type: Schema.Types.Mixed, default: {} }
  },
  risks: [{
    id: String,
    description: String,
    probability: { type: String, enum: ['low', 'medium', 'high'] },
    impact: { type: String, enum: ['low', 'medium', 'high'] },
    mitigation: String
  }],
  dependencies: {
    blockedBy: [String],
    blocks: [String]
  },
  execution: {
    sutArGoalId: String,
    status: { type: String, enum: ['not_started', 'decomposed', 'tracking', 'completed'], default: 'not_started' },
    lastSync: Date
  },
  metrics: {
    progress: { type: Number, default: 0, min: 0, max: 100 },
    lastUpdated: Date,
    healthScore: { type: Number, default: 100, min: 0, max: 100 }
  },
  createdBy: { type: String, required: true },
  tenantId: { type: String, required: true, index: true },
  metadata: {
    version: { type: Number, default: 1 },
    approvedBy: String,
    approvedAt: Date
  }
}, { timestamps: true });

StrategicGoalSchema.index({ tenantId: 1, status: 1 });
StrategicGoalSchema.index({ tenantId: 1, 'planning.quarter': 1 });

export const StrategicGoal = mongoose.model<IStrategicGoal>('StrategicGoal', StrategicGoalSchema);

// ============================================
// OPPORTUNITY MODEL
// ============================================

export interface IOpportunity extends Document {
  opportunityId: string;
  title: string;
  description: string;
  type: 'market' | 'partnership' | 'acquisition' | 'expansion' | 'optimization';

  // Analysis
  analysis: {
    marketSize?: number;
    marketGrowth?: number;
    competition?: string;
    swot: {
      strengths: string[];
      weaknesses: string[];
      opportunities: string[];
      threats: string[];
    };
  };

  // Financial
  financial: {
    investment: number;
    projectedROI: number;
    paybackPeriod?: number;
    npv?: number;
    irr?: number;
  };

  // Timeline
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      name: string;
      date: Date;
      status: 'pending' | 'completed' | 'delayed';
    }>;
  };

  // Status
  status: 'identified' | 'analyzing' | 'approved' | 'pursuing' | 'won' | 'lost' | 'abandoned';

  // Linked Goals
  linkedGoals: string[];

  // Tenant
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>({
  opportunityId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['market', 'partnership', 'acquisition', 'expansion', 'optimization']
  },
  analysis: {
    marketSize: Number,
    marketGrowth: Number,
    competition: String,
    swot: {
      strengths: [String],
      weaknesses: [String],
      opportunities: [String],
      threats: [String]
    }
  },
  financial: {
    investment: Number,
    projectedROI: Number,
    paybackPeriod: Number,
    npv: Number,
    irr: Number
  },
  timeline: {
    startDate: Date,
    endDate: Date,
    milestones: [{
      name: String,
      date: Date,
      status: { type: String, enum: ['pending', 'completed', 'delayed'] }
    }]
  },
  status: {
    type: String,
    enum: ['identified', 'analyzing', 'approved', 'pursuing', 'won', 'lost', 'abandoned'],
    default: 'identified'
  },
  linkedGoals: [String],
  tenantId: { type: String, required: true, index: true }
}, { timestamps: true });

export const Opportunity = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);

// ============================================
// PORTFOLIO MODEL
// ============================================

export interface IPortfolio extends Document {
  portfolioId: string;
  name: string;
  description: string;

  // Composition
  composition: {
    goals: string[];
    opportunities: string[];
    initiatives: string[];
  };

  // Allocation
  allocation: {
    byType: Record<string, number>;
    byDepartment: Record<string, number>;
    totalBudget: number;
    spentBudget: number;
  };

  // Performance
  performance: {
    overallHealth: number;
    goalAchievementRate: number;
    onBudgetRate: number;
    riskExposure: number;
  };

  // Tenant
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioSchema = new Schema<IPortfolio>({
  portfolioId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,
  composition: {
    goals: [String],
    opportunities: [String],
    initiatives: [String]
  },
  allocation: {
    byType: { type: Schema.Types.Mixed, default: {} },
    byDepartment: { type: Schema.Types.Mixed, default: {} },
    totalBudget: { type: Number, default: 0 },
    spentBudget: { type: Number, default: 0 }
  },
  performance: {
    overallHealth: { type: Number, default: 100 },
    goalAchievementRate: { type: Number, default: 0 },
    onBudgetRate: { type: Number, default: 100 },
    riskExposure: { type: Number, default: 0 }
  },
  tenantId: { type: String, required: true, index: true }
}, { timestamps: true });

export const Portfolio = mongoose.model<IPortfolio>('Portfolio', PortfolioSchema);
