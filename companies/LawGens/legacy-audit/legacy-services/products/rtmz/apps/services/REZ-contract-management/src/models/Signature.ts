import mongoose, { Document, Schema } from 'mongoose';

export interface ISignature extends Document {
  signatureId: string;
  contractId: string;
  partyName: string;
  partyEmail: string;
  partyRole: 'signer' | 'witness' | 'approver';
  status: 'pending' | 'signed' | 'declined' | 'expired';
  signatureData?: string;
  signedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  declineReason?: string;
  signatureToken: string;
  tokenExpiry: Date;
  sentAt: Date;
  reminderCount: number;
  lastReminderAt?: Date;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
  };
  tenantId: string;
}

const SignatureSchema = new Schema<ISignature>({
  signatureId: { type: String, required: true, unique: true, index: true },
  contractId: { type: String, required: true, index: true },
  partyName: { type: String, required: true },
  partyEmail: { type: String, required: true },
  partyRole: {
    type: String,
    enum: ['signer', 'witness', 'approver'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'signed', 'declined', 'expired'],
    required: true,
    default: 'pending',
    index: true
  },
  signatureData: { type: String },
  signedAt: { type: Date },
  ipAddress: { type: String },
  userAgent: { type: String },
  declineReason: { type: String },
  signatureToken: { type: String, required: true, unique: true, index: true },
  tokenExpiry: { type: Date, required: true },
  sentAt: { type: Date, default: Date.now },
  reminderCount: { type: Number, default: 0 },
  lastReminderAt: { type: Date },
  metadata: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  tenantId: { type: String, required: true, index: true }
}, {
  timestamps: true
});

SignatureSchema.index({ contractId: 1, partyEmail: 1 });
SignatureSchema.index({ signatureToken: 1 });
SignatureSchema.index({ status: 1, tokenExpiry: 1 });
SignatureSchema.index({ tenantId: 1, status: 1 });

SignatureSchema.pre('save', function(next) {
  this.metadata.updatedAt = new Date();
  next();
});

SignatureSchema.methods.isTokenValid = function(): boolean {
  return this.status === 'pending' && new Date() < this.tokenExpiry;
};

export const Signature = mongoose.model<ISignature>('Signature', SignatureSchema);
export default Signature;
