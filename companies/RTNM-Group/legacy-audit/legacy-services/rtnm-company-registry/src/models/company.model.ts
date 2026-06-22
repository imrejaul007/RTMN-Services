import mongoose, { Document, Schema } from 'mongoose';
import { CompanyType, Industry, CompanyStatus, ServiceStatus } from '../config';

// Service Interface
export interface IService {
  serviceId: string;
  name: string;
  type: string;
  port?: number;
  endpoint?: string;
  status: ServiceStatus;
  version: string;
  healthCheckUrl?: string;
  isInternal: boolean;
  isExternal: boolean;
  tier: 'core' | 'support' | 'utility';
  monthlyCalls?: number;
  lastHealthCheck?: Date;
}

// Ledger Entry Interface
export interface ILedgerEntry {
  entryId: string;
  type: 'credit' | 'debit';
  amount: number;
  currency: string;
  description: string;
  referenceId?: string;
  relatedCorpId?: string;
  createdAt: Date;
}

// Company Document Interface
export interface IRegisteredCompany extends Document {
  corpId: string;
  name: string;
  type: CompanyType;
  industry: Industry;
  registrationNumber?: string;
  taxId?: string;
  aiAgentId?: string;
  creditLimit: number;
  currentCredit: number;
  trustScore: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  servicesProvided: IService[];
  servicesConsumed: IService[];
  walletId?: string;
  status: CompanyStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt?: Date;
}

// Company Schema
const CompanySchema = new Schema<IRegisteredCompany>(
  {
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
 },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'ai',
        'payment',
        'consumer',
        'merchant',
        'social',
        'marketing',
        'healthcare',
        'hospitality',
        'mobility',
        'legal',
        'finance',
        'property',
        'hr',
        'education',
        'events',
      ],
    },
    industry: {
      type: String,
      required: true,
      enum: [
        'ai',
        'fintech',
        'ecommerce',
        'social',
        'marketing',
        'healthcare',
        'hospitality',
        'mobility',
        'legal',
        'realestate',
        'hr',
        'education',
        'events',
        'retail',
        'food',
        'transportation',
        'entertainment',
      ],
    },
    registrationNumber: {
      type: String,
      sparse: true,
    },
    taxId: {
      type: String,
      sparse: true,
    },
    aiAgentId: {
      type: String,
    },
    creditLimit: {
      type: Number,
      required: true,
      default: 100000,
    },
    currentCredit: {
      type: Number,
      required: true,
      default: 0,
    },
    trustScore: {
      type: Number,
      required: true,
      default: 50,
      min: 0,
      max: 100,
    },
    monthlyRevenue: {
      type: Number,
      default: 0,
    },
    monthlyExpenses: {
      type: Number,
      default: 0,
    },
    servicesProvided: [
      {
        serviceId: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        port: Number,
        endpoint: String,
        status: {
          type: String,
          enum: ['active', 'inactive', 'maintenance', 'deprecated'],
          default: 'active',
        },
        version: { type: String, default: '1.0.0' },
        healthCheckUrl: String,
        isInternal: { type: Boolean, default: true },
        isExternal: { type: Boolean, default: false },
        tier: {
          type: String,
          enum: ['core', 'support', 'utility'],
          default: 'core',
        },
        monthlyCalls: { type: Number, default: 0 },
        lastHealthCheck: Date,
      },
    ],
    servicesConsumed: [
      {
        serviceId: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, required: true },
        port: Number,
        endpoint: String,
        status: {
          type: String,
          enum: ['active', 'inactive', 'maintenance', 'deprecated'],
          default: 'active',
        },
        version: { type: String, default: '1.0.0' },
        healthCheckUrl: String,
        isInternal: { type: Boolean, default: true },
        isExternal: { type: Boolean, default: false },
        tier: {
          type: String,
          enum: ['core', 'support', 'utility'],
          default: 'core',
        },
        monthlyCalls: { type: Number, default: 0 },
        lastHealthCheck: Date,
      },
    ],
    walletId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'pending', 'archived'],
      default: 'pending',
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    deactivatedAt: Date,
  },
  {
    timestamps: true,
    collection: 'registered_companies',
  }
);

// Indexes
CompanySchema.index({ type: 1 });
CompanySchema.index({ industry: 1 });
CompanySchema.index({ status: 1 });
CompanySchema.index({ trustScore: -1 });
CompanySchema.index({ monthlyRevenue: -1 });
CompanySchema.index({ 'servicesProvided.serviceId': 1 });
CompanySchema.index({ 'servicesConsumed.serviceId': 1 });
CompanySchema.index({ createdAt: -1 });

// Virtual for available credit
CompanySchema.virtual('availableCredit').get(function () {
  return this.creditLimit - this.currentCredit;
});

// Pre-save hook for validation
CompanySchema.pre('save', function (next) {
  if (this.currentCredit > this.creditLimit) {
    next(new Error('Current credit cannot exceed credit limit'));
  }
  if (this.trustScore < 0 || this.trustScore > 100) {
    next(new Error('Trust score must be between 0 and 100'));
  }
  next();
});

// Methods
CompanySchema.methods.toPublicJSON = function () {
  return {
    corpId: this.corpId,
    name: this.name,
    type: this.type,
    industry: this.industry,
    registrationNumber: this.registrationNumber,
    taxId: this.taxId,
    aiAgentId: this.aiAgentId,
    creditLimit: this.creditLimit,
    currentCredit: this.currentCredit,
    availableCredit: this.creditLimit - this.currentCredit,
    trustScore: this.trustScore,
    monthlyRevenue: this.monthlyRevenue,
    monthlyExpenses: this.monthlyExpenses,
    servicesProvided: this.servicesProvided,
    servicesConsumed: this.servicesConsumed,
    walletId: this.walletId,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Statics
CompanySchema.statics.findByCorpId = function (corpId: string) {
  return this.findOne({ corpId: corpId.toUpperCase() });
};

CompanySchema.statics.findActive = function () {
  return this.find({ status: 'active' });
};

CompanySchema.statics.findByType = function (type: CompanyType) {
  return this.find({ type, status: 'active' });
};

CompanySchema.statics.findByIndustry = function (industry: Industry) {
  return this.find({ industry, status: 'active' });
};

// Ledger Schema (separate collection)
const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entryId: { type: String, required: true, unique: true },
    corpId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: ['credit', 'debit'] },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    description: { type: String, required: true },
    referenceId: String,
    relatedCorpId: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: 'company_ledger',
  }
);

LedgerEntrySchema.index({ corpId: 1, createdAt: -1 });
LedgerEntrySchema.index({ relatedCorpId: 1 });

// Export models
export const RegisteredCompany = mongoose.model<IRegisteredCompany>(
  'RegisteredCompany',
  CompanySchema
);

export const LedgerEntry = mongoose.model<ILedgerEntry>(
  'LedgerEntry',
  LedgerEntrySchema
);

export default { RegisteredCompany, LedgerEntry };