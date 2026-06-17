import mongoose, { Document, Schema } from 'mongoose';

// Contract Types
export type ContractType = 'master' | 'service' | 'nda' | 'sla' | 'pricing' | 'volume' | 'exclusive';

// Contract Status
export type ContractStatus = 'draft' | 'pending_approval' | 'active' | 'expired' | 'terminated' | 'renewed';

// Payment Terms
export type PaymentTerms = 'immediate' | 'net15' | 'net30' | 'net45' | 'net60' | 'net90' | 'custom';

// Contract Line Item
export interface IContractLineItem {
  itemNumber: string;
  description: string;
  quantity?: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
}

// Contract Terms
export interface IContractTerms {
  paymentTerms: PaymentTerms;
  paymentMethod?: string;
  latePaymentPenalty?: number;
  currency: string;
  minimumCommitment?: number;
  maximumLiability?: number;
}

// Renewal Terms
export interface IRenewalTerms {
  autoRenew: boolean;
  renewalPeriod?: number; // months
  noticePeriod?: number; // days before expiry
  renewalRate?: number; // percentage increase
}

// Attachment Reference
export interface IContractAttachment {
  name: string;
  url: string;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// Interface for Contract Document
export interface IContract extends Document {
  // Core Identification
  contractId: string;
  partnerId: string;
  tenantId: string;

  // Contract Details
  title: string;
  type: ContractType;
  status: ContractStatus;

  // Parties
  parties: {
    partyA: {
      name: string;
      signatory: string;
      email: string;
    };
    partyB: {
      name: string;
      signatory: string;
      email: string;
    };
  };

  // Duration
  effectiveDate: Date;
  expirationDate?: Date;
  durationMonths?: number;

  // Terms
  terms: IContractTerms;
  renewal: IRenewalTerms;

  // Financial
  totalValue?: number;
  currency: string;

  // Line Items
  lineItems?: IContractLineItem[];

  // Scope
  scope?: string;
  deliverables?: string[];

  // Attachments
  attachments?: IContractAttachment[];

  // Signing
  signedDate?: Date;
  signedBy?: string;
  signatureUrl?: string;

  // Renewal Tracking
  previousContractId?: string;
  nextRenewalDate?: Date;
  renewalCount?: number;

  // Metadata
  notes?: string;
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

// Contract Schema
const ContractSchema = new Schema<IContract>(
  {
    contractId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    partnerId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['master', 'service', 'nda', 'sla', 'pricing', 'volume', 'exclusive'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed'],
      default: 'draft',
    },

    parties: {
      partyA: {
        name: { type: String, required: true },
        signatory: { type: String, required: true },
        email: { type: String, required: true },
      },
      partyB: {
        name: { type: String, required: true },
        signatory: { type: String, required: true },
        email: { type: String, required: true },
      },
    },

    effectiveDate: {
      type: Date,
      required: true,
    },
    expirationDate: Date,
    durationMonths: Number,

    terms: {
      paymentTerms: {
        type: String,
        enum: ['immediate', 'net15', 'net30', 'net45', 'net60', 'net90', 'custom'],
        default: 'net30',
      },
      paymentMethod: String,
      latePaymentPenalty: Number,
      currency: { type: String, default: 'USD' },
      minimumCommitment: Number,
      maximumLiability: Number,
    },
    renewal: {
      autoRenew: { type: Boolean, default: false },
      renewalPeriod: Number,
      noticePeriod: Number,
      renewalRate: Number,
    },

    totalValue: Number,
    currency: { type: String, default: 'USD' },

    lineItems: [
      {
        itemNumber: String,
        description: String,
        quantity: Number,
        unit: String,
        unitPrice: Number,
        discount: Number,
        tax: Number,
        total: Number,
      },
    ],

    scope: String,
    deliverables: [String],

    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: Date,
        uploadedBy: String,
      },
    ],

    signedDate: Date,
    signedBy: String,
    signatureUrl: String,

    previousContractId: String,
    nextRenewalDate: Date,
    renewalCount: { type: Number, default: 0 },

    notes: String,
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
ContractSchema.index({ contractId: 1, tenantId: 1 });
ContractSchema.index({ partnerId: 1, tenantId: 1 });
ContractSchema.index({ tenantId: 1, type: 1, status: 1 });
ContractSchema.index({ expirationDate: 1 });
ContractSchema.index({ nextRenewalDate: 1 });
ContractSchema.index({ isDeleted: 1 });

// Virtual for days until expiration
ContractSchema.virtual('daysUntilExpiration').get(function () {
  if (!this.expirationDate) return null;
  return Math.ceil(
    (this.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
});

// Virtual for contract status details
ContractSchema.virtual('statusDetails').get(function () {
  const now = new Date();
  if (this.status === 'active' && this.expirationDate) {
    const daysLeft = Math.ceil(
      (this.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 30) return { status: 'expiring_soon', daysLeft };
    return { status: 'active', daysLeft };
  }
  return { status: this.status };
});

// Export
export const Contract = mongoose.model<IContract>('Contract', ContractSchema);
export default Contract;
