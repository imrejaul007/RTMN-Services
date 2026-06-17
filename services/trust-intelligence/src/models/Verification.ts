import mongoose, { Schema, Document } from 'mongoose';
import {
  EntityType,
  VerificationMethod,
  VerificationStatus,
  VerificationLevel,
  VerificationDocument,
  VerificationAttempt,
} from '../types';

export interface IVerification extends Document {
  entityId: string;
  entityType: EntityType;
  tenantId: string;
  method: VerificationMethod;
  status: VerificationStatus;
  level: VerificationLevel;
  provider: string;
  referenceId?: string;
  data: Record<string, any>;
  score: number;
  expiresAt?: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  documents: VerificationDocument[];
  attempts: VerificationAttempt[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationDocumentSchema = new Schema<VerificationDocument>(
  {
    type: { type: String, required: true },
    url: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: false }
);

const VerificationAttemptSchema = new Schema<VerificationAttempt>(
  {
    timestamp: { type: Date, required: true },
    method: { type: String, required: true },
    success: { type: Boolean, required: true },
    failureReason: { type: String },
    ipAddress: { type: String },
    deviceId: { type: String },
  },
  { _id: false }
);

const VerificationSchema = new Schema<IVerification>(
  {
    entityId: { type: String, required: true, index: true },
    entityType: {
      type: String,
      required: true,
      enum: ['customer', 'merchant', 'agent', 'vendor', 'partner', 'device'],
      index: true,
    },
    tenantId: { type: String, required: true, default: 'default', index: true },
    method: {
      type: String,
      required: true,
      enum: ['kyc', 'document', 'biometric', 'phone', 'email', 'bank', 'social'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'in_progress', 'verified', 'rejected', 'expired'],
      default: 'pending',
      index: true,
    },
    level: {
      type: String,
      required: true,
      enum: ['none', 'basic', 'standard', 'enhanced', 'full'],
      default: 'basic',
    },
    provider: { type: String, required: true, default: 'internal' },
    referenceId: { type: String, sparse: true },
    data: { type: Schema.Types.Mixed, default: {} },
    score: { type: Number, default: 0, min: 0, max: 100 },
    expiresAt: { type: Date, index: true },
    verifiedAt: { type: Date },
    verifiedBy: { type: String },
    rejectionReason: { type: String },
    documents: { type: [VerificationDocumentSchema], default: [] },
    attempts: { type: [VerificationAttemptSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'verifications',
  }
);

// Compound indexes
VerificationSchema.index({ entityId: 1, entityType: 1, tenantId: 1 });
VerificationSchema.index({ entityId: 1, method: 1, status: 1 });
VerificationSchema.index({ tenantId: 1, status: 1 });
VerificationSchema.index({ expiresAt: 1 }, { sparse: true });

// Methods
VerificationSchema.methods.addAttempt = function (
  method: VerificationMethod,
  success: boolean,
  ipAddress?: string,
  deviceId?: string,
  failureReason?: string
) {
  this.attempts.push({
    timestamp: new Date(),
    method,
    success,
    ipAddress,
    deviceId,
    failureReason,
  });
};

VerificationSchema.methods.verify = function (
  verifiedBy: string,
  score: number = 100
) {
  this.status = 'verified';
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  this.score = score;
  // Set expiration based on method
  const expiryDays = this.method === 'biometric' ? 365 : this.method === 'document' ? 180 : 90;
  this.expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
};

VerificationSchema.methods.reject = function (
  rejectionReason: string
) {
  this.status = 'rejected';
  this.rejectionReason = rejectionReason;
};

VerificationSchema.methods.expire = function () {
  this.status = 'expired';
};

// Static methods
VerificationSchema.statics.findActiveForEntity = function (
  entityId: string,
  entityType: EntityType,
  tenantId: string
) {
  return this.find({
    entityId,
    entityType,
    tenantId,
    status: { $in: ['verified', 'pending', 'in_progress'] },
  });
};

VerificationSchema.statics.findExpiredVerifications = function () {
  return this.find({
    status: 'verified',
    expiresAt: { $lt: new Date() },
  });
};

export const VerificationModel = mongoose.model<IVerification>(
  'Verification',
  VerificationSchema
);

export default VerificationModel;
