import mongoose, { Document, Schema } from 'mongoose';

// Contract Types
export type ContractType = 'service' | 'purchase' | 'rental' | 'subscription' | 'partnership' | 'nda' | 'license';
export type ContractStatus = 'draft' | 'pending_signature' | 'active' | 'executed' | 'expired' | 'terminated' | 'disputed';

// Delivery Terms
export interface DeliveryTerms {
  date?: Date;
  conditions?: string[];
  penaltyDays?: number;
  penaltyAmount?: number;
}

// Payment Terms
export interface PaymentTerms {
  method?: 'upfront' | 'milestone' | 'recurring' | 'ondemand';
  amount?: number;
  currency?: string;
  schedule?: {
    trigger: string;
    percentage: number;
  }[];
  latePenaltyDays?: number;
  latePenaltyAmount?: number;
}

// Quality Terms
export interface QualityTerms {
  standards?: string[];
  inspectionPeriod?: number;
  rejectionCriteria?: string[];
  warrantyDays?: number;
}

// Contract Terms
export interface ContractTerms {
  items: {
    description: string;
    quantity?: number;
    unit?: string;
    price?: number;
    metadata?: Record<string, any>;
  }[];
  delivery: DeliveryTerms;
  payment: PaymentTerms;
  quality: QualityTerms;
}

// Machine Readable Contract
export interface MachineReadable {
  executeOn: {
    condition: string;
    action: string;
    params?: Record<string, any>;
  }[];
  escalateOn: {
    condition: string;
    action: string;
    notify?: string[];
  }[];
  autoRenew: boolean;
  renewalTerms?: {
    periodDays: number;
    priceAdjustment?: number;
  };
}

// Contract Document
export interface IContract {
  contractId: string;
  type: ContractType;
  version: string;
  parties: {
    buyer: {
      entityId: string;
      name: string;
      walletAddress?: string;
    };
    seller: {
      entityId: string;
      name: string;
      walletAddress?: string;
    };
  };
  terms: ContractTerms;
  machineReadable: MachineReadable;
  status: ContractStatus;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

// Contract Signature Document
export interface IContractSignature {
  signatureId: string;
  contractId: string;
  party: 'buyer' | 'seller' | string;
  signedBy: string;
  signedAt: Date;
  signatureHash: string;
  publicKey?: string;
  ipAddress?: string;
}

// Contract Execution Document
export interface IContractExecution {
  executionId: string;
  contractId: string;
  action: string;
  triggeredAt: Date;
  result?: {
    success: boolean;
    data?: Record<string, any>;
    message?: string;
  };
  error?: string;
  retryCount?: number;
  metadata?: Record<string, any>;
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
    type: {
      type: String,
      enum: ['service', 'purchase', 'rental', 'subscription', 'partnership', 'nda', 'license'],
      required: true,
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    parties: {
      buyer: {
        entityId: { type: String, required: true },
        name: { type: String, required: true },
        walletAddress: { type: String },
      },
      seller: {
        entityId: { type: String, required: true },
        name: { type: String, required: true },
        walletAddress: { type: String },
      },
    },
    terms: {
      items: [
        {
          description: { type: String, required: true },
          quantity: { type: Number },
          unit: { type: String },
          price: { type: Number },
          metadata: { type: Schema.Types.Mixed },
        },
      ],
      delivery: {
        date: { type: Date },
        conditions: [{ type: String }],
        penaltyDays: { type: Number },
        penaltyAmount: { type: Number },
      },
      payment: {
        method: { type: String, enum: ['upfront', 'milestone', 'recurring', 'ondemand'] },
        amount: { type: Number },
        currency: { type: String, default: 'USD' },
        schedule: [
          {
            trigger: { type: String },
            percentage: { type: Number },
          },
        ],
        latePenaltyDays: { type: Number },
        latePenaltyAmount: { type: Number },
      },
      quality: {
        standards: [{ type: String }],
        inspectionPeriod: { type: Number },
        rejectionCriteria: [{ type: String }],
        warrantyDays: { type: Number },
      },
    },
    machineReadable: {
      executeOn: [
        {
          condition: { type: String, required: true },
          action: { type: String, required: true },
          params: { type: Schema.Types.Mixed },
        },
      ],
      escalateOn: [
        {
          condition: { type: String, required: true },
          action: { type: String, required: true },
          notify: [{ type: String }],
        },
      ],
      autoRenew: { type: Boolean, default: false },
      renewalTerms: {
        periodDays: { type: Number },
        priceAdjustment: { type: Number },
      },
    },
    status: {
      type: String,
      enum: ['draft', 'pending_signature', 'active', 'executed', 'expired', 'terminated', 'disputed'],
      default: 'draft',
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'contracts',
  }
);

// Compound index for entity queries
ContractSchema.index({ 'parties.buyer.entityId': 1, status: 1 });
ContractSchema.index({ 'parties.seller.entityId': 1, status: 1 });
ContractSchema.index({ type: 1, status: 1 });

// Contract Signature Schema
const ContractSignatureSchema = new Schema<IContractSignature>(
  {
    signatureId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contractId: {
      type: String,
      required: true,
      index: true,
    },
    party: {
      type: String,
      required: true,
    },
    signedBy: {
      type: String,
      required: true,
    },
    signedAt: {
      type: Date,
      default: Date.now,
    },
    signatureHash: {
      type: String,
      required: true,
    },
    publicKey: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: false,
    collection: 'contract_signatures',
  }
);

ContractSignatureSchema.index({ contractId: 1, party: 1 }, { unique: true });

// Contract Execution Schema
const ContractExecutionSchema = new Schema<IContractExecution>(
  {
    executionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    contractId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    triggeredAt: {
      type: Date,
      default: Date.now,
    },
    result: {
      success: { type: Boolean },
      data: { type: Schema.Types.Mixed },
      message: { type: String },
    },
    error: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: false,
    collection: 'contract_executions',
  }
);

ContractExecutionSchema.index({ contractId: 1, triggeredAt: -1 });

// Export Models
export const Contract = mongoose.model<IContract>('Contract', ContractSchema);
export const ContractSignature = mongoose.model<IContractSignature>('ContractSignature', ContractSignatureSchema);
export const ContractExecution = mongoose.model<IContractExecution>('ContractExecution', ContractExecutionSchema);

export default {
  Contract,
  ContractSignature,
  ContractExecution,
};