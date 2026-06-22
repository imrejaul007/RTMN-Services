import mongoose, { Schema, Document } from 'mongoose';

export interface ISLA extends Document {
  slaId: string;
  tenantId: string;
  name: string;
  description?: string;
  channel: string;
  priority: string;
  responseTimeSeconds: number;
  firstResponseTimeSeconds?: number;
  resolutionTimeSeconds?: number;
  enabled: boolean;
}

const SLASchema = new Schema<ISLA>({
  slaId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  channel: { type: String, default: 'all' },
  priority: { type: String, default: 'all' },
  responseTimeSeconds: { type: Number, required: true },
  firstResponseTimeSeconds: Number,
  resolutionTimeSeconds: Number,
  enabled: { type: Boolean, default: true }
}, { timestamps: true, collection: 'sla_definitions' });

export const SLA = mongoose.model<ISLA>('SLA', SLASchema);

export interface ISLAViolation extends Document {
  violationId: string;
  tenantId: string;
  slaId: string;
  conversationId: string;
  type: string;
  thresholdSeconds: number;
  actualSeconds: number;
  occurredAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

const SLAViolationSchema = new Schema<ISLAViolation>({
  violationId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  slaId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  type: { type: String, enum: ['response_time', 'first_response', 'resolution_time'], required: true },
  thresholdSeconds: { type: Number, required: true },
  actualSeconds: { type: Number, required: true },
  occurredAt: { type: Date, default: Date.now, index: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: String,
  acknowledgedAt: Date
}, { timestamps: true, collection: 'sla_violations' });

export const SLAViolation = mongoose.model<ISLAViolation>('SLAViolation', SLAViolationSchema);

export interface ISLAAlertConfig extends Document {
  configId: string;
  tenantId: string;
  slaId: string;
  channels: string[];
  recipients: string[];
  webhookUrl?: string;
  thresholdPercent: number;
}

const SLAAlertConfigSchema = new Schema<ISLAAlertConfig>({
  configId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  slaId: { type: String, required: true, index: true },
  channels: [String],
  recipients: [String],
  webhookUrl: String,
  thresholdPercent: { type: Number, default: 80 }
}, { timestamps: true, collection: 'sla_alert_configs' });

export const SLAAlertConfig = mongoose.model<ISLAAlertConfig>('SLAAlertConfig', SLAAlertConfigSchema);
