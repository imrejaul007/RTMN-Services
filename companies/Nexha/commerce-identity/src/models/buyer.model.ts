import mongoose, { Schema, Document } from 'mongoose';

export type BuyerStatus = 'pending' | 'active' | 'verified' | 'suspended';
export type BuyerType = 'business' | 'individual' | 'government' | 'ngo' | 'institution';

export interface BuyerAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface BuyerStats {
  totalOrders: number;
  totalSpent: number;
  avgOrderValue: number;
  paymentScore: number;        // 0-100, how reliably they pay
  responseScore: number;
  disputeScore: number;
  lastOrderAt?: Date;
}

export interface IBuyer extends Document {
  corpId: string;
  businessName: string;
  buyerType: BuyerType;
  email: string;
  phone: string;
  whatsapp?: string;
  status: BuyerStatus;
  gstin?: string;
  pan?: string;
  address: BuyerAddress;
  stats: BuyerStats;
  preferredCategories: string[];
  creditLimit: number;          // in paise (smallest currency unit)
  creditUsed: number;
  sutarIdentityId?: string;
  sutarTrustScoreId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

const buyerSchema = new Schema<IBuyer>(
  {
    corpId: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true, index: 'text' },
    buyerType: {
      type: String,
      enum: ['business', 'individual', 'government', 'ngo', 'institution'],
      default: 'business',
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, index: true },
    whatsapp: { type: String, sparse: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'verified', 'suspended'],
      default: 'pending',
      index: true,
    },
    gstin: { type: String, sparse: true, index: true },
    pan: { type: String, sparse: true, index: true },
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true, index: true },
      state: { type: String, required: true, index: true },
      pincode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },
    stats: {
      totalOrders: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0 },
      avgOrderValue: { type: Number, default: 0 },
      paymentScore: { type: Number, default: 75, min: 0, max: 100 },
      responseScore: { type: Number, default: 75, min: 0, max: 100 },
      disputeScore: { type: Number, default: 100, min: 0, max: 100 },
      lastOrderAt: Date,
    },
    preferredCategories: { type: [String], default: [] },
    creditLimit: { type: Number, default: 0 },
    creditUsed: { type: Number, default: 0 },
    sutarIdentityId: String,
    sutarTrustScoreId: String,
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

buyerSchema.index({ businessName: 'text', 'address.city': 'text' });
buyerSchema.index({ status: 1, 'stats.totalSpent': -1 });

export const Buyer = mongoose.model<IBuyer>('Buyer', buyerSchema);
