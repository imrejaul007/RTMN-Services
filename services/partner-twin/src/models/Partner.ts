import mongoose, { Document, Schema } from 'mongoose';

// Partner Types
export type PartnerType = 'vendor' | 'supplier' | 'service_provider' | 'courier' | 'integrator';

// Partner Status
export type PartnerStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'blacklisted';

// Integration Status
export type IntegrationStatus = 'none' | 'basic' | 'standard' | 'advanced' | 'real_time';

// Contact Information
export interface IContactInfo {
  name: string;
  email: string;
  phone?: string;
  role: string;
  isPrimary: boolean;
}

// Address
export interface IAddress {
  street: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
}

// Bank Details
export interface IBankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber?: string;
  swiftCode?: string;
  accountHolderName: string;
}

// Category & Tags
export interface ICategory {
  primary: string;
  secondary?: string[];
}

// Partnership Details
export interface IPartnershipDetails {
  startDate: Date;
  endDate?: Date;
  trialEndDate?: Date;
  renewalTerms?: string;
  exclusivity?: boolean;
}

// Interface for Partner Document
export interface IPartner extends Document {
  // Core Identification
  partnerId: string;
  tenantId: string;

  // Basic Info
  name: string;
  legalName?: string;
  type: PartnerType;
  status: PartnerStatus;

  // Business Details
  category: ICategory;
  description?: string;
  website?: string;
  taxId?: string;
  registrationNumber?: string;

  // Contact Information
  primaryContact: IContactInfo;
  contacts: IContactInfo[];

  // Address
  billingAddress?: IAddress;
  shippingAddress?: IAddress;

  // Financial
  bankDetails?: IBankDetails;
  paymentTerms?: string; // e.g., 'NET30', 'NET60', 'Immediate'
  creditLimit?: number;
  currentBalance?: number;

  // Integration
  integrationStatus: IntegrationStatus;
  integrationConfig?: Record<string, any>;
  apiCredentials?: {
    name: string;
    key?: string;
    secret?: string;
  }[];

  // Partnership
  partnership: IPartnershipDetails;

  // Trust & Compliance
  trustScore?: number;
  complianceStatus?: 'compliant' | 'pending' | 'non_compliant';
  riskLevel?: 'low' | 'medium' | 'high';

  // Trust Scores Breakdown
  trustScoreBreakdown?: {
    performanceScore: number;
    reliabilityScore: number;
    financialScore: number;
    complianceScore: number;
  };

  // Tags & Metadata
  tags?: string[];
  metadata?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;

  // Soft delete
  isDeleted?: boolean;
  deletedAt?: Date;
}

// Partner Schema
const PartnerSchema = new Schema<IPartner>(
  {
    partnerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['vendor', 'supplier', 'service_provider', 'courier', 'integrator'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'suspended', 'blacklisted'],
      default: 'pending',
    },

    category: {
      primary: { type: String, required: true },
      secondary: [String],
    },
    description: String,
    website: String,
    taxId: String,
    registrationNumber: String,

    primaryContact: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      role: { type: String, required: true },
      isPrimary: { type: Boolean, default: true },
    },
    contacts: [
      {
        name: String,
        email: String,
        phone: String,
        role: String,
        isPrimary: Boolean,
      },
    ],

    billingAddress: {
      street: String,
      city: String,
      state: String,
      country: { type: String, required: true },
      postalCode: String,
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      country: { type: String, required: true },
      postalCode: String,
    },

    bankDetails: {
      bankName: String,
      accountNumber: String,
      routingNumber: String,
      swiftCode: String,
      accountHolderName: String,
    },
    paymentTerms: String,
    creditLimit: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },

    integrationStatus: {
      type: String,
      enum: ['none', 'basic', 'standard', 'advanced', 'real_time'],
      default: 'none',
    },
    integrationConfig: Schema.Types.Mixed,
    apiCredentials: [
      {
        name: String,
        key: String,
        secret: String,
      },
    ],

    partnership: {
      startDate: { type: Date, required: true },
      endDate: Date,
      trialEndDate: Date,
      renewalTerms: String,
      exclusivity: { type: Boolean, default: false },
    },

    trustScore: { type: Number, min: 0, max: 100, default: 50 },
    complianceStatus: {
      type: String,
      enum: ['compliant', 'pending', 'non_compliant'],
      default: 'pending',
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    trustScoreBreakdown: {
      performanceScore: { type: Number, default: 50 },
      reliabilityScore: { type: Number, default: 50 },
      financialScore: { type: Number, default: 50 },
      complianceScore: { type: Number, default: 50 },
    },

    tags: [String],
    metadata: Schema.Types.Mixed,

    createdBy: String,
    updatedBy: String,

    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
PartnerSchema.index({ partnerId: 1, tenantId: 1 });
PartnerSchema.index({ tenantId: 1, type: 1, status: 1 });
PartnerSchema.index({ 'category.primary': 1, tenantId: 1 });
PartnerSchema.index({ trustScore: 1 });
PartnerSchema.index({ 'partnership.endDate': 1 });
PartnerSchema.index({ isDeleted: 1 });

// Virtual for contract renewal status
PartnerSchema.virtual('contractRenewalStatus').get(function () {
  if (!this.partnership.endDate) return null;
  const daysUntilRenewal = Math.ceil(
    (this.partnership.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilRenewal < 0) return 'expired';
  if (daysUntilRenewal <= 30) return 'expiring_soon';
  return 'active';
});

// Export
export const Partner = mongoose.model<IPartner>('Partner', PartnerSchema);
export default Partner;
