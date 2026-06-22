import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyTrust extends Document {
  corpId: string;
  companyName: string;
  overallScore: number;
  paymentScore: number;
  fulfillmentScore: number;
  disputeScore: number;
  verificationScore: number;
  transactionCount: number;
  lastTransactionAt: Date;
  trend: 'up' | 'down' | 'stable';
  riskLevel: 'low' | 'medium' | 'high';
  badges: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITrustHistory extends Document {
  corpId: string;
  overallScore: number;
  paymentScore: number;
  fulfillmentScore: number;
  disputeScore: number;
  verificationScore: number;
  reason: string;
  triggeredBy: string;
  recordedAt: Date;
}

const CompanyTrustSchema = new Schema<ICompanyTrust>(
  {
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    paymentScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    fulfillmentScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    disputeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    verificationScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 75,
    },
    transactionCount: {
      type: Number,
      default: 0,
    },
    lastTransactionAt: {
      type: Date,
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'stable'],
      default: 'stable',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low',
    },
    badges: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

CompanyTrustSchema.index({ overallScore: -1 });
CompanyTrustSchema.index({ riskLevel: 1 });
CompanyTrustSchema.index({ createdAt: -1 });

const TrustHistorySchema = new Schema<ITrustHistory>(
  {
    corpId: {
      type: String,
      required: true,
      index: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    paymentScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    fulfillmentScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    disputeScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    verificationScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    reason: {
      type: String,
      required: true,
    },
    triggeredBy: {
      type: String,
      required: true,
    },
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

TrustHistorySchema.index({ corpId: 1, recordedAt: -1 });

export const CompanyTrust = mongoose.model<ICompanyTrust>('CompanyTrust', CompanyTrustSchema);
export const TrustHistory = mongoose.model<ITrustHistory>('TrustHistory', TrustHistorySchema);