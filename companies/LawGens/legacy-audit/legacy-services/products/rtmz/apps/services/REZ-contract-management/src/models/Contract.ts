import mongoose, { Document, Schema } from 'mongoose';

export interface IParty {
  name: string;
  email: string;
  role: 'signer' | 'witness' | 'approver';
  signedAt?: Date;
  signatureData?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface IContractMetadata {
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  signedAt?: Date;
  version: number;
  previousVersions: string[];
}

export interface IContract extends Document {
  contractId: string;
  title: string;
  type: 'nda' | 'msa' | 'sow' | 'employment' | 'vendor' | 'custom';
  status: 'draft' | 'pending_signature' | 'partially_signed' | 'signed' | 'expired' | 'terminated';
  parties: IParty[];
  content: string;
  variables: Record<string, unknown>;
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  renewalTermMonths: number;
  terms: string[];
  metadata: IContractMetadata;
  tenantId: string;
  signatureToken?: string;
  signatureTokenExpiry?: Date;
  auditTrail: {
    action: string;
    performedBy: string;
    performedAt: Date;
    details?: string;
  }[];
}

const PartySchema = new Schema<IParty>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['signer', 'witness', 'approver'], required: true },
  signedAt: { type: Date },
  signatureData: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String }
}, { _id: false });

const AuditTrailSchema = new Schema({
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  performedAt: { type: Date, default: Date.now },
  details: { type: String }
}, { _id: false });

const ContractSchema = new Schema<IContract>({
  contractId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  type: {
    type: String,
    enum: ['nda', 'msa', 'sow', 'employment', 'vendor', 'custom'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'partially_signed', 'signed', 'expired', 'terminated'],
    required: true,
    default: 'draft',
    index: true
  },
  parties: { type: [PartySchema], required: true },
  content: { type: String, required: true },
  variables: { type: Schema.Types.Mixed, default: {} },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true, index: true },
  autoRenew: { type: Boolean, default: false },
  renewalTermMonths: { type: Number, default: 12 },
  terms: { type: [String], default: [] },
  metadata: {
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    signedAt: { type: Date },
    version: { type: Number, default: 1 },
    previousVersions: { type: [String], default: [] }
  },
  tenantId: { type: String, required: true, index: true },
  signatureToken: { type: String },
  signatureTokenExpiry: { type: Date },
  auditTrail: { type: [AuditTrailSchema], default: [] }
}, {
  timestamps: true
});

ContractSchema.index({ 'parties.email': 1 });
ContractSchema.index({ tenantId: 1, status: 1 });
ContractSchema.index({ tenantId: 1, type: 1 });
ContractSchema.index({ endDate: 1, status: 1 });

ContractSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

export const Contract = mongoose.model<IContract>('Contract', ContractSchema);
export default Contract;
