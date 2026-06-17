import mongoose, { Document, Schema } from 'mongoose';
import { IndustryType } from './IndustryProfile';

// Challenge type
export interface Challenge {
  category: string;
  description: string;
  impact: string;
  severity: 'low' | 'medium' | 'high';
}

// Solution implemented
export interface Solution {
  approach: string;
  steps: string[];
  timeline: string;
  resources: string[];
  obstacles: string[];
}

// Results achieved
export interface Result {
  metric: string;
  before: number;
  after: number;
  unit: string;
  improvement: string;
  timeframe: string;
}

// Key takeaway
export interface KeyTakeaway {
  category: string;
  insight: string;
  actionable: boolean;
}

// Case study document
export interface ICaseStudy extends Document {
  tenantId: string;
  industryType: IndustryType;
  title: string;
  companyName: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  region: string;
  summary: string;
  challenge: Challenge[];
  solution: Solution;
  results: Result[];
  roi: {
    investment: number;
    return: number;
    paybackPeriod: string;
  };
  keyTakeaways: KeyTakeaway[];
  technologies: string[];
  testimonial?: {
    quote: string;
    author: string;
    role: string;
  };
  tags: string[];
  publishedDate: Date;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CaseStudySchema = new Schema<ICaseStudy>(
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
    title: {
      type: String,
      required: true
    },
    companyName: {
      type: String,
      required: true
    },
    companySize: {
      type: String,
      enum: ['startup', 'small', 'medium', 'large', 'enterprise'],
      default: 'medium'
    },
    region: {
      type: String,
      default: 'global'
    },
    summary: {
      type: String,
      required: true
    },
    challenge: [{
      category: { type: String, required: true },
      description: { type: String, required: true },
      impact: { type: String },
      severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      }
    }],
    solution: {
      approach: { type: String, required: true },
      steps: [{ type: String }],
      timeline: { type: String },
      resources: [{ type: String }],
      obstacles: [{ type: String }]
    },
    results: [{
      metric: { type: String, required: true },
      before: { type: Number, required: true },
      after: { type: Number, required: true },
      unit: { type: String, required: true },
      improvement: { type: String },
      timeframe: { type: String }
    }],
    roi: {
      investment: { type: Number, default: 0 },
      return: { type: Number, default: 0 },
      paybackPeriod: { type: String }
    },
    keyTakeaways: [{
      category: { type: String, required: true },
      insight: { type: String, required: true },
      actionable: { type: Boolean, default: true }
    }],
    technologies: [{ type: String }],
    testimonial: {
      quote: { type: String },
      author: { type: String },
      role: { type: String }
    },
    tags: [{ type: String }],
    publishedDate: {
      type: Date,
      default: Date.now
    },
    featured: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'case_studies'
  }
);

// Indexes
CaseStudySchema.index({ tenantId: 1, industryType: 1 });
CaseStudySchema.index({ industryType: 1, featured: 1 });
CaseStudySchema.index({ tags: 1 });

// Static methods
CaseStudySchema.statics.findByIndustry = function(
  tenantId: string,
  industryType: IndustryType,
  limit?: number
): mongoose.Query<ICaseStudy[]> {
  let query = this.find({ tenantId, industryType }).sort({ publishedDate: -1 });
  if (limit) {
    query = query.limit(limit);
  }
  return query;
};

CaseStudySchema.statics.findFeatured = function(
  industryType: IndustryType,
  limit: number = 5
): Promise<ICaseStudy[]> {
  return this.find({ industryType, featured: true })
    .sort({ publishedDate: -1 })
    .limit(limit);
};

CaseStudySchema.statics.search = function(
  tenantId: string,
  searchTerm: string
): Promise<ICaseStudy[]> {
  const regex = new RegExp(searchTerm, 'i');
  return this.find({
    tenantId,
    $or: [
      { title: regex },
      { summary: regex },
      { tags: regex },
      { companyName: regex }
    ]
  }).sort({ publishedDate: -1 });
};

export const CaseStudy = mongoose.model<ICaseStudy>('CaseStudy', CaseStudySchema);

export default CaseStudy;
