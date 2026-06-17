import mongoose, { Document, Schema } from 'mongoose';

export interface IInsight extends Document {
  type: 'trend' | 'anomaly' | 'prediction' | 'recommendation' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  category: string;
  dataSource: string;
  metrics: { value: number; previousValue?: number; change?: number; changePercent?: number };
  recommendations?: string[];
  affectedEntities: { type: string; id: string; name: string }[];
  timeRange: { start: Date; end: Date };
  confidence: number;
  generatedBy: 'ai' | 'system' | 'manual';
  metadata: Record<string, any>;
  orgId: string;
  clientId: string;
  createdAt: Date;
  updatedAt: Date;
}

const InsightSchema = new Schema<IInsight>({
  type: { type: String, enum: ['trend', 'anomaly', 'prediction', 'recommendation', 'pattern'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  dataSource: { type: String, required: true },
  metrics: { value: { type: Number, required: true }, previousValue: Number, change: Number, changePercent: Number },
  recommendations: [String],
  affectedEntities: [{ type: String, id: String, name: String }],
  timeRange: { start: { type: Date, required: true }, end: { type: Date, required: true } },
  confidence: { type: Number, min: 0, max: 1, default: 0.8 },
  generatedBy: { type: String, enum: ['ai', 'system', 'manual'], default: 'ai' },
  metadata: { type: Schema.Types.Mixed, default: {} },
  orgId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true }
}, { timestamps: true });

InsightSchema.index({ orgId: 1, clientId: 1, type: 1 });

export const Insight = mongoose.model<IInsight>('Insight', InsightSchema);
