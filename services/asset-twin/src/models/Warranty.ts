import mongoose, { Document, Schema } from 'mongoose';

// Warranty Status
export type WarrantyStatus = 'active' | 'expired' | 'void' | 'extended';

// Warranty Coverage Types
export type WarrantyCoverageType =
  | 'full'           // Complete coverage
  | 'limited'        // Limited coverage
  | 'extended'       // Extended warranty
  | 'manufacturer'   // Manufacturer warranty
  | 'third_party';   // Third-party warranty

// Interface for Warranty Document
export interface IWarranty extends Document {
  // Multi-tenant support
  tenantId: string;

  // Reference to Asset
  assetId: string;

  // Warranty Details
  warrantyId: string;
  warrantyType: WarrantyCoverageType;
  status: WarrantyStatus;

  // Coverage Period
  startDate: Date;
  endDate: Date;

  // Coverage Details
  coverageDetails?: {
    coveredParts: string[];
    coveredLabor: boolean;
    coveredTransportation: boolean;
    maximumClaims: number;
    maximumClaimAmount?: number;
  };

  // Provider Information
  provider?: {
    name: string;
    contactNumber?: string;
    email?: string;
    address?: string;
    policyNumber?: string;
  };

  // Cost
  cost?: {
    amount: number;
    currency: string;
    paymentDate?: Date;
  };

  // Extension History
  extensions?: Array<{
    extendedEndDate: Date;
    extendedBy: string;
    extensionCost?: number;
    reason?: string;
    createdAt: Date;
  }>;

  // Alerts
  alerts?: {
    expirationAlert: boolean;
    alertDaysBefore: number;  // Days before expiration to send alert
    lastAlertSent?: Date;
  };

  // Documents
  documents?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;

  // Notes
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Warranty Schema
const WarrantySchema = new Schema<IWarranty>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      index: true,
    },
    warrantyId: {
      type: String,
      required: true,
      unique: true,
    },
    warrantyType: {
      type: String,
      enum: ['full', 'limited', 'extended', 'manufacturer', 'third_party'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'void', 'extended'],
      default: 'active',
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    coverageDetails: {
      coveredParts: [String],
      coveredLabor: { type: Boolean, default: true },
      coveredTransportation: { type: Boolean, default: false },
      maximumClaims: { type: Number, default: 0 },
      maximumClaimAmount: Number,
    },
    provider: {
      name: String,
      contactNumber: String,
      email: String,
      address: String,
      policyNumber: String,
    },
    cost: {
      amount: Number,
      currency: { type: String, default: 'USD' },
      paymentDate: Date,
    },
    extensions: [
      {
        extendedEndDate: Date,
        extendedBy: String,
        extensionCost: Number,
        reason: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    alerts: {
      expirationAlert: { type: Boolean, default: true },
      alertDaysBefore: { type: Number, default: 30 },
      lastAlertSent: Date,
    },
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
WarrantySchema.index({ tenantId: 1, status: 1 });
WarrantySchema.index({ tenantId: 1, endDate: 1 });  // For expiration alerts
WarrantySchema.index({ tenantId: 1, assetId: 1 }, { unique: true });

// Virtual for checking if warranty is about to expire
WarrantySchema.virtual('isExpiringSoon').get(function () {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.endDate <= thirtyDaysFromNow && this.endDate > new Date();
});

export const Warranty = mongoose.model<IWarranty>('Warranty', WarrantySchema);
