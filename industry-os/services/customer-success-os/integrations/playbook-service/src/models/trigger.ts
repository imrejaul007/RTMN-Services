import mongoose, { Schema, Document } from 'mongoose';

export interface ITrigger extends Document {
  playbookId: string;
  customerId: string;
  type: 'health_score' | 'churn_risk' | 'nps_change' | 'inactivity' | 'payment_issue' | 'milestone' | 'manual';
  triggeredBy: 'automated' | 'manual' | 'api';
  triggerData: {
    healthScore?: number;
    churnRisk?: number;
    npsScore?: number;
    previousNps?: number;
    daysSinceActivity?: number;
    paymentDelay?: number;
    milestone?: string;
  };
  matchedConditions: {
    condition: string;
    expected: string;
    actual: string;
    passed: boolean;
  }[];
  status: 'pending' | 'processing' | 'executed' | 'skipped' | 'failed';
  executionId?: string;
  error?: string;
  triggeredAt: Date;
  executedAt?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const TriggerSchema = new Schema<ITrigger>(
  {
    playbookId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['health_score', 'churn_risk', 'nps_change', 'inactivity', 'payment_issue', 'milestone', 'manual'],
      required: true,
      index: true,
    },
    triggeredBy: {
      type: String,
      enum: ['automated', 'manual', 'api'],
      required: true,
    },
    triggerData: {
      healthScore: { type: Number },
      churnRisk: { type: Number },
      npsScore: { type: Number },
      previousNps: { type: Number },
      daysSinceActivity: { type: Number },
      paymentDelay: { type: Number },
      milestone: { type: String },
    },
    matchedConditions: [{
      condition: { type: String, required: true },
      expected: { type: String, required: true },
      actual: { type: String, required: true },
      passed: { type: Boolean, required: true },
    }],
    status: {
      type: String,
      enum: ['pending', 'processing', 'executed', 'skipped', 'failed'],
      required: true,
      default: 'pending',
      index: true,
    },
    executionId: { type: String, index: true },
    error: { type: String },
    triggeredAt: { type: Date, required: true, default: Date.now },
    executedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'playbook_triggers',
  }
);

TriggerSchema.index({ customerId: 1, type: 1, triggeredAt: -1 });
TriggerSchema.index({ status: 1, triggeredAt: -1 });
TriggerSchema.index({ playbookId: 1, status: 1 });

export const TriggerModel = mongoose.model<ITrigger>('PlaybookTrigger', TriggerSchema);