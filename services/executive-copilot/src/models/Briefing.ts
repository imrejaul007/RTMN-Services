import mongoose, { Document, Schema } from 'mongoose';
import { BriefingSection, MetricSnapshot, RiskItem, OpportunityItem, ActionItem } from '../types';

export interface IBriefing extends Document {
  id: string;
  date: string;
  title: string;
  summary: string;
  sections: BriefingSection[];
  metrics: MetricSnapshot;
  risks: RiskItem[];
  opportunities: OpportunityItem[];
  actionItems: ActionItem[];
  generatedAt: Date;
  generatedBy: 'ai' | 'system';
  createdAt: Date;
  updatedAt: Date;
}

const BriefingSectionSchema = new Schema<BriefingSection>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    icon: { type: String },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' }
  },
  { _id: false }
);

const KeyMetricSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    previousValue: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    trend: { type: String, enum: ['up', 'down', 'stable'], required: true },
    target: { type: Number },
    status: { type: String, enum: ['on-track', 'at-risk', 'off-track'] }
  },
  { _id: false }
);

const MetricSnapshotSchema = new Schema<MetricSnapshot>(
  {
    date: { type: String, required: true },
    revenue: { type: Number },
    revenueChange: { type: Number },
    customers: { type: Number },
    customersChange: { type: Number },
    conversionRate: { type: Number },
    conversionChange: { type: Number },
    averageOrderValue: { type: Number },
    aovChange: { type: Number },
    keyMetrics: [KeyMetricSchema]
  },
  { _id: false }
);

const RiskItemSchema = new Schema<RiskItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true
    },
    category: {
      type: String,
      enum: ['operational', 'financial', 'market', 'regulatory', 'strategic'],
      required: true
    },
    impact: { type: String, required: true },
    mitigation: { type: String, required: true },
    owner: { type: String },
    dueDate: { type: String },
    status: {
      type: String,
      enum: ['active', 'mitigated', 'accepted', 'resolved'],
      default: 'active'
    }
  },
  { _id: false }
);

const OpportunityItemSchema = new Schema<OpportunityItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    potential: { type: String, enum: ['high', 'medium', 'low'], required: true },
    category: {
      type: String,
      enum: ['growth', 'efficiency', 'market', 'partnership', 'innovation'],
      required: true
    },
    estimatedValue: { type: Number },
    timeline: { type: String },
    nextSteps: [{ type: String }],
    status: {
      type: String,
      enum: ['identified', 'evaluating', 'pursuing', 'captured'],
      default: 'identified'
    }
  },
  { _id: false }
);

const ActionItemSchema = new Schema<ActionItem>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      required: true
    },
    category: { type: String, required: true },
    owner: { type: String },
    dueDate: { type: String },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'delegated'],
      default: 'pending'
    }
  },
  { _id: false }
);

const BriefingSchema = new Schema<IBriefing>(
  {
    id: { type: String, required: true, unique: true, index: true },
    date: { type: String, required: true, index: true },
    title: { type: String, required: true },
    summary: { type: String, required: true },
    sections: [BriefingSectionSchema],
    metrics: { type: MetricSnapshotSchema, required: true },
    risks: [RiskItemSchema],
    opportunities: [OpportunityItemSchema],
    actionItems: [ActionItemSchema],
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: String, enum: ['ai', 'system'], default: 'ai' }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Indexes for efficient queries
BriefingSchema.index({ date: -1 });
BriefingSchema.index({ generatedAt: -1 });

export const Briefing = mongoose.model<IBriefing>('Briefing', BriefingSchema);
export default Briefing;
