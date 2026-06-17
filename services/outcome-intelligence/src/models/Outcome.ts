import mongoose, { Schema, Document } from 'mongoose';

export interface IOutcome extends Document {
  outcomeId: string;
  tenantId: string;
  ticketId: string;
  interactionId?: string;
  timestamp: Date;
  revenueImpact: {
    saved: number;
    protected: number;
    cost: number;
  };
  customerImpact: {
    retained: boolean;
    churned: boolean;
    promoted: boolean;
    npsBefore?: number;
    npsAfter?: number;
  };
  businessImpact: {
    upsell: boolean;
    upsellAmount?: number;
    referral: boolean;
    referralCount?: number;
    riskIdentified: boolean;
    riskSeverity?: 'low' | 'medium' | 'high' | 'critical';
  };
  metrics: {
    csatBefore?: number;
    csatAfter?: number;
    resolutionTimeMinutes: number;
    firstResponseTimeMinutes?: number;
    agentId?: string;
  };
  metadata?: Record<string, unknown>;
  calculatedAt: Date;
}

const RevenueImpactSchema = new Schema({
  saved: { type: Number, default: 0 },
  protected: { type: Number, default: 0 },
  cost: { type: Number, default: 0 }
}, { _id: false });

const CustomerImpactSchema = new Schema({
  retained: { type: Boolean, default: false },
  churned: { type: Boolean, default: false },
  promoted: { type: Boolean, default: false },
  npsBefore: { type: Number },
  npsAfter: { type: Number }
}, { _id: false });

const BusinessImpactSchema = new Schema({
  upsell: { type: Boolean, default: false },
  upsellAmount: { type: Number },
  referral: { type: Boolean, default: false },
  referralCount: { type: Number, default: 0 },
  riskIdentified: { type: Boolean, default: false },
  riskSeverity: { type: String, enum: ['low', 'medium', 'high', 'critical'] }
}, { _id: false });

const ResolutionMetricsSchema = new Schema({
  csatBefore: { type: Number },
  csatAfter: { type: Number },
  resolutionTimeMinutes: { type: Number, required: true },
  firstResponseTimeMinutes: { type: Number },
  agentId: { type: String }
}, { _id: false });

const OutcomeSchema = new Schema<IOutcome>({
  outcomeId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  ticketId: {
    type: String,
    required: true,
    index: true
  },
  interactionId: {
    type: String,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  revenueImpact: {
    type: RevenueImpactSchema,
    default: () => ({ saved: 0, protected: 0, cost: 0 })
  },
  customerImpact: {
    type: CustomerImpactSchema,
    default: () => ({ retained: false, churned: false, promoted: false })
  },
  businessImpact: {
    type: BusinessImpactSchema,
    default: () => ({ upsell: false, referral: false, riskIdentified: false })
  },
  metrics: {
    type: ResolutionMetricsSchema,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for common queries
OutcomeSchema.index({ tenantId: 1, timestamp: -1 });
OutcomeSchema.index({ tenantId: 1, 'revenueImpact.saved': -1 });
OutcomeSchema.index({ tenantId: 1, 'customerImpact.retained': 1 });
OutcomeSchema.index({ ticketId: 1, outcomeId: 1 });

// Virtual for net revenue impact
OutcomeSchema.virtual('netRevenueImpact').get(function() {
  return this.revenueImpact.saved + this.revenueImpact.protected - this.revenueImpact.cost;
});

// Ensure virtuals are included in JSON
OutcomeSchema.set('toJSON', { virtuals: true });
OutcomeSchema.set('toObject', { virtuals: true });

export const Outcome = mongoose.model<IOutcome>('Outcome', OutcomeSchema);
