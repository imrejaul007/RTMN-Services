import mongoose, { Schema, Document } from 'mongoose';

export interface IBriefingDocument extends Document {
  id: string;
  tenantId: string;
  date: Date;
  generatedAt: Date;
  status: 'draft' | 'generating' | 'completed' | 'failed' | 'sent';
  summary: {
    headline: string;
    keyHighlights: string[];
    executiveSummary: string;
    quickWins: {
      title: string;
      impact: string;
      effort: string;
      action: string;
    }[];
  };
  riskAnalysis: {
    overallRiskScore: number;
    riskLevel: string;
    risks: {
      id: string;
      category: string;
      title: string;
      description: string;
      severity: string;
      score: number;
      affectedAreas: string[];
      indicators: string[];
      recommendedActions: string[];
      trend: string;
      detectedAt: Date;
    }[];
    trendingRisks: {
      id: string;
      category: string;
      title: string;
      description: string;
      severity: string;
      score: number;
      affectedAreas: string[];
      indicators: string[];
      recommendedActions: string[];
      trend: string;
      detectedAt: Date;
    }[];
  };
  opportunities: {
    totalOpportunities: number;
    opportunities: {
      id: string;
      type: string;
      title: string;
      description: string;
      potentialValue: number;
      confidence: number;
      timeline: string;
      category: string;
      actionItems: string[];
      roi?: number;
      estimatedEffort: string;
      detectedAt: Date;
    }[];
    topPriority: {
      id: string;
      type: string;
      title: string;
      description: string;
      potentialValue: number;
      confidence: number;
      timeline: string;
      category: string;
      actionItems: string[];
      roi?: number;
      estimatedEffort: string;
      detectedAt: Date;
    }[];
  };
  recommendations: {
    id: string;
    category: string;
    priority: string;
    title: string;
    description: string;
    rationale: string;
    expectedImpact: string;
    effort: string;
    timeline: string;
    metrics: {
      potentialRevenue?: number;
      potentialSavings?: number;
      riskReduction?: number;
      customerImpact?: number;
      efficiencyGain?: number;
    };
    relatedOpportunities?: string[];
    relatedRisks?: string[];
    generatedAt: Date;
  }[];
  pendingApprovals: {
    id: string;
    type: string;
    title: string;
    requester: string;
    requestedAt: Date;
    priority: string;
    amount?: number;
    description: string;
    status: string;
    history: {
      action: string;
      actor: string;
      timestamp: Date;
      comment?: string;
    }[];
  }[];
  alerts: {
    total: number;
    critical: number;
    warnings: number;
    byCategory: Record<string, number>;
  }[];
  metrics: {
    revenue: { value: number; change: number; trend: string; target?: number };
    customers: { value: number; change: number; trend: string; target?: number };
    operations: { value: number; change: number; trend: string; target?: number };
    market: { value: number; change: number; trend: string; target?: number };
  };
  deliveryStatus: {
    channel: string;
    status: string;
    sentAt?: Date;
    deliveredAt?: Date;
    error?: string;
  }[];
  metadata: {
    dataSources: string[];
    confidence: number;
    processingTime: number;
    version: string;
  };
}

const QuickWinSchema = new Schema({
  title: { type: String, required: true },
  impact: { type: String, required: true },
  effort: { type: String, enum: ['low', 'medium', 'high'], required: true },
  action: { type: String, required: true }
}, { _id: false });

const MetricDataSchema = new Schema({
  value: { type: Number, required: true },
  change: { type: Number, required: true },
  trend: { type: String, enum: ['up', 'down', 'stable'], required: true },
  target: { type: Number }
}, { _id: false });

const BriefingSchema = new Schema<IBriefingDocument>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  date: { type: Date, required: true, index: true },
  generatedAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['draft', 'generating', 'completed', 'failed', 'sent'],
    default: 'draft'
  },
  summary: {
    headline: { type: String, required: true },
    keyHighlights: [{ type: String }],
    executiveSummary: { type: String, required: true },
    quickWins: [QuickWinSchema]
  },
  riskAnalysis: {
    overallRiskScore: { type: Number, required: true },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    risks: [{
      id: String,
      category: String,
      title: String,
      description: String,
      severity: String,
      score: Number,
      affectedAreas: [String],
      indicators: [String],
      recommendedActions: [String],
      trend: String,
      detectedAt: Date
    }],
    trendingRisks: [{
      id: String,
      category: String,
      title: String,
      description: String,
      severity: String,
      score: Number,
      affectedAreas: [String],
      indicators: [String],
      recommendedActions: [String],
      trend: String,
      detectedAt: Date
    }]
  },
  opportunities: {
    totalOpportunities: Number,
    opportunities: [{
      id: String,
      type: String,
      title: String,
      description: String,
      potentialValue: Number,
      confidence: Number,
      timeline: String,
      category: String,
      actionItems: [String],
      roi: Number,
      estimatedEffort: String,
      detectedAt: Date
    }],
    topPriority: [{
      id: String,
      type: String,
      title: String,
      description: String,
      potentialValue: Number,
      confidence: Number,
      timeline: String,
      category: String,
      actionItems: [String],
      roi: Number,
      estimatedEffort: String,
      detectedAt: Date
    }]
  },
  recommendations: [{
    id: String,
    category: String,
    priority: String,
    title: String,
    description: String,
    rationale: String,
    expectedImpact: String,
    effort: String,
    timeline: String,
    metrics: {
      potentialRevenue: Number,
      potentialSavings: Number,
      riskReduction: Number,
      customerImpact: Number,
      efficiencyGain: Number
    },
    relatedOpportunities: [String],
    relatedRisks: [String],
    generatedAt: Date
  }],
  pendingApprovals: [{
    id: String,
    type: String,
    title: String,
    requester: String,
    requestedAt: Date,
    priority: String,
    amount: Number,
    description: String,
    status: String,
    history: [{
      action: String,
      actor: String,
      timestamp: Date,
      comment: String
    }]
  }],
  alerts: [{
    total: Number,
    critical: Number,
    warnings: Number,
    byCategory: Schema.Types.Mixed
  }],
  metrics: {
    revenue: MetricDataSchema,
    customers: MetricDataSchema,
    operations: MetricDataSchema,
    market: MetricDataSchema
  },
  deliveryStatus: [{
    channel: String,
    status: String,
    sentAt: Date,
    deliveredAt: Date,
    error: String
  }],
  metadata: {
    dataSources: [String],
    confidence: Number,
    processingTime: Number,
    version: String
  }
}, {
  timestamps: true,
  collection: 'briefings'
});

// Compound indexes for efficient queries
BriefingSchema.index({ tenantId: 1, date: -1 });
BriefingSchema.index({ tenantId: 1, status: 1 });
BriefingSchema.index({ generatedAt: -1 });

export const BriefingModel = mongoose.model<IBriefingDocument>('Briefing', BriefingSchema);
