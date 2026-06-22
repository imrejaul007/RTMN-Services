/**
 * Distributor Model - MongoDB Schema
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Enums
// ============================================================================

export const DistributorType = ['distributor', 'wholesaler', 'stockist', 'dealer', 'sub-distributor'] as const;
export const DistributorStatus = ['active', 'inactive', 'suspended', 'pending_onboarding'] as const;

// ============================================================================
// Schema
// ============================================================================

export interface IDistributor extends Document {
  _id: mongoose.Types.ObjectId;
  distributorNumber: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  type: typeof DistributorType[number];
  status: typeof DistributorStatus[number];
  territory: {
    regions: string[];
    cities: string[];
    zones: string[];
    pinCodes?: string[];
  };
  brands: Array<{
    brandId: string;
    brandName: string;
    status: 'active' | 'inactive' | 'suspended';
    since: Date;
    exclusive?: boolean;
    target?: {
      monthlyTarget: number;
      achieved: number;
      percentage: number;
    };
  }>;
  retailers: Array<{
    retailerId: string;
    retailerName: string;
    status: 'active' | 'inactive';
    since: Date;
    lastOrderAt?: Date;
    monthlyOrders?: number;
    outstandingAmount?: number;
  }>;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    branchName: string;
    accountHolderName: string;
  };
  documents: Array<{
    type: string;
    url: string;
    verified: boolean;
    verifiedAt?: Date;
  }>;
  score?: {
    sales: number;
    collections: number;
    logistics: number;
    compliance: number;
    overall: number;
  };
  creditLimit?: number;
  outstandingBalance?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const DistributorSchema = new Schema<IDistributor>(
  {
    distributorNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    businessName: { type: String, required: true, index: true },
    ownerName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    type: { type: String, enum: DistributorType, required: true, index: true },
    status: { type: String, enum: DistributorStatus, default: 'pending_onboarding', index: true },
    territory: {
      regions: [{ type: String }],
      cities: [{ type: String }],
      zones: [{ type: String }],
      pinCodes: [{ type: String }],
    },
    brands: [{
      brandId: String,
      brandName: String,
      status: { type: String, enum: ['active', 'inactive', 'suspended'] },
      since: Date,
      exclusive: Boolean,
      target: {
        monthlyTarget: Number,
        achieved: Number,
        percentage: Number,
      },
    }],
    retailers: [{
      retailerId: String,
      retailerName: String,
      status: { type: String, enum: ['active', 'inactive'] },
      since: Date,
      lastOrderAt: Date,
      monthlyOrders: Number,
      outstandingAmount: Number,
    }],
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      bankName: String,
      branchName: String,
      accountHolderName: String,
    },
    documents: [{
      type: String,
      url: String,
      verified: Boolean,
      verifiedAt: Date,
    }],
    score: {
      sales: Number,
      collections: Number,
      logistics: Number,
      compliance: Number,
      overall: Number,
    },
    creditLimit: Number,
    outstandingBalance: Number,
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes
// ============================================================================

DistributorSchema.index({ 'territory.cities': 1 });
DistributorSchema.index({ 'territory.regions': 1 });
DistributorSchema.index({ 'brands.brandId': 1 });
DistributorSchema.index({ status: 1, type: 1 });
DistributorSchema.index({ 'score.overall': -1 });

// ============================================================================
// Pre-save Hook
// ============================================================================

DistributorSchema.pre('save', function (next) {
  if (this.isNew) {
    this.distributorNumber = `DIST-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

// ============================================================================
// Methods
// ============================================================================

DistributorSchema.methods.toPublic = function () {
  const obj = this.toObject();
  // Remove sensitive fields
  if (obj.bankDetails) {
    delete obj.bankDetails;
  }
  return obj;
};

// ============================================================================
// Export
// ============================================================================

export const Distributor = mongoose.model<IDistributor>('Distributor', DistributorSchema);
