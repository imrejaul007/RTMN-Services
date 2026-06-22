import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaybook extends Document {
  name: string;
  description: string;
  category: 'onboarding' | 'engagement' | 'retention' | 'expansion' | 'winback';
  status: 'draft' | 'active' | 'paused' | 'archived';
  version: string;
  triggers: {
    type: 'health_score' | 'churn_risk' | 'nps_change' | 'inactivity' | 'payment_issue' | 'milestone' | 'manual';
    conditions: {
      field: string;
      operator: 'lt' | 'gt' | 'eq' | 'lte' | 'gte' | 'ne' | 'contains';
      value: number | string;
    }[];
    logic: 'and' | 'or';
  }[];
  actions: {
    order: number;
    type: 'email' | 'notification' | 'task' | 'webhook' | 'alert' | 'delay';
    config: {
      template?: string;
      channel?: string;
      subject?: string;
      body?: string;
      webhookUrl?: string;
      delayMinutes?: number;
      assignee?: string;
      priority?: 'low' | 'medium' | 'high' | 'urgent';
    };
    conditions?: {
      field: string;
      operator: string;
      value: any;
    }[];
  }[];
  conditions?: {
    customerTypes?: string[];
    riskLevels?: string[];
    segments?: string[];
    minHealthScore?: number;
    maxHealthScore?: number;
  };
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PlaybookSchema = new Schema<IPlaybook>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['onboarding', 'engagement', 'retention', 'expansion', 'winback'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      required: true,
      default: 'draft',
      index: true,
    },
    version: { type: String, required: true, default: '1.0.0' },
    triggers: [{
      type: {
        type: String,
        enum: ['health_score', 'churn_risk', 'nps_change', 'inactivity', 'payment_issue', 'milestone', 'manual'],
        required: true,
      },
      conditions: [{
        field: { type: String, required: true },
        operator: { type: String, enum: ['lt', 'gt', 'eq', 'lte', 'gte', 'ne', 'contains'], required: true },
        value: { type: Schema.Types.Mixed, required: true },
      }],
      logic: { type: String, enum: ['and', 'or'], default: 'and' },
    }],
    actions: [{
      order: { type: Number, required: true },
      type: { type: String, enum: ['email', 'notification', 'task', 'webhook', 'alert', 'delay'], required: true },
      config: {
        template: { type: String },
        channel: { type: String },
        subject: { type: String },
        body: { type: String },
        webhookUrl: { type: String },
        delayMinutes: { type: Number },
        assignee: { type: String },
        priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
      },
      conditions: [{
        field: { type: String, required: true },
        operator: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
      }],
    }],
    conditions: {
      customerTypes: [{ type: String }],
      riskLevels: [{ type: String }],
      segments: [{ type: String }],
      minHealthScore: { type: Number },
      maxHealthScore: { type: Number },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'playbooks',
  }
);

PlaybookSchema.index({ category: 1, status: 1 });
PlaybookSchema.index({ status: 1 });
PlaybookSchema.index({ 'triggers.type': 1 });

export const PlaybookModel = mongoose.model<IPlaybook>('Playbook', PlaybookSchema);