import mongoose, { Schema, Document } from 'mongoose';

export interface IAlertDocument extends Document {
  id: string;
  tenantId: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  category: string;
  relatedEntity?: {
    type: string;
    id: string;
    name: string;
  };
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

const AlertSchema = new Schema<IAlertDocument>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: [
      'customer_at_risk',
      'product_issue',
      'revenue_drop',
      'compliance_breach',
      'service_degradation',
      'market_alert'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: {
    type: String,
    enum: ['sales', 'customer', 'product', 'financial', 'compliance', 'operations'],
    required: true,
    index: true
  },
  relatedEntity: {
    type: {
      type: String,
      required: true
    },
    id: { type: String, required: true },
    name: { type: String, required: true }
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  acknowledged: { type: Boolean, default: false, index: true },
  acknowledgedBy: { type: String },
  acknowledgedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  expiresAt: { type: Date, index: true }
}, {
  timestamps: true,
  collection: 'alerts'
});

// Compound indexes for efficient queries
AlertSchema.index({ tenantId: 1, severity: 1, acknowledged: 1 });
AlertSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
AlertSchema.index({ tenantId: 1, category: 1, createdAt: -1 });
AlertSchema.index({ createdAt: 1 }, { expireAfterSeconds: undefined }); // For manual TTL management

// Pre-save hook to generate ID if not provided
AlertSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = `ALT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

export const AlertModel = mongoose.model<IAlertDocument>('Alert', AlertSchema);
