import mongoose, { Schema, Document } from 'mongoose';

export type SupplierStatus = 'pending' | 'active' | 'verified' | 'suspended' | 'blacklisted';
export type SupplierTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface SupplierAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface SupplierBankDetails {
  accountHolder: string;
  accountNumber: string;       // encrypted at rest in production
  ifsc: string;
  bankName: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface SupplierDocument {
  type: 'gstin' | 'pan' | 'aadhaar' | 'msme' | 'fssai' | 'trade_license' | 'iso' | 'other';
  number: string;
  documentUrl?: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface SupplierReputation {
  overallScore: number;          // 0-100
  deliveryScore: number;
  qualityScore: number;
  paymentScore: number;
  responseScore: number;
  totalRatings: number;
  totalDeals: number;
  totalDisputes: number;
}

export interface ISupplier extends Document {
  corpId: string;                // Universal ID from CorpID service (4702)
  businessName: string;
  legalName: string;
  email: string;
  phone: string;
  whatsapp?: string;
  status: SupplierStatus;
  tier: SupplierTier;
  categories: string[];          // e.g. ['electronics', 'grocery']
  productCount: number;
  address: SupplierAddress;
  documents: SupplierDocument[];
  bankDetails?: SupplierBankDetails;
  reputation: SupplierReputation;
  isGuest: boolean;              // true for guest suppliers (no GST)
  guestExpiresAt?: Date;         // validity window for guest suppliers
  sutarIdentityId?: string;      // reference into SUTAR OS identity layer
  sutarTrustScoreId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    corpId: { type: String, required: true, unique: true, index: true },
    businessName: { type: String, required: true, trim: true, index: 'text' },
    legalName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, index: true },
    whatsapp: { type: String, sparse: true, index: true },
    status: {
      type: String,
      enum: ['pending', 'active', 'verified', 'suspended', 'blacklisted'],
      default: 'pending',
      index: true,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
      index: true,
    },
    categories: { type: [String], default: [], index: true },
    productCount: { type: Number, default: 0 },
    address: {
      line1: { type: String, required: true },
      line2: String,
      city: { type: String, required: true, index: true },
      state: { type: String, required: true, index: true },
      pincode: { type: String, required: true, index: true },
      country: { type: String, default: 'India' },
    },
    documents: [
      {
        type: {
          type: String,
          enum: ['gstin', 'pan', 'aadhaar', 'msme', 'fssai', 'trade_license', 'iso', 'other'],
          required: true,
        },
        number: { type: String, required: true },
        documentUrl: String,
        verified: { type: Boolean, default: false },
        verifiedAt: Date,
        verifiedBy: String,
      },
    ],
    bankDetails: {
      accountHolder: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
    },
    reputation: {
      overallScore: { type: Number, default: 0, min: 0, max: 100 },
      deliveryScore: { type: Number, default: 0, min: 0, max: 100 },
      qualityScore: { type: Number, default: 0, min: 0, max: 100 },
      paymentScore: { type: Number, default: 0, min: 0, max: 100 },
      responseScore: { type: Number, default: 0, min: 0, max: 100 },
      totalRatings: { type: Number, default: 0 },
      totalDeals: { type: Number, default: 0 },
      totalDisputes: { type: Number, default: 0 },
    },
    isGuest: { type: Boolean, default: false, index: true },
    guestExpiresAt: { type: Date, index: true },
    sutarIdentityId: { type: String, index: true },
    sutarTrustScoreId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

supplierSchema.index({ businessName: 'text', legalName: 'text', 'address.city': 'text' });
supplierSchema.index({ status: 1, tier: 1, 'reputation.overallScore': -1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
