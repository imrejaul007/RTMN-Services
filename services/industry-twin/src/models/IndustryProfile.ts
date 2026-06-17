import mongoose, { Document, Schema } from 'mongoose';

// Industry types supported by the system
export type IndustryType =
  | 'restaurant'
  | 'hotel'
  | 'healthcare'
  | 'retail'
  | 'manufacturing'
  | 'fintech';

// Common issues that can occur in any industry
export interface CommonIssue {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  solutions: string[];
  preventionTips: string[];
}

// Best practices for an industry
export interface BestPractice {
  category: string;
  title: string;
  description: string;
  implementationSteps: string[];
  expectedOutcome: string;
  keyMetrics: string[];
}

// Key performance indicators for an industry
export interface KPI {
  name: string;
  description: string;
  formula: string;
  benchmark: number;
  unit: 'percentage' | 'currency' | 'count' | 'days' | 'hours';
  category: 'efficiency' | 'quality' | 'growth' | 'financial' | 'customer';
}

// Technology stack recommendations
export interface TechRecommendation {
  category: string;
  tools: string[];
  description: string;
  priority: 'essential' | 'recommended' | 'optional';
}

// Industry profile interface
export interface IIndustryProfile extends Document {
  tenantId: string;
  industryType: IndustryType;
  name: string;
  description: string;
  commonIssues: CommonIssue[];
  bestPractices: BestPractice[];
  kpis: KPI[];
  techRecommendations: TechRecommendation[];
  maturityLevel: 'emerging' | 'developing' | 'established' | 'advanced';
  trends: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Schema definition
const IndustryProfileSchema = new Schema<IIndustryProfile>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    industryType: {
      type: String,
      required: true,
      enum: ['restaurant', 'hotel', 'healthcare', 'retail', 'manufacturing', 'fintech'],
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
    commonIssues: [{
      category: { type: String, required: true },
      description: { type: String, required: true },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      solutions: [{ type: String }],
      preventionTips: [{ type: String }]
    }],
    bestPractices: [{
      category: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      implementationSteps: [{ type: String }],
      expectedOutcome: { type: String },
      keyMetrics: [{ type: String }]
    }],
    kpis: [{
      name: { type: String, required: true },
      description: { type: String, required: true },
      formula: { type: String, required: true },
      benchmark: { type: Number, default: 0 },
      unit: {
        type: String,
        enum: ['percentage', 'currency', 'count', 'days', 'hours'],
        default: 'percentage'
      },
      category: {
        type: String,
        enum: ['efficiency', 'quality', 'growth', 'financial', 'customer'],
        default: 'efficiency'
      }
    }],
    techRecommendations: [{
      category: { type: String, required: true },
      tools: [{ type: String }],
      description: { type: String },
      priority: {
        type: String,
        enum: ['essential', 'recommended', 'optional'],
        default: 'recommended'
      }
    }],
    maturityLevel: {
      type: String,
      enum: ['emerging', 'developing', 'established', 'advanced'],
      default: 'developing'
    },
    trends: [{ type: String }]
  },
  {
    timestamps: true,
    collection: 'industry_profiles'
  }
);

// Compound indexes for common queries
IndustryProfileSchema.index({ tenantId: 1, industryType: 1 }, { unique: true });

// Instance methods
IndustryProfileSchema.methods.getCriticalIssues = function(): CommonIssue[] {
  return this.commonIssues.filter(issue => issue.severity === 'critical');
};

IndustryProfileSchema.methods.getKpisByCategory = function(category: KPI['category']): KPI[] {
  return this.kpis.filter(kpi => kpi.category === category);
};

// Static methods
IndustryProfileSchema.statics.findByTenantAndType = function(
  tenantId: string,
  industryType: IndustryType
): Promise<IIndustryProfile | null> {
  return this.findOne({ tenantId, industryType });
};

IndustryProfileSchema.statics.findByTenant = function(tenantId: string): Promise<IIndustryProfile[]> {
  return this.find({ tenantId });
};

export const IndustryProfile = mongoose.model<IIndustryProfile>('IndustryProfile', IndustryProfileSchema);

export default IndustryProfile;
