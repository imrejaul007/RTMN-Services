import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IMerchantHealth extends Document {
  merchantId: string;
  // Financial metrics from POS
  monthlyRevenue: number;
  avgOrderValue: number;
  orderCount: number;
  // Calculated scores
  healthScore: number; // 0-100
  creditScore: number; // 300-900
  riskRating: 'low' | 'medium' | 'high';
  // Credit info
  creditLimit: number;
  utilizedAmount: number;
  availableCredit: number;
  // History
  onTimePayments: number;
  latePayments: number;
  defaults: number;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const MerchantHealthSchema = new Schema<IMerchantHealth>(
  {
    merchantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    orderCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    healthScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    creditScore: {
      type: Number,
      default: 600,
      min: 300,
      max: 900,
    },
    riskRating: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    utilizedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    availableCredit: {
      type: Number,
      default: 0,
      min: 0,
    },
    onTimePayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    latePayments: {
      type: Number,
      default: 0,
      min: 0,
    },
    defaults: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
MerchantHealthSchema.index({ healthScore: -1, creditScore: -1 });
MerchantHealthSchema.index({ riskRating: 1, creditScore: 1 });
MerchantHealthSchema.index({ merchantId: 1, updatedAt: -1 });

export const MerchantHealth: Model<IMerchantHealth> = mongoose.model<IMerchantHealth>(
  'MerchantHealth',
  MerchantHealthSchema
);
