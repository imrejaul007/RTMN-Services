import mongoose, { Document, Schema } from 'mongoose';

// AMC Status
export type AMCStatus = 'active' | 'expired' | 'pending_renewal' | 'cancelled' | 'suspended';

// AMC Types
export type AMCType = 'comprehensive' | 'non_comprehensive' | 'annual' | 'quarterly' | 'monthly';

// Service Frequency
export type ServiceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'on_demand';

// Interface for AMC Document
export interface IAMC extends Document {
  // Multi-tenant support
  tenantId: string;

  // Reference to Asset
  assetId: string;

  // AMC Details
  amcId: string;
  amcType: AMCType;
  status: AMCStatus;

  // Contract Period
  startDate: Date;
  endDate: Date;

  // Service Details
  serviceDetails?: {
    frequency: ServiceFrequency;
    includedServices: string[];
    excludedServices?: string[];
    responseTime?: number;  // in hours
    resolutionTime?: number; // in hours
    numberOfVisits?: number; // planned visits
    visitsCompleted?: number;
  };

  // Provider Information
  provider?: {
    name: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    address?: string;
    contractNumber?: string;
  };

  // Cost
  cost?: {
    amount: number;
    currency: string;
    paymentTerms?: string;
    paymentDate?: Date;
    nextPaymentDue?: Date;
  };

  // Terms and Conditions
  terms?: {
    maximumClaims: number;
    maximumClaimAmount?: number;
    minimumClaimAmount?: number;
    deductibles?: number;
    exclusions?: string[];
    specialConditions?: string;
  };

  // Renewal
  renewal?: {
    autoRenew: boolean;
    renewalReminder: boolean;
    reminderDaysBefore: number;
    renewedBy?: string;
    renewedOn?: Date;
    newAmcId?: string;  // Reference to new AMC after renewal
  };

  // Service History Reference
  maintenanceHistory?: string[];  // References to maintenance records

  // SLA Tracking
  sla?: {
    responseTimeSla: number;      // in hours
    resolutionTimeSla: number;    // in hours
    averageResponseTime?: number;
    averageResolutionTime?: number;
    slaViolations?: number;
  };

  // Alerts
  alerts?: {
    expirationAlert: boolean;
    alertDaysBefore: number;
    renewalAlert: boolean;
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

// AMC Schema
const AMCSchema = new Schema<IAMC>(
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
    amcId: {
      type: String,
      required: true,
      unique: true,
    },
    amcType: {
      type: String,
      enum: ['comprehensive', 'non_comprehensive', 'annual', 'quarterly', 'monthly'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'pending_renewal', 'cancelled', 'suspended'],
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
    serviceDetails: {
      frequency: {
        type: String,
        enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'on_demand'],
      },
      includedServices: [String],
      excludedServices: [String],
      responseTime: Number,
      resolutionTime: Number,
      numberOfVisits: Number,
      visitsCompleted: { type: Number, default: 0 },
    },
    provider: {
      name: String,
      contactPerson: String,
      contactNumber: String,
      email: String,
      address: String,
      contractNumber: String,
    },
    cost: {
      amount: Number,
      currency: { type: String, default: 'USD' },
      paymentTerms: String,
      paymentDate: Date,
      nextPaymentDue: Date,
    },
    terms: {
      maximumClaims: Number,
      maximumClaimAmount: Number,
      minimumClaimAmount: Number,
      deductibles: Number,
      exclusions: [String],
      specialConditions: String,
    },
    renewal: {
      autoRenew: { type: Boolean, default: false },
      renewalReminder: { type: Boolean, default: true },
      reminderDaysBefore: { type: Number, default: 30 },
      renewedBy: String,
      renewedOn: Date,
      newAmcId: String,
    },
    maintenanceHistory: [String],
    sla: {
      responseTimeSla: Number,
      resolutionTimeSla: Number,
      averageResponseTime: Number,
      averageResolutionTime: Number,
      slaViolations: { type: Number, default: 0 },
    },
    alerts: {
      expirationAlert: { type: Boolean, default: true },
      alertDaysBefore: { type: Number, default: 30 },
      renewalAlert: { type: Boolean, default: true },
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
AMCSchema.index({ tenantId: 1, status: 1 });
AMCSchema.index({ tenantId: 1, endDate: 1 });  // For expiration alerts
AMCSchema.index({ tenantId: 1, 'provider.name': 1 });

// Virtual for checking if AMC is expiring soon
AMCSchema.virtual('isExpiringSoon').get(function () {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.endDate <= thirtyDaysFromNow && this.endDate > new Date();
});

export const AMC = mongoose.model<IAMC>('AMC', AMCSchema);
